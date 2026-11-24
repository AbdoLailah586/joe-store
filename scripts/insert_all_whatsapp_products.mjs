import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/DATABASE_URL=([^\r\n]+)/);
const sql = neon(match[1]);

const allWhatsAppProducts = [
  // 1. Oraimo FreePods 3C
  {
    id: "prod-oraimo-freepods-3c",
    name_ar: "سماعة أوريمو بلوتوث Oraimo FreePods 3C صوت نقي وباس عميق",
    name_en: "Oraimo FreePods 3C True Wireless Earbuds HavyBass",
    category: "audio",
    brand: "Oraimo",
    price: 750,
    old_price: 950,
    stock_quantity: 35,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: "ضمان 12 شهر من الوكيل",
    images: [
      "/product-images/oraimo-freepods-3c-box.jpg",
      "/product-images/oraimo-freepods-3c-features.jpg"
    ],
    colors: ["أسود", "أبيض"],
    specs: {
      "الموديل": "OEB-E104DC",
      "تقنية الصوت": "HavyBass مع خوارزمية إلغاء الضوضاء أثناء المكالمات 4-mic ENC",
      "عمر البطارية": "36 ساعة تشغيل إجمالي (8 ساعات في السماعة + 28 ساعة في العلبة)",
      "مقاومة الماء": "IPX5 مقاومة للعرق ورذاذ الماء",
      "إصدار البلوتوث": "Bluetooth 5.3 سريع ومستقر",
      "شحن سريع": "10 دقائق شحن تعطي 140 دقيقة تشغيل",
      "التحكم": "لمس ذكي مع تخصيص الصوت عبر تطبيق Oraimo Sound"
    }
  },

  // 2. Oraimo SpaceBuds Lite
  {
    id: "prod-oraimo-spacebuds-lite",
    name_ar: "سماعة أوريمو سبيس بودز لايت Oraimo SpaceBuds Lite OTW-324 باس قوي",
    name_en: "Oraimo SpaceBuds Lite OTW-324 Powerful Bass True Wireless Earbuds",
    category: "audio",
    brand: "Oraimo",
    price: 650,
    old_price: 800,
    stock_quantity: 25,
    is_active: true,
    is_featured: false,
    is_preowned: false,
    warranty: "ضمان 12 شهر",
    images: ["/product-images/oraimo-spacebuds-lite-otw324.jpg"],
    colors: ["أسود"],
    specs: {
      "الموديل": "OTW-324",
      "الصوت": "HavyBass Powerful Bass Pure Immersion",
      "البطارية": "حتى 30 ساعة تشغيل",
      "الاتصال": "Bluetooth 5.3 منخفض التأخير للألعاب",
      "الضمان": "ضمان أوريمو الرسمي 365 يوم"
    }
  },

  // 3. Oraimo SpaceBuds Z ANC
  {
    id: "prod-oraimo-spacebuds-z",
    name_ar: "سماعة أوريمو سبيس بودز زد Oraimo SpaceBuds Z OTW-425 مع عزل الضوضاء النشط ANC",
    name_en: "Oraimo SpaceBuds Z OTW-425 Active Noise Cancellation ANC Earbuds",
    category: "audio",
    brand: "Oraimo",
    price: 950,
    old_price: 1200,
    stock_quantity: 20,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: "ضمان 12 شهر",
    images: ["/product-images/oraimo-spacebuds-z-otw425.jpg"],
    colors: ["أسود"],
    specs: {
      "الموديل": "OTW-425",
      "عزل الضوضاء": "Active Noise Cancellation (ANC) حتى 30dB",
      "وضعية الشفافية": "Transparency Mode لسماع الأصوات المحيطة بوضوح",
      "عمر البطارية": "حتى 32 ساعة مع الحافظة",
      "تقنية الميكروفون": "4 ميكروفونات مع تقنية تقليل الضوضاء للمكالمات"
    }
  },

  // 4. Oraimo Necklace Lite
  {
    id: "prod-oraimo-necklace-lite",
    name_ar: "سماعة رقبة لاسلكية أوريمو نكلاس لايت Oraimo Necklace Lite بطارية 30 ساعة",
    name_en: "Oraimo Necklace Lite OEB-E3111 30-Hour Wireless Neckband Earphones",
    category: "audio",
    brand: "Oraimo",
    price: 480,
    old_price: 600,
    stock_quantity: 30,
    is_active: true,
    is_featured: false,
    is_preowned: false,
    warranty: "ضمان 12 شهر",
    images: ["/product-images/oraimo-necklace-lite-e3111.jpg"],
    colors: ["أسود"],
    specs: {
      "الموديل": "OEB-E3111",
      "البطارية": "30 ساعة تشغيل متواصل فائقة التحمل",
      "شحن فائق السرعة": "شحن 10 دقائق يمنح 10 ساعات تشغيل",
      "التصميم": "طوق رقبة مريح وخفيف الوزن مع مغناطيس مدمج بالسماعات",
      "تقنية الاهتزاز": "تنبيه بالاهتزاز عند ورود المكالمات"
    }
  },

  // 5. Oraimo SpaceBuds N ANC
  {
    id: "prod-oraimo-spacebuds-n",
    name_ar: "سماعة أوريمو سبيس بودز إن Oraimo SpaceBuds N OTW-626N صوت نقي وعزل ضوضاء",
    name_en: "Oraimo SpaceBuds N OTW-626N ANC Pure Sound & Crisp Call Earbuds",
    category: "audio",
    brand: "Oraimo",
    price: 850,
    old_price: 1050,
    stock_quantity: 22,
    is_active: true,
    is_featured: false,
    is_preowned: false,
    warranty: "ضمان 12 شهر",
    images: [
      "/product-images/oraimo-spacebuds-n-otw626n-1.jpg",
      "/product-images/oraimo-spacebuds-n-otw626n-2.jpg"
    ],
    colors: ["أسود"],
    specs: {
      "الموديل": "OTW-626N",
      "الميزة": "Pure Sound, Crisp Call بتقنية HavyBass المتطورة",
      "عزل الضوضاء": "Active Noise Cancellation ANC",
      "الاتصال": "Bluetooth 5.3"
    }
  },

  // 6. Anker Soundcore R50i NC
  {
    id: "prod-soundcore-r50i-nc",
    name_ar: "سماعة أنكر ساوندكور Soundcore R50i NC مع عزل الضوضاء النشط (ANC)",
    name_en: "Anker Soundcore R50i NC True Wireless Earbuds with Adaptive ANC",
    category: "audio",
    brand: "Anker",
    price: 1150,
    old_price: 1450,
    stock_quantity: 28,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: "ضمان 18 شهر من الوكيل المعتمد",
    images: ["/product-images/soundcore-r50i-nc-box.jpg"],
    colors: ["أسود", "أبيض"],
    specs: {
      "الموديل": "Soundcore R50i NC (A3959)",
      "عزل الضوضاء": "تقنية عزل الضوضاء التكيفية الذكية حتى 42dB تخفض 90% من الضوضاء",
      "البطارية": "10 ساعات للسماعة و45 ساعة إجمالية مع الحافظة (30 ساعة مع تفعيل ANC)",
      "المشغلات": "محركات صوتية 10 مم مع BassUp لتعزيز الباس فائق القوة",
      "المكالمات": "4 ميكروفونات مدمجة مدعومة بالذكاء الاصطناعي لمكالمات فائقة النقاء",
      "مقاومة الماء": "معيار IP54 المقاوم للعرق ورذاذ المطر والغبار",
      "حامل مدمج": "علبة الشحن تتحول إلى ستاند وحامل لمشاهدة الفيديوهات على الهاتف"
    }
  },

  // 7. Anker Soundcore R50i (Standard)
  {
    id: "prod-soundcore-r50i-earbuds",
    name_ar: "سماعة أنكر ساوندكور R50i اللاسلكية الأصلية صوت قوي وبطارية 30 ساعة",
    name_en: "Anker Soundcore R50i True Wireless Earbuds Powerful Sound 30H",
    category: "audio",
    brand: "Anker",
    price: 750,
    old_price: 950,
    stock_quantity: 30,
    is_active: true,
    is_featured: false,
    is_preowned: false,
    warranty: "ضمان 18 شهر",
    images: ["/product-images/soundcore-r50i-earbuds-box.jpg"],
    colors: ["أسود"],
    specs: {
      "الموديل": "Soundcore R50i",
      "المحركات": "10mm Extra-bass Drivers",
      "البطارية": "30 ساعة تشغيل إجمالي (10 ساعات للسماعة)",
      "المقاومة": "IPX5 لمقاومة الماء والتعرق",
      "التحكم": "تطبيق Soundcore لتخصيص 22 نمط EQ مختلف"
    }
  },

  // 8. Hollyland Lark M2 Wireless Lavalier Mic
  {
    id: "prod-hollyland-lark-wireless-mic",
    name_ar: "مايك لاسلكي احترافي هوليلاند Hollyland Lark M2 لصناع المحتوى والفيديو",
    name_en: "Hollyland Lark M2 Wireless Lavalier Microphone System",
    category: "audio",
    brand: "Hollyland",
    price: 5400,
    old_price: 6200,
    stock_quantity: 8,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: "ضمان 12 شهر معتمد",
    images: ["/product-images/hollyland-lark-wireless-mic-box.jpg"],
    colors: ["رمادي تيتانيوم"],
    specs: {
      "الموديل": "Lark M2 (Mobile Version)",
      "جودة الصوت": "صوت عالي الدقة 48kHz / 24-bit بنقاء استوديو Hi-Fi",
      "عزل الضوضاء": "تقنية عزل الضوضاء البيئية ENC بضغطة زر واحدة",
      "الوزن": "وزن ريشة 9 جرام فقط للمايك بدون إثقال الملابس",
      "المدى اللاسلكي": "نقل مستقر حتى مسافة 300 متر بموجة 2.4GHz",
      "عمر البطارية": "حتى 10 ساعات استخدام متواصل، و40 ساعة مع علبة الشحن المتنقلة",
      "التوافق": "متوافق مع آيفون وأندرويد وأجهزة اللابتوب عبر موصلات Lightning و Type-C"
    }
  },

  // 9. Lito AI Wireless Lapel Microphone
  {
    id: "prod-lito-ai-wireless-mic",
    name_ar: "مايك ليتو لاسلكي Lito AI عالي النقاء 48kHz مع علبة شحن ذكية",
    name_en: "Lito AI Wireless Lapel Microphone 48kHz 24-bit with Charging Case",
    category: "audio",
    brand: "Lito",
    price: 1450,
    old_price: 1750,
    stock_quantity: 15,
    is_active: true,
    is_featured: false,
    is_preowned: false,
    warranty: "ضمان 12 شهر",
    images: ["/product-images/lito-ai-wireless-mic.jpg"],
    colors: ["أسود"],
    specs: {
      "دقة الصوت": "48kHz / 24bit معالج صوتي رقمي استوديو",
      "العلبة": "علبة شحن مدمجة ببطارية طويلة الأمد",
      "تقنية الذكاء الاصطناعي": "عزل ذكي لتشويش الرياح وضوضاء الخلفية",
      "التوافق": "مباشر للهواتف الذكية مع استجابة فورية بدون تأخير"
    }
  },

  // 10. ONMUST Zolo 30W Charger (Preserved)
  {
    id: "prod-onmust-zolo-30w-1006",
    name_ar: "شاحن جداري سريع ONMUST Zolo 30W بتقنية GaN ومنفذ تايب سي",
    name_en: "ONMUST Zolo 30W GaN Super Fast Charger USB-C Power Delivery",
    category: "chargers_cables",
    brand: "ONMUST",
    price: 350,
    old_price: 450,
    stock_quantity: 50,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: "ضمان 12 شهر استبدال فوري",
    images: [
      "/product-images/onmust-zolo-30w-studio.jpg",
      "/product-images/onmust-zolo-30w-box-clean.png"
    ],
    colors: ["أبيض"],
    specs: {
      "القدرة": "30 واط كحد أقصى بتقنية GaN III",
      "المنافذ": "منفذ Type-C PD 3.0",
      "التوافق": "آيفون 16/17 برو ماكس وسامسونج وآيباد",
      "الحماية": "حماية ذكية ضد الحرارة والشحن الزائد"
    }
  },

  // 11. Hunter 67W GaN Dual USB-C Charger
  {
    id: "prod-hunter-gan-67w",
    name_ar: "شاحن هنتر 67 واط جان فائق السرعة Hunter 67W GaN بمنفذي تايب سي مع إضاءة LED",
    name_en: "Hunter 67W GaN Dual USB-C Fast Charger with Running LED Light",
    category: "chargers_cables",
    brand: "Hunter",
    price: 750,
    old_price: 950,
    stock_quantity: 30,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: "ضمان 12 شهر ضد عيوب الصناعة",
    images: [
      "/product-images/hunter-67w-gan-box.jpg",
      "/product-images/banner-hunter-charging-series.jpg"
    ],
    colors: ["أسود فاخر"],
    specs: {
      "الموديل": "HU-C0100",
      "أقصى قدرة": "67 واط بتقنية نيتريد الغاليوم (GaN III Pro)",
      "المنافذ": "منفذين USB-C يدعمان بروتوكول PD25W و PD67W فائق السرعة",
      "إضاءة التشغيل": "شريط LED تفاعلي جذاب يوضح سريان الشحن السريع",
      "الأمان": "نظام حماية متعدد ضد التيار الزائد، الجهد العالي، وارتفاع الحرارة",
      "التوافق الشامل": "يشحن أجهزة اللابتوب (MacBook)، هواتف iPhone، Samsung، وiPad بأقصى كفاءة"
    }
  },

  // 12. Hunter AI GaN 45W Charger (Voice & Touch)
  {
    id: "prod-hunter-ai-gan-45w",
    name_ar: "شاحن هنتر الذكي 45 واط Hunter AI GaN بأوامر صوتية وتحكم باللمس",
    name_en: "Hunter AI GaN 45W Dual USB-C Charger with Voice Command & Touch Control",
    category: "chargers_cables",
    brand: "Hunter",
    price: 580,
    old_price: 750,
    stock_quantity: 25,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: "ضمان 12 شهر",
    images: ["/product-images/hunter-ai-45w-gan-box.jpg"],
    colors: ["رمادي تيتانيوم"],
    specs: {
      "الموديل": "Hu-A1 / Hu-A7",
      "التقنية الحصرية": "أول شاحن ذكي يدعم الأوامر الصوتية Voice Command والتحكم التفاعلي باللمس Touch Control",
      "القدرة": "45 واط PD بتقنية GaN مع رقاقة الذكاء الاصطناعي Hunter AI Chip",
      "المنافذ": "منفذين USB-C للشحن المتزامن فائق السرعة",
      "توزيع الطاقة الذكي": "يتعرف تلقائياً على الجهاز ويمنحه الجهد والتيار الأمثل دون ارتفاع الحرارة"
    }
  },

  // 13. Hunter 45W PD + QC3.0 Super Fast Charger
  {
    id: "prod-hunter-gan-45w",
    name_ar: "شاحن هنتر 45 واط سوبر فاست Hunter 45W PD + QC3.0 بمنفذ Type-C و USB-A",
    name_en: "Hunter 45W Super Fast Charger Dual Output PD + QC3.0",
    category: "chargers_cables",
    brand: "Hunter",
    price: 490,
    old_price: 620,
    stock_quantity: 35,
    is_active: true,
    is_featured: false,
    is_preowned: false,
    warranty: "ضمان 12 شهر",
    images: ["/product-images/hunter-45w-gan-box.jpg"],
    colors: ["أسود"],
    specs: {
      "الموديل": "HU-C0101",
      "القدرة الإجمالية": "45 واط شحن فائق السرعة Super Fast Charging",
      "المنافذ": "منفذ USB-C Power Delivery + منفذ USB-A Quick Charge 3.0",
      "التوافق": "يدعم هواتف سامسونج Super Fast Charging 2.0 وهواتف آيفون PD بأعلى سرعة",
      "أنظمة الحماية": "دائرة حماية خماسية لحماية بطارية هاتفك من الإجهاد"
    }
  },

  // 14. Hunter 25W PD Adapter
  {
    id: "prod-hunter-pd-25w",
    name_ar: "رأس شاحن هنتر 25 واط تايب سي سريع Hunter 25W PD Adapter",
    name_en: "Hunter 25W USB-C PD Fast Charging Adapter Safe & Reliable",
    category: "chargers_cables",
    brand: "Hunter",
    price: 320,
    old_price: 420,
    stock_quantity: 45,
    is_active: true,
    is_featured: false,
    is_preowned: false,
    warranty: "ضمان 12 شهر",
    images: ["/product-images/hunter-25w-pd-box.jpg"],
    colors: ["أبيض"],
    specs: {
      "الموديل": "HU-C0103",
      "القدرة": "25 واط Power Delivery (PD)",
      "المنفذ": "منفذ تايب سي Type-C فائق الاستقرار",
      "الحجم": "تصميم مدمج وسهل الحمل أثناء السفر والتنقل",
      "الأمان": "معايير أمان معتمدة ضد تقلبات الجهد الكهربائي"
    }
  },

  // 15. Hunter 20W GaN Mini Charger
  {
    id: "prod-hunter-gan-20w-mini",
    name_ar: "شاحن هنتر ميني جان 20 واط فائق الصغر Hunter 20W GaN Mini Charger",
    name_en: "Hunter 20W GaN Mini Fast Charger HU-C0102 Total Safety",
    category: "chargers_cables",
    brand: "Hunter",
    price: 280,
    old_price: 360,
    stock_quantity: 40,
    is_active: true,
    is_featured: false,
    is_preowned: false,
    warranty: "ضمان 12 شهر",
    images: ["/product-images/hunter-20w-gan-mini-box.jpg"],
    colors: ["أسود"],
    specs: {
      "الموديل": "HU-C0102",
      "القدرة": "20 واط GaN فائق السرعة والصغر",
      "الميزة": "حجم أصغر بنسبة 50% مع حرارة منخفضة جداً وثبات كهربائي 100%"
    }
  },

  // 16. Hunter 90W Desktop GaN Station
  {
    id: "prod-hunter-desktop-gan-90w",
    name_ar: "منصة شحن مكتبية هنتر 90 واط Hunter Desktop GaN متعددة المنافذ",
    name_en: "Hunter 90W Desktop GaN Multi-Port Fast Charging Station",
    category: "chargers_cables",
    brand: "Hunter",
    price: 1150,
    old_price: 1450,
    stock_quantity: 15,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: "ضمان 12 شهر",
    images: ["/product-images/hunter-90w-gan-desktop-box.jpg"],
    colors: ["أسود مطفي"],
    specs: {
      "القدرة القصوى": "90 واط GaN",
      "المنافذ": "منافذ متعددة لشحن اللابتوب، الهاتف، والتابلت في آن واحد",
      "الاستقرار": "تنظيم جهد فائق التطور للمكاتب وبيئات العمل الاحترافية"
    }
  },

  // 17. Lito 10,000mAh Magnetic Power Bank
  {
    id: "prod-lito-wireless-powerbank-10k",
    name_ar: "باور بانك ليتو لاسلكي Lito المغناطيسي 10000 مللي أمبير بقوة 15 واط",
    name_en: "Lito 10000mAh 15W Magnetic Wireless Fast Power Bank",
    category: "powerbanks",
    brand: "Lito",
    price: 850,
    old_price: 1100,
    stock_quantity: 25,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: "ضمان 12 شهر",
    images: ["/product-images/lito-wireless-powerbank-10k.jpg"],
    colors: ["رمادي تيتانيوم"],
    specs: {
      "السعة": "10,000 مللي أمبير حقيقية عالية الكثافة",
      "الشحن اللاسلكي": "شحن مغناطيسي MagSafe متوافق بقوة 15 واط",
      "الشحن السلكي": "منفذ Type-C يدعم بروتوكول PD بقوة تصل إلى 20 واط",
      "التصميم": "سمك نحيف للغاية (15.7 مم) وخامات ألومنيوم متميزة لا تسخن أثناء الشحن",
      "المؤشرات": "مؤشر LED ذكي يوضح نسبة الشحن المتبقية بدقة"
    }
  },

  // 18. Lito 5,000mAh Magnetic Power Bank
  {
    id: "prod-lito-wireless-powerbank-5k",
    name_ar: "باور بانك ليتو مغناطيسي فائق الصغر 5000 مللي أمبير Lito 15W MagSafe",
    name_en: "Lito 5000mAh 15W Ultra Compact Magnetic Wireless Power Bank",
    category: "powerbanks",
    brand: "Lito",
    price: 650,
    old_price: 800,
    stock_quantity: 20,
    is_active: true,
    is_featured: false,
    is_preowned: false,
    warranty: "ضمان 12 شهر",
    images: ["/product-images/lito-wireless-powerbank-5k.jpg"],
    colors: ["رمادي"],
    specs: {
      "السعة": "5,000 مللي أمبير",
      "الميزة": "حجم فائق الصغر More Small More Power لا يتجاوز حجم البطاقة الائتمانية",
      "الشحن اللاسلكي": "15W MagSafe قوي التثبيت"
    }
  },

  // 19. Earldom JS02 Jumpstarter & Air Pump
  {
    id: "prod-car-jumpstarter-airpump",
    name_ar: "جهاز طوارئ السيارات 2 في 1: جامب ستارتر بطارية + منفاخ إطارات رقمي ذكي",
    name_en: "Earldom JS02 2-in-1 Car Emergency Jump Starter & Smart Air Compressor",
    category: "accessories",
    brand: "Earldom",
    price: 2100,
    old_price: 2650,
    stock_quantity: 12,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: "ضمان 12 شهر استبدال",
    images: ["/product-images/car-jumpstarter-airpump.jpg"],
    colors: ["أسود مع لمسات برتقالية"],
    specs: {
      "الموديل": "Earldom JS02",
      "وظيفة الجامب ستارتر": "تيار بدء تشغيل فائق القوة لتشغيل محركات البنزين والديزل عند نفاد البطارية فوراً",
      "وظيفة منفاخ الهواء": "كمبروسر هواء رقمي مدمج مع شاشة إلكترونية تفصل أوتوماتيكياً عند الوصول للضغط المطلوب",
      "الإضاءة": "كشاف LED طوارئ قوي مع أوضاع إضاءة عادية، SOS، وتحذيرية للطرق السريعة",
      "باور بانك للطوارئ": "منافذ USB لشحن الهواتف والأجهزة الذكية في رحلات التخييم والطوارئ"
    }
  },

  // 20. K30 Magnetic Suction Bracket
  {
    id: "prod-k30-magnetic-car-mount",
    name_ar: "حامل هاتف مغناطيسي K30 بقوة شفط هوائي فراغي ودوران 360 درجة للسيارة والأسطح",
    name_en: "K30 Vacuum Suction Positioning Magnetic Phone Bracket 360 Rotation",
    category: "accessories",
    brand: "Generic",
    price: 290,
    old_price: 390,
    stock_quantity: 40,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: "ضمان 6 شهور ضد عيوب الصناعة",
    images: ["/product-images/k30-magnetic-car-mount.jpg"],
    colors: ["فضي معدني", "أسود كربوني"],
    specs: {
      "الموديل": "K30 Vacuum Suction Magnetic Bracket",
      "آلية التثبيت": "قاعدة شفط هوائي فراغي Vacuum Suction شديدة الثبات على الزجاج والتابلوه والمكاتب",
      "المغناطيس": "حلقة مغناطيسية قوية بقوة جذب N52 متوافقة تماماً مع MagSafe",
      "زوايا الرؤية": "مفصل كروي يتيح تدوير الهاتف 360 درجة وزاوية ميلان متعددة لتسهيل استخدام خرائط GPS"
    }
  },

  // 21. M1 3-Axis Gimbal Stabilizer
  {
    id: "prod-m1-gimbal-stabilizer",
    name_ar: "مانع اهتزاز الهواتف ثلاثي المحاور M1 3-Axis Gimbal للتصوير السينمائي الاحترافي",
    name_en: "M1 3-Axis Handheld Smartphone Gimbal Stabilizer",
    category: "accessories",
    brand: "Generic",
    price: 1850,
    old_price: 2300,
    stock_quantity: 10,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: "ضمان 12 شهر",
    images: ["/product-images/m1-3axis-gimbal-stabilizer.jpg"],
    colors: ["رمادي غامق"],
    specs: {
      "الموديل": "M1 3-Axis Handheld Stabilizer",
      "المحاور": "تثبيت ميكانيكي كامل على 3 محاور لامتصاص كافة الاهتزازات أثناء المشي والجري",
      "أوضاع التصوير": "تتبع الوجه Face Tracking، وضع البانوراما، والتصوير الزمني Timelapse",
      "التوافق": "يعمل بسلاسة مع كافة هواتف آيفون وأندرويد عبر البلوتوث"
    }
  },

  // 22. Hunter Foldable Magnetic Desktop Tripod
  {
    id: "prod-hunter-magnetic-tripod",
    name_ar: "ترايبود وحامل مغناطيسي مكتبي قابل للطي من هنتر Hunter MagSafe Tripod",
    name_en: "Hunter Foldable Magnetic Desktop Tripod / MagSafe Stand",
    category: "accessories",
    brand: "Hunter",
    price: 320,
    old_price: 420,
    stock_quantity: 35,
    is_active: true,
    is_featured: false,
    is_preowned: false,
    warranty: "ضمان 6 شهور",
    images: ["/product-images/hunter-magnetic-desktop-tripod.jpg"],
    colors: ["رمادي تيتانيوم"],
    specs: {
      "الخامة": "ألومنيوم مقوى مع مفاصل متينة قابلة للطي",
      "المغناطيس": "رأس MagSafe دائري فائق القوة",
      "الاستخدام": "ترايبود مكتبي للبث المباشر ومكالمات الفيديو وصناعة المحتوى"
    }
  },

  // 23. Hunter Foldable Aluminum Laptop Stand
  {
    id: "prod-hunter-laptop-stand",
    name_ar: "حامل لابتوب وتابلت ألومنيوم قابل للطي ومريح للرقبة من هنتر Hunter Laptop Stand",
    name_en: "Hunter Adjustable Foldable Aluminum Laptop & Tablet Stand",
    category: "accessories",
    brand: "Hunter",
    price: 420,
    old_price: 550,
    stock_quantity: 30,
    is_active: true,
    is_featured: false,
    is_preowned: false,
    warranty: "ضمان سنة",
    images: ["/product-images/hunter-aluminum-laptop-stand.jpg"],
    colors: ["فضي ألومنيوم"],
    specs: {
      "الخامة": "سبائك ألومنيوم مع وسادات سيليكون مانعة للانزلاق والخدش",
      "المستويات": "زوايا ارتفاع قابلة للتعديل لتحسين زاوية النظر وتبريد الجهاز",
      "التوافق": "يدعم كافة أجهزة اللابتوب والماك بوك من 10 إلى 17 بوصة"
    }
  },

  // 24. World Tag Apple Find My
  {
    id: "prod-world-tag-apple-findmy",
    name_ar: "ميدالية تتبع ذكية Smart World Tag متوافقة مع تطبيق Apple Find My",
    name_en: "Smart World Tag Location Tracker Works with Apple Find My",
    category: "accessories",
    brand: "WorldTag",
    price: 350,
    old_price: 480,
    stock_quantity: 50,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: "ضمان 12 شهر",
    images: ["/product-images/world-tag-apple-findmy.jpg"],
    colors: ["أبيض"],
    specs: {
      "الموديل": "World Tag",
      "التوافق": "يعمل مباشرة مع تطبيق Find My (تحديد الموقع) المدمج في نظام iOS",
      "بدون اشتراكات": "لا يحتاج إلى شريحة SIM أو رسوم شهرية، يستفيد من شبكة Apple العالمية المشفرة",
      "البطارية": "بطارية عملة CR2032 تدوم لأكثر من عام كامل وقابلة للاستبدال بسهولة",
      "المكبر الصوتي": "جرس مدمج عالي الصوت للبحث عن المفاتيح والشنط والمقتنيات المفقودة بسهولة"
    }
  },

  // 25. Bei Qi S7 Pro Smart Tasbih Ring
  {
    id: "prod-tasbih-beiqi-s7pro-smartring",
    name_ar: "خاتم تسبيح ذكي Bei Qi S7 Pro مع شاشة OLED واهتزاز عند الأرقام المميزة",
    name_en: "Bei Qi S7 Pro Smart Tasbih Zikr Ring 3-in-1 with OLED Display",
    category: "smartwatches",
    brand: "Bei Qi",
    price: 380,
    old_price: 500,
    stock_quantity: 40,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: "ضمان 6 شهور استبدال فوري",
    images: [
      "/product-images/tasbih-beiqi-s7pro-smartring.jpg",
      "/product-images/tasbih-beiqi-s7pro-finger.jpg",
      "/product-images/tasbih-beiqi-s7pro-palm.jpg",
      "/product-images/tasbih-beiqi-s7pro-box-side.jpg"
    ],
    colors: ["أسود بيانو فاخر"],
    specs: {
      "الموديل": "MODEL S7 Pro (3 in 1)",
      "المقاسات المرفقة": "يأتي في العلبة 3 مقاسات حلقة مختلفة (18 مم، 20 مم، 22 مم) ليناسب جميع الأصابع",
      "الشاشة": "شاشة OLED واضحة تعرض عداد التسبيح والساعة وتنبيهات الأوقات",
      "محرك الاهتزاز": "تنبيه اهتزازي خفيف ومميز عند الوصول إلى الأعداد 33 و 66 و 99 و 100",
      "البطارية والشحن": "شحن مغناطيسي سريع يدوم حتى 3 إلى 5 أيام من الاستخدام المتواصل",
      "التطبيق": "متوافق مع تطبيقات Zikr و iQIBLA لحفظ السجلات وتحديد اتجاه القبلة"
    }
  },

  // 26. nabi Kids 5G Smartwatch
  {
    id: "prod-nabi-kids-smartwatch-gps",
    name_ar: "ساعة أطفال ذكية nabi Kids بشريحة اتصال 5G وتحديد موقع GPS ومكالمات فيديو",
    name_en: "nabi Kids 5G GPS Smartwatch with Video Call & SOS",
    category: "smartwatches",
    brand: "nabi",
    price: 2500,
    old_price: 2850,
    stock_quantity: 15,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: "ضمان سنة كاملة ضد عيوب الصناعة",
    images: [
      "/product-images/nabi-kids-smartwatch-gps-box.jpg",
      "/product-images/nabi-kids-smartwatch-final.jpg",
      "/product-images/nabi-kids-smartwatch-side.jpg",
      "/product-images/nabi-kids-smartwatch-angle.jpg",
      "/product-images/nabi-kids-smartwatch-back.jpg"
    ],
    colors: ["أزرق سماوي", "وردي"],
    specs: {
      "الموديل": "WatchNabi Org Z17",
      "الاتصال والشبكة": "تدعم شريحة Nano SIM مع شبكات الجيل الخامس 5G LTE ومكالمات هاتفية مباشرة",
      "تحديد الموقع": "نظام GPS + LBS + Wi-Fi ثلاثي لتتبع دقيق لمكان طفلك وتحديد سياج جغرافي آمن",
      "الكاميرا": "كاميرا عالية الوضوح HD لمكالمات الفيديو المباشرة والاطمئنان على الطفل",
      "زر الاستغاثة SOS": "زر مخصص للطوارئ يتصل فوراً بهواتف الوالدين المسجلة عند الضغط المطول",
      "مقاومة الماء": "معيار حماية كامل ضد الماء لمقاومة غسيل اليدين واللعب"
    }
  },

  // 27. Haino Teko SQ-18 AMOLED
  {
    id: "prod-haino-teko-sq18-amoled",
    name_ar: "ساعة هاينو تيكو ألماني Haino Teko SQ-18 شاشة AMOLED مع 3 أحزمة ومكالمات بلوتوث",
    name_en: "Haino Teko SQ-18 German AMOLED Smartwatch with BT Call & 3 Pairs Strap",
    category: "smartwatches",
    brand: "Haino Teko",
    price: 1350,
    old_price: 1650,
    stock_quantity: 20,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: "ضمان 12 شهر معتمد",
    images: ["/product-images/haino-teko-sq18-amoled-box.jpg"],
    colors: ["رمادي مع 3 سترابات متنوعة"],
    specs: {
      "الموديل": "Haino Teko SQ-18 (Germany)",
      "نوع الشاشة": "AMOLED فائقة السطوع وألوان حقيقية مع خاصية Always-on Display",
      "الأحزمة المرفقة": "تأتي بـ 3 أحزمة مختلفة في العلبة (سيليكون رياضي + جلد كلاسيكي + قماش أنيق)",
      "المكالمات": "تدعم إجراء واستقبال المكالمات بوضوح عبر مكبر صوت ومايكروفون عالي النقاء",
      "مقاومة الماء": "معيار 1ATM Waterproof للاستخدام اليومي ومقاومة رذاذ الماء",
      "المستشعرات الصحية": "قياس معدل ضربات القلب، قياس الأكسجين بالدم SpO2، وتتبع الأنشطة الرياضية"
    }
  },

  // 28. Haino Teko SQ-17 Mini AMOLED
  {
    id: "prod-haino-teko-sq17-mini",
    name_ar: "ساعة هاينو تيكو ميني Haino Teko SQ-17 Mini شاشة AMOLED مع 3 أزواج ستراب",
    name_en: "Haino Teko SQ-17 Mini AMOLED Compact Smartwatch with 3 Pairs Strap",
    category: "smartwatches",
    brand: "Haino Teko",
    price: 1100,
    old_price: 1350,
    stock_quantity: 18,
    is_active: true,
    is_featured: false,
    is_preowned: false,
    warranty: "ضمان 12 شهر",
    images: [
      "/product-images/smartwatch-haino-teko-sq17-mini-1.jpg",
      "/product-images/smartwatch-haino-teko-sq17-mini-2.jpg"
    ],
    colors: ["فضي / ذهبي وردي"],
    specs: {
      "الموديل": "SQ-17 Mini",
      "التصميم": "حجم مدمج وأنيق يناسب معاصم اليد الرفيعة والمتوسطة",
      "الشاشة": "AMOLED نابضة بالحياة",
      "الملحقات": "3 أزواج ستراب مرفقة بالعلبة"
    }
  },

  // 29. Haino Teko AI Robot Ultra 3
  {
    id: "prod-haino-teko-ai-robot-ultra3",
    name_ar: "ساعة هاينو تيكو ألترا 3 بالذكاء الاصطناعي Haino Teko AI Translation Robot Ultra 3",
    name_en: "Haino Teko AI Translation Robot Ultra 3 AMOLED Smartwatch SIFLI-3",
    category: "smartwatches",
    brand: "Haino Teko",
    price: 1850,
    old_price: 2250,
    stock_quantity: 14,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: "ضمان 12 شهر",
    images: ["/product-images/smartwatch-haino-teko-ai-robot-ultra3.jpg"],
    colors: ["تيتانيوم برتقالي"],
    specs: {
      "الموديل": "AI Translation Robot Ultra 3 (SIFLI-3)",
      "الميزات الحصرية": "ترجمة فورية بالذكاء الاصطناعي AI Translation ومساعد ذكي AI Robot",
      "البطارية": "تدوم حتى 20 يوماً من الاستخدام المعتاد (20 DAYS Battery Power)",
      "الذاكرة والتخزين": "ذاكرة داخلية 1GB لتخزين الصور والموسيقى",
      "الشاشة والسترابات": "شاشة AMOLED كبيرة مع 3 أزواج أحزمة فاخرة"
    }
  },

  // 30. Haino Teko RW-78 / KW-78
  {
    id: "prod-haino-teko-rw78",
    name_ar: "ساعة هاينو تيكو الألمانية Haino Teko RW-78 شاشة AMOLED ومكالمات مع 3 أحزمة",
    name_en: "Haino Teko RW-78 / KW-78 AMOLED Waterproof Smartwatch with BT Call",
    category: "smartwatches",
    brand: "Haino Teko",
    price: 2300,
    old_price: 2600,
    stock_quantity: 12,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: "ضمان 12 شهر",
    images: ["/product-images/smartwatch-haino-teko-rw78.jpg"],
    colors: ["أسود ملكي"],
    specs: {
      "الموديل": "RW-78 / KW-78 Germany",
      "البطارية": "10 أيام استخدام متواصل 10 Days Use",
      "الشاشة": "شاشة AMOLED دائرية كلاسيكية فائقة النقاء",
      "المكالمات": "سماعة ومايكروفون عالي الوضوح لمكالمات الهاتف",
      "الأحزمة": "3 أحزمة متنوعة مرفقة بالعلبة"
    }
  },

  // 31. Haino Teko-26 AMOLED
  {
    id: "prod-haino-teko-26",
    name_ar: "ساعة هاينو تيكو 26 بطارية 15 يوم شاشة أموليد ومقاومة للماء مع 3 أحزمة",
    name_en: "Haino Teko-26 AMOLED 15-Day Battery Waterproof Smartwatch",
    category: "smartwatches",
    brand: "Haino Teko",
    price: 1450,
    old_price: 1750,
    stock_quantity: 16,
    is_active: true,
    is_featured: false,
    is_preowned: false,
    warranty: "ضمان 12 شهر",
    images: ["/product-images/smartwatch-haino-teko-26-amoled.jpg"],
    colors: ["فضي معدني"],
    specs: {
      "الموديل": "HainoTeko-26 Germany",
      "البطارية": "15 يوماً من الاستخدام الفعلي 15 DAYS of Normal Use",
      "الشاشة": "شاشة AMOLED نقية",
      "المكالمات": "BT Call ومقاومة للماء Waterproof",
      "الملحقات": "3 أزواج أحزمة"
    }
  },

  // 32. Haino Teko Richard M10 Luxury Tonneau
  {
    id: "prod-haino-teko-richard-m10",
    name_ar: "ساعة هاينو تيكو الفاخرة بتصميم ريتشارد ميل Haino Teko Richard M10",
    name_en: "Haino Teko Richard M10 Luxury Tonneau Curved Smartwatch 3 Straps",
    category: "smartwatches",
    brand: "Haino Teko",
    price: 1650,
    old_price: 1950,
    stock_quantity: 12,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: "ضمان 12 شهر",
    images: ["/product-images/smartwatch-haino-teko-richard-m10.jpg"],
    colors: ["إطار فضي مع برتقالي"],
    specs: {
      "الموديل": "Richard M10 Germany",
      "التصميم": "هيكل قوسي Tonneau انسيابي مستوحى من أفخم الساعات السويسرية",
      "الملحقات": "3 أزواج أحزمة فاخرة",
      "الميزات": "إشعارات كاملة، قياس المؤشرات الحيوية، والتحكم بالموسيقى"
    }
  },

  // 33. Haino Teko CS-4 30-Day Battery
  {
    id: "prod-haino-teko-cs4",
    name_ar: "ساعة هاينو تيكو بطارية شهر كامل Haino Teko CS-4 تدوم 30 يوماً ومقاومة للماء",
    name_en: "Haino Teko CS-4 30-Day Battery Power Waterproof Smartwatch",
    category: "smartwatches",
    brand: "Haino Teko",
    price: 1550,
    old_price: 1850,
    stock_quantity: 15,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: "ضمان 12 شهر",
    images: ["/product-images/smartwatch-haino-teko-cs4.jpg"],
    colors: ["أسود"],
    specs: {
      "الموديل": "CS-4 Waterproof",
      "البطارية الخارقة": "30 يوماً من الاستخدام 30 DAYS of Normal Use Battery Power",
      "المكالمات": "BT Call مع مايكروفون نقي",
      "الأحزمة": "3 أزواج ستراب مرفقة"
    }
  },

  // 34. Haino Teko-16 Super Slim
  {
    id: "prod-haino-teko-16",
    name_ar: "ساعة هاينو تيكو 16 سوبر سليم رفيعة جداً Haino Teko-16 Super Slim شاشة AMOLED",
    name_en: "Haino Teko-16 Super Slim AMOLED 7-Day Battery Smartwatch",
    category: "smartwatches",
    brand: "Haino Teko",
    price: 1250,
    old_price: 1500,
    stock_quantity: 18,
    is_active: true,
    is_featured: false,
    is_preowned: false,
    warranty: "ضمان 12 شهر",
    images: ["/product-images/smartwatch-haino-teko-16-superslim.jpg"],
    colors: ["أسود نحيف"],
    specs: {
      "الموديل": "HainoTeko-16 Super Slim",
      "الهيكل": "سماكة فائقة النحافة Super Slim مريحة جداً في اليد",
      "الشاشة": "AMOLED ملونة",
      "البطارية": "7 أيام استخدام مع مكالمات بلوتوث و3 أحزمة"
    }
  },

  // 35. Haino Teko-25 AMOLED
  {
    id: "prod-haino-teko-25",
    name_ar: "ساعة هاينو تيكو 25 شاشة أموليد وبطارية 15 يوم Haino Teko-25 مع 3 أحزمة",
    name_en: "Haino Teko-25 AMOLED 15-Day Battery Waterproof Smartwatch",
    category: "smartwatches",
    brand: "Haino Teko",
    price: 1400,
    old_price: 1700,
    stock_quantity: 14,
    is_active: true,
    is_featured: false,
    is_preowned: false,
    warranty: "ضمان 12 شهر",
    images: ["/product-images/smartwatch-haino-teko-25-amoled.jpg"],
    colors: ["رمادي"],
    specs: {
      "الموديل": "HainoTeko-25",
      "البطارية": "15 DAYS Normal Use",
      "المكالمات": "BT Call مع إمكانية الرد والاتصال المباشر",
      "الشاشة": "AMOLED مع 3 سترابات"
    }
  },

  // 36. Haino Teko G19 Mini
  {
    id: "prod-haino-teko-g19-mini",
    name_ar: "ساعة هاينو تيكو جي 19 ميني Haino Teko G19 Mini شاشة AMOLED ومكالمات",
    name_en: "Haino Teko G19 Mini AMOLED BT Call Smartwatch with 3 Straps",
    category: "smartwatches",
    brand: "Haino Teko",
    price: 1150,
    old_price: 1400,
    stock_quantity: 15,
    is_active: true,
    is_featured: false,
    is_preowned: false,
    warranty: "ضمان 12 شهر",
    images: ["/product-images/smartwatch-haino-teko-g19-mini.jpg"],
    colors: ["ذهبي / وردي"],
    specs: {
      "الموديل": "G19 Mini",
      "الحجم": "تصميم ميني عصري خفيف الوزن",
      "الشاشة": "AMOLED مع 3 أحزمة متنوعة"
    }
  },

  // 37. Haino Teko G15 Mini Series 10
  {
    id: "prod-haino-teko-g15-mini",
    name_ar: "ساعة هاينو تيكو جي 15 ميني سيريس 10 Haino Teko G15 Mini Series 10 مع 3 أحزمة",
    name_en: "Haino Teko G15 Mini Series 10 Smartwatch with 3 Pairs Strap",
    category: "smartwatches",
    brand: "Haino Teko",
    price: 1200,
    old_price: 1450,
    stock_quantity: 16,
    is_active: true,
    is_featured: false,
    is_preowned: false,
    warranty: "ضمان 12 شهر",
    images: ["/product-images/smartwatch-haino-teko-g15-mini.jpg"],
    colors: ["فضي تيتانيوم"],
    specs: {
      "الموديل": "G15 mini · Series 10",
      "الشاشة": "إطار فائق النحافة مستوحى من أحدث إصدارات الساعات الذكية",
      "الأحزمة": "3 أحزمة مرفقة"
    }
  },

  // 38. Haino Teko-32 AMOLED
  {
    id: "prod-haino-teko-32",
    name_ar: "ساعة هاينو تيكو 32 شاشة أموليد وبطارية 15 يوم ومقاومة للماء Haino Teko-32",
    name_en: "Haino Teko-32 AMOLED 15-Day Battery Waterproof Smartwatch",
    category: "smartwatches",
    brand: "Haino Teko",
    price: 1450,
    old_price: 1750,
    stock_quantity: 15,
    is_active: true,
    is_featured: false,
    is_preowned: false,
    warranty: "ضمان 12 شهر",
    images: ["/product-images/smartwatch-haino-teko-32-amoled.jpg"],
    colors: ["أسود"],
    specs: {
      "الموديل": "HainoTeko-32 Germany",
      "البطارية": "15 يوماً استخدام معتاد",
      "الشاشة": "AMOLED مقاومة للماء والخدش",
      "الملحقات": "3 أزواج ستراب"
    }
  },

  // 39. Haino Teko-33 AMOLED
  {
    id: "prod-haino-teko-33",
    name_ar: "ساعة هاينو تيكو 33 أموليد مع مكالمات وبطارية 15 يوم Haino Teko-33",
    name_en: "Haino Teko-33 AMOLED 15-Day Battery BT Call Smartwatch",
    category: "smartwatches",
    brand: "Haino Teko",
    price: 1450,
    old_price: 1750,
    stock_quantity: 15,
    is_active: true,
    is_featured: false,
    is_preowned: false,
    warranty: "ضمان 12 شهر",
    images: ["/product-images/smartwatch-haino-teko-33-amoled.jpg"],
    colors: ["فضي"],
    specs: {
      "الموديل": "HainoTeko-33 Germany",
      "الميزات": "AMOLED، بطارية 15 يوم، BT Call، و 3 أحزمة فاخرة"
    }
  },

  // 40. Haino Teko FG-8 5G Android Smartwatch
  {
    id: "prod-haino-teko-fg8-5g-android",
    name_ar: "ساعة أندرويد ذكية هاينو تيكو Haino Teko FG-8 تدعم 5G وتنزيل التطبيقات ومتجر Google Play",
    name_en: "Haino Teko FG-8 5G Android Smartwatch with Google Play & TikTok",
    category: "smartwatches",
    brand: "Haino Teko",
    price: 2450,
    old_price: 2900,
    stock_quantity: 10,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: "ضمان 12 شهر",
    images: ["/product-images/smartwatch-haino-teko-fg8-5g-android.jpg"],
    colors: ["أسود تيتانيوم"],
    specs: {
      "الموديل": "FG-8 Android 5G",
      "النظام": "نظام أندرويد كامل مستقل مع متجر Google Play لتنزيل كافة التطبيقات (WhatsApp, TikTok, Facebook)",
      "الشاشة": "Real AMOLED لمس كامل",
      "الاتصال": "شريحة اتصال 5G / 4G و Wi-Fi و GPS"
    }
  },

  // 41. Haino Teko-5 Super Slim
  {
    id: "prod-haino-teko-5-super-slim",
    name_ar: "ساعة هاينو تيكو 5 سوبر سليم شاشة أموليد ومقاومة للماء Haino Teko-5",
    name_en: "Haino Teko-5 Super Slim AMOLED Waterproof Smartwatch 3 Straps",
    category: "smartwatches",
    brand: "Haino Teko",
    price: 1300,
    old_price: 1550,
    stock_quantity: 15,
    is_active: true,
    is_featured: false,
    is_preowned: false,
    warranty: "ضمان 12 شهر",
    images: ["/product-images/smartwatch-haino-teko-5-superslim.jpg"],
    colors: ["أسود"],
    specs: {
      "الموديل": "HainoTeko-5 Super Slim",
      "السماكة": "نحافة فائقة وراحة قصوى أثناء الارتداء والنوم",
      "الملحقات": "3 أزواج أحزمة ومقاومة للماء"
    }
  },

  // 42. Haino Teko FG-11 5G Android Smartwatch
  {
    id: "prod-haino-teko-fg11-5g-android",
    name_ar: "ساعة هاينو تيكو أندرويد 5G طراز FG-11 شاشة أموليد تدعم أي تطبيق ومتجر Google Play",
    name_en: "Haino Teko FG-11 5G Android Smartwatch Google Play Any App Support",
    category: "smartwatches",
    brand: "Haino Teko",
    price: 2550,
    old_price: 3000,
    stock_quantity: 10,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: "ضمان 12 شهر",
    images: ["/product-images/smartwatch-haino-teko-fg11-5g-android.jpg"],
    colors: ["برتقالي / أسود"],
    specs: {
      "الموديل": "FG-11 Android 5G",
      "النظام والبرامج": "نظام أندرويد كامل، كاميرا، واي فاي، ومتجر جوجل بلاي",
      "الشاشة": "شاشة AMOLED كبيرة فائقة الوضوح"
    }
  },

  // 43. Haino Teko-29 AMOLED
  {
    id: "prod-haino-teko-29",
    name_ar: "ساعة هاينو تيكو 29 بطارية 7 أيام شاشة أموليد مع 3 أحزمة Haino Teko-29",
    name_en: "Haino Teko-29 AMOLED 7-Day Battery Waterproof Smartwatch",
    category: "smartwatches",
    brand: "Haino Teko",
    price: 1350,
    old_price: 1600,
    stock_quantity: 14,
    is_active: true,
    is_featured: false,
    is_preowned: false,
    warranty: "ضمان 12 شهر",
    images: ["/product-images/smartwatch-haino-teko-29-amoled.jpg"],
    colors: ["أسود"],
    specs: {
      "الموديل": "HainoTeko-29 Germany",
      "البطارية": "7 DAYS Normal Use",
      "المكالمات": "BT Call مع مقاومة للماء و3 أحزمة"
    }
  },

  // 44. X9 Pro 2 AMOLED Smart Watch
  {
    id: "prod-x9-pro2-amoled-smartwatch",
    name_ar: "ساعة ذكية إكس 9 برو 2 بشاشة أموليد وتصميم فائق الأناقة X9 Pro 2 AMOLED",
    name_en: "X9 Pro 2 AMOLED Smartwatch with Always-on Display & Health Tracking",
    category: "smartwatches",
    brand: "Generic",
    price: 1150,
    old_price: 1450,
    stock_quantity: 18,
    is_active: true,
    is_featured: false,
    is_preowned: false,
    warranty: "ضمان 6 شهور",
    images: ["/product-images/smartwatch-x9-pro2-amoled.jpg"],
    colors: ["تيتانيوم أسود"],
    specs: {
      "الموديل": "X9 Pro 2",
      "الشاشة": "شاشة AMOLED بمعدل تحديث سلس وألوان غنية",
      "الميزات": "إشعارات البرامج، مكالمات بلوتوث، وتتبع نبضات القلب والنشاط الرياضي"
    }
  },

  // 45. W&O X10 Ultra Smart Watch
  {
    id: "prod-wo-x10-ultra-smartwatch",
    name_ar: "ساعة ذكية دبليو آند أو إكس 10 ألترا W&O X10 Ultra بنظام Wearfit Pro",
    name_en: "W&O X10 Ultra AMOLED Smartwatch with Wearfit OS",
    category: "smartwatches",
    brand: "W&O",
    price: 1250,
    old_price: 1550,
    stock_quantity: 16,
    is_active: true,
    is_featured: false,
    is_preowned: false,
    warranty: "ضمان 6 شهور",
    images: ["/product-images/smartwatch-wo-x10-ultra.jpg"],
    colors: ["فضي مع ستراب برتقالي"],
    specs: {
      "الموديل": "X10 Ultra",
      "النظام": "Wearfit OS فائق الاستجابة",
      "التصميم": "هيكل ألترا قوي بحواف مرتفعة لحماية الشاشة من الصدمات"
    }
  },

  // 46. Telzeal S11 Ultra 3 Robot Smart Watch
  {
    id: "prod-telzeal-s11-ultra3-robot",
    name_ar: "ساعة تيلزيل الذكية Telzeal S11 Ultra 3 Robot شاشة AMOLED ومكتبة قراءة وذاكرة صوتية",
    name_en: "Telzeal S11 Ultra 3 Robot AMOLED Smartwatch with Ebook & Local Music",
    category: "smartwatches",
    brand: "Telzeal",
    price: 1450,
    old_price: 1800,
    stock_quantity: 15,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: "ضمان 12 شهر",
    images: ["/product-images/smartwatch-telzeal-s11-ultra3-robot.jpg"],
    colors: ["تيتانيوم"],
    specs: {
      "الموديل": "Telzeal S11 Ultra 3 Robot",
      "الميزات": "تشغيل الموسيقى المستقلة Local Music، قارئ الكتب الإلكترونية wrist Ebook، وخلفيات ذكاء اصطناعي AI Watch Face",
      "الشحن والأحزمة": "شحن لاسلكي Wireless Charging مع 3 أزواج ستراب مرفقة"
    }
  },

  // 47. Santa Barbara Polo Genuine Leather Cases
  {
    id: "prod-case-santa-barbara-polo-leather",
    name_ar: "كفر جلد طبيعي فاخر سانتا باربارا بولو Santa Barbara Polo & Racquet Club - 4 ألوان",
    name_en: "Santa Barbara Polo & Racquet Club Luxury Genuine Leather Phone Case",
    category: "cases_protection",
    brand: "Santa Barbara Polo",
    price: 250,
    old_price: 350,
    stock_quantity: 35,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: "ضمان خامات وجودة تصنيع",
    images: [
      "/product-images/case-santa-barbara-polo-leather-4colors.jpg",
      "/product-images/case-santa-barbara-polo-leather-hand.jpg",
      "/product-images/case-santa-barbara-polo-leather-detail.jpg"
    ],
    colors: ["هافان / تان", "أزرق كحلي", "أوف وايت", "أسود ملكي"],
    specs: {
      "الخامة": "جلد طبيعي فاخر Genuine Leather بخياطة دقيقة وشعار بولو المعدني البارز",
      "حماية الكاميرا": "إطار مرتفع مخصص لحماية عدسات ومنصة الكاميرا",
      "الملمس": "ملمس فخم مقاوم للبصمات والخدوش مع قبضة محكمة ومريحة في اليد",
      "التوافق": "متوفر لهواتف آيفون 15 و 16 و 17 برو ماكس"
    }
  },

  // 48. Cute Wavy Silicone Case Collection
  {
    id: "prod-case-wavy-cute-collection",
    name_ar: "جراب كفر مموج فاشون كيرلي Cute Wavy Edge بحزام لؤلؤي أنيق ونقشات متنوعة",
    name_en: "Cute Wavy Curly Edge Silicone Case Collection with Beaded Pearl Lanyard",
    category: "cases_protection",
    brand: "Sunfa",
    price: 150,
    old_price: 200,
    stock_quantity: 40,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: "ضمان الجودة",
    images: [
      "/product-images/case-wavy-collection-4in-hand.jpg",
      "/product-images/case-sunfa-bow-pearl-lanyard.jpg",
      "/product-images/case-wavy-butterflies.jpg",
      "/product-images/case-wavy-leopard-hearts.jpg",
      "/product-images/case-sunfa-bow-dots.jpg",
      "/product-images/case-wavy-collection-table.jpg"
    ],
    colors: ["فراشات ملونة", "قلوب تايجر", "فيونكات Sunfa مع لؤلؤ", "فيونكات ناعمة"],
    specs: {
      "التصميم": "حواف مموجة كيرلي Wavy Edge جذابة ومريحة جداً في المسكة",
      "المرفقات": "حزام معصم لؤلؤي مزين بفراشات أكريليك كريستالية فائقة الأناقة",
      "الخامة": "سيليكون مرن ناعم وممتص للصدمات لحماية جوانب الهاتف بالكامل"
    }
  },

  // 49. 3D Embossed Bow Matte iPhone Case
  {
    id: "prod-case-3d-embossed-bows",
    name_ar: "كفر آيفون مطفي ثلاثي الأبعاد بفيونكات بارزة 3D Embossed Bows مع حزام لؤلؤ",
    name_en: "3D Embossed Bow Matte iPhone Case with Elegant Pearl Wristlet",
    category: "cases_protection",
    brand: "Generic",
    price: 175,
    old_price: 240,
    stock_quantity: 45,
    is_active: true,
    is_featured: true,
    is_preowned: false,
    warranty: "ضمان الجودة",
    images: [
      "/product-images/case-3d-embossed-bow-5colors-palette.jpg",
      "/product-images/case-3d-embossed-bow-black.jpg",
      "/product-images/case-3d-embossed-bow-cream.jpg",
      "/product-images/case-3d-embossed-bow-pink-lanyard.jpg",
      "/product-images/case-3d-embossed-bow-winered.jpg"
    ],
    colors: ["أسود مطفي", "أوف وايت كريمي", "بيبي بينك ناعم", "فوشيا جريء", "نبيتي بوردو فاخر"],
    specs: {
      "التصميم": "فيونكات ثلاثية الأبعاد بارزة 3D Sculpted Bows تعطي لمسة جمالية استثنائية",
      "الخامة": "خامة سيليكون مطفي ناعم الملمس مضاد للبصمات والتعرق",
      "الملحقات": "سلسلة معصم من اللؤلؤ الصناعي عالي الجودة مع فيونكة أنيقة",
      "حماية الكاميرا": "إطار مرتفع بارز لحماية عدسات الكاميرا الخلفية"
    }
  },

  // 50. iPhone MagSafe Clear Case Camera Control
  {
    id: "prod-case-iphone-magsafe-clear-camera-control",
    name_ar: "جراب شفاف ماج سيف مع فتحة زر الكاميرا الجديد Camera Control لهواتف آيفون",
    name_en: "iPhone MagSafe Clear Case with Camera Control Cutout & Drop Protection",
    category: "cases_protection",
    brand: "Generic",
    price: 120,
    old_price: 180,
    stock_quantity: 50,
    is_active: true,
    is_featured: false,
    is_preowned: false,
    warranty: "ضمان ضد الاصفرار السريع",
    images: ["/product-images/case-iphone-magsafe-clear-camera-control.jpg"],
    colors: ["شفاف كريستالي"],
    specs: {
      "الشفافية": "بولي كربونات نقي فائق الشفافية لإظهار لون الهاتف الأصلي",
      "الماج سيف": "حلقة مغناطيسية مدمجة قوية تدعم الشواحن والمحفظات اللاسلكية",
      "زر الكاميرا": "فتحة مقطوعة بدقة لزر Camera Control لتشغيل والتقاط الصور بسلاسة"
    }
  },

  // 51. Alpine Loop Titanium G-Hook Watch Straps
  {
    id: "prod-strap-alpine-loop-g-hook",
    name_ar: "سوار ألبين لوب تيتانيوم لساعات آبل وهاينو تيكو Alpine Loop Watch Strap",
    name_en: "Alpine Loop Titanium G-Hook Watch Strap for Apple Watch & Smartwatches",
    category: "accessories",
    brand: "Generic",
    price: 120,
    old_price: 170,
    stock_quantity: 60,
    is_active: true,
    is_featured: false,
    is_preowned: false,
    warranty: "ضمان الجودة",
    images: ["/product-images/strap-alpine-loop-titanium-ghook-4colors.jpg"],
    colors: ["أوف وايت ستارلايت", "نبيتي غامق", "زيتي عسكري", "أسود كربوني"],
    specs: {
      "المشبك": "مشبك حرف G مصنوع من سبائك التيتانيوم الخفيف والمقاوم للصدأ",
      "النسيج": "نسيج قماشي مزدوج عالي المرونة والتحمل ومريح في المعصم طوال اليوم",
      "التوافق": "متوافق مع مقاسات 42/44/45/49 مم لساعات Apple Watch Ultra وجميع الساعات الذكية"
    }
  },

  // 52. IA-OIS 9H Aluminum Camera Lens Plateau Protector
  {
    id: "prod-camera-lens-protector-ia-ois",
    name_ar: "واقي عدسات ومنصة الكاميرا كاملة IA-OIS بإطار ألومنيوم وزجاج 9H للأجهزة الحديثة",
    name_en: "IA-OIS Full Camera Lens Plateau Protector 9H Tempered Glass Aluminum Frame",
    category: "cases_protection",
    brand: "IA-OIS",
    price: 120,
    old_price: 180,
    stock_quantity: 60,
    is_active: true,
    is_featured: false,
    is_preowned: false,
    warranty: "ضمان الحماية ضد الخدش",
    images: [
      "/product-images/camera-lens-plateau-protector-colors.jpg",
      "/product-images/camera-lens-protector-ia-ois-box.jpg"
    ],
    colors: ["أسود تيتانيوم", "بنفسجي غامق", "أزرق فاتح"],
    specs: {
      "الصلابة": "زجاج مقسى بدرجة صلابة 9H مقاوم للخدوش والصدمات المباشرة",
      "الإطار": "إطار سبائك ألومنيوم طيران مطلي بنفس درجات ألوان الهواتف الرسمية",
      "الوضوح": "طبقة مضادة للبصمات والوهج AR+AF تضمن نقاء تام لصور الكاميرا والفلاش الليلي"
    }
  },

  // 53. Apple Watch Bumper Case with Integrated Glass
  {
    id: "prod-apple-watch-bumper-integrated-glass",
    name_ar: "جراب حماية متكامل لساعة آبل مع اسكرينة زجاج مدمجة Apple Watch Bumper Guard",
    name_en: "Apple Watch 360 Full Bumper Case with Integrated 9H Tempered Screen Guard",
    category: "cases_protection",
    brand: "Generic",
    price: 90,
    old_price: 130,
    stock_quantity: 50,
    is_active: true,
    is_featured: false,
    is_preowned: false,
    warranty: "ضمان ضد الكسر",
    images: [
      "/product-images/case-apple-watch-bumper-screen-set.jpg",
      "/product-images/case-apple-watch-ultra-bumper.jpg",
      "/product-images/case-apple-watch-packaging-front.jpg",
      "/product-images/case-apple-watch-packaging-back.jpg"
    ],
    colors: ["شفاف كلير", "أبيض مطفي", "أسود كربوني", "كحلي ميدنايت"],
    specs: {
      "الحماية الشاملة": "حماية 360 درجة تجمع بين بامبر للصدمات واسكرينة زجاجية مدمجة شديدة النقاء واللمس السلس",
      "الحساسية": "استجابة لمسية فورية 100% Touch Friendly دون أي بطء أو فراغات هوائية",
      "التركيب": "تركيب مباشر سهل بنظام الكبس Snap-on دون الحاجة لفك ستراب الساعة"
    }
  }
];

async function main() {
  console.log(`Starting intake of ${allWhatsAppProducts.length} verified products into Neon PostgreSQL...`);

  let insertedCount = 0;
  let updatedCount = 0;

  for (const p of allWhatsAppProducts) {
    const existing = await sql`SELECT id FROM products WHERE id = ${p.id}`;
    
    if (existing.length > 0) {
      // Update
      await sql`
        UPDATE products SET
          name_ar = ${p.name_ar},
          name_en = ${p.name_en},
          category = ${p.category},
          brand = ${p.brand},
          price = ${p.price},
          old_price = ${p.old_price},
          stock_quantity = ${p.stock_quantity},
          is_active = ${p.is_active},
          is_featured = ${p.is_featured},
          is_preowned = ${p.is_preowned},
          warranty = ${p.warranty},
          images = ${JSON.stringify(p.images)},
          colors = ${JSON.stringify(p.colors)},
          specs = ${JSON.stringify(p.specs)},
          updated_at = NOW()
        WHERE id = ${p.id}
      `;
      updatedCount++;
      console.log(`Updated: [${p.id}] - ${p.name_ar}`);
    } else {
      // Insert
      await sql`
        INSERT INTO products (
          id, name_ar, name_en, category, brand, price, old_price,
          stock_quantity, is_active, is_featured, is_preowned,
          warranty, images, colors, specs, created_at, updated_at
        ) VALUES (
          ${p.id}, ${p.name_ar}, ${p.name_en}, ${p.category}, ${p.brand},
          ${p.price}, ${p.old_price}, ${p.stock_quantity}, ${p.is_active},
          ${p.is_featured}, ${p.is_preowned}, ${p.warranty},
          ${JSON.stringify(p.images)}, ${JSON.stringify(p.colors)},
          ${JSON.stringify(p.specs)}, NOW(), NOW()
        )
      `;
      insertedCount++;
      console.log(`Inserted: [${p.id}] - ${p.name_ar}`);
    }
  }

  console.log(`Ingest complete! Total Inserted: ${insertedCount}, Total Updated: ${updatedCount}`);
  
  // Total in products table
  const total = await sql`SELECT COUNT(*) as count FROM products`;
  console.log(`Total products in Neon DB now: ${total[0].count}`);
}

main().catch(console.error);
