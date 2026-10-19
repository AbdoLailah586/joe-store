import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
function compile(file, mocks = {}, transform = x => x) {
  const source = transform(fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8'));
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => mocks[id] || (id.endsWith('/access.js') ? require(new URL('../lib/access.js', import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, '$1')) : id === './AuthContext' ? { useAuth: () => ({user:null,sessionReady:true,adminSections:[]}) } : require(id)), module, module.exports);
  return module.exports;
}
const address = compile('src/utils/deliveryAddress.ts');
const { mapRowToOrder } = compile('server/store.ts', {
  './orderWrites.js': {}, '@neondatabase/serverless': { neon: () => () => {} }, '../src/utils/deliveryAddress.js': address
}, s => s.replace(/const DB_URL\s*=[\s\S]*?const sql = neon\(DB_URL\);/, 'const sql = neon("mock://delivery");'));

test('delivery details, correct city and separate contact numbers survive database reload', () => {
  const order = { address_type: 'work', district: 'الجامعة', street: 'شارع 1', building_no: '12', floor_no: '0', apartment_no: '7', landmark: 'بجوار المسجد', postal_code: '35511', extra_details: 'المدخل الخلفي', delivery_instructions: 'اتصل قبل الوصول', google_maps_url: 'https://maps.app.goo.gl/test', governorate: 'الدقهلية', city: 'المنصورة', address_details: 'الجامعة، شارع 1، المدخل الخلفي', customer_whatsapp: '01112345678', customer_secondary_phone: '01212345678', notes: 'اتصل بعد الخامسة' };
  const reloaded = mapRowToOrder({ id: 'test', customer_phone: '01012345678', governorate: order.governorate, address: address.formatDeliveryAddress(order), notes: address.encodeDeliveryNotes(order), items: [], total: 100 });
  for (const key of Object.keys(order)) assert.equal(reloaded[key], order[key], key);
  assert.equal(reloaded.total, 100);
  assert.match(address.formatDeliveryAddress(reloaded), /دور: 0/);
  assert.match(address.formatDeliveryAddress(reloaded), /رمز بريدي: 35511/);
});
test('old plain-text order notes and addresses remain readable without inventing a city', () => {
  const old = mapRowToOrder({ id: 'old', governorate: 'القاهرة', address: 'العنوان القديم', notes: 'اتصل قبل الوصول', items: [] });
  assert.equal(old.notes, 'اتصل قبل الوصول');
  assert.equal(old.address_details, 'العنوان القديم');
  assert.equal(old.city, '');
  assert.equal(old.building_no, undefined);
  assert.equal(address.decodeDeliveryNotes('{broken').notes, '{broken');
  assert.equal(address.decodeDeliveryNotes('{"unrelated":true}').notes, '{"unrelated":true}');
});
test('delivery metadata cannot replace order identifiers or payment state', () => {
  const row = mapRowToOrder({ id: 'real', notes: JSON.stringify({ __joeDelivery: 1, delivery: { id: 'fake', payment_status: 'paid', total: 0, city: 42, building_no: '4' }, notes: 'a' }), total: 250, payment_status: 'unpaid' });
  assert.equal(row.id, 'real'); assert.equal(row.payment_status, 'unpaid'); assert.equal(row.total, 250);
  assert.equal(row.city, ''); assert.equal(row.building_no, '4');
});
test('Egyptian phone numbers accept Arabic digits, spaces and international prefix', () => {
  assert.equal(address.normalizePhone('+20 101 234 5678'), '01012345678');
  assert.equal(address.normalizePhone('٠١٠١٢٣٤٥٦٧٨'), '01012345678');
  assert.equal(address.isEgyptianPhone('00201012345678'), true);
  assert.equal(address.isEgyptianPhone('12345'), false);
  assert.equal(address.isEgyptianPhone('not a phone'), false);
});
test('map links accept official Maps URLs and reject other destinations and executable URLs', () => {
  assert.equal(address.isGoogleMapsUrl('https://www.google.com/maps?q=30,31'), true);
  assert.equal(address.isGoogleMapsUrl('https://maps.app.goo.gl/test'), true);
  assert.equal(address.isGoogleMapsUrl('javascript:alert(1)'), false);
  assert.equal(address.isGoogleMapsUrl('https://google.com.evil.invalid/maps'), false);
  assert.equal(address.isGoogleMapsUrl('https://example.com/maps'), false);
});

test('a failed order save keeps the cart and avoids success state changes', async () => {
  const events = [];
  const product = { id: 'test-product', price: 100, stock: 4, in_stock: true, is_active: true };
  const react = { createContext: () => ({ Provider: () => null }), useEffect() {}, useRef: current => ({ current }), useState(initial) {
    let value = typeof initial === 'function' ? initial() : initial;
    return [value, next => { events.push('state'); value = typeof next === 'function' ? next(value) : next; }];
  } };
  const storage = { readStorage: () => null, readStoredArray: () => [], readStoredSettings: () => ({}), writeStorage() {}, writeStoredJson: () => true, removeStorage() {} };
  const whatsapp = { defaultSettings: {}, getWhatsAppLogs: () => [] };
  globalThis.window = { location: { pathname: '/', search: '' } };
  const { StoreProvider } = compile('src/context/StoreContext.tsx', {
    '../services/offlineCatalog': {deviceIsOnline:()=>true,readOfflineCatalog:async()=>null,saveOfflineCatalog:async()=>false},
    react, '../data/seedProducts': { initialProducts: [product] }, '../utils/browserStorage': storage,
    '../utils/whatsappService': whatsapp, '../services/neonDb': { neonDb: { createOrder: async () => { events.push('persist'); return false; } } },
    './AuthContext': { useAuth: () => ({ user: null }) }
  });
  const context = StoreProvider({ children: null }).props.value;
  await assert.rejects(context.createOrder({ items: [{ product, quantity: 1 }], city: 'المنصورة' }), /سلتك محفوظة/);
  assert.deepEqual(events, ['persist']);
  delete globalThis.window;
});

test('offline checkout refuses before any order write, stock change or cart mutation',async()=>{
  const events=[];
  const react={createContext:()=>({Provider:()=>null}),useEffect(){},useRef:current=>({current}),useState(initial){return[typeof initial==='function'?initial():initial,()=>events.push('state')]}};
  globalThis.window={location:{pathname:'/checkout',search:''}};
  const {StoreProvider}=compile('src/context/StoreContext.tsx',{
    react,'../services/offlineCatalog':{deviceIsOnline:()=>false},'../data/seedProducts':{initialProducts:[]},
    '../utils/browserStorage':{readStorage:()=>null,readStoredArray:()=>[],readStoredSettings:()=>({}),writeStorage(){},writeStoredJson:()=>true},
    '../utils/whatsappService':{defaultSettings:{},getWhatsAppLogs:()=>[]},'./AuthContext':{useAuth:()=>({user:null})},
    '../services/neonDb':{neonDb:{createOrder:async()=>{events.push('network');return true}}}
  });
  const context=StoreProvider({children:null}).props.value;
  await assert.rejects(context.createOrder({items:[]}),/لن يتم إرسال الطلب تلقائيًا/);
  assert.equal(context.isOfflineCatalog,true);assert.equal(context.isCatalogReadyForReports,false);assert.deepEqual(events,[]);
  delete globalThis.window;
});

const geography = compile('src/data/governorates.ts');
test('address selector separates all 27 governorates and retains previous shipping tariffs', () => {
  assert.equal(geography.egyptianGovernorates.length, 27);
  assert.equal(new Set(geography.egyptianGovernorates.map(g => g.id)).size, 27);
  assert.equal(geography.egyptianGovernorates.find(g => g.id === 'daqahlia').shipping_fee, 35);
  assert.equal(geography.egyptianGovernorates.find(g => g.id === 'ismailia').shipping_fee, 55);
  assert.equal(geography.egyptianGovernorates.find(g => g.id === 'aswan').shipping_fee, 80);
});
test('older saved governorate labels resolve without moving the address to another region', () => {
  assert.equal(geography.findAddressGovernorate('الدقهلية (المنصورة وما حولها)', 'طلخا').id, 'daqahlia');
  assert.equal(geography.findAddressGovernorate('بورسعيد والإسماعيلية والسويس', 'السويس').id, 'suez');
  assert.equal(geography.findAddressGovernorate('محافظات الصعيد (أسيوط، سوهاج، قنا، الأقصر، أسوان)', 'أسوان').id, 'aswan');
});

test('saving an address reports a database failure without adding it to cached identity', async () => {
  const mutations = [];
  const user = { id: 'test-user', role: 'customer', email: 'test@example.invalid', addresses: [] };
  const react = { createContext: () => ({ Provider: () => null }), useEffect() {}, useRef: current => ({ current }), useCallback: fn => fn, useState(initial) {
    return [typeof initial === 'function' ? initial() : initial, () => mutations.push('state')];
  } };
  const { AuthProvider } = compile('src/context/AuthContext.tsx', {
    react,
    '../services/neonDb': { neonDb: { updateUserProfile: async () => ({ success: false, error: 'save unavailable' }) } },
    '../utils/browserStorage': { readStoredJson: () => user, readStoredArray: () => [], writeStoredJson: () => mutations.push('cache') }
  });
  const auth = AuthProvider({ children: null }).props.value;
  const result = await auth.addAddress({ title: 'المنزل', governorate: 'القاهرة', city: 'القاهرة', details: 'شارع اختبار', isDefault: true });
  assert.equal(result.success, false);
  assert.equal(result.error, 'save unavailable');
  assert.deepEqual(mutations, []);
  assert.deepEqual(user.addresses, []);
});
