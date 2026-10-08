import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { neon } from '@neondatabase/serverless';

const args = process.argv.slice(2);
const inputIndex = args.indexOf('--input');
if (inputIndex < 0 || !args[inputIndex + 1]) throw new Error('--input <prepared-catalog.json> is required.');
const input = path.resolve(args[inputIndex + 1]);
const apply = args.includes('--apply');
const sourceText = fs.readFileSync(input, 'utf8');
const products = JSON.parse(sourceText);
assert.equal(products.length, 2233, 'The import must cover every Excel product.');
assert.equal(new Set(products.map(p => p.id)).size, 2233, 'Product IDs must be unique.');
assert.equal(products.reduce((sum, p) => sum + p.import_metadata.source_stock, 0), 5159);
assert.equal(products.filter(p => p.price === 0).length, 308);
for (const p of products) {
  assert.equal(p.id, `prod-pos-${p.import_metadata.item_number}`);
  assert.equal(p.price, p.import_metadata.source_sale_price);
  assert.equal(p.cost_price, p.import_metadata.source_average_cost);
  assert.equal(p.stock, Math.max(0, p.import_metadata.source_stock));
  assert.ok(p.images.length && p.description_ar && p.description_en && p.about_item.length);
  assert.ok(p.images.every(image => image.startsWith('/product-images/') || image.startsWith('https://')));
  assert.ok(p.catalog_status === 'verified' || p.catalog_status === 'estimated');
}

if (!process.env.DATABASE_URL) {
  const envPath = path.resolve('.env');
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}
const sql = neon(process.env.DATABASE_URL);
const records = products.map(p => {
  const { specs, cost_price, import_metadata, listing_status, ...displayData } = p;
  return {
    id: p.id, name_ar: p.name_ar, name_en: p.name_en, category: p.category,
    brand: p.brand, price: p.price, old_price: null, cost_price: p.cost_price,
    stock_quantity: import_metadata.source_stock, is_active: p.is_active,
    is_featured: false, is_preowned: p.condition === 'mint' || p.condition === 'used_good',
    battery_health: null, warranty: null,
    colors: p.available_colors || [], storage_options: p.available_storages || [], images: p.images,
    // Currency columns have scale 2; JSONB retains the exact spreadsheet cost.
    specs: { ...specs, __product_data: { ...displayData, cost_price } }, discount_label: null
  };
});

const stageStatement = `CREATE TEMP TABLE joe_catalog_stage ON COMMIT DROP AS
  SELECT * FROM jsonb_to_recordset($1::jsonb) AS p(
    id text, name_ar text, name_en text, category text, brand text,
    price numeric, old_price numeric, cost_price numeric, stock_quantity integer,
    is_active boolean, is_featured boolean, is_preowned boolean, battery_health text,
    warranty text, colors jsonb, storage_options jsonb, images jsonb, specs jsonb, discount_label text)`;
const summaryStatement = `SELECT count(*)::int AS rows,
  sum(stock_quantity)::numeric AS original_stock,
  count(*) FILTER (WHERE price = 0)::int AS missing_prices,
  count(*) FILTER (WHERE is_active)::int AS published,
  count(*) FILTER (WHERE jsonb_array_length(images) = 0)::int AS missing_images,
  count(*) FILTER (WHERE specs->'__product_data'->>'catalog_status' = 'verified')::int AS verified
  FROM joe_catalog_stage`;
const preview = await sql.transaction([
  sql.query(stageStatement, [JSON.stringify(records)]), sql.query(summaryStatement)
]);
const summary = preview[1][0];
assert.equal(summary.rows, 2233);
assert.equal(Number(summary.original_stock), 5159);
assert.equal(summary.missing_prices, 308);
assert.equal(summary.published, 2233);
assert.equal(summary.missing_images, 0);
console.log(JSON.stringify({ mode: 'isolated-temp-table-preview', sha256: crypto.createHash('sha256').update(sourceText).digest('hex'), summary }));

if (apply) {
  const columns = 'id,name_ar,name_en,category,brand,price,old_price,cost_price,stock_quantity,is_active,is_featured,is_preowned,battery_health,warranty,colors,storage_options,images,specs,discount_label';
  const updateColumns = columns.split(',').filter(column => column !== 'id');
  const applied = await sql.transaction([
    sql.query(stageStatement, [JSON.stringify(records)]),
    sql.query(`INSERT INTO products (${columns}) SELECT ${columns} FROM joe_catalog_stage
      ON CONFLICT (id) DO UPDATE SET ${updateColumns.map(column => `${column}=EXCLUDED.${column}`).join(',')},updated_at=NOW()`),
    sql.query(`SELECT count(*)::int AS matched_rows,
      count(*) FILTER (WHERE p.price <> s.price OR p.cost_price <> round(s.cost_price, 2)
        OR p.stock_quantity <> s.stock_quantity OR p.name_ar <> s.name_ar
        OR p.images <> s.images OR p.specs <> s.specs OR p.is_active <> s.is_active)::int AS mismatches
      FROM products p JOIN joe_catalog_stage s USING(id)`)
  ]);
  assert.equal(applied[2][0].matched_rows, 2233);
  assert.equal(applied[2][0].mismatches, 0);
  console.log(JSON.stringify({ mode: 'applied', reconciliation: applied[2][0] }));
}
