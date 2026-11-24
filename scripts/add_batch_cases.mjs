import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/DATABASE_URL=([^\r\n]+)/);
const sql = neon(match[1]);

const newProducts = [
  {
    id: 'prod-case-apple-silicone-desert-ip17promax',
    sku: 'CASE-APL-SIL-IP17PM-DST',
    name_ar: 'جراب كفر سيليكون أبل ماج سيف الأصلي - آيفون 17 برو ماكس (تيتانيوم صحراوي)',
    name_en: 'Official Apple Silicone MagSafe Case - iPhone 17 Pro Max (Desert Titanium)',
    category: 'cases_protection',
    brand: 'Apple',
    price: 200,
    old_price: 300,
    cost_price: 130,
    stock_quantity: 25,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: 'ضمان استبدال ضد عيوب الصناعة',
    colors: JSON.stringify([
      { name_ar: 'تيتانيوم صحراوي / بيج دافئ', name_en: 'Desert Titanium Tan', hex: '#C4A482' },
      { name_ar: 'لافندر بنفسجي فاتح', name_en: 'Lavender Violet', hex: '#BDB0D0' },
      { name_ar: 'نبيتي داكن / بورجوندي', name_en: 'Burgundy Plum', hex: '#63202E' },
      { name_ar: 'برتقالي كوزميك', name_en: 'Cosmic Orange', hex: '#D6653E' }
    ]),
    storage_options: JSON.stringify([]),
    images: JSON.stringify([
      '/product-images/case-apple-silicone-desert-ip17promax.jpg',
      '/product-images/case-apple-silicone-desert-ip17promax-original.jpg'
    ]),
    specs: JSON.stringify({
      'الماركة': 'Apple Official',
      'التوافق': 'Apple iPhone 17 Pro Max (Camera Plateau Edition)',
      'الخامة': 'سيليكون ناعم بملمس حريري فائق النعومة مع بطانة داخلية من المايكروفايبر',
      'الشحن اللاسلكي': 'متوافق بالكامل مع شواحن وإكسسوارات MagSafe السريعة',
      'حماية الكاميرا': 'إطار سيليكون بارز يحيط بشريط منصة الكاميرات العريض بالكامل',
      'الباركود': '2378835851868'
    }),
    discount_label: '33% خصم'
  },
  {
    id: 'prod-case-xinreeu-frosted-orange-ip17promax',
    sku: 'CASE-XIN-FRST-IP17PM-ORG',
    name_ar: 'جراب كفر XINREEU هايبرد ماج سيف بإطار كاميرا معدني - آيفون 17 برو ماكس',
    name_en: 'XINREEU Frosted Hybrid MagSafe Case with Metallic Camera Bezel - iPhone 17 Pro Max',
    category: 'cases_protection',
    brand: 'XINREEU',
    price: 550,
    old_price: 700,
    cost_price: 380,
    stock_quantity: 18,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: 'ضمان الوكيل 6 شهور',
    colors: JSON.stringify([
      { name_ar: 'برتقالي معدني مع ظهر شفاف مثلج', name_en: 'Frosted Orange Metallic', hex: '#E06928' }
    ]),
    storage_options: JSON.stringify([]),
    images: JSON.stringify([
      '/product-images/case-xinreeu-frosted-orange-ip17promax.jpg',
      '/product-images/case-xinreeu-frosted-orange-ip17promax-original.jpg'
    ]),
    specs: JSON.stringify({
      'الماركة': 'XINREEU Fashion',
      'التوافق': 'Apple iPhone 17 Pro Max (Camera Plateau)',
      'الخامة': 'ظهر أكريليك مطفي مثلج مقاوم للبصمات + حواف TPU ممتصة للصدمات',
      'إطار الكاميرا': 'إطار معدني مؤكسد بلون برتقالي نحاسي محفور عليه شعار XINREEU',
      'الشحن اللاسلكي': 'حلقة MagSafe مغناطيسية قوية باللون البرتقالي',
      'الباركود': '7706998784245'
    }),
    discount_label: '21% خصم'
  },
  {
    id: 'prod-case-ipefet-leather-tan-ip17promax',
    sku: 'CASE-IPEFET-LTHR-IP17PM-TAN',
    name_ar: 'جراب كفر iPefet جلد طبيعي منقط فاخر مع إطار كاميرا عريض - آيفون 17 برو ماكس',
    name_en: 'iPefet Luxury Ostrich Textured Leather Protective Case - iPhone 17 Pro Max',
    category: 'cases_protection',
    brand: 'iPefet',
    price: 350,
    old_price: 480,
    cost_price: 240,
    stock_quantity: 22,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: 'ضمان استبدال ضد عيوب الصناعة',
    colors: JSON.stringify([
      { name_ar: 'كونياك تان / بني جلدي منقط', name_en: 'Cognac Tan Ostrich Leather', hex: '#9E5B32' }
    ]),
    storage_options: JSON.stringify([]),
    images: JSON.stringify([
      '/product-images/case-ipefet-leather-tan-ip17promax.jpg',
      '/product-images/case-ipefet-leather-tan-ip17promax-original.jpg'
    ]),
    specs: JSON.stringify({
      'الماركة': 'iPefet Premium Protection',
      'التوافق': 'Apple iPhone 17 Pro Max (Camera Plateau)',
      'الخامة': 'جلد فاخر منقوش بنقشة جلد النعام (Ostrich Quill Dots) المقاومة للبصمات والخدوش',
      'حماية الكاميرا': 'إطار حماية معدني بارز بلون ذهبي تان محيط بمنصة الكاميرات العريضة',
      'مقاومة السقوط': 'وسائد هوائية Airbag Cushions في الزوايا لامتصاص الصدمات القوية',
      'الباركود': '1964406599881'
    }),
    discount_label: '27% خصم'
  },
  {
    id: 'prod-case-gear4-crystalex-clear-ip17promax',
    sku: 'CASE-GEAR4-D3O-IP17PM-CLR',
    name_ar: 'جراب كفر Gear4 D3O Crystalex شفاف ماج سيف ضد الصدمات والاصفرار - آيفون 17 برو ماكس',
    name_en: 'Gear4 D3O Crystalex Clear MagSafe Shockproof Case - iPhone 17 Pro Max',
    category: 'cases_protection',
    brand: 'Gear4',
    price: 300,
    old_price: 420,
    cost_price: 200,
    stock_quantity: 30,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: 'ضمان سنة ضد الاصفرار وتغير اللون',
    colors: JSON.stringify([
      { name_ar: 'شفاف كريستالي مع حلقة MagSafe بيضاء', name_en: 'Crystal Clear with White MagSafe Ring', hex: '#FFFFFF' }
    ]),
    storage_options: JSON.stringify([]),
    images: JSON.stringify([
      '/product-images/case-gear4-crystalex-clear-ip17promax.jpg',
      '/product-images/case-gear4-crystalex-clear-ip17promax-original.jpg'
    ]),
    specs: JSON.stringify({
      'الماركة': 'Gear4 (Protected by D3O)',
      'التوافق': 'Apple iPhone 17 Pro Max (Camera Plateau Edition)',
      'الخامة': 'مادة D3O Crystalex المعتمدة عالمياً لامتصاص الصدمات مع مقاومة الاصفرار',
      'الشحن اللاسلكي': 'حلقة MagSafe مغناطيسية سريعة مدمجة',
      'حماية الكاميرا': 'حواف بارزة مرتفعة لحماية شريط منصة الكاميرات والعدسات من الخدوش',
      'الباركود': '9120542813690'
    }),
    discount_label: '29% خصم'
  }
];

async function run() {
  console.log(`Inserting ${newProducts.length} new case products into Neon PostgreSQL...`);
  
  for (const p of newProducts) {
    await sql`
      INSERT INTO products (
        id, name_ar, name_en, category, brand, price, old_price, cost_price, 
        stock_quantity, is_active, is_featured, is_preowned, warranty, 
        colors, storage_options, images, specs, discount_label, updated_at
      ) VALUES (
        ${p.id}, ${p.name_ar}, ${p.name_en}, ${p.category}, 
        ${p.brand}, ${p.price}, ${p.old_price}, ${p.cost_price}, 
        ${p.stock_quantity}, ${p.is_active}, ${p.is_featured}, 
        ${p.is_preowned}, ${p.warranty}, ${p.colors}::jsonb, 
        ${p.storage_options}::jsonb, ${p.images}::jsonb, ${p.specs}::jsonb, 
        ${p.discount_label}, NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        name_ar = EXCLUDED.name_ar,
        name_en = EXCLUDED.name_en,
        price = EXCLUDED.price,
        old_price = EXCLUDED.old_price,
        images = EXCLUDED.images,
        specs = EXCLUDED.specs,
        colors = EXCLUDED.colors,
        updated_at = NOW();
    `;
    console.log(`✅ Saved ${p.id} to Neon DB`);
  }
  
  const count = await sql`SELECT count(*)::int as count FROM products WHERE category = 'cases_protection';`;
  console.log(`Total cases in store now: ${count[0].count}`);
}

run().catch(console.error);
