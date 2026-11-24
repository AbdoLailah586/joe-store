import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/DATABASE_URL=([^\r\n]+)/);
const sql = neon(match[1]);

const newCase = {
  id: 'prod-case-carrio-mesh-ip17promax',
  name_ar: 'جراب كفر Carrio كلاسيك شبكي مبرد MagSafe - آيفون 17 برو ماكس',
  name_en: 'Carrio Classic Breathable Mesh MagSafe Case - iPhone 17 Pro Max',
  category: 'cases_protection',
  brand: 'Carrio',
  price: 500,
  old_price: 650,
  cost_price: 350,
  stock_quantity: 20,
  is_active: true,
  is_featured: true,
  is_preowned: false,
  warranty: 'ضمان الوكيل 6 شهور',
  colors: JSON.stringify([
    { name_ar: 'تيراكوتا برتقالي محروق', name_en: 'Terracotta Rust Orange', hex: '#C2593F' }
  ]),
  storage_options: JSON.stringify([]),
  images: JSON.stringify([
    '/product-images/case-carrio-carbon-terracotta-ip17promax.jpg',
    '/product-images/case-carrio-carbon-terracotta-ip17promax-original.jpg'
  ]),
  specs: JSON.stringify({
    'الخامة': 'TPU سيليكون فائق التحمل وشبكة تبريد مثقبة مدمجة',
    'التوافق': 'Apple iPhone 17 Pro Max (Camera Plateau)',
    'الشحن اللاسلكي': 'دعم تقنية MagSafe المغناطيسية السريعة',
    'حماية الكاميرات': 'إطار حماية بارز يحيط بشريط الكاميرات العريض بالكامل',
    'الباركود': '28012443465065'
  }),
  discount_label: '23% خصم'
};

async function run() {
  console.log('Inserting or updating product in Neon PostgreSQL...');
  await sql`
    INSERT INTO products (
      id, name_ar, name_en, category, brand, price, old_price, cost_price, 
      stock_quantity, is_active, is_featured, is_preowned, warranty, 
      colors, storage_options, images, specs, discount_label, updated_at
    ) VALUES (
      ${newCase.id}, ${newCase.name_ar}, ${newCase.name_en}, ${newCase.category}, 
      ${newCase.brand}, ${newCase.price}, ${newCase.old_price}, ${newCase.cost_price}, 
      ${newCase.stock_quantity}, ${newCase.is_active}, ${newCase.is_featured}, 
      ${newCase.is_preowned}, ${newCase.warranty}, ${newCase.colors}::jsonb, 
      ${newCase.storage_options}::jsonb, ${newCase.images}::jsonb, ${newCase.specs}::jsonb, 
      ${newCase.discount_label}, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name_ar = EXCLUDED.name_ar,
      name_en = EXCLUDED.name_en,
      price = EXCLUDED.price,
      old_price = EXCLUDED.old_price,
      images = EXCLUDED.images,
      specs = EXCLUDED.specs,
      updated_at = NOW();
  `;
  
  const res = await sql`SELECT id, name_ar, images FROM products WHERE id = ${newCase.id}`;
  console.log('Successfully saved to Neon DB:', JSON.stringify(res, null, 2));
}

run().catch(console.error);
