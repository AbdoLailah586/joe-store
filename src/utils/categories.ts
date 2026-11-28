import type { CategoryKey, CustomCategory, Product } from '../types';

export interface ChargingSubSection {
  key: string;
  group: 'chargers' | 'cables';
  targetCategory: CategoryKey;
  ar: string;
  en: string;
  desc_ar: string;
  desc_en: string;
  image: string;
  keywords: RegExp;
}

export const STORE_CATEGORIES: CustomCategory[] = [
  // الهواتف (منفصلة لآيفون + زراير بوضوح)
  {
    key: 'iphones',
    name_ar: 'هواتف آيفون',
    name_en: 'iPhones',
    image: '/product-images/cat-iphone-16pm.jpg',
  },
  {
    key: 'feature_phones',
    name_ar: 'هواتف زراير',
    name_en: 'Feature Phones',
    image: '/product-images/cat-feature-phone-nokia.jpg',
  },
  // الشواحن والكابلات (أقسام منفصلة)
  {
    key: 'chargers',
    name_ar: 'شواحن جدارية وسريعة',
    name_en: 'Fast Wall Chargers',
    image: '/product-images/onmust-zolo-30w-studio.jpg',
  },
  {
    key: 'cables',
    name_ar: 'كابلات الشحن والداتا',
    name_en: 'Charging Cables',
    image: '/product-images/4eb8c59128f84c84a66cd390.webp',
  },
  {
    key: 'car_chargers',
    name_ar: 'شواحن سيارات',
    name_en: 'Car Chargers',
    image: '/product-images/b5e6d3bea2ecc40b6fd50a29.webp',
  },
  {
    key: 'wireless_chargers',
    name_ar: 'شواحن لاسلكية MagSafe',
    name_en: 'Wireless Chargers',
    image: '/product-images/cat-wireless-charger.jpg',
  },
  // السماعات والصوتيات (منفصلة لهيدسيت وهيدفون)
  {
    key: 'headsets',
    name_ar: 'سماعات هيدسيت وإيربودز',
    name_en: 'Headsets & Earbuds',
    image: '/product-images/3c06d2c8e8216b7d3f06254a.webp',
  },
  {
    key: 'headphones',
    name_ar: 'سماعات هيدفون',
    name_en: 'Headphones',
    image: '/product-images/f6427a20c128ea77c56bc426.webp',
  },
  // الساعات الذكية والباور بانك والجرابات
  {
    key: 'smartwatches',
    name_ar: 'ساعات ذكية',
    name_en: 'Smartwatches',
    image: '/product-images/cat-apple-watch-ultra.jpg',
  },
  {
    key: 'powerbanks',
    name_ar: 'باور بانك',
    name_en: 'Power Banks',
    image: '/product-images/15c3630cb4bb430b367edd7f.webp',
  },
  {
    key: 'cases_protection',
    name_ar: 'كفرات وجرابات',
    name_en: 'Cases & Covers',
    image: '/product-images/case-xinreeu-frosted-orange-ip17promax.jpg',
  },
  // إكسسوارات مقسمة لأقسام كثيرة واضحة
  {
    key: 'screen_protectors',
    name_ar: 'اسكرينات وحماية العدسات',
    name_en: 'Screen & Lens Guards',
    image: '/product-images/a792cefeb7c50327e00a5792.png',
  },
  {
    key: 'smart_rings',
    name_ar: 'خواتم التسبيح الذكية',
    name_en: 'Smart Tasbih Rings',
    image: '/product-images/tasbih-beiqi-s7pro-studio.png',
  },
  {
    key: 'holders_stands',
    name_ar: 'حوامل وترايبود',
    name_en: 'Holders & Stands',
    image: '/product-images/1eb83468cd59fda0e5a9ca9a.webp',
  },
  {
    key: 'straps_bands',
    name_ar: 'أساور وحماية الساعات',
    name_en: 'Watch Straps & Bumpers',
    image: '/product-images/strap-alpine-loop-titanium-ghook-4colors.jpg',
  },
  {
    key: 'photography_mics',
    name_ar: 'مايكات ومعدات تصوير',
    name_en: 'Mics & Gimbals',
    image: '/product-images/m1-gimbal-stabilizer-studio.png',
  },
  {
    key: 'trackers',
    name_ar: 'أجهزة تتبع ذكية',
    name_en: 'Smart Trackers',
    image: '/product-images/world-tag-apple-findmy-studio.jpg',
  },
  {
    key: 'car_accessories',
    name_ar: 'مستلزمات وطوارئ السيارات',
    name_en: 'Car Accessories',
    image: '/product-images/earldom-js02-studio.png',
  },
  {
    key: 'speakers',
    name_ar: 'مكبرات صوت سبيكر',
    name_en: 'Bluetooth Speakers',
    image: '/product-images/3af3d5bd2ec35679a678251e.webp',
  },
  {
    key: 'adapters',
    name_ar: 'محولات ووصلات OTG',
    name_en: 'Adapters & Hubs',
    image: '/product-images/4312cb7f98e9ef14a712461d.webp',
  },
];

export const CATEGORY_LABEL_MAP: Record<string, { ar: string; en: string }> = {
  all: { ar: 'جميع الأقسام', en: 'All Categories' },
  smartphones: { ar: 'الهواتف الذكية', en: 'Smartphones' },
  audio: { ar: 'سماعات وصوتيات', en: 'Audio & Earbuds' },
  chargers_cables: { ar: 'شواحن وكابلات', en: 'Chargers & Cables' },
  desktop_chargers: { ar: 'محطات شحن مكتبية', en: 'Desktop Charging Stations' },
  printers: { ar: 'طابعات محمولة وملحقاتها', en: 'Portable Printers' },
  gaming: { ar: 'أجهزة وإكسسوارات الألعاب', en: 'Gaming Consoles & Gear' },
  accessories: { ar: 'إكسسوارات متنوعة', en: 'Accessories' },
  ...Object.fromEntries(
    STORE_CATEGORIES.map((c) => [c.key, { ar: c.name_ar, en: c.name_en }])
  ),
};

export function getCategoryLabel(key: string, isAr: boolean): string {
  const entry = CATEGORY_LABEL_MAP[key];
  if (entry) return isAr ? entry.ar : entry.en;
  return key;
}

export const CHARGING_SUBSECTIONS: ChargingSubSection[] = [
  // Cables subsections
  {
    key: 'iphone_lightning',
    group: 'cables',
    targetCategory: 'cables',
    ar: 'كابلات آيفون (Lightning)',
    en: 'iPhone Lightning Cables',
    desc_ar: 'USB-C و USB-A إلى Lightning شحن سريع PD',
    desc_en: 'USB-C & USB-A to Lightning PD Fast Charge',
    image: '/product-images/cat-cable-lightning.jpg',
    keywords: /lightning|لايتن|ايفون|آيفون|iphone/i,
  },
  {
    key: 'typec_to_typec',
    group: 'cables',
    targetCategory: 'cables',
    ar: 'كابلات تايب سي إلى تايب سي (C-to-C)',
    en: 'Type-C to Type-C Cables',
    desc_ar: 'قدرات 60W و 100W للآيفون الحديث واللابتوب والأندرويد',
    desc_en: '60W / 100W PD cables for iPhone 15-17, Mac & Android',
    image: '/product-images/4eb8c59128f84c84a66cd390.webp',
    keywords: /type-c\s*(to|إلى)\s*type-c|c\s*to\s*c|100w|تايب سي إلى تايب سي/i,
  },
  {
    key: 'usba_to_typec',
    group: 'cables',
    targetCategory: 'cables',
    ar: 'كابلات USB-A إلى تايب سي',
    en: 'USB-A to Type-C Cables',
    desc_ar: 'كابلات شحن سريع مضفرة ضد القطع مع بيانات عالية السرعة',
    desc_en: 'Braided fast charging USB-A to USB-C cables',
    image: '/product-images/8e0a1e7f57c1dd5cc349b355.webp',
    keywords: /usb-a|usb to type-c|66w|تايب سي/i,
  },
  {
    key: 'micro_usb',
    group: 'cables',
    targetCategory: 'cables',
    ar: 'كابلات مايكرو Micro-USB',
    en: 'Micro-USB Cables',
    desc_ar: 'كابلات أصلية متينة للشحن اليومي والأجهزة المتوافقة',
    desc_en: 'Durable Micro-USB data & charging cables',
    image: '/product-images/271c81425e45f9f1b42b278a.webp',
    keywords: /micro|مايكرو/i,
  },
  {
    key: 'multi_3in1',
    group: 'cables',
    targetCategory: 'cables',
    ar: 'كابلات 3×1 متعددة و AUX',
    en: '3-in-1 Multi & AUX Cables',
    desc_ar: 'كابل واحد يشغّل Lightning و Type-C و Micro معاً + كابلات صوت',
    desc_en: 'All-in-one multi-connector cables & audio AUX',
    image: '/product-images/4312cb7f98e9ef14a712461d.webp',
    keywords: /3\s*in\s*1|3×1|aux|متعدد|otg/i,
  },
  // Chargers subsections
  {
    key: 'wall_gan_fast',
    group: 'chargers',
    targetCategory: 'chargers',
    ar: 'شواحن جدارية فائقة السرعة (45W–67W GaN)',
    en: 'High-Power GaN Wall Chargers (45W–67W)',
    desc_ar: 'شحن ذكي بتقنية GaN منفذ أو منفذين لهواتف الفلاجشيب واللابتوب',
    desc_en: 'Single & dual port GaN III ultra-fast PD adapters',
    image: '/product-images/hunter-67w-gan-box.jpg',
    keywords: /45w|67w|ai gan|سوبر فاست/i,
  },
  {
    key: 'mini_20w_30w',
    group: 'chargers',
    targetCategory: 'chargers',
    ar: 'شواحن ميني سريعة (20W – 30W PD)',
    en: 'Compact Mini Chargers (20W–30W)',
    desc_ar: 'أحجام مدمجة للشحن الآمن والسريع لآيفون وسامسونج',
    desc_en: 'Ultra-compact PD 20W, 25W & 30W travel adapters',
    image: '/product-images/onmust-zolo-30w-studio.jpg',
    keywords: /20w|25w|30w|mini|ميني|zolo/i,
  },
  {
    key: 'car_pd',
    group: 'chargers',
    targetCategory: 'car_chargers',
    ar: 'شواحن سيارات سريعة (PD + QC3.0)',
    en: 'Fast Car Chargers',
    desc_ar: 'منافذ مزدوجة وشحن سريع داخل السيارة لجميع الهواتف',
    desc_en: 'Dual-port PD & Quick Charge car adapters',
    image: '/product-images/b5e6d3bea2ecc40b6fd50a29.webp',
    keywords: /car|سيارة|سيارات|qc3\.?0/i,
  },
  {
    key: 'wireless_qi',
    group: 'chargers',
    targetCategory: 'wireless_chargers',
    ar: 'شواحن لاسلكية MagSafe & Qi',
    en: 'MagSafe & Qi Wireless Chargers',
    desc_ar: 'قواعد شحن مغناطيسية ولاسلكية سريعة 15 واط بدون سلك',
    desc_en: '15W Magnetic MagSafe & Qi wireless pads',
    image: '/product-images/cat-wireless-charger.jpg',
    keywords: /wireless|magsafe|qi|لاسلكي|مغناطيسي/i,
  },
  {
    key: 'desktop_stations',
    group: 'chargers',
    targetCategory: 'chargers',
    ar: 'مشتركات ومنصات شحن متعددة المنافذ',
    en: 'Multi-Port Charging Hubs',
    desc_ar: 'تشحن أكتر من موبايل وتابلت في نفس الوقت بكفاءة عالية',
    desc_en: 'Multi-port hubs & desktop charging adapters',
    image: '/product-images/banner-hunter-charging-series.jpg',
    keywords: /dual|منفذي|مزدوج|مكتبي|منصة/i,
  },
];

const CHARGING_CATEGORY_KEYS = new Set<string>([
  'chargers_cables',
  'chargers',
  'cables',
  'car_chargers',
  'wireless_chargers',
  'desktop_chargers',
]);

export const isChargingCategory = (category: string): boolean => CHARGING_CATEGORY_KEYS.has(category);

const GROUP_CHILDREN: Record<string, string[]> = {
  chargers_cables: ['chargers_cables', 'chargers', 'cables', 'car_chargers', 'wireless_chargers', 'desktop_chargers'],
  smartphones: ['smartphones', 'iphones', 'feature_phones'],
  audio: ['audio', 'headsets', 'headphones', 'photography_mics', 'speakers'],
  accessories: [
    'accessories',
    'screen_protectors',
    'smart_rings',
    'holders_stands',
    'straps_bands',
    'trackers',
    'car_accessories',
    'photography_mics',
    'adapters',
  ],
};

export function productMatchesCategory(product: Product, category: CategoryKey): boolean {
  if (!category || category === 'all') return true;
  if (product.category === category) return true;
  const children = GROUP_CHILDREN[category];
  if (children) return children.includes(product.category);
  return false;
}

export function countProductsInCategory(products: Product[], category: CategoryKey): number {
  return products.filter((p) => p.is_active !== false && productMatchesCategory(p, category)).length;
}

export function productMatchesSubsection(product: Product, subKey: string): boolean {
  const sub = CHARGING_SUBSECTIONS.find((s) => s.key === subKey);
  if (!sub) return true;
  const text = `${product.name_ar} ${product.name_en} ${product.brand} ${product.description_ar || ''} ${Object.values(product.specs || {}).join(' ')}`;
  if (product.category === sub.targetCategory && sub.keywords.test(text)) return true;
  if (productMatchesCategory(product, 'chargers_cables') && sub.keywords.test(text)) return true;
  return product.category === sub.targetCategory && sub.targetCategory !== 'cables' && sub.targetCategory !== 'chargers';
}
