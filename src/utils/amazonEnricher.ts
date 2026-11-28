import { Product, ProductFeatureBanner, CustomerReviewItem, RatingBreakdown, CategoryKey } from '../types';

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

export interface ComparisonFieldConfig {
  label_ar: string;
  label_en: string;
  aliases: string[];
}

export interface ComparisonRow {
  label: string;
  currentValue: string;
  compValues: { id: string; value: string }[];
}

const CHARGER_CABLE_FIELDS: ComparisonFieldConfig[] = [
  { label_ar: 'الموديل والطراز', label_en: 'Model', aliases: ['الموديل', 'الموديل ورقم الطراز', 'اسم الطراز', 'model'] },
  { label_ar: 'القدرة والشحن السريع', label_en: 'Power & Fast Charging', aliases: ['القدرة', 'القدرة القصوى', 'القدرة القصوى (Max Power)', 'بروتوكولات الشحن السريع', 'التقنية'] },
  { label_ar: 'نوع المنفذ / المنافذ', label_en: 'Ports', aliases: ['المنفذ', 'نوع المنفذ', 'المنافذ', 'عدد المنافذ'] },
  { label_ar: 'نوع الفيشة', label_en: 'Plug Type', aliases: ['نوع الفيشة', 'الفيشة'] },
  { label_ar: 'أنظمة الحماية والأمان', label_en: 'Thermal & Safety Protection', aliases: ['الحماية', 'الأمان', 'تقنية إدارة الحرارة', 'أنظمة الحماية والأمان', 'أنظمة الأمان'] },
  { label_ar: 'الأجهزة المتوافقة', label_en: 'Compatibility', aliases: ['الأجهزة المتوافقة', 'التوافق'] },
  { label_ar: 'الضمان', label_en: 'Warranty', aliases: ['الضمان', 'فترة الضمان'] }
];

const PHONE_FIELDS: ComparisonFieldConfig[] = [
  { label_ar: 'الموديل والطراز', label_en: 'Model', aliases: ['الموديل', 'الموديل ورقم الطراز', 'اسم الطراز'] },
  { label_ar: 'سعة التخزين', label_en: 'Storage', aliases: ['سعة التخزين', 'التخزين', 'الذاكرة الداخلية', 'storage'] },
  { label_ar: 'صحة البطارية', label_en: 'Battery Health', aliases: ['صحة البطارية', 'نسبة البطارية', 'حالة البطارية'] },
  { label_ar: 'حالة الجهاز', label_en: 'Condition', aliases: ['حالة الجهاز', 'الحالة'] },
  { label_ar: 'المعالج', label_en: 'Processor', aliases: ['المعالج', 'المعالج (Chip)', 'نوع المعالج'] },
  { label_ar: 'الشاشة', label_en: 'Display', aliases: ['الشاشة', 'الشاشة (Display)', 'نوع الشاشة'] },
  { label_ar: 'الكاميرا', label_en: 'Camera', aliases: ['الكاميرا', 'الكاميرا الخلفية', 'دقة الكاميرا'] },
  { label_ar: 'الشحن اللاسلكي', label_en: 'Wireless Charging', aliases: ['الشحن اللاسلكي', 'MagSafe'] },
  { label_ar: 'الضمان', label_en: 'Warranty', aliases: ['الضمان'] }
];

const AUDIO_FIELDS: ComparisonFieldConfig[] = [
  { label_ar: 'الموديل والطراز', label_en: 'Model', aliases: ['الموديل', 'اسم الطراز', 'الموديل ورقم الطراز'] },
  { label_ar: 'عمر البطارية وساعات التشغيل', label_en: 'Battery Life', aliases: ['عمر البطارية', 'ساعات التشغيل', 'البطارية'] },
  { label_ar: 'تقنية عزل الضوضاء', label_en: 'Noise Cancellation', aliases: ['عزل الضوضاء', 'تقنية عزل المكالمات', 'عزل الضوضاء النشط ANC', 'عزل المكالمات ENC'] },
  { label_ar: 'إصدار البلوتوث', label_en: 'Bluetooth Version', aliases: ['البلوتوث', 'إصدار البلوتوث', 'نسخة البلوتوث'] },
  { label_ar: 'الشحن اللاسلكي', label_en: 'Wireless Charging', aliases: ['الشحن اللاسلكي', 'تقنية الشحن'] },
  { label_ar: 'مقاومة الماء والتعرق', label_en: 'Water Resistance', aliases: ['مقاومة الماء', 'مقاومة الماء والتعرق', 'معيار مقاومة الماء'] },
  { label_ar: 'الضمان', label_en: 'Warranty', aliases: ['الضمان'] }
];

const ACCESSORY_FIELDS: ComparisonFieldConfig[] = [
  { label_ar: 'الموديل والطراز', label_en: 'Model', aliases: ['الموديل', 'اسم الطراز'] },
  { label_ar: 'طريقة التوصيل والمنفذ', label_en: 'Connection Type', aliases: ['نوع المنفذ', 'طريقة التوصيل', 'المنفذ', 'الاتصال والتطبيق'] },
  { label_ar: 'الأجهزة المتوافقة', label_en: 'Compatibility', aliases: ['التوافق', 'الأجهزة المدعومة', 'الموديل المتوافق'] },
  { label_ar: 'الخامة والتصميم', label_en: 'Material & Design', aliases: ['الخامة', 'المادة', 'علبة الشحن'] },
  { label_ar: 'الضمان', label_en: 'Warranty', aliases: ['الضمان'] }
];

export const CATEGORY_SPEC_FIELDS: Record<CategoryKey, ComparisonFieldConfig[]> = {
  chargers_cables: CHARGER_CABLE_FIELDS,
  chargers: CHARGER_CABLE_FIELDS,
  cables: CHARGER_CABLE_FIELDS,
  car_chargers: CHARGER_CABLE_FIELDS,
  wireless_chargers: CHARGER_CABLE_FIELDS,
  desktop_chargers: CHARGER_CABLE_FIELDS,
  powerbanks: [
    { label_ar: 'الموديل والطراز', label_en: 'Model', aliases: ['الموديل', 'الموديل ورقم الطراز', 'اسم الطراز'] },
    { label_ar: 'سعة البطارية (mAh)', label_en: 'Battery Capacity', aliases: ['السعة', 'سعة البطارية', 'سعة الباور بانك'] },
    { label_ar: 'القدرة القصوى للشحن', label_en: 'Max Output Power', aliases: ['القدرة', 'القدرة القصوى', 'أقصى قدرة شحن'] },
    { label_ar: 'المنافذ والتوصيل', label_en: 'Ports & Connectivity', aliases: ['المنافذ', 'عدد المنافذ', 'نوع المنفذ', 'الإدخال والإخراج'] },
    { label_ar: 'الشحن اللاسلكي / MagSafe', label_en: 'Wireless / MagSafe', aliases: ['الشحن اللاسلكي', 'دعم MagSafe', 'شحن لاسلكي'] },
    { label_ar: 'أنظمة الأمان والحماية', label_en: 'Safety Guard', aliases: ['الأمان', 'الحماية', 'أنظمة الحماية'] },
    { label_ar: 'الضمان', label_en: 'Warranty', aliases: ['الضمان'] }
  ],
  smartphones: PHONE_FIELDS,
  iphones: PHONE_FIELDS,
  feature_phones: PHONE_FIELDS,
  audio: AUDIO_FIELDS,
  headsets: AUDIO_FIELDS,
  headphones: AUDIO_FIELDS,
  speakers: AUDIO_FIELDS,
  photography_mics: ACCESSORY_FIELDS,
  smartwatches: [
    { label_ar: 'الموديل والمقاس', label_en: 'Model & Size', aliases: ['الموديل', 'المقاس', 'مقاس الشاشة'] },
    { label_ar: 'نوع الشاشة وجودتها', label_en: 'Screen Type', aliases: ['الشاشة', 'نوع الشاشة'] },
    { label_ar: 'عمر البطارية', label_en: 'Battery Life', aliases: ['عمر البطارية', 'البطارية', 'مدة التشغيل'] },
    { label_ar: 'مستشعرات الصحة والرياضة', label_en: 'Health Sensors', aliases: ['مستشعرات الصحة', 'قياس النبض', 'المستشعرات'] },
    { label_ar: 'مقاومة الماء والغطس', label_en: 'Water Resistance', aliases: ['مقاومة الماء', 'معيار الحماية'] },
    { label_ar: 'التوافق مع الهواتف', label_en: 'OS Compatibility', aliases: ['التوافق', 'الأنظمة المدعومة'] },
    { label_ar: 'الضمان', label_en: 'Warranty', aliases: ['الضمان'] }
  ],
  cases_protection: [
    { label_ar: 'الموديلات المتوافقة', label_en: 'Compatible Models', aliases: ['الموديل المتوافق', 'الموديلات المتوافقة', 'التوافق', 'الموديل'] },
    { label_ar: 'الخامة ونوع المادة', label_en: 'Material', aliases: ['الخامة', 'المادة المصنوع منها', 'نوع المادة'] },
    { label_ar: 'درجة الحماية والصلابة', label_en: 'Protection Grade', aliases: ['درجة الصلابة', 'الحماية', 'مقاومة الصدمات'] },
    { label_ar: 'دعم الشحن المغناطيسي MagSafe', label_en: 'MagSafe Support', aliases: ['المغناطيس', 'دعم MagSafe', 'ماج سيف'] },
    { label_ar: 'محتويات العلبة', label_en: 'Package Contents', aliases: ['المحتويات', 'محتويات العبوة'] },
    { label_ar: 'الضمان', label_en: 'Warranty', aliases: ['الضمان'] }
  ],
  screen_protectors: ACCESSORY_FIELDS,
  holders_stands: ACCESSORY_FIELDS,
  straps_bands: ACCESSORY_FIELDS,
  smart_rings: ACCESSORY_FIELDS,
  trackers: ACCESSORY_FIELDS,
  car_accessories: ACCESSORY_FIELDS,
  adapters: ACCESSORY_FIELDS,
  accessories: ACCESSORY_FIELDS,
  all: []
};

export const canPurchaseProduct = (product: Product): boolean =>
  product.is_active !== false && product.in_stock !== false
  && Number.isFinite(product.price) && product.price > 0
  && Number.isFinite(product.stock) && product.stock > 0;

export const productNotice = (product: Product, language: string): string => {
  if (product.catalog_status === 'estimated') {
    return language === 'ar'
      ? (product.image_is_illustrative ? 'صورة توضيحية ومواصفات تقديرية؛ راجع التفاصيل مع المحل قبل الشراء.' : 'مواصفات تقديرية؛ راجع التفاصيل مع المحل قبل الشراء.')
      : (product.image_is_illustrative ? 'Illustrative image and estimated specifications; confirm details with the store before buying.' : 'Estimated specifications; confirm details with the store before buying.');
  }
  return product.image_is_illustrative
    ? (language === 'ar' ? 'الصورة توضيحية؛ تأكد من شكل المنتج مع المحل.' : 'Illustrative image; confirm the product appearance with the store.') : '';
};

export const priceLabel = (product: Product, language: string, formatPrice: (value: number) => string): string =>
  product.price > 0 ? formatPrice(product.price) : (language === 'ar' ? 'اسأل عن السعر' : 'Ask for price');

export const publicSpecs = (specs: Record<string, string> = {}): Record<string, string> =>
  Object.fromEntries(Object.entries(specs).filter(([key, value]) => !key.startsWith('__') && typeof value === 'string'));

export function extractSpecValue(p: Product, aliases: string[]): string {
  const pSpecs = publicSpecs(p.specs);
  const pQuick = publicSpecs(p.quick_specs);
  const merged = { ...pSpecs, ...pQuick };

  // 1. Direct exact match
  for (const alias of aliases) {
    if (merged[alias] && merged[alias].trim()) return merged[alias].trim();
  }

  // 2. Contains match
  for (const [key, val] of Object.entries(merged)) {
    if (!val || !val.trim()) continue;
    for (const alias of aliases) {
      if (key.includes(alias) || alias.includes(key)) {
        return val.trim();
      }
    }
  }

  // 3. Fallbacks to explicit top-level properties
  for (const alias of aliases) {
    if (alias.includes('ضمان') && p.warranty_months) {
      return `${p.warranty_months} شهراً`;
    }
    if ((alias.includes('موديل') || alias.includes('طراز') || alias.includes('model')) && p.model_name) {
      return p.model_name;
    }
    if ((alias.includes('بطارية') || alias.includes('صحة')) && p.battery_health) {
      return `${p.battery_health}%`;
    }
    if ((alias.includes('تخزين') || alias.includes('ذاكرة')) && p.storage) {
      return p.storage;
    }
    if ((alias.includes('حالة') || alias.includes('الحالة')) && p.condition) {
      if (p.condition === 'brand_new') return 'جديد أصلي بالكرتونة';
      if (p.condition === 'mint') return 'كسر زيرو (كالجديد)';
      if (p.condition === 'used_good') return 'مستعمل بحالة ممتازة';
    }
  }

  return '';
}

export function getCategoryComparisonRows(
  product: Product,
  comparisonItems: Product[],
  language: string = 'ar'
): ComparisonRow[] {
  const fields = CATEGORY_SPEC_FIELDS[product.category] || [];
  const rows: ComparisonRow[] = [];
  const coveredAliases = new Set<string>();

  // 1. Process category-configured fields
  for (const field of fields) {
    field.aliases.forEach(a => coveredAliases.add(a));
    const currentVal = extractSpecValue(product, field.aliases);
    const compVals = comparisonItems.map(c => ({
      id: c.id,
      value: extractSpecValue(c, field.aliases)
    }));

    // CRITICAL: Only include row if at least one product has a real recorded value!
    const hasAny = Boolean(currentVal) || compVals.some(v => Boolean(v.value));
    if (!hasAny) continue;

    rows.push({
      label: language === 'ar' ? field.label_ar : field.label_en,
      currentValue: currentVal,
      compValues: compVals
    });
  }

  // 2. Discover any additional custom specs present on current product or comparison items
  const allCompared = [product, ...comparisonItems];
  for (const item of allCompared) {
    const itemSpecs = { ...publicSpecs(item.quick_specs), ...publicSpecs(item.specs) };
    for (const [key, val] of Object.entries(itemSpecs)) {
      if (!val || !val.trim()) continue;
      const isCovered = Array.from(coveredAliases).some(a => key.includes(a) || a.includes(key));
      if (isCovered) continue;

      coveredAliases.add(key);
      const currentVal = extractSpecValue(product, [key]);
      const compVals = comparisonItems.map(c => ({
        id: c.id,
        value: extractSpecValue(c, [key])
      }));

      const hasAny = Boolean(currentVal) || compVals.some(v => Boolean(v.value));
      if (!hasAny) continue;

      rows.push({
        label: key,
        currentValue: currentVal,
        compValues: compVals
      });

      if (rows.length >= 8) break;
    }
    if (rows.length >= 8) break;
  }

  return rows;
}

// Present saved catalog content. Specifications, identifiers, warranty, sales and
// reviews are never inferred from a category or invented while rendering a page.
export function enrichProductData(product: Product, allProducts: Product[]): EnrichedProductData {
  const reviews = (product.customer_reviews || []).filter(review =>
    Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5);
  const emptyBreakdown: RatingBreakdown = { five_star: 0, four_star: 0, three_star: 0, two_star: 0, one_star: 0 };
  const breakdown = product.rating_breakdown || (reviews.length ? {
    five_star: Math.round(reviews.filter(review => review.rating === 5).length / reviews.length * 100),
    four_star: Math.round(reviews.filter(review => review.rating === 4).length / reviews.length * 100),
    three_star: Math.round(reviews.filter(review => review.rating === 3).length / reviews.length * 100),
    two_star: Math.round(reviews.filter(review => review.rating === 2).length / reviews.length * 100),
    one_star: Math.round(reviews.filter(review => review.rating === 1).length / reviews.length * 100)
  } : emptyBreakdown);
  const activeProducts = allProducts.filter(item => item.is_active !== false && item.id !== product.id);
  return {
    detailed_title_ar: product.name_ar,
    detailed_title_en: product.name_en || product.name_ar,
    brand_store_name: product.brand || 'JOE Store',
    asin: product.asin || '',
    bought_past_month: product.bought_past_month > 0 ? product.bought_past_month : 0,
    about_item: product.about_item?.length ? [...product.about_item]
      : product.description_ar ? [product.description_ar] : [],
    quick_specs: publicSpecs(product.quick_specs || product.specs),
    feature_banners: product.feature_banners ? [...product.feature_banners] : [],
    rating_breakdown: breakdown,
    customer_reviews: [...reviews],
    bundle_accessories: activeProducts.filter(item =>
      product.frequently_bought_together?.includes(item.id) && canPurchaseProduct(item)).slice(0, 2),
    comparison_items: activeProducts.filter(item => item.category === product.category).slice(0, 3)
  };
}
