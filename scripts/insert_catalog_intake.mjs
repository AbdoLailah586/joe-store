import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';
import path from 'node:path';

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/DATABASE_URL=([^\r\n]+)/);
const sql = neon(match[1]);

const whatsappProducts = [
  {
    id: 'prod-hunter-gan-67w',
    sku: 'CHG-HNTR-67W-GAN',
    name_ar: 'شاحن سريع هنتر GaN 67W فائق السرعة - HUNTER',
    name_en: 'HUNTER 67W GaN Ultra-Fast Wall Charger',
    category: 'chargers_cables',
    brand: 'HUNTER',
    price: 490,
    old_price: 650,
    discount_label: '25% خصم',
    cost_price: 350,
    stock_quantity: 25,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: 'ضمان 12 شهر استبدال فوري',
    colors: JSON.stringify([{ name_ar: 'أسود', name_en: 'Black', hex: '#111111' }, { name_ar: 'أبيض', name_en: 'White', hex: '#FFFFFF' }]),
    storage_options: JSON.stringify([]),
    images: JSON.stringify(['/product-images/hunter-67w-gan-box.jpg']),
    specs: JSON.stringify({
      'القدرة': '67W GaN Fast Charging',
      'المنافذ': '2x USB-C + 1x USB-A',
      'التقنية': 'Gallium Nitride (GaN III)',
      'التوافق': 'جميع هواتف آيفون وسامسونج واللابتوبات الحديثة Type-C',
      'الماركة': 'HUNTER'
    })
  },
  {
    id: 'prod-hunter-gan-45w',
    sku: 'CHG-HNTR-45W-GAN',
    name_ar: 'شاحن هنتر 45W شحن فائق السرعة - HUNTER Super Fast',
    name_en: 'HUNTER 45W Super Fast Wall Charger',
    category: 'chargers_cables',
    brand: 'HUNTER',
    price: 390,
    old_price: 500,
    discount_label: '22% خصم',
    cost_price: 270,
    stock_quantity: 30,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: 'ضمان 12 شهر استبدال فوري',
    colors: JSON.stringify([{ name_ar: 'أسود', name_en: 'Black', hex: '#111111' }]),
    storage_options: JSON.stringify([]),
    images: JSON.stringify(['/product-images/hunter-45w-gan-box.jpg']),
    specs: JSON.stringify({
      'القدرة': '45W Super Fast Charging 2.0',
      'المنافذ': 'USB-C PD',
      'التقنية': 'Super Fast Charge 2.0 / PD 3.0',
      'الماركة': 'HUNTER'
    })
  },
  {
    id: 'prod-hunter-pd-25w',
    sku: 'CHG-HNTR-25W-PD',
    name_ar: 'شاحن جداري هنتر 25W PD سريع - HUNTER Power Delivery',
    name_en: 'HUNTER 25W PD Fast Charger Adapter',
    category: 'chargers_cables',
    brand: 'HUNTER',
    price: 260,
    old_price: 350,
    discount_label: '25% خصم',
    cost_price: 180,
    stock_quantity: 40,
    is_active: true,
    is_featured: false,
    is_preowned: false,
    warranty: 'ضمان 12 شهر استبدال فوري',
    colors: JSON.stringify([{ name_ar: 'أبيض', name_en: 'White', hex: '#FFFFFF' }]),
    storage_options: JSON.stringify([]),
    images: JSON.stringify(['/product-images/hunter-25w-pd-box.jpg']),
    specs: JSON.stringify({
      'القدرة': '25W Power Delivery',
      'المنفذ': 'USB Type-C',
      'الماركة': 'HUNTER'
    })
  },
  {
    id: 'prod-hunter-ai-gan-45w',
    sku: 'CHG-HNTR-45W-AI',
    name_ar: 'شاحن ذكي هنتر AI GaN بقدرة 45W - توزيع طاقة ذكي',
    name_en: 'HUNTER AI GaN 45W Smart Charger',
    category: 'chargers_cables',
    brand: 'HUNTER',
    price: 420,
    old_price: 550,
    discount_label: '24% خصم',
    cost_price: 290,
    stock_quantity: 20,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: 'ضمان 12 شهر استبدال فوري',
    colors: JSON.stringify([{ name_ar: 'رمادي تيتانيوم', name_en: 'Titanium Gray', hex: '#4A4A4A' }]),
    storage_options: JSON.stringify([]),
    images: JSON.stringify(['/product-images/hunter-ai-45w-gan-box.jpg']),
    specs: JSON.stringify({
      'التقنية': 'شريحة ذكاء اصطناعي AI Smart Power Distribution',
      'القدرة': '45W GaN',
      'الأمان': 'حماية حرارية ذكية ضد ارتفاع التيار أو الجهد',
      'الماركة': 'HUNTER'
    })
  },
  {
    id: 'prod-hunter-desktop-gan-90w',
    sku: 'CHG-HNTR-90W-DESK',
    name_ar: 'محطة شحن مكتبية هنتر GaN بقدرة 90W متعددة المنافذ',
    name_en: 'HUNTER 90W GaN Desktop Multi-Port Charging Station',
    category: 'chargers_cables',
    brand: 'HUNTER',
    price: 850,
    old_price: 1100,
    discount_label: '23% خصم',
    cost_price: 620,
    stock_quantity: 15,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: 'ضمان 12 شهر استبدال فوري',
    colors: JSON.stringify([{ name_ar: 'أسود مطفي', name_en: 'Matte Black', hex: '#1C1C1E' }]),
    storage_options: JSON.stringify([]),
    images: JSON.stringify(['/product-images/hunter-90w-gan-desktop-box.jpg']),
    specs: JSON.stringify({
      'القدرة الإجمالية': '90W GaN Multi-Port',
      'المنافذ': '3x USB-C + 2x USB-A',
      'الاستخدام': 'محطة مكتبية متكاملة للابتوبات والأجهزة اللوحية والهواتف في آن واحد',
      'الماركة': 'HUNTER'
    })
  },
  {
    id: 'prod-oraimo-freepods-3c',
    sku: 'AUD-ORAIMO-FP3C',
    name_ar: 'سماعة أوريمو بلوتوث Oraimo FreePods 3C - صوت نقي وباس عميق',
    name_en: 'Oraimo FreePods 3C True Wireless Earbuds',
    category: 'audio',
    brand: 'Oraimo',
    price: 750,
    old_price: 950,
    discount_label: '21% خصم',
    cost_price: 550,
    stock_quantity: 35,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: 'ضمان 12 شهر استبدال أوريمو الرسمي',
    colors: JSON.stringify([{ name_ar: 'أسود كربوني', name_en: 'Carbon Black', hex: '#1B1B1D' }]),
    storage_options: JSON.stringify([]),
    images: JSON.stringify(['/product-images/oraimo-freepods-3c-box.jpg', '/product-images/oraimo-freepods-3c-features.jpg']),
    specs: JSON.stringify({
      'عمر البطارية': '36 ساعة تشغيل متواصل مع علبة الشحن',
      'المكالمات': '4 ميكروفونات بخاصية إلغاء الضوضاء أثناء المكالمات ENC',
      'مقاومة الماء': 'معيار IPX5 لمقاومة العرق والماء',
      'إصدار البلوتوث': 'Bluetooth 5.3 سريع وثابت',
      'الماركة': 'Oraimo'
    })
  },
  {
    id: 'prod-soundcore-r50i-nc',
    sku: 'AUD-ANKER-R50INC',
    name_ar: 'سماعة أنكر ساوندكور R50i NC مع عزل الضوضاء النشط (ANC)',
    name_en: 'Anker Soundcore R50i NC Active Noise Cancelling Earbuds',
    category: 'audio',
    brand: 'Anker',
    price: 1150,
    old_price: 1450,
    discount_label: '20% خصم',
    cost_price: 880,
    stock_quantity: 20,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: 'ضمان 18 شهر أنكر المعتمد',
    colors: JSON.stringify([{ name_ar: 'أسود', name_en: 'Black', hex: '#111111' }, { name_ar: 'أبيض', name_en: 'White', hex: '#F5F5F7' }]),
    storage_options: JSON.stringify([]),
    images: JSON.stringify(['/product-images/soundcore-r50i-nc-box.jpg']),
    specs: JSON.stringify({
      'عزل الضوضاء': 'عزل نشط متطور Active Noise Cancelling حتى 42dB',
      'البطارية': 'حتى 45 ساعة تشغيل إجمالي (10 ساعات بالسماعة)',
      'الشحن السريع': '10 دقائق شحن تعطي ساعتين تشغيل',
      'التطبيق': 'متوافقة مع تطبيق Soundcore للتحكم في موازن الصوت EQ',
      'الماركة': 'Anker Soundcore'
    })
  },
  {
    id: 'prod-hollyland-lark-wireless-mic',
    sku: 'AUD-HOLLYLAND-LARK',
    name_ar: 'مايك لاسلكي احترافي Hollyland Lark لصناع المحتوى والبث',
    name_en: 'Hollyland Lark Wireless Lavalier Microphone System',
    category: 'audio',
    brand: 'Hollyland',
    price: 2600,
    old_price: 3200,
    discount_label: '19% خصم',
    cost_price: 2100,
    stock_quantity: 12,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: 'ضمان 12 شهر معتمد',
    colors: JSON.stringify([{ name_ar: 'أسود احترافي', name_en: 'Pro Black', hex: '#1A1A1A' }]),
    storage_options: JSON.stringify([]),
    images: JSON.stringify(['/product-images/hollyland-lark-wireless-mic-box.jpg']),
    specs: JSON.stringify({
      'المدى اللاسلكي': 'حتى 200 متر في الهواء الطلق بتأخير شبه منعدم',
      'إلغاء الضوضاء': 'زر إلغاء ضوضاء مدمج بخاصية HearClear',
      'التوافق': 'هواتف آيفون، أندرويد، وكاميرات DSLR',
      'المحتويات': 'جهاز استقبال + أجهزة إرسال + علبة شحن متكاملة',
      'الماركة': 'Hollyland'
    })
  },
  {
    id: 'prod-lito-wireless-powerbank-10k',
    sku: 'PB-LITO-MAG-10K',
    name_ar: 'باور بانك لاسلكي ليتو Lito 10000mAh ماج سيف فائق السرعة',
    name_en: 'Lito 10,000mAh Magnetic Wireless MagSafe Power Bank',
    category: 'power_banks',
    brand: 'Lito',
    price: 950,
    old_price: 1250,
    discount_label: '24% خصم',
    cost_price: 720,
    stock_quantity: 25,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: 'ضمان 12 شهر استبدال',
    colors: JSON.stringify([{ name_ar: 'رمادي فضائي', name_en: 'Space Gray', hex: '#3E3E40' }]),
    storage_options: JSON.stringify([]),
    images: JSON.stringify(['/product-images/lito-wireless-powerbank-10k.jpg']),
    specs: JSON.stringify({
      'السعة': '10,000mAh ليثيوم بوليمر آمن',
      'الشحن اللاسلكي': '15W MagSafe مغناطيسي قوي',
      'الشحن السلكي': '20W PD Type-C شحن سريع',
      'الحجم': 'نحيف وخفيف وسهل الحمل على ظهر الموبايل',
      'الماركة': 'Lito'
    })
  },
  {
    id: 'prod-car-jumpstarter-airpump',
    sku: 'ACC-CAR-JUMP-PUMP',
    name_ar: 'جهاز طوارئ السيارة الشامل: جامب ستارتر + منفاخ إطارات رقمي + باور بانك',
    name_en: 'Multi-Function Car Jump Starter & Digital Tire Air Pump Power Bank',
    category: 'accessories',
    brand: 'AutoPro',
    price: 1850,
    old_price: 2400,
    discount_label: '23% خصم',
    cost_price: 1400,
    stock_quantity: 15,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: 'ضمان 12 شهر استبدال',
    colors: JSON.stringify([{ name_ar: 'أسود مع أحمر', name_en: 'Black / Red', hex: '#222222' }]),
    storage_options: JSON.stringify([]),
    images: JSON.stringify(['/product-images/car-jumpstarter-airpump.jpg']),
    specs: JSON.stringify({
      'تشغيل بطارية السيارة': 'تيار بدء قوي يشغل جميع محركات البنزين والديزل 12V',
      'منفاخ إطارات أوتوماتيكي': 'شاشة رقمية لضبط الضغط PSI ويتوقف تلقائياً عند الامتلاء',
      'باور بانك وكشاف': 'منفذ شحن USB للهواتف + كشاف LED قوي للطوارئ مع إشارة SOS',
      'الماركة': 'AutoPro'
    })
  },
  {
    id: 'prod-world-tag-apple-findmy',
    sku: 'ACC-WORLD-TAG-FINDMY',
    name_ar: 'ميدالية تتبع ذكية Smart World Tag متوافقة مع تطبيق Apple Find My',
    name_en: 'Smart World Tag Key Finder (Works with Apple Find My)',
    category: 'accessories',
    brand: 'WorldTag',
    price: 350,
    old_price: 480,
    discount_label: '27% خصم',
    cost_price: 230,
    stock_quantity: 50,
    is_active: true,
    is_featured: false,
    is_preowned: false,
    warranty: 'ضمان 6 أشهر',
    colors: JSON.stringify([{ name_ar: 'أبيض ناصع', name_en: 'Pure White', hex: '#FFFFFF' }]),
    storage_options: JSON.stringify([]),
    images: JSON.stringify(['/product-images/world-tag-apple-findmy.jpg']),
    specs: JSON.stringify({
      'التوافق': 'يعمل مباشرة مع تطبيق Find My (تحديد الموقع) الرسمي من Apple بدون تطبيقات إضافية',
      'المدى': 'تغطية عالمية عبر شبكة أجهزة آبل المشفرة',
      'البطارية': 'بطارية CR2032 تدوم لأكثر من عام وقابلة للاستبدال',
      'الماركة': 'WorldTag'
    })
  },
  {
    id: 'prod-k30-magnetic-car-mount',
    sku: 'ACC-K30-MAG-MOUNT',
    name_ar: 'حامل موبايل مغناطيسي فائق القوة للسيارة K30 دوران 360 درجة',
    name_en: 'K30 Ultra-Strong Magnetic 360 Car Phone Mount',
    category: 'accessories',
    brand: 'K30',
    price: 220,
    old_price: 300,
    discount_label: '26% خصم',
    cost_price: 130,
    stock_quantity: 45,
    is_active: true,
    is_featured: false,
    is_preowned: false,
    warranty: 'ضمان استبدال ضد عيوب الصناعة',
    colors: JSON.stringify([{ name_ar: 'رمادي تيتانيوم', name_en: 'Titanium Gray', hex: '#555555' }]),
    storage_options: JSON.stringify([]),
    images: JSON.stringify(['/product-images/k30-magnetic-car-mount.jpg']),
    specs: JSON.stringify({
      'المغناطيس': 'مغناطيس N52 فائق الثبات حتى مع المطبات الشديدة',
      'المرونة': 'مفصل كروي مرن يتحرك 360 درجة لجميع زوايا الرؤية',
      'التثبيت': 'شريط لاصق أصلي 3M شديد التحمل لدرجات الحرارة العالية',
      'الماركة': 'K30'
    })
  },
  {
    id: 'prod-haino-teko-sq18-amoled',
    sku: 'WAT-HAINO-SQ18',
    name_ar: 'ساعة ذكية فاخرة Haino Teko SQ-18 بشاشة AMOLED مع 3 أحزمة متنوعة',
    name_en: 'Haino Teko SQ-18 AMOLED Luxury Smartwatch with 3 Straps',
    category: 'smart_watches',
    brand: 'Haino Teko',
    price: 1350,
    old_price: 1750,
    discount_label: '23% خصم',
    cost_price: 980,
    stock_quantity: 18,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: 'ضمان 12 شهر Haino Teko المعتمد',
    colors: JSON.stringify([{ name_ar: 'أسود مع 3 أحزمة', name_en: 'Black with 3 Straps', hex: '#202020' }]),
    storage_options: JSON.stringify([]),
    images: JSON.stringify(['/product-images/haino-teko-sq18-amoled-box.jpg']),
    specs: JSON.stringify({
      'الشاشة': 'شاشة AMOLED مقاس 2.02 بوصة عالية السطوع',
      'المكالمات': 'إجراء واستقبال المكالمات بوضوح تام عبر مكبر صوت وميكروفون مدمج',
      'الملحقات': '3 أحزمة فاخرة (معدن كلاسيك + سيليكون رياضي + قماش كاجوال)',
      'الرياضة والصحة': 'قياس نبضات القلب ونسبة الأكسجين ومتابعة الأنشطة الرياضية',
      'الماركة': 'Haino Teko Germany'
    })
  },
  {
    id: 'prod-nabi-kids-smartwatch-gps',
    sku: 'WAT-NABI-KIDS-GPS',
    name_ar: 'ساعة أطفال ذكية nabi Kids بشريحة اتصال 5G وتحديد موقع GPS ومكالمات فيديو',
    name_en: 'nabi Kids 5G GPS Smartwatch with Video Call & SOS',
    category: 'smart_watches',
    brand: 'nabi',
    price: 1100,
    old_price: 1450,
    discount_label: '24% خصم',
    cost_price: 800,
    stock_quantity: 20,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: 'ضمان 12 شهر استبدال',
    colors: JSON.stringify([{ name_ar: 'أزرق سماوي', name_en: 'Sky Blue', hex: '#2196F3' }, { name_ar: 'وردي لطيف', name_en: 'Soft Pink', hex: '#E91E63' }]),
    storage_options: JSON.stringify([]),
    images: JSON.stringify(['/product-images/nabi-kids-smartwatch-gps-box.jpg']),
    specs: JSON.stringify({
      'الاتصال': 'تدعم تركيب شريحة نانو SIM للمكالمات الصوتية والمرئية',
      'الأمان والموقع': 'تتبع مباشر لحركة الطفل عبر GPS وخاصية المنطقة الآمنة وزر الطوارئ SOS',
      'الكاميرا': 'كاميرا مدمجة لمكالمات الفيديو والمراقبة الأبوية عن بعد',
      'مقاومة الماء': 'معيار IP67 مقاومة لرذاذ الماء وغسيل اليدين',
      'الماركة': 'nabi'
    })
  },
  {
    id: 'prod-tasbih-beiqi-s7pro-smartring',
    sku: 'ACC-BEIQI-S7PRO-RING',
    name_ar: 'خاتم تسبيح ذكي Bei Qi S7 Pro مع شاشة OLED واهتزاز عند الأرقام المميزة',
    name_en: 'Bei Qi S7 Pro Smart Tasbih Counter Ring with OLED Display',
    category: 'accessories',
    brand: 'Bei Qi',
    price: 380,
    old_price: 500,
    discount_label: '24% خصم',
    cost_price: 240,
    stock_quantity: 30,
    is_active: true,
    is_featured: false,
    is_preowned: false,
    warranty: 'ضمان 6 أشهر ضد عيوب الصناعة',
    colors: JSON.stringify([{ name_ar: 'أسود مطفي', name_en: 'Matte Black', hex: '#212121' }, { name_ar: 'فضي أنيق', name_en: 'Silver', hex: '#C0C0C0' }]),
    storage_options: JSON.stringify([]),
    images: JSON.stringify(['/product-images/tasbih-beiqi-s7pro-smartring.jpg']),
    specs: JSON.stringify({
      'الشاشة': 'OLED واضحة تعرض عداد التسبيح والتاريخ والساعة',
      'الاهتزاز': 'محرك اهتزاز ناعم عند الوصول للأرقام 33 و 66 و 99 و 100',
      'البطارية والشحن': 'علبة شحن محمولة تدوم لأيام طويلة من الاستخدام اليومي',
      'مقاومة الماء': 'معيار IP68 مقاوم للوضوء والماء اليومي',
      'الماركة': 'Bei Qi'
    })
  }
];

async function insertAll() {
  console.log('--- 1. Inserting WhatsApp Products ---');
  let waCount = 0;
  for (const p of whatsappProducts) {
    const specsObj = JSON.parse(p.specs || '{}');
    if (p.sku) specsObj['SKU'] = p.sku;

    await sql`
      INSERT INTO products (
        id, name_ar, name_en, category, brand, price, old_price, discount_label,
        cost_price, stock_quantity, is_active, is_featured, is_preowned, warranty,
        colors, storage_options, images, specs, created_at, updated_at
      ) VALUES (
        ${p.id}, ${p.name_ar}, ${p.name_en}, ${p.category}, ${p.brand},
        ${p.price}, ${p.old_price}, ${p.discount_label}, ${p.cost_price}, ${p.stock_quantity},
        ${p.is_active}, ${p.is_featured}, ${p.is_preowned}, ${p.warranty},
        ${p.colors}::jsonb, ${p.storage_options}::jsonb, ${p.images}::jsonb, ${JSON.stringify(specsObj)}::jsonb,
        NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        name_ar = EXCLUDED.name_ar,
        name_en = EXCLUDED.name_en,
        category = EXCLUDED.category,
        brand = EXCLUDED.brand,
        price = EXCLUDED.price,
        old_price = EXCLUDED.old_price,
        discount_label = EXCLUDED.discount_label,
        images = EXCLUDED.images,
        specs = EXCLUDED.specs,
        stock_quantity = EXCLUDED.stock_quantity,
        updated_at = NOW();
    `;
    waCount++;
  }
  console.log(`✅ Ingested ${waCount} WhatsApp products.`);

  console.log('--- 2. Inserting Cases from all_cases_ready.json ---');
  const casesData = JSON.parse(fs.readFileSync('catalog_intake/all_cases_ready.json', 'utf8'));
  console.log(`Found ${casesData.length} cases to insert...`);

  let caseCount = 0;
  for (const c of casesData) {
    const specsObj = typeof c.specs === 'string' ? JSON.parse(c.specs || '{}') : (c.specs || {});
    if (c.sku) specsObj['SKU'] = c.sku;

    const colorsStr = typeof c.colors === 'string' ? c.colors : JSON.stringify(c.colors || []);
    const storageStr = typeof c.storage_options === 'string' ? c.storage_options : JSON.stringify(c.storage_options || []);
    const imagesStr = typeof c.images === 'string' ? c.images : JSON.stringify(c.images || []);

    await sql`
      INSERT INTO products (
        id, name_ar, name_en, category, brand, price, old_price, discount_label,
        cost_price, stock_quantity, is_active, is_featured, is_preowned, warranty,
        colors, storage_options, images, specs, created_at, updated_at
      ) VALUES (
        ${c.id}, ${c.name_ar}, ${c.name_en}, ${c.category}, ${c.brand},
        ${c.price}, ${c.old_price}, ${c.discount_label}, ${c.cost_price}, ${c.stock_quantity},
        ${c.is_active}, ${c.is_featured}, ${c.is_preowned}, ${c.warranty},
        ${colorsStr}::jsonb, ${storageStr}::jsonb, ${imagesStr}::jsonb, ${JSON.stringify(specsObj)}::jsonb,
        NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        name_ar = EXCLUDED.name_ar,
        name_en = EXCLUDED.name_en,
        category = EXCLUDED.category,
        brand = EXCLUDED.brand,
        price = EXCLUDED.price,
        old_price = EXCLUDED.old_price,
        discount_label = EXCLUDED.discount_label,
        images = EXCLUDED.images,
        specs = EXCLUDED.specs,
        stock_quantity = EXCLUDED.stock_quantity,
        updated_at = NOW();
    `;
    caseCount++;
    if (caseCount % 50 === 0) {
      console.log(`  Inserted ${caseCount}/${casesData.length} cases...`);
    }
  }
  console.log(`✅ Ingested ${caseCount} cases.`);

  const summary = await sql`
    SELECT category, count(*)::int as count 
    FROM products 
    GROUP BY category 
    ORDER BY count DESC;
  `;
  console.log('--- Products Count by Category in Neon DB ---');
  console.table(summary);

  const total = await sql`SELECT count(*)::int as total FROM products;`;
  console.log(`🎉 Total Products now in Neon DB: ${total[0].total}`);
}

insertAll().catch(console.error);
