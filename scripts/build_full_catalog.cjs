const xlsx = require('xlsx');
const fs = require('fs');

console.log('Reading Excel file...');
const wb = xlsx.readFile('pyVnA7LPDzn4VTOH8Pe0KKhjKijPlM5bWqjcHyM9euaamNaa27.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

// High-resolution image libraries tailored for categories
const imagePools = {
  audio_joyroom: [
    'https://media.btech.com/catalogs/5/b/3/0/5b30682c1bde5818abbcb3ce8d3a975ba8e2ef22_41k4ezc8fal._ac_sl1000_.jpg',
    'https://2b.com.eg/media/catalog/product/cache/d33f1c152d6eb7e8608a208d80f21a14/h/p/hp37t-min.jpg',
    'https://www.eastasiaeg.com/media/catalog/product/cache/96123baaef328b92941fc6bf41e42dc8/j/o/joyroom-tws-wireless-earphone-jr-t03s-plus.jpg',
    'https://eloroby.com/public/uploads/all/wtYIQJpZq4CXddRHuDwhRGES7ffta7eudsTOcbZX.png'
  ],
  audio_tws: [
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=800&q=80'
  ],
  audio_headphone: [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80'
  ],
  chargers: [
    'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1622445262464-84b1ebae0705?auto=format&fit=crop&w=800&q=80'
  ],
  cables: [
    'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=800&q=80'
  ],
  screens: [
    'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=800&q=80'
  ],
  cases: [
    'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=800&q=80'
  ],
  powerbanks: [
    'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=800&q=80'
  ],
  watches: [
    'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'
  ],
  smartphones: [
    'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80'
  ],
  accessories: [
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80'
  ]
};

// Top Flagship Hand-Crafted Products
const flagshipIds = new Set([
  'prod-joyroom-jr-t03s-plus',
  'prod-joyroom-jr-t03s-pro',
  'prod-oraimo-spacebuds-lite',
  'prod-anker-liberty-5',
  'prod-anker-p40i',
  'prod-joyroom-cable-fast',
  'prod-joyroom-screen-hd',
  'prod-iphone-15-pro-max',
  'prod-iphone-13-mint',
  'prod-anker-prime-67w',
  'prod-anker-plug-20w',
  'prod-cover-pitaka'
]);

// Extract existing flagship products from current seedProducts.ts
const existingSeedContent = fs.readFileSync('src/data/seedProducts.ts', 'utf8');

// Parse raw items from Excel
const excelProducts = [];
const seenCodes = new Set();

for (let i = 3; i < data.length; i++) {
  const r = data[i];
  if (!r || !r[2]) continue;

  const code = r[1] !== undefined ? String(r[1]).trim() : '';
  const rawName = String(r[2]).trim();
  const rawStock = Number(r[3]) || 0;
  const unit = r[4] ? String(r[4]).trim() : '';
  const sellPriceRaw = Number(r[5]) || 0;
  const costPrice = Number(r[6]) || 0;
  const barcode = r[8] ? String(r[8]).trim() : '';
  const skuCode = r[9] ? String(r[9]).trim() : '';

  if (!rawName) continue;

  // Deduplicate by code
  const uniqueKey = code || rawName;
  if (seenCodes.has(uniqueKey)) continue;
  seenCodes.add(uniqueKey);

  // Price calculation
  let price = sellPriceRaw;
  if (price <= 0) {
    if (costPrice > 0) {
      price = Math.round(costPrice * 1.4);
    } else {
      price = 50;
    }
  }

  const originalPrice = Math.round(price * 1.25);
  const discountPercentage = Math.round(((originalPrice - price) / originalPrice) * 100);

  // Brand detection
  const lowerName = rawName.toLowerCase();
  let brand = 'JOE Store';
  if (lowerName.includes('joyroom') || lowerName.includes('jr-') || lowerName.includes('جويروم')) brand = 'Joyroom';
  else if (lowerName.includes('oraimo') || lowerName.includes('اورايمو')) brand = 'Oraimo';
  else if (lowerName.includes('anker') || lowerName.includes('انكر') || lowerName.includes('أنكر')) brand = 'Anker';
  else if (lowerName.includes('apple') || lowerName.includes('iphone') || lowerName.includes('آيفون') || lowerName.includes('ايفون') || lowerName.includes('airpod')) brand = 'Apple';
  else if (lowerName.includes('samsung') || lowerName.includes('سامسونج') || lowerName.includes('galaxy')) brand = 'Samsung';
  else if (lowerName.includes('xiaomi') || lowerName.includes('شاومي') || lowerName.includes('redmi')) brand = 'Xiaomi';
  else if (lowerName.includes('infinix') || lowerName.includes('انفينكس')) brand = 'Infinix';
  else if (lowerName.includes('pitaka')) brand = 'Pitaka';
  else if (lowerName.includes('lion') || lowerName.includes('green lion')) brand = 'Green Lion';
  else if (lowerName.includes('hainoteko') || lowerName.includes('hコー')) brand = 'Hainoteko';
  else if (lowerName.includes('celebrate')) brand = 'Celebrate';
  else if (lowerName.includes('havit')) brand = 'Havit';
  else if (lowerName.includes('lenovo')) brand = 'Lenovo';
  else if (lowerName.includes('baseus')) brand = 'Baseus';

  // Category detection
  let category = 'accessories';
  let images = imagePools.accessories;

  if (lowerName.includes('airpod') || lowerName.includes('سماع') || lowerName.includes('buds') || lowerName.includes('headphone') || lowerName.includes('earphone')) {
    category = 'audio';
    images = brand === 'Joyroom' ? imagePools.audio_joyroom : imagePools.audio_tws;
  } else if (lowerName.includes('cable') || lowerName.includes('كابل') || lowerName.includes('سلك') || lowerName.includes('otg') || lowerName.includes('وصلة')) {
    category = 'chargers_cables';
    images = imagePools.cables;
  } else if (lowerName.includes('charger') || lowerName.includes('شاحن') || lowerName.includes('plug') || lowerName.includes('راس') || lowerName.includes('gan') || lowerName.includes('20w') || lowerName.includes('30w') || lowerName.includes('65w')) {
    category = 'chargers_cables';
    images = imagePools.chargers;
  } else if (lowerName.includes('screen') || lowerName.includes('سكرين') || lowerName.includes('اسكرين') || lowerName.includes('لصقة') || lowerName.includes('زجاج')) {
    category = 'cases_protection';
    images = imagePools.screens;
  } else if (lowerName.includes('cover') || lowerName.includes('جراب') || lowerName.includes('كفر') || lowerName.includes('حافظة') || lowerName.includes('ddu')) {
    category = 'cases_protection';
    images = imagePools.cases;
  } else if (lowerName.includes('power') || lowerName.includes('باور') || lowerName.includes('بانك') || lowerName.includes('powerbank')) {
    category = 'powerbanks';
    images = imagePools.powerbanks;
  } else if (lowerName.includes('watch') || lowerName.includes('ساعة') || lowerName.includes('smartwatch') || lowerName.includes('باند')) {
    category = 'smartwatches';
    images = imagePools.watches;
  } else if (lowerName.includes('iphone') || lowerName.includes('galaxy') || lowerName.includes('lenovo tap') || lowerName.includes('موبايل') || lowerName.includes('هاتف')) {
    category = 'smartphones';
    images = imagePools.smartphones;
  }

  // Stock
  const stock = rawStock > 0 ? rawStock : 5;
  const inStock = true;

  // Name formatting
  const nameAr = rawName;
  const nameEn = rawName.toUpperCase();
  const id = `prod-pos-${code || Math.abs(hashCode(rawName))}`;
  const asin = barcode ? `B0${barcode.slice(0, 8)}` : `B0${Math.floor(10000000 + Math.random() * 90000000)}`;
  const sku = barcode || skuCode || `JOE-POS-${code || Math.floor(1000 + Math.random() * 9000)}`;

  // Specs
  const specs = {
    'الماركة': brand,
    'القسم': category,
    'الحالة': 'جديد أصلي متبرشم',
    'الضمان': '12 شهراً ضمان رسمي من جو ستور',
    'كود الصنف': code || sku,
    'الباركود الدولي': barcode || sku
  };

  excelProducts.push({
    id,
    sku,
    asin,
    name_ar: nameAr,
    name_en: nameEn,
    brand,
    category,
    condition: 'brand_new',
    price,
    original_price: originalPrice,
    discount_percentage: discountPercentage,
    cost_price: costPrice,
    stock,
    in_stock: inStock,
    images,
    description_ar: `${nameAr} أصلي متوفر الآن في متجر جو ستور بأفضل سعر وجودة مضمونة مع إمكانية المعاينة قبل الدفع.`,
    description_en: `${nameEn} original product available now at JOE Store with official warranty and fast nationwide shipping.`,
    specs,
    warranty_months: 12,
    rating: Number((4.5 + (Math.abs(hashCode(rawName)) % 5) * 0.1).toFixed(1)),
    reviews_count: 15 + (Math.abs(hashCode(rawName)) % 120),
    is_featured: rawStock > 10,
    is_best_seller: rawStock > 30,
    created_at: '2026-03-01'
  });
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

console.log(`Processed ${excelProducts.length} items from Excel.`);

// Save full products array to a JSON file in public/data or src/data
const fullCatalogPath = 'src/data/allExcelProducts.json';
fs.writeFileSync(fullCatalogPath, JSON.stringify(excelProducts, null, 2), 'utf8');
console.log(`Saved all Excel products to ${fullCatalogPath} (Size: ${(fs.statSync(fullCatalogPath).size / 1024 / 1024).toFixed(2)} MB)`);
