import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToString } from 'react-dom/server';

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
let queryHandler;
const sql = Object.assign(async () => [], { query: async (...args) => queryHandler(...args) });
function compile(relative, mocks, transform = value => value) {
  const filename = path.join(root, relative);
  const input = transform(fs.readFileSync(filename, 'utf8'));
  const code = ts.transpileModule(input, { fileName: filename, compilerOptions: {
    target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true
  } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => mocks[id] || require(id), module, module.exports);
  return module.exports;
}
const { neonDb } = compile('src/services/neonDb.ts', { '@neondatabase/serverless': { neon: () => sql } },
  source => source.replace(/const DB_URL\s*=[\s\S]*?const sql = neon\(DB_URL\);/, 'const sql = neon("mock://catalog");'));
const row = (id = 'prod-pos-0', details = {}) => ({ id, name_ar: 'صنف', name_en: 'Item', category: 'audio',
  brand: 'Brand', price: '0', cost_price: '0', stock_quantity: 0, old_price: null,
  is_active: true, is_featured: false, warranty: '6 شهور', is_preowned: false,
  colors: [{ name_ar: 'قديم', name_en: 'Old', hex: '#000000' }], storage_options: ['64GB'],
  images: ['/product-images/photo.webp'], created_at: '2026-10-09T00:00:00Z',
  specs: { 'مواصفة': 'قيمة', __catalog_import: '{}', __product_data: {
    sku: '0', source_row: 4, source_item_code: '0', source_name: 'raw name', raw_source_stock: 0,
    condition: 'unknown', catalog_status: 'verified', image_is_illustrative: false,
    warranty_months: 0, rating: 0, reviews_count: 0,
    data_sources: [{ url: 'https://example.com/model', title: 'Official product' }],
    description_ar: 'وصف محفوظ', description_en: 'Saved description', about_item: ['Saved feature'],
    feature_banners: [{ title: 'Saved title', description: 'Saved detail', image_url: '/product-images/feature.webp' }],
    ...details
  } } });

test('database reload retains verified metadata, gallery, provenance and original zero values', async () => {
  queryHandler = async query => query.includes('COUNT(*)') ? [{ total: 1 }] : [row()];
  const { products } = await neonDb.getProducts();
  const product = products[0];
  assert.equal(product.price, 0);
  assert.equal(product.cost_price, 0);
  assert.equal(product.stock, 0);
  assert.equal(product.raw_source_stock, 0);
  assert.equal(product.warranty_months, 0);
  assert.equal(product.rating, 0);
  assert.equal(product.reviews_count, 0);
  assert.equal(product.sku, '0');
  assert.equal(product.source_item_code, '0');
  assert.equal(product.catalog_status, 'verified');
  assert.equal(product.image_is_illustrative, false);
  assert.deepEqual(product.images, ['/product-images/photo.webp']);
  assert.equal(product.feature_banners[0].image_url, '/product-images/feature.webp');
  assert.equal(product.data_sources[0].url, 'https://example.com/model');
  assert.deepEqual(product.specs, { 'مواصفة': 'قيمة' });
});

test('saved color and storage edits override legacy columns on reload', async () => {
  queryHandler = async query => query.includes('COUNT(*)') ? [{ total: 1 }]
    : [row(undefined, { storage: '256GB', available_storages: ['256GB'], color_ar: 'أزرق',
      color_en: 'Blue', color_hex: '#00f', available_colors: [{ name_ar: 'أزرق', name_en: 'Blue', hex: '#00f' }] })];
  const { products } = await neonDb.getProducts();
  assert.equal(products[0].storage, '256GB');
  assert.equal(products[0].color_ar, 'أزرق');
  assert.deepEqual(products[0].available_storages, ['256GB']);
  assert.equal(products[0].available_colors[0].name_en, 'Blue');
});

test('all-product loading fetches every page with deterministic ordering and visibility policy', async () => {
  const rows = Array.from({ length: 601 }, (_, index) => row(`prod-${index}`));
  const offsets = [];
  queryHandler = async (query, params) => {
    assert.match(query, /is_active = true/);
    if (query.includes('COUNT(*)')) return [{ total: rows.length }];
    assert.match(query, /created_at DESC, id ASC/);
    const [limit, offset] = params.slice(-2);
    offsets.push(offset);
    return rows.slice(offset, offset + limit);
  };
  const products = await neonDb.getAllProducts({ includeHidden: false });
  assert.equal(products.length, 601);
  assert.equal(new Set(products.map(product => product.id)).size, 601);
  assert.deepEqual(offsets.sort((a, b) => a - b), [0, 300, 600]);
});

test('incomplete database page cannot silently replace the complete catalog', async () => {
  queryHandler = async (query, params) => query.includes('COUNT(*)') ? [{ total: 601 }]
    : params.at(-1) === 0 ? Array.from({ length: 300 }, (_, index) => row(`prod-${index}`)) : [];
  await assert.rejects(neonDb.getAllProducts(), /could not be loaded completely/);
});

test('full updates retain zero columns and JSONB metadata while replacing public specifications', async () => {
  let captured;
  queryHandler = async (query, params) => { captured = { query, params }; return []; };
  const result = await neonDb.updateProduct('prod-pos-0', { price: 0, stock_quantity: 0, is_active: false,
    product: { cost_price: 0, warranty_months: 0, rating: 0, reviews_count: 0,
      catalog_status: 'verified', image_is_illustrative: false, images: ['/product-images/new.webp'],
      specs: { 'مواصفة جديدة': 'قيمة جديدة' }, description_ar: 'Edited description' } });
  assert.equal(result, true);
  assert.match(captured.query, /jsonb_object_agg\(key,value\)/);
  assert.match(captured.query, /left\(key,2\) = '__'/);
  assert.match(captured.query, /jsonb_set/);
  assert.equal(captured.params.filter(value => value === 0).length, 3);
  assert.ok(captured.params.includes(false));
  const details = captured.params.map(value => { try { return JSON.parse(value); } catch { return null; } })
    .find(value => value?.description_ar === 'Edited description');
  assert.equal(details.catalog_status, 'verified');
  assert.equal(details.image_is_illustrative, false);
  assert.equal(details.warranty_months, 0);
  assert.equal(details.rating, 0);
  assert.equal(details.reviews_count, 0);
  assert.ok(captured.params.includes(JSON.stringify({ 'مواصفة جديدة': 'قيمة جديدة' })));
});

const icons = new Proxy({}, { get: () => props => React.createElement('svg', { className: props.className }) });
const noop = () => {};
const placeholderModules = Object.fromEntries([
  '../../components/ExcelImportModal', '../../utils/excelParser', '../../utils/whatsappService',
  './InventoryTab', './CustomerCrmTab', './EmailTemplatesTab', './UsersTab'
].map(id => [id, new Proxy({}, { get: () => noop })]));
const { AdminDashboard } = compile('src/pages/admin/AdminDashboard.tsx', {
  ...placeholderModules, 'lucide-react': icons,
  '../../context/AuthContext': { useAuth: () => ({ user: null, isAdmin: false, openAuthModal: noop }) },
  '../../context/LanguageContext': { useLanguage: () => ({ language: 'ar', t: value => value, formatPrice: value => String(value) }) },
  '../../context/StoreContext': { useStore: () => ({ products: [], orders: [], activeCarts: [], whatsappLogs: [], settings: {}, navigate: noop }) }
});

test('guest admin rendering exposes only the access guard, not editor or management UI', () => {
  const html = renderToString(React.createElement(AdminDashboard));
  assert.match(html, /لوحة تحكم الإدارة للإداريين فقط/);
  assert.match(html, /تسجيل الدخول بحساب الإدارة/);
  assert.doesNotMatch(html, /Enterprise Admin Hub|inventoryTab|exportProducts|المواصفات بصيغة JSON|تصدير التقرير/);
});

test('admin authorization guard is a top-level return after every React hook', () => {
  const filename = path.join(root, 'src/pages/admin/AdminDashboard.tsx');
  const ast = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let component;
  function find(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'AdminDashboard') component = node.initializer;
    ts.forEachChild(node, find);
  }
  find(ast);
  const guard = component.body.statements.find(statement => ts.isIfStatement(statement)
    && statement.expression.getText(ast) === '!isAdmin');
  assert.ok(guard, 'Admin guard must be directly in the component body, not in a filter callback.');
  function checkHooks(node) {
    if (ts.isCallExpression(node) && /^use(?:State|Effect|Memo|Ref|Store|Auth|Language)$/.test(node.expression.getText(ast))) {
      assert.ok(node.pos < guard.pos, `${node.expression.getText(ast)} must run before the authorization return.`);
    }
    ts.forEachChild(node, checkHooks);
  }
  checkHooks(component.body);
});
