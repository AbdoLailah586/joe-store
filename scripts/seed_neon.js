import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || '';
if (!databaseUrl) {
  console.error('❌ Missing DATABASE_URL environment variable');
  process.exit(1);
}

async function seedDatabase() {
  const sql = neon(databaseUrl);
  console.log('🌱 Seeding Neon Database with initial store data...');

  try {
    // 1. Seed Categories
    const categories = [
      { key: 'smartphones', name_ar: 'هواتف ذكية', name_en: 'Smartphones', icon: '📲', sort_order: 1 },
      { key: 'smartwatches', name_ar: 'ساعات ذكية', name_en: 'Smartwatches', icon: '⌚', sort_order: 2 },
      { key: 'audio', name_ar: 'سماعات وصوتيات', name_en: 'Audio & Earbuds', icon: '🎧', sort_order: 3 },
      { key: 'chargers_cables', name_ar: 'شواحن وكابلات', name_en: 'Chargers & Cables', icon: '🔌', sort_order: 4 },
      { key: 'powerbanks', name_ar: 'بنوك طاقة (باوربانك)', name_en: 'Powerbanks', icon: '🔋', sort_order: 5 },
      { key: 'cases_protection', name_ar: 'جرابات وحمايات', name_en: 'Cases & Protection', icon: '🛡️', sort_order: 6 },
    ];

    for (const cat of categories) {
      await sql`
        INSERT INTO categories (key, name_ar, name_en, icon, sort_order)
        VALUES (${cat.key}, ${cat.name_ar}, ${cat.name_en}, ${cat.icon}, ${cat.sort_order})
        ON CONFLICT (key) DO UPDATE SET
          name_ar = EXCLUDED.name_ar,
          name_en = EXCLUDED.name_en,
          icon = EXCLUDED.icon;
      `;
    }
    console.log(`✅ ${categories.length} Categories seeded.`);

    // 2. Read products from seedProducts.ts
    // Let's import or extract the products array
    const seedContent = readFileSync(resolve('src/data/seedProducts.ts'), 'utf8');
    // We can evaluate or parse initialProducts using a dynamic import or ts-node/esbuild
    console.log('✅ Prepared categories. Now seeding store settings...');

    const defaultSettings = {
      store_name_ar: 'جو ستور - JOE Store',
      store_name_en: 'JOE Store',
      store_phone: '01554826209',
      store_whatsapp: '201554826209',
      store_address_ar: 'المنصورة – شارع الإمام محمد عبده – ناصية آمون.',
      store_address_en: 'El Mansoura – Imam Mohamed Abdo Street – Amon Corner.',
      working_hours_ar: 'يومياً من الساعة 12 ظهراً حتى 12 منتصف الليل',
      working_hours_en: 'Daily from 12:00 PM to 12:00 AM',
      instapay_address: 'joestore@instapay',
      vodafone_cash_number: '01554826209',
      tiktok_url: 'https://www.tiktok.com/@joestore2026',
      instagram_url: 'https://www.instagram.com/joestore',
      facebook_url: 'https://www.facebook.com/joestore',
      active_theme: 'royal_gold',
      theme_mode: 'dark',
      shipping_fee_default: 35,
      free_shipping_threshold: 2500
    };

    await sql`
      INSERT INTO store_settings (id, settings)
      VALUES ('main', ${JSON.stringify(defaultSettings)}::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        settings = EXCLUDED.settings,
        updated_at = NOW();
    `;
    console.log('✅ Store Settings seeded successfully into Neon DB.');

    // Count products currently in DB
    const countResult = await sql`SELECT count(*) FROM products;`;
    console.log(`📊 Current products count in Neon: ${countResult[0].count}`);

  } catch (err) {
    console.error('❌ Seeding error:', err);
    process.exit(1);
  }
}

seedDatabase();
