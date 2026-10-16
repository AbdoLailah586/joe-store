import type { Product } from '../types';

export const categoryLabels: Record<string, string> = {
  smartphones: 'هواتف ذكية', smartwatches: 'ساعات ذكية', audio: 'سماعات وصوتيات',
  chargers_cables: 'شواحن وكابلات', powerbanks: 'باور بانكات', cases_protection: 'جرابات وحمايات', accessories: 'إكسسوارات أخرى',
};
export const reportOptions = {
  stockOp: { all: 'كل الكميات', lt: 'أقل من', lte: 'أقل من أو يساوي', eq: 'يساوي', gt: 'أكبر من', gte: 'أكبر من أو يساوي', between: 'بين رقمين (شامل)' },
  visibility: { all: 'كل حالات الظهور', active: 'ظاهر في المتجر', hidden: 'مخفي' },
  condition: { all: 'كل الحالات', brand_new: 'جديد', mint: 'كسر زيرو', used_good: 'مستعمل', unknown: 'غير محددة' },
  details: { all: 'كل حالات البيانات', needs_review: 'تحتاج مراجعة (بيانات أو صور)', estimated: 'تفاصيل تقديرية', verified: 'تفاصيل موثقة', unmarked: 'حالة التفاصيل غير محددة' },
  images: { all: 'كل حالات الصور', illustrative: 'صور توضيحية', missing: 'بدون رابط صورة', unmarked: 'نوع الصورة غير محدد', non_illustrative: 'غير معلّمة كتوضيحية' },
  priceStatus: { all: 'كل أسعار البيع', missing: 'بدون سعر بيع صالح', set: 'بسعر بيع صالح' },
  costStatus: { all: 'كل أسعار التكلفة', missing: 'بدون تكلفة موجبة مسجلة', set: 'بتكلفة موجبة مسجلة' },
  sort: { name: 'الاسم', stock_asc: 'الكمية: الأقل أولًا', stock_desc: 'الكمية: الأعلى أولًا', price_asc: 'سعر البيع: الأقل أولًا', price_desc: 'سعر البيع: الأعلى أولًا', cost_value: 'قيمة المخزون بالتكلفة: الأعلى أولًا' },
};
export interface InventoryFilters {
  search: string; category: string; brand: string; stockOp: string; stockValue: string; stockMax: string;
  minPrice: string; maxPrice: string; visibility: string; condition: string; details: string;
  images: string; priceStatus: string; costStatus: string; sort: string;
}
export const defaultInventoryFilters: InventoryFilters = {
  search: '', category: 'all', brand: 'all', stockOp: 'all', stockValue: '3', stockMax: '', minPrice: '', maxPrice: '',
  visibility: 'all', condition: 'all', details: 'all', images: 'all', priceStatus: 'all', costStatus: 'all', sort: 'name',
};
export const normalizeReportText = (value: unknown) => String(value ?? '').normalize('NFKC')
  .replace(/[٠-٩]/g, n => String(n.charCodeAt(0) - 1632)).replace(/[۰-۹]/g, n => String(n.charCodeAt(0) - 1776))
  .toLocaleLowerCase().trim();
export function parseReportNumber(value: string): number | null {
  const text = normalizeReportText(value).replace(/٫/g, '.').replace(/٬/g, '');
  if (!/^-?\d+(?:\.\d+)?$/.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}
const numeric = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
export const recordedStock = (p: Product): number | null => numeric(p.recorded_stock) ? p.recorded_stock : numeric(p.stock) ? p.stock : null;
export const availableUnits = (p: Product) => Math.max(0, recordedStock(p) ?? 0);
export const hasSellingPrice = (p: Product) => numeric(p.price) && p.price > 0;
export const hasCostPrice = (p: Product) => numeric(p.cost_price) && p.cost_price > 0;
export const recordedImages = (p: Product) => p.recorded_images ?? p.images ?? [];
export const hasImage = (p: Product) => recordedImages(p).some(url => typeof url === 'string' && !!url.trim());
export const needsReview = (p: Product) => p.catalog_status !== 'verified' || p.image_is_illustrative === true || !hasImage(p);
export const detailsLabel = (p: Product) => p.catalog_status === 'verified' ? 'موثقة' : p.catalog_status === 'estimated' ? 'تقديرية' : 'غير محددة';
export const imageLabel = (p: Product) => !hasImage(p) ? 'بدون رابط صورة' : p.image_is_illustrative === true ? 'توضيحية' : p.image_is_illustrative === false ? 'غير معلّمة كتوضيحية' : 'غير محددة';
export const costValue = (p: Product) => hasCostPrice(p) ? Math.round(availableUnits(p) * p.cost_price! * 100) / 100 : 0;
export const sellingValue = (p: Product) => hasSellingPrice(p) ? Math.round(availableUnits(p) * p.price * 100) / 100 : 0;

export function validateInventoryFilters(f: InventoryFilters): string[] {
  const errors: string[] = [];
  if (f.stockOp !== 'all') {
    const low = parseReportNumber(f.stockValue);
    if (low === null || !Number.isInteger(low)) errors.push('اكتب عددًا صحيحًا لشرط المخزون.');
    if (f.stockOp === 'between') {
      const high = parseReportNumber(f.stockMax);
      if (high === null || !Number.isInteger(high)) errors.push('اكتب عددًا صحيحًا للحد الأعلى للمخزون.');
      else if (low !== null && high < low) errors.push('الحد الأعلى للمخزون يجب أن يكون أكبر من أو يساوي الحد الأدنى.');
    }
  }
  const min = parseReportNumber(f.minPrice), max = parseReportNumber(f.maxPrice);
  if (f.minPrice.trim() && (min === null || min < 0)) errors.push('أقل سعر يجب أن يكون رقمًا موجبًا أو صفرًا.');
  if (f.maxPrice.trim() && (max === null || max < 0)) errors.push('أعلى سعر يجب أن يكون رقمًا موجبًا أو صفرًا.');
  if (min !== null && max !== null && min > max) errors.push('أعلى سعر يجب أن يكون أكبر من أو يساوي أقل سعر.');
  return errors;
}

export function filterInventory(products: Product[], f: InventoryFilters): Product[] {
  if (validateInventoryFilters(f).length) return [];
  const query = normalizeReportText(f.search), bound = parseReportNumber(f.stockValue), upper = parseReportNumber(f.stockMax);
  const min = parseReportNumber(f.minPrice), max = parseReportNumber(f.maxPrice);
  const rows = products.filter(p => {
    const stock = recordedStock(p);
    if (query && !normalizeReportText([p.name_ar, p.name_en, p.brand, p.sku, p.id, p.model_name, p.source_name, p.source_item_code].join(' ')).includes(query)) return false;
    if (f.category !== 'all' && p.category !== f.category) return false;
    if (f.brand !== 'all' && (p.brand?.trim() || 'غير محدد') !== f.brand) return false;
    if (f.visibility === 'active' && p.is_active === false || f.visibility === 'hidden' && p.is_active !== false) return false;
    if (f.condition !== 'all' && (p.condition || 'unknown') !== f.condition) return false;
    if (f.details === 'needs_review' && !needsReview(p)) return false;
    if (['estimated', 'verified'].includes(f.details) && p.catalog_status !== f.details) return false;
    if (f.details === 'unmarked' && p.catalog_status !== undefined) return false;
    if (f.images === 'missing' && hasImage(p)) return false;
    if (f.images === 'illustrative' && (!hasImage(p) || p.image_is_illustrative !== true)) return false;
    if (f.images === 'non_illustrative' && (!hasImage(p) || p.image_is_illustrative !== false)) return false;
    if (f.images === 'unmarked' && (!hasImage(p) || p.image_is_illustrative !== undefined)) return false;
    if (f.priceStatus === 'missing' && hasSellingPrice(p) || f.priceStatus === 'set' && !hasSellingPrice(p)) return false;
    if (f.costStatus === 'missing' && hasCostPrice(p) || f.costStatus === 'set' && !hasCostPrice(p)) return false;
    if ((min !== null || max !== null) && !numeric(p.price)) return false;
    if (min !== null && p.price < min || max !== null && p.price > max) return false;
    if (f.stockOp !== 'all') {
      if (stock === null || bound === null) return false;
      if (f.stockOp === 'lt' && !(stock < bound) || f.stockOp === 'lte' && !(stock <= bound) || f.stockOp === 'eq' && stock !== bound
        || f.stockOp === 'gt' && !(stock > bound) || f.stockOp === 'gte' && !(stock >= bound)
        || f.stockOp === 'between' && !(stock >= bound && stock <= upper!)) return false;
    }
    return true;
  });
  const compareName = (a: Product, b: Product) => a.name_ar.localeCompare(b.name_ar, 'ar') || a.id.localeCompare(b.id);
  return rows.sort((a, b) => {
    let diff = 0;
    if (f.sort.startsWith('stock_')) {
      const av = recordedStock(a), bv = recordedStock(b);
      if (av === null || bv === null) return av === bv ? compareName(a, b) : av === null ? 1 : -1;
      diff = (av - bv) * (f.sort === 'stock_desc' ? -1 : 1);
    }
    if (f.sort.startsWith('price_')) diff = ((numeric(a.price) ? a.price : 0) - (numeric(b.price) ? b.price : 0)) * (f.sort === 'price_desc' ? -1 : 1);
    if (f.sort === 'cost_value') diff = costValue(b) - costValue(a);
    return diff || compareName(a, b);
  });
}

export function inventorySummary(rows: Product[]) {
  return rows.reduce((s, p) => {
    const stock = recordedStock(p);
    s.count++; s.units += availableUnits(p); s.recordedUnits += stock ?? 0;
    s.zero += Number(stock === 0); s.negative += Number(stock !== null && stock < 0); s.unknownStock += Number(stock === null);
    s.review += Number(needsReview(p)); s.illustrative += Number(hasImage(p) && p.image_is_illustrative === true);
    s.missingImage += Number(!hasImage(p)); s.missingPrice += Number(!hasSellingPrice(p));
    s.missingCost += Number(!hasCostPrice(p)); s.unvaluedUnits += !hasCostPrice(p) ? availableUnits(p) : 0;
    s.unpricedUnits += !hasSellingPrice(p) ? availableUnits(p) : 0;
    s.costCents += Math.round(costValue(p) * 100); s.sellingCents += Math.round(sellingValue(p) * 100);
    return s;
  }, { count: 0, units: 0, recordedUnits: 0, zero: 0, negative: 0, unknownStock: 0, review: 0, illustrative: 0,
    missingImage: 0, missingPrice: 0, missingCost: 0, unvaluedUnits: 0, unpricedUnits: 0, costCents: 0, sellingCents: 0 });
}
export function inventoryCategorySummary(rows: Product[]) {
  const groups = new Map<string, Product[]>();
  rows.forEach(p => groups.set(p.category, [...(groups.get(p.category) || []), p]));
  return [...groups.entries()].map(([category, items]) => ({ category: categoryLabels[category] || category, ...inventorySummary(items) }));
}

export const reportColumns: { key: string; label: string; width: number; value: (p: Product) => string | number }[] = [
  { key: 'id', label: 'رقم المنتج', width: 24, value: p => p.id },
  { key: 'sku', label: 'كود SKU', width: 22, value: p => p.sku || '' },
  { key: 'name', label: 'اسم المنتج', width: 44, value: p => p.name_ar },
  { key: 'brand', label: 'الماركة', width: 18, value: p => p.brand || 'غير محدد' },
  { key: 'model', label: 'الموديل', width: 24, value: p => p.model_name || '' },
  { key: 'category', label: 'القسم', width: 24, value: p => categoryLabels[p.category] || p.category },
  { key: 'stock', label: 'المخزون المسجل (قطعة)', width: 23, value: p => recordedStock(p) ?? '' },
  { key: 'price', label: 'سعر البيع (ج.م)', width: 20, value: p => numeric(p.price) ? p.price : '' },
  { key: 'cost', label: 'سعر التكلفة (ج.م)', width: 20, value: p => numeric(p.cost_price) ? p.cost_price : '' },
  { key: 'costValue', label: 'قيمة الكمية الموجبة بالتكلفة (ج.م)', width: 34, value: p => hasCostPrice(p) ? costValue(p) : '' },
  { key: 'sellingValue', label: 'قيمة الكمية الموجبة بسعر البيع (ج.م)', width: 35, value: p => hasSellingPrice(p) ? sellingValue(p) : '' },
  { key: 'visibility', label: 'الظهور في المتجر', width: 20, value: p => p.is_active === false ? 'مخفي' : 'ظاهر' },
  { key: 'condition', label: 'حالة المنتج', width: 18, value: p => reportOptions.condition[p.condition] || 'غير محددة' },
  { key: 'details', label: 'حالة التفاصيل', width: 20, value: detailsLabel },
  { key: 'images', label: 'حالة الصور', width: 25, value: imageLabel },
  { key: 'sourceName', label: 'الاسم الأصلي في الإكسل', width: 40, value: p => p.source_name || '' },
  { key: 'sourceRow', label: 'صف الإكسل الأصلي', width: 22, value: p => p.source_row ?? '' },
  { key: 'sourceCode', label: 'كود الصنف الأصلي', width: 24, value: p => p.source_item_code || '' },
  { key: 'imageUrls', label: 'روابط الصور', width: 50, value: p => recordedImages(p).join('\n') },
  { key: 'description', label: 'الوصف', width: 60, value: p => p.description_ar || '' },
  { key: 'specs', label: 'المواصفات', width: 60, value: p => JSON.stringify(p.specs || {}) },
  { key: 'sources', label: 'مصادر المعلومات', width: 50, value: p => (p.data_sources || []).map(s => s.url).join('\n') },
];
export const defaultReportColumns = ['sku', 'name', 'brand', 'model', 'category', 'stock', 'price', 'cost', 'costValue', 'sellingValue', 'visibility', 'details', 'images', 'sourceName', 'sourceRow'];
export function inventoryFilterDescription(f: InventoryFilters): [string, string][] {
  const result: [string, string][] = [['البحث', f.search.trim() || 'الكل'], ['القسم', categoryLabels[f.category] || (f.category === 'all' ? 'الكل' : f.category)], ['الماركة', f.brand === 'all' ? 'الكل' : f.brand]];
  result.push(['شرط المخزون', f.stockOp === 'all' ? 'كل الكميات' : `${reportOptions.stockOp[f.stockOp]} ${f.stockValue}${f.stockOp === 'between' ? ` و ${f.stockMax}` : ''}`]);
  result.push(['سعر البيع من / إلى (ج.م)', `${f.minPrice.trim() || 'بلا حد'} / ${f.maxPrice.trim() || 'بلا حد'}`]);
  const labels = { visibility: 'الظهور', condition: 'حالة المنتج', details: 'التفاصيل', images: 'الصور', priceStatus: 'حالة سعر البيع', costStatus: 'حالة التكلفة', sort: 'الترتيب' };
  Object.entries(labels).forEach(([key, label]) => result.push([label, reportOptions[key][f[key]]]));
  return result;
}
export interface SavedInventoryReport { id: string; name: string; filters: InventoryFilters; columns: string[] }
export function isSavedInventoryReport(value: unknown): value is SavedInventoryReport {
  const v = value as SavedInventoryReport;
  return !!v && typeof v.id === 'string' && typeof v.name === 'string' && v.name.length <= 80 && !!v.filters
    && Object.keys(defaultInventoryFilters).every(key => typeof v.filters[key] === 'string')
    && Object.entries(reportOptions).every(([key, options]) => Object.prototype.hasOwnProperty.call(options, v.filters[key]))
    && Array.isArray(v.columns) && v.columns.length > 0 && v.columns.every(key => reportColumns.some(c => c.key === key))
    && !validateInventoryFilters(v.filters).length;
}
