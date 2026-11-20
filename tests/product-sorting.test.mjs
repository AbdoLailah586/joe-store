import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
function loadModule(relative) {
  const filename = path.join(root, relative);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS }
  }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', code)(() => ({}), mod, mod.exports);
  return mod.exports;
}

const { isProductInStock, sortProductsByStockAndNewest, sortCatalogProducts } = loadModule('src/utils/productSorting.ts');

test('isProductInStock correctly identifies available vs out of stock items', () => {
  assert.equal(isProductInStock({ in_stock: true, stock: 5 }), true);
  assert.equal(isProductInStock({ in_stock: true, stock: 1 }), true);
  assert.equal(isProductInStock({ in_stock: true, stock: 0 }), false);
  assert.equal(isProductInStock({ in_stock: false, stock: 10 }), false);
  assert.equal(isProductInStock({ in_stock: true, stock: -1 }), false);
  assert.equal(isProductInStock({ in_stock: undefined, stock: 4 }), true);
  assert.equal(isProductInStock({ in_stock: undefined, stock: 0 }), false);
});

test('out-of-stock items (stock 0 or in_stock false) are always placed at the end', () => {
  const p1 = { id: 'p1', name_ar: 'منتج قديم متوفر', stock: 5, in_stock: true, created_at: '2026-01-01', price: 100 };
  const p2 = { id: 'p2', name_ar: 'منتج جديد خلصان', stock: 0, in_stock: false, created_at: '2026-11-20', price: 50 };
  const p3 = { id: 'p3', name_ar: 'منتج أحدث متوفر', stock: 2, in_stock: true, created_at: '2026-11-19', price: 200 };
  const p4 = { id: 'p4', name_ar: 'منتج قديم خلصان', stock: 0, in_stock: true, created_at: '2026-02-01', price: 150 };

  const sorted = sortCatalogProducts([p1, p2, p3, p4], 'newest');

  // p3 (newest in-stock) -> p1 (older in-stock) -> p2 (newest out-of-stock) -> p4 (older out-of-stock)
  assert.equal(sorted[0].id, 'p3');
  assert.equal(sorted[1].id, 'p1');
  assert.equal(sorted[2].id, 'p2');
  assert.equal(sorted[3].id, 'p4');
});

test('newest additions take priority in default display order for in-stock products', () => {
  const march = { id: 'p-march', stock: 10, in_stock: true, created_at: '2026-03-01' };
  const october = { id: 'p-october', stock: 10, in_stock: true, created_at: '2026-10-15' };
  const today = { id: 'p-today', stock: 10, in_stock: true, created_at: '2026-11-20' };

  const sorted = sortCatalogProducts([march, today, october], 'newest');

  assert.deepEqual(sorted.map(p => p.id), ['p-today', 'p-october', 'p-march']);
});

test('custom sort options (price_asc, price_desc, rating) still push out-of-stock items to the bottom', () => {
  const cheapOutOfStock = { id: 'cheap-oos', price: 10, stock: 0, in_stock: false };
  const expensiveInStock = { id: 'exp-in', price: 500, stock: 3, in_stock: true };
  const cheapInStock = { id: 'cheap-in', price: 50, stock: 2, in_stock: true };

  // Ascending price sort
  const priceSorted = sortCatalogProducts([cheapOutOfStock, expensiveInStock, cheapInStock], 'price_asc');

  // Even though cheapOutOfStock is the cheapest (10), it MUST be at the bottom because it is out of stock!
  assert.equal(priceSorted[0].id, 'cheap-in');
  assert.equal(priceSorted[1].id, 'exp-in');
  assert.equal(priceSorted[2].id, 'cheap-oos');
});

test('timestamp extracted from id breaks tie when created_at is identical', () => {
  const item1 = { id: 'prod-1795115000000', stock: 5, in_stock: true, created_at: '2026-11-20' };
  const item2 = { id: 'prod-1795116000000', stock: 5, in_stock: true, created_at: '2026-11-20' };

  const sorted = sortCatalogProducts([item1, item2], 'newest');

  assert.equal(sorted[0].id, 'prod-1795116000000');
  assert.equal(sorted[1].id, 'prod-1795115000000');
});
