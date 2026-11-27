import React, { useEffect, useState } from 'react';
import {
  MessageCircle,
  RefreshCw,
  Send,
  CheckCircle2,
  AlertCircle,
  BellRing,
  PlugZap,
  ExternalLink,
  Save
} from 'lucide-react';
import { neonDb } from '../../services/neonDb';
import { generateWhatsAppWebLink } from '../../utils/whatsappService';
import type { WhatsAppAutoTriggers } from '../../types';

const AUTO_TRIGGER_OPTIONS: Array<{
  key: keyof WhatsAppAutoTriggers;
  title: string;
  desc: string;
}> = [
  {
    key: 'admin_new_order',
    title: 'تنبيه الإدارة عند وصول طلب جديد (للأدمن)',
    desc: 'يرسل رسالة فورية لأرقام الإدارة فور تسجيل طلب جديد.'
  },
  {
    key: 'order_confirmed',
    title: 'تأكيد الأوردر للعميل (Confirm Order)',
    desc: 'يرسل للعميل رسالة تأكيد استلام/اعتماد الطلب.'
  },
  {
    key: 'payment_verified',
    title: 'تأكيد الدفع للعميل (Payment Confirmed)',
    desc: 'يرسل للعميل رسالة تأكيد الدفع عند مراجعته أو سداده.'
  },
  {
    key: 'processing',
    title: 'تسليم الطلب لشركة الشحن (Processing)',
    desc: 'يرسل للعميل عند تجهيز المحل للطلب وتحويله لشركة الشحن.'
  },
  {
    key: 'shipped',
    title: 'تم شحن الطلب مع الشركة (Shipped)',
    desc: 'يرسل للعميل عند تأكيد شحن الأوردر مع شركة الشحن.'
  },
  {
    key: 'out_for_delivery',
    title: 'خرج للتوصيل اليوم (Out for Delivery)',
    desc: 'يرسل للعميل عند خروج الشحنة مع المندوب اليوم.'
  },
  {
    key: 'delivered',
    title: 'تم التوصيل بنجاح (Delivered)',
    desc: 'يرسل للعميل رسالة التسليم وتفعيل الضمان.'
  },
  {
    key: 'cancelled',
    title: 'إلغاء الطلب (Cancelled)',
    desc: 'يرسل للعميل إشعاراً عند إلغاء الطلب.'
  }
];

const DEFAULT_TRIGGERS_STATE: WhatsAppAutoTriggers = {
  admin_new_order: false,
  order_confirmed: false,
  payment_verified: false,
  processing: false,
  shipped: false,
  out_for_delivery: false,
  delivered: false,
  cancelled: false,
};

const TEMPLATE_LABELS: Array<{ key: string; title: string; varsHint: string }> = [
  { key: 'admin_new_order', title: 'تنبيه الإدارة الفوري عند وصول طلب جديد (للأدمن)', varsHint: '{order_number} {customer_name} {customer_phone} {customer_wa_link} {items} {total} {payment_method}' },
  { key: 'order_confirmed', title: 'رسالة تأكيد استلام الطلب (للعميل)', varsHint: '{customer_name} {order_number} {items} {shipping_fee} {total} {payment_method} {address}' },
  { key: 'payment_verified', title: 'رسالة تأكيد استلام ومراجعة الدفع', varsHint: '{customer_name} {order_number} {total}' },
  { key: 'processing', title: 'رسالة تجهيز الطلب وتسليمه لشركة الشحن', varsHint: '{customer_name} {order_number} {courier_name} {governorate}' },
  { key: 'shipped', title: 'رسالة خروج الطلب للشحن', varsHint: '{customer_name} {order_number} {courier_name} {governorate} {cod_due}' },
  { key: 'out_for_delivery', title: 'رسالة خرج للتوصيل اليوم مع المندوب', varsHint: '{customer_name} {order_number} {cod_due}' },
  { key: 'delivered', title: 'رسالة تم التسليم بنجاح + تفعيل الضمان', varsHint: '{customer_name} {order_number}' },
  { key: 'cancelled', title: 'رسالة إلغاء الطلب', varsHint: '{customer_name} {order_number}' },
  { key: 'review_request', title: 'رسالة طلب تقييم بعد التوصيل', varsHint: '{customer_name} {order_number}' }
];

export const WhatsAppCrmAdminSection: React.FC = () => {
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [triggers, setTriggers] = useState<WhatsAppAutoTriggers>(DEFAULT_TRIGGERS_STATE);
  const [adminNumbers, setAdminNumbers] = useState('');
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<any[]>([]);

  const [testPhone, setTestPhone] = useState('');
  const [testText, setTestText] = useState('رسالة تجربة من متجر جو ستور (JOE Store) عبر WhatsApp Pro CRM ✅');
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);

  const loadAll = async () => {
    try {
      const [cfg, dbLogs] = await Promise.all([
        neonDb.getWhatsAppAdminConfig(),
        neonDb.getWhatsAppNotifications(80)
      ]);
      if (cfg) {
        setUrl(cfg.whatsapp_automation_url || '');
        setEmail(cfg.whatsapp_automation_email || '');
        setHasPassword(Boolean(cfg.has_password));
        setConfigured(Boolean(cfg.configured));
        if (cfg.whatsapp_auto_triggers && typeof cfg.whatsapp_auto_triggers === 'object') {
          setTriggers({ ...DEFAULT_TRIGGERS_STATE, ...cfg.whatsapp_auto_triggers });
        } else {
          setTriggers({
            admin_new_order: cfg.auto_alert_admin_on_order === true,
            order_confirmed: cfg.auto_send_on_order === true,
            payment_verified: cfg.auto_send_on_status_change === true,
            processing: cfg.auto_send_on_status_change === true,
            shipped: cfg.auto_send_on_status_change === true,
            out_for_delivery: cfg.auto_send_on_status_change === true,
            delivered: cfg.auto_send_on_status_change === true,
            cancelled: cfg.auto_send_on_status_change === true,
          });
        }
        setAdminNumbers(cfg.admin_alert_whatsapp_number || '');
        setTemplates(cfg.whatsapp_templates || {});
      }
      if (Array.isArray(dbLogs)) setLogs(dbLogs);
    } catch {}
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const setAllTriggers = (enabled: boolean) => {
    setTriggers({
      admin_new_order: enabled,
      order_confirmed: enabled,
      payment_verified: enabled,
      processing: enabled,
      shipped: enabled,
      out_for_delivery: enabled,
      delivered: enabled,
      cancelled: enabled,
    });
  };

  const handleSave = async () => {
    setBusy(true);
    setBanner(null);
    try {
      const res = await neonDb.saveWhatsAppAdminConfig({
        whatsapp_automation_url: url.trim(),
        whatsapp_automation_email: email.trim(),
        ...(password.trim() ? { whatsapp_automation_pass: password } : {}),
        whatsapp_auto_triggers: triggers,
        auto_send_on_order: triggers.order_confirmed,
        auto_send_on_status_change: Boolean(
          triggers.payment_verified ||
          triggers.processing ||
          triggers.shipped ||
          triggers.out_for_delivery ||
          triggers.delivered ||
          triggers.cancelled
        ),
        auto_alert_admin_on_order: triggers.admin_new_order,
        admin_alert_whatsapp_number: adminNumbers.trim(),
        whatsapp_templates: templates
      });
      if (!res.success) throw new Error(res.error || 'تعذر حفظ الإعدادات');
      setPassword('');
      await loadAll();
      setBanner({ ok: true, text: 'تم حفظ إعدادات وقوالب WhatsApp Pro CRM بنجاح!' });
    } catch (err: any) {
      setBanner({ ok: false, text: err?.message || 'حدث خطأ أثناء الحفظ' });
    } finally {
      setBusy(false);
    }
  };

  const handleTestConnection = async () => {
    setBusy(true);
    setBanner(null);
    try {
      const res = await neonDb.testWhatsAppConnection();
      setBanner({
        ok: Boolean(res.success),
        text: res.message || res.error || (res.success ? 'الاتصال ناجح' : 'فشل الاتصال')
      });
    } finally {
      setBusy(false);
    }
  };

  const handleTestSend = async () => {
    if (!testPhone.trim()) {
      setBanner({ ok: false, text: 'أدخل رقم هاتف للاختبار أولاً.' });
      return;
    }
    setBusy(true);
    setBanner(null);
    try {
      const res = await neonDb.sendTestWhatsApp({ phone: testPhone.trim(), text: testText });
      await loadAll();
      setBanner({
        ok: Boolean(res.success),
        text: res.success
          ? 'تم إرسال رسالة التجربة عبر خادم WhatsApp CRM بنجاح!'
          : res.error || 'تعذر الإرسال الآلي — يمكنك استخدام رابط wa.me بالسجل.'
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 font-cairo">
      {/* Main Config Card */}
      <div className="p-6 rounded-3xl bg-white border border-emerald-500/30 shadow-xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">
              <MessageCircle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                مركز أتمتة واتساب برو (WhatsApp Pro CRM) وتنبيهات الإدارة
              </h3>
              <p className="text-xs text-slate-600">
                إرسال آمن من الخادم بدون تعريض كلمات المرور في المتصفح، مع تنبيه فوري لرقم الإدارة فور أي طلب جديد لتأكيده مع العميل.
              </p>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              configured ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            {configured ? '✓ الخادم مربوط وجاهز للإرسال الآلي' : 'في انتظار ربط الخادم'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-3 border-t border-slate-200">
          <div>
            <label className="block text-slate-600 mb-1">رابط خادم WhatsApp CRM:</label>
            <input
              type="url"
              dir="ltr"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://your-whatsapp-crm.example.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900"
            />
          </div>
          <div>
            <label className="block text-slate-600 mb-1">البريد الإلكتروني للحساب:</label>
            <input
              type="email"
              dir="ltr"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="crm@joestore.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900"
            />
          </div>
          <div>
            <label className="block text-slate-600 mb-1">
              كلمة المرور {hasPassword ? '(محفوظة — اتركها فارغة للإبقاء عليها)' : ''}:
            </label>
            <input
              type="password"
              dir="ltr"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={hasPassword ? '••••••••' : 'أدخل كلمة مرور CRM'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900"
            />
          </div>
        </div>

        {/* Admin Instant Order Alert Number + Per-Event Checkboxes */}
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong className="text-amber-950 font-black flex items-center gap-1.5">
              <BellRing className="w-4 h-4 text-amber-700" />
              <span>أرقام واتساب الإدارة لاستلام تنبيه الطلب الجديد (اختياري)</span>
            </strong>
          </div>
          <input
            type="text"
            dir="ltr"
            value={adminNumbers}
            onChange={e => setAdminNumbers(e.target.value)}
            placeholder="01554826209, 010XXXXXXXX (افصل بين الأرقام بفاصلة)"
            className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 font-mono text-slate-900"
          />
          <p className="text-[11px] text-amber-900">
            تصل الرسالة لأرقام الإدارة عند تفعيل مربع «تنبيه الإدارة عند وصول طلب جديد» أدناه.
          </p>
        </div>

        {/* Granular Per-Event Auto-Send Checkboxes */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <strong className="text-slate-900 text-sm font-black block">
                التحكم الفردي في الإرسال التلقائي عبر واتساب (هل يتعمل ولا ميتعملش؟)
              </strong>
              <p className="text-[11px] text-slate-600 mt-0.5">
                أي مربع غير محدد يعني لن يتم إرسال رسالته تلقائياً، ويمكنك إرسالها يدوياً من نافذة الطلب وقتما تشاء.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAllTriggers(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[11px]"
              >
                تفعيل الكل تلقائياً
              </button>
              <button
                type="button"
                onClick={() => setAllTriggers(false)}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-[11px]"
              >
                إيقاف التلقائي للكل (يدوي فقط)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {AUTO_TRIGGER_OPTIONS.map(opt => {
              const checked = Boolean(triggers[opt.key]);
              return (
                <label
                  key={opt.key}
                  className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition ${
                    checked
                      ? 'bg-emerald-50/70 border-emerald-300'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={e =>
                      setTriggers(prev => ({
                        ...prev,
                        [opt.key]: e.target.checked
                      }))
                    }
                    className="mt-0.5 w-4 h-4 accent-amber-600"
                  />
                  <div className="min-w-0">
                    <strong className="text-slate-900 block leading-snug">{opt.title}</strong>
                    <span className="text-[11px] text-slate-600 block mt-0.5">{opt.desc}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Templates */}
        <details className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs">
          <summary className="cursor-pointer font-black text-slate-900">تخصيص قوالب رسائل الواتساب (9 قوالب)</summary>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
            {TEMPLATE_LABELS.map(tpl => (
              <div key={tpl.key} className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200">
                <strong className="text-slate-900 block">{tpl.title}</strong>
                <span className="text-[10px] text-slate-500 font-mono block" dir="ltr">{tpl.varsHint}</span>
                <textarea
                  rows={4}
                  value={templates[tpl.key] || ''}
                  onChange={e => setTemplates(prev => ({ ...prev, [tpl.key]: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900"
                />
              </div>
            ))}
          </div>
        </details>

        {banner && (
          <div className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${banner.ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
            {banner.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{banner.text}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>حفظ إعدادات وقوالب الواتساب</span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleTestConnection}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs flex items-center gap-1.5"
          >
            <PlugZap className="w-4 h-4" />
            <span>اختبار الاتصال بـ CRM</span>
          </button>
        </div>

        {/* Instant Test Send */}
        <div className="pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-2 items-center text-xs">
          <input
            type="text"
            dir="ltr"
            value={testPhone}
            onChange={e => setTestPhone(e.target.value)}
            placeholder="رقم للاختبار (مثال: 010XXXXXXXX)"
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono"
          />
          <input
            type="text"
            value={testText}
            onChange={e => setTestText(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
          />
          <button
            type="button"
            disabled={busy}
            onClick={handleTestSend}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>إرسال رسالة تجريبية الآن</span>
          </button>
        </div>
      </div>

      {/* DB Logs */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">سجل إشعارات الواتساب من قاعدة البيانات ({logs.length})</h3>
          <button type="button" onClick={loadAll} className="text-xs text-amber-700 font-bold flex items-center gap-1 hover:underline">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>تحديث السجل</span>
          </button>
        </div>

        {logs.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">لا توجد إشعارات مسجلة في قاعدة البيانات بعد.</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {logs.map(log => (
              <div key={log.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <strong className="text-emerald-700 font-outfit">{log.phone}</strong>
                    <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-bold">{log.notification_type}</span>
                    {log.order_number && <span className="text-[11px] font-mono text-slate-500">#{log.order_number}</span>}
                  </div>
                  <span className="text-[11px] text-slate-500">{new Date(log.created_at).toLocaleString('ar-EG')}</span>
                </div>
                <pre className="text-[11px] text-slate-700 font-cairo whitespace-pre-wrap bg-white p-3 rounded-xl border border-slate-200">{log.message_text}</pre>
                <div className="flex items-center justify-between text-[10px]">
                  <span className={log.status === 'sent' ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                    الحالة: {log.status} {log.error_message ? `— ${log.error_message}` : ''}
                  </span>
                  <a
                    href={generateWhatsAppWebLink(log.phone, log.message_text)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-700 hover:underline flex items-center gap-1 font-bold"
                  >
                    <span>فتح في واتساب</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
