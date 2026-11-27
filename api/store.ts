import { neonDb, mapRowToOrder, logAudit } from '../server/store.js';
import { database, currentUser, issueSession, endSession, sameOrigin, passwordHash, passwordMatches, pendingSecondFactor } from '../lib/session.js';
import { generateTotpSecret, totpAuthUrl, verifyTotpCode } from '../lib/totp.js';
import { randomBytes, createHash } from 'node:crypto';
import { canAccessSection, isFullAdmin, normalizePermissions, publicUser, OWNER_EMAIL } from '../lib/access.js';
import { normalizePhone } from '../src/utils/deliveryAddress.js';
import { saveOrder, cancelOrder as cancelStoredOrder } from '../server/orderWrites.js';
import { buildServerOrderWhatsAppMessage, dispatchWhatsAppViaCrm, resolveCrmConfig } from '../server/whatsappCrm.js';
import {
  stripPaymentSecrets,
  toPublicPaymentGatewayState,
  hasGatewaySettingsMetadata,
  shouldRouteOrderToGateway,
  createGatewayCheckoutSession,
  resolveRequestOrigin
} from '../server/paymentGateway.js';

const fail = (status: number, message: string, code?: string) => Object.assign(new Error(message), {status, code});
const forbidden = () => fail(403,'هذا الإجراء غير متاح ضمن صلاحيات حسابك.');
const hasAny = (user: any, sections: string[]) => sections.some(section=>canAccessSection(user,section));
const productSections=['products','inventory','quality','stocktake','reorder','labels','suppliers'];
const orderSections=['overview','analytics','orders','crm'];
const policies: Record<string,string[]> = {
  toggleProductVisibility:['products'],updateProduct:['products'],bulkInsertProducts:['products'],
  getAllUsers:['users'],getUserInsights:['users'],getGuestVisitors:['users','crm'],getGuestInsights:['users','crm'],
  getActiveCarts:['crm'],updateOrderState:['orders'],
  getCoverOverrides:['covers'],saveCoverOverride:['covers'],addCoverEntry:['covers'],getCoverAdditions:['covers'],
  addScreenEntry:['screens'],getScreenAdditions:['screens'],
  getAuditLog:['security'],getPickingList:['fulfillment'],getDeliveryBoard:['fulfillment'],
  updateOrderStatus:['orders','fulfillment'],confirmPacking:['fulfillment'],recordDeliveryRefusal:['fulfillment'],
  getRefusalHistory:['fulfillment'],getAllRefusals:['fulfillment'],addSupplierQuote:['suppliers'],getSupplierQuotes:['suppliers'],
  listSupportTickets:['support'],escalateSupportTicket:['support'],closeSupportTicket:['support'],getWishlistGap:['overview','analytics'],
  updateStoreSettings:['overview','products','settings'],
  getAllProductReviews:['overview','products'],
  updateProductReviewStatus:['overview','products'],
  deleteProductReview:['overview','products'],
  getWhatsAppAdminConfig:['whatsapp','settings'],saveWhatsAppAdminConfig:['whatsapp','settings'],
  testWhatsAppConnection:['whatsapp','settings'],getWhatsAppNotifications:['whatsapp','orders'],
  sendOrderWhatsApp:['whatsapp','orders','fulfillment'],sendTestWhatsApp:['whatsapp','settings'],
  getPaymentGatewayAdminConfig:['settings','overview'],savePaymentGatewayConfig:['settings','overview'],
  testPaymentGatewayConfig:['settings','overview']
};
function safeSettings(settings: any) {
  if (!settings || typeof settings !== 'object') return settings;
  const copy: any = stripPaymentSecrets(settings);
  delete copy.whatsapp_automation_url;
  delete copy.whatsapp_automation_email;
  delete copy.whatsapp_automation_pass;
  if (hasGatewaySettingsMetadata(settings)) {
    copy.payment_gateway_public = toPublicPaymentGatewayState(settings);
  }
  return copy;
}
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
  if(method==='getStoreSettings') {
    const raw = store.getStoreSettings ? await store.getStoreSettings() : null;
    return safeSettings(raw);
  }
  if(method==='updateStoreSettings') {
    if(!isFullAdmin(user) && !hasAny(user,['overview','products','inventory','settings'])) throw forbidden();
    const incoming = args[0] && typeof args[0] === 'object' ? { ...args[0] } : {};
    try {
      const current = store.getStoreSettings ? (await store.getStoreSettings()) || {} : {};
      for (const secretKey of [
        'whatsapp_automation_url',
        'whatsapp_automation_email',
        'whatsapp_automation_pass',
        'payment_gateway_api_key',
        'payment_gateway_secret_key',
        'payment_gateway_hmac_secret'
      ]) {
        if (current[secretKey] !== undefined) incoming[secretKey] = current[secretKey];
        else delete incoming[secretKey];
      }
      for (const cfgKey of [
        'payment_gateway_provider',
        'payment_gateway_mode',
        'payment_gateway_merchant_id',
        'payment_gateway_public_key',
        'payment_gateway_card_integration_id',
        'payment_gateway_wallet_integration_id',
        'payment_gateway_instapay_integration_id',
        'payment_gateway_enable_card',
        'payment_gateway_enable_wallet',
        'payment_gateway_enable_instapay',
        'admin_alert_whatsapp_number',
        'auto_alert_admin_on_order',
        'whatsapp_templates',
        'whatsapp_auto_triggers',
        'policy_pages'
      ]) {
        if (incoming[cfgKey] === undefined && current[cfgKey] !== undefined) {
          incoming[cfgKey] = current[cfgKey];
        }
      }
      delete incoming.payment_gateway_public;
    } catch {}
    return store.updateStoreSettings ? store.updateStoreSettings(incoming) : {success:true};
  }
  if(method==='getAllUsers') {
    const users = await store.getAllUsers();
    return users.map((u:any)=>({
      ...publicUser(u),
      last_seen_at: u.last_seen_at || u.last_activity_at || undefined,
      last_activity_at: u.last_activity_at || undefined,
      orders_count: Number(u.orders_count || 0),
      completed_orders_count: Number(u.completed_orders_count || 0),
      total_spent: Number(u.total_spent || 0),
      cart_items_count: Number(u.cart_items_count || 0),
      cart_subtotal: Number(u.cart_subtotal || 0),
      views_count: Number(u.views_count || 0),
      source_channel: u.source_channel || undefined,
      source_label: u.source_label || undefined,
      utm_campaign: u.utm_campaign || undefined,
      device_type: u.device_type || undefined
    }));
  }
  if(method==='adminCreateUser') {
    if(!isFullAdmin(user)) throw forbidden();
    const data=args[0]||{};
    const name=String(data.name||'').trim();
    const email=String(data.email||'').trim().toLowerCase();
    const phone=data.phone?normalizePhone(String(data.phone)):'';
    const password=String(data.password||'');
    const role=data.role==='admin'?'admin':'customer';
    const permissions=role==='admin'?normalizePermissions(Array.isArray(data.admin_permissions)?data.admin_permissions:[]):[];
    if(!name||!email.includes('@')||password.length<6) throw fail(400,'أدخل الاسم والبريد الإلكتروني وكلمة مرور لا تقل عن 6 أحرف.');
    const existing=await sql`SELECT id FROM users WHERE lower(email)=${email} LIMIT 1`;
    if(existing[0]) throw fail(400,'يوجد حساب مسجل بهذا البريد الإلكتروني بالفعل.');
    const id=`user-${Date.now()}-${randomBytes(3).toString('hex')}`;
    const rows=await sql`
      INSERT INTO users (id, name, email, phone, password_hash, role, provider, email_verified, admin_permissions, created_at, updated_at)
      VALUES (${id}, ${name}, ${email}, ${phone||null}, ${passwordHash(password)}, ${role}, 'email', true, ${JSON.stringify(permissions)}::jsonb, NOW(), NOW())
      RETURNING *
    `;
    if(!deps) await logAudit({actorId:user.id,actorName:user.name,action:'USER_CREATED_BY_ADMIN',entity:'user',entityId:id,after:{email,role,permissions}});
    return {success:true,user:publicUser(rows[0])};
  }
  if(method==='getUserInsights') {
    if(typeof args[0]!=='string'||!args[0].trim()) throw fail(400,'معرف المستخدم غير صالح.');
    return store.getUserInsights(args[0].trim());
  }
  if(method==='getGuestVisitors') {
    return store.getGuestVisitors(Math.min(300,Math.max(10,Number(args[0])||150)));
  }
  if(method==='getGuestInsights') {
    if(typeof args[0]!=='string'||!args[0].trim()) throw fail(400,'معرف الجلسة غير صالح.');
    return store.getGuestInsights(args[0].trim());
  }
  if(method==='deleteGuestVisitor') {
    if(!isFullAdmin(user)) throw forbidden();
    if(typeof args[0]!=='string'||!args[0].trim()) throw fail(400,'معرف الجلسة غير صالح.');
    return store.deleteGuestVisitor(args[0].trim());
  }
  if(method==='savePaymentGatewayConfig') {
    return store.savePaymentGatewayConfig(args[0] || {}, user ? { id: user.id, name: user.name } : undefined);
  }
  if(method==='getPaymentGatewayAdminConfig'||method==='testPaymentGatewayConfig'||method==='getWhatsAppAdminConfig'||method==='testWhatsAppConnection') {
    return store[method]();
  }
  if(method==='saveWhatsAppAdminConfig') {
    return store.saveWhatsAppAdminConfig(args[0] || {});
  }
  if(method==='getWhatsAppNotifications') {
    return store.getWhatsAppNotifications(args[0]);
  }
  if(method==='sendOrderWhatsApp') {
    return store.sendOrderWhatsApp(args[0] || {});
  }
  if(method==='sendTestWhatsApp') {
    return store.sendTestWhatsApp(args[0] || {});
  }
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
    await sql`UPDATE orders SET status=COALESCE(${changes.order_status||null},status),payment_status=COALESCE(${changes.payment_status||null},payment_status),updated_at=NOW() WHERE id=${args[0]} OR order_number=${args[0]}`;
    try {
      const settings = store.getStoreSettings ? await store.getStoreSettings() : null;
      const crm = resolveCrmConfig(settings);
      const rawType = changes.payment_status === 'verified'
        ? 'payment_verified'
        : changes.order_status === 'confirmed'
          ? 'order_confirmed'
          : changes.order_status;
      if (
        crm.configured &&
        rawType &&
        ['order_confirmed', 'payment_verified', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'].includes(rawType) &&
        crm.shouldAutoSend(rawType as any)
      ) {
        const rows = await sql`SELECT * FROM orders WHERE id=${args[0]} OR order_number=${args[0]} LIMIT 1`;
        if (rows[0]) {
          const ord = mapRowToOrder(rows[0]);
          const recipient = ord.customer_whatsapp || ord.customer_phone;
          const text = buildServerOrderWhatsAppMessage(rawType as any, ord, settings);
          await dispatchWhatsAppViaCrm(sql, { recipient, text, type: rawType as any, orderId: ord.id, orderNumber: ord.order_number, settings });
        }
      }
    } catch {}
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
    const discount = Number(order.discount || 0);
    if(!Number.isFinite(order.shipping_fee)||order.shipping_fee<0||!Number.isFinite(order.subtotal)||!Number.isFinite(order.total)||!Number.isFinite(discount)||discount<0||discount>order.subtotal||Math.abs(order.total-(order.subtotal-discount+order.shipping_fee))>0.011) throw fail(400,'إجمالي الطلب غير صالح.');
    if(order.items.some((i:any)=>!i.product?.id||!Number.isInteger(i.quantity)||i.quantity<=0||i.quantity>1000||!Number.isFinite(i.product.price)||i.product.price<=0)) throw fail(400,'كميات أو أسعار الطلب غير صالحة.');
    const subtotal=order.items.reduce((sum:number,i:any)=>sum+i.product.price*i.quantity,0);
    if(Math.abs(subtotal-order.subtotal)>0.011) throw fail(400,'راجع إجمالي المنتجات في السلة.');
    const phone=normalizePhone(String(order.customer_phone||''));
    if(phone.length!==11||!order.customer_name?.trim()||!order.address_details?.trim()||!['cod','instapay','vodafone_cash','credit_card','card'].includes(order.payment_method)) throw fail(400,'راجع اسم العميل والهاتف والعنوان وطريقة الدفع.');
    let orderSettings: any = null;
    try { orderSettings = store.getStoreSettings ? await store.getStoreSettings() : null; } catch {}
    const isCardMethod = order.payment_method === 'credit_card' || order.payment_method === 'card';
    const gatewayActiveForOrder = shouldRouteOrderToGateway(order.payment_method, orderSettings);
    if (isCardMethod && !gatewayActiveForOrder) {
      throw fail(400, 'الدفع بالبطاقة البنكية أونلاين غير مفعل حالياً في إعدادات بوابة الدفع.');
    }
    const safeOrderId = String(order.id || `ord-${Date.now()}`);
    const safeOrderNumber = String(order.order_number || `JOE-${Math.floor(10000 + Math.random() * 90000)}`);
    const fullOrder = {
      ...order,
      id: safeOrderId,
      order_number: safeOrderNumber,
      customer_phone: phone,
      customer_email: user?.email || null,
      payment_status: 'unpaid',
      order_status: 'pending'
    };
    const saved = await saveOrder(sql, fullOrder);
    if (!saved) return saved;
    if (gatewayActiveForOrder) {
      let gatewaySession: any;
      try {
        gatewaySession = await createGatewayCheckoutSession(sql, {
          order: fullOrder,
          baseUrl: resolveRequestOrigin(req),
          settings: orderSettings
        });
      } catch (gwErr: any) {
        await cancelStoredOrder(sql, safeOrderId, 'تعذر تهيئة رابط بوابة الدفع الإلكتروني', 'admin').catch(() => {});
        throw fail(502, gwErr?.message || 'تعذر الاتصال ببوابة الدفع الإلكتروني حالياً.');
      }
      try {
        const crm = resolveCrmConfig(orderSettings);
        if (crm.configured && crm.shouldAutoSend('admin_new_order') && crm.adminAlertRecipients.length) {
          const adminMsg = buildServerOrderWhatsAppMessage('admin_new_order', fullOrder, orderSettings);
          await Promise.allSettled(
            crm.adminAlertRecipients.map((adminPhone: string) =>
              dispatchWhatsAppViaCrm(sql, {
                recipient: adminPhone,
                text: adminMsg,
                type: 'admin_new_order',
                orderId: safeOrderId,
                orderNumber: safeOrderNumber,
                settings: orderSettings
              })
            )
          );
        }
      } catch {}
      return {
        success: true,
        id: safeOrderId,
        order_number: safeOrderNumber,
        payment: {
          provider: gatewaySession.provider,
          mode: gatewaySession.mode,
          transactionId: gatewaySession.transactionId
        },
        checkout_url: gatewaySession.checkoutUrl
      };
    }
    try {
      const crm = resolveCrmConfig(orderSettings);
      if (crm.configured) {
        const jobs: Promise<any>[] = [];
        const recipient = fullOrder.customer_whatsapp || phone;
        if (crm.shouldAutoSend('order_confirmed') && recipient) {
          const customerMsg = buildServerOrderWhatsAppMessage('order_confirmed', fullOrder, orderSettings);
          jobs.push(
            dispatchWhatsAppViaCrm(sql, {
              recipient,
              text: customerMsg,
              type: 'order_confirmed',
              orderId: safeOrderId,
              orderNumber: safeOrderNumber,
              settings: orderSettings
            })
          );
        }
        if (crm.shouldAutoSend('admin_new_order') && crm.adminAlertRecipients.length) {
          const adminMsg = buildServerOrderWhatsAppMessage('admin_new_order', fullOrder, orderSettings);
          for (const adminPhone of crm.adminAlertRecipients) {
            jobs.push(
              dispatchWhatsAppViaCrm(sql, {
                recipient: adminPhone,
                text: adminMsg,
                type: 'admin_new_order',
                orderId: safeOrderId,
                orderNumber: safeOrderNumber,
                settings: orderSettings
              })
            );
          }
        }
        if (jobs.length) await Promise.allSettled(jobs);
      }
    } catch {}
    return saved;
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
  if(method==='submitProductReview') {
    const data = args[0] || {};
    const productId = String(data.product_id || '').trim();
    const authorName = String(data.author_name || '').trim().slice(0, 100);
    const comment = String(data.comment || '').trim().slice(0, 600);
    const rating = Math.max(1, Math.min(5, Math.round(Number(data.rating) || 5)));
    if (!productId || !authorName || !comment) throw fail(400, 'يرجى كتابة الاسم والتعليق واختيار المنتج.');
    const images = Array.isArray(data.images)
      ? data.images.filter((img: any) => typeof img === 'string' && img.trim()).slice(0, 3)
      : [];
    return store.submitProductReview({
      product_id: productId,
      product_name_ar: data.product_name_ar ? String(data.product_name_ar).slice(0, 200) : undefined,
      author_name: authorName,
      author_phone: data.author_phone ? String(data.author_phone).trim().slice(0, 30) : undefined,
      user_id: user?.id || data.user_id || undefined,
      session_id: data.session_id ? String(data.session_id).slice(0, 100) : undefined,
      rating,
      comment,
      images
    });
  }
  if(method==='getProductReviews') {
    const [productId, sessionId] = args;
    if(!productId || typeof productId !== 'string') return [];
    return store.getProductReviews(productId, sessionId, user?.id);
  }
  if(policies[method]||['trackActivity','syncActiveCart','getPersonalizedRecommendations','getRecentlyViewedProductIds'].includes(method)) {
    if(typeof store[method]!=='function') throw fail(400,'الإجراء غير مدعوم.');
    if(method==='trackActivity'&&args[0]&&typeof args[0]==='object') {
      args[0] = { ...args[0], customerId: user?.id || undefined };
    }
    if(method==='syncActiveCart'&&args[0]&&typeof args[0]==='object') {
      args[0] = { ...args[0], customerId: user?.id || undefined };
    }
    if(method==='getRecentlyViewedProductIds') {
      args[1] = user?.id || null;
    }
    const actor=user?{id:user.id,name:user.name}:undefined;
    if(method==='updateProduct')args[2]=actor;
    if(method==='updateProductReviewStatus')args[2]=actor;
    if(method==='deleteProductReview')args[1]=actor;
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
    if(method==='addCoverEntry') {
      const data=args[0]||{};
      if(!String(data.brand||'').trim()||!String(data.model||'').trim()) throw fail(400,'اكتب ماركة الموبايل والموديل على الأقل.');
      args[0]={brand:String(data.brand).trim().slice(0,200),model:String(data.model).trim().slice(0,200),style:String(data.style||'').trim().slice(0,200),color:String(data.color||'').trim().slice(0,200),location:String(data.location||'').trim().slice(0,200),notes:String(data.notes||'').trim().slice(0,2000)};
      args[1]=actor;
    }
    if(method==='addScreenEntry') {
      const data=args[0]||{};
      const models=(Array.isArray(data.models)?data.models:[]).filter((m:any)=>m&&String(m.name||'').trim()).slice(0,50)
        .map((m:any)=>({brand:String(m.brand||'').trim().slice(0,100),brandAr:String(m.brandAr||m.brand||'').trim().slice(0,100),name:String(m.name||'').trim().slice(0,150)}));
      if(!String(data.boxCode||'').trim()||!String(data.screenTitle||'').trim()||!models.length) throw fail(400,'اكتب كود الباكتة والعنوان وموديل توافق واحد على الأقل.');
      args[0]={boxCode:String(data.boxCode).trim().slice(0,100),screenTitle:String(data.screenTitle).trim().slice(0,200),category:String(data.category||'og_clear').slice(0,50),shelfLocation:String(data.shelfLocation||'').trim().slice(0,200),notes:String(data.notes||'').trim().slice(0,2000),models};
      args[1]=actor;
    }
    if(method==='escalateSupportTicket')args[2]=actor;
    if(method==='closeSupportTicket')args[1]=actor;
    if(['getAuditLog','getAllRefusals','getWishlistGap'].includes(method))args[0]=Math.max(1,Math.min(200,Number(args[0])||50));
    return store[method](...args);
  }
  throw fail(400,'الإجراء غير مدعوم.');
}
const PUBLIC_GET_METHODS = new Set(['getProducts', 'getStoreSettings']);
const PUBLIC_CACHE_HEADER = 'public, max-age=0, s-maxage=30, stale-while-revalidate=120';

function parsePublicGetRequest(rawUrl: string) {
  const url = new URL(rawUrl || '/api/store', 'http://localhost');
  const method = url.searchParams.get('method') || '';
  if (!PUBLIC_GET_METHODS.has(method)) return null;
  if (method === 'getStoreSettings') return { method, args: [] as any[] };
  const params: Record<string, any> = { includeHidden: false };
  const limitRaw = url.searchParams.get('limit');
  const offsetRaw = url.searchParams.get('offset');
  const category = url.searchParams.get('category');
  const search = url.searchParams.get('search');
  if (limitRaw !== null && limitRaw !== '') {
    const limitNum = Number(limitRaw);
    if (Number.isFinite(limitNum)) params.limit = limitNum;
  }
  if (offsetRaw !== null && offsetRaw !== '') {
    const offsetNum = Number(offsetRaw);
    if (Number.isFinite(offsetNum)) params.offset = offsetNum;
  }
  if (category) params.category = category;
  if (search) params.search = search;
  return { method, args: [params] };
}

export default async function handler(req:any,res:any,deps?:any) {
  res.setHeader('Cache-Control','no-store');
  if(!sameOrigin(req)) return res.status(403).json({error:'الطلب يجب أن يأتي من المتجر نفسه.'});
  if(req.method==='GET') {
    const parsed=parsePublicGetRequest(req.url);
    if(!parsed) return res.status(405).json({error:'Method Not Allowed'});
    try {
      // Public GET endpoints never inspect session cookies or return privileged fields.
      const result=await execute(req,res,parsed,{...(deps||{}),user:null});
      const cacheable=parsed.method==='getProducts'
        ? Boolean(result&&typeof result.total==='number'&&result.total>0)
        : Boolean(result&&typeof result==='object');
      if(cacheable) res.setHeader('Cache-Control',PUBLIC_CACHE_HEADER);
      return res.status(200).json({result:result??null});
    } catch(error:any) {
      res.setHeader('Cache-Control','no-store');
      console.error('[store]',error.status||500,error.code||error.message?.slice(0,100));
      return res.status(error.status||500).json({error:error.status?error.message:'تعذر تنفيذ الطلب في الخادم. حاول مرة أخرى.',code:error.status?error.code:undefined});
    }
  }
  if(req.method!=='POST') return res.status(405).json({error:'Method Not Allowed'});
  try {
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
    if(JSON.stringify(body).length>3_000_000) return res.status(413).json({error:'حجم الطلب أكبر من المسموح.'});
    return res.status(200).json({result:(await execute(req,res,body,deps))??null});
  } catch(error:any) {
    console.error('[store]',error.status||500,error.code||error.message?.slice(0,100));
    return res.status(error.status||500).json({error:error.status?error.message:'تعذر تنفيذ الطلب في الخادم. حاول مرة أخرى.',code:error.status?error.code:undefined});
  }
}
