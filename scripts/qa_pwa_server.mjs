// Read-only preview. Only public catalog reads reach production; no accounts,
// carts, analytics, messages, orders, payments or permission writes are sent.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist'),port=Number(process.env.PWA_QA_PORT||5186);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.jpg':'image/jpeg','.ico':'image/x-icon'};
http.createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/')){
   let raw='';for await(const chunk of req)raw+=chunk;
   const body=JSON.parse(raw||'{}');res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
   if(url.pathname==='/api/store'&&body.method==='getProducts'){
    const response=await fetch('https://joe-store-2026.vercel.app/api/store',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method:'getProducts',args:[{...body.args?.[0],includeHidden:false}]})});
    res.writeHead(response.status);res.end(await response.text());return;
   }
   const safe={getSession:{success:true,user:null},getOrders:[],getPersonalizedRecommendations:{preferredCategories:[],recommendedProducts:[]},syncActiveCart:true,trackActivity:true};
   if(url.pathname==='/api/store'&&Object.hasOwn(safe,body.method)){res.end(JSON.stringify({result:safe[body.method]}));return}
   res.writeHead(403);res.end(JSON.stringify({error:'Read-only local preview'}));return;
  }
  const requested=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(requested!==root&&!requested.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
  let file=requested;try{if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html')}catch{file=path.join(root,'index.html')}
  const data=await fs.readFile(file);res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-cache');res.end(data);
 }catch{res.writeHead(500);res.end('Preview unavailable')}
}).listen(port,'127.0.0.1',()=>console.log(`Read-only PWA preview: http://localhost:${port}`));
