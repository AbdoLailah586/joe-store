#!/usr/bin/env node
'use strict';

// Prepare a faithful catalog; this script never writes to the database.
// node scripts/prepare_excel_catalog.cjs --output <catalog.json> --image-pools <pools.json> [--research <research.json>] [--report <report.json>]
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const XLSX = require('xlsx');

const DEFAULT_WORKBOOK = path.resolve(__dirname, '../pyVnA7LPDzn4VTOH8Pe0KKhjKijPlM5bWqjcHyM9euaamNaa27.xlsx');
const CATEGORIES = new Set(['smartphones', 'smartwatches', 'audio', 'chargers_cables', 'powerbanks', 'cases_protection', 'accessories']);
const CONDITIONS = new Set(['unknown', 'brand_new', 'mint', 'used_good']);
const RESEARCH_FIELDS = new Set([
  'item_number', 'raw_name', 'verified', 'verified_at', 'source_urls',
  'identity_verified', 'image_match_verified', 'model_name', 'name_ar',
  'name_en', 'brand', 'category', 'condition', 'inventory_condition_verified',
  'images', 'description_ar', 'description_en', 'specs', 'about_item',
  'quick_specs', 'feature_banners', 'color_ar', 'color_en', 'color_hex',
  'storage', 'evidence_notes', 'image_sources',
]);

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function numeric(value, field, row) {
  if (value === '' || value === null || value === undefined) return 0;
  const result = Number(value);
  if (!Number.isFinite(result)) throw new Error(`Excel row ${row}: ${field} is not a finite number.`);
  return result;
}

function simplifiedName(rawName) {
  // Preserve spelling/model identifiers and meaningful COPY markers.
  return rawName.replace(/\s+/g, ' ').trim();
}

function conservativeCategory(rawName) {
  const name = rawName.toLowerCase();
  // Spare parts and watch straps must not become the compatible phone/watch.
  if (/بطاري|باتري|باتير|battery|batery|شاش[ةه]|سوكت|فلات|بورده|جرس|عدس[ةه]|دهر|ظهر|strap|استيك|باند/.test(name)) return 'accessories';
  if (/power\s*bank|powerbank|\bpower\b|باور|بانك/.test(name)) return 'powerbanks';
  if (/air\s*pod|airpod|ear\s*bud|earbud|buds|headphone|earphone|hand\s*free|handfree|handfrey|سماع|\bmic\b|\bmik\b|مايك|speaker|صب\b|beats|necklace/.test(name)) return 'audio';
  if (/cable|caple|capel|كابل|كيبل|سلك|وصلة|وصل[ةه]|\botg\b|charger|charge|charging|شاحن|plug/.test(name)) return 'chargers_cables';
  if (/screen|screan|scren|سكرين|اسكرين|لصق[ةه]|cover|case|جراب|كفر|حافظ[ةه]/.test(name)) return 'cases_protection';
  if (/watch|ساعة|ساعه/.test(name)) return 'smartwatches';
  if (/^(?:apple\s+)?iphone\s*\d/i.test(name) || /^(?:آيفون|ايفون)\s*\d/.test(name)) return 'smartphones';
  return 'accessories';
}

const KIND_NAMES = {
  tws_earbuds: ['سماعة أذن لاسلكية', 'Wireless earbuds'],
  neckband_earphones: ['سماعة رقبة', 'Neckband earphones'],
  headphones: ['سماعة رأس', 'Headphones'],
  open_ear_headphones: ['سماعة أذن مفتوحة', 'Open-ear headphones'],
  speaker: ['مكبر صوت', 'Speaker'], wired_earphones: ['سماعة سلكية', 'Wired earphones'],
  microphone: ['ميكروفون', 'Microphone'], smartwatch: ['ساعة ذكية', 'Smartwatch'],
  watch_strap: ['سوار ساعة', 'Watch strap'],
  power_bank: ['باور بانك', 'Power bank'], wall_charger: ['شاحن حائط', 'Wall charger'],
  car_charger: ['شاحن سيارة', 'Car charger'], usb_cable: ['كابل شحن وتوصيل', 'Charging cable'],
  screen_protector: ['واقي شاشة', 'Screen protector'], phone_case: ['جراب هاتف', 'Phone case'],
  holder: ['حامل هاتف', 'Phone holder'], adapter: ['محول توصيل', 'Adapter'],
  memory_card: ['كارت ذاكرة', 'Memory card'], usb_flash_drive: ['فلاشة USB', 'USB flash drive'],
  phone_battery: ['بطارية هاتف بديلة', 'Replacement phone battery'],
  replacement_screen: ['شاشة هاتف بديلة', 'Replacement phone screen'],
  phone_spare_part: ['قطعة غيار هاتف', 'Phone spare part'], mini_printer: ['طابعة صغيرة', 'Mini printer'],
  ring_light: ['إضاءة للتصوير', 'Photography light'], fan: ['مروحة صغيرة', 'Portable fan'],
  tripod: ['حامل للتصوير', 'Photography tripod'], phone_cooler: ['مبرد هاتف', 'Phone cooler'],
  camera: ['كاميرا', 'Camera'], keyboard: ['لوحة مفاتيح', 'Keyboard'], mouse: ['ماوس', 'Mouse'],
  gaming_accessory: ['ملحق للألعاب', 'Gaming accessory'], power_strip: ['مشترك كهرباء', 'Power strip'],
  electronic_ring: ['خاتم إلكتروني', 'Electronic ring'], flashlight: ['كشاف إضاءة', 'Flashlight'],
  stylus: ['قلم لمس', 'Stylus'], smartphone: ['هاتف ذكي', 'Smartphone'],
  accessory: ['ملحق للأجهزة', 'Device accessory'],
};

function itemKind(rawName) {
  const name = rawName.toLowerCase();
  if (/strap|استيك|استراب|\bband\b|باند/.test(name)) return 'watch_strap';
  if (/battery|batery|بطاري|باتري|باتير/.test(name)) return 'phone_battery';
  if (/شاش[ةهو]|باغ[ةه]|تاتش/.test(name)) return 'replacement_screen';
  if (/سوكت|فلات|بورده|جرس|عدس[ةه]|دهر|ظهر|فريم|شاسيه|درج.*شريح|بيت.*شريح|\bback\b/.test(name)) return 'phone_spare_part';
  if (/cooler|مبرد/.test(name)) return 'phone_cooler';
  if (/tripod|tri\s*pod|selfi|selfie|sifli|سيلفي/.test(name)) return 'tripod';
  if (/camera|كاميرا/.test(name)) return 'camera';
  if (/keyboard|لوحة.*مفاتيح/.test(name)) return 'keyboard';
  if (/\bmouse\b|ماوس/.test(name)) return 'mouse';
  if (/مشترك|power\s*strip/.test(name)) return 'power_strip';
  if (/خاتم|تسبيح|iqibla/.test(name)) return 'electronic_ring';
  if (/كشاف|flashlight|torch/.test(name)) return 'flashlight';
  if (/pupg|pupje|pubje|pubg|game\s*(?:pad|bad)|atary|اتاري|بابجي|تريجر/.test(name)) return 'gaming_accessory';
  if (/printer|طابع/.test(name)) return 'mini_printer';
  if (/ring\s*light|رينج|إضاءة|اضاءه/.test(name)) return 'ring_light';
  if (/\bfan\b|مروح/.test(name)) return 'fan';
  if (/\bmic\b|\bmik\b|microphone|مايك/.test(name)) return 'microphone';
  if (/necklace|neckband|life\s*u2|\bu50i\b/.test(name)) return 'neckband_earphones';
  if (/open.?ear|open.?pod|clip.?on/.test(name)) return 'open_ear_headphones';
  if (/hand\s*free|handfree|handfrey|handfre|handfrr|wired|halo|سماعة.*سلك/.test(name)) return 'wired_earphones';
  if (/speaker|صب|\bsub\b|\bmp3\b|\bsound\b|راديو|radio/.test(name)) return 'speaker';
  if (/headphone|headpones|headseat|beats|\bbets\b|\bp9\b|boom.?pop|h30i|q\d{1,2}\s*[ih]?\b/.test(name)) return 'headphones';
  if (/air\s*pod|airpod|ear\s*bud|earbud|buds|pods|tws|liberty|enco|pro\s*2|jabre|jabra|ايربود|سماع|\b[prka]\d{2}\s*i\b|joyroom\s+pro\s+t/.test(name)) return 'tws_earbuds';
  if (/power\s*bank|powerbank|\bpower\b|\bbawr\b|باور|بانك/.test(name)) return 'power_bank';
  if (/cable|caple|capel|كابل|كيبل|سلك|\baux\b|usb.*to|usp.*to|tc\s*-\s*tc|tc\s*-\s*ip/.test(name)) return 'usb_cable';
  if (/car\s*(?:charge|plug|ldnio)|(?:charge|charger).*car|شاحن.*سيار/.test(name)) return 'car_charger';
  if (/charger|charer|chargfe|charge|charging|شاحن|plug|راس.*(?:ايفون|سامسونج|ip)|\b\d{2,3}\s*wat\b/.test(name)) return 'wall_charger';
  if (/screen|screan|screern|scren|سكرين|اسكرين|لصق[ةه]|filter|lynce|\blens\b/.test(name)) return 'screen_protector';
  if (/cover|\bcase\b|جراب|كفر|حافظ[ةه]/.test(name)) return 'phone_case';
  if (/holder|\bholde\b|stand|mount|bracket|هولدر|حامل|ستاند/.test(name)) return 'holder';
  if (/adapter|convert|reader|\botg\b|محول|تحويله|وصلة|وصل[ةه]/.test(name)) return 'adapter';
  if (/memory|ميموري|\bsd\b|\bcard\b|كارت|hikvision.*\dg|kingston|sandisk/.test(name)) return 'memory_card';
  if (/flash|x.?scoot|xs.?coot|فلاش/.test(name)) return 'usb_flash_drive';
  if (/stylus|\bpen\b|قلم/.test(name)) return 'stylus';
  if (/watch|wattch|ساعة|ساعه|nova\s*\d?r?\s*lite|\bosw\s*-?\d|(?:hk|hw|ewo|mx|x|z)\s*-?\d.*(?:ultra|pro)|haino\s*teko.*(?:waterprof|waterproof|\brw\b|\bfg\b|\bsq\b)/.test(name)) return 'smartwatch';
  if (/^(?:apple\s+)?iphone\s*\d/i.test(name) || /^(?:آيفون|ايفون)\s*\d/.test(name) || /^(?:samsung|realme|oppo|infinix|nokia|lava|mi|ip)\s+[a-z]?\s*\d/.test(name) || /\d+\s+nokia\b|تليفون.*نوكيا|\bphone\b|موبايل|^جهاز\s|lenovo\s+tap/.test(name)) return 'smartphone';
  return 'accessory';
}

const KIND_CATEGORY = {
  tws_earbuds: 'audio', neckband_earphones: 'audio', headphones: 'audio',
  open_ear_headphones: 'audio', speaker: 'audio', wired_earphones: 'audio', microphone: 'audio',
  smartwatch: 'smartwatches', power_bank: 'powerbanks',
  wall_charger: 'chargers_cables', car_charger: 'chargers_cables', usb_cable: 'chargers_cables',
  screen_protector: 'cases_protection', phone_case: 'cases_protection',
  smartphone: 'smartphones',
};

function explicitBrand(rawName, kind) {
  const brands = [
    ['Joyroom', /joyroom|جويروم|\bjr-/i], ['Oraimo', /oraimo|اورايمو|أورايمو/i],
    ['Anker', /\banker\b|انكر|أنكر|soundcore/i], ['UGREEN', /ugreen|يوجرين/i],
    ['BOYA', /\bboya\b|بويا/i], ['Baseus', /baseus|بيسوس/i], ['Havit', /havit/i],
    ['LDNIO', /ldnio/i], ['Earldom', /earldom/i], ['Celebrat', /celebrat(?:e)?/i],
    ['Haino Teko', /haino\s*teko|hainoteko/i], ['Porodo', /porodo/i],
    ['Pitaka', /pitaka/i], ['Green Lion', /green\s*lion/i], ['REMAX', /remax/i],
    ['SUNPIN', /sunpin/i], ['Inkax', /inkax/i], ['HOCO', /\bhoco\b/i],
    ['Samsung', /\bsamsung\b|سامسونج/i], ['Xiaomi', /\bxiaomi\b|شاومي/i],
    ['Lenovo', /\blenovo\b/i], ['Apple', /\bapple\b|\bآبل\b/i],
    ['Nokia', /\bnokia\b|نوكيا/i], ['Realme', /\brealme\b/i], ['OPPO', /\boppo\b/i],
    ['Infinix', /\binfinix\b/i], ['LAVA', /\blava\b/i], ['JBL', /\bjbl\b/i],
    ['Kingston', /kingston/i], ['SanDisk', /sandisk/i], ['Hikvision', /hikvision/i],
    ['Huawei', /huawei|huaweo/i], ['Plokama', /plokama|polokama|polikma/i],
  ];
  for (const [brand, pattern] of brands) {
    if (!pattern.test(rawName)) continue;
    // A compatible phone maker is not automatically the accessory manufacturer.
    if (['Apple', 'Samsung', 'Xiaomi', 'Lenovo'].includes(brand) && ['phone_case', 'screen_protector', 'phone_battery', 'replacement_screen', 'phone_spare_part', 'holder'].includes(kind)) continue;
    return brand;
  }
  if (kind === 'smartphone' && /iphone|ايفون|آيفون/i.test(rawName)) return 'Apple';
  return 'غير محدد';
}

const ARABIC_BRANDS = {
  Anker: 'أنكر', Soundcore: 'ساوندكور', Joyroom: 'جوي روم', Oraimo: 'أورايمو',
  UGREEN: 'يوجرين', BOYA: 'بويا', Baseus: 'باسيوس', Havit: 'هافيت',
  LDNIO: 'لدنيو', Earldom: 'إيرلدوم', Celebrat: 'سيليبريت',
  'Haino Teko': 'هاينو تيكو', Porodo: 'بورودو', Pitaka: 'بيتاكا',
  'Green Lion': 'جرين ليون', REMAX: 'ريماكس', SUNPIN: 'صن بين',
  Inkax: 'إنكاكس', HOCO: 'هوكو', Samsung: 'سامسونج', Xiaomi: 'شاومي',
  Lenovo: 'لينوفو', Apple: 'آبل', Nokia: 'نوكيا', Realme: 'ريلمي',
  OPPO: 'أوبو', Infinix: 'إنفينكس', LAVA: 'لافا', JBL: 'جي بي إل',
  Kingston: 'كينجستون', SanDisk: 'سان ديسك', Hikvision: 'هيك فيجن',
  Huawei: 'هواوي', Plokama: 'بلوكاما',
};

function shortProductNames(rawName, brand, kind, code) {
  const [kindAr, kindEn] = KIND_NAMES[kind];
  let core = rawName.length > 160 || /^[\d\s,\-+*\\]+$/.test(rawName) ? '' : simplifiedName(rawName);
  if (brand !== 'غير محدد') {
    const patterns = {
      Joyroom: /joyroom|جويروم|جوي\s*روم/gi, Oraimo: /oraimo|اورايمو|أورايمو/gi,
      Anker: /anker|انكر|أنكر/gi, UGREEN: /ugreen|يوجرين/gi,
      'Haino Teko': /haino\s*teko|hainoteko/gi,
    };
    const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    core = core.replace(patterns[brand] || new RegExp(escaped, 'gi'), ' ');
  }
  // Strip repeated item-kind words, not model numbers or meaningful COPY tags.
  core = core.replace(/\b(?:cable|caple|capel|charger|charge|charging|plug|powerbank|power|screen|screan|screern|cover|airpod|handfree|beats|watch|microphone|mic|mik|holder|stand|mount|strap|camera|headphone|headphones|headpones|speaker|sub|memory|card)\b/gi, ' ');
  core = core.replace(/^(?:سماعة|سماعه|كابل|شاحن|جراب|كفر|باور|سكرين|اسكرين|ساعة|ساعه|حامل|هولدر|بطاريه|بطارية|شاشه|شاشة|ميكروفون|مايك|استيك|استراب|صب)\s+/i, ' ');
  core = core.replace(/\b(?:new|org|original|orginal|orignal|orgin[a]?l)\b|\bwaterprof\b|ضمان/gi, ' ');
  core = core.replace(/\s+/g, ' ').replace(/^[\s\-]+|[\s\-]+$/g, '');
  if (core.length > 80) core = core.slice(0, 77).trim() + '…';
  const brandAr = brand === 'غير محدد' ? '' : ARABIC_BRANDS[brand] || brand;
  const brandEn = brand === 'غير محدد' ? '' : brand;
  const suffix = core || (brandEn ? '' : `صنف ${code}`);
  return {
    name_ar: [kindAr, brandAr, suffix].filter(Boolean).join(' '),
    name_en: [kindEn, brandEn, core || (brandEn ? '' : `Item ${code}`)].filter(Boolean).join(' '),
  };
}

function loadBrandProfiles(input) {
  if (!input) return { brands: new Map(), verified_at: '' };
  const payload = typeof input === 'string' ? JSON.parse(fs.readFileSync(input, 'utf8').replace(/^\uFEFF/, '')) : input;
  const rows = Array.isArray(payload) ? payload : payload.brands;
  if (!Array.isArray(rows)) throw new Error('Brand profiles require a brands array.');
  const brands = new Map();
  for (const row of rows) {
    if (!row || !text(row.brand) || !text(row.description_ar) || !text(row.description_en) || !Array.isArray(row.source_urls) || !row.source_urls.length || row.source_urls.some(url => !httpsUrl(url))) throw new Error('Brand profiles require names, AR/EN backgrounds and HTTPS source URLs.');
    if (row.terminology_source_urls && (!Array.isArray(row.terminology_source_urls) || row.terminology_source_urls.some(url => !httpsUrl(url)))) throw new Error(`Brand ${row.brand}: invalid terminology source URLs.`);
    for (const alias of [row.brand, ...(row.aliases || [])]) brands.set(text(alias).toLowerCase(), row);
  }
  return { brands, verified_at: payload.verified_at || '' };
}

function appendBrandContext(product, source, profiles) {
  const profile = profiles.brands.get(product.brand.toLowerCase());
  if (profile && product.catalog_status === 'estimated') {
    product.description_ar += `\n\nعن ${ARABIC_BRANDS[profile.brand] || profile.brand}: ${profile.description_ar}`;
    product.description_en += `\n\nAbout ${profile.brand}: ${profile.description_en}`;
    product.specs['عن العلامة المذكورة'] = profile.description_ar;
    product.data_sources.push(...profile.source_urls.map(url => ({ url, title: `نبذة رسمية عن ${profile.brand}` })));
    source.brand_context = {
      brand: profile.brand, description_ar: profile.description_ar,
      description_en: profile.description_en, source_urls: profile.source_urls,
      ...(profiles.verified_at ? { verified_at: profiles.verified_at } : {}),
      actual_item_brand_verified: false,
    };
  }
  if (source.item_kind === 'usb_cable' && /\bPD\b/i.test(source.raw_name)) {
    const terminology = profile?.notes_ar && profile.terminology_source_urls?.length ? profile : profiles.brands.get('anker');
    if (terminology?.notes_ar && terminology.terminology_source_urls?.length) {
      const pdEn = 'PD means Power Delivery. The abbreviation alone does not establish cable wattage or connector type. PD charging requires a compatible cable, charger and device.';
      product.specs['معنى PD'] = terminology.notes_ar;
      product.description_ar += `\n\n${terminology.notes_ar}`;
      product.description_en += `\n\n${terminology.notes_en || pdEn}`;
      product.data_sources.push(...terminology.terminology_source_urls.map(url => ({ url, title: 'شرح مصطلح Power Delivery' })));
      source.terminology = { PD: { description_ar: terminology.notes_ar, description_en: terminology.notes_en || pdEn, source_urls: terminology.terminology_source_urls, confirms_item_support: false } };
    }
  }
  product.data_sources = product.data_sources.filter((entry, index, all) => all.findIndex(candidate => candidate.url === entry.url) === index);
}

const KIND_TEMPLATE = {
  tws_earbuds: ['الاستماع للموسيقى والمكالمات أثناء التنقل', 'Music and calls on the go', 'اتصال لاسلكي تقديري؛ الإصدار يحتاج مراجعة', 'علبة شحن متوقعة حسب الطراز؛ محتويات العبوة تحتاج مراجعة'],
  neckband_earphones: ['الاستماع والمكالمات بتصميم يلتف حول الرقبة', 'Music and calls with a neckband design', 'بلوتوث تقديري؛ الإصدار يحتاج مراجعة', 'سماعة رقبة وكابل شحن محتمل؛ محتويات العبوة تحتاج مراجعة'],
  headphones: ['الاستماع والألعاب بتصميم سماعة رأس', 'Listening and gaming with a headphone design', 'سلكي أو لاسلكي؛ يُراجع على العبوة', 'السماعة والملحقات تختلف حسب الطراز'],
  open_ear_headphones: ['الاستماع بتصميم مفتوح حول الأذن', 'Listening with an open-ear design', 'اتصال لاسلكي تقديري؛ يُراجع على العبوة', 'محتويات العبوة تحتاج مراجعة'],
  wired_earphones: ['الاستماع والمكالمات عبر وصلة سلكية', 'Music and calls using a wired connection', 'طرف التوصيل يحتاج مراجعة', 'سماعة سلكية؛ الميكروفون والملحقات يحتاجان مراجعة'],
  speaker: ['تشغيل الصوت في المنزل أو أثناء التنقل', 'Audio playback at home or on the go', 'خيارات التوصيل تختلف حسب الطراز', 'قدرة الصوت والبطارية تحتاجان مراجعة'],
  microphone: ['تسجيل الصوت والمكالمات أو صناعة المحتوى', 'Voice recording, calls or content creation', 'نوع التوصيل والتوافق يحتاجان مراجعة', 'الميكروفون وملحقاته يختلفان حسب الطراز'],
  smartwatch: ['عرض الوقت والإشعارات والاستخدام اليومي', 'Time, notifications and everyday use', 'التوافق مع الهاتف يحتاج مراجعة', 'نوع الشاشة والحساسات ومقاومة الماء تحتاج مراجعة'],
  watch_strap: ['تثبيت الساعة على المعصم أو تغيير السوار', 'Wearing a watch or replacing its strap', 'يتطلب مطابقة عرض السوار ونوع تثبيت الساعة', 'الخامة والمقاس واللون تحتاج مراجعة'],
  power_bank: ['إعادة شحن الأجهزة أثناء التنقل', 'Recharging devices on the go', 'منافذ USB تقديرية؛ الأنواع تحتاج مراجعة', 'السعة وقوة الشحن ومحتويات العبوة تحتاج مراجعة'],
  wall_charger: ['شحن الأجهزة من مصدر كهرباء مناسب', 'Charging devices from a suitable power outlet', 'منافذ وقابس الكهرباء يحتاجان مراجعة', 'تقنية الشحن وقوة الخرج تحتاجان مراجعة'],
  car_charger: ['شحن الأجهزة داخل السيارة', 'Charging devices inside a vehicle', 'توافق مدخل السيارة والمنافذ يحتاج مراجعة', 'قوة الخرج ومحتويات العبوة تحتاج مراجعة'],
  usb_cable: ['شحن أو توصيل الأجهزة وفق نوع الأطراف', 'Charging or connecting devices according to connector type', 'نوع الأطراف مستنتج عند ذكره بالاسم؛ يُراجع على العبوة', 'الطول وقدرة الشحن ونقل البيانات تحتاج مراجعة'],
  screen_protector: ['حماية شاشة الجهاز من الخدوش اليومية', 'Protecting a device screen from everyday scratches', 'يحتاج مطابقة موديل الهاتف ومقاس الشاشة', 'الخامة ودرجة الصلابة ومحتويات التركيب تحتاج مراجعة'],
  phone_case: ['تغطية الهاتف وحماية جسمه أثناء الاستخدام', 'Covering and protecting a phone during everyday use', 'يحتاج مطابقة موديل الهاتف وفتحات الكاميرا', 'الخامة واللون والمقاس يحتاجان مراجعة'],
  holder: ['تثبيت الهاتف على سطح أو داخل السيارة', 'Holding a phone on a surface or inside a vehicle', 'طريقة التثبيت ومقاس الهاتف يحتاجان مراجعة', 'الأبعاد والخامة والملحقات تحتاج مراجعة'],
  adapter: ['توصيل أو تحويل بين المنافذ حسب الطراز', 'Connecting or adapting ports according to model', 'أنواع المنافذ والتوافق تحتاج مراجعة', 'قدرة نقل البيانات والشحن تحتاج مراجعة'],
  memory_card: ['تخزين الملفات على الأجهزة المتوافقة', 'Storing files on compatible devices', 'صيغة الكارت وتوافق الجهاز يحتاجان مراجعة', 'السعة وتصنيف السرعة يحتاجان مراجعة'],
  usb_flash_drive: ['حفظ الملفات ونقلها بين الأجهزة', 'Storing and transferring files between devices', 'نوع منفذ USB وتوافق الجهاز يحتاجان مراجعة', 'السعة وسرعة القراءة والكتابة تحتاج مراجعة'],
  phone_battery: ['استبدال بطارية هاتف متوافق', 'Replacing a compatible phone battery', 'يتطلب مطابقة موديل الهاتف والتركيب الفني', 'السعة وحالة البطارية تحتاجان مراجعة'],
  replacement_screen: ['استبدال شاشة هاتف متوافق', 'Replacing a compatible phone screen', 'يتطلب مطابقة موديل الهاتف والتركيب الفني', 'نوع الشاشة وإصدارها وجودتها تحتاج مراجعة'],
  phone_spare_part: ['إصلاح أو استبدال جزء في جهاز متوافق', 'Repairing or replacing a part in a compatible device', 'يتطلب مطابقة رقم القطعة وموديل الجهاز', 'حالة القطعة ومحتوياتها تحتاج مراجعة'],
  mini_printer: ['طباعة صغيرة الحجم حسب نوع الطابعة', 'Compact printing according to printer type', 'التوصيل والتطبيق ونوع الورق يحتاجان مراجعة', 'نوع الطباعة ودقة الطابعة يحتاجان مراجعة'],
  ring_light: ['إضاءة المشهد أثناء التصوير وصناعة المحتوى', 'Lighting a scene for photography and content creation', 'مصدر الطاقة وطريقة التثبيت يحتاجان مراجعة', 'المقاس وقوة الإضاءة والملحقات تحتاج مراجعة'],
  tripod: ['تثبيت هاتف أو كاميرا أثناء التصوير', 'Holding a phone or camera during photography', 'مقاس الجهاز وطريقة تثبيته يحتاجان مراجعة', 'الارتفاع والخامة والملحقات تحتاج مراجعة'],
  phone_cooler: ['المساعدة في تهوية الهاتف أثناء الاستخدام', 'Helping ventilate a phone during use', 'طريقة التثبيت ومصدر الطاقة يحتاجان مراجعة', 'قوة التبريد والملحقات تحتاج مراجعة'],
  camera: ['التصوير أو متابعة المكان حسب نوع الكاميرا', 'Photography or observing a space according to camera type', 'التوصيل والتطبيق والتخزين يحتاجان مراجعة', 'الدقة والعدسة ومحتويات العبوة تحتاج مراجعة'],
  keyboard: ['إدخال النصوص والتحكم على جهاز متوافق', 'Entering text and controlling a compatible device', 'نوع الاتصال وتخطيط المفاتيح يحتاجان مراجعة', 'المقاس والملحقات تحتاج مراجعة'],
  mouse: ['التحكم بالمؤشر على جهاز متوافق', 'Controlling a cursor on a compatible device', 'نوع الاتصال وتوافق الجهاز يحتاجان مراجعة', 'الدقة ومصدر الطاقة والملحقات تحتاج مراجعة'],
  gaming_accessory: ['تحسين التحكم أو التثبيت أثناء الألعاب', 'Supporting control or positioning during games', 'يتطلب مطابقة نوع الجهاز وطريقة الاستخدام', 'المقاس والخامة ومحتويات العبوة تحتاج مراجعة'],
  power_strip: ['توفير توصيلات كهرباء متعددة حسب التصميم', 'Providing multiple power connections according to design', 'شكل المقابس وحدود الطاقة يحتاجان مراجعة', 'عدد المخارج وخصائص الأمان تحتاج مراجعة'],
  electronic_ring: ['وظائف إلكترونية على شكل خاتم حسب الطراز', 'Electronic functions in a ring format according to model', 'طريقة التشغيل والشحن تحتاج مراجعة', 'المقاس والوظائف ومحتويات العبوة تحتاج مراجعة'],
  flashlight: ['الإضاءة المحمولة في الاستخدام اليومي', 'Portable lighting for everyday use', 'مصدر الطاقة وطريقة الشحن يحتاجان مراجعة', 'قوة الإضاءة والملحقات تحتاج مراجعة'],
  fan: ['تهوية شخصية في المنزل أو أثناء التنقل', 'Personal ventilation at home or on the go', 'مصدر الطاقة وطريقة الشحن يحتاجان مراجعة', 'المقاس ومستويات السرعة يحتاجان مراجعة'],
  stylus: ['الكتابة أو التحكم على شاشة متوافقة', 'Writing or interacting with a compatible screen', 'التوافق مع الجهاز وطريقة التشغيل يحتاجان مراجعة', 'نوع السن والملحقات يحتاجان مراجعة'],
  smartphone: ['المكالمات والتطبيقات والاستخدام اليومي', 'Calls, apps and everyday use', 'الشبكات والنسخة الإقليمية تحتاج مراجعة', 'المساحة واللون وصحة البطارية تحتاج مراجعة'],
  accessory: ['استخدامات للأجهزة تختلف حسب نوع الملحق', 'Device uses that depend on the accessory type', 'نوع الملحق وتوافق الجهاز يحتاجان مراجعة', 'الطراز والخامة والمحتويات تحتاج مراجعة'],
};

function loadImagePools(input) {
  if (!input) return [];
  const payload = typeof input === 'string' ? JSON.parse(fs.readFileSync(input, 'utf8').replace(/^\uFEFF/, '')) : input;
  const pools = Array.isArray(payload) ? payload : payload.pools;
  if (!Array.isArray(pools) || !pools.length) throw new Error('Image pools require a nonempty pools array.');
  const aliases = { earbuds: 'tws_earbuds', powerbank: 'power_bank', charger: 'wall_charger', cable: 'usb_cable', case: 'phone_case', screen: 'screen_protector', mic: 'microphone', memory: 'memory_card', printer: 'mini_printer' };
  return pools.map(pool => {
    if (!pool || !httpsUrl(pool.image_url) || !httpsUrl(pool.source_url)) throw new Error('Each illustrative image requires HTTPS image_url and source_url.');
    return { ...pool, kind: aliases[pool.kind] || pool.kind, illustrative: true, image_match_verified: false };
  });
}

function illustrativeImage(kind, brand, code, pools) {
  const exactKind = pools.filter(pool => pool.kind === kind);
  const exactBrand = exactKind.filter(pool => String(pool.brand).toLowerCase() === brand.toLowerCase());
  const general = pools.filter(pool => pool.kind === 'accessory');
  const candidates = exactBrand.length ? exactBrand : exactKind.length ? exactKind : general.length ? general : pools;
  if (!candidates.length) return null;
  const selector = Number(code) % candidates.length;
  return candidates[selector];
}

function estimatedData(product, source, pools) {
  const kind = itemKind(source.raw_name);
  const [kindAr, kindEn] = KIND_NAMES[kind];
  const [useAr, useEn, connection, contents] = KIND_TEMPLATE[kind];
  product.category = KIND_CATEGORY[kind] || 'accessories';
  product.brand = explicitBrand(source.raw_name, kind);
  Object.assign(product, shortProductNames(source.raw_name, product.brand, kind, source.item_number));
  product.model_name = 'الطراز غير مؤكد — راجع اسم الصنف';
  product.catalog_status = 'estimated';
  product.image_is_illustrative = true;
  product.description_ar = `${product.name_ar}. للاستخدام في ${useAr}. البيانات المعروضة تقديرية مبنية على اسم الصنف، ويجب مراجعة الطراز والتوافق ومحتويات العبوة. الصورة توضيحية وليست تأكيداً لشكل الصنف الفعلي.`;
  product.description_en = `${product.name_en}. Intended for ${useEn.toLowerCase()}. Details are estimates based on the inventory name. Confirm the model, compatibility and package contents. The image is illustrative and does not confirm this item's actual appearance.`;
  product.specs = {
    'نوع المنتج (تقديري)': kindAr,
    'الطراز': 'غير مؤكد؛ يحتاج مراجعة',
    'الاستخدام (تقديري)': useAr,
    'الاتصال والتوافق (تقديري)': connection,
    'محتويات العبوة والمواصفات': contents,
    'الحالة': 'الحالة غير محددة',
    'الضمان': 'لم تُحدد مدة ضمان لهذا الصنف',
    'حالة البيانات': 'بيانات تقديرية تحتاج مراجعة',
  };
  if (product.brand !== 'غير محدد') product.specs['علامة مذكورة في اسم الصنف'] = `${product.brand} — تحتاج تأكيد`;
  const watts = source.raw_name.match(/\b(\d{1,3}(?:\.\d+)?)\s*w\b/i);
  if (watts) product.specs['قدرة مذكورة في الاسم (غير مؤكدة)'] = `${watts[1]} W`;
  const storage = source.raw_name.match(/\b(\d{1,4})\s*(?:gb|g|جيجا)\b/i);
  if (storage && ['memory_card', 'usb_flash_drive', 'smartphone'].includes(kind)) product.specs['سعة مذكورة في الاسم (غير مؤكدة)'] = `${storage[1]} GB`;
  if (kind === 'power_bank') {
    const capacity = source.raw_name.match(/\b(\d{4,6})\b/);
    if (capacity) product.specs['سعة تقديرية من الاسم'] = `${capacity[1]} mAh — تحتاج تأكيد`;
  }
  if (/\bcopy\b|كوبي|تقليد/i.test(source.raw_name)) product.specs['تنبيه اسم الصنف'] = 'الاسم الأصلي يذكر COPY؛ لا يُعرض باعتباره منتجاً أصلياً';
  product.about_item = [
    `نوع الصنف التقديري: ${kindAr}.`, `الاستخدام المتوقع: ${useAr}.`,
    connection, contents, 'تحقق من الطراز والتوافق والحالة قبل الشراء؛ لا توجد تقييمات أو ضمانات مؤكدة لهذا الصنف.',
  ];
  product.quick_specs = { 'نوع المنتج': kindAr, 'الطراز': 'غير مؤكد', 'التوافق': connection, 'حالة البيانات': 'تقديرية تحتاج مراجعة' };
  const image = illustrativeImage(kind, product.brand, source.item_number, pools);
  product.images = image ? [image.image_url] : [];
  product.data_sources = image ? [{ url: image.source_url, title: `مصدر الصورة التوضيحية: ${image.representative_model || image.brand || kindEn}` }] : [];
  source.item_kind = kind;
  source.image = image ? {
    illustrative: true, image_match_verified: false, image_url: image.image_url,
    source_url: image.source_url, representative_model: image.representative_model || '',
    representative_kind: image.kind,
    label_ar: image.kind === kind ? 'صورة توضيحية لطراز من نفس الفئة؛ صورة الصنف تحتاج مراجعة' : 'صورة توضيحية من كتالوج الملحقات؛ ليست صورة الصنف الفعلية',
    ...(image.verified_at ? { observed_at: image.verified_at } : {}),
  } : { illustrative: true, image_match_verified: false, label_ar: 'صورة الصنف تحتاج مراجعة' };
}

function httpsUrl(value) {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

function stringMap(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be a string map.`);
  const result = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key.startsWith('__')) throw new Error(`${label}: reserved metadata key ${key}.`);
    if (typeof entry !== 'string' || !text(entry)) throw new Error(`${label}: ${key} must be a nonempty string.`);
    result[key] = entry.trim();
  }
  return result;
}

function loadResearch(input) {
  if (!input) return new Map();
  const value = typeof input === 'string' ? JSON.parse(fs.readFileSync(input, 'utf8').replace(/^\uFEFF/, '')) : input;
  let entries;
  if (Array.isArray(value)) entries = value;
  else if (value && Array.isArray(value.products)) entries = value.products;
  else if (value && value.products && typeof value.products === 'object') {
    entries = Object.entries(value.products).map(([code, record]) => ({ ...record, item_number: record.item_number || code }));
  } else throw new Error('Research must be an array or an object with a products array/code-keyed object.');
  const result = new Map();
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Each research entry must be an object.');
    const code = text(entry.item_number);
    if (!code) throw new Error('Research entry is missing item_number.');
    if (result.has(code)) throw new Error(`Duplicate research entry for item ${code}.`);
    for (const field of Object.keys(entry)) {
      if (!RESEARCH_FIELDS.has(field)) throw new Error(`Research item ${code}: unsupported field ${field}; source prices/stock cannot be overridden.`);
    }
    const categoryAliases = { chargers: 'chargers_cables', cables: 'chargers_cables', powerbank: 'powerbanks', watches: 'smartwatches' };
    result.set(code, { ...entry, category: categoryAliases[entry.category] || entry.category });
  }
  return result;
}

function applyResearch(product, entry, source) {
  if (!entry) return ['exact_product_research_missing'];
  if (text(entry.raw_name) !== source.raw_name) throw new Error(`Research item ${source.item_number}: raw_name does not match Excel row ${source.row}.`);
  const reasons = [];
  const verifiedImages = Array.isArray(entry.images) ? entry.images.filter(url => typeof url === 'string' && !/(?:^|\/)(?:loading|placeholder|spinner|favicon|sprite)(?:[.?#/_-]|$)/i.test(url)) : [];
  if (entry.verified !== true) reasons.push('research_not_verified');
  if (entry.identity_verified !== true) reasons.push('exact_identity_not_verified');
  if (entry.image_match_verified !== true) reasons.push('exact_image_match_not_verified');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text(entry.verified_at)) || Number.isNaN(Date.parse(entry.verified_at))) reasons.push('research_date_missing');
  if (!Array.isArray(entry.source_urls) || !entry.source_urls.length || entry.source_urls.some(url => typeof url !== 'string' || !httpsUrl(url))) reasons.push('research_source_urls_missing');
  if (!verifiedImages.length || verifiedImages.some(url => !httpsUrl(url))) reasons.push('exact_product_images_missing');
  for (const key of ['model_name', 'brand', 'name_ar', 'name_en', 'description_ar', 'description_en']) {
    if (typeof entry[key] !== 'string' || !text(entry[key])) reasons.push(`${key}_missing`);
  }
  if (!entry.specs || typeof entry.specs !== 'object' || Array.isArray(entry.specs) || !Object.keys(entry.specs).length) reasons.push('verified_specs_missing');
  if (!Array.isArray(entry.about_item) || !entry.about_item.length || entry.about_item.some(item => typeof item !== 'string' || !text(item))) reasons.push('verified_about_item_missing');
  if (!CATEGORIES.has(entry.category)) reasons.push('verified_category_missing');
  if (/\bcopy\b|كوبي|تقليد/i.test(source.raw_name)) reasons.push('copy_item_requires_store_identification');
  if (reasons.length) return reasons;

  for (const key of ['model_name', 'brand', 'name_ar', 'name_en', 'description_ar', 'description_en']) product[key] = text(entry[key]);
  product.category = entry.category;
  product.images = [...new Set(verifiedImages)];
  product.specs = stringMap(entry.specs, `Research item ${source.item_number} specs`);
  product.about_item = entry.about_item.map(text);
  product.quick_specs = entry.quick_specs
    ? stringMap(entry.quick_specs, `Research item ${source.item_number} quick_specs`)
    : { 'الطراز': product.model_name, ...Object.fromEntries(Object.entries(product.specs).slice(0, 5)) };
  if (entry.inventory_condition_verified === true) {
    if (!CONDITIONS.has(entry.condition)) throw new Error(`Research item ${source.item_number}: invalid inventory condition.`);
    product.condition = entry.condition;
  }
  for (const key of ['color_ar', 'color_en', 'color_hex', 'storage']) {
    if (typeof entry[key] === 'string' && text(entry[key])) product[key] = text(entry[key]);
  }
  if (entry.feature_banners) {
    if (!Array.isArray(entry.feature_banners)) throw new Error(`Research item ${source.item_number}: feature_banners must be an array.`);
    product.feature_banners = entry.feature_banners.map(banner => {
      if (!banner || !text(banner.title) || !text(banner.description) || !httpsUrl(banner.image_url)) throw new Error(`Research item ${source.item_number}: invalid feature banner.`);
      return banner;
    });
  }
  source.research = {
    verified: true,
    verified_at: entry.verified_at,
    source_urls: [...new Set(entry.source_urls)],
    identity_verified: true,
    image_match_verified: true,
    model_name: product.model_name,
    ...(entry.evidence_notes ? { evidence_notes: entry.evidence_notes } : {}),
    ...(entry.image_sources ? { image_sources: entry.image_sources } : {}),
  };
  product.catalog_status = 'verified';
  product.image_is_illustrative = false;
  product.data_sources = source.research.source_urls.map(url => ({ url, title: 'مصدر بيانات الطراز' }));
  source.image = {
    illustrative: false, image_match_verified: true, image_urls: product.images,
    source_urls: source.research.source_urls, observed_at: entry.verified_at,
    label_ar: 'صور موثقة للطراز المذكور',
  };
  return [];
}

function prepareCatalog({ workbookPath = DEFAULT_WORKBOOK, research, imagePools, brandProfiles } = {}) {
  const bytes = fs.readFileSync(workbookPath);
  const workbook = XLSX.read(bytes, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '', blankrows: true });
  const headerIndex = rows.findIndex(row => text(row[1]) === 'رقم الصنف' && text(row[2]) === 'اسم الصنف' && text(row[5]) === 'سعر البيع');
  if (headerIndex < 0) throw new Error('Expected source columns B=item number, C=name and F=sale price were not found.');
  if (text(rows[headerIndex][3]) !== 'إجمالى الكمية' || text(rows[headerIndex][6]) !== 'متوسط سعر الشراء') throw new Error('Stock/purchase-cost source columns do not match the expected layout.');
  const overlays = loadResearch(research);
  const pools = loadImagePools(imagePools);
  const profiles = loadBrandProfiles(brandProfiles);
  const usedOverlays = new Set();
  const itemNumbers = new Set();
  const products = [];
  const report = {
    workbook_sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    sheet_name: sheetName, header_row: headerIndex + 1,
    product_rows: 0, source_stock_sum: 0, sellable_stock_sum: 0,
    source_positive_stock_rows: 0, source_zero_stock_rows: 0, source_negative_stock_rows: 0,
    missing_sale_price_rows: 0, negative_sale_price_rows: 0,
    public_rows: 0, estimated_rows: 0, verified_rows: 0, needs_price_rows: 0,
    verified_research_rows: 0, missing_image_rows: 0, duplicate_names: [],
    brand_context_rows: 0, pd_terminology_rows: 0,
    review_reason_counts: {}, item_kind_counts: {}, image_kind_fallback_rows: 0,
  };
  const nameCounts = new Map();
  for (let index = headerIndex + 1; index < rows.length; index++) {
    const row = rows[index];
    const rawName = text(row[2]);
    if (!rawName) continue; // Title/blank/grand-total rows are not products.
    const rowNumber = index + 1;
    const itemNumber = text(row[1]);
    if (!/^\d+$/.test(itemNumber)) throw new Error(`Excel row ${rowNumber}: missing or invalid item number.`);
    if (itemNumbers.has(itemNumber)) throw new Error(`Excel row ${rowNumber}: duplicate item number ${itemNumber}; refusing to discard a source row.`);
    itemNumbers.add(itemNumber);
    const quantity = numeric(row[3], 'stock', rowNumber);
    const price = numeric(row[5], 'sale price', rowNumber);
    const costPrice = numeric(row[6], 'average purchase cost', rowNumber);
    const source = {
      format_version: 1,
      workbook_name: path.basename(workbookPath), workbook_sha256: report.workbook_sha256,
      sheet_name: sheetName, row: rowNumber, item_number: itemNumber, raw_name: rawName,
      source_stock: quantity, source_sale_price: price, source_average_cost: costPrice,
      source_last_cost: numeric(row[7], 'last purchase cost', rowNumber),
      source_barcode: text(row[8]), source_unit: text(row[4]),
      source_alternate_code: text(row[9]), source_category: text(row[10]),
      status: 'estimated', review_reasons: [],
    };
    const product = {
      id: `prod-pos-${itemNumber}`, sku: source.source_barcode || `JOE-POS-${itemNumber}`,
      name_ar: simplifiedName(rawName), name_en: simplifiedName(rawName),
      brand: 'غير محدد', category: conservativeCategory(rawName), condition: 'unknown',
      price, cost_price: costPrice, stock: Math.max(0, quantity), in_stock: quantity > 0,
      images: [], description_ar: '', description_en: '', specs: {},
      warranty_months: 0, rating: 0, reviews_count: 0,
      is_active: false, is_featured: false, is_best_seller: false,
      listing_status: 'estimated', import_metadata: source,
      source_row: rowNumber, source_item_code: itemNumber,
      source_name: rawName, raw_source_stock: quantity,
    };
    estimatedData(product, source, pools);
    const entry = overlays.get(itemNumber);
    if (entry) usedOverlays.add(itemNumber);
    source.review_reasons = applyResearch(product, entry, source);
    appendBrandContext(product, source, profiles);
    if (price <= 0) source.review_reasons.push('sale_price_missing');
    if (quantity < 0) source.review_reasons.push('negative_stock_requires_reconciliation');
    if (!product.images.length) source.review_reasons.push('illustrative_image_missing');
    source.status = price <= 0 ? 'needs_price' : product.catalog_status;
    product.listing_status = source.status;
    // User authorized publishing every inventory row with labelled estimates.
    // Missing prices and zero/negative stock are never replaced with guesses.
    product.is_active = true;
    // Persist provenance with the existing JSONB specs column. Public UIs must
    // exclude keys beginning with __; purchase costs belong to the admin view.
    product.specs.__catalog_import = JSON.stringify(source);
    products.push(product);
    report.product_rows++;
    report.source_stock_sum += quantity;
    report.sellable_stock_sum += product.stock;
    report.source_positive_stock_rows += Number(quantity > 0);
    report.source_zero_stock_rows += Number(quantity === 0);
    report.source_negative_stock_rows += Number(quantity < 0);
    report.missing_sale_price_rows += Number(price === 0);
    report.negative_sale_price_rows += Number(price < 0);
    report.public_rows += Number(product.is_active);
    report.estimated_rows += Number(product.catalog_status === 'estimated');
    report.verified_rows += Number(product.catalog_status === 'verified');
    report.needs_price_rows += Number(price <= 0);
    report.missing_image_rows += Number(!product.images.length);
    report.verified_research_rows += Number(Boolean(source.research));
    report.brand_context_rows += Number(Boolean(source.brand_context));
    report.pd_terminology_rows += Number(Boolean(source.terminology?.PD));
    report.item_kind_counts[source.item_kind] = (report.item_kind_counts[source.item_kind] || 0) + 1;
    report.image_kind_fallback_rows += Number(product.image_is_illustrative && source.image.representative_kind !== source.item_kind);
    for (const reason of source.review_reasons) report.review_reason_counts[reason] = (report.review_reason_counts[reason] || 0) + 1;
    const normalizedName = rawName.toLowerCase();
    nameCounts.set(normalizedName, (nameCounts.get(normalizedName) || 0) + 1);
  }
  for (const code of overlays.keys()) {
    if (!usedOverlays.has(code)) throw new Error(`Research references absent source item ${code}.`);
  }
  report.duplicate_names = [...nameCounts].filter(([, count]) => count > 1).map(([name, count]) => ({ name, count }));
  return { products, report };
}

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (flag === '--help') return { help: true };
    if (!['--workbook', '--research', '--image-pools', '--brand-profiles', '--output', '--report'].includes(flag)) throw new Error(`Unknown argument ${flag}.`);
    const value = args[++index];
    if (!value || value.startsWith('--')) throw new Error(`${flag} requires a path.`);
    options[flag.slice(2)] = path.resolve(value);
  }
  if (!options.output) throw new Error('--output is required; no catalog destination is implicit.');
  const inputPaths = [options.workbook || DEFAULT_WORKBOOK, options.research, options['image-pools'], options['brand-profiles']];
  if (inputPaths.includes(options.output)) throw new Error('Output cannot overwrite an input file.');
  if (options.report && [options.output, ...inputPaths].includes(options.report)) throw new Error('Report must have its own output path.');
  return options;
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log('node scripts/prepare_excel_catalog.cjs --output <catalog.json> --image-pools <pools.json> [--brand-profiles <brands.json>] [--workbook <inventory.xlsx>] [--research <research.json>] [--report <report.json>]');
    } else {
      const result = prepareCatalog({ workbookPath: options.workbook || DEFAULT_WORKBOOK, research: options.research, imagePools: options['image-pools'], brandProfiles: options['brand-profiles'] });
      writeJson(options.output, result.products);
      if (options.report) writeJson(options.report, result.report);
      console.log(JSON.stringify({ output: options.output, ...result.report }, null, 2));
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { prepareCatalog, loadResearch, loadImagePools, loadBrandProfiles, shortProductNames, conservativeCategory, itemKind, explicitBrand, simplifiedName, parseArgs };
