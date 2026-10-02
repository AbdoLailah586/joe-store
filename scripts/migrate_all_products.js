import { neon } from '@neondatabase/serverless';
import { initialProducts } from './seedProducts.mjs';

const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || '';
if (!databaseUrl) {
  console.error('❌ Missing DATABASE_URL environment variable');
  process.exit(1);
}

async function migrateProducts() {
  const sql = neon(databaseUrl);
  console.log(`📦 Migrating ${initialProducts.length} initial products to Neon PostgreSQL...`);

  let count = 0;
  for (const p of initialProducts) {
    await sql`
      INSERT INTO products (
        id, name_ar, name_en, category, brand, price, old_price, cost_price,
        stock_quantity, is_active, is_featured, is_preowned, battery_health,
        warranty, colors, storage_options, images, specs, discount_label
      )
      VALUES (
        ${p.id},
        ${p.name_ar},
        ${p.name_en},
        ${p.category},
        ${p.brand || 'Apple'},
        ${p.price},
        ${p.original_price || null},
        ${p.cost_price || Math.round(p.price * 0.8)},
        ${p.stock || 10},
        ${p.in_stock !== false},
        ${p.is_featured || false},
        ${p.condition === 'mint' || p.condition === 'fair'},
        ${p.battery_health ? `${p.battery_health}%` : null},
        ${p.specs?.['الضمان'] || `${p.warranty_months || 6} شهور`},
        ${JSON.stringify(p.available_colors || [])}::jsonb,
        ${JSON.stringify(p.available_storages || [])}::jsonb,
        ${JSON.stringify(p.images || [])}::jsonb,
        ${JSON.stringify(p.specs || {})}::jsonb,
        ${p.discount_percentage ? `خصم ${p.discount_percentage}%` : null}
      )
      ON CONFLICT (id) DO UPDATE SET
        name_ar = EXCLUDED.name_ar,
        name_en = EXCLUDED.name_en,
        price = EXCLUDED.price,
        old_price = EXCLUDED.old_price,
        stock_quantity = EXCLUDED.stock_quantity,
        is_active = EXCLUDED.is_active,
        is_featured = EXCLUDED.is_featured,
        is_preowned = EXCLUDED.is_preowned,
        battery_health = EXCLUDED.battery_health,
        colors = EXCLUDED.colors,
        storage_options = EXCLUDED.storage_options,
        images = EXCLUDED.images,
        specs = EXCLUDED.specs,
        updated_at = NOW();
    `;
    count++;
  }

  const result = await sql`SELECT count(*) FROM products;`;
  console.log(`🎉 Successfully migrated ${count} products! Total products in Neon: ${result[0].count}`);
}

migrateProducts().catch(console.error);
