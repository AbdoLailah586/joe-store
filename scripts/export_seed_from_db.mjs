import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/DATABASE_URL=([^\r\n]+)/);
const sql = neon(match[1]);

async function exportSeed() {
  console.log('Fetching all products from Neon DB...');
  const rows = await sql`
    SELECT * FROM products 
    ORDER BY is_featured DESC, created_at DESC, id ASC;
  `;
  console.log(`Fetched ${rows.length} rows.`);

  const products = rows.map(r => {
    const isPreowned = Boolean(r.is_preowned);
    const rawSpecs = r.specs || {};
    let details = {};
    if (rawSpecs.__product_data) {
      details = typeof rawSpecs.__product_data === 'string'
        ? JSON.parse(rawSpecs.__product_data)
        : rawSpecs.__product_data;
    }

    const publicSpecs = {};
    for (const [key, value] of Object.entries(rawSpecs)) {
      if (!key.startsWith('__') && !key.startsWith('description_') && typeof value === 'string') {
        publicSpecs[key] = value;
      }
    }

    const rawColors = Array.isArray(r.colors) ? r.colors : (details.available_colors || []);
    const colors = rawColors.map(c => {
      if (typeof c === 'string') {
        const hexMap = {
          'أسود': '#000000',
          'أبيض': '#FFFFFF',
          'رمادي': '#808080',
          'فضي': '#C0C0C0',
          'ذهبي': '#FFD700',
          'أزرق': '#1E3A8A',
          'وردي': '#F472B6',
          'أحمر': '#DC2626',
          'برتقالي': '#EA580C'
        };
        return { name_ar: c, name_en: c, hex: hexMap[c] || '#475569' };
      }
      return c;
    });
    const storageOptions = Array.isArray(r.storage_options) ? r.storage_options : (details.available_storages || []);
    const images = Array.isArray(r.images) && r.images.length > 0 ? r.images : (details.images || ['/product-images/default.jpg']);

    return {
      id: r.id,
      sku: details.sku || rawSpecs['SKU'] || r.id.toUpperCase(),
      name_ar: r.name_ar,
      name_en: r.name_en,
      brand: r.brand,
      category: r.category,
      condition: details.condition || (isPreowned ? 'mint' : 'brand_new'),
      battery_health: r.battery_health ? parseInt(String(r.battery_health).replace('%', '')) : undefined,
      storage: storageOptions[0] || details.storage || undefined,
      available_storages: storageOptions,
      color_ar: colors[0]?.name_ar || details.color_ar || undefined,
      color_en: colors[0]?.name_en || details.color_en || undefined,
      color_hex: colors[0]?.hex || details.color_hex || undefined,
      available_colors: colors,
      price: Number(r.price),
      original_price: r.old_price ? Number(r.old_price) : undefined,
      discount_percentage: r.old_price && Number(r.old_price) > Number(r.price)
        ? Math.round(((Number(r.old_price) - Number(r.price)) / Number(r.old_price)) * 100)
        : undefined,
      cost_price: r.cost_price ? Number(r.cost_price) : undefined,
      stock: Number(r.stock_quantity ?? 0),
      recorded_stock: r.stock_quantity == null ? undefined : Number(r.stock_quantity),
      recorded_images: images,
      in_stock: (r.stock_quantity ?? 0) > 0 && Number(r.price) > 0 && (r.is_active ?? true),
      is_active: r.is_active ?? true,
      images: images,
      description_ar: details.description_ar || rawSpecs.description_ar || r.name_ar,
      description_en: details.description_en || rawSpecs.description_en || r.name_en,
      specs: publicSpecs,
      about_item: details.about_item,
      quick_specs: details.quick_specs,
      warranty_months: parseInt(r.warranty, 10) || 12,
      rating: details.rating || 5,
      reviews_count: details.reviews_count || Math.floor(Math.random() * 20) + 5,
      is_featured: Boolean(r.is_featured),
      is_best_seller: Boolean(r.is_featured),
      is_flash_sale: Boolean(r.old_price && Number(r.old_price) > Number(r.price)),
      created_at: r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : '2026-03-01'
    };
  });

  const fileContent = `import { Product } from '../types';\n\nexport const initialProducts: Product[] = ${JSON.stringify(products, null, 2)};\n`;
  fs.writeFileSync('src/data/seedProducts.ts', fileContent, 'utf8');
  console.log(`✅ Successfully wrote ${products.length} products to src/data/seedProducts.ts!`);
}

exportSeed().catch(console.error);
