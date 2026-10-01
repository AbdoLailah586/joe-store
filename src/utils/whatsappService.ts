import { Order, WhatsAppNotification, StoreSettings } from '../types';

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
  whatsapp_automation_url: 'http://localhost:5000',
  whatsapp_automation_email: '01554826209@whatsapp.pro',
  whatsapp_automation_pass: 'Abdo@2026',
  whatsapp_automation_token: '',
  auto_send_on_order: true,
  auto_send_on_status_change: true,
  shipping_fee_default: 35,
  free_shipping_threshold: 2500,
  tiktok_url: 'https://www.tiktok.com/@joestore2026',
  instagram_url: 'https://www.instagram.com/joestore',
  facebook_url: 'https://www.facebook.com/joestore',
  active_theme: 'royal_gold',
  hero_slides: [
    {
      id: 'slide-iphone-13',
      badge: 'العرض الأقوى في المنصورة ⚡',
      title_ar: 'آيفون 13 كسر زيرو بالضمان',
      title_en: 'iPhone 13 Mint Condition',
      subtitle_ar: 'بطاريات أصلية من 85% لـ 97% | ألوان أبيض، أزرق، زيتي، بينك | مفحوص 100% مع ضمان استبدال رسمي',
      subtitle_en: 'Original Battery Health 85%-97% | White, Blue, Olive Green, Pink | 100% Tested with Warranty',
      price: '19,800',
      oldPrice: '23,500',
      tag: 'بطاريات أصلية 85% - 97%',
      image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=1200&q=80',
      cat: 'smartphones'
    },
    {
      id: 'slide-iphone-15',
      badge: 'الإصدار الرائد الجديد متبرشم 🌟',
      title_ar: 'آيفون 15 برو ماكس تيتانيوم',
      title_en: 'iPhone 15 Pro Max Titanium',
      subtitle_ar: 'أقوى أداء بمعالج A17 Pro وكاميرا تقريب بصري 5x ومنفذ تايب سي فائق السرعة',
      subtitle_en: 'Aerospace Grade Titanium with A17 Pro Chip and Ultra-fast USB-C',
      price: '56,500',
      oldPrice: '61,000',
      tag: 'جديد متبرشم بضمان دولي ومحلي',
      image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=1200&q=80',
      cat: 'smartphones'
    },
    {
      id: 'slide-airpods',
      badge: 'صوت سينمائي ونقاء استثنائي 🎧',
      title_ar: 'إيربودز برو 2 الجديدة تايب سي',
      title_en: 'AirPods Pro 2 USB-C',
      subtitle_ar: 'عزل ضوضاء مضاعف، تتبع صوتي مكاني، وشحن لاسلكي MagSafe',
      subtitle_en: 'Up to 2x more Active Noise Cancellation and Personalized Spatial Audio',
      price: '9,400',
      oldPrice: '11,200',
      tag: 'متوفرة بأفضل سعر في مصر',
      image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=1200&q=80',
      cat: 'audio'
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
    const existing: WhatsAppNotification[] = JSON.parse(localStorage.getItem('joe_whatsapp_logs') || '[]');
    existing.unshift(notification);
    localStorage.setItem('joe_whatsapp_logs', JSON.stringify(existing.slice(0, 100)));
  } catch (e) {
    console.error('Error saving WhatsApp notification log', e);
  }
};

export const getWhatsAppLogs = (): WhatsAppNotification[] => {
  try {
    return JSON.parse(localStorage.getItem('joe_whatsapp_logs') || '[]');
  } catch (e) {
    return [];
  }
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

// Send message via whatsapp-pro-automation API
export const sendWhatsAppMessage = async (
  recipientPhone: string,
  messageText: string,
  settings: StoreSettings = defaultSettings
): Promise<{ success: boolean; simulated?: boolean; error?: string }> => {
  const formattedPhone = formatPhoneForWhatsApp(recipientPhone);
  const baseUrl = settings.whatsapp_automation_url || 'http://localhost:5000';

  let token = settings.whatsapp_automation_token;

  try {
    // If no token stored, attempt login
    if (!token && settings.whatsapp_automation_email && settings.whatsapp_automation_pass) {
      token = (await loginToWhatsAppPro(baseUrl, settings.whatsapp_automation_email, settings.whatsapp_automation_pass)) || '';
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        to: formattedPhone,
        text: messageText,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true };
    } else {
      throw new Error(`Server returned ${res.status}`);
    }
  } catch (err: any) {
    console.warn(`[WhatsApp API Notice] Could not connect to whatsapp-pro-automation on ${baseUrl} (${err.message}). Notification simulated & fallback link provided.`);
    return {
      success: false,
      simulated: true,
      error: `تعذر الاتصال بخادم واتساب برو المحلي (${err.message}) - تم تجهيز رابط الإرسال المباشر.`,
    };
  }
};

// ==========================================
// Template Builders
// ==========================================

export const buildOrderConfirmationMessage = (order: Order, settings: StoreSettings): string => {
  const itemsList = order.items
    .map((item, i) => `${i + 1}. *${item.product.name_ar}* (${item.selected_storage || item.product.storage || ''} ${item.selected_color || item.product.color_ar || ''}) × ${item.quantity} = ${(item.product.price * item.quantity).toLocaleString()} ج.م`)
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
    ? `\n🗺️ *رابط موقع التوصيل على خرائط جوجل:* \n${order.google_maps_url}`
    : '';

  return `🎉 *أهلاً بك يا ${order.customer_name} في متجر جو ستور (JOE Store)!*

تم استلام طلبك بنجاح وجاري مراجعته وتجهيزه بعناية فائقة.

📋 *تفاصيل الطلب:*
▫️ *رقم الطلب:* #${order.order_number}
▫️ *تاريخ الطلب:* ${new Date(order.created_at).toLocaleDateString('ar-EG')}
${phoneSection}
▫️ *طريقة الدفع:* ${order.payment_method === 'cod' ? 'الدفع عند الاستلام (مع إمكانية المعاينة والفحص)' : order.payment_method === 'instapay' ? 'إنستاباي (InstaPay)' : order.payment_method === 'vodafone_cash' ? 'فودافون كاش' : `بطاقة بنكية (${order.card_last4 || 'Visa/Mastercard'})`}

📦 *المنتجات:*
${itemsList}

💵 *الإجمالي النهائي:* *${order.total.toLocaleString()} ج.م* (شامل مصاريف التوصيل: ${order.shipping_fee} ج.م)

📍 *عنوان التوصيل:* ${addressLine}${mapsSection}

💡 *ملاحظة:* سنرسل لك إشعاراً آلياً فور خروج الطلب مع مندوب التوصيل لتحديد موعد الاستلام.
لأي استفسار يمكنك الرد مباشرة على هذه الرسالة! 📱`;
};

export const buildPaymentConfirmedMessage = (order: Order, settings: StoreSettings): string => {
  return `✅ *تم تأكيد الدفع لطلبك #${order.order_number} - متجر جو ستور*

عزيزنا العميل *${order.customer_name}*،
تم مراجعة وتأكيد عملية الدفع بمبلغ *${order.total.toLocaleString()} ج.م* بنجاح.
طلبك الآن قيد التجهيز والتغليف الآمن لنقله لشركة الشحن.

شكراً لثقتك في جو ستور! 🌟`;
};

export const buildShippedMessage = (order: Order, courierName: string = 'مندوب جو ستور السريع', trackingNumber: string = ''): string => {
  return `🚀 *شحنتك في الطريق إليك! - جو ستور (JOE Store)*

عزيزنا العميل *${order.customer_name}*،
تم تسليم طلبك رقم *#${order.order_number}* إلى:
🚚 *شركة الشحن / المندوب:* ${courierName}
${trackingNumber ? `🏷️ *رقم بوليصة الشحن:* ${trackingNumber}\n` : ''}
📍 *العنوان:* ${order.governorate} - ${order.city}
💵 *المبلغ المطلوب عند الاستلام:* ${order.payment_status === 'paid' ? '0 ج.م (مدفوع بالكامل مسبقاً)' : `${order.total.toLocaleString()} ج.م`}

يرجى إبقاء هاتفك متاحاً للتنسيق مع المندوب. نتمنى لك تجربة ممتعة! ✨`;
};

export const buildOutForDeliveryMessage = (order: Order): string => {
  return `🛵 *مندوب التوصيل في طريقه إليك اليوم! - جو ستور*

عزيزنا *${order.customer_name}*،
طلبك رقم *#${order.order_number}* مع المندوب الآن وسيصلك خلال ساعات اليوم.
يرجى التأكد من تجهيز المبلغ المطلوب: *${order.payment_status === 'paid' ? '0 ج.م (مدفوع)' : `${order.total.toLocaleString()} ج.م`}*.`;
};

export const buildDeliveredMessage = (order: Order): string => {
  return `🎁 *تم توصيل طلبك بنجاح! - جو ستور (JOE Store)*

ألف مبروك جهازك الجديد يا *${order.customer_name}*! 🎉
يسعدنا إتمام تسليم طلبك رقم *#${order.order_number}*.
جهازك مشمول بضمان معتمد رسمي من متجر جو ستور.`;
};

export const buildReviewRequestMessage = (order: Order): string => {
  return `⭐ *كيف كانت تجربتك مع متجر جو ستور (JOE Store)؟*

عزيزنا *${order.customer_name}*،
نتمنى أن يكون جهازك وملحقاتك قد نالت إعجابك!
رأيك يهمنا جداً في تطوير خدماتنا. نرجو منك تقييم تجربة الشراء وجودة المنتج وسرعة التوصيل عبر الرد على هذه الرسالة أو تقييمنا على صفحتنا.

شكراً لاختيارك جو ستور، ودائماً في خدمتك! ❤️📱`;
};

// Generates direct wa.me link for manual fallback
export const generateWhatsAppWebLink = (phone: string, text: string): string => {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
};
