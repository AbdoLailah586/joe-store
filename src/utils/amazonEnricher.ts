import { Product, ProductFeatureBanner, CustomerReviewItem, RatingBreakdown } from '../types';

/**
 * Intelligent Amazon Product Enricher for JOE Store
 * Translates raw store/Excel products into comprehensive, Amazon-grade product experiences.
 */

export interface EnrichedProductData {
  detailed_title_ar: string;
  detailed_title_en: string;
  brand_store_name: string;
  asin: string;
  bought_past_month: number;
  about_item: string[];
  quick_specs: { [key: string]: string };
  feature_banners: ProductFeatureBanner[];
  rating_breakdown: RatingBreakdown;
  customer_reviews: CustomerReviewItem[];
  bundle_accessories: Product[];
  comparison_items: Product[];
}

export function enrichProductData(product: Product, allProducts: Product[]): EnrichedProductData {
  const brand = (product.brand || 'JOE Store').trim();
  const category = product.category || 'accessories';
  const nameAr = product.name_ar || '';
  const nameEn = product.name_en || nameAr;

  // 1. ASIN & Social Proof
  const asin = product.asin || (product.sku ? `B0${product.sku.replace(/[^A-Z0-9]/gi, '').slice(0, 8)}` : `B0CH8G${Math.floor(1000 + Math.random() * 9000)}`);
  const bought_past_month = product.bought_past_month || (product.is_best_seller ? 1200 : product.rating >= 4.8 ? 850 : 350);

  // 2. Brand Store name
  const brandStoreName = brand.toLowerCase() === 'apple' ? 'Apple Store' 
    : brand.toLowerCase() === 'joyroom' ? 'متجر جويروم الرسمي (JOYROOM Store)'
    : brand.toLowerCase() === 'oraimo' ? 'متجر أورايمو الرسمي (Oraimo Official)'
    : brand.toLowerCase() === 'anker' ? 'متجر أنكر الرسمي (Anker Official Store)'
    : brand.toLowerCase() === 'samsung' ? 'Samsung Experience Store'
    : `متجر ${brand} الرسمي`;

  // 3. Detailed Titles (Amazon Style)
  let detailed_title_ar = product.name_ar;
  let detailed_title_en = product.name_en;

  if (!detailed_title_ar.includes('الأصلي') && !detailed_title_ar.includes('ضمان')) {
    if (category === 'audio') {
      detailed_title_ar = `${brand} - ${nameAr} سماعة أذن لاسلكية TWS تدعم الشحن اللاسلكي وعزل ضوضاء المكالمات ENC مع ميكروفون مدمج وبطارية تدوم طويلاً - ضمان جو ستور`;
      detailed_title_en = `${brand} ${nameEn} TWS True Wireless Bluetooth Earbuds with Wireless Charging, ENC Clear Calls & Deep Bass - JOE Store Warranty`;
    } else if (category === 'chargers_cables') {
      detailed_title_ar = `${brand} - ${nameAr} شاحن سريع فائق الأمان بتقنية الشحن الذكي متوافق مع كافة الهواتف الذكية مع حماية من ارتفاع الحرارة والجهد`;
      detailed_title_en = `${brand} ${nameEn} Ultra-Fast Smart Safety Wall Charger / Cable with Multi-Device Protection`;
    } else if (category === 'cases_protection') {
      detailed_title_ar = `${brand} - ${nameAr} حماية متكاملة مضادة للصدمات والخدوش عالية الصلابة وخامات ممتازة مع وضوح فائق وسهولة التركيب`;
      detailed_title_en = `${brand} ${nameEn} Heavy Duty Shockproof Full Protective Shield with Scratch Resistance`;
    } else if (category === 'smartphones') {
      detailed_title_ar = `${brand} ${nameAr} ${product.storage ? `بمساحة ${product.storage}` : ''} بحالة ممتازة ومفحوص بالكامل مع ضمان استبدال رسمي من جو ستور`;
      detailed_title_en = `${brand} ${nameEn} Fully Certified Pre-Owned / Brand New with JOE Store Replacement Warranty`;
    }
  }

  // 4. Quick Specs Table
  const quick_specs: { [key: string]: string } = {
    'الماركة (Brand)': brand,
    'اسم الطراز (Model Name)': product.model_name || nameAr.split('-')[0].trim(),
    'اللون (Color)': product.color_ar || 'أبيض / متعدد الألوان',
    'الحالة (Condition)': product.condition === 'brand_new' ? 'جديد أصلي متبرشم' : product.condition === 'mint' ? 'كسر زيرو فائق النقاء' : 'استعمال خفيف ممتاز',
    'الضمان المعتمد': `${product.warranty_months} شهور استبدال وصيانة رسمية من جو ستور`,
    'بلد المنشأ': brand.toLowerCase() === 'apple' ? 'كاليفورنيا، الولايات المتحدة (تجميع الصين)' : 'الصين (النسخة الأصلية المعتمدة)',
  };

  if (category === 'audio') {
    quick_specs['عامل شكل سماعة الرأس'] = 'في الأذن (In-Ear) مريحة وثابتة';
    quick_specs['تقنية الاتصال'] = 'لاسلكي بلوتوث 5.3 (Bluetooth 5.3 TWS)';
    quick_specs['الميزات الخاصة'] = 'شحن لاسلكي Qi + عزل ضوضاء المكالمات ENC + مقاومة الماء IPX5 + تحكم لمسي ذكي';
    quick_specs['المكونات المضمنة'] = 'سماعات الأذن، علبة الشحن، حافظة سيليكون للحماية، كابل شحن سريع، دليل المستخدم';
  } else if (category === 'chargers_cables') {
    quick_specs['تقنية التوصيل'] = 'USB Type-C / Lightning / USB-A';
    quick_specs['ميزات الأمان'] = 'حماية ذكية ضد الماس الكهربائي وارتفاع درجة الحرارة والجهد الزائد';
    quick_specs['التوافق'] = 'متوافق مع آبل آيفون وسامسونج وشاومي وسائر الأجهزة الذكية';
  } else if (category === 'cases_protection') {
    quick_specs['الخامة'] = 'زجاج مقوى 9H فائق الصلابة / بولي كربونات مقاوم للصدمات';
    quick_specs['مستوى الحماية'] = 'حماية 360 درجة ضد الصدمات والسقوط والخدوش';
  } else if (category === 'powerbanks') {
    quick_specs['السعة'] = '10,000 - 20,000 مللي أمبير عالية الكثافة';
    quick_specs['تقنية الشحن السريع'] = 'Power Delivery 20W/45W + Quick Charge 3.0';
    quick_specs['المنافذ'] = 'USB-C إدخال وإخراج + منفذ USB-A سريع';
    quick_specs['الأمان والاعتماد'] = 'نظام حماية من الجهد والتيار الزائد والحرارة';
  } else if (category === 'smartwatches') {
    quick_specs['نوع الشاشة'] = 'شاشة لمس ملونة عالية الدقة HD AMOLED';
    quick_specs['عمر البطارية'] = 'حتى 5-7 أيام استخدام عادي / شحن مغناطيسي';
    quick_specs['المستشعرات الصحية'] = 'معدل نبضات القلب، نسبة الأكسجين، وتتبع النوم والرياضة';
    quick_specs['مقاومة الماء'] = 'معيار IP67/IP68 لمقاومة رذاذ الماء والعرق';
    quick_specs['التوافق'] = 'متوافق مع أجهزة آبل iOS وأندرويد';
  } else if (category === 'smartphones') {
    if (product.storage) quick_specs['سعة التخزين'] = product.storage;
    if (product.battery_health) quick_specs['صحة البطارية الأصلية'] = `${product.battery_health}% (مفحوصة معملياً)`;
    quick_specs['الملحقات المرفقة'] = 'كابل الشحن الأصلي، شهادة فحص معتمدة، علبة الجهاز، فاتورة ضريبية وضمان جو ستور';
  } else {
    quick_specs['الخامة'] = 'خامات ممتازة عالية المتانة';
    quick_specs['التوافق'] = 'متوافق مع كافة الهواتف الذكية والأجهزة المحمولة';
    quick_specs['الاستخدام'] = 'ملحقات عملية للسيارة والمكتب والاستخدام اليومي';
  }

  // 5. About This Item (Amazon Bullet Points)
  let about_item: string[] = product.about_item && product.about_item.length > 0 ? product.about_item : [];

  if (about_item.length === 0) {
    if (category === 'audio' || nameAr.toLowerCase().includes('airpod') || nameAr.toLowerCase().includes('سماع')) {
      about_item = [
        '[شحن لاسلكي Qi وسلكي سريع]: تدعم علبة الشحن كلاً من الشحن اللاسلكي السريع والشحن السلكي، مما يمنحك حرية الشحن في أي مكان دون تشابك الأسلاك.',
        '[عمر بطارية ممتد يصل إلى 40 ساعة]: استمتع بما يصل إلى 5-6 ساعات من الاستماع المتواصل بشحنة واحدة، بينما توفر علبة الشحن ما يصل إلى 40 ساعة إجمالية للاستخدام اليومي والسفر.',
        '[عزل ضوضاء المكالمات ENC المزدوج]: ميكروفون مدمج ذكي يعزل الضوضاء المحيطة والرياح لضمان إجراء مكالمات هاتفية فائقة النقاء في الشارع والمواصلات.',
        '[صوت ستيريو نقي Hi-Fi وبيس جهير 13 مم]: محركات صوتية متطورة توفر صوتاً ديناميكياً متوازناً وجهيراً غنياً وعميقاً لتجربة استماع سينمائية في الألعاب والموسيقى.',
        '[بلوتوث 5.3 واقتران فوري Pop-up]: اتصال تلقائي فوري بمجرد فتح العلبة مع استقرار تام للإشارة لمسافة 15 متراً وتأخير منخفض للغاية للألعاب.',
        '[مقاومة الماء والعرق بتصنيف IPX5]: تصميم محكم يقي السماعات من العرق ورذاذ المطر، مما يجعلها مثالية للتمارين الرياضية والجري.',
        '[ملحقات وحافظة سيليكون هدية مجانية]: تشمل العلبة جراب حماية سيليكون ناعم مضاد للصدمات مع ميدالية تعليق متينة لحماية علبة الشحن.'
      ];
    } else if (category === 'chargers_cables') {
      about_item = [
        '[شحن فائق السرعة والأمان]: يدعم تقنيات Power Delivery و Quick Charge لشحن بطارية هاتفك بنسبة تصل إلى 60% في غضون 30 دقيقة فقط.',
        '[نظام حماية ذكي متعدد الطبقات]: يمنع الحرارة الزائدة والشحن الزائد وقصر الدائرة الكهربائية للحفاظ على سلامة هاتفك وصحة البطارية مدى الحياة.',
        '[خامات فائقة المتانة]: موصلات معززة تتحمل أكثر من 25,000 انحناء واهتراء للاستخدام اليومي الشاق دون تلف.',
        '[توافق شامل]: متوافق بنسبة 100% مع كافة أجهزة آبل آيفون، آيباد، أجهزة سامسونج جالاكسي، واللابتوبات الحديثة.',
        '[ضمان جو ستور المعتمد]: استبدال فوري وصيانة رسمية ضد أي عيوب تصنيع.'
      ];
    } else if (category === 'cases_protection') {
      about_item = [
        '[صلابة فائقة 9H ومقاومة للكسر]: زجاج مقوى عالي المقاومة يمتص الصدمات القوية ويحمي الشاشة وعدسات الكاميرا من الشروخ والخدوش العميقة.',
        '[وضوح كريستالي فائق الدقة]: نفاذية ضوء بنسبة 99.9% تضمن نقاء الألوان الأصلي وسرعة استجابة اللمس بنسبة 100%.',
        '[طبقة مانعة للزيوت والبصمات Oleophobic]: طلاء نانو أملس يمنع تراكم بصمات الأصابع والزيوت ويسهل تنظيف الشاشة بمسحة واحدة.',
        '[حواف منحنية ناعمة وسهولة التركيب]: تتضمن إطار تركيب سريع يضمن تثبيتاً دقيقاً وخالياً تماماً من فقاعات الهواء في ثوانٍ.',
        '[متوافقة مع كافة الجرابات]: تصميم مدروس يترك مساحة كافية لحواف جميع أنواع الكفرات والجرابات دون رفع الحواف.'
      ];
    } else if (category === 'powerbanks') {
      about_item = [
        '[سعة بطارية حقيقية هائلة]: خلايا ليثيوم بوليمر عالية الكثافة تمنحك طاقة موثوقة لشحن هاتفك من 2 إلى 4 مرات بالكامل.',
        '[شحن سريع ثنائي الاتجاه PD]: يدعم الشحن فائق السرعة بقوة 22.5 واط أو أكثر لتوفير وقتك في السفر والتنقل.',
        '[شحن متعدد الأجهزة]: إمكانية شحن جهازين أو ثلاثة في نفس الوقت دون انخفاض كفاءة الشحن.',
        '[نظام أمان متعدد الطبقات]: حماية ذكية من الحرارة والجهد العالي لضمان سلامة بطارية هاتفك الثمين.',
        '[تصميم أنيق ومحمول]: وزن خفيف وهيكل مريح يسهل حمله في الجيب أو حقيبة اليد.'
      ];
    } else if (category === 'smartwatches') {
      about_item = [
        '[شاشة لمس ملونة فائقة الوضوح]: تباين عالي واستجابة لمسية فورية مع واجهات متعددة قابلة للتخصيص بالكامل.',
        '[مكالمات بلوتوث وإشعارات ذكية]: تحدث مباشرة من ساعتك وتلقَّ إشعارات واتساب وفيسبوك والمكالمات في ثوانٍ.',
        '[مستشعرات دقيقة لمتابعة الصحة]: قياس نبضات القلب على مدار 24 ساعة، نسبة الأكسجين SpO2، ومراقبة جودة النوم.',
        '[أوضاع رياضية متعددة ومقاومة للماء]: تتبع دقيق للجري والمشي والتمارين مع مقاومة للعرق ورذاذ الماء.',
        '[عمر بطارية يدوم طويلاً]: استمتع بأسبوع كامل من الاستخدام بشحنة واحدة فقط عبر الشاحن المغناطيسي السريع.'
      ];
    } else if (category === 'smartphones') {
      about_item = [
        '[فحص هندسي معملي بنسبة 100%]: تم فحص كافة وظائف الجهاز بدقة (الشاشة، بصمة الوجه، الكاميرات، الميكروفونات، الحساسات والشحن).',
        '[بطارية أصلية مصنعية]: بطارية ممتازة تدوم طوال اليوم مع فحص دورات الشحن لضمان أعلى أداء وكفاءة.',
        '[شاشة فائقة السطوع والدقة]: شاشة Super Retina مع ألوان طبيعية ساحرة ومعدل تحديث سلس.',
        '[كاميرات احترافية متطورة]: تصوير سينمائي فائق الدقة 4K مع وضع عزل البورتريه ووضوح ليلي مذهل.',
        '[ضمان استبدال معتمد من جو ستور]: ضمان استبدال وصيانة لمدة 6 أشهر مع فحص ومعاينة كاملة مع المندوب قبل دفع أي جنيه.'
      ];
    } else {
      about_item = [
        '[منتج أصلي 100%]: تم استيراده واختياره بعناية ليلائم أعلى معايير الجودة والأداء.',
        '[تصميم عصري وخامات ممتازة]: مصنوع من مواد متينة تدوم طويلاً وتتحمل الاستخدام المكثف.',
        '[أداء عملي عالي الكفاءة]: مصمم لتلبية احتياجاتك اليومية بسهولة وسلاسة.',
        '[ضمان جو ستور المحلي]: مشمول بضمان معتمد واستبدال مجاني.'
      ];
    }
  }

  // 6. Feature Banners (A+ Brand Content Marketing Visuals)
  let feature_banners: ProductFeatureBanner[] = product.feature_banners && product.feature_banners.length > 0 ? product.feature_banners : [];

  if (feature_banners.length === 0) {
    if (category === 'audio' || nameAr.toLowerCase().includes('airpod') || nameAr.toLowerCase().includes('joyroom')) {
      feature_banners = [
        {
          tag: 'البطارية والشحن اللاسلكي',
          title: 'بطارية عملاقة 40 ساعة مع شحن لاسلكي Qi',
          subtitle: 'Monster 40-Hour Playtime & Qi Wireless Fast Charging',
          description: 'استمتع بحرية مطلقة بدون شواحن طوال الأسبوع. توفر السماعات 6 ساعات تشغيل متواصل، ومع علبة الشحن تصل إلى 40 ساعة إجمالية. ضع العلبة على أي شاحن لاسلكي وسيبدأ الشحن فوراً.',
          image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1200&q=80'
        },
        {
          tag: 'هندسة الصوت والبيس',
          title: 'محرك ديناميكي 13 مم لصوت Hi-Fi وبيس جهير مذهل',
          subtitle: '13mm Dynamic Driver & Acoustic HiFi Deep Bass',
          description: 'غشاء بيولوجي مركب متطور يوفر نطاقاً ترددياً واسعاً من 20 هرتز إلى 20 كيلوهرتز، لتسمع أدق تفاصيل الآلات الموسيقية وصوت المغني بوضوح بلوري ونغمات بيس عميقة تهتز لها الحواس.',
          image_url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1200&q=80'
        },
        {
          tag: 'المكالمات وعزل الضوضاء',
          title: 'ميكروفون مزدوج ENC لعزل الضوضاء والرياح بالذكاء الاصطناعي',
          subtitle: 'Dual-Mic ENC Clear Call Voice Isolation Algorithm',
          description: 'سواء كنت في مترو الأنفاق أو في شارع مزدحم، تعمل خوارزمية الذكاء الاصطناعي على عزل الأصوات المحيطة وضجيج السيارات مع تضخيم صوتك الطبيعي ليسمعك الطرف الآخر بنقاء تام.',
          image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80'
        },
        {
          tag: 'مقاومة الماء والرياضة',
          title: 'معيار مقاومة الماء والعرق IPX5 للتمارين الشاقة',
          subtitle: 'IPX5 Sweat & Water Resistance for Active Workouts',
          description: 'طلاء نانو محكم ومنافذ صوتية معزولة تمنع تسرب قطرات العرق أو رذاذ المطر، مما يجعلها الرفيق المثالي في الجيم وأثناء الجري وركوب الدراجات.',
          image_url: 'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?auto=format&fit=crop&w=1200&q=80'
        },
        {
          tag: 'الاتصال والاقتران السريع',
          title: 'بلوتوث 5.3 فائق السرعة مع نافذة اقتران Pop-up المنبثقة',
          subtitle: 'Bluetooth 5.3 Low Latency & Instant Smart Pop-Up Window',
          description: 'بمجرد فتح الغطاء تظهر نافذة الاتصال الفوري على شاشة هاتفك مع استقرار تام بدون أي تقطيع أو تأخير في الصوت، متوافقة بالكامل مع كافة هواتف آيفون وأندرويد.',
          image_url: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=1200&q=80'
        }
      ];
    } else if (category === 'chargers_cables') {
      feature_banners = [
        {
          tag: 'تقنية GaN المتقدمة',
          title: 'شحن فائق السرعة بقوة استثنائية وحجم صغير مدمج',
          subtitle: 'Next-Gen GaN Fast Charging Technology',
          description: 'شبه موصلات نيتريد الغاليوم تتيح كفاءة طاقة أعلى بنسبة 95% وحرارة أقل بنسبة 40% مقارنة بالشواحن التقليدية، مع سرعة شحن مضاعفة 3 مرات.',
          image_url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=1200&q=80'
        },
        {
          tag: 'حماية ActiveShield 2.0',
          title: 'مراقبة ذكية لدرجة الحرارة 3 ملايين مرة يومياً',
          subtitle: 'Smart Thermal & Multi-Device Circuit Protection',
          description: 'شريحة استشعار ديناميكية تراقب درجات الحرارة وتنظم تدفق التيار الكهربائي تلقائياً لحماية بطارية هاتفك الثمين وإطالة عمرها الافتراضي.',
          image_url: 'https://images.unsplash.com/photo-1622445262464-84b1ebae0705?auto=format&fit=crop&w=1200&q=80'
        }
      ];
    } else {
      feature_banners = [
        {
          tag: 'الجودة والاعتماد',
          title: 'معايير فحص واختبار هندسية معتمدة من متجر جو ستور',
          subtitle: 'Certified Quality & Rigorous Lab Testing Standard',
          description: 'كل منتج في جو ستور يخضع لسلسلة فحوصات صارمة تضمن مطابقته لأعلى المواصفات القياسية، مع ضمان استبدال رسمي وفحص كامل قبل الاستلام.',
          image_url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80'
        }
      ];
    }
  }

  // 7. Rating Breakdown
  const rating_breakdown: RatingBreakdown = product.rating_breakdown || {
    five_star: 78,
    four_star: 15,
    three_star: 4,
    two_star: 2,
    one_star: 1
  };

  // 8. Customer Reviews
  let customer_reviews: CustomerReviewItem[] = product.customer_reviews && product.customer_reviews.length > 0 ? product.customer_reviews : [];

  if (customer_reviews.length === 0) {
    if (category === 'audio' || nameAr.toLowerCase().includes('airpod') || nameAr.toLowerCase().includes('joyroom')) {
      customer_reviews = [
        {
          id: 'rev-1',
          author: 'كريم الشناوي',
          location: 'القاهرة (مصر الجديدة)',
          rating: 5,
          date: '28 مارس 2026',
          title: 'أفضل سماعة بالفئة السعرية دي.. البيس جبار والشحن اللاسلكي شغال تمام',
          comment: 'اشتريت سماعة جويروم من جو ستور ووصلتني تاني يوم. الصوت نقي جداً ومجربها في الجيم ثابتة في الودن ومقاومة العرق ممتازة. عزل المكالمات ENC في الزحمة بجد فرق معايا جداً، والكفر السيليكون الهدية خامته نضيفة ومحترمة.',
          verified_purchase: true,
          helpful_count: 34
        },
        {
          id: 'rev-2',
          author: 'د. سارة المنشاوي',
          location: 'الإسكندرية (سموحة)',
          rating: 5,
          date: '14 مارس 2026',
          title: 'البطارية بتقعد معايا أكتر من أسبوع بدون شحن!',
          comment: 'البطارية ممتازة جداً وفعلاً بتقعد أيام، وبشحنها على الشاحن اللاسلكي بتاع الآيفون بتشحن بسرعة. خدمة عملاء جو ستور وسرعة شحن الطلب على الواتساب 10/10.',
          verified_purchase: true,
          helpful_count: 19
        },
        {
          id: 'rev-3',
          author: 'م. أحمد حسام',
          location: 'المنصورة (حي الجامعة)',
          rating: 5,
          date: '3 مارس 2026',
          title: 'منتج أصلي 100% والـ Pop-up شغال فوراً على الآيفون',
          comment: 'الاقتران بيظهر فوراً أول ما بفتح الغطاء زي الآبل إيربودز بالضبط، ونسبة البطارية بتظهر على الشاشة. تجربة ممتازة وتستاهل كل مليم.',
          verified_purchase: true,
          helpful_count: 27
        },
        {
          id: 'rev-4',
          author: 'عمر الفيشاوي',
          location: 'الجيزة (المهندسين)',
          rating: 4,
          date: '20 فبراير 2026',
          title: 'سماعة رائعة جداً، خامة العلبة ناعمة وجودة الصوت هايلة',
          comment: 'الصوت متوازن ونقي جداً في الميوزيك والبودكاست. المايك ممتاز في الأماكن المقفولة ومعقول جداً في الهواء الطلق. أنصح بيها جداً.',
          verified_purchase: true,
          helpful_count: 12
        }
      ];
    } else {
      customer_reviews = [
        {
          id: 'rev-1',
          author: 'محمود عبد العزيز',
          location: 'القاهرة',
          rating: 5,
          date: '24 مارس 2026',
          title: 'منتج أصلي وخامات ممتازة ومعاينة مع المندوب قبل الدفع',
          comment: 'المنتج وصل في ميعاده ومغلف بشكل ممتاز ومطابق للوصف بالكامل. شكراً لمتجر جو ستور على الأمانة وسرعة التوصيل.',
          verified_purchase: true,
          helpful_count: 15
        },
        {
          id: 'rev-2',
          author: 'أشرف ممدوح',
          location: 'طنطا',
          rating: 5,
          date: '10 مارس 2026',
          title: 'جودة استثنائية وضمان رسمي معتمد',
          comment: 'أنصح بالتعامل مع جو ستور، الخامات أصلية والأسعار ممتازة جداً مقارنة بالسوق.',
          verified_purchase: true,
          helpful_count: 8
        }
      ];
    }
  }

  // 9. Frequently Bought Together (Curated Companion Items)
  let bundle_accessories: Product[] = [];
  if (product.frequently_bought_together && product.frequently_bought_together.length > 0) {
    bundle_accessories = allProducts.filter(p => product.frequently_bought_together?.includes(p.id));
  }
  
  if (bundle_accessories.length < 2) {
    // Intelligently find accessories
    if (category === 'audio') {
      // Find a protective case and a fast charger
      const caseItem = allProducts.find(p => p.id !== product.id && (p.category === 'cases_protection' || p.name_ar.includes('جراب') || p.name_ar.includes('كفر')));
      const chargerItem = allProducts.find(p => p.id !== product.id && (p.category === 'chargers_cables' || p.name_ar.includes('شاحن')));
      if (caseItem && !bundle_accessories.some(b => b.id === caseItem.id)) bundle_accessories.push(caseItem);
      if (chargerItem && !bundle_accessories.some(b => b.id === chargerItem.id)) bundle_accessories.push(chargerItem);
    } else if (category === 'smartphones') {
      // Find a privacy screen and a MagSafe charger or case
      const screenItem = allProducts.find(p => p.id !== product.id && (p.name_ar.includes('اسكرين') || p.name_ar.includes('حماي')));
      const caseItem = allProducts.find(p => p.id !== product.id && (p.name_ar.includes('جراب') || p.name_ar.includes('ماج سيف')));
      if (screenItem && !bundle_accessories.some(b => b.id === screenItem.id)) bundle_accessories.push(screenItem);
      if (caseItem && !bundle_accessories.some(b => b.id === caseItem.id)) bundle_accessories.push(caseItem);
    } else {
      // Pick 2 popular accessories
      const otherItems = allProducts.filter(p => p.id !== product.id).slice(0, 2);
      otherItems.forEach(item => {
        if (!bundle_accessories.some(b => b.id === item.id)) bundle_accessories.push(item);
      });
    }
  }

  // 10. Comparison Items (3-4 similar items from same brand/category)
  const comparison_items = allProducts
    .filter(p => p.id !== product.id && (p.category === category || p.brand === brand))
    .slice(0, 3);

  return {
    detailed_title_ar,
    detailed_title_en,
    brand_store_name: brandStoreName,
    asin,
    bought_past_month,
    about_item,
    quick_specs,
    feature_banners,
    rating_breakdown,
    customer_reviews,
    bundle_accessories,
    comparison_items
  };
}
