import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');

function compile(relative) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true }
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => require(id), module, module.exports);
  return module.exports;
}

const cats = compile('src/utils/categories.ts');
const seedSrc = fs.readFileSync(path.join(root, 'src/data/seedProducts.ts'), 'utf8');
const seedProducts = JSON.parse(seedSrc.match(/=\s*(\[[\s\S]*\]);?/)[1]);

test('categories taxonomy splits phones, audio, chargers/cables and uses real local imagery', () => {
  const keys = cats.STORE_CATEGORIES.map(c => c.key);
  for (const required of ['iphones', 'feature_phones', 'chargers', 'cables', 'car_chargers', 'wireless_chargers', 'headsets', 'headphones', 'smartwatches', 'powerbanks', 'cases_protection', 'smart_rings']) {
    assert.ok(keys.includes(required), `Missing category key: ${required}`);
  }
  assert.ok(!keys.includes('smartphones'), 'Generic smartphones should be split into iphones and feature_phones');
  for (const c of cats.STORE_CATEGORIES) {
    assert.ok(c.image.startsWith('/product-images/'), `Category ${c.key} image must be local verified asset`);
    assert.ok(fs.existsSync(path.join(root, 'public', c.image.slice(1))), `Missing category image file: ${c.image}`);
  }
});

test('group matching and charging subsection filtering work consistently', () => {
  const charger45 = { id: '1', category: 'chargers', name_ar: 'شاحن هنتر 45 واط', name_en: 'Hunter 45W GaN Charger', brand: 'Hunter', is_active: true };
  const iphone = { id: '2', category: 'iphones', name_ar: 'آيفون', name_en: 'iPhone', brand: 'Apple', is_active: true };
  assert.equal(cats.productMatchesCategory(charger45, 'chargers_cables'), true);
  assert.equal(cats.productMatchesCategory(charger45, 'cables'), false);
  assert.equal(cats.productMatchesCategory(iphone, 'smartphones'), true);
  assert.equal(cats.productMatchesSubsection(charger45, 'wall_gan_fast'), true);
  assert.equal(cats.productMatchesSubsection(charger45, 'mini_20w_30w'), false);
  assert.equal(cats.countProductsInCategory([charger45, iphone], 'smartphones'), 1);
});

test('seed catalog keeps separated Tasbih products, fixed case counts, and clean image URLs', () => {
  const beiqi = seedProducts.find(p => p.id === 'prod-tasbih-beiqi-s7pro-smartring');
  const iqibla = seedProducts.find(p => p.id === 'prod-tasbih-iqibla-zikr-case');
  assert.ok(beiqi, 'Bei Qi S7 Pro must exist');
  assert.ok(iqibla, 'iQIBLA Zikr with case must exist as separate product');
  assert.equal(beiqi.category, 'smart_rings');
  assert.equal(iqibla.category, 'smart_rings');
  assert.deepEqual(beiqi.images, ['/product-images/tasbih-beiqi-s7pro-smartring.jpg']);
  assert.ok(!iqibla.images.includes('/product-images/tasbih-beiqi-s7pro-smartring.jpg'));

  const sq17 = seedProducts.find(p => p.id === 'prod-haino-teko-sq17-mini');
  assert.ok(!sq17.images.some(u => u.includes('sq17-studio')), 'SQ17 must not contain mislabeled laptop studio photo');

  const hunter90 = seedProducts.find(p => p.id === 'prod-hunter-desktop-gan-90w');
  assert.equal(hunter90, undefined, 'Duplicate 20W image 90W entry must be removed');
});
