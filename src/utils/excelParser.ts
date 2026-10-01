import * as XLSX from 'xlsx';
import { Product, CategoryKey, ProductCondition } from '../types';

export interface ParsedProductResult {
  validProducts: Partial<Product>[];
  errors: string[];
  totalRows: number;
}

// Generates and downloads a sample Excel template for bulk product insertion
export const downloadSampleExcelTemplate = () => {
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
      'روابط الصور مفصولة بفاصلة (images)': 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab',
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
      'روابط الصور مفصولة بفاصلة (images)': 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434',
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
      'روابط الصور مفصولة بفاصلة (images)': 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0',
      'الوصف بالعربي (description_ar)': 'شحن فائق السرعة متوافق مع كافة أجهزة آبل وسامسونج واللابتوبات',
      'الوصف بالإنجليزي (description_en)': 'Ultra-fast GaN charging compatible with all phones and laptops'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 35 }, { wch: 30 }, { wch: 12 }, { wch: 16 }, { wch: 14 },
    { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 12 },
    { wch: 15 }, { wch: 14 }, { wch: 15 }, { wch: 45 }, { wch: 40 }, { wch: 40 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'قالب المنتجات - جو ستور');
  XLSX.writeFile(workbook, 'JOE_Store_Products_Template.xlsx');
};

// Parses an uploaded Excel or CSV file
export const parseExcelFile = (file: File): Promise<ParsedProductResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const validProducts: Partial<Product>[] = [];
        const errors: string[] = [];

        rawJson.forEach((row, index) => {
          const rowNum = index + 2; // +1 for 0-index, +1 for header row

          // Helper to extract value from either Arabic or English header keys
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

          const name_ar = String(getVal('name_ar', 'اسم المنتج بالعربي', 'اسم المنتج', 'name') || '').trim();
          const name_en = String(getVal('name_en', 'اسم المنتج بالإنجليزي', 'english name') || name_ar).trim();
          const brand = String(getVal('brand', 'الماركة', 'الشركة') || 'Generic').trim();
          
          let rawCategory = String(getVal('category', 'القسم', 'التصنيف') || 'accessories').toLowerCase().trim();
          let category: CategoryKey = 'accessories';
          if (rawCategory.includes('smart') || rawCategory.includes('phone') || rawCategory.includes('موبايل') || rawCategory.includes('هاتف')) category = 'smartphones';
          else if (rawCategory.includes('watch') || rawCategory.includes('ساع')) category = 'smartwatches';
          else if (rawCategory.includes('audio') || rawCategory.includes('ear') || rawCategory.includes('سماع')) category = 'audio';
          else if (rawCategory.includes('charg') || rawCategory.includes('cable') || rawCategory.includes('شاحن') || rawCategory.includes('كابل') || rawCategory.includes('سلك')) category = 'chargers_cables';
          else if (rawCategory.includes('power') || rawCategory.includes('بانك') || rawCategory.includes('باور')) category = 'powerbanks';
          else if (rawCategory.includes('case') || rawCategory.includes('cover') || rawCategory.includes('جراب') || rawCategory.includes('حماي') || rawCategory.includes('سكرين')) category = 'cases_protection';

          let rawCondition = String(getVal('condition', 'الحالة') || 'brand_new').toLowerCase().trim();
          let condition: ProductCondition = 'brand_new';
          if (rawCondition.includes('mint') || rawCondition.includes('كسر') || rawCondition.includes('زيرو')) condition = 'mint';
          else if (rawCondition.includes('used') || rawCondition.includes('مستعمل') || rawCondition.includes('استعمال')) condition = 'used_good';

          const price = Number(getVal('price', 'السعر')) || 0;
          const original_price = Number(getVal('original_price', 'السعر قبل الخصم', 'القديم')) || 0;
          const stock = Number(getVal('stock', 'الكمية', 'المخزون')) || 1;
          const battery_health = Number(getVal('battery_health', 'نسبة البطارية', 'البطارية')) || null;
          const storage = String(getVal('storage', 'المساحة', 'الذاكرة') || '').trim();
          const color_ar = String(getVal('color_ar', 'اللون بالعربي', 'اللون') || '').trim();
          const color_en = String(getVal('color_en', 'اللون بالإنجليزي') || color_ar).trim();
          const warranty_months = Number(getVal('warranty_months', 'شهور الضمان', 'الضمان')) || 6;
          
          const rawImages = String(getVal('images', 'الصور', 'روابط الصور') || '').trim();
          const images = rawImages ? rawImages.split(',').map(s => s.trim()).filter(Boolean) : [
            'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80'
          ];

          const description_ar = String(getVal('description_ar', 'الوصف بالعربي', 'الوصف') || `${name_ar} متوفر الآن لدى متجر جو ستور`).trim();
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
            sku: `JOE-EXL-${Math.floor(1000 + Math.random() * 9000)}`,
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
            original_price: original_price > price ? original_price : undefined,
            discount_percentage: original_price > price ? Math.round(((original_price - price) / original_price) * 100) : undefined,
            stock,
            in_stock: stock > 0,
            images,
            description_ar,
            description_en,
            specs: {
              'القسم': category,
              'الحالة': condition === 'brand_new' ? 'جديد متبرشم' : condition === 'mint' ? 'كسر زيرو' : 'استعمال ممتاز',
              ...(storage ? { 'المساحة': storage } : {}),
              ...(battery_health ? { 'صحة البطارية': `${battery_health}%` } : {}),
              'الضمان': `${warranty_months} شهور من متجر جو ستور`
            },
            warranty_months,
            rating: 5.0,
            reviews_count: 1,
            is_featured: false,
            created_at: new Date().toISOString().split('T')[0]
          };

          validProducts.push(product);
        });

        resolve({
          validProducts,
          errors,
          totalRows: rawJson.length
        });
      } catch (err: any) {
        reject(new Error(`فشل قراءة ملف الإكسل: ${err.message}`));
      }
    };

    reader.onerror = () => reject(new Error('حدث خطأ أثناء قراءة الملف.'));
    reader.readAsBinaryString(file);
  });
};

// Exports current catalog to Excel file
export const exportCatalogToExcel = (products: Product[]) => {
  const exportData = products.map(p => ({
    'رقم المنتج (ID)': p.id,
    'رمز SKU': p.sku || '',
    'اسم المنتج (عربي)': p.name_ar,
    'Product Name (EN)': p.name_en,
    'الماركة': p.brand,
    'القسم': p.category,
    'الحالة': p.condition,
    'نسبة البطارية': p.battery_health || '',
    'المساحة': p.storage || '',
    'اللون': p.color_ar || '',
    'السعر (ج.م)': p.price,
    'السعر الأصلي': p.original_price || '',
    'المخزون': p.stock,
    'الضمان (شهور)': p.warranty_months,
    'التقييم': p.rating,
    'عدد المراجعات': p.reviews_count,
    'تاريخ الإضافة': p.created_at || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'منتجات متجر جو ستور');
  XLSX.writeFile(workbook, `JOE_Store_Catalog_${new Date().toISOString().split('T')[0]}.xlsx`);
};
