#!/usr/bin/env node
'use strict';

// Source reconciliation and publication-boundary checks; no source/DB writes.
const assert = require('node:assert/strict');
const { prepareCatalog, conservativeCategory, itemKind, explicitBrand, parseArgs } = require('./prepare_excel_catalog.cjs');

const imagePools = { pools: [{ kind: 'accessory', brand: 'Test fixture', image_url: 'https://manufacturer.example/accessory.jpg', source_url: 'https://manufacturer.example/accessory', illustrative: true }] };
const { products, report } = prepareCatalog({ imagePools });
assert.equal(products.length, 2233);
assert.equal(new Set(products.map(product => product.id)).size, 2233);
assert.equal(report.source_stock_sum, 5159);
assert.equal(report.sellable_stock_sum, 5161);
assert.equal(report.source_positive_stock_rows, 557);
assert.equal(report.source_zero_stock_rows, 1674);
assert.equal(report.source_negative_stock_rows, 2);
assert.equal(report.missing_sale_price_rows, 308);
assert.equal(report.public_rows, 2233);
assert.equal(report.verified_rows, 0);
assert.equal(report.estimated_rows, 2233);
assert.equal(report.needs_price_rows, 308);
assert.equal(report.missing_image_rows, 0);
assert.equal(report.duplicate_names.length, 5);
for (const product of products) {
  const source = product.import_metadata;
  assert.equal(product.price, source.source_sale_price);
  assert.equal(product.cost_price, source.source_average_cost);
  assert.equal(product.stock, Math.max(0, source.source_stock));
  assert.equal(product.is_active, true);
  assert.equal(product.catalog_status, 'estimated');
  assert.equal(product.image_is_illustrative, true);
  assert.ok(product.images.length);
  assert.ok(product.description_ar.includes('تقديرية'));
  assert.ok(product.description_en.includes('estimates'));
  assert.ok(product.about_item.length >= 4);
  assert.ok(product.data_sources[0].url.startsWith('https:'));
  assert.equal(product.condition, 'unknown');
  assert.equal(product.rating, 0);
  assert.equal(product.reviews_count, 0);
  assert.equal(product.warranty_months, 0);
  assert.equal(product.asin, undefined);
  assert.equal(product.original_price, undefined);
  assert.equal(product.discount_percentage, undefined);
  assert.deepEqual(JSON.parse(product.specs.__catalog_import), source);
}
assert.deepEqual(prepareCatalog({ imagePools }).products, products, 'Repeated preparations must be byte-stable apart from output formatting.');

const exactOverlay = {
  item_number: '1635', raw_name: 'ORAIMO SPACE BUDS LITE', verified: true,
  verified_at: '2026-10-09', source_urls: ['https://manufacturer.example/products/spacebuds-lite'],
  identity_verified: true, image_match_verified: true, model_name: 'SpaceBuds Lite',
  name_ar: 'سماعة أورايمو SpaceBuds Lite', name_en: 'oraimo SpaceBuds Lite',
  brand: 'Oraimo', category: 'audio', condition: 'brand_new',
  images: ['https://manufacturer.example/images/spacebuds-lite.jpg'],
  description_ar: 'وصف موثق للطراز في اختبار حدود الاستيراد.',
  description_en: 'Verified test fixture for the import publication boundary.',
  specs: { Model: 'SpaceBuds Lite' }, about_item: ['Verified model fixture.'],
};
const verified = prepareCatalog({ research: { products: [exactOverlay] }, imagePools });
const published = verified.products.find(product => product.id === 'prod-pos-1635');
assert.equal(verified.report.verified_rows, 1);
assert.equal(verified.report.estimated_rows, 2232);
assert.equal(published.is_active, true);
assert.equal(published.catalog_status, 'verified');
assert.equal(published.image_is_illustrative, false);
assert.equal(published.price, 800);
assert.equal(published.stock, 10);
assert.equal(published.condition, 'unknown', 'Model research cannot establish actual inventory condition.');
assert.equal(published.quick_specs['الطراز'], 'SpaceBuds Lite');
assert.equal(published.quick_specs.Model, 'SpaceBuds Lite');
assert.equal(published.quick_specs['حالة البيانات'], undefined, 'Verified summaries cannot retain estimated quick-spec placeholders.');
assert.equal(published.asin, undefined);
assert.throws(() => prepareCatalog({ research: { products: [{ ...exactOverlay, raw_name: 'Wrong model' }] } }), /raw_name does not match/);
assert.throws(() => prepareCatalog({ research: { products: [{ ...exactOverlay, price: 999 }] } }), /unsupported field price/);
assert.throws(() => prepareCatalog({ research: { products: [exactOverlay, exactOverlay] } }), /Duplicate research/);
assert.throws(() => prepareCatalog({ research: { products: [{ ...exactOverlay, item_number: '999999' }] } }), /absent source item/);
const noImages = prepareCatalog({ research: { products: [{ ...exactOverlay, images: [] }] }, imagePools });
assert.equal(noImages.report.verified_rows, 0);
assert.equal(noImages.products.find(product => product.id === 'prod-pos-1635').catalog_status, 'estimated');
assert.equal(noImages.products.find(product => product.id === 'prod-pos-1635').image_is_illustrative, true);
const loadingOnly = prepareCatalog({ research: { products: [{ ...exactOverlay, images: ['https://manufacturer.example/loading.svg'] }] }, imagePools });
assert.equal(loadingOnly.report.verified_rows, 0, 'A lazy-loading spinner is not a verified product photo.');
const noPrice = prepareCatalog({ research: { products: [{ ...exactOverlay, item_number: '1677', raw_name: 'MINI PRINTER' }] }, imagePools });
assert.equal(noPrice.products.find(product => product.id === 'prod-pos-1677').is_active, true);
assert.equal(noPrice.products.find(product => product.id === 'prod-pos-1677').listing_status, 'needs_price');
assert.equal(noPrice.products.find(product => product.id === 'prod-pos-1677').price, 0);
assert.equal(noPrice.products.find(product => product.id === 'prod-pos-1677').import_metadata.research.verified, true);
const copySource = products.find(product => product.import_metadata.raw_name === 'ANKER R50I COPY');
const copy = prepareCatalog({ research: { products: [{ ...exactOverlay, item_number: copySource.import_metadata.item_number, raw_name: 'ANKER R50I COPY' }] }, imagePools });
assert.equal(copy.report.verified_rows, 0);
assert.equal(copy.products.find(product => product.id === copySource.id).catalog_status, 'estimated');
assert.equal(copy.products.find(product => product.id === copySource.id).is_active, true);
assert.equal(conservativeCategory('cover iphone 15 pro max'), 'cases_protection');
assert.equal(conservativeCategory('screen joyroom 14promax'), 'cases_protection');
assert.equal(conservativeCategory('بطاريه ip7'), 'accessories');
assert.equal(conservativeCategory('شاشه iphone 13'), 'accessories');
assert.equal(conservativeCategory('POWER 10000 JOYROOM'), 'powerbanks');
assert.equal(conservativeCategory('CABLE ORAIMO TC -TC'), 'chargers_cables');
assert.equal(itemKind('MIK BOYA MM1'), 'microphone');
assert.equal(itemKind('ORAIMO NECKLACE LITE'), 'neckband_earphones');
assert.equal(itemKind('شاشه iphone 13'), 'replacement_screen');
assert.equal(explicitBrand('cover iphone 15 pro max', 'phone_case'), 'غير محدد');
assert.equal(explicitBrand('screen samsung galaxy', 'screen_protector'), 'غير محدد');
assert.equal(explicitBrand('CABLE ORAIMO TC -TC', 'usb_cable'), 'Oraimo');
const brandProfiles = { verified_at: '2026-10-09', brands: [{
  brand: 'Anker', description_ar: 'نبذة علامة موثقة لا تحدد مواصفات الكابل.', description_en: 'Verified brand context, not cable specifications.',
  source_urls: ['https://manufacturer.example/about'],
  notes_ar: 'PD اختصار Power Delivery ولا يحدد قدرة الكابل أو أطرافه.',
  terminology_source_urls: ['https://manufacturer.example/pd'],
}] };
const withBrands = prepareCatalog({ imagePools, brandProfiles });
const ankerPd = withBrands.products.find(product => product.source_name === 'CABLE ANKER PD');
assert.equal(ankerPd.name_ar, 'كابل شحن وتوصيل أنكر PD');
assert.ok(ankerPd.description_ar.includes(brandProfiles.brands[0].description_ar));
assert.ok(ankerPd.description_en.includes(brandProfiles.brands[0].description_en));
assert.ok(ankerPd.specs['معنى PD'].includes('Power Delivery'));
assert.equal(ankerPd.specs['قدرة مذكورة في الاسم (غير مؤكدة)'], undefined);
assert.equal(ankerPd.import_metadata.terminology.PD.confirms_item_support, false);
assert.equal(ankerPd.catalog_status, 'estimated');
assert.ok(ankerPd.data_sources.some(source => source.url === 'https://manufacturer.example/about'));
assert.ok(ankerPd.data_sources.some(source => source.url === 'https://manufacturer.example/pd'));
assert.equal(withBrands.products.find(product => product.source_name === 'ANKER SCREAN').specs['معنى PD'], undefined);
assert.throws(() => parseArgs([]), /--output is required/);

console.log(`Catalog checks passed: ${products.length} public source rows, ${report.source_stock_sum} source units, original prices/stock preserved, estimated and verified data distinguished.`);
