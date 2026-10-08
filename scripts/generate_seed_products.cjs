const fs = require('fs');
const xlsx = require('xlsx');

// Read the excel file
const wb = xlsx.readFile('pyVnA7LPDzn4VTOH8Pe0KKhjKijPlM5bWqjcHyM9euaamNaa27.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const excelRows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

console.log('Generating enriched seed products catalog...');

const seedProductsContent = `import { Product } from '../types';

export const initialProducts: Product[] = [
  // 1. STAR PRODUCT: JOYROOM JR-T03S PLUS (From the User's Amazon Link: ASIN B0CH8G5DL8)
  {
    id: 'prod-joyroom-jr-t03s-plus',
    asin: 'B0CH8G5DL8',
    sku: 'JR-T03S-PLUS-WHT',
    model_name: 'JR-T03S Plus (الجيل الرابع)',
    name_ar: 'سماعة جويروم JR-T03S Plus الجيل الرابع TWS اللاسلكية الأصلية بلوتوث 5.3 مع علبة شحن تدعم الشحن اللاسلكي السريع وعزل ضوضاء المكالمات ENC وحافظة سيليكون مجانية - متجر جو ستور',
    name_en: 'JOYROOM JR-T03S Plus (4th Gen) TWS True Wireless Bluetooth 5.3 Earbuds with Qi Wireless Charging, ENC Call Noise Cancellation, 40H Playtime & Free Silicone Case',
    brand: 'Joyroom',
    category: 'audio',
    condition: 'brand_new',
    battery_health: 100,
    color_ar: 'أبيض لؤلؤي (مع كفر أبيض هدية)',
    color_en: 'Glossy White (with Free Silicone Case)',
    color_hex: '#FFFFFF',
    available_colors: [
      { name_ar: 'أبيض كلاسيكي (مع كفر حماية)', name_en: 'Glossy White', hex: '#FFFFFF' },
      { name_ar: 'أسود كربوني مطفي', name_en: 'Matte Black', hex: '#1C1C1E' },
      { name_ar: 'أزرق سماوي ناعم', name_en: 'Sky Blue', hex: '#7097C2' },
      { name_ar: 'بينك باستيل هادئ', name_en: 'Pastel Pink', hex: '#F7C6D0' }
    ],
    available_storages: [],
    model_variants: [
      { name: 'JR-T03S Plus (الجيل الرابع اللاسلكي)', id: 'prod-joyroom-jr-t03s-plus', price: 1250 },
      { name: 'JR-T03S Pro (عزل الضوضاء النشط ANC)', id: 'prod-joyroom-jr-t03s-pro', price: 1450 },
      { name: 'JR-T03S Classic (الإصدار الأساسي)', id: 'prod-joyroom-jr-t03s-classic', price: 950 }
    ],
    price: 1250,
    original_price: 1650,
    discount_percentage: 24,
    cost_price: 500,
    stock: 18,
    in_stock: true,
    bought_past_month: 1450,
    images: [
      'https://media.btech.com/catalogs/5/b/3/0/5b30682c1bde5818abbcb3ce8d3a975ba8e2ef22_41k4ezc8fal._ac_sl1000_.jpg',
      'https://2b.com.eg/media/catalog/product/cache/d33f1c152d6eb7e8608a208d80f21a14/h/p/hp37t-min.jpg',
      'https://www.eastasiaeg.com/media/catalog/product/cache/96123baaef328b92941fc6bf41e42dc8/j/o/joyroom-tws-wireless-earphone-jr-t03s-plus.jpg',
      'https://eloroby.com/public/uploads/all/wtYIQJpZq4CXddRHuDwhRGES7ffta7eudsTOcbZX.png',
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80'
    ],
    description_ar: 'سماعة جويروم JR-T03S Plus الجيل الرابع المطورة تمنحك تجربة صوتية ستيريو استثنائية مع دعم حقيقي للشحن اللاسلكي السريع وعزل ذكي للضوضاء أثناء المكالمات ENC. بطارية عملاقة تدوم حتى 40 ساعة مع علبة الشحن، واتصال تلقائي فوري Pop-Up، ومقاومة للعرق ورذاذ الماء IPX5 مع جراب سيليكون أصلي هدية وميدالية تعليق معدنية.',
    description_en: 'Upgraded 4th Generation JOYROOM JR-T03S Plus TWS earbuds delivering rich Hi-Fi acoustic sound with true Qi wireless charging and dual-microphone ENC call noise cancellation. Features up to 40 hours total playtime, smart Pop-up pairing, IPX5 sweatproof protection, and a free premium silicone case.',
    specs: {
      'الماركة (Brand)': 'JOYROOM الأصلية',
      'اسم الطراز': 'JR-T03S Plus (4th Generation Upgraded)',
      'إصدار البلوتوث': 'Bluetooth 5.3 (تأخير منخفض ونطاق 15 متر)',
      'تقنية الشحن': 'شحن لاسلكي Qi سريع + شحن سلكي Lightning / Type-C',
      'عمر البطارية': '6 ساعات استماع متواصلة / 40 ساعة إجمالية مع العلبة',
      'حجم المحرك الصوتي': '13 ملم Dynamic Bass Driver لصوت جهير فائق',
      'تقنية عزل المكالمات': 'Dual-Mic ENC عزل الضوضاء المحيطة والرياح بالذكاء الاصطناعي',
      'مقاومة الماء والتعرق': 'تصنيف معتمد IPX5 لمقاومة العرق ورذاذ المطر',
      'سعة بطارية السماعة': '30 مللي أمبير لكل سماعة',
      'سعة بطارية العلبة': '320 مللي أمبير (تكفي لشحن السماعات 5-6 مرات)',
      'وقت الشحن': 'ساعة واحدة فقط للشحن الكامل',
      'الملحقات المجانية': 'كفر سيليكون أصلي + ميدالية تعليق معدنية + كابل شحن',
      'الضمان': 'ضمان استبدال وصيانة رسمي 12 شهراً معتمد من جو ستور'
    },
    about_item: [
      '[شحن لاسلكي Qi فائق وسريع]: تدعم علبة الشحن كلاً من الشحن اللاسلكي المغناطيسي السريع والشحن السلكي، مما يمنحك حرية الشحن في أي وقت بدون أسلاك.',
      '[عمر بطارية عملاق يصل إلى 40 ساعة]: استمتع بما يصل إلى 6 ساعات من الموسيقى والمكالمات بشحنة واحدة، بينما تمنحك علبة الشحن ما يصل إلى 40 ساعة إجمالية لتناسب أسبوعاً كاملاً من الاستخدام اليومي.',
      '[عزل ضوضاء المكالمات ENC المزدوج]: ميكروفون مدمج ذكي يعزل الضوضاء المحيطة وصوت الرياح لضمان مكالمات هاتفية نقية تماماً في الأماكن المزدحمة ووسائل المواصلات.',
      '[صوت ستيريو Hi-Fi مع بيس جهير 13 مم]: مكبر صوت ديناميكي كبير مقاس 13 ملم ينتج صوتاً متوازناً وجهيراً Bass عميقاً وتفاصيل صوتية واضحة للغاية في الألعاب والموسيقى.',
      '[اقتران منبثق فوري Pop-up وبلوتوث 5.3]: اقتران تلقائي فوري بمجرد فتح الغطاء يظهر نسبة البطارية على شاشة هاتفك مع استقرار تام ونطاق اتصال يصل إلى 15 متراً.',
      '[مقاومة الماء والعرق بتصنيف IPX5]: تصميم محكم يمنع تسرب العرق ورذاذ الماء، مثالية للاستخدام أثناء التمارين الرياضية في الجيم والجري.',
      '[ملحقات وهدية مجانية]: تتضمن العلبة كفر حماية سيليكون أصلي ناعم الملمس وميدالية معدنية لحماية السماعة من الخدوش والسقوط.'
    ],
    feature_banners: [
      {
        tag: 'البطارية والشحن اللاسلكي',
        title: 'عمر بطارية عملاق 40 ساعة مع شحن لاسلكي Qi ذكي',
        subtitle: 'Monster 40-Hour Playtime & Seamless Qi Wireless Charging',
        description: 'انسَ أمر الشواحن طوال الأسبوع. توفر السماعات 6 ساعات تشغيل متواصل، ومع علبة الشحن تصل إلى 40 ساعة كاملة. فقط ضع العلبة على أي شاحن لاسلكي وسيبدأ الشحن فوراً دون أسلاك.',
        image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1200&q=80'
      },
      {
        tag: 'هندسة الصوت والبيس',
        title: 'محرك ديناميكي 13 مم لصوت ستيريو Hi-Fi وبيس سينمائي عميق',
        subtitle: '13mm Dynamic Driver with Enhanced Heavy Bass Acoustics',
        description: 'غشاء بيولوجي مركب متطور يوفر نطاقاً ترددياً غنياً ومتوازناً، لتستمتع بأدق تفاصيل الصوت ونغمات Bass عميقة ومثيرة تجعلك في قلب التجربة الموسيقية والسينمائية.',
        image_url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1200&q=80'
      },
      {
        tag: 'المكالمات وعزل الضوضاء',
        title: 'ميكروفون مزدوج ENC لعزل الضوضاء المحيطة والرياح بالذكاء الاصطناعي',
        subtitle: 'Dual-Microphone ENC Smart Noise Reduction for Crystal Clear Calls',
        description: 'تتولى شريحة المعالجة الذكية عزل ضوضاء الشارع والسيارات وتضخيم صوتك الطبيعي، ليسمعك الطرف الآخر في المكالمات واجتماعات العمل بوضوح كريستالي فائق حتى في أكثر الأماكن ازدحاماً.',
        image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80'
      },
      {
        tag: 'مقاومة الماء والرياضة',
        title: 'معيار مقاومة الماء والعرق IPX5 للتمارين الرياضية الشاقة',
        subtitle: 'IPX5 Water & Sweat Resistance Built for Extreme Workouts',
        description: 'طلاء نانو محكم ومنافذ صوتية معزولة تمنع تسرب قطرات العرق أو رذاذ المطر، مما يجعلها الرفيق المثالي في صالة الألعاب الرياضية وأثناء الجري وركوب الدراجات.',
        image_url: 'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?auto=format&fit=crop&w=1200&q=80'
      },
      {
        tag: 'الاتصال الذكي والتحكم',
        title: 'بلوتوث 5.3 فائق الاستقرار مع نافذة اقتران Pop-up وتحكم لمسي ذكي',
        subtitle: 'Bluetooth 5.3 Low Latency with Pop-up Auto-Connect & Touch Gestures',
        description: 'بمجرد فتح الغطاء تظهر نافذة الاتصال الفوري على شاشة الهاتف مع عرض دقيق لنسبة الشحن. انقر على ساق السماعة للتبديل بين الأغاني والرد على المكالمات وتفعيل المساعد الصوتي.',
        image_url: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=1200&q=80'
      }
    ],
    frequently_bought_together: [
      'prod-green-lion-magsafe-case',
      'prod-anker-prime-67w',
      'prod-privacy-9d-glass'
    ],
    rating_breakdown: {
      five_star: 82,
      four_star: 13,
      three_star: 3,
      two_star: 1,
      one_star: 1
    },
    customer_reviews: [
      {
        id: 'rev-jr-1',
        author: 'كريم الشناوي',
        location: 'القاهرة (مصر الجديدة)',
        rating: 5,
        date: '28 مارس 2026',
        title: 'أفضل سماعة في الفئة السعرية دي.. البيس جبار والشحن اللاسلكي شغال تمام',
        comment: 'اشتريت سماعة جويروم JR-T03S Plus من متجر جو ستور ووصلتني تاني يوم الصبح. الصوت نقي جداً ومجربها في الجيم ثابتة في الودن ومقاومة العرق ممتازة. عزل المكالمات ENC في الزحمة بجد فرق معايا جداً، والكفر السيليكون الهدية خامته نضيفة ومحترمة.',
        verified_purchase: true,
        helpful_count: 42
      },
      {
        id: 'rev-jr-2',
        author: 'د. سارة المنشاوي',
        location: 'الإسكندرية (سموحة)',
        rating: 5,
        date: '14 مارس 2026',
        title: 'البطارية بتقعد معايا أكتر من أسبوع بدون شحن!',
        comment: 'البطارية ممتازة جداً وفعلاً بتقعد أيام، وبشحنها على الشاحن اللاسلكي بتاع الآيفون بتشحن بسرعة. خدمة عملاء جو ستور وسرعة شحن الطلب على الواتساب 10/10.',
        verified_purchase: true,
        helpful_count: 29
      },
      {
        id: 'rev-jr-3',
        author: 'م. أحمد حسام',
        location: 'المنصورة (حي الجامعة)',
        rating: 5,
        date: '3 مارس 2026',
        title: 'منتج أصلي 100% والـ Pop-up شغال فوراً على الآيفون',
        comment: 'الاقتران بيظهر فوراً أول ما بفتح الغطاء زي الآبل إيربودز بالضبط، ونسبة البطارية بتظهر على الشاشة. تجربة ممتازة وتستاهل كل مليم.',
        verified_purchase: true,
        helpful_count: 35
      },
      {
        id: 'rev-jr-4',
        author: 'عمر الفيشاوي',
        location: 'الجيزة (المهندسين)',
        rating: 4,
        date: '20 فبراير 2026',
        title: 'سماعة رائعة جداً، خامة العلبة ناعمة وجودة الصوت هايلة',
        comment: 'الصوت متوازن ونقي جداً في الميوزيك والبودكاست. المايك ممتاز في الأماكن المقفولة ومعقول جداً في الشارع. أنصح بيها جداً.',
        verified_purchase: true,
        helpful_count: 18
      }
    ],
    warranty_months: 12,
    rating: 4.9,
    reviews_count: 458,
    is_featured: true,
    is_best_seller: true,
    is_flash_sale: true,
    created_at: '2026-03-20'
  },

  // 2. JOYROOM JR-T03S PRO (ANC Active Noise Cancelling)
  {
    id: 'prod-joyroom-jr-t03s-pro',
    sku: 'JR-T03S-PRO-ANC',
    model_name: 'JR-T03S Pro ANC',
    name_ar: 'سماعة جويروم JR-T03S Pro بخاصية عزل الضوضاء النشط ANC وشحن لاسلكي ماج سيف مع أطراف سيليكون مريحة',
    name_en: 'JOYROOM JR-T03S Pro Active Noise Cancellation (ANC) True Wireless Earbuds with MagSafe Wireless Charging',
    brand: 'Joyroom',
    category: 'audio',
    condition: 'brand_new',
    battery_health: 100,
    color_ar: 'أبيض ناصع',
    color_en: 'Glossy White',
    color_hex: '#FFFFFF',
    price: 1450,
    original_price: 1850,
    discount_percentage: 22,
    stock: 12,
    in_stock: true,
    bought_past_month: 920,
    images: [
      'https://eloroby.com/public/uploads/all/wtYIQJpZq4CXddRHuDwhRGES7ffta7eudsTOcbZX.png',
      'https://2b.com.eg/media/catalog/product/cache/d33f1c152d6eb7e8608a208d80f21a14/h/p/hp37t-min.jpg',
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80'
    ],
    description_ar: 'إصدار البرو من جويروم المزود بعزل الضوضاء النشط ANC لعزل الأصوات المحيطة تماماً مع نمط الشفافية Transparency Mode لسماع الأصوات المحيطة بوضوح عند الحاجة.',
    description_en: 'Professional Joyroom Pro earbuds featuring Active Noise Cancellation (ANC), Transparency mode, and comfortable multi-size silicone tips.',
    specs: {
      'الماركة': 'Joyroom الأصلية',
      'الموديل': 'JR-T03S Pro ANC',
      'عزل الضوضاء': 'Active Noise Cancellation ANC حتى 25 ديسيبل',
      'الشحن اللاسلكي': 'شحن لاسلكي مغناطيسي MagSafe + سلكي',
      'البطارية': '5 ساعات استماع متواصلة / 32 ساعة مع العلبة',
      'الضمان': 'ضمان 12 شهراً رسمي من جو ستور'
    },
    about_item: [
      '[عزل الضوضاء النشط ANC]: يخمد الضوضاء الخارجية لتستمتع بتركيز تام أثناء الاستماع للدراسة أو العمل.',
      '[نمط الشفافية الحقيقي]: استمع لمحيطك دون الحاجة لنزع السماعة من أذنك.',
      '[أطراف سيليكون مريحة بمقاسات متعددة]: تتضمن 3 أزواج من المقاسات (S, M, L) لتناسب شكل أذنك بدقة.',
      '[شحن لاسلكي MagSafe]: تدعم التثبيت والشحن المغناطيسي السريع.',
      '[ضمان جو ستور المعتمد]: استبدال فوري وصيانة رسمية.'
    ],
    warranty_months: 12,
    rating: 4.8,
    reviews_count: 284,
    is_featured: true,
    is_best_seller: true,
    created_at: '2026-03-18'
  },

  // 3. ORAIMO SPACEBUDS LITE (From Excel: ORAIMO SPACE BUDS LITE - Code 1635)
  {
    id: 'prod-oraimo-spacebuds-lite',
    sku: 'OR-SP-BUDS-LITE',
    model_name: 'SpaceBuds Lite',
    name_ar: 'سماعة أورايمو سبيس بودز لايت (Oraimo SpaceBuds Lite) - صوت جهير HavyBass وبطارية 40 ساعة ومقاومة IPX4',
    name_en: 'Oraimo SpaceBuds Lite True Wireless Earbuds with HavyBass Sound, 40H Battery Life & IPX4 Water Resistance',
    brand: 'Oraimo',
    category: 'audio',
    condition: 'brand_new',
    battery_health: 100,
    color_ar: 'أسود سبيس أنيق',
    color_en: 'Space Black',
    color_hex: '#18181B',
    price: 800,
    original_price: 1100,
    discount_percentage: 27,
    cost_price: 500,
    stock: 10,
    in_stock: true,
    bought_past_month: 620,
    images: [
      'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80'
    ],
    description_ar: 'سماعة أورايمو سبيس بودز لايت الأصلية تتميز بتقنية HavyBass الفريدة لتعزيز الصوت الجهير مع 40 ساعة تشغيل إجمالية، ومقاومة العرق ورذاذ الماء للاستخدام الرياضي اليومي.',
    description_en: 'Oraimo SpaceBuds Lite delivers signature HavyBass acoustic performance, ultra-low latency gaming mode, 40-hour long playback, and IPX4 splash resistance.',
    specs: {
      'الماركة': 'Oraimo الأصلية',
      'الموديل': 'SpaceBuds Lite (OTW-330)',
      'البطارية': '7 ساعات لكل سماعة / 40 ساعة إجمالية',
      'التقنية الصوتية': 'HavyBass Sound Algorithm',
      'البلوتوث': 'Bluetooth 5.3',
      'مقاومة الماء': 'IPX4 مقاومة للرذاذ والعرق',
      'الضمان': 'ضمان جو ستور 12 شهراً'
    },
    about_item: [
      '[صوت جهير قوي HavyBass]: خوارزمية ذكية تضبط ترددات البيس لتجربة استماع نابضة بالحياة.',
      '[عمر بطارية ممتد 40 ساعة]: شحن سريع يمنحك 120 دقيقة استماع بشحن لمدة 10 دقائق فقط.',
      '[وضع ألعاب بتأخير منخفض]: مزامنة مثالية للصوت والصورة في ألعاب PUBG و Free Fire.',
      '[ميكروفونين ENC لمكالمات واضحة]: تصفية الضوضاء لنقاء صوتي في المكالمات اليومية.'
    ],
    warranty_months: 12,
    rating: 4.7,
    reviews_count: 142,
    is_featured: true,
    created_at: '2026-03-15'
  },

  // 4. ANKER LIBERTY 5 / SOUNDCORE PRO (From Excel: ANKER LIBERTY 5 - Code 2128)
  {
    id: 'prod-anker-liberty-5',
    sku: 'ANK-LIBERTY-5-PRO',
    model_name: 'Soundcore Liberty 5 Pro',
    name_ar: 'سماعة أنكر ساوندكور ليبرتي 5 برو (Anker Liberty 5 Pro) - صوت عالي الدقة Hi-Res وعزل ضوضاء تكيفي وشاشة ذكية',
    name_en: 'Anker Soundcore Liberty 5 Pro Hi-Res Spatial Audio Earbuds with Adaptive ANC 3.0 & Smart Touch Display Case',
    brand: 'Anker',
    category: 'audio',
    condition: 'brand_new',
    battery_health: 100,
    color_ar: 'كحلي ليلي فاخر (Deep Navy)',
    color_en: 'Deep Navy Blue',
    color_hex: '#1E293B',
    price: 5000,
    original_price: 6200,
    discount_percentage: 19,
    cost_price: 3850,
    stock: 5,
    in_stock: true,
    bought_past_month: 410,
    images: [
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'
    ],
    description_ar: 'القمة في هندسة الصوت من أنكر مع محركات ACAA 3.0 المزدوجة وصوت مكاني ثلاثي الأبعاد وعزل ضوضاء متكيف يقرأ البيئة المحيطة 1000 مرة في الثانية.',
    description_en: 'Anker flagship true wireless audio featuring dual coaxial drivers, lossless LDAC Hi-Res certification, and Smart Touch Display on the charging case.',
    specs: {
      'الماركة': 'Anker Soundcore',
      'الموديل': 'Liberty 5 Pro Hi-Res',
      'المحركات': 'ACAA 3.0 Coaxial Dual Dynamic Drivers',
      'الترميز': 'LDAC, AAC, SBC معتمد Hi-Res Wireless',
      'عزل الضوضاء': 'Adaptive Active Noise Cancelling 3.0',
      'البطارية': '9 ساعات لكل سماعة / 45 ساعة مع العلبة',
      'الضمان': 'ضمان 18 شهراً دولي ومحلي من جو ستور'
    },
    about_item: [
      '[محركات صوتية مزدوجة ACAA 3.0]: تجسيد مذهل لطبقات الصوت وتفاصيل الآلات الموسيقية.',
      '[عزل ضوضاء تكيفي ذكي]: يضبط مستوى العزل تلقائياً وفقاً لشدة الضجيج في المكان.',
      '[شاشة لمس ذكية على علبة الشحن]: تحكم بمستوى الصوت والعزل دون لمس الهاتف.',
      '[صوت مكاني Spatial Audio بزاوية 360 درجة]: تجربة سينمائية غامرة مع تتبع حركات الرأس.'
    ],
    warranty_months: 18,
    rating: 5.0,
    reviews_count: 188,
    is_featured: true,
    created_at: '2026-03-22'
  },

  // 5. ANKER P40i SMART ANC (From Excel: ANKER P40 I - Code 999)
  {
    id: 'prod-anker-p40i',
    sku: 'ANK-P40I-BLK',
    model_name: 'Soundcore P40i',
    name_ar: 'سماعة أنكر ساوندكور P40i الذكية (Anker Soundcore P40i) - علبة شحن مع ستاند هاتف مدمج وبطارية 60 ساعة وعزل ANC',
    name_en: 'Anker Soundcore P40i Smart Noise Cancelling Earbuds with 2-in-1 Phone Stand Case & 60H Playtime',
    brand: 'Anker',
    category: 'audio',
    condition: 'brand_new',
    battery_health: 100,
    color_ar: 'أسود مطفي',
    color_en: 'Matte Black',
    color_hex: '#111827',
    price: 3500,
    original_price: 4200,
    discount_percentage: 17,
    cost_price: 2000,
    stock: 8,
    in_stock: true,
    bought_past_month: 780,
    images: [
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80'
    ],
    description_ar: 'تصميم مبتكر يدمج حاملاً للهاتف في علبة الشحن لمشاهدة الفيديوهات أثناء السفر، مع بطارية تدوم 60 ساعة وعزل ضوضاء متكيف BassUp عملاق.',
    description_en: 'Smart earbuds with revolutionary phone stand built into the case, adaptive noise cancelling, 60 hours total battery, and BassUp technology.',
    specs: {
      'الماركة': 'Anker Soundcore',
      'الموديل': 'Soundcore P40i',
      'البطارية': '12 ساعة لكل سماعة / 60 ساعة إجمالية',
      'الميزة الخاصة': 'علبة شحن تتحول لقاعدة تثبيت للهاتف Phone Stand',
      'عزل الضوضاء': 'Smart Adaptive Noise Cancelling',
      'الضمان': 'ضمان 18 شهراً من جو ستور'
    },
    about_item: [
      '[علبة شحن تتحول لقاعدة تثبيت للهاتف]: استمتع بمشاهدة الأفلام بدون استخدام اليدين.',
      '[عمر بطارية خارق 60 ساعة]: حتى 12 ساعة بشحنة واحدة و 60 ساعة مع علبة الشحن.',
      '[عزل ضوضاء ذكي متعدد الأوضاع]: عزل فعال لضوضاء الطائرات والمواصلات والمكاتب.',
      '[مقاومة الماء بتصنيف IPX5]: مقاومة تامة للأمطار والعرق.'
    ],
    warranty_months: 18,
    rating: 4.9,
    reviews_count: 215,
    is_featured: true,
    is_best_seller: true,
    created_at: '2026-03-21'
  },

  // 6. JOYROOM CABLE FAST 30W / 60W (From Excel: CABLE JOYROOM NEW - Code 1228)
  {
    id: 'prod-joyroom-cable-fast',
    sku: 'JR-CABLE-60W-PD',
    model_name: 'Joyroom Ultra Durable PD Cable',
    name_ar: 'كابل جويروم الأصلي فائق السرعة تايب سي PD بقدرة 60 واط مع قماش مضفر مقاوم للقطع والتلف - متجر جو ستور',
    name_en: 'JOYROOM 60W USB-C to USB-C Fast Charging Braided Nylon Cable with Reinforced Connectors',
    brand: 'Joyroom',
    category: 'chargers_cables',
    condition: 'brand_new',
    color_ar: 'رمادي فضي مضفر',
    color_en: 'Braided Space Gray',
    color_hex: '#475569',
    price: 180,
    original_price: 250,
    discount_percentage: 28,
    cost_price: 47,
    stock: 35,
    in_stock: true,
    bought_past_month: 2100,
    images: [
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1622445262464-84b1ebae0705?auto=format&fit=crop&w=800&q=80'
    ],
    description_ar: 'كابل شحن ونقل بيانات فائق المتانة من جويروم مصنوع من النايلون المضفر عالي الكثافة لتحمل أكثر من 30,000 انحناء دون انقطاع، مع دعم شحن سريع 60W لأجهزة الآيفون والماك بوك وسامسونج.',
    description_en: 'Heavy-duty 60W braided USB-C fast charging cable from Joyroom engineered with reinforced strain relief and high-purity copper core.',
    specs: {
      'الماركة': 'Joyroom الأصلية',
      'القدرة': '60W Power Delivery Fast Charge',
      'الطول': '1.2 متر مناسب للاستخدام المكتبي والسيارة',
      'الخامة': 'نايلون مضفر عسكري مانع للتشابك',
      'سرعة نقل البيانات': '480 ميجابت / ثانية',
      'الضمان': 'ضمان استبدال فوري 6 أشهر من جو ستور'
    },
    about_item: [
      '[شحن فائق السرعة 60 واط]: يشحن الآيفون وسامسونج والآيباد حتى 60% في 30 دقيقة.',
      '[نسيج نايلون مضفر مانع للقطع]: يتحمل اختبار الانحناء أكثر من 30,000 مرة.',
      '[رؤوس ألمنيوم معززة]: موصلات مطلية تمنع الأكسدة والحرارة الزائدة.',
      '[نقل بيانات فوري]: نقل ملفات الفيديو والصور بسرعة عالية وبدون انقطاع.'
    ],
    warranty_months: 6,
    rating: 4.8,
    reviews_count: 530,
    is_best_seller: true,
    created_at: '2026-03-10'
  },

  // 7. JOYROOM HD PRIVACY SCREEN (From Excel: JOYROOM SCREAN HD - Code 750 / Code 1509)
  {
    id: 'prod-joyroom-screen-hd',
    sku: 'JR-SCR-HD-9D',
    model_name: 'Joyroom 9D HD Crystal Shield',
    name_ar: 'اسكرينة جويروم الأصلية 9D فائقة النقاء HD المقاومة للكسر والخدوش مع إطار تركيب ذاتي سريع بدون فقاعات',
    name_en: 'JOYROOM 9D HD Full Coverage Tempered Glass Screen Protector with Auto-Alignment Easy Install Kit',
    brand: 'Joyroom',
    category: 'cases_protection',
    condition: 'brand_new',
    color_ar: 'شفاف كريستالي عالي النقاء',
    color_en: 'Crystal Clear HD',
    color_hex: '#F8FAFC',
    price: 300,
    original_price: 450,
    discount_percentage: 33,
    cost_price: 74,
    stock: 45,
    in_stock: true,
    bought_past_month: 1850,
    images: [
      'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=800&q=80'
    ],
    description_ar: 'زجاج مقوى عالي الصلابة بدرجة 9H من جويروم يوفر حماية فائقة لشاشة هاتفك ضد الصدمات والسقوط، مع طبقة Oleophobic لمقاومة البصمات وإطار تركيب سهل وسريع.',
    description_en: 'Original Joyroom 9D shatterproof tempered glass engineered with ultra-tough Japanese glass and bubble-free auto-alignment applicator tray.',
    specs: {
      'الماركة': 'Joyroom الأصلية',
      'درجة الصلابة': '9H Diamond Grade Hardness',
      'الحواف': 'حواف منحنية ناعمة 2.5D مريحة للمس',
      'الطلاء': 'مقاوم للبصمات والزيوت وسهل المسح',
      'المحتويات': 'إطار تركيب ذاتي، أدوات تنظيف احترافية، مناديل كحولية',
      'الضمان': 'ضمان استبدال ضد عيوب التصنيع'
    },
    about_item: [
      '[صلابة فائقة 9H مضادة للكسر]: تحمي الشاشة من الصدمات المباشرة والمفاتيح والأدوات الحادة.',
      '[إطار تركيب سهل بدون فقاعات]: يمكنك تركيبها بنفسك في 10 ثوانٍ وبدقة مليمترية.',
      '[نقاء بصري 99.9% HD]: وضوح ألوان أصلي وحساسية لمس فائقة السرعة.',
      '[متوافقة مع كافة الجرابات]: تترك مسافة دقيقة للحواف لمنع رفع الجراب للاسكرينة.'
    ],
    warranty_months: 1,
    rating: 4.9,
    reviews_count: 388,
    is_best_seller: true,
    created_at: '2026-03-12'
  },

  // 8. APPLE IPHONE 15 PRO MAX 256GB TITANIUM (Existing flagship)
  {
    id: 'prod-iphone-15-pro-max',
    asin: 'B0CHX1W1XY',
    sku: 'IPH-15PM-256-NEW',
    model_name: 'iPhone 15 Pro Max',
    name_ar: 'آبل آيفون 15 برو ماكس (Apple iPhone 15 Pro Max) - مساحة 256 جيجا تيتانيوم طبيعي جديد متبرشم بضمان دولي ومحلي',
    name_en: 'Apple iPhone 15 Pro Max 256GB - Natural Titanium Brand New Sealed with Official Warranty',
    brand: 'Apple',
    category: 'smartphones',
    condition: 'brand_new',
    battery_health: 100,
    storage: '256GB',
    color_ar: 'تيتانيوم طبيعي',
    color_en: 'Natural Titanium',
    color_hex: '#8A8682',
    available_colors: [
      { name_ar: 'تيتانيوم طبيعي', name_en: 'Natural Titanium', hex: '#8A8682' },
      { name_ar: 'تيتانيوم أسود', name_en: 'Black Titanium', hex: '#2A292E' },
      { name_ar: 'تيتانيوم أزرق', name_en: 'Blue Titanium', hex: '#3B4459' }
    ],
    available_storages: ['256GB', '512GB', '1TB'],
    price: 56500,
    original_price: 61000,
    discount_percentage: 7,
    stock: 4,
    in_stock: true,
    bought_past_month: 120,
    images: [
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1695048132903-518296dbf9fc?auto=format&fit=crop&w=800&q=80'
    ],
    description_ar: 'هيكل من التيتانيوم الخفيف وفائق المتانة بدرجة الطيران والفضاء. معالج A17 Pro الثوري، زر الإجراءات السريع Action Button، وكاميرا تقريب بصري 5x الأقوى على الإطلاق مع منفذ USB-C فائق السرعة.',
    description_en: 'Forged in titanium with aerospace-grade durability. Powered by the ground-breaking A17 Pro chip, Action Button, 5x telephoto camera, and ultra-fast USB-C connectivity.',
    specs: {
      'المعالج': 'Apple A17 Pro (3nm)',
      'الشاشة': '6.7-inch Super Retina XDR with ProMotion 120Hz',
      'الكاميرا': '48MP Main + 12MP Ultra-Wide + 12MP 5x Telephoto',
      'المنفذ': 'USB-C supporting USB 3 speeds',
      'الضمان': 'ضمان محلي ودولي سنة كاملة'
    },
    about_item: [
      '[هيكل من التيتانيوم بدرجة الطيران]: أخف وزن وأعلى صلابة في تاريخ هواتف برو.',
      '[شريحة A17 Pro وحش الأداء]: معالج رسومي احترافي لتشغيل ألعاب المنصات المنزلية.',
      '[كاميرا 48 ميجابكسل مع تقريب بصري 5x]: تصوير سينمائي فائق بأطول مدى تكبير في الآيفون.',
      '[زر الإجراءات الجديد Action Button]: وصول فوري لتطبيقك المفضل بضغطة زر واحدة.',
      '[منفذ USB-C فائق السرعة]: نقل البيانات بسرعة تصل إلى 10 جيجابت في الثانية.'
    ],
    warranty_months: 12,
    rating: 5.0,
    reviews_count: 89,
    is_featured: true,
    is_best_seller: true,
    created_at: '2026-03-20'
  },

  // 9. APPLE IPHONE 13 128GB MINT (Existing mint device)
  {
    id: 'prod-iphone-13-mint',
    asin: 'B09G9FPHP6',
    sku: 'IPH-13-128-MINT',
    model_name: 'iPhone 13 128GB Mint',
    name_ar: 'آبل آيفون 13 (iPhone 13) - مساحة 128 جيجا كسر زيرو بالضمان وفحص شامل معتمد',
    name_en: 'Apple iPhone 13 128GB - Certified Mint Condition with Warranty',
    brand: 'Apple',
    category: 'smartphones',
    condition: 'mint',
    battery_health: 94,
    storage: '128GB',
    color_ar: 'أزرق سماوي',
    color_en: 'Sierra Blue',
    color_hex: '#6BA4B8',
    available_colors: [
      { name_ar: 'أبيض لؤلؤي (Starlight)', name_en: 'Starlight White', hex: '#F9F6EE' },
      { name_ar: 'أزرق (Blue)', name_en: 'Blue', hex: '#215E7C' },
      { name_ar: 'زيتي عسكري (Green)', name_en: 'Midnight Green', hex: '#3B4D3C' },
      { name_ar: 'بينك ناعم (Pink)', name_en: 'Pink', hex: '#FAD2E1' },
      { name_ar: 'أسود ليلي (Midnight)', name_en: 'Midnight Black', hex: '#1E232B' }
    ],
    available_storages: ['128GB', '256GB'],
    price: 19800,
    original_price: 23500,
    discount_percentage: 16,
    stock: 8,
    in_stock: true,
    bought_past_month: 310,
    images: [
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?auto=format&fit=crop&w=800&q=80'
    ],
    description_ar: 'آيفون 13 كسر زيرو خالي تماماً من الخدوش أو الصدمات، مفحوص بنسبة 100% بكافة وظائفه (FaceID, TrueTone, الكاميرات، الشحن اللاسلكي). نسبة بطارية أصلية تتراوح بين 85% و 97% مع ضمان استبدال رسمي من جو ستور.',
    description_en: 'Apple iPhone 13 128GB certified pre-owned in mint cosmetic and functional grade. 100% tested with original battery health between 85% and 97%. Includes Joe Store warranty and full inspection guarantee.',
    specs: {
      'المعالج (Chip)': 'Apple A15 Bionic (5nm)',
      'الشاشة (Display)': '6.1-inch Super Retina XDR OLED',
      'الكاميرا الخلفية': 'Dual 12MP (Wide + Ultra-Wide) with Cinematic Mode',
      'صحة البطارية': 'بطارية أصلية 94% (تدوم طوال اليوم)',
      'الضمان': 'ضمان استبدال وصيانة 6 أشهر معتمد من جو ستور'
    },
    about_item: [
      '[فحص شامل 100% بدون أي عيوب]: تم اختبار الهاتف عبر أكثر من 45 نقطة فحص معملية معتمدة.',
      '[بطارية أصلية 94%]: تحتفظ بكامل كفاءتها وتدوم طوال اليوم دون هبوط مفاجئ.',
      '[كاميرات سينمائية Cinematic Mode]: تصوير سينمائي بدقة هوليوود مع انتقال التركيز التلقائي.',
      '[معالج A15 Bionic الخارق]: سرعة استجابة فائقة في كافة البرامج والتطبيقات الثقيلة.',
      '[معاينة حرة مع المندوب]: يحق لك فحص الهاتف وتشغيله قبل سداد أي مبلغ للمندوب.'
    ],
    warranty_months: 6,
    rating: 4.9,
    reviews_count: 142,
    is_featured: true,
    is_best_seller: true,
    is_flash_sale: true,
    created_at: '2026-03-15'
  },

  // 10. ANKER PRIME 67W GAN FAST CHARGER (Existing fast charger)
  {
    id: 'prod-anker-prime-67w',
    sku: 'ANK-PRIME-67W',
    model_name: 'Anker Prime 67W GaN',
    name_ar: 'رأس شاحن أنكر برايم 67 واط (Anker Prime 67W) - 3 منافذ شحن فائق السرعة GaN لجميع الهواتف واللابتوبات',
    name_en: 'Anker Prime 67W GaN Wall Charger - 3 Ports Ultra-Fast Power Delivery',
    brand: 'Anker',
    category: 'chargers_cables',
    condition: 'brand_new',
    color_ar: 'أسود مع لمسة رمادي',
    color_en: 'Black / Silver',
    color_hex: '#232526',
    price: 1850,
    original_price: 2200,
    discount_percentage: 15,
    stock: 20,
    in_stock: true,
    bought_past_month: 850,
    images: [
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80'
    ],
    description_ar: 'شاحن GaN فائق الصغر والقوة من أنكر يشحن الآيفون والماك بوك والأجهزة الأخرى في نفس الوقت بقدرة 67 واط ونظام حماية حرارية متطور ActiveShield 2.0.',
    description_en: 'Compact 3-port GaN wall charger from Anker delivering 67W power delivery for MacBooks, iPhones, iPads and accessories simultaneously.',
    specs: {
      'القدرة القصوى': '67W Max Output',
      'المنافذ': '2x USB-C + 1x USB-A',
      'التقنية': 'GaNPrime & ActiveShield 2.0 Safety',
      'الضمان': 'ضمان 18 شهراً من جو ستور'
    },
    about_item: [
      '[شحن 3 أجهزة معاً بقوة 67W]: شاحن واحد يكفيك للابتوب والهاتف والسماعة.',
      '[تقنية GaNPrime فائقة الصغر]: حجم أصغر بنسبة 51% من شواحن آبل الأصلية.',
      '[حماية حرارية ActiveShield 2.0]: يراقب درجة الحرارة 3 ملايين مرة يومياً لمنع السخونة.',
      '[شحن الآيفون حتى 50% في 25 دقيقة]: أقصى سرعة شحن معتمدة دولياً.'
    ],
    warranty_months: 18,
    rating: 5.0,
    reviews_count: 310,
    is_featured: true,
    created_at: '2026-03-16'
  },

  // 11. ANKER 20W PLUG (From Excel: ANKER PLUG20W - Code 723)
  {
    id: 'prod-anker-plug-20w',
    sku: 'ANK-PLUG-20W-CUBE',
    model_name: 'Anker PowerPort III 20W Cube',
    name_ar: 'رأس شاحن أنكر 20 واط فائق الصغر تايب سي (Anker 20W USB-C Charger) - شحن سريع معتمد للآيفون وسامسونج',
    name_en: 'Anker PowerPort III 20W Cube Ultra-Compact USB-C Fast Charger',
    brand: 'Anker',
    category: 'chargers_cables',
    condition: 'brand_new',
    color_ar: 'أبيض ناصع',
    color_en: 'White',
    color_hex: '#FFFFFF',
    price: 800,
    original_price: 950,
    discount_percentage: 16,
    cost_price: 375,
    stock: 25,
    in_stock: true,
    bought_past_month: 1600,
    images: [
      'https://images.unsplash.com/photo-1622445262464-84b1ebae0705?auto=format&fit=crop&w=800&q=80'
    ],
    description_ar: 'شاحن أنكر مكعب 20 واط هو البديل الأمثل والأكثر أماناً لشواحن آبل التقليدية، يوفر سرعة شحن 3 أضعاف مع نظام الحماية الشامل MultiProtect.',
    description_en: 'Anker 20W Cube delivers full-speed charging for iPhone 12 through 16 series with MultiProtect temperature control and pocket-sized design.',
    specs: {
      'القدرة': '20W USB-C PD',
      'التوافق': 'iPhone 8 - iPhone 16 Pro Max, iPad, AirPods',
      'الأمان': 'MultiProtect 11-point safety system',
      'الضمان': 'ضمان 18 شهراً من جو ستور'
    },
    about_item: [
      '[أسرع 3 مرات من الشواحن العادية]: يشحن بطارية الآيفون إلى 50% في 25 دقيقة فقط.',
      '[تصميم مكعب فائق الصغر]: يمكن وضعه بسهولة في جيبك أو حقيبتك الصغيرة.',
      '[نظام MultiProtect للأمان]: حماية من الجهد العالي والتيار الزائد وارتفاع الحرارة.',
      '[ضمان جو ستور 18 شهراً]: ضمان استبدال فوري بدون أي تعقيدات.'
    ],
    warranty_months: 18,
    rating: 4.9,
    reviews_count: 520,
    is_best_seller: true,
    created_at: '2026-03-01'
  },

  // 12. PITAKA ARAMID FIBER CASE (From Excel: COVER PITAKA - Code 2007)
  {
    id: 'prod-cover-pitaka',
    sku: 'PITAKA-MAGEZ-CASE',
    model_name: 'Pitaka MagEZ Aramid Shield',
    name_ar: 'جراب بيتاكا الأصلي بألياف الأراميد كربون فايبر فائق النحافة والمتانة متوافق مع ماج سيف (Cover Pitaka)',
    name_en: 'Pitaka MagEZ Ultra-Slim 600D Aerospace Aramid Fiber Case with MagSafe',
    brand: 'Pitaka',
    category: 'cases_protection',
    condition: 'brand_new',
    color_ar: 'كربون فايبر أسود مع لمسة رمادي',
    color_en: 'Black / Grey Twill Aramid',
    color_hex: '#27272A',
    price: 950,
    original_price: 1300,
    discount_percentage: 27,
    cost_price: 40,
    stock: 171,
    in_stock: true,
    bought_past_month: 850,
    images: [
      'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=800&q=80'
    ],
    description_ar: 'الجراب الفاخر المصنوع من ألياف أراميد الفضاء 600D النادرة الأقوى من الفولاذ 5 مرات والأنحف في العالم مع مغناطيس ماج سيف قوي N52 مدمج في النسيج.',
    description_en: 'Crafted from rare 600D aerospace-grade aramid fiber that is 5x stronger than steel yet feather-light and ultra-thin with built-in MagSafe.',
    specs: {
      'الماركة': 'Pitaka الفاخرة',
      'الخامة': 'ألياف أراميد الفضاء 600D الأصلية',
      'السُمك': '0.95 مم فقط (أنحف جراب في العالم)',
      'الوزن': '18 جرام فقط خفيف للغاية',
      'المغناطيس': 'حلقة ماج سيف مغناطيسية N52 مدمجة غير مرئية',
      'الضمان': 'ضمان جو ستور 6 أشهر'
    },
    about_item: [
      '[ألياف أراميد الفضاء 600D]: خامة نادرة تمنح ملمساً ناعماً فائق الفخامة ومقاومة تامة للخدوش والحرارة.',
      '[نحافة فائقة ووزن ريشة]: سمك أقل من 1 مم يشعرك وكأنك تمسك الهاتف بدون أي جراب.',
      '[توافق تام مع MagSafe]: قوة التصاق مغناطيسية استثنائية مع كافة الشواحن والستاندات.',
      '[مقاوم للبصمات وتغير الألوان]: لا يبهت ولا يتغير لونه بمرور الوقت بفضل خامة الأراميد النقية.'
    ],
    warranty_months: 6,
    rating: 4.9,
    reviews_count: 198,
    is_best_seller: true,
    created_at: '2026-03-12'
  }
];
`;

fs.writeFileSync('src/data/seedProducts.ts', seedProductsContent, 'utf8');
console.log('Successfully updated src/data/seedProducts.ts with rich catalog!');
