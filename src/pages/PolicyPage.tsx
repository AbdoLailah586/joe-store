import React, { useState } from 'react';
import { ShieldCheck, FileText, RotateCcw, Truck, ArrowRight, MessageCircle, Phone, MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useStore, type AppTab } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { generateWhatsAppWebLink } from '../utils/whatsappService';
import { POLICY_META, getDefaultPolicyDoc, parsePolicyBody, type PolicyKey } from '../utils/policyDefaults';
import { neonDb } from '../services/neonDb';

export type PolicyPageTab = Extract<AppTab, 'terms' | 'privacy' | 'refund' | 'shipping'>;

const POLICY_ICONS: Record<PolicyKey, typeof FileText> = {
  terms: FileText,
  privacy: ShieldCheck,
  refund: RotateCcw,
  shipping: Truck,
};

export const PolicyPage: React.FC<{ activePolicy: PolicyPageTab }> = ({ activePolicy }) => {
  const { settings, navigate } = useStore();
  const { formatPrice } = useLanguage();
  const storeName = settings.store_name_ar || 'جو ستور - JOE Store';
  const freeThreshold = formatPrice(settings.free_shipping_threshold ?? 2500);
  const [breachEmail, setBreachEmail] = useState('');
  const [breachName, setBreachName] = useState('');
  const [breachType, setBreachType] = useState('unauthorized_access');
  const [breachDesc, setBreachDesc] = useState('');
  const [breachBusy, setBreachBusy] = useState(false);
  const [breachReceipt, setBreachReceipt] = useState<{ id?: string; deadline?: string; error?: string } | null>(null);

  const submitBreach = async (e: React.FormEvent) => {
    e.preventDefault();
    setBreachBusy(true);
    setBreachReceipt(null);
    const res = await neonDb.submitBreachReport({
      reporter_email: breachEmail,
      reporter_name: breachName,
      incident_type: breachType,
      description: breachDesc
    });
    setBreachBusy(false);
    if (res.success) {
      setBreachReceipt({ id: res.id, deadline: res.report_deadline_at });
      setBreachDesc('');
    } else {
      setBreachReceipt({ error: res.error || 'تعذر تسجيل البلاغ، يرجى المحاولة أو مراسلتنا عبر واتساب.' });
    }
  };

  const policyKeys: PolicyKey[] = ['terms', 'privacy', 'refund', 'shipping'];

  const docs = policyKeys.map(key => {
    const defaults = getDefaultPolicyDoc(key, { storeName, freeThreshold });
    const custom = settings.policy_pages?.[key];
    const heading = custom?.heading?.trim() || defaults.heading;
    const intro = custom?.intro?.trim() || defaults.intro;
    const rawBody = custom?.body?.trim() ? custom.body : defaults.body;
    const sections = parsePolicyBody(rawBody);
    return {
      key: key as PolicyPageTab,
      tabLabel: POLICY_META[key].tabLabel,
      heading,
      intro,
      icon: POLICY_ICONS[key],
      sections,
    };
  });

  const currentDoc = docs.find(d => d.key === activePolicy) || docs[0];
  const ActiveIcon = currentDoc.icon;

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12 space-y-6 font-cairo">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('home')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-amber-700"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة للرئيسية</span>
        </button>

        <div className="flex flex-wrap gap-2">
          {docs.map(d => (
            <button
              key={d.key}
              type="button"
              onClick={() => navigate(d.key)}
              className={`px-3.5 py-2 rounded-full text-xs font-bold border transition ${
                d.key === activePolicy
                  ? 'bg-amber-500 text-black border-amber-500 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-amber-400'
              }`}
            >
              {d.tabLabel}
            </button>
          ))}
        </div>
      </div>

      <article className="bg-white border border-slate-200 rounded-3xl p-6 md:p-10 shadow-sm space-y-6">
        <div className="flex items-start gap-3 border-b border-slate-100 pb-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <ActiveIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">{currentDoc.heading}</h1>
            <p className="text-xs text-slate-500 mt-1">{currentDoc.intro}</p>
          </div>
        </div>

        <div className="space-y-6">
          {currentDoc.sections.map((sec, idx) => (
            <section key={idx} className="space-y-2.5">
              {sec.title && (
                <h2 className="text-sm md:text-base font-extrabold text-slate-900">{sec.title}</h2>
              )}
              {sec.paragraphs.map((p, i) => (
                <p key={`p-${i}`} className="text-xs md:text-sm text-slate-600 leading-7">
                  {p}
                </p>
              ))}
              {sec.bullets.length > 0 && (
                <ul className="space-y-2 pr-4 list-disc text-xs md:text-sm text-slate-600 leading-7">
                  {sec.bullets.map((pt, i) => (
                    <li key={`b-${i}`}>{pt}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <p className="font-extrabold text-slate-900 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-700" />
              <span>{settings.store_address_ar}</span>
            </p>
            <p className="text-slate-500 flex items-center gap-1.5" dir="ltr">
              <Phone className="w-3.5 h-3.5 text-amber-700" />
              <span>{settings.store_phone}</span>
            </p>
            {(settings.commercial_register || settings.tax_id || settings.dpo_contact_email) && (
              <p className="text-[11px] text-slate-600 pt-1">
                {settings.commercial_register && <span>سجل تجاري: <strong className="font-mono">{settings.commercial_register}</strong>{' • '}</span>}
                {settings.tax_id && <span>بطاقة ضريبية: <strong className="font-mono">{settings.tax_id}</strong>{' • '}</span>}
                {settings.dpo_contact_email && <span>بريد الخصوصية: <strong dir="ltr" className="font-mono">{settings.dpo_contact_email}</strong></span>}
              </p>
            )}
          </div>
          <a
            href={generateWhatsAppWebLink(settings.store_whatsapp || '201554826209', 'مرحباً جو ستور، لدي استفسار بخصوص سياسات المتجر.')}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold inline-flex items-center gap-1.5"
          >
            <MessageCircle className="w-4 h-4" />
            <span>تواصل عبر واتساب</span>
          </a>
        </div>

        {activePolicy === 'privacy' && (
          <section className="rounded-2xl border border-amber-300 bg-amber-50/70 p-5 space-y-3 text-xs">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h2 className="font-black text-slate-900 text-sm">صندوق الإبلاغ عن خرق بيانات أو ثغرة خصوصية (استجابة خلال 48 ساعة)</h2>
                <p className="text-slate-600 mt-0.5">
                  إذا لاحظت وصولاً غير مصرح به أو تسريباً محتملاً لبياناتك أو بيانات الطلبات، أبلغنا فوراً وسيتلقى مسؤول الأمان إشعاراً عاجلاً بمهلة 48 ساعة للتحقيق والمعالجة.
                </p>
              </div>
            </div>
            <form onSubmit={submitBreach} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <input
                type="email"
                required
                dir="ltr"
                value={breachEmail}
                onChange={e => setBreachEmail(e.target.value)}
                placeholder="your-email@example.com"
                className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900"
              />
              <input
                type="text"
                value={breachName}
                onChange={e => setBreachName(e.target.value)}
                placeholder="الاسم (اختياري)"
                className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900"
              />
              <select
                value={breachType}
                onChange={e => setBreachType(e.target.value)}
                className="sm:col-span-2 px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900"
              >
                <option value="unauthorized_access">وصول غير مصرح به إلى حساب أو طلب</option>
                <option value="data_exposure">اشتباه في انكشاف بيانات شخصية</option>
                <option value="phishing_or_abuse">انتحال أو رسائل احتيالية باسم المتجر</option>
                <option value="other">بلاغ أمني أو خصوصية آخر</option>
              </select>
              <textarea
                required
                rows={3}
                minLength={15}
                value={breachDesc}
                onChange={e => setBreachDesc(e.target.value)}
                placeholder="اشرح تفاصيل المشكلة أو الرابط المتأثر حتى نتمكن من التدخل الفوري..."
                className="sm:col-span-2 px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900"
              />
              <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="submit"
                  disabled={breachBusy}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold disabled:opacity-50"
                >
                  {breachBusy ? 'جاري تسجيل البلاغ...' : 'إرسال بلاغ خرق البيانات الآن'}
                </button>
                {breachReceipt?.id && (
                  <span className="inline-flex items-center gap-1.5 text-emerald-800 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تم قيد البلاغ #{breachReceipt.id} — موعد الاستجابة الأقصى 48 ساعة.</span>
                  </span>
                )}
                {breachReceipt?.error && (
                  <span className="text-rose-700 font-bold">{breachReceipt.error}</span>
                )}
              </div>
            </form>
          </section>
        )}
      </article>
    </main>
  );
};
