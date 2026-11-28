import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';
import path from 'node:path';

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.VITE_DATABASE_URL) return process.env.VITE_DATABASE_URL;
  try {
    const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8');
    const match = envContent.match(/^(?:VITE_)?DATABASE_URL=(.+)$/m);
    if (match) return match[1].trim();
  } catch (_) {}
  return '';
}

const dbUrl = getDatabaseUrl();
if (!dbUrl) {
  console.error('❌ خطأ: لم يتم العثور على DATABASE_URL.');
  process.exit(1);
}

const sql = neon(dbUrl);

export async function insertRealProduct(productData) {
  if (!productData || !productData.name_ar || productData.price == null || Number.isNaN(Number(productData.price))) {
    throw new Error('بيانات المنتج ناقصة: الاسم العربي والسعر (حتى لو 0) مطلوبان كحد أدنى.');
  }

  const id = productData.id || `prod-real-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const name_ar = String(productData.name_ar).trim();
  const name_en = String(productData.name_en || productData.name_ar).trim();
  const category = String(productData.category || 'accessories').trim();
  const brand = String(productData.brand || 'عام').trim();
  const price = Number(productData.price) || 0;
  const old_price = productData.original_price ? Number(productData.original_price) : null;
  const cost_price = productData.cost_price != null ? Number(productData.cost_price) : null;
  const stock_quantity = productData.stock != null ? Number(productData.stock) : 10;
  const is_active = productData.is_active !== false;
  const is_featured = Boolean(productData.is_featured);
  const is_preowned = Boolean(productData.condition && productData.condition !== 'brand_new');
  const battery_health = productData.battery_health ? `${productData.battery_health}%` : null;
  const warranty = productData.warranty_months ? `${productData.warranty_months} شهور` : 'ضمان متجر جو ستور المعتمد';
  const colors = JSON.stringify(productData.available_colors || []);
  const storage_options = JSON.stringify(productData.available_storages || []);
  const images = JSON.stringify(productData.images || ['/product-placeholder.svg']);

  // Format rich frontend specs and attributes
  const richSpecs = {
    ...(productData.specs || {}),
    description_ar: productData.description_ar || name_ar,
    description_en: productData.description_en || name_en,
    __product_data: JSON.stringify({
      sku: productData.sku || id.toUpperCase(),
      model_name: productData.model_name || name_en,
      condition: productData.condition || 'brand_new',
      warranty_months: productData.warranty_months || 12,
      rating: productData.rating || 5,
      reviews_count: productData.reviews_count || 1,
      about_item: productData.about_item || [],
      quick_specs: productData.quick_specs || {},
      feature_banners: productData.feature_banners || [],
      ...(productData.social_links ? { social_links: productData.social_links } : {}),
      image_is_illustrative: Boolean(productData.image_is_illustrative),
      catalog_status: productData.catalog_status || 'verified'
    })
  };

  const rows = await sql`
    INSERT INTO products (
      id, name_ar, name_en, category, brand, price, old_price, cost_price,
      stock_quantity, is_active, is_featured, is_preowned, battery_health,
      warranty, colors, storage_options, images, specs, updated_at
    ) VALUES (
      ${id}, ${name_ar}, ${name_en}, ${category}, ${brand}, ${price}, ${old_price}, ${cost_price},
      ${stock_quantity}, ${is_active}, ${is_featured}, ${is_preowned}, ${battery_health},
      ${warranty}, ${colors}::jsonb, ${storage_options}::jsonb, ${images}::jsonb, ${JSON.stringify(richSpecs)}::jsonb, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name_ar = EXCLUDED.name_ar,
      name_en = EXCLUDED.name_en,
      category = EXCLUDED.category,
      brand = EXCLUDED.brand,
      price = EXCLUDED.price,
      old_price = EXCLUDED.old_price,
      cost_price = EXCLUDED.cost_price,
      stock_quantity = EXCLUDED.stock_quantity,
      is_active = EXCLUDED.is_active,
      is_featured = EXCLUDED.is_featured,
      is_preowned = EXCLUDED.is_preowned,
      battery_health = EXCLUDED.battery_health,
      warranty = EXCLUDED.warranty,
      colors = EXCLUDED.colors,
      storage_options = EXCLUDED.storage_options,
      images = EXCLUDED.images,
      specs = EXCLUDED.specs,
      updated_at = NOW()
    RETURNING *;
  `;

  console.log(`✅ تم إدراج المنتج بنجاح في قاعدة البيانات:`);
  console.log(`   [${rows[0].id}] ${rows[0].name_ar} - السعر: ${rows[0].price} ج.م`);
  return rows[0];
}

// CLI usage: node scripts/ingest_real_product.mjs path/to/candidate.json
if (process.argv[1]?.endsWith('ingest_real_product.mjs') && process.argv[2]) {
  const filePath = path.resolve(process.cwd(), process.argv[2]);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ الملف غير موجود: ${filePath}`);
    process.exit(1);
  }
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (Array.isArray(content)) {
    for (const item of content) await insertRealProduct(item);
  } else {
    await insertRealProduct(content);
  }
}
