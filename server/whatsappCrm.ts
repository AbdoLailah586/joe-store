import { randomBytes } from 'node:crypto';
import { normalizePhone } from '../src/utils/deliveryAddress.js';
import type { Order, StoreSettings, WhatsAppAutoTriggers, WhatsAppNotification, WhatsAppTemplates } from '../src/types/index.js';

type NotificationType = WhatsAppNotification['type'];

export const DEFAULT_WHATSAPP_AUTO_TRIGGERS: WhatsAppAutoTriggers = {
  admin_new_order: false,
  order_confirmed: false,
  payment_verified: false,
  processing: false,
  shipped: false,
  out_for_delivery: false,
  delivered: false,
  cancelled: false,
};

export type WhatsAppAutoTriggerKey = keyof WhatsAppAutoTriggers;

const AUTO_TRIGGER_KEYS: WhatsAppAutoTriggerKey[] = [
  'admin_new_order',
  'order_confirmed',
  'payment_verified',
  'processing',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

export function resolveWhatsAppAutoTriggers(settings?: any): WhatsAppAutoTriggers {
  const raw = settings?.whatsapp_auto_triggers;
  if (raw && typeof raw === 'object') {
    const out: WhatsAppAutoTriggers = { ...DEFAULT_WHATSAPP_AUTO_TRIGGERS };
    for (const key of AUTO_TRIGGER_KEYS) {
      out[key] = Boolean(raw[key]);
    }
    return out;
  }

  // Legacy fallback: only enable automatically if the legacy flag was explicitly true.
  // Unset or default state keeps every trigger disabled until checked by admin.
  const orderFlag = settings?.auto_send_on_order === true;
  const adminFlag = settings?.auto_alert_admin_on_order === true;
  const statusFlag = settings?.auto_send_on_status_change === true;
  return {
    admin_new_order: adminFlag,
    order_confirmed: orderFlag,
    payment_verified: statusFlag,
    processing: statusFlag,
    shipped: statusFlag,
    out_for_delivery: statusFlag,
    delivered: statusFlag,
    cancelled: statusFlag,
  };
}

export const DEFAULT_WHATSAPP_TEMPLATES: Required<WhatsAppTemplates> = {
  order_confirmed: [
    `*أهلاً بك يا {customer_name} في متجر جو ستور (JOE Store)* 📱✨`,
    ``,
    `تم استلام طلبك رقم *#{order_number}* بنجاح وجاري مراجعته وتجهيزه مع شهادة الضمان.`,
    ``,
    `🛍️ *تفاصيل الطلب:*`,
    `{items}`,
    ``,
    `🚚 الشحن ({governorate}): *{shipping_fee} ج.م.*`,
    `💰 *الإجمالي النهائي:* *{total} ج.م.* ({payment_method})`,
    `📍 العنوان: {address}`,
    ``,
    `سيصلك إشعار فور شحن الطلب مع المندوب. شرفنا تواصلك!`
  ].join('\n'),
  admin_new_order: [
    `🔔 *طلب جديد وصل الآن — جو ستور (JOE Store)*`,
    ``,
    `🔖 رقم الطلب: *#{order_number}*`,
    `👤 العميل: *{customer_name}*`,
    `📞 الهاتف: {customer_phone}`,
    `💬 واتساب العميل: {customer_whatsapp}`,
    `📍 العنوان ({governorate}): {address}`,
    ``,
    `🛍️ *تفاصيل المنتجات:*`,
    `{items}`,
    ``,
    `🚚 الشحن: *{shipping_fee} ج.م.* | 💰 *الإجمالي:* *{total} ج.م.*`,
    `💳 طريقة الدفع المختارة: *{payment_method}*`,
    ``,
    `⏳ *تواصل الآن مع العميل لتأكيد الطلب وطريقة الدفع:*`,
    `{customer_wa_link}`
  ].join('\n'),
  payment_verified: [
    `*تم تأكيد الدفع بنجاح - متجر جو ستور* 💳✅`,
    ``,
    `عزيزنا *{customer_name}*،`,
    `تم مراجعة وتأكيد الدفع لطلبك رقم *#{order_number}* بمبلغ *{total} ج.م.* بنجاح.`,
    `جاري الآن تجهيز طلبك وتغليفه لتسليمه لشركة الشحن.`
  ].join('\n'),
  processing: [
    `*تم تجهيز طلبك وجاري تسليمه لشركة الشحن - جو ستور* 📦✨`,
    ``,
    `عزيزنا *{customer_name}*،`,
    `تم تجهيز وتغليف طلبك رقم *#{order_number}* في متجر جو ستور بنجاح، وجاري الآن تسليمه لشركة الشحن.`,
    `🚚 شركة الشحن: *{courier_name}*`,
    `📍 العنوان: {governorate}`
  ].join('\n'),
  shipped: [
    `*شحنتك في الطريق إليك - جو ستور (JOE Store)* 🚚✨`,
    ``,
    `عزيزنا *{customer_name}*،`,
    `تم تسليم طلبك رقم *#{order_number}* إلى: *{courier_name}*.`,
    `📍 العنوان: {governorate}`,
    `💰 المطلوب عند الاستلام: {cod_due}`,
    ``,
    `يرجى إبقاء هاتفك متاحاً للتنسيق مع المندوب.`
  ].join('\n'),
  out_for_delivery: [
    `*مندوب التوصيل في طريقه إليك اليوم - جو ستور* 📦🛵`,
    ``,
    `عزيزنا *{customer_name}*،`,
    `طلبك رقم *#{order_number}* خرج مع المندوب الآن وسيصلك اليوم بإذن الله.`,
    `💰 المطلوب عند الاستلام: *{cod_due}*`
  ].join('\n'),
  delivered: [
    `*تم توصيل طلبك بنجاح - جو ستور (JOE Store)* 🎉📱`,
    ``,
    `ألف مبروك استلام طلبك يا *{customer_name}*!`,
    `يسعدنا إتمام تسليم طلبك رقم *#{order_number}* مع الضمان المعتمد من جو ستور.`
  ].join('\n'),
  cancelled: [
    `*تحديث بخصوص طلبك #{order_number} - متجر جو ستور*`,
    ``,
    `عزيزنا *{customer_name}*،`,
    `تم إلغاء الطلب رقم *#{order_number}*. لأي استفسار أو إعادة طلب يسعدنا الرد عليك هنا.`
  ].join('\n'),
  review_request: [
    `⭐ *كيف كانت تجربتك مع متجر جو ستور (JOE Store)؟*`,
    ``,
    `عزيزنا *{customer_name}*،`,
    `نتمنى أن تكون منتجات طلبك *#{order_number}* قد نالت إعجابك!`,
    `رأيك يهمنا جداً — يسعدنا تقييمك بالرد على هذه الرسالة ❤️`
  ].join('\n')
};

export function formatWhatsAppPhone(raw: string): string {
  const local = normalizePhone(raw);
  if (/^01[0-9]{9}$/.test(local)) return `2${local}`;
  const digits = String(raw || '').replace(/\D/g, '');
  return digits.startsWith('00') ? digits.slice(2) : digits;
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{([a-z0-9_]+)\}/gi, (_, key) => vars[key] ?? '');
}

export function buildServerOrderWhatsAppMessage(
  type: NotificationType,
  order: Partial<Order> & { items?: any[] },
  settings?: Partial<StoreSettings> | null,
  customText?: string
): string {
  if (customText && customText.trim()) return customText.trim();
  const templates = { ...DEFAULT_WHATSAPP_TEMPLATES, ...(settings?.whatsapp_templates || {}) };
  const template = (templates as any)[type] || DEFAULT_WHATSAPP_TEMPLATES.order_confirmed;

  const itemsText = (Array.isArray(order.items) ? order.items : [])
    .map((item: any, idx: number) => {
      const name = item?.product?.name_ar || item?.name_ar || 'منتج';
      const variant = [item?.selected_storage || item?.product?.storage, item?.selected_color || item?.product?.color_ar]
        .filter(Boolean)
        .join(' ');
      const variantTag = variant ? ` (${variant})` : '';
      const qty = Number(item?.quantity || 1);
      const unit = Number(item?.unitPrice ?? item?.product?.price ?? 0);
      return `${idx + 1}. ${name}${variantTag} × ${qty} = ${Math.round(unit * qty)} ج.م.`;
    })
    .join('\n');

  const paymentLabel =
    order.payment_method === 'cod'
      ? 'الدفع عند الاستلام'
      : order.payment_method === 'instapay'
        ? 'إنستاباي InstaPay'
        : order.payment_method === 'vodafone_cash'
          ? 'فودافون كاش'
          : 'بطاقة بنكية أونلاين';

  const codDue =
    order.payment_status === 'paid' || order.payment_status === 'verified'
      ? '0 ج.م. (مدفوع مسبقاً)'
      : `${Math.round(Number(order.total || 0))} ج.م.`;

  const address = [order.governorate, order.city, order.address_details].filter(Boolean).join(' - ');
  const mapsUrl = typeof order.google_maps_url === 'string' ? order.google_maps_url.trim() : '';
  const customerPhone = String(order.customer_phone || '');
  const customerWhatsapp = String(order.customer_whatsapp || customerPhone || '');
  const customerWaPhone = formatWhatsAppPhone(customerWhatsapp);
  const customerConfirmDraft = `أهلاً بك يا ${order.customer_name || 'عميلنا العزيز'} من جو ستور 📱\nبخصوص طلبك رقم *#${order.order_number || order.id || ''}* بإجمالي *${Math.round(Number(order.total || 0))} ج.م.* (${paymentLabel}).\nنرجو تأكيد بيانات الطلب وطريقة الدفع لتجهيز طلبك وشحنه فوراً.`;
  const customerWaLink = customerWaPhone
    ? `https://wa.me/${customerWaPhone}?text=${encodeURIComponent(customerConfirmDraft)}`
    : '';

  let rendered = renderTemplate(template, {
    customer_name: order.customer_name || 'عميلنا العزيز',
    customer_phone: customerPhone,
    customer_whatsapp: customerWhatsapp,
    customer_email: String(order.customer_email || ''),
    customer_wa_link: customerWaLink,
    order_number: order.order_number || order.id || '',
    items: itemsText || 'منتجات متجر جو ستور',
    shipping_fee: String(Math.round(Number(order.shipping_fee || 0))),
    subtotal: String(Math.round(Number(order.subtotal || 0))),
    total: String(Math.round(Number(order.total || 0))),
    payment_method: paymentLabel,
    payment_reference: String(order.payment_reference || ''),
    cod_due: codDue,
    governorate: order.governorate || '',
    address: address || order.governorate || '',
    maps_url: mapsUrl,
    notes: String(order.notes || ''),
    courier_name: order.courier_name || 'مندوب شحن جو ستور'
  });

  if (!customText) {
    const extras: string[] = [];
    if (type === 'admin_new_order') {
      if (order.payment_reference && !rendered.includes(order.payment_reference)) {
        extras.push(`🧾 مرجع الدفع: ${order.payment_reference}`);
      }
      if (order.notes && !rendered.includes(order.notes)) {
        extras.push(`📝 ملاحظات العميل: ${order.notes}`);
      }
    }
    if (mapsUrl && (type === 'order_confirmed' || type === 'shipped' || type === 'admin_new_order') && !rendered.includes(mapsUrl)) {
      extras.push(`🗺️ موقع التوصيل: ${mapsUrl}`);
    }
    if (extras.length) {
      rendered = `${rendered}\n${extras.join('\n')}`;
    }
  }
  return rendered;
}

export async function ensureWhatsAppNotificationsTable(sql: any) {
  await sql.query(`
    CREATE TABLE IF NOT EXISTS whatsapp_notifications (
      id VARCHAR(120) PRIMARY KEY,
      order_id VARCHAR(120),
      order_number VARCHAR(120),
      phone VARCHAR(40) NOT NULL,
      notification_type VARCHAR(60) NOT NULL DEFAULT 'custom',
      message_text TEXT NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      error_message TEXT,
      sender_email VARCHAR(200),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export function resolveAdminAlertRecipients(settings?: any): string[] {
  const raw = String(
    (typeof settings?.admin_alert_whatsapp_number === 'string' && settings.admin_alert_whatsapp_number.trim()) ||
      process.env.ADMIN_ALERT_WHATSAPP ||
      settings?.store_whatsapp ||
      ''
  ).trim();
  if (!raw) return [];
  const list = raw
    .split(/[,;\n]+/)
    .map(p => formatWhatsAppPhone(p))
    .filter(p => p.length >= 10);
  return Array.from(new Set(list));
}

export function resolveCrmConfig(settings?: any) {
  const baseUrl = String(settings?.whatsapp_automation_url || process.env.WHATSAPP_CRM_URL || '').trim().replace(/\/+$/, '');
  const email = String(settings?.whatsapp_automation_email || process.env.WHATSAPP_CRM_EMAIL || '').trim();
  const password = String(settings?.whatsapp_automation_pass || process.env.WHATSAPP_CRM_PASSWORD || '');
  const triggers = resolveWhatsAppAutoTriggers(settings);
  return {
    baseUrl,
    email,
    password,
    configured: Boolean(baseUrl && email && password),
    triggers,
    shouldAutoSend: (eventKey: WhatsAppAutoTriggerKey) => Boolean(triggers[eventKey]),
    autoSendOnOrder: triggers.order_confirmed,
    autoSendOnStatusChange: Boolean(
      triggers.payment_verified ||
      triggers.processing ||
      triggers.shipped ||
      triggers.out_for_delivery ||
      triggers.delivered ||
      triggers.cancelled
    ),
    autoAlertAdminOnOrder: triggers.admin_new_order,
    adminAlertRecipients: resolveAdminAlertRecipients(settings)
  };
}

export async function dispatchWhatsAppViaCrm(
  sql: any,
  params: {
    recipient: string;
    text: string;
    type: NotificationType;
    orderId?: string;
    orderNumber?: string;
    settings?: any;
  },
  fetchFn: typeof fetch = fetch
): Promise<{ success: boolean; status: 'sent' | 'failed'; error?: string; waLink: string }> {
  const formattedPhone = formatWhatsAppPhone(params.recipient);
  const waLink = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(params.text)}`;

  if (!formattedPhone || formattedPhone.length < 10) {
    return { success: false, status: 'failed', error: 'رقم واتساب العميل غير صالح.', waLink };
  }

  let settings = params.settings;
  if (!settings) {
    try {
      const rows = await sql`SELECT settings FROM store_settings WHERE id = 'main' LIMIT 1;`;
      settings = rows[0]?.settings || {};
    } catch {
      settings = {};
    }
  }

  const crm = resolveCrmConfig(settings);
  let sent = false;
  let errorMessage = '';

  if (!crm.configured) {
    errorMessage = 'خادم WhatsApp Pro CRM غير مضبوط في الإعدادات أو متغيرات البيئة.';
  } else {
    try {
      const loginRes = await fetchFn(`${crm.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: crm.email, password: crm.password })
      });
      if (!loginRes.ok) throw new Error(`Login HTTP ${loginRes.status}`);
      const loginData: any = await loginRes.json();
      if (!loginData?.token) throw new Error('لم يرد رمز JWT من خادم واتساب CRM');

      const sendRes = await fetchFn(`${crm.baseUrl}/api/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${loginData.token}`
        },
        body: JSON.stringify({ to: formattedPhone, text: params.text })
      });
      if (!sendRes.ok) {
        const bodyErr = await sendRes.text().catch(() => '');
        throw new Error(`Send HTTP ${sendRes.status}${bodyErr ? `: ${bodyErr.slice(0, 120)}` : ''}`);
      }
      sent = true;
    } catch (err: any) {
      errorMessage = String(err?.message || 'تعذر الإرسال عبر CRM');
    }
  }

  try {
    await ensureWhatsAppNotificationsTable(sql);
    const id = `wa-${Date.now()}-${randomBytes(4).toString('hex')}`;
    await sql`
      INSERT INTO whatsapp_notifications (id, order_id, order_number, phone, notification_type, message_text, status, error_message, sender_email)
      VALUES (${id}, ${params.orderId || null}, ${params.orderNumber || null}, ${formattedPhone}, ${params.type}, ${params.text}, ${sent ? 'sent' : 'failed'}, ${errorMessage || null}, ${crm.email || null});
    `;
  } catch {}

  return {
    success: sent,
    status: sent ? 'sent' : 'failed',
    error: errorMessage || undefined,
    waLink
  };
}

export async function testWhatsAppCrmConnection(settings?: any, fetchFn: typeof fetch = fetch) {
  const crm = resolveCrmConfig(settings);
  if (!crm.configured) {
    return { success: false, configured: false, error: 'أدخل رابط الخادم والبريد وكلمة المرور أولاً.' };
  }
  try {
    const res = await fetchFn(`${crm.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: crm.email, password: crm.password })
    });
    if (!res.ok) return { success: false, configured: true, error: `HTTP ${res.status}` };
    const data: any = await res.json();
    if (!data?.token) return { success: false, configured: true, error: 'لم يتم استلام رمز المصادقة' };
    return { success: true, configured: true, message: 'تم الاتصال وتوثيق الحساب بنجاح مع WhatsApp Pro CRM!' };
  } catch (err: any) {
    return { success: false, configured: true, error: err?.message || 'تعذر الوصول للخادم' };
  }
}
