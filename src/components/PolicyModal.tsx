import React from 'react';
import { X, ShieldCheck, FileText, Truck, Lock, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export type PolicyType = 'warranty' | 'privacy' | 'terms' | 'shipping' | null;

interface PolicyModalProps {
  policy: PolicyType;
  onClose: () => void;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({ policy, onClose }) => {
  const { language } = useLanguage();

  if (!policy) return null;

  const content = {
    warranty: {
      title_ar: 'سياسة الضمان والاستبدال المعتمدة - متجر جو ستور',
      title_en: 'Official Warranty & Replacement Policy - JOE Store',
      icon: <ShieldCheck className="w-8 h-8 text-amber-400" />,
      text_ar: `
📌 *ضمان متجر جو ستور (المنصورة):*

1. **حق الفحص والمعاينة قبل الدفع:**
   يحق للعميل عند الاستلام فحص الجهاز بالكامل مع مندوب التوصيل، والتأكد من مطابقة نسبة البطارية المعلنة وسلامة الشاشة والكاميرات وحساس Face ID قبل دفع قيمة الطلب.

2. **فترة الاستبدال (14 يوماً):**
   يحق للعميل استبدال الجهاز خلال 14 يوماً من تاريخ الشراء في حال ظهور أي عيب صناعة أو خلل وظيفي لم يذكر في تقرير الفحص.

3. **ضمان الصيانة المعتمد (6 أشهر للأجهزة كسر زيرو / سنة للأجهزة الجديدة):**
   - يشمل إصلاح أو استبدال القطع المتضررة بعيوب صناعية بقطع أصلية 100%.
   - لا يشمل الضمان حوادث الكسر الناتجة عن السقوط أو سوء الاستخدام أو تعرض الجهاز للغمر في السوائل.

4. **صحة البطارية:**
   نضمن أن نسبة البطارية المعلنة في المتجر أصلية ومطابقة بنسبة 100% لقراءة فحص أجهزة Apple المعتمدة دون أي تعديل برمجي.
      `,
      text_en: `
📌 *JOE Store Official Warranty Guarantee:*

1. **Inspection Before Payment:**
   Customers have the full right to thoroughly inspect the smartphone, battery percentage, Face ID, and cameras with the delivery courier before making any payment.

2. **14-Day Replacement Policy:**
   Eligible for immediate device replacement within 14 days if any hardware manufacturer defect arises.

3. **Maintenance Warranty (6 Months Mint / 1 Year Sealed):**
   Includes genuine parts maintenance at our Mansoura flagship branch. Does not cover accidental physical drops or liquid damage.
      `
    },
    privacy: {
      title_ar: 'سياسة الخصوصية وأمان البيانات - جو ستور',
      title_en: 'Privacy & Data Protection Policy - JOE Store',
      icon: <Lock className="w-8 h-8 text-emerald-400" />,
      text_ar: `
🔒 *خصوصيتك وأمان بياناتك أولويتنا:*

1. **جمع واستخدام البيانات:**
   يتم جمع الاسم ورقم الهاتف ورقم الواتساب والعنوان فقط لأغراض تجهيز وتوصيل الشحنة، وإرسال فواتير الشراء وتحديثات التتبع الآلية عبر واتساب.

2. **سرية المعلومات:**
   نلتزم بعدم بيع أو مشاركة بياناتك الشخصية مع أي طرف ثالث لأغراض إعلانية غير مصرح بها.

3. **إشعارات الواتساب:**
   رسائل الواتساب الصادرة من متجر جو ستور تقتصر فقط على تفاصيل طلبك الفعلي، ومتابعة شركة الشحن، وطلب تقييم الجودة بعد الاستلام.
      `,
      text_en: `
🔒 *Your Privacy & Security:*

1. **Information Collection:**
   We collect customer name, phone number, WhatsApp, and delivery address strictly to process orders and dispatch automated WhatsApp tracking receipts.

2. **No Data Sharing:**
   Your personal data is never sold or disclosed to unauthorized third-party advertisers.
      `
    },
    terms: {
      title_ar: 'الشروط والأحكام - متجر جو ستور',
      title_en: 'Terms & Conditions - JOE Store',
      icon: <FileText className="w-8 h-8 text-blue-400" />,
      text_ar: `
📋 *الشروط والأحكام العامة للطلب:*

1. **الأسعار وتوافر المخزون:**
   جميع الأسعار المعروضة بالجنيه المصري (EGP) وتخضع للتحديث وفقاً لحركة السوق وتوافر الأجهزة في فرعنا بالمنصورة.

2. **تأكيد الطلب:**
   يعد الطلب مؤكداً فور استلام رسالة الواتساب الآلية بنجاح، ويتم التواصل هاتفياً في حال الحاجة لتأكيد علامة مميزة لعنوان التسليم.

3. **إلغاء الطلب:**
   يمكن للعميل إلغاء الطلب مجاناً قبل خروج الشحنة مع مندوب التوصيل عبر الرد على رسالة الواتساب أو التواصل مع خدمة العملاء.
      `,
      text_en: `
📋 *General Ordering Terms:*

1. **Pricing & Currency:**
   All product prices are quoted in Egyptian Pounds (EGP) and reflect current live inventory.

2. **Order Confirmation:**
   Orders are officially registered upon generation of your order number and dispatch of the automated WhatsApp notification.
      `
    },
    shipping: {
      title_ar: 'سياسة الشحن ومواعيد التوصيل - جو ستور',
      title_en: 'Shipping & Delivery Policy - JOE Store',
      icon: <Truck className="w-8 h-8 text-purple-400" />,
      text_ar: `
🚚 *مواعيد ورسوم الشحن والتوصيل:*

1. **محافظة الدقهلية والمنصورة:**
   - توصيل فوري في نفس اليوم خلال (3 - 6 ساعات) داخل المنصورة وطلخا والقرى المجاورة.
   - رسوم التوصيل: 35 ج.م (أو شحن مجاني للطلبات فوق 2500 ج.م).

2. **القاهرة، الجيزة، والإسكندرية:**
   - شحن سريع خلال 24 إلى 48 ساعة حتى باب المنزل.
   - رسوم الشحن: 55 - 60 ج.م.

3. **محافظات الدلتا والقناة والصعيد:**
   - شحن آمن مع شركات شحن متخصصة خلال 48 إلى 72 ساعة.
      `,
      text_en: `
🚚 *Delivery Timelines & Rates across Egypt:*

1. **Mansoura & Dakahlia:**
   Same-day instant express delivery within 3-6 hours. Default fee: 35 EGP (or Free for orders above 2,500 EGP).

2. **Cairo, Giza & Alexandria:**
   Delivered within 24 to 48 hours directly to your doorstep.

3. **Delta, Canal & Upper Egypt:**
   Secured shipping with specialized couriers in 48-72 hours.
      `
    }
  }[policy];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-[#0F1626] border border-amber-500/40 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-100 font-cairo space-y-5 animate-in fade-in zoom-in-95 duration-200"
      >
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="p-3 rounded-2xl bg-slate-900 border border-white/10 flex-shrink-0">
            {content.icon}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-snug">
              {language === 'ar' ? content.title_ar : content.title_en}
            </h2>
            <p className="text-xs text-amber-400 font-semibold mt-0.5">
              متجر جو ستور (JOE Store) - المنصورة
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-300 leading-relaxed max-h-[60vh] overflow-y-auto whitespace-pre-wrap pr-1 space-y-2">
          {language === 'ar' ? content.text_ar : content.text_en}
        </div>

        <div className="pt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-glow-gold transition-all"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
