import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
function compile(file, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'), { compilerOptions: { target:ts.ScriptTarget.ES2020, module:ts.ModuleKind.CommonJS, jsx:ts.JsxEmit.ReactJSX, esModuleInterop:true } }).outputText;
  const module={exports:{}};
  new Function('require','module','exports',code)(id=>mocks[id] || (id === './deliveryAddress' ? address : require(id)),module,module.exports);
  return module.exports;
}
const address=compile('src/utils/deliveryAddress.ts');
const tools=compile('src/utils/storeExpansion.ts');
test('numbered pagination clamps bounds, never duplicates and preserves complete page coverage',()=>{
  const data=Array.from({length:2245},(_,i)=>i), collected=[];
  for(let page=1;page<=63;page++)collected.push(...tools.pageSlice(data,page,36).rows);
  assert.deepEqual(collected,data);
  assert.deepEqual(tools.pageSlice([],99,36),{page:1,pages:1,from:0,to:0,rows:[]});
  assert.equal(tools.pageSlice(data,999,36).page,63);
  assert.equal(tools.pageSlice(data,-2,36).page,1);
  for(let page=1;page<=63;page++){
    const window=tools.pageWindow(page,63), numbers=window.filter(x=>typeof x==='number');
    assert.equal(new Set(numbers).size,numbers.length); assert.ok(numbers.includes(page)); assert.ok(numbers.includes(1)); assert.ok(numbers.includes(63));
  }
});
test('screen finder search handles Arabic spelling, mixed digits and complete query terms',()=>{
  assert.equal(tools.matchesFinder('سامسونج Samsung Galaxy A15','سامسونج A١٥'),true);
  assert.equal(tools.matchesFinder('سامسونج Samsung Galaxy A15','سامسونجA١٥'),true);
  assert.equal(tools.matchesFinder('OPPO A5 PRO','oppo a5'),true);
  assert.equal(tools.matchesFinder('Realme C55','realme c65'),false);
});
test('screen dataset keeps all 56 original packets, 192 models and their photos',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'src/data/screenFinder.json'),'utf8'));
  assert.equal(catalog.boxes.length,56); assert.equal(catalog.models.length,192);
  const ids=new Set(catalog.boxes.map(b=>b.id)); assert.equal(ids.size,56);
  for(const box of catalog.boxes){assert.equal(path.basename(box.filename),box.filename);assert.ok(fs.existsSync(path.join(root,'public/screen-finder-images',box.filename)));}
  for(const model of catalog.models)for(const box of model.boxes)assert.ok(ids.has(box.box_id));
  const vercel=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));
  assert.match(vercel.rewrites[0].source,/screen-finder-images/);
});
test('pricing solves margin on sale after commission instead of markup on cost',()=>{
  const result=tools.pricingEstimate(100,10,5,20);
  assert.ok(Math.abs(result.sale-146.66666666666666)<1e-9);
  assert.ok(Math.abs(result.profit/result.sale-.2)<1e-9);
  assert.equal(tools.pricingEstimate(100,0,50,50),null);
  assert.equal(tools.pricingEstimate(-1,0,0,20),null);
  assert.equal(tools.pricingEstimate(NaN,0,0,20),null);
});
test('delivered sales exclude cancelled and pending orders and respect Cairo calendar dates',()=>{
  const order=(id,status,total,created_at='2026-10-16T12:00:00Z')=>({id,order_status:status,total,shipping_fee:.1,created_at});
  const rows=[order('cancel','cancelled',99999),order('pending','pending',500),order('one','delivered',.1),order('two','delivered',.2),order('old','delivered',25,'2026-10-10T12:00:00Z')];
  const stats=tools.deliveredAnalytics(rows,'2026-10-16','2026-10-16');
  assert.equal(stats.rows.length,4);assert.equal(stats.revenue,.3);assert.equal(stats.shipping,.2);assert.equal(stats.cancelled,1);assert.equal(stats.pending,1);
});
test('price tag printing escapes catalog data and does not fabricate zero-price offers',()=>{
  const html=tools.priceLabelDocument([{name_ar:'<script>alert(1)</script>',sku:'"&<>',id:'x',price:0}],'<img onerror=bad>');
  assert.doesNotMatch(html,/<script>|<img onerror/);assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('اسأل عن السعر'));
  assert.ok(html.includes('window.print()'));
});
test('CSV text cannot become a formula and keeps Arabic multiline content',()=>{
  const csv=tools.downloadableCsv(['الاسم','الكمية'],[['=1+1',-2],['عربي\nسطر',3]]);
  assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('"\'=1+1"'));assert.ok(csv.includes('"عربي\nسطر"'));assert.ok(csv.includes('"-2"'));
});
test('purchase history never matches a person by name or a partial/shared phone',()=>{
  const customer={email:'mine@example.invalid',phone:'01012345678',name:'Same Name'};
  assert.equal(tools.orderBelongsToAccount({customer_email:' MINE@example.invalid ',customer_phone:''},customer),true);
  assert.equal(tools.orderBelongsToAccount({customer_phone:'+201012345678'},customer),true);
  assert.equal(tools.orderBelongsToAccount({customer_phone:'010123456789'},customer),false);
  assert.equal(tools.orderBelongsToAccount({customer_email:'someone@example.invalid',customer_phone:'01012345678'},customer),false);
  assert.equal(tools.orderBelongsToAccount({customer_phone:'',customer_name:'Same Name'},customer),false);
});
