import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as access from '../lib/access.js';
import { passwordHash,passwordMatches,issueSession,currentUser,sameOrigin } from '../lib/session.js';
import * as totp from '../lib/totp.js';
const require=createRequire(import.meta.url);
function compile(file,mocks={}){
 const filename=fileURLToPath(new URL('../'+file,import.meta.url));
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const module={exports:{}};new Function('require','module','exports',code)(id=>mocks[id]||require(id),module,module.exports);return module.exports;
}
const address=compile('src/utils/deliveryAddress.ts');
let pending=null,issued=0;
const {execute}=compile('api/store.ts',{'../server/store.js':{neonDb:{},mapRowToOrder:r=>r},'../lib/access.js':access,'../src/utils/deliveryAddress.js':address,'../server/orderWrites.js':{},'../lib/totp.js':totp,'../lib/session.js':{database:()=>{throw new Error('Unexpected live database')},currentUser:()=>null,passwordMatches,passwordHash,pendingSecondFactor:async()=>pending,issueSession:async()=>{issued++}}});
const res={setHeader(){}};
const limited={id:'limited',role:'customer',email:'staff@example.invalid',admin_permissions:['screens','covers','pricing']};
const admin={id:'manager',email:'manager@example.invalid',role:'admin',admin_permissions:[]};
const denySql=()=>{throw new Error('Authorization must run before SQL')};
test('section grants never imply full admin or unrelated tools, and malformed values fail closed',()=>{
 assert.deepEqual(access.permittedSections(limited),['screens','covers','pricing']);
 assert.equal(access.isFullAdmin(limited),false);assert.equal(access.canAccessSection(limited,'users'),false);
 assert.equal(access.canAccessSection({...limited,admin_permissions:['tools']},'covers'),false);
 assert.deepEqual(access.normalizePermissions(['covers','covers','__proto__','unknown']),['covers']);
 assert.deepEqual(access.normalizePermissions('*'),[]);assert.equal(access.permittedSections(admin).length,22);
 assert.deepEqual(access.permittedSections(null),[]);
});
test('limited accounts and unauthenticated callers cannot run unrelated management operations',async()=>{
 for(const user of [null,limited])for(const method of ['getAllUsers','getActiveCarts','updateProduct','toggleProductVisibility','bulkInsertProducts','updateOrderState','updateUserAccess','getPickingList','getDeliveryBoard','confirmPacking','updateOrderStatus','recordDeliveryRefusal','getRefusalHistory','getAllRefusals','getAuditLog','getSupplierQuotes','addSupplierQuote','listSupportTickets','closeSupportTicket','escalateSupportTicket']){
  await assert.rejects(execute({},res,{method,args:['target',{}]},{user,sql:denySql,store:{}}),e=>e.status===403);
 }
});
test('covers require their own grant and save only known correction fields',async()=>{
 await assert.rejects(execute({},res,{method:'getCoverOverrides'},{user:null,sql:denySql}),e=>e.status===403);
 const writes=[];const sql=async(strings,...params)=>{writes.push(params);return[]};
 await execute({},res,{method:'saveCoverOverride',args:['cover-002',{model:'Galaxy A26',location:'Shelf 2',price:1,role:'admin'}]},{user:limited,sql});
 assert.deepEqual(JSON.parse(writes[0][1]),{model:'Galaxy A26',location:'Shelf 2'});
 assert.equal(writes[0][2],limited.id);
});
test('staff actions use the verified actor and only full managers can override holds',async()=>{
 const user={...limited,admin_permissions:['fulfillment']};let options;
 const store={updateOrderStatus:async(id,status,o)=>{options=o;return{success:true}}};
 await execute({},res,{method:'updateOrderStatus',args:['o','shipped',{actor:{id:'forged'},courierName:'Courier'}]},{user,store,sql:denySql});
 assert.equal(options.actor.id,limited.id);
 await assert.rejects(execute({},res,{method:'updateOrderStatus',args:['o','shipped',{override:true,overrideReason:'Fake'}]},{user,store,sql:denySql}),e=>e.status===403);
});
test('TOTP cannot be reset for another user and a pending login cannot skip its challenge',async()=>{
 await assert.rejects(execute({},res,{method:'setupTotp',args:['other']},{user:admin,sql:denySql}),e=>e.status===403);
 pending=null;issued=0;
 await assert.rejects(execute({},res,{method:'completeSecondFactor',args:['123456']},{user:null,sql:denySql}),e=>e.status===401);
 pending={...limited,totp_enabled:true,totp_secret:totp.generateTotpSecret(),token_hash:'hash'};
 await assert.rejects(execute({},res,{method:'completeSecondFactor',args:['bad']},{user:null,sql:denySql}),e=>e.status===401);
 assert.equal(issued,0);
 const result=await execute({},res,{method:'completeSecondFactor',args:[totp.currentTotpCode(pending.totp_secret)]},{user:null,sql:async()=>[{user_id:limited.id}]});
 assert.equal(result.user.id,limited.id);assert.equal(issued,1);assert.equal(result.user.totp_secret,undefined);pending=null;
});
test('knowing a support ticket identifier or phone does not authorize its conversation',async()=>{
 for(const method of ['getSupportTicket','replySupportTicket','rateSupportTicket'])await assert.rejects(execute({headers:{}},res,{method,args:['other','customer','hello']},{user:null,sql:async()=>[],store:{}}),e=>e.status===403);
});
test('viewing the user page still cannot grant roles or delete another account',async()=>{
 const user={...limited,admin_permissions:['users']};
 for(const method of ['updateUserAccess','updateUserRole','deleteUser'])await assert.rejects(execute({},res,{method,args:['another',{role:'admin',permissions:[]}]},{user,sql:denySql}),e=>e.status===403);
});
test('role editing protects the actor and owner, rejects unknown grants and confirms saved data',async()=>{
 const captures=[];const sql=async(strings,...params)=>{captures.push({query:strings.join('?'),params});return[{...limited,id:'target',admin_permissions:['covers']}]};
 await assert.rejects(execute({},res,{method:'updateUserAccess',args:['manager',{role:'customer',permissions:[]}]},{user:admin,sql}),e=>e.status===400);
 await assert.rejects(execute({},res,{method:'updateUserAccess',args:['target',{role:'customer',permissions:['no-such-page']}]},{user:admin,sql}),e=>e.status===400);
 const result=await execute({},res,{method:'updateUserAccess',args:['target',{role:'customer',permissions:['covers']}]},{user:admin,sql});
 assert.equal(result.success,true);assert.deepEqual(result.user.admin_permissions,['covers']);
 assert.match(captures[0].query,/lower\(email\)<>/);assert.ok(captures[0].params.includes(access.OWNER_EMAIL));assert.match(captures[0].query,/RETURNING/);
});
test('public catalog cannot request hidden rows or receive cost fields; granted inventory can',async()=>{
 const calls=[];const store={getProducts:async p=>{calls.push(p);return {total:1,products:[{id:'a',price:5,cost_price:3,source_name:'private',raw_source_stock:5}]}}};
 const guest=await execute({},res,{method:'getProducts',args:[{includeHidden:true,limit:900}]},{user:null,sql:denySql,store});
 assert.equal(calls[0].includeHidden,false);assert.equal(calls[0].limit,300);assert.equal(guest.products[0].cost_price,undefined);assert.equal(guest.products[0].source_name,undefined);
 const permitted=await execute({},res,{method:'getProducts',args:[{includeHidden:true}]},{user:{...limited,admin_permissions:['inventory']},sql:denySql,store});
 assert.equal(calls[1].includeHidden,true);assert.equal(permitted.products[0].cost_price,3);
});
test('an access refresh is bound to the verified session and cannot read a requested stranger',async()=>{
 assert.deepEqual(await execute({},res,{method:'getUserAccess',args:['stranger']},{user:limited,sql:denySql}),{success:true,exists:false});
 const result=await execute({},res,{method:'getUserAccess',args:['limited']},{user:limited,sql:denySql});assert.deepEqual(result.admin_permissions,limited.admin_permissions);
});
test('profile input cannot change identity to the owner or inject privileges',async()=>{
 await assert.rejects(execute({},res,{method:'updateUserProfile',args:['limited',{email:access.OWNER_EMAIL}]},{user:limited,sql:denySql}),e=>e.status===400);
 let saved;const store={updateUserProfile:async(id,data)=>{saved=data;return{success:true,user:limited}}};
 await execute({},res,{method:'updateUserProfile',args:['limited',{name:'New',role:'admin',admin_permissions:['users']}]},{user:limited,sql:denySql,store});assert.equal(saved.role,undefined);assert.equal(saved.admin_permissions,undefined);
});
test('sessions use random opaque tokens, store only hashes and re-read saved permissions',async()=>{
 const writes=[];const sql=async(strings,...params)=>{writes.push(params);return[{...limited,name:'Staff',provider:'google',addresses:[]}]};let cookie;
 await issueSession({headers:{'x-forwarded-proto':'https'}},{setHeader:(key,value)=>{if(key==='Set-Cookie')cookie=value}},'limited',sql);
 assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/SameSite=Lax/);
 const token=cookie.split(';')[0].split('=')[1];assert.equal(token.length,64);assert.notEqual(writes[0][0],token);
 const user=await currentUser({headers:{cookie:cookie.split(';')[0]}},sql);assert.deepEqual(user.admin_permissions,limited.admin_permissions);
 assert.equal(await currentUser({headers:{cookie:'joe_session=made-up'}},denySql),null);
 assert.equal(sameOrigin({headers:{origin:'https://other.example',host:'joe-store-2026.vercel.app'}}),false);
});
test('password login requires a stored password and migrates to salted hashes',()=>{
 const hashed=passwordHash('a-long-example-password');assert.notEqual(hashed,passwordHash('a-long-example-password'));
 assert.equal(passwordMatches('a-long-example-password',hashed),true);assert.equal(passwordMatches('wrong',hashed),false);assert.equal(passwordMatches('anything',''),false);
 assert.equal(passwordMatches('old-password','old-password'),true);assert.equal(passwordMatches('other','old-password'),false);
 const auth=fs.readFileSync(new URL('../src/context/AuthContext.tsx',import.meta.url),'utf8');assert.doesNotMatch(auth,/usr-admin-owner|found\.password|Check if admin master/);
 const client=fs.readFileSync(new URL('../src/services/neonDb.ts',import.meta.url),'utf8');assert.doesNotMatch(client,/VITE_DATABASE_URL|DATABASE_URL|const sql|neon\(/);
});
test('all 113 source photos have a catalog record, with uncertainty retained and no invented price or quantity',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../src/data/coverCatalog.json',import.meta.url),'utf8'));
 assert.equal(data.entries.length,113);assert.equal(new Set(data.entries.map(e=>e.filename)).size,113);assert.equal(new Set(data.entries.map(e=>e.id)).size,113);
 for(const entry of data.entries){assert.ok(fs.existsSync(new URL('../public/cover-images/'+entry.filename,import.meta.url)));assert.ok(entry.model&&entry.brand&&entry.label);assert.ok(entry.source_filename.endsWith(".jpg"));assert.ok(fs.existsSync(new URL("../public/cover-images/"+entry.thumbnail,import.meta.url)));assert.equal(entry.price,undefined);assert.equal(entry.quantity,undefined)}
 assert.equal(data.entries.filter(e=>e.needs_review).length,4);
 const config=JSON.parse(fs.readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));assert.match(config.rewrites[0].source,/cover-images/);
});
