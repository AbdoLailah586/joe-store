import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function compile(file,globals={}){
 const source=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};
 vm.runInNewContext(js,{module,exports:module.exports,setTimeout,clearTimeout,console,...globals});return module.exports;
}
function worker(){
 const handlers={},all=new Map(), calls=[];let online=true,skip=0;
 const key=x=>new URL(typeof x==='string'?x:x.url,'https://store.test').href;
 const store=name=>{if(!all.has(name))all.set(name,new Map());const data=all.get(name);return {
  async addAll(requests){for(const r of requests)data.set(key(r),new Response('PRECACHED '+key(r),{headers:{'content-type':key(r).endsWith('.svg')?'image/svg+xml':'text/html'}}))},
  async match(request){return data.get(key(request))?.clone()},async put(request,response){data.set(key(request),response.clone())},
  async keys(){return [...data.keys()].map(url=>new Request(url))},async delete(request){return data.delete(key(request))}
 }};
 const caches={open:async name=>store(name),keys:async()=>[...all.keys()],delete:async name=>all.delete(name),match:async(request,options)=>store(options.cacheName).match(request)};
 class WebRequest extends Request {constructor(url,options){super(new URL(url,'https://store.test'),options)}}
 const context={caches,URL,Request:WebRequest,Response,AbortController,setTimeout,clearTimeout,
  self:{location:{origin:'https://store.test'},clients:{claim:async()=>{}},skipWaiting:()=>{skip++},addEventListener:(name,fn)=>{handlers[name]=fn}},
  fetch:async(request)=>{calls.push(request.url);if(!online)throw new TypeError('Offline');return new Response('NETWORK',{headers:{'content-type':request.url.includes('product-images')?'image/webp':'text/html'}})}
 };
 const precache=['/index.html','/offline.html','/assets/app.js','/product-placeholder.svg'];
 vm.runInNewContext(fs.readFileSync(new URL('../pwa/service-worker.template.js',import.meta.url),'utf8').replace('__PWA_VERSION__','test').replace('__PWA_PRECACHE__',JSON.stringify(precache)),context);
 async function lifetime(name){let promise;handlers[name]({waitUntil:p=>{promise=p}});await promise}
 async function fetch(request){let response;const pending=[];handlers.fetch({request,respondWith:p=>{response=p},waitUntil:p=>pending.push(p)});const result=await response;await Promise.all(pending);return result}
 return {all,calls,handlers,caches,lifetime,fetch,setOffline:()=>{online=false},skip:()=>skip};
}
test('install metadata has real 192/512 icons, a stable identity and correct hosting routes',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('../public/manifest.webmanifest',import.meta.url)));
 assert.equal(manifest.id,'/');assert.equal(manifest.scope,'/');assert.equal(manifest.display,'standalone');assert.equal(manifest.prefer_related_applications,false);
 for(const size of [192,512]){
  const icon=manifest.icons.find(i=>i.sizes===`${size}x${size}`&&i.purpose==='any');assert.ok(icon);
  const png=fs.readFileSync(new URL('../public'+icon.src,import.meta.url));assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);
 }
 const config=JSON.parse(fs.readFileSync(new URL('../vercel.json',import.meta.url)));
 const spa=new RegExp('^'+config.rewrites[0].source+'$');
 for(const url of ['/sw.js','/manifest.webmanifest','/pwa/icon-512.png','/offline.html','/api/store'])assert.equal(spa.test(url),false,url);
 assert.equal(spa.test('/catalog'),true);assert.equal(spa.test('/admin'),true);
 assert.match(config.headers.find(h=>h.source==='/sw.js').headers.find(h=>h.key==='Cache-Control').value,/no-cache/);
});
test('a real cached app shell opens direct routes and refreshes offline without cached API sessions',async()=>{
 const w=worker();await w.lifetime('install');w.setOffline();
 for(const path of ['/catalog?page=3','/product/example','/?source=pwa']){
  const result=await w.fetch({url:'https://store.test'+path,method:'GET',mode:'navigate'});
  assert.equal(result.status,200);assert.match(await result.text(),/PRECACHED https:\/\/store.test\/index.html/);
 }
 for(const request of [{url:'https://store.test/api/store',method:'POST'},{url:'https://store.test/api/health',method:'GET'},{url:'https://accounts.google.com/test',method:'GET'}])assert.equal(await w.fetch(request),undefined);
});
test('worker caches only public images within bounds; missing images get a placeholder, never HTML scripts',async()=>{
 const w=worker();await w.lifetime('install');
 const req=new Request('https://store.test/product-images/example.webp');
 assert.equal(await(await w.fetch(req)).text(),'NETWORK');w.setOffline();assert.equal(await(await w.fetch(req)).text(),'NETWORK');
 const fallback=await w.fetch(new Request('https://store.test/product-images/missing.webp'));assert.equal(fallback.headers.get('content-type'),'image/svg+xml');
 const script=await w.fetch(new Request('https://store.test/assets/not-cached.js'));assert.equal(script.type,'error');
 const other=worker();await other.lifetime('install');
 for(let n=0;n<108;n++)await other.fetch(new Request(`https://store.test/product-images/${n}.webp`));
 assert.equal((await(await other.caches.open('joe-store-pwa-test-images')).keys()).length,100);
});
test('activation cleans only this app caches and an update never skips waiting without a user action',async()=>{
 const w=worker();await w.lifetime('install');await w.caches.open('unrelated-app-cache');await w.caches.open('joe-store-pwa-obsolete-shell');
 const previous=await w.caches.open('joe-store-pwa-old-shell');await previous.put('/assets/old-lazy.js',new Response('PREVIOUS TAB'));
 assert.equal(w.skip(),0);await w.lifetime('activate');assert.ok(w.all.has('unrelated-app-cache'));assert.equal(w.all.has('joe-store-pwa-obsolete-shell'),false);assert.ok(w.all.has('joe-store-pwa-old-shell'));
 w.setOffline();assert.equal(await(await w.fetch(new Request('https://store.test/assets/old-lazy.js'))).text(),'PREVIOUS TAB');
 w.handlers.message({data:{type:'UNRELATED'}});assert.equal(w.skip(),0);w.handlers.message({data:{type:'SKIP_WAITING'}});assert.equal(w.skip(),1);
});
test('offline snapshots exclude hidden stock, costs, account data and internal metadata',async()=>{
 const offline=compile('src/services/offlineCatalog.ts');
 const result=offline.publicCatalog([{id:'public',name_ar:'سماعة',price:550,stock:2,is_active:true,cost_price:400,source_name:'wholesale',password_hash:'private',admin_permissions:['users'],specs:{__private:'hidden',Bluetooth:'5'},images:['/public.webp']},{id:'hidden',name_ar:'hidden',price:500,is_active:false}]);
 assert.equal(result.length,1);assert.equal(result[0].price,550);assert.equal(result[0].cost_price,undefined);assert.equal(result[0].password_hash,undefined);assert.equal(result[0].source_name,undefined);assert.equal(result[0].admin_permissions,undefined);assert.equal(result[0].specs.__private,undefined);
 assert.equal(await offline.readOfflineCatalog(),null);assert.equal(await offline.saveOfflineCatalog(result),false);
});
test('the install prompt is captured, used once on a click, dismissed safely and confirmed by the browser',async()=>{
 const events={};let prevented=0,prompted=0;
 const pwa=compile('src/services/pwa.ts',{window:{matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener:(name,fn)=>{events[name]=fn}},navigator:{}});
 pwa.initPwa(false);assert.equal(await pwa.promptInstall(),'unavailable');
 events.beforeinstallprompt({preventDefault:()=>{prevented++},prompt:async()=>{prompted++},userChoice:Promise.resolve({outcome:'dismissed'})});
 assert.equal(prevented,1);assert.equal(pwa.pwaSnapshot().installable,true);assert.equal(prompted,0);
 assert.equal(await pwa.promptInstall(),'dismissed');assert.equal(prompted,1);assert.equal(await pwa.promptInstall(),'unavailable');assert.equal(pwa.pwaSnapshot().installed,false);
 events.appinstalled();assert.equal(pwa.pwaSnapshot().installed,true);assert.equal(pwa.pwaSnapshot().installable,false);
});
test('an already-installing update is detected and never reloads a form before the user accepts',async()=>{
 const events={},messages=[];let changed,reloads=0;
 const worker={state:'installing',addEventListener:(_,fn)=>{changed=fn},postMessage:message=>messages.push(message)};
 const reg={installing:worker,waiting:null,addEventListener(){}};
 const pwa=compile('src/services/pwa.ts',{
  window:{matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(){},location:{reload:()=>{reloads++}}},
  navigator:{serviceWorker:{controller:{},register:async()=>reg,ready:Promise.resolve(),addEventListener:(name,fn)=>{events[name]=fn}}}
 });
 pwa.initPwa(true);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(pwa.pwaSnapshot().offlineReady,true);assert.equal(pwa.pwaSnapshot().updateReady,false);
 worker.state='installed';reg.waiting=worker;changed();assert.equal(pwa.pwaSnapshot().updateReady,true);assert.equal(reloads,0);
 events.controllerchange();assert.equal(reloads,0);
 pwa.applyPwaUpdate();assert.equal(messages[0].type,'SKIP_WAITING');assert.equal(reloads,0);
 events.controllerchange();assert.equal(reloads,1);
});
