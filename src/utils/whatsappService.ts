import { Order, WhatsAppNotification, StoreSettings } from '../types';
import { readStoredArray, writeStoredJson, isStoredNotification } from './browserStorage';

export const defaultSettings: StoreSettings = {
  store_name_ar: 'جو ستور - JOE Store',
  store_name_en: 'JOE Store',
  store_phone: '01554826209',
  store_whatsapp: '201554826209',
  store_address_ar: 'المنصورة – شارع الإمام محمد عبده – ناصية آمون.',
  store_address_en: 'El Mansoura – Imam Mohamed Abdo Street – Amon Corner.',
  working_hours_ar: 'يومياً من الساعة 12 ظهراً حتى 12 منتصف الليل',
  working_hours_en: 'Daily from 12:00 PM to 12:00 AM',
  instapay_address: 'joestore@instapay',
  vodafone_cash_number: '01554826209',
  whatsapp_automation_url: '',
  whatsapp_automation_email: '',
  whatsapp_automation_pass: '',
  whatsapp_automation_token: '',
  auto_send_on_order: false,
  auto_send_on_status_change: false,
  auto_alert_admin_on_order: false,
  whatsapp_auto_triggers: {
    admin_new_order: false,
    order_confirmed: false,
    payment_verified: false,
    processing: false,
    shipped: false,
    out_for_delivery: false,
    delivered: false,
    cancelled: false,
  },
  admin_alert_whatsapp_number: '201554826209',
  shipping_fee_default: 35,
  free_shipping_threshold: 2500,
  tiktok_url: 'https://www.tiktok.com/@joestore2026',
  instagram_url: 'https://www.instagram.com/joestore',
  facebook_url: 'https://www.facebook.com/joestore',
  active_theme: 'royal_gold',
  hero_slides: [
    {
      id: 'slide-hunter-banner',
      badge: 'جديد وحصري في جو ستور 🔥',
      title_ar: 'سلسلة شواحن هنتر الأصلية HUNTER Fast Charging',
      title_en: 'HUNTER GaN III Fast Charging Series',
      subtitle_ar: 'تقنيات شحن ذكية GaN III بقدرات 20W إلى 67W مع ضمان استبدال رسمي 12 شهر',
      subtitle_en: 'Next-gen GaN III ultra-fast charging from 20W to 67W with 12-month official warranty',
      price: '280',
      oldPrice: '360',
      tag: 'شواحن هنتر الأصلية',
      image: '/product-images/banner-hunter-charging-series.jpg',
      cat: 'chargers'
    },
    {
      id: 'slide-iphone-16pm',
      badge: 'قسم هواتف آيفون 🍎',
      title_ar: 'هواتف آيفون كسر زيرو وجديد بالضمان',
      title_en: 'iPhones Certified Mint & Sealed',
      subtitle_ar: 'مفحوصة بدقة أكثر من 30 نقطة مع ضمان استبدال رسمي وأفضل بطاريات أصلية',
      subtitle_en: '30-point inspected genuine devices with battery health warranty',
      price: '',
      oldPrice: '',
      tag: 'تشكيلة الآيفون المتاحة',
      image: '/product-images/cat-iphone-16pm.jpg',
      cat: 'iphones'
    },
    {
      id: 'slide-oraimo-spacebuds',
      badge: 'صوت نقي وعزل ضوضاء ANC',
      title_ar: 'سماعات أورايمو وساوندكور الأصلية',
      title_en: 'Oraimo & Soundcore Original Headsets',
      subtitle_ar: 'عزل ضوضاء نشط ANC وبطارية تدوم حتى 36 ساعة وصوت جهير HavyBass',
      subtitle_en: 'Adaptive Active Noise Cancellation, 36H battery & HavyBass audio',
      price: '650',
      oldPrice: '850',
      tag: 'ضمان رسمي 12 شهر',
      image: '/product-images/oraimo-spacebuds-n-studio.png',
      cat: 'headsets'
    }
  ],
  custom_categories: [
    { key: 'iphones', name_ar: 'هواتف آيفون', name_en: 'iPhones', image: '/product-images/cat-iphone-16pm.jpg' },
    { key: 'feature_phones', name_ar: 'هواتف زراير', name_en: 'Feature Phones', image: '/product-images/cat-feature-phone-nokia.jpg' },
    { key: 'chargers', name_ar: 'شواحن جدارية وسريعة', name_en: 'Fast Wall Chargers', image: '/product-images/onmust-zolo-30w-studio.jpg' },
    { key: 'cables', name_ar: 'كابلات الشحن والداتا', name_en: 'Charging Cables', image: '/product-images/4eb8c59128f84c84a66cd390.webp' },
    { key: 'car_chargers', name_ar: 'شواحن سيارات', name_en: 'Car Chargers', image: '/product-images/b5e6d3bea2ecc40b6fd50a29.webp' },
    { key: 'wireless_chargers', name_ar: 'شواحن لاسلكية MagSafe', name_en: 'Wireless Chargers', image: '/product-images/cat-wireless-charger.jpg' },
    { key: 'headsets', name_ar: 'سماعات هيدسيت وإيربودز', name_en: 'Headsets & Earbuds', image: '/product-images/3c06d2c8e8216b7d3f06254a.webp' },
    { key: 'headphones', name_ar: 'سماعات هيدفون', name_en: 'Headphones', image: '/product-images/f6427a20c128ea77c56bc426.webp' },
    { key: 'smartwatches', name_ar: 'ساعات ذكية', name_en: 'Smartwatches', image: '/product-images/cat-apple-watch-ultra.jpg' },
    { key: 'powerbanks', name_ar: 'باور بانك', name_en: 'Power Banks', image: '/product-images/15c3630cb4bb430b367edd7f.webp' },
    { key: 'cases_protection', name_ar: 'كفرات وحماية', name_en: 'Cases & Covers', image: '/product-images/case-xinreeu-frosted-orange-ip17promax.jpg' },
    { key: 'screen_protectors', name_ar: 'اسكرينات وحماية العدسات', name_en: 'Screen & Lens Guards', image: '/product-images/a792cefeb7c50327e00a5792.png' },
    { key: 'smart_rings', name_ar: 'خواتم التسبيح الذكية', name_en: 'Smart Tasbih Rings', image: '/product-images/tasbih-beiqi-s7pro-studio.png' },
    { key: 'holders_stands', name_ar: 'حوامل وترايبود', name_en: 'Holders & Stands', image: '/product-images/1eb83468cd59fda0e5a9ca9a.webp' },
    { key: 'straps_bands', name_ar: 'أساور وحماية الساعات', name_en: 'Watch Straps & Bumpers', image: '/product-images/strap-alpine-loop-titanium-ghook-4colors.jpg' },
    { key: 'photography_mics', name_ar: 'مايكات ومعدات تصوير', name_en: 'Mics & Gimbals', image: '/product-images/m1-gimbal-stabilizer-studio.png' },
    { key: 'trackers', name_ar: 'أجهزة تتبع ذكية', name_en: 'Smart Trackers', image: '/product-images/world-tag-apple-findmy-studio.jpg' },
    { key: 'car_accessories', name_ar: 'مستلزمات وطوارئ السيارات', name_en: 'Car Accessories', image: '/product-images/earldom-js02-studio.png' },
    { key: 'speakers', name_ar: 'مكبرات صوت سبيكر', name_en: 'Bluetooth Speakers', image: '/product-images/3af3d5bd2ec35679a678251e.webp' },
    { key: 'adapters', name_ar: 'محولات ووصلات OTG', name_en: 'Adapters & Hubs', image: '/product-images/4312cb7f98e9ef14a712461d.webp' },
  ],
  coupons: [
    {
      id: 'coupon-joe2026',
      code: 'JOE2026',
      discount_type: 'percentage',
      discount_value: 10,
      min_order_amount: 200,
      max_discount_amount: 500,
      is_active: true,
      used_by: [],
      created_at: new Date().toISOString()
    },
    {
      id: 'coupon-welcome50',
      code: 'WELCOME50',
      discount_type: 'fixed',
      discount_value: 50,
      min_order_amount: 300,
      is_active: true,
      used_by: [],
      created_at: new Date().toISOString()
    }
  ]
};

// Formats phone numbers for Egyptian & international WhatsApp formats
export const formatPhoneForWhatsApp = (rawPhone: string): string => {
  let cleaned = rawPhone.replace(/\D/g, '');
  if (cleaned.startsWith('00')) cleaned = cleaned.slice(2);
  if (cleaned.startsWith('01')) cleaned = '2' + cleaned;
  if (!cleaned.startsWith('20') && cleaned.startsWith('1')) cleaned = '20' + cleaned;
  return cleaned;
};

// Log a notification to local storage
export const recordWhatsAppNotification = (notification: WhatsAppNotification) => {
  try {
    const existing = readStoredArray('joe_whatsapp_logs', isStoredNotification);
    existing.unshift(notification);
    writeStoredJson('joe_whatsapp_logs', existing.slice(0, 100));
  } catch (e) {
    console.error('Error saving WhatsApp notification log', e);
  }
};

export const getWhatsAppLogs = (): WhatsAppNotification[] => {
  return readStoredArray('joe_whatsapp_logs', isStoredNotification);
};

// Authenticate with WhatsApp Pro Automation server if needed
export const loginToWhatsAppPro = async (baseUrl: string, email: string, pass: string): Promise<string | null> => {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (data.token) {
      return data.token;
    }
    return null;
  } catch (err) {
    console.warn('[WhatsApp Pro] Login failed or server offline:', err);
    return null;
  }
};

// Send message via WhatsApp Pro CRM (configured safely on server; browser only falls back to wa.me if URL explicitly set)
export const sendWhatsAppMessage = async (
  recipientPhone: string,
  messageText: string,
  settings: StoreSettings = defaultSettings
): Promise<{ success: boolean; simulated?: boolean; error?: string }> => {
  const formattedPhone = formatPhoneForWhatsApp(recipientPhone);
  const baseUrl = String(settings.whatsapp_automation_url || '').trim();
  const token = String(settings.whatsapp_automation_token || '').trim();

  if (!baseUrl || !token) {
    return {
      success: false,
      simulated: true,
      error: 'يتم الإرسال عبر خادم WhatsApp CRM أو عبر رابط واتساب المباشر.'
    };
  }

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        to: formattedPhone,
        text: messageText,
      }),
    });

    if (res.ok) {
      return { success: true };
    } else {
      throw new Error(`Server returned ${res.status}`);
    }
  } catch (err: any) {
    return {
      success: false,
      simulated: true,
      error: `تعذر الاتصال بخادم واتساب برو (${err.message}) - تم تجهيز رابط الإرسال المباشر.`,
    };
  }
};

// ==========================================
// Template Builders
// ==========================================

export const buildOrderConfirmationMessage = (order: Order, settings: StoreSettings): string => {
  const itemsList = order.items
    .map((item, i) => {
      const months = item.product.warranty_months ?? 0;
      const warrantySpec = item.product.specs?.['الضمان'] || item.product.specs?.['warranty'];
      const hasWarranty = months > 0 || (Boolean(warrantySpec) && !/لا يوجد|بدون|غير متوفر/i.test(warrantySpec));
      const warrantyTag = hasWarranty 
        ? ` [ضمان: ${months > 0 ? `${months} شهر` : warrantySpec}]` 
        : '';
      return `${i + 1}. *${item.product.name_ar}* (${item.selected_storage || item.product.storage || ''} ${item.selected_color || item.product.color_ar || ''}) × ${item.quantity} = ${(item.product.price * item.quantity).toLocaleString()} ج.م${warrantyTag}`;
    })
    .join('\n');

  const addressLine = [
    `${order.governorate} - ${order.city}`,
    order.address_details,
    order.building_no ? `عمارة/مبنى: ${order.building_no}` : '',
    order.floor_no ? `الدور: ${order.floor_no}` : '',
    order.apartment_no ? `شقة: ${order.apartment_no}` : '',
    order.landmark ? `علامة مميزة: ${order.landmark}` : ''
  ].filter(Boolean).join(' | ');

  const phoneSection = order.customer_secondary_phone 
    ? `▫️ *رقم الهاتف:* ${order.customer_phone} (بديل: ${order.customer_secondary_phone})`
    : `▫️ *رقم الهاتف:* ${order.customer_phone}`;

  const mapsSection = order.google_maps_url
    ? `\n*رابط موقع التوصيل على خرائط جوجل:* \n${order.google_maps_url}`
    : '';

  return `*أهلاً بك يا ${order.customer_name} في متجر جو ستور (JOE Store)*

تم استلام طلبك بنجاح وجاري مراجعته وتجهيزه بعناية فائقة.

*تفاصيل الطلب:*
▫️ *رقم الطلب:* #${order.order_number}
▫️ *تاريخ الطلب:* ${new Date(order.created_at).toLocaleDateString('ar-EG')}
${phoneSection}
▫️ *طريقة الدفع:* ${order.payment_method === 'cod' ? 'الدفع عند الاستلام (مع إمكانية المعاينة والفحص)' : order.payment_method === 'instapay' ? 'إنستاباي (InstaPay)' : order.payment_method === 'vodafone_cash' ? 'فودافون كاش' : `بطاقة بنكية (${order.card_last4 || 'Visa/Mastercard'})`}

*المنتجات:*
${itemsList}

*الإجمالي النهائي:* *${order.total.toLocaleString()} ج.م* (شامل مصاريف التوصيل: ${order.shipping_fee} ج.م)

*عنوان التوصيل:* ${addressLine}${mapsSection}

*ملاحظة:* سنرسل لك إشعاراً آلياً فور خروج الطلب مع مندوب التوصيل لتحديد موعد الاستلام.
لأي استفسار يمكنك الرد مباشرة على هذه الرسالة.`;
};

export const buildPaymentConfirmedMessage = (order: Order, settings: StoreSettings): string => {
  return `*تم تأكيد الدفع لطلبك #${order.order_number} - متجر جو ستور*

عزيزنا العميل *${order.customer_name}*،
تم مراجعة وتأكيد عملية الدفع بمبلغ *${order.total.toLocaleString()} ج.م* بنجاح.
طلبك الآن قيد التجهيز والتغليف الآمن لنقله لشركة الشحن.

شكراً لثقتك في جو ستور.`;
};

export const buildProcessingMessage = (order: Order): string => {
  return `*تم تجهيز طلبك وجاري تسليمه لشركة الشحن - جو ستور (JOE Store)*

عزيزنا *${order.customer_name}*،
تم الانتهاء من تجهيز وتغليف طلبك رقم *#${order.order_number}* بنجاح، وجاري الآن تسليمه لشركة الشحن المختارة.`;
};

export const buildShippedMessage = (order: Order, courierName: string = 'مندوب جو ستور السريع', trackingNumber: string = ''): string => {
  return `*شحنتك في الطريق إليك - جو ستور (JOE Store)*

عزيزنا العميل *${order.customer_name}*،
تم تسليم طلبك رقم *#${order.order_number}* إلى:
*شركة الشحن / المندوب:* ${courierName}
${trackingNumber ? `*رقم بوليصة الشحن:* ${trackingNumber}\n` : ''}
*العنوان:* ${order.governorate} - ${order.city}
*المبلغ المطلوب عند الاستلام:* ${order.payment_status === 'paid' ? '0 ج.م (مدفوع بالكامل مسبقاً)' : `${order.total.toLocaleString()} ج.م`}

يرجى إبقاء هاتفك متاحاً للتنسيق مع المندوب. نتمنى لك تجربة ممتعة.`;
};

export const buildOutForDeliveryMessage = (order: Order): string => {
  return `*مندوب التوصيل في طريقه إليك اليوم - جو ستور*

عزيزنا *${order.customer_name}*،
طلبك رقم *#${order.order_number}* مع المندوب الآن وسيصلك خلال ساعات اليوم.
يرجى التأكد من تجهيز المبلغ المطلوب: *${order.payment_status === 'paid' ? '0 ج.م (مدفوع)' : `${order.total.toLocaleString()} ج.م`}*.`;
};

export const buildDeliveredMessage = (order: Order): string => {
  const warrantedItems = order.items.filter(item => {
    const months = item.product.warranty_months ?? 0;
    const spec = item.product.specs?.['الضمان'] || item.product.specs?.['warranty'];
    return months > 0 || (Boolean(spec) && !/لا يوجد|بدون|غير متوفر/i.test(spec));
  });
  const warrantyText = warrantedItems.length > 0
    ? `\n*الضمان:* الأجهزة والمنتجات المشمولة بالضمان في طلبك مفعل ضمانها المعتمد لدى متجر جو ستور وفقاً للشروط المحددة.`
    : '';

  return `*تم توصيل طلبك بنجاح - جو ستور (JOE Store)*

ألف مبروك استلام طلبك يا *${order.customer_name}*.
يسعدنا إتمام تسليم طلبك رقم *#${order.order_number}*.${warrantyText}`;
};

export const buildReviewRequestMessage = (order: Order): string => {
  return `⭐ *كيف كانت تجربتك مع متجر جو ستور (JOE Store)؟*

عزيزنا *${order.customer_name}*،
نتمنى أن يكون جهازك وملحقاتك قد نالت إعجابك!
رأيك يهمنا جداً في تطوير خدماتنا. نرجو منك تقييم تجربة الشراء وجودة المنتج وسرعة التوصيل عبر الرد على هذه الرسالة أو تقييمنا على صفحتنا.

شكراً لاختيارك جو ستور، ودائماً في خدمتك! ❤️📱`;
};

export const buildDefaultWhatsAppMessage = (
  type: WhatsAppNotification['type'],
  order: Order,
  settings: StoreSettings = defaultSettings,
  courierName: string = 'مندوب جو ستور السريع',
  trackingNumber: string = ''
): string => {
  if (type === 'order_confirmed') return buildOrderConfirmationMessage(order, settings);
  if (type === 'payment_verified') return buildPaymentConfirmedMessage(order, settings);
  if (type === 'processing') return buildProcessingMessage(order);
  if (type === 'shipped') return buildShippedMessage(order, courierName, trackingNumber);
  if (type === 'out_for_delivery') return buildOutForDeliveryMessage(order);
  if (type === 'delivered') return buildDeliveredMessage(order);
  if (type === 'review_request') return buildReviewRequestMessage(order);
  return buildOrderConfirmationMessage(order, settings);
};

// Generates direct wa.me link for manual fallback
export const generateWhatsAppWebLink = (phone: string, text: string): string => {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
};
