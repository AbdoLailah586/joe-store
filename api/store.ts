import { neonDb, mapRowToOrder, logAudit } from '../server/store.js';
import { database, currentUser, issueSession, endSession, sameOrigin, passwordHash, passwordMatches, pendingSecondFactor } from '../lib/session.js';
import { generateTotpSecret, totpAuthUrl, verifyTotpCode } from '../lib/totp.js';
import { randomBytes, createHash } from 'node:crypto';
import { canAccessSection, isFullAdmin, normalizePermissions, publicUser, OWNER_EMAIL } from '../lib/access.js';
import { normalizePhone } from '../src/utils/deliveryAddress.js';
import { saveOrder, cancelOrder as cancelStoredOrder } from '../server/orderWrites.js';
const fail = (status: number, message: string) => Object.assign(new Error(message), {status});
const forbidden = () => fail(403,'هذا الإجراء غير متاح ضمن صلاحيات حسابك.');
const hasAny = (user: any, sections: string[]) => sections.some(section=>canAccessSection(user,section));
const productSections=['products','inventory','quality','stocktake','reorder','labels','suppliers'];
const orderSections=['overview','analytics','orders','crm'];
const policies: Record<string,string[]> = {
  toggleProductVisibility:['products'],updateProduct:['products'],bulkInsertProducts:['products'],
  getAllUsers:['users'],getActiveCarts:['crm'],updateOrderState:['orders'],
  getCoverOverrides:['covers'],saveCoverOverride:['covers'],
  getAuditLog:['security'],getPickingList:['fulfillment'],getDeliveryBoard:['fulfillment'],
  updateOrderStatus:['orders','fulfillment'],confirmPacking:['fulfillment'],recordDeliveryRefusal:['fulfillment'],
  getRefusalHistory:['fulfillment'],getAllRefusals:['fulfillment'],addSupplierQuote:['suppliers'],getSupplierQuotes:['suppliers'],
  listSupportTickets:['support'],escalateSupportTicket:['support'],closeSupportTicket:['support'],getWishlistGap:['overview','analytics']
};
function safeProduct(product: any, privileged: boolean) {
  if (privileged) return product;
  const p={...product};
  for (const key of ['cost_price','source_row','source_name','source_item_code','raw_source_stock']) delete p[key];
  return p;
}
export async function execute(req: any,res: any,body: any,deps?: any) {
  const sql=deps?.sql || database();
  const store=deps?.store || neonDb;
  const method=body?.method,args=Array.isArray(body?.args)?body.args:[];
  if(typeof method!=='string') throw fail(400,'طلب غير صالح.');
  const user=deps && 'user' in deps ? deps.user : await currentUser(req,sql);
  if(method==='getSession') return {success:true,user};
  if(method==='logout') { await endSession(req,res,sql); return true; }
  if(method==='completeSecondFactor') {
    const pending=await pendingSecondFactor(req,sql);
    if(!pending||!pending.totp_enabled||!verifyTotpCode(pending.totp_secret,args[0])) throw Object.assign(fail(401,'كود المصادقة غير صحيح أو انتهت جلسة التحقق. أعد تسجيل الدخول.'),{code:'TOTP_INVALID'});
    // Consume once before minting a new fully authenticated session.
    const claimed=await sql`DELETE FROM app_sessions WHERE token_hash=${pending.token_hash} AND two_factor_verified=false RETURNING user_id`;
    if(!claimed.length) throw forbidden();
    await issueSession(req,res,pending.id,sql);
    return {success:true,user:publicUser(pending)};
  }
  if(method==='authenticateUser') {
    const [email,password]=args;
    if(typeof email!=='string'||typeof password!=='string'||password.length>512) throw fail(400,'بيانات الدخول غير صالحة.');
    const rows=await sql`SELECT * FROM users WHERE lower(email)=${email.trim().toLowerCase()} LIMIT 1`;
    const row=rows[0];
    if(!row||!passwordMatches(password,row.password_hash)) throw fail(401,'البريد الإلكتروني أو كلمة المرور غير صحيحة. استخدم Google أو كود البريد إذا لم تكن لديك كلمة مرور.');
    if(!row.password_hash.startsWith('scrypt$')) await sql`UPDATE users SET password_hash=${passwordHash(password)} WHERE id=${row.id}`;
    await issueSession(req,res,row.id,sql,!row.totp_enabled);
    if(row.totp_enabled) return {success:false,requiresTotp:true,code:'TOTP_REQUIRED',error:'أدخل كود تطبيق المصادقة لإكمال الدخول.'};
    return {success:true,user:publicUser(row)};
  }
  if(method==='getUserAccess') {
    if(!user || user.id!==args[0]) return {success:true,exists:false};
    return {success:true,exists:true,role:user.role,admin_permissions:user.admin_permissions};
  }
  if(method==='updateUserAccess'||method==='updateUserRole') {
    if(!isFullAdmin(user)) throw forbidden();
    const [id,input]=args;
    const access=method==='updateUserRole' ? {role:input,permissions:[]} : input;
    if(typeof id!=='string'||!access||!['admin','customer'].includes(access.role)||!Array.isArray(access.permissions)) throw fail(400,'حدد نوع الحساب والأقسام المسموح بها.');
    if(id===user.id) throw fail(400,'لا يمكنك تغيير صلاحيات حسابك الحالي.');
    const permissions=normalizePermissions(access.permissions);
    if(permissions.length!==new Set(access.permissions).size) throw fail(400,'قائمة الصلاحيات تحتوي على قسم غير معروف.');
    const rows=await sql`UPDATE users SET role=${access.role},admin_permissions=${JSON.stringify(access.role==='admin'?[]:permissions)}::jsonb,updated_at=NOW() WHERE id=${id} AND lower(email)<>${OWNER_EMAIL} RETURNING *`;
    if(!rows[0]) throw fail(400,'الحساب غير موجود أو هو حساب المالك المحمي.');
    if(!deps) await logAudit({actorId:user.id,actorName:user.name,action:'USER_ACCESS_CHANGED',entity:'user',entityId:id,after:{role:access.role,permissions}});
    return {success:true,user:publicUser(rows[0])};
  }
  if(policies[method]&&!hasAny(user,policies[method])) throw forbidden();
  if(['setupTotp','confirmTotp','disableTotp'].includes(method)) {
    if(!user||user.id!==args[0]||(!isFullAdmin(user)&&!canAccessSection(user,'security'))) throw forbidden();
    const rows=await sql`SELECT totp_enabled,totp_secret,password_hash,totp_pending_secret FROM users WHERE id=${user.id}`;
    const row=rows[0];
    if(method==='setupTotp') {
      if(row.totp_enabled) throw fail(400,'عطّل المصادقة الحالية بكود التطبيق أولًا قبل تجهيز مفتاح جديد.');
      const secret=generateTotpSecret();
      await sql`UPDATE users SET totp_pending_secret=${secret} WHERE id=${user.id}`;
      return {success:true,secret,otpauthUrl:totpAuthUrl(secret,user.email)};
    }
    if(method==='confirmTotp') {
      if(!verifyTotpCode(row.totp_pending_secret,args[1])) throw fail(400,'كود التفعيل غير صحيح.');
      await sql`UPDATE users SET totp_secret=totp_pending_secret,totp_pending_secret=NULL,totp_enabled=true WHERE id=${user.id}`;
      await sql`DELETE FROM app_sessions WHERE user_id=${user.id}`;
      await issueSession(req,res,user.id,sql);
    } else {
      if(!verifyTotpCode(row.totp_secret,args[1])) throw fail(400,'أدخل كود تطبيق المصادقة الحالي لتعطيل الحماية.');
      await sql`UPDATE users SET totp_secret=NULL,totp_pending_secret=NULL,totp_enabled=false WHERE id=${user.id}`;
    }
    return {success:true};
  }
  if(method==='getProducts') {
    const params={...(args[0]||{})},privileged=hasAny(user,productSections);
    params.includeHidden=privileged&&params.includeHidden===true;
    params.limit=Math.max(1,Math.min(300,Number(params.limit)||50));params.offset=Math.max(0,Number(params.offset)||0);
    const result=await store.getProducts(params);
    return {...result,products:result.products.map((p:any)=>safeProduct(p,privileged))};
  }
  if(method==='getOrders') {
    if(hasAny(user,orderSections)) return store.getOrders();
    if(!user) return [];
    const rows=await sql`SELECT * FROM orders WHERE lower(customer_email)=${user.email.toLowerCase()} ORDER BY created_at DESC LIMIT 100`;
    return rows.map(mapRowToOrder);
  }
  if(method==='getAllUsers') return (await store.getAllUsers()).map(publicUser);
  if(method==='logWishlistEvent') {
    if(!user) throw forbidden();
    return store.logWishlistEvent(user.id,String(args[1]||'').slice(0,100));
  }
  // Customer conversations are bound to a secret HttpOnly browser cookie; a phone
  // number is a contact detail, never authorization to read somebody else's thread.
  if(['findOrCreateSupportTicket','createSupportTicket','getSupportTicket','replySupportTicket','rateSupportTicket'].includes(method)) {
    const staff=canAccessSection(user,'support');
    let token=(req.headers?.cookie||'').split(';').map((x:string)=>x.trim()).find((x:string)=>x.startsWith('joe_support='))?.slice(12);
    if(!/^[a-f0-9]{64}$/.test(token||'')) {
      token=randomBytes(32).toString('hex');
      const secure=process.env.NODE_ENV==='production'||req.headers?.['x-forwarded-proto']==='https';
      res.setHeader('Set-Cookie',`joe_support=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${secure?'; Secure':''}`);
    }
    const accessHash=createHash('sha256').update(token).digest('hex');
    if(method==='findOrCreateSupportTicket'||method==='createSupportTicket') {
      const phone=normalizePhone(String(args[0]||''));
      if(phone.length!==11) throw fail(400,'أدخل رقم هاتف صحيح.');
      const existing=await sql`SELECT * FROM support_tickets WHERE access_hash=${accessHash} AND customer_phone=${phone} AND status IN ('open','pending','escalated') ORDER BY created_at DESC LIMIT 1`;
      let ticket=existing[0];
      if(!ticket) {
        const id='ticket-'+randomBytes(16).toString('hex');
        const rows=await sql`INSERT INTO support_tickets(id,customer_phone,customer_name,subject,access_hash) VALUES(${id},${phone},${String(user?.name||args[2]||'').slice(0,150)},'استفسار عميل',${accessHash}) RETURNING *`;
        ticket=rows[0];
      }
      if(method==='createSupportTicket'&&typeof args[1]==='string'&&args[1].trim()) await store.replySupportTicket(ticket.id,'customer',args[1].slice(0,5000),user?{id:user.id,name:user.name}:undefined);
      return method==='createSupportTicket'?{success:true,ticket}:ticket;
    }
    if(!staff||method==='rateSupportTicket'||(method==='replySupportTicket'&&args[1]!=='staff')) {
      const rows=await sql`SELECT id FROM support_tickets WHERE id=${args[0]} AND access_hash=${accessHash}`;
      if(!rows.length) throw forbidden();
    }
    if(method==='replySupportTicket') return store.replySupportTicket(args[0],staff&&args[1]==='staff'?'staff':'customer',String(args[2]||'').slice(0,5000),user?{id:user.id,name:user.name}:undefined);
    if(method==='rateSupportTicket') return store.rateSupportTicket(args[0],args[1],String(args[2]||'').slice(0,2000));
    const result=await store.getSupportTicket(args[0]);
    if(result&&!staff){delete result.ticket.access_hash;result.ticket.assigned_to=undefined;result.ticket.escalation_reason=undefined}
    return result;
  }
  if(method==='updateUserProfile') {
    if(!user||user.id!==args[0]) throw forbidden();
    const data={...(args[1]||{})};
    // Email identity is established only by a verified sign-in, never profile input.
    if(data.email&&data.email.trim().toLowerCase()!==user.email.toLowerCase()) throw fail(400,'تغيير البريد يحتاج تسجيل دخول موثق بالبريد الجديد.');
    delete data.email;delete data.role;delete data.admin_permissions;
    const result=await store.updateUserProfile(user.id,data);
    return {...result,user:result.user ? {...publicUser(result.user),admin_permissions:user.admin_permissions}:undefined};
  }
  if(method==='changePassword') {
    if(!user||user.id!==args[0]) throw forbidden();
    const [,oldPass,newPass]=args;
    if(typeof newPass!=='string'||newPass.length<8||newPass.length>512) throw fail(400,'كلمة المرور الجديدة يجب أن تتكون من 8 أحرف على الأقل.');
    const rows=await sql`SELECT password_hash FROM users WHERE id=${user.id}`;
    if(!passwordMatches(oldPass,rows[0]?.password_hash)) throw fail(400,'كلمة المرور الحالية غير صحيحة.');
    await sql`UPDATE users SET password_hash=${passwordHash(newPass)},updated_at=NOW() WHERE id=${user.id}`;
    return {success:true};
  }
  if(method==='deleteUser') {
    if(!user||(!isFullAdmin(user)&&user.id!==args[0])) throw forbidden();
    const rows=await sql`DELETE FROM users WHERE id=${args[0]} AND lower(email)<>${OWNER_EMAIL} RETURNING id`;
    return rows.length ? {success:true}:{success:false,error:'لا يمكن حذف الحساب المحمي.'};
  }
  if(method==='cancelOrder') {
    if(!user) throw forbidden();
    if(!canAccessSection(user,'orders')) {
      const rows=await sql`SELECT customer_email,status FROM orders WHERE id=${args[0]} OR order_number=${args[0]} LIMIT 1`;
      if(!rows[0]||rows[0].customer_email?.toLowerCase()!==user.email.toLowerCase()||!['pending','confirmed'].includes(rows[0].status)) throw forbidden();
    }
    return cancelStoredOrder(sql,args[0],String(args[1]||'').slice(0,1000),canAccessSection(user,'orders')?'admin':'customer_whatsapp');
  }
  if(method==='updateOrderState') {
    const changes=args[1]||{},statuses=['pending','confirmed','processing','shipped','out_for_delivery','delivered','cancelled'];
    if(changes.order_status&&!statuses.includes(changes.order_status)) throw fail(400,'حالة الطلب غير صالحة.');
    if(changes.payment_status&&!['unpaid','paid','verified'].includes(changes.payment_status)) throw fail(400,'حالة الدفع غير صالحة.');
    if(changes.order_status==='cancelled') return cancelStoredOrder(sql,args[0],'إلغاء من لوحة الإدارة','admin');
    await sql`UPDATE orders SET status=COALESCE(${changes.order_status||null},status),payment_status=COALESCE(${changes.payment_status||null},payment_status),updated_at=NOW() WHERE id=${args[0]}`;
    return true;
  }
  if(method==='trackOrder') {
    const number=String(args[0]||'').trim().replace(/^#/,'').toUpperCase(),phone=normalizePhone(String(args[1]||''));
    if(!/^JOE-[A-Z0-9-]{4,80}$/.test(number)||phone.length!==11) throw fail(400,'اكتب رقم الطلب ورقم الهاتف المسجل معًا.');
    const rows=await sql`SELECT * FROM orders WHERE upper(order_number)=${number} AND customer_phone=${phone} LIMIT 1`;
    return rows[0]?mapRowToOrder(rows[0]):null;
  }
  if(method==='createOrder') {
    const order=args[0];
    if(!order||!Array.isArray(order.items)||!order.items.length||order.items.length>100) throw fail(400,'الطلب غير صالح.');
    if(!Number.isFinite(order.shipping_fee)||order.shipping_fee<0||!Number.isFinite(order.subtotal)||!Number.isFinite(order.total)||Math.abs(order.total-order.subtotal-order.shipping_fee)>0.011) throw fail(400,'إجمالي الطلب غير صالح.');
    if(order.items.some((i:any)=>!i.product?.id||!Number.isInteger(i.quantity)||i.quantity<=0||i.quantity>1000||!Number.isFinite(i.product.price)||i.product.price<=0)) throw fail(400,'كميات أو أسعار الطلب غير صالحة.');
    const subtotal=order.items.reduce((sum:number,i:any)=>sum+i.product.price*i.quantity,0);
    if(Math.abs(subtotal-order.subtotal)>0.011) throw fail(400,'راجع إجمالي المنتجات في السلة.');
    const phone=normalizePhone(String(order.customer_phone||''));
    if(phone.length!==11||!order.customer_name?.trim()||!order.address_details?.trim()||!['cod','instapay','vodafone_cash'].includes(order.payment_method)) throw fail(400,'راجع اسم العميل والهاتف والعنوان وطريقة الدفع.');
    return saveOrder(sql,{...order,customer_phone:phone,customer_email:user?.email||null,payment_status:'unpaid',order_status:'pending'});
  }
  if(method==='getCoverOverrides') {
    const rows=await sql`SELECT cover_id,data FROM cover_catalog_overrides`;
    return Object.fromEntries(rows.map((r:any)=>[r.cover_id,r.data]));
  }
  if(method==='saveCoverOverride') {
    const [id,value]=args;
    if(!/^cover-\d{3}$/.test(id)||!value||typeof value!=='object') throw fail(400,'بيانات الكفر غير صالحة.');
    const clean:Record<string,string>={};
    for(const key of ['model','brand','style','color','location','notes','reviewed']) if(typeof value[key]==='string') clean[key]=value[key].slice(0,2000);
    await sql`INSERT INTO cover_catalog_overrides(cover_id,data,updated_by) VALUES(${id},${JSON.stringify(clean)}::jsonb,${user.id}) ON CONFLICT(cover_id) DO UPDATE SET data=EXCLUDED.data,updated_by=EXCLUDED.updated_by,updated_at=NOW()`;
    return {success:true};
  }
  if(policies[method]||['trackActivity','syncActiveCart','getPersonalizedRecommendations'].includes(method)) {
    if(typeof store[method]!=='function') throw fail(400,'الإجراء غير مدعوم.');
    const actor=user?{id:user.id,name:user.name}:undefined;
    if(method==='updateProduct')args[2]=actor;
    if(['updateOrderStatus','confirmPacking'].includes(method)) {
      const options={...(args[2]||{}),actor};
      if(options.override&&!isFullAdmin(user))throw forbidden();
      if(method==='updateOrderStatus'&&!['pending','confirmed','processing','shipped','out_for_delivery','delivered'].includes(args[1]))throw fail(400,'حالة الطلب غير صالحة.');
      args[2]=options;
    }
    if(method==='recordDeliveryRefusal')args[3]=actor;
    if(method==='addSupplierQuote') {
      if(!Number.isFinite(args[2])||args[2]<=0||!String(args[1]||'').trim())throw fail(400,'راجع اسم المورد والسعر.');
      args[3]=actor;
    }
    if(method==='escalateSupportTicket')args[2]=actor;
    if(method==='closeSupportTicket')args[1]=actor;
    if(['getAuditLog','getAllRefusals','getWishlistGap'].includes(method))args[0]=Math.max(1,Math.min(200,Number(args[0])||50));
    return store[method](...args);
  }
  throw fail(400,'الإجراء غير مدعوم.');
}
export default async function handler(req:any,res:any) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return res.status(405).json({error:'Method Not Allowed'});
  if(!sameOrigin(req)) return res.status(403).json({error:'الطلب يجب أن يأتي من المتجر نفسه.'});
  try {
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
    if(JSON.stringify(body).length>3_000_000) return res.status(413).json({error:'حجم الطلب أكبر من المسموح.'});
    return res.status(200).json({result:(await execute(req,res,body))??null});
  } catch(error:any) {
    console.error('[store]',error.status||500,error.code||error.message?.slice(0,100));
    return res.status(error.status||500).json({error:error.status?error.message:'تعذر تنفيذ الطلب في الخادم. حاول مرة أخرى.',code:error.status?error.code:undefined});
  }
}
