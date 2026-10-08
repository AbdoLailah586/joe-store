import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToString } from 'react-dom/server';

const require = createRequire(import.meta.url);
const project = path.resolve(import.meta.dirname, '..');
const loaded = new Map();
const database = { neonDb: new Proxy({}, { get: () => async () => [] }) };
const seedProduct = {
  id: 'test-product', name_ar: 'سماعة', name_en: 'Headphones', brand: 'Example',
  category: 'audio', condition: 'brand_new', price: 500, stock: 4, in_stock: true,
  images: ['https://example.com/product.jpg'], description_ar: '', description_en: '',
  specs: {}, warranty_months: 6, rating: 5, reviews_count: 0
};

// Execute the real TypeScript providers with React server rendering. Stub only
// external database requests and the large inventory; browser persistence is real.
function loadSource(relative) {
  const filename = path.join(project, relative);
  if (loaded.has(filename)) return loaded.get(filename);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }
  }).outputText;
  const module = { exports: {} };
  loaded.set(filename, module.exports);
  const sourceRequire = id => {
    if (id.endsWith('/services/neonDb')) return database;
    if (id.endsWith('/data/seedProducts')) return { initialProducts: [seedProduct] };
    if (!id.startsWith('.')) return require(id);
    const base = path.resolve(path.dirname(filename), id);
    const resolved = ['.ts', '.tsx'].map(extension => base + extension).find(fs.existsSync);
    return loadSource(path.relative(project, resolved));
  };
  new Function('require', 'module', 'exports', code)(sourceRequire, module, module.exports);
  loaded.set(filename, module.exports);
  return module.exports;
}

const storage = loadSource('src/utils/browserStorage.ts');
const store = loadSource('src/context/StoreContext.tsx');
const auth = loadSource('src/context/AuthContext.tsx');
const language = loadSource('src/context/LanguageContext.tsx');
const whatsapp = loadSource('src/utils/whatsappService.ts');

function memoryStorage(values = {}, full = false) {
  const data = new Map(Object.entries(values));
  return {
    data,
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => {
      if (full) throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
      data.set(key, String(value));
    },
    removeItem: key => data.delete(key)
  };
}

function withStorage(fakeStorage, run) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: fakeStorage });
  try { return run(); } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
}

function renderProviders() {
  let value;
  const ReadContext = () => {
    value = { store: store.useStore(), auth: auth.useAuth(), language: language.useLanguage() };
    return React.createElement('span', null, String(value.store.cartCount));
  };
  const html = renderToString(React.createElement(language.LanguageProvider, null,
    React.createElement(auth.AuthProvider, null,
      React.createElement(store.StoreProvider, null, React.createElement(ReadContext)))));
  return { html, ...value };
}

test('quota failures never throw and do not erase existing browser data', () => {
  const fake = memoryStorage({ joe_store_cart: '["preserved"]' }, true);
  withStorage(fake, () => {
    assert.throws(() => fake.setItem('joe_session_id', 'new'), { name: 'QuotaExceededError' });
    assert.equal(storage.writeStorage('joe_session_id', 'new'), false);
    assert.equal(storage.writeStoredJson('joe_store_cart', []), false);
    assert.equal(storage.readStorage('joe_store_cart'), '["preserved"]');
    assert.equal(fake.data.size, 1);
  });
});

test('blocked storage property, reads, writes and removal are optional', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true,
    get() { throw new DOMException('Access denied', 'SecurityError'); } });
  try {
    assert.equal(storage.readStorage('cart'), null);
    assert.equal(storage.writeStorage('cart', '[]'), false);
    assert.equal(storage.removeStorage('user'), false);
    assert.doesNotThrow(renderProviders);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});

test('real providers render with a full storage quota and no cached session', () => {
  withStorage(memoryStorage({}, true), () => {
    const result = renderProviders();
    assert.equal(result.html, '<span>0</span>');
    assert.match(result.store.sessionId, /^sess_/);
    assert.equal(result.store.products.length, 1);
  });
});

test('corrupt JSON and wrong cart, wishlist, user and settings shapes cannot crash startup', () => {
  withStorage(memoryStorage({
    joe_store_cart: '{}', joe_store_wishlist: 'null', joe_store_orders: '{broken',
    joe_store_user: '{"name":null,"addresses":{}}',
    joe_store_settings: '{"store_phone":42,"tiktok_url":{},"hero_slides":[null]}'
  }), () => {
    const result = renderProviders();
    assert.equal(result.html, '<span>0</span>');
    assert.deepEqual(result.store.cart, []);
    assert.deepEqual(result.store.wishlist, []);
    assert.deepEqual(result.store.orders, []);
    assert.equal(result.auth.user, null);
    assert.equal(typeof result.store.settings.store_phone, 'string');
    assert.equal(result.store.settings.hero_slides.length, 3);
  });
});

test('a damaged entry does not discard valid cart items, account or store settings', () => {
  const user = { id: 'user-1', name: 'Customer', email: 'customer@example.com', phone: '01234567890',
    role: 'customer', provider: 'email', addresses: [], created_at: '2026-10-09' };
  withStorage(memoryStorage({
    joe_store_cart: JSON.stringify([{ product: seedProduct, quantity: 2 }, null, { quantity: 1 }]),
    joe_store_wishlist: '["test-product",null,42]', joe_store_user: JSON.stringify(user),
    joe_store_settings: '{"store_phone":"01234567890","theme_mode":"light","store_name_ar":null}'
  }), () => {
    const result = renderProviders();
    assert.equal(result.store.cartCount, 2);
    assert.equal(result.store.cartSubtotal, 1000);
    assert.deepEqual(result.store.wishlist, ['test-product']);
    assert.deepEqual(result.auth.user, user);
    assert.equal(result.store.settings.store_phone, '01234567890');
    assert.equal(result.store.settings.theme_mode, 'light');
  });
});

test('catalog startup frees only a verified duplicate seed and keeps administrator edits', () => {
  const duplicate = memoryStorage({ joe_store_products: JSON.stringify([seedProduct]), untouched: 'keep' });
  withStorage(duplicate, () => {
    renderProviders();
    assert.equal(duplicate.getItem('joe_store_products'), null);
    assert.equal(duplicate.getItem('untouched'), 'keep');
  });
  const edited = { ...seedProduct, price: 700 };
  const changed = memoryStorage({ joe_store_products: JSON.stringify([edited]), untouched: 'keep' });
  withStorage(changed, () => {
    assert.equal(renderProviders().store.products[0].price, 700);
    assert.deepEqual(JSON.parse(changed.getItem('joe_store_products')), [edited]);
  });
});

test('fresh startup does not write a full inventory cache', () => {
  const fake = memoryStorage();
  withStorage(fake, () => {
    renderProviders();
    assert.equal(fake.getItem('joe_store_products'), null);
    assert.match(fake.getItem('joe_session_id'), /^sess_/);
  });
});

test('malformed notification logs recover without losing valid notifications', () => {
  const log = { id: 'n1', order_id: 'o1', phone: '01234567890', type: 'order_confirmed',
    text: 'hello', sent_at: '2026-10-09', status: 'sent' };
  withStorage(memoryStorage({ joe_whatsapp_logs: JSON.stringify([null, log]) }, true), () => {
    assert.deepEqual(whatsapp.getWhatsAppLogs(), [log]);
    assert.doesNotThrow(() => whatsapp.recordWhatsAppNotification({ ...log, id: 'n2' }));
    assert.deepEqual(whatsapp.getWhatsAppLogs(), [log]);
  });
});
