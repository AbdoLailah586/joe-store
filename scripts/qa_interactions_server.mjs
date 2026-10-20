// LOCAL TEST FIXTURES ONLY. No account, order, message or stock writes reach production.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist'), port=5188;
const user={id:'qa-local-admin',name:'اختبار محلي — بيانات تجريبية',email:'qa@example.invalid',role:'admin',provider:'google',addresses:[],admin_permissions:[],created_at:'2026-10-20T10:00:00Z'};
if(process.env.JOE_QA_LIMITED==='1'){user.role='customer';user.admin_permissions=['overview'];}
const p={id:'qa-product',sku:'QA-ONLY',name_ar:'منتج تجريبي لاختبار الطلب',name_en:'Local QA product',brand:'QA',category:'audio',condition:'brand_new',stock:5,price:100,in_stock:true,images:['/product-placeholder.svg'],specs:{},warranty_months:3};
const order=(id,status,payment='cod')=>({id,order_number:id,customer_name:'عميل اختبار محلي',customer_phone:'01000000000',customer_whatsapp:'01000000000',customer_email:user.email,governorate:'الدقهلية',city:'المنصورة',address_details:'عنوان تجريبي لا يُستخدم للشحن',items:[{product:p,quantity:2}],subtotal:200,shipping_fee:35,discount:0,total:235,payment_method:payment,payment_status:'unpaid',order_status:status,created_at:'2026-10-17T10:00:00Z'});
const orders=[order('QA-DELIVERED','delivered'),order('QA-PENDING','pending'),order('QA-LATE','confirmed','instapay')];
const safe={getUserAccess:{success:true,exists:true,role:user.role,admin_permissions:user.admin_permissions},getSession:{success:true,user},getOrders:orders,getAllUsers:[user,{...user,id:'qa-customer',name:'عميل اختبار',email:'customer@example.invalid',role:'customer'}],getActiveCarts:[],getWishlistGap:[],getWhatsAppLogs:[],getPersonalizedRecommendations:{hasHistory:false,recommendedProducts:[],searchTags:[]},getCoverOverrides:{},getCoverAdditions:[],getScreenAdditions:[],getPickingList:orders.filter(o=>o.order_status==='confirmed'),getDeliveryBoard:[],listSupportTickets:[],getAuditLog:[],getSupplierQuotes:[],syncActiveCart:true,trackActivity:true};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.jpg':'image/jpeg','.ico':'image/x-icon'};
http.createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/')){
   let raw='';for await(const chunk of req)raw+=chunk;
   const body=JSON.parse(raw||'{}');res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
   if(url.pathname==='/api/store'&&body.method==='getProducts'){
    const response=await fetch('https://joe-store-2026.vercel.app/api/store',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method:'getProducts',args:[{...body.args?.[0],includeHidden:false}]})});res.writeHead(response.status);res.end(await response.text());return;
   }
   if(url.pathname==='/api/store'&&body.method==='trackOrder'){const o=orders.find(o=>o.order_number===body.args?.[0]&&body.args?.[1]==='01000000000');res.end(JSON.stringify({result:o||null}));return;}
   if(url.pathname==='/api/store'&&Object.hasOwn(safe,body.method)){res.end(JSON.stringify({result:safe[body.method]}));return;}
   res.writeHead(403);res.end(JSON.stringify({error:'Read-only local QA. Writes and unlisted reads are disabled.'}));return;
  }
  const requested=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(requested!==root&&!requested.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  let file=requested;try{if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html');}catch{file=path.join(root,'index.html');}
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-cache');res.end(await fs.readFile(file));
 }catch{res.writeHead(500);res.end('Local preview unavailable');}
}).listen(port,'127.0.0.1',()=>console.log(`Local fixtures, no production writes: http://localhost:${port}/admin`));
