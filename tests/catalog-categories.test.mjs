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

test('AC batch cases have verified images, specs, and working device brand & model filters', () => {
  const acCases = seedProducts.filter(p => p.id.startsWith('prod-case-ac-'));
  assert.equal(acCases.length, 202, 'All 202 unique AC cases should be present in seedProducts');

  const seenImages = new Set();
  for (const c of acCases) {
    assert.equal(c.category, 'cases_protection');
    assert.ok(c.price > 0, `AC case ${c.id} must have a positive price`);
    assert.ok(Array.isArray(c.images) && c.images.length === 1, `AC case ${c.id} must have 1 primary image`);
    const imgPath = c.images[0];
    assert.ok(!seenImages.has(imgPath), `Duplicate image path found: ${imgPath}`);
    seenImages.add(imgPath);
    assert.ok(fs.existsSync(path.join(root, 'public', imgPath.slice(1))), `Missing compressed AC image on disk: ${imgPath}`);
    assert.ok(c.specs?.['الموديل المتوافق'], `Missing compatible phone model on ${c.id}`);
    assert.ok(c.specs?.['ماركة الهاتف'], `Missing phone brand on ${c.id}`);
    assert.notEqual(cats.getCaseDeviceBrand(c), 'other', `Unrecognized phone brand on ${c.id}`);
  }

  // Filter coverage across all mobile brands
  const allCases = seedProducts.filter(p => p.category === 'cases_protection');
  for (const brandKey of ['iphone', 'samsung', 'oppo', 'xiaomi', 'realme', 'honor', 'vivo', 'infinix']) {
    const matched = allCases.filter(c => cats.productMatchesCaseFilter(c, brandKey, 'all'));
    assert.ok(matched.length >= 2, `Expected multiple cases for device brand ${brandKey}, got ${matched.length}`);
  }

  // Exact model normalization + filtering check
  assert.equal(cats.normalizeCaseModelName('Apple iPhone 17 Pro Max (Camera Plateau Edition)'), 'iPhone 17 Pro Max');
  const a57 = acCases.filter(c => cats.productMatchesCaseFilter(c, 'samsung', 'Samsung Galaxy A57'));
  assert.equal(a57.length, 3, 'Samsung Galaxy A57 should match Pitaka Brown + Fashion Navy + Pitaka Khaki AC cases');
});
