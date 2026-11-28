import readXlsxFile from 'read-excel-file/browser';
import writeXlsxFile from 'write-excel-file/browser';
import type { SheetData, CellObject } from 'write-excel-file/browser';
import { Product, CategoryKey, ProductCondition } from '../types';

export interface ParsedProductResult {
  validProducts: Partial<Product>[];
  errors: string[];
  totalRows: number;
}

function toCell(v: string | number | undefined | null): CellObject {
  if (typeof v === 'number' && Number.isFinite(v)) return { type: Number, value: v };
  return { type: String, value: v == null ? '' : String(v) };
}

function parseCsvRows(text: string): Record<string, string>[] {
  const clean = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some(c => c.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some(c => c.trim() !== '')) rows.push(row);
  }
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(r => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (h) obj[h] = String(r[idx] ?? '');
    });
    return obj;
  });
}

// Generates and downloads a sample Excel template for bulk product insertion
export const downloadSampleExcelTemplate = async () => {
  const sampleData = [
    {
      'اسم المنتج بالعربي (name_ar)': 'آبل آيفون 13 مساحة 128 جيجا كسر زيرو',
      'اسم المنتج بالإنجليزي (name_en)': 'Apple iPhone 13 128GB Mint',
      'الماركة (brand)': 'Apple',
      'القسم (category)': 'smartphones',
      'الحالة (condition)': 'mint',
      'نسبة البطارية (battery_health)': 94,
      'المساحة (storage)': '128GB',
      'اللون بالعربي (color_ar)': 'أزرق سماوي',
      'اللون بالإنجليزي (color_en)': 'Blue',
      'السعر (price)': 19800,
      'السعر قبل الخصم (original_price)': 23000,
      'الكمية بالمخزن (stock)': 10,
      'شهور الضمان (warranty_months)': 6,
      'روابط الصور مفصولة بفاصلة (images)': '/product-placeholder.svg',
      'الوصف بالعربي (description_ar)': 'جهاز كسر زيرو خالي من الخدوش مع ضمان معتمد من جو ستور',
      'الوصف بالإنجليزي (description_en)': 'Mint condition device with certified Joe Store warranty'
    },
    {
      'اسم المنتج بالعربي (name_ar)': 'سماعة آبل إيربودز برو 2 تايب سي متبرشمة',
      'اسم المنتج بالإنجليزي (name_en)': 'Apple AirPods Pro 2 USB-C Sealed',
      'الماركة (brand)': 'Apple',
      'القسم (category)': 'audio',
      'الحالة (condition)': 'brand_new',
      'نسبة البطارية (battery_health)': 100,
      'المساحة (storage)': '',
      'اللون بالعربي (color_ar)': 'أبيض ناصع',
      'اللون بالإنجليزي (color_en)': 'White',
      'السعر (price)': 9400,
      'السعر قبل الخصم (original_price)': 10500,
      'الكمية بالمخزن (stock)': 15,
      'شهور الضمان (warranty_months)': 12,
      'روابط الصور مفصولة بفاصلة (images)': '/product-placeholder.svg',
      'الوصف بالعربي (description_ar)': 'نسخة أصلية جديدة متبرشمة مع شريحة H2 وعزل ضوضاء مضاعف',
      'الوصف بالإنجليزي (description_en)': 'Original sealed unit with H2 chip and enhanced ANC'
    },
    {
      'اسم المنتج بالعربي (name_ar)': 'شاحن أنكر برايم 67 واط GaN ثلاث منافذ',
      'اسم المنتج بالإنجليزي (name_en)': 'Anker Prime 67W GaN Wall Charger',
      'الماركة (brand)': 'Anker',
      'القسم (category)': 'chargers_cables',
      'الحالة (condition)': 'brand_new',
      'نسبة البطارية (battery_health)': '',
      'المساحة (storage)': '',
      'اللون بالعربي (color_ar)': 'أسود',
      'اللون بالإنجليزي (color_en)': 'Black',
      'السعر (price)': 1850,
      'السعر قبل الخصم (original_price)': 2100,
      'الكمية بالمخزن (stock)': 25,
      'شهور الضمان (warranty_months)': 18,
      'روابط الصور مفصولة بفاصلة (images)': '/product-placeholder.svg',
      'الوصف بالعربي (description_ar)': 'شحن فائق السرعة متوافق مع كافة أجهزة آبل وسامسونج واللابتوبات',
      'الوصف بالإنجليزي (description_en)': 'Ultra-fast GaN charging compatible with all phones and laptops'
    }
  ];

  const headers = Object.keys(sampleData[0]);
  const sheetData: SheetData = [
    headers.map(h => toCell(h)),
    ...sampleData.map(row => headers.map(h => toCell((row as any)[h])))
  ];

  await writeXlsxFile(sheetData, {
    sheet: 'قالب المنتجات - جو ستور',
    rightToLeft: true,
    columns: [
      { width: 35 }, { width: 30 }, { width: 12 }, { width: 16 }, { width: 14 },
      { width: 16 }, { width: 12 }, { width: 16 }, { width: 16 }, { width: 12 },
      { width: 15 }, { width: 14 }, { width: 15 }, { width: 45 }, { width: 40 }, { width: 40 }
    ]
  }).toFile('JOE_Store_Products_Template.xlsx');
};

// Parses an uploaded Excel (.xlsx) or CSV file cleanly without SheetJS/xlsx CVEs
export const parseExcelFile = async (file: File): Promise<ParsedProductResult> => {
  try {
    let rawJson: Record<string, any>[] = [];

    if (/\.csv$/i.test(file.name)) {
      const text = await file.text();
      rawJson = parseCsvRows(text);
    } else if (/\.xls$/i.test(file.name)) {
      throw new Error('صيغة .xls القديمة غير مدعومة لأسباب أمنية. يرجى حفظ الملف بصيغة .xlsx أو .csv.');
    } else {
      const sheets = await readXlsxFile(file);
      const rows = sheets?.[0]?.data || [];
      if (rows.length >= 2) {
        const headers = rows[0].map((c: any) => String(c ?? '').trim());
        rawJson = rows.slice(1).map((r: any[]) => {
          const obj: Record<string, any> = {};
          headers.forEach((h: string, idx: number) => {
            if (h) obj[h] = r[idx] ?? '';
          });
          return obj;
        });
      }
    }

    const validProducts: Partial<Product>[] = [];
    const errors: string[] = [];

    rawJson.forEach((row, index) => {
      const rowNum = index + 2;

      const getVal = (...keys: string[]) => {
        for (const key of keys) {
          for (const rowKey of Object.keys(row)) {
            if (rowKey.toLowerCase().includes(key.toLowerCase())) {
              return row[rowKey];
            }
          }
        }
        return '';
      };

      const name_ar = String(getVal('اسم الصنف', 'name_ar', 'اسم المنتج بالعربي', 'اسم المنتج', 'name') || '').trim();
      const name_en = String(getVal('name_en', 'اسم المنتج بالإنجليزي', 'english name') || name_ar).trim();

      let detectedBrand = String(getVal('brand', 'الماركة', 'الشركة') || '').trim();
      if (!detectedBrand || detectedBrand === 'Generic') {
        const lower = name_ar.toLowerCase();
        if (lower.includes('joyroom') || lower.includes('jr-') || lower.includes('جويروم')) detectedBrand = 'Joyroom';
        else if (lower.includes('oraimo') || lower.includes('اورايمو')) detectedBrand = 'Oraimo';
        else if (lower.includes('anker') || lower.includes('انكر') || lower.includes('أنكر')) detectedBrand = 'Anker';
        else if (lower.includes('apple') || lower.includes('iphone') || lower.includes('آيفون') || lower.includes('ايفون') || lower.includes('airpod')) detectedBrand = 'Apple';
        else if (lower.includes('samsung') || lower.includes('سامسونج') || lower.includes('galaxy')) detectedBrand = 'Samsung';
        else if (lower.includes('pitaka')) detectedBrand = 'Pitaka';
        else if (lower.includes('green lion') || lower.includes('lion')) detectedBrand = 'Green Lion';
        else detectedBrand = 'JOE Store';
      }
      const brand = detectedBrand;

      const rawCategory = String(getVal('category', 'القسم', 'التصنيف') || '').toLowerCase().trim();
      let category: CategoryKey = 'accessories';
      const nameLower = name_ar.toLowerCase();

      if (rawCategory.includes('smart') || rawCategory.includes('phone') || rawCategory.includes('موبايل') || rawCategory.includes('هاتف') || nameLower.includes('iphone') || nameLower.includes('galaxy')) category = 'smartphones';
      else if (rawCategory.includes('watch') || rawCategory.includes('ساع') || nameLower.includes('watch') || nameLower.includes('ساعة')) category = 'smartwatches';
      else if (rawCategory.includes('audio') || rawCategory.includes('ear') || rawCategory.includes('سماع') || nameLower.includes('airpod') || nameLower.includes('buds') || nameLower.includes('سماعة')) category = 'audio';
      else if (rawCategory.includes('charg') || rawCategory.includes('cable') || rawCategory.includes('شاحن') || rawCategory.includes('كابل') || rawCategory.includes('سلك') || nameLower.includes('cable') || nameLower.includes('plug') || nameLower.includes('charge')) category = 'chargers_cables';
      else if (rawCategory.includes('power') || rawCategory.includes('بانك') || rawCategory.includes('باور') || nameLower.includes('power')) category = 'powerbanks';
      else if (rawCategory.includes('case') || rawCategory.includes('cover') || rawCategory.includes('جراب') || rawCategory.includes('حماي') || rawCategory.includes('سكرين') || nameLower.includes('screen') || nameLower.includes('cover')) category = 'cases_protection';

      const rawCondition = String(getVal('condition', 'الحالة') || 'brand_new').toLowerCase().trim();
      let condition: ProductCondition = 'brand_new';
      if (rawCondition.includes('mint') || rawCondition.includes('كسر') || rawCondition.includes('زيرو')) condition = 'mint';
      else if (rawCondition.includes('used') || rawCondition.includes('مستعمل') || rawCondition.includes('استعمال')) condition = 'used_good';

      const price = Number(getVal('سعر البيع', 'price', 'السعر')) || 0;
      const cost_price = Number(getVal('متوسط سعر الشراء', 'cost_price', 'آخر سعر شراء')) || 0;
      const original_price = Number(getVal('original_price', 'السعر قبل الخصم', 'القديم')) || (price > 0 ? Math.round(price * 1.25) : 0);
      const stock = Number(getVal('إجمالى الكمية', 'stock', 'الكمية', 'المخزون')) || 5;
      const battery_health = Number(getVal('battery_health', 'نسبة البطارية', 'البطارية')) || null;
      const storage = String(getVal('storage', 'المساحة', 'الذاكرة') || '').trim();
      const color_ar = String(getVal('color_ar', 'اللون بالعربي', 'اللون') || '').trim();
      const color_en = String(getVal('color_en', 'اللون بالإنجليزي') || color_ar).trim();
      const warranty_months = Number(getVal('warranty_months', 'شهور الضمان', 'الضمان')) || 12;
      const barcode = String(getVal('باركود', 'كود الصنف 1', 'رقم الصنف', 'barcode', 'sku') || '').trim();

      const rawImages = String(getVal('images', 'الصور', 'روابط الصور') || '').trim();
      const images = rawImages ? rawImages.split(',').map(s => s.trim()).filter(Boolean) : ['/product-placeholder.svg'];

      const description_ar = String(getVal('description_ar', 'الوصف بالعربي', 'الوصف') || `${name_ar} متوفر الآن لدى متجر جو ستور بأفضل سعر وضمان معتمد`).trim();
      const description_en = String(getVal('description_en', 'الوصف بالإنجليزي') || `${name_en} available now at JOE Store`).trim();

      if (!name_ar) {
        errors.push(`السطر ${rowNum}: اسم المنتج مفقود.`);
        return;
      }

      if (price <= 0) {
        errors.push(`السطر ${rowNum} (${name_ar}): السعر غير صالح.`);
        return;
      }

      const product: Partial<Product> = {
        id: `prod-excel-${Date.now()}-${index}`,
        sku: barcode || `JOE-EXL-${Math.floor(1000 + Math.random() * 9000)}`,
        asin: `B0${(barcode || '78912').replace(/[^0-9A-Z]/gi, '').slice(0, 8)}`,
        name_ar,
        name_en,
        brand,
        category,
        condition,
        battery_health: battery_health && battery_health > 0 ? battery_health : null,
        storage: storage || undefined,
        color_ar: color_ar || undefined,
        color_en: color_en || undefined,
        price,
        cost_price,
        original_price: original_price > price ? original_price : undefined,
        discount_percentage: original_price > price ? Math.round(((original_price - price) / original_price) * 100) : undefined,
        stock,
        in_stock: stock > 0,
        images,
        description_ar,
        description_en,
        specs: {
          'الماركة': brand,
          'القسم': category,
          'الحالة': condition === 'brand_new' ? 'جديد متبرشم' : condition === 'mint' ? 'كسر زيرو' : 'استعمال ممتاز',
          ...(storage ? { 'المساحة': storage } : {}),
          ...(battery_health ? { 'صحة البطارية': `${battery_health}%` } : {}),
          'الضمان': `${warranty_months} شهور من متجر جو ستور`
        },
        warranty_months,
        rating: 0,
        reviews_count: 0,
        is_featured: false,
        created_at: new Date().toISOString().split('T')[0]
      };

      validProducts.push(product);
    });

    return {
      validProducts,
      errors,
      totalRows: rawJson.length
    };
  } catch (err: any) {
    throw new Error(`فشل قراءة ملف الإكسل: ${err.message}`);
  }
};

// Exports current catalog to Excel file
export const exportCatalogToExcel = async (products: Product[]) => {
  const exportData = products.map(p => ({
    'رقم المنتج (ID)': p.id,
    'رمز SKU': p.sku || '',
    'اسم المنتج (عربي)': p.name_ar,
    'Product Name (EN)': p.name_en,
    'الماركة': p.brand,
    'اسم الموديل': p.model_name || '',
    'حالة التفاصيل': p.catalog_status === 'verified' ? 'موثقة' : p.catalog_status === 'estimated' ? 'تقديرية' : '',
    'صور توضيحية': p.image_is_illustrative ? 'نعم' : 'لا',
    'صف الإكسل الأصلي': p.source_row ?? '',
    'كود الصنف الأصلي': p.source_item_code || '',
    'الاسم الأصلي': p.source_name || '',
    'القسم': p.category,
    'الحالة': p.condition,
    'نسبة البطارية': p.battery_health || '',
    'المساحة': p.storage || '',
    'اللون': p.color_ar || '',
    'السعر (ج.م)': p.price,
    'سعر التاجر الأصلي': p.cost_price ?? '',
    'السعر الأصلي': p.original_price || '',
    'المخزون': p.stock,
    'المخزون الأصلي': p.raw_source_stock ?? p.stock,
    'صور المنتج': p.images.join('\n'),
    'الوصف': p.description_ar,
    'المواصفات': JSON.stringify(p.specs),
    'مصادر التفاصيل والصور': p.data_sources?.map(source => source.url).join('\n') || '',
    'الضمان (شهور)': p.warranty_months,
    'التقييم': p.rating,
    'عدد المراجعات': p.reviews_count,
    'تاريخ الإضافة': p.created_at || ''
  }));

  if (!exportData.length) return;
  const headers = Object.keys(exportData[0]);
  const sheetData: SheetData = [
    headers.map(h => toCell(h)),
    ...exportData.map(row => headers.map(h => toCell((row as any)[h])))
  ];

  await writeXlsxFile(sheetData, {
    sheet: 'منتجات متجر جو ستور',
    rightToLeft: true,
    stickyRowsCount: 1
  }).toFile(`JOE_Store_Catalog_${new Date().toISOString().split('T')[0]}.xlsx`);
};
