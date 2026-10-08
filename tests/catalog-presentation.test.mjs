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
const cache = new Map();
const noop = () => {};
let context;
const lang = { language: 'ar', isRTL: true, t: value => value, formatPrice: value => `${value} ج.م` };
function source(relative) {
  const filename = path.join(root, relative);
  if (cache.has(filename)) return cache.get(filename);
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename, compilerOptions: { target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }
  }).outputText;
  const localRequire = id => {
    if (id === 'lucide-react') return new Proxy({}, { get: () => props => React.createElement('svg', { className: props.className }) });
    if (id === 'canvas-confetti') return noop;
    if (id.endsWith('/context/StoreContext')) return { useStore: () => context };
    if (id.endsWith('/context/LanguageContext')) return { useLanguage: () => lang };
    if (id.endsWith('/utils/whatsappService')) return { generateWhatsAppWebLink: () => 'https://wa.me/201234567890' };
    if (!id.startsWith('.')) return require(id);
    const base = path.resolve(path.dirname(filename), id);
    const actual = ['.ts', '.tsx'].map(extension => base + extension).find(fs.existsSync);
    return source(path.relative(root, actual));
  };
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
  cache.set(filename, module.exports);
  return module.exports;
}

const presentation = source('src/utils/amazonEnricher.ts');
const { ProductCard } = source('src/components/ProductCard.tsx');
const { ProductDetails } = source('src/pages/ProductDetails.tsx');
const { QuickViewModal } = source('src/components/QuickViewModal.tsx');
const product = { id: 'p1', name_ar: 'سماعة مسجلة', name_en: 'Listed headphones', brand: 'Example',
  category: 'audio', condition: 'unknown', price: 0, stock: 0, in_stock: false, is_active: true,
  images: ['/product-placeholder.svg'], description_ar: 'وصف مسجل يحتاج مراجعة', description_en: 'Saved description',
  specs: { 'النوع': 'سماعة', __catalog_meta: 'private' }, warranty_months: 0, rating: 0, reviews_count: 0,
  catalog_status: 'estimated', image_is_illustrative: true,
  data_sources: [{ url: 'https://example.com/product', title: 'Manufacturer' }] };
function setContext(overrides = {}) {
  context = { products: [product], selectedProductId: product.id, quickViewProduct: product,
    settings: { store_whatsapp: '201234567890' }, addToCart: noop, navigate: noop,
    isInWishlist: () => false, toggleWishlist: noop, setQuickViewProduct: noop, ...overrides };
}

test('presentation uses saved descriptions and does not fabricate specifications or social proof', () => {
  const result = presentation.enrichProductData(product, [product]);
  assert.equal(result.detailed_title_ar, product.name_ar);
  assert.equal(result.asin, '');
  assert.equal(result.bought_past_month, 0);
  assert.deepEqual(result.customer_reviews, []);
  assert.deepEqual(result.feature_banners, []);
  assert.deepEqual(result.about_item, [product.description_ar]);
  assert.deepEqual(result.quick_specs, { 'النوع': 'سماعة' });
  assert.doesNotMatch(JSON.stringify(result), /Bluetooth|ENC|Qi|40 ساعة|متجر.*الرسمي/);
});

test('purchase requires active product, a positive recorded price, available stock and availability', () => {
  const available = { ...product, price: 500, stock: 4, in_stock: true };
  assert.equal(presentation.canPurchaseProduct(available), true);
  for (const changes of [{ price: 0 }, { stock: 0 }, { is_active: false }, { in_stock: false }]) {
    assert.equal(presentation.canPurchaseProduct({ ...available, ...changes }), false);
  }
  assert.equal(presentation.priceLabel(product, 'ar', lang.formatPrice), 'اسأل عن السعر');
});

test('comparison excludes hidden entries and bundles require explicit saved suggestions', () => {
  const available = { ...product, id: 'p2', price: 500, stock: 2, in_stock: true };
  const hidden = { ...available, id: 'hidden', is_active: false };
  const normal = presentation.enrichProductData(product, [product, available, hidden]);
  assert.deepEqual(normal.bundle_accessories, []);
  assert.deepEqual(normal.comparison_items.map(item => item.id), ['p2']);
  const suggested = presentation.enrichProductData({ ...product, frequently_bought_together: ['p2', 'hidden'] }, [available, hidden]);
  assert.deepEqual(suggested.bundle_accessories.map(item => item.id), ['p2']);
});

test('card and quick view label estimated content, ask price and disable unavailable purchases', () => {
  setContext();
  for (const element of [React.createElement(ProductCard, { product }), React.createElement(QuickViewModal)]) {
    const html = renderToString(element);
    assert.match(html, /صورة توضيحية ومواصفات تقديرية/);
    assert.match(html, /اسأل عن السعر/);
    assert.match(html, /disabled=""/);
    assert.doesNotMatch(html, /ضمان 0|0 ج\.م|\(0 reviews\)/);
  }
});

test('unknown direct product URL renders a not-found result rather than another product', () => {
  setContext({ selectedProductId: 'does-not-exist', products: [{ ...product, id: 'prod-joyroom-jr-t03s-plus' }] });
  const html = renderToString(React.createElement(ProductDetails));
  assert.match(html, /هذا المنتج غير موجود/);
  assert.doesNotMatch(html, /سماعة مسجلة/);
});

test('full details expose sources and uncertainty, hide reserved metadata and zero-review stars', () => {
  setContext();
  const html = renderToString(React.createElement(ProductDetails));
  assert.match(html, /صورة توضيحية ومواصفات تقديرية/);
  assert.match(html, /https:\/\/example.com\/product/);
  assert.match(html, /لا توجد مراجعات مسجلة/);
  assert.match(html, /اسأل المحل عن الضمان/);
  assert.doesNotMatch(html, /__catalog_meta|40 ساعة|Qi اللاسلكي|أصلي معتمد 100%|توصيل سريع مجاني/);
  assert.doesNotMatch(html, /0 ج\.م/);
});
