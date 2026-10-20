import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const bundle = await build({entryPoints:['src/utils/detailModels.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const detail = await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const price = value => `${value} EGP`;
const product = (id, extra={}) => ({id,name_ar:id,name_en:id,brand:'Test',category:'audio',price:100,cost_price:73,stock:2,in_stock:true,images:['a.webp'],specs:{public:'visible',__private:'secret'},warranty_months:0,...extra});
const order = (id,status) => ({id,order_number:id,order_status:status,payment_status:'unpaid',payment_method:'cod',customer_name:'Test',customer_email:'test@example.invalid',governorate:'الدقهلية',city:'المنصورة',address_details:'عنوان تجريبي',created_at:'2026-10-20T10:00:00Z',subtotal:200,shipping_fee:35,total:235,items:[{product:product('p'),quantity:2}]});

test('stock drill-downs distinguish zero, negative, unknown and available recorded quantities',()=>{
 const rows=[product('zero',{recorded_stock:0,stock:99}),product('negative',{stock:-2}),product('unknown',{stock:undefined}),product('available',{stock:3})];
 assert.deepEqual(detail.inventoryMetricProducts(rows,2).map(p=>p.id),['zero']);
 assert.deepEqual(detail.inventoryMetricProducts(rows,1).map(p=>p.id),['available']);
 assert.deepEqual(detail.inventoryMetricProducts(rows,0).map(p=>p.id),rows.map(p=>p.id));
});
test('valuation and missing-price drill-downs select precisely the contributing rows',()=>{
 const rows=[product('valid'),product('noCost',{cost_price:undefined}),product('noPrice',{price:0}),product('zero',{stock:0})];
 assert.deepEqual(detail.inventoryMetricProducts(rows,4).map(p=>p.id),['valid','noPrice']);
 assert.deepEqual(detail.inventoryMetricProducts(rows,5).map(p=>p.id),['valid','noCost']);
 assert.deepEqual(detail.inventoryMetricProducts(rows,6).map(p=>p.id),['noPrice']);
});
test('analytics drill-downs keep cancelled and pending orders out of delivered revenue and shipping',()=>{
 const rows=['pending','confirmed','processing','shipped','out_for_delivery','delivered','cancelled'].map((status,i)=>order(String(i),status));
 assert.equal(detail.analyticsMetricOrders(rows,0).length,7);
 for(const index of [1,4,5]) assert.deepEqual(detail.analyticsMetricOrders(rows,index).map(o=>o.order_status),['delivered']);
 assert.equal(detail.analyticsMetricOrders(rows,2)[0].order_status,'cancelled');
 assert.equal(detail.analyticsMetricOrders(rows,3).length,5);
});
test('public product details exclude cost, private metadata and invented warranty',()=>{
 const p=product('p');const json=JSON.stringify(detail.productDetail(p,'ar',price));
 assert.ok(!json.includes('73 EGP'));assert.ok(!json.includes('__private'));assert.ok(!json.includes('secret'));
 assert.ok(json.includes('غير محدد'));assert.ok(JSON.stringify(detail.productDetail(p,'ar',price,true)).includes('73 EGP'));
});
test('order details preserve saved totals and product snapshots and only open the selected item',()=>{
 const o=order('order','delivered');let selected;const spec=detail.orderDetail(o,price,p=>selected=p.id);
 assert.equal(spec.facts.find(f=>f.label==='الإجمالي المسجل').value,'235 EGP');
 assert.equal(spec.rows[0].value,'200 EGP');spec.rows[0].onOpen();assert.equal(selected,'p');
 assert.equal(spec.rows[0].facts.find(f=>f.label==='الكمية').value,2);
});
test('record rows bind actions to the correct record and leave the source arrays unchanged',()=>{
 let selected;const rows=[order('a','pending'),order('b','delivered')];
 const result=detail.orderRows(rows,price,o=>selected=o.id);result[1].onOpen();assert.equal(selected,'b');assert.equal(rows.length,2);
 const products=[product('a'),product('b')];detail.productRows(products,price,p=>selected=p.id)[0].onOpen();assert.equal(selected,'a');assert.equal(products.length,2);
});
