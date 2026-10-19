import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
function compile(file, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => mocks[id] || (id.endsWith('/access.js') ? require(new URL('../lib/access.js', import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, '$1')) : id === './AuthContext' ? { useAuth: () => ({user:null,sessionReady:true,adminSections:[]}) } : require(id)), module, module.exports);
  return module.exports;
}
const report = compile('src/utils/inventoryReports.ts');
const exporter = compile('src/utils/inventoryReportExport.ts', { './inventoryReports': report });
const base = { id: 'a', sku: '001234', name_ar: 'سماعة', name_en: 'Earbuds', brand: 'Oraimo', category: 'audio', condition: 'brand_new', stock: 3, price: 550, cost_price: 400, images: ['product.jpg'], catalog_status: 'verified', image_is_illustrative: false };
const product = (id, data = {}) => ({ ...base, id, ...data });
const filters = data => ({ ...report.defaultInventoryFilters, ...data });
const ids = rows => rows.map(p => p.id).sort();

test('zero, negative, and configurable stock boundaries remain distinct', () => {
  const rows = [-2, 0, 2, 3, 5].map(stock => product(String(stock), { stock }));
  assert.deepEqual(ids(report.filterInventory(rows, filters({ stockOp: 'eq', stockValue: '٠' }))), ['0']);
  assert.deepEqual(ids(report.filterInventory(rows, filters({ stockOp: 'lt', stockValue: '3' }))), ['-2', '0', '2']);
  assert.deepEqual(ids(report.filterInventory(rows, filters({ stockOp: 'lte', stockValue: '3' }))), ['-2', '0', '2', '3']);
  assert.deepEqual(ids(report.filterInventory(rows, filters({ stockOp: 'between', stockValue: '۲', stockMax: '۵' }))), ['2', '3', '5']);
  assert.deepEqual(ids(report.filterInventory(rows, filters({ stockOp: 'gt', stockValue: '3' }))), ['5']);
  assert.deepEqual(ids(report.filterInventory(rows, filters({ stockOp: 'gte', stockValue: '3' }))), ['3', '5']);
  assert.equal(rows[0].stock, -2);
});
test('all selected filters combine, search includes the original name and code', () => {
  const rows = [product('match', { source_name: 'ORIGINAL X23', source_item_code: '00123', stock: 2, catalog_status: 'estimated', image_is_illustrative: true }),
    product('hidden', { is_active: false }), product('other-brand', { brand: 'Anker' }), product('other-category', { category: 'accessories' }), product('high-stock')];
  const f = filters({ search: ' ORIGINAL X٢٣ ', category: 'audio', brand: 'Oraimo', stockOp: 'lt', stockValue: '3', minPrice: '٥٥٠', maxPrice: '550', visibility: 'active', condition: 'brand_new', details: 'estimated', images: 'illustrative', priceStatus: 'set', costStatus: 'set' });
  assert.deepEqual(ids(report.filterInventory(rows, f)), ['match']);
  assert.deepEqual(ids(report.filterInventory(rows, filters({ search: '٠٠١٢٣' }))), ['hidden', 'high-stock', 'match', 'other-brand', 'other-category']);
});
test('data review includes unmarked details and absent images without inventing verification', () => {
  const rows = [product('verified'), product('unknown', { catalog_status: undefined, image_is_illustrative: undefined }), product('illustrative', { image_is_illustrative: true }), product('missing', { images: ['  '] })];
  assert.deepEqual(ids(report.filterInventory(rows, filters({ details: 'needs_review' }))), ['illustrative', 'missing', 'unknown']);
  assert.deepEqual(ids(report.filterInventory(rows, filters({ images: 'missing' }))), ['missing']);
  assert.deepEqual(ids(report.filterInventory(rows, filters({ images: 'unmarked' }))), ['unknown']);
  assert.equal(report.imageLabel(rows[1]), 'غير محددة');
});
test('invalid, empty and reversed numeric boundaries cannot silently export all stock', () => {
  for (const f of [filters({ stockOp: 'lt', stockValue: '' }), filters({ stockOp: 'eq', stockValue: '3.5' }), filters({ stockOp: 'between', stockValue: '9', stockMax: '2' }), filters({ minPrice: '900', maxPrice: '2' }), filters({ minPrice: 'abc' })]) {
    assert.ok(report.validateInventoryFilters(f).length);
    assert.deepEqual(report.filterInventory([base], f), []);
    assert.throws(() => exporter.createInventoryWorkbook([base], f, ['name'], 'test'));
  }
  assert.equal(report.parseReportNumber('٥٥٠٫٥٠'), 550.5);
});
test('valuation preserves negative stock separately and reports incomplete cost coverage', () => {
  const rows = [product('stock', { stock: 2, cost_price: 0.1, price: 0.3 }), product('negative', { stock: -4 }), product('zero', { stock: 0 }), product('missing-cost', { stock: 5, cost_price: 0, price: 10 }), product('missing-price', { stock: 1, cost_price: 2, price: 0 }), product('unknown-stock', { stock: undefined })];
  const s = report.inventorySummary(rows);
  assert.equal(s.count, 6); assert.equal(s.units, 8); assert.equal(s.recordedUnits, 4);
  assert.equal(s.zero, 1); assert.equal(s.negative, 1); assert.equal(s.unknownStock, 1);
  assert.equal(s.costCents, 220); assert.equal(s.sellingCents, 5060);
  assert.equal(s.unvaluedUnits, 5); assert.equal(s.unpricedUnits, 1);
  assert.deepEqual(report.filterInventory(rows, filters({ stockOp: 'eq', stockValue: '0' })).map(p => p.id), ['zero']);
});
test('workbook roundtrip keeps all matching rows, selected columns, SKUs and text cells', () => {
  const rows = Array.from({ length: 125 }, (_, i) => product(String(i), { name_ar: i ? `منتج ${i}` : '=1+1', stock: i ? 0 : -2 }));
  const workbook = exporter.createInventoryWorkbook(rows, filters(), ['sku', 'name', 'stock'], 'كشف الجرد', new Date('2026-10-16T12:00:00Z'));
  const bytes = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const restored = XLSX.read(bytes, { type: 'buffer' });
  const sheet = restored.Sheets['الأصناف'];
  const values = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  assert.equal(values.length, 126); assert.equal(values[0].length, 3);
  assert.equal(values[1][0], '001234'); assert.equal(values[1][1], '=1+1'); assert.equal(values[1][2], -2);
  assert.equal(sheet.B2.t, 's'); assert.equal(sheet.B2.f, undefined);
  assert.equal(sheet['!autofilter'].ref, 'A1:C126');
  assert.equal(restored.SheetNames[0], 'ملخص التقرير');
  assert.ok(XLSX.utils.sheet_to_json(restored.Sheets['ملخص التقرير'], { header: 1 }).some(r => r[0] === 'عدد الأصناف' && r[1] === 125));
});
test('CSV handles Arabic, multiline quotes and spreadsheet formula injection as text', () => {
  const csv = exporter.inventoryCsv([product('x', { name_ar: '  =HYPERLINK("bad")\nسماعة', stock: -2 })], ['name', 'stock']);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"\'  =HYPERLINK(""bad"")\nسماعة"'));
  assert.ok(csv.endsWith(',"-2"'));
  assert.throws(() => exporter.inventoryCsv([base], []));
});
test('sorting does not mutate source and category totals reconcile with the same selected rows', () => {
  const rows = [product('b', { stock: 9 }), product('a', { stock: 1, category: 'accessories' })];
  assert.deepEqual(report.filterInventory(rows, filters({ sort: 'stock_asc' })).map(p => p.id), ['a', 'b']);
  assert.deepEqual(rows.map(p => p.id), ['b', 'a']);
  const groups = report.inventoryCategorySummary(rows), summary = report.inventorySummary(rows);
  for (const key of ['count', 'units', 'costCents', 'sellingCents']) assert.equal(groups.reduce((n, g) => n + g[key], 0), summary[key]);
});
test('saved reports reject stale or malformed conditions and unknown columns', () => {
  const good = { id: 'saved', name: 'صفر', filters: filters({ stockOp: 'eq', stockValue: '0' }), columns: ['name', 'stock'] };
  assert.equal(report.isSavedInventoryReport(good), true);
  assert.equal(report.isSavedInventoryReport({ ...good, filters: { ...good.filters, stockOp: 'bogus' } }), false);
  assert.equal(report.isSavedInventoryReport({ ...good, columns: ['fake'] }), false);
  assert.equal(report.isSavedInventoryReport({ ...good, filters: null }), false);
  assert.equal(report.isSavedInventoryReport(null), false);
});

test('report readiness waits for the full catalog, independently of cart synchronization', async () => {
  const effects = [], states = [];
  let finishCatalog;
  const catalog = new Promise(resolve => { finishCatalog = resolve; });
  const react = { createContext: () => ({ Provider: () => null }), useEffect: fn => effects.push(fn), useRef: current => ({ current }),
    useState(initial) { const entry = { value: typeof initial === 'function' ? initial() : initial, writes: [] }; states.push(entry); return [entry.value, next => { entry.writes.push(next); entry.value = typeof next === 'function' ? next(entry.value) : next; }]; } };
  globalThis.window = { location: { pathname: '/admin', search: '' } };
  const storage = { readStorage: () => null, readStoredArray: () => [], readStoredSettings: () => ({}), writeStorage() {}, writeStoredJson: () => true, removeStorage() {} };
  const { StoreProvider } = compile('src/context/StoreContext.tsx', {
    '../services/offlineCatalog': {deviceIsOnline:()=>true,readOfflineCatalog:async()=>null,saveOfflineCatalog:async()=>false},
    './AuthContext': { useAuth: () => ({user:{id:'test-admin',role:'admin'},sessionReady:true,adminSections:['products','inventory']}) },
    react, '../data/seedProducts': { initialProducts: [] }, '../utils/browserStorage': storage,
    '../utils/whatsappService': { defaultSettings: {}, getWhatsAppLogs: () => [] },
    '../services/neonDb': { neonDb: { syncActiveCart: async () => {}, getAllProducts: () => catalog, getOrders: async () => [], getActiveCarts: async () => [], updateProduct: async () => true } },
  });
  const context = StoreProvider({ children: null }).props.value;
  assert.equal(context.isCatalogReadyForReports, false);
  const loading = states.find(s => s.value === true);
  effects.find(fn => String(fn).includes('syncActiveCart'))();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(loading.value, true);
  effects.find(fn => String(fn).includes('getAllProducts'))();
  assert.equal(loading.value, true);
  finishCatalog([base]);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(loading.value, false);
  assert.ok(states.some(s => s.writes.includes(true)));
  context.updateProduct('a', { stock: 7, images: [] });
  const edited = states.find(s => Array.isArray(s.value) && s.value[0]?.id === 'a').value[0];
  assert.equal(edited.recorded_stock, 7);
  assert.deepEqual(edited.recorded_images, []);
  delete globalThis.window;
});
