import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/DATABASE_URL=([^\r\n]+)/);
const sql = neon(match[1]);

const batch2Products = [
  {
    id: 'prod-case-newcase-business-matte-ip17promax',
    sku: 'CASE-NEW-MATTE-IP17PM-BLK',
    name_ar: 'جراب كفر New Case بيزنس أسود مطفي ماج سيف - آيفون 17 برو ماكس',
    name_en: 'New Case Business Matte Black MagSafe Case - iPhone 17 Pro Max',
    category: 'cases_protection',
    brand: 'New Case',
    price: 350,
    old_price: 500,
    cost_price: 220,
    stock_quantity: 20,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: 'ضمان استبدال ضد عيوب الصناعة',
    colors: JSON.stringify([
      { name_ar: 'أسود مطفي بيزنس', name_en: 'Business Matte Black', hex: '#1C1C1E' }
    ]),
    storage_options: JSON.stringify([]),
    images: JSON.stringify([
      '/product-images/case-newcase-business-matte-ip17promax.jpg',
      '/product-images/case-newcase-business-matte-ip17promax-original.jpg'
    ]),
    specs: JSON.stringify({
      'الماركة': 'New Case Boutique',
      'التوافق': 'Apple iPhone 17 Pro Max (Camera Plateau Edition)',
      'الخامة': 'بولي كربونات مطفي فاخر مع حواف TPU صدمات',
      'الشحن اللاسلكي': 'حلقة MagSafe مغناطيسية رمادية داكنة مدمجة',
      'حماية الكاميرا': 'غطاء حماية مدمج يحيط بمنصة الكاميرات بفتحات ليزر دقيقة لكل عدسة'
    }),
    discount_label: '30% خصم'
  },
  {
    id: 'prod-case-hdci-dividing-orange-ip17promax',
    sku: 'CASE-HDCI-DIV-IP17PM-ORG',
    name_ar: 'جراب كفر HDCI جلد فاخر ماج سيف مع إطار كاميرا ذهبي - آيفون 17 برو ماكس',
    name_en: 'HDCI Dividing Fiber Flocking MagSafe Leather Case - iPhone 17 Pro Max',
    category: 'cases_protection',
    brand: 'HDCI',
    price: 450,
    old_price: 600,
    cost_price: 290,
    stock_quantity: 16,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: 'ضمان الوكيل 6 شهور',
    colors: JSON.stringify([
      { name_ar: 'برتقالي كوزميك مع إطار ذهبي', name_en: 'Cosmic Orange with Gold Frame', hex: '#E06928' }
    ]),
    storage_options: JSON.stringify([]),
    images: JSON.stringify([
      '/product-images/case-hdci-dividing-orange-ip17promax.jpg',
      '/product-images/case-hdci-dividing-orange-ip17promax-original.jpg'
    ]),
    specs: JSON.stringify({
      'الماركة': 'HDCI Mobile Accessories',
      'التوافق': 'Apple iPhone 17 Pro Max (6.9 inch)',
      'الخامة': 'جلد نباتي ناعم بملمس Soft Leather + بطانة داخلية Fiber Flocking',
      'حماية الكاميرا': 'إطار معدني ذهبي بارز يحيط بشريط منصة الكاميرات العريض',
      'الشحن اللاسلكي': 'مغناطيس MagSafe مدمج فائق القوة Strong Magnet'
    }),
    discount_label: '25% خصم'
  },
  {
    id: 'prod-case-tadagee-wallet-orange-ip17promax',
    sku: 'CASE-TADAGEE-WLT-IP17PM-ORG',
    name_ar: 'جراب كفر Tadagee جلد فاخر بمحفظة كروت مدمجة - آيفون 17 برو ماكس',
    name_en: 'Tadagee Drop Protection Vegan Leather Wallet Case - iPhone 17 Pro Max',
    category: 'cases_protection',
    brand: 'Tadagee',
    price: 450,
    old_price: 650,
    cost_price: 280,
    stock_quantity: 15,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: 'ضمان استبدال ضد عيوب الصناعة',
    colors: JSON.stringify([
      { name_ar: 'برتقالي بنقشة هندسية مع محفظة كروت', name_en: 'Patterned Orange with Card Pocket', hex: '#D6653E' }
    ]),
    storage_options: JSON.stringify([]),
    images: JSON.stringify([
      '/product-images/case-tadagee-wallet-orange-ip17promax.jpg',
      '/product-images/case-tadagee-wallet-orange-ip17promax-original.jpg'
    ]),
    specs: JSON.stringify({
      'الماركة': 'Tadagee Drop Protection',
      'التوافق': 'Apple iPhone 17 Pro Max (Camera Plateau)',
      'الخامة': 'جلد نباتي منقوش مع جيب محفظة كروت مدمج ومخيط بإتقان',
      'حماية الكاميرا': 'إطار حماية معدني برتقالي نحاسي مرتفع',
      'المميزات الخاصة': 'محفظة خلفية لحمل البطاقات البنكية والكروت الشخصية'
    }),
    discount_label: '31% خصم'
  },
  {
    id: 'prod-case-vipz-carbon-pixel-ip17promax',
    sku: 'CASE-VIPZ-PIX-IP17PM-ORG',
    name_ar: 'جراب كفر VIPZ كربون فايبر بنقشة بيكسل متدرجة - آيفون 17 برو ماكس',
    name_en: 'VIPZ Pixel Carbon Fiber Protective Case - iPhone 17 Pro Max',
    category: 'cases_protection',
    brand: 'VIPZ',
    price: 500,
    old_price: 680,
    cost_price: 320,
    stock_quantity: 20,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: 'ضمان الوكيل 6 شهور',
    colors: JSON.stringify([
      { name_ar: 'كربون برتقالي مع نقشة بيكسل متدرجة', name_en: 'Orange Carbon with Pixel Gradient', hex: '#D95829' }
    ]),
    storage_options: JSON.stringify([]),
    images: JSON.stringify([
      '/product-images/case-vipz-carbon-pixel-ip17promax.jpg',
      '/product-images/case-vipz-carbon-pixel-ip17promax-original.jpg'
    ]),
    specs: JSON.stringify({
      'الماركة': 'VIPZ Premium Stylish',
      'التوافق': 'Apple iPhone 17 Pro Max (Camera Plateau)',
      'الخامة': 'ألياف كربون فايبر مركبة ومقاومة للخدش مع نقشة بيكسل شطرنجية هندسية',
      'حماية الكاميرا': 'إطار معدني بارز لحماية شريط منصة الكاميرات العريض',
      'الباركود': '5266371834247'
    }),
    discount_label: '26% خصم'
  }
];

async function run() {
  console.log(`Inserting ${batch2Products.length} Batch 2 case products into Neon PostgreSQL...`);
  
  for (const p of batch2Products) {
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
