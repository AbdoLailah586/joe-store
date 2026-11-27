import React from 'react';
import { ShieldCheck, FileText, RotateCcw, Truck, ArrowRight, MessageCircle, Phone, MapPin } from 'lucide-react';
import { useStore, type AppTab } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { generateWhatsAppWebLink } from '../utils/whatsappService';

export type PolicyPageTab = Extract<AppTab, 'terms' | 'privacy' | 'refund' | 'shipping'>;

export const PolicyPage: React.FC<{ activePolicy: PolicyPageTab }> = ({ activePolicy }) => {
  const { settings, navigate } = useStore();
  const { formatPrice } = useLanguage();
  const storeName = settings.store_name_ar || 'جو ستور - JOE Store';
  const freeThreshold = formatPrice(settings.free_shipping_threshold ?? 2500);

  const docs = [
    {
      key: 'terms' as PolicyPageTab,
      tabLabel: 'الشروط والأحكام',
      heading: 'شروط وأحكام استخدام المتجر - جو ستور',
      intro: `مرحباً بك في متجر ${storeName}. استخدامك للموقع أو إتمام أي طلب يعني موافقتك على الشروط والأحكام التالية لحماية حقوق العميل والمتجر.`,
      icon: FileText,
      sections: [
        {
          title: '1. صحة بيانات الطلب والتواصل',
          points: [
            'يجب تسجيل بيانات تواصل صحيحة (الاسم، الهاتف، الواتساب، وعنوان التوصيل أو موقع GPS) لضمان سرعة الشحن وتفعيل الضمان.',
            'يتحمل المستخدم مسؤولية سرية حسابه، ويمكنه تعديل بياناته أو حذف حسابه في أي وقت من صفحة الملف الشخصي.'
          ]
        },
        {
          title: '2. الأسعار والضمان والطلبات',
          points: [
            'جميع الأسعار بالجنيه المصري (EGP)، ويُعرض إجمالي الطلب وتكلفة الشحن بوضوح قبل التأكيد.',
            'يحق للعميل إلغاء الطلب مجاناً قبل خروجه مع شركة الشحن عبر حسابه أو عبر خدمة عملاء الواتساب.'
          ]
        }
      ]
    },
    {
      key: 'privacy' as PolicyPageTab,
      tabLabel: 'سياسة الخصوصية',
      heading: 'سياسة الخصوصية وحماية البيانات - جو ستور',
      intro: `في ${storeName} نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية واستخدامها فقط في إتمام طلباتك وتفعيل ضمان أجهزتك.`,
      icon: ShieldCheck,
      sections: [
        {
          title: '1. البيانات التي نجمعها',
          points: [
            'بيانات الطلب والتوصيل: الاسم، رقم الهاتف والواتساب، البريد الإلكتروني، العنوان التفصيلي، وإحداثيات الموقع على الخريطة عند اختيارها.',
            'سجل التصفح والسلة لتسهيل عودتك للمنتجات التي شاهدتها وتنبيهات التوفر.'
          ]
        },
        {
          title: '2. حماية الحسابات ومشاركة البيانات',
          points: [
            'تُحفظ كلمات المرور مشفرة والجلسات عبر Cookies آمنة، ولا يتم بيع أو مشاركة بيانات العملاء مع أي جهات تسويقية غير مصرح بها.',
            'يمكنك تعديل بياناتك أو حذف حسابك نهائياً في أي وقت من تبويب «منطقة الخطر» في ملفك الشخصي.'
          ]
        }
      ]
    },
    {
      key: 'refund' as PolicyPageTab,
      tabLabel: 'الضمان والاسترجاع',
      heading: 'سياسة الضمان والاستبدال والاسترجاع - جو ستور',
      intro: `يلتزم ${storeName} بتقديم أجهزة أصلية مفحوصة 100% مع حق المعاينة وضمان استبدال معتمد.`,
      icon: RotateCcw,
      sections: [
        {
          title: '1. الفحص والمعاينة + 14 يوم استبدال',
          points: [
            'يحق للعميل فحص الجهاز وسلامة البطاريات والكاميرات وFace ID مع المندوب قبل الدفع.',
            'يحق الاستبدال خلال 14 يوماً من الاستلام لأي عيب صناعي غير ناتج عن سوء استخدام أو كسر أو سوائل.'
          ]
        },
        {
          title: '2. مدة الضمان المعتمد',
          points: [
            'ضمان 6 أشهر للأجهزة كسر زيرو وسنة كاملة للأجهزة الجديدة المتبرشمة وفق الفاتورة المعتمدة بالمتجر.'
          ]
        }
      ]
    },
    {
      key: 'shipping' as PolicyPageTab,
      tabLabel: 'الشحن والتوصيل',
      heading: 'سياسة الشحن ومواعيد التوصيل - جو ستور',
      intro: `نشحن طلبات ${storeName} لجميع محافظات مصر من فرعنا الرئيسي بالمنصورة بسرعة وأمان.`,
      icon: Truck,
      sections: [
        {
          title: '1. مواعيد وتكلفة التوصيل',
          points: [
            `المنصورة والدقهلية: توصيل في نفس اليوم (3 إلى 6 ساعات). التوصيل مجاني تماماً للطلبات بدءاً من ${freeThreshold}.`,
            'القاهرة والجيزة والإسكندرية: التوصيل خلال 24 - 48 ساعة، وباقي المحافظات خلال 48 - 72 ساعة.'
          ]
        }
      ]
    }
  ];

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
              <h2 className="text-sm md:text-base font-extrabold text-slate-900">{sec.title}</h2>
              <ul className="space-y-2 pr-4 list-disc text-xs md:text-sm text-slate-600 leading-7">
                {sec.points.map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
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
      </article>
    </main>
  );
};
