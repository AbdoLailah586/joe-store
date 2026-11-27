export type PolicyKey = 'terms' | 'privacy' | 'refund' | 'shipping';

export interface PolicyDocContent {
  heading: string;
  intro: string;
  body: string;
}

export type PolicyPagesSettings = Partial<Record<PolicyKey, Partial<PolicyDocContent>>>;

export const POLICY_META: Record<PolicyKey, { tabLabel: string; defaultHeading: string }> = {
  terms: { tabLabel: 'الشروط والأحكام', defaultHeading: 'شروط وأحكام استخدام المتجر - جو ستور' },
  privacy: { tabLabel: 'سياسة الخصوصية', defaultHeading: 'سياسة الخصوصية وحماية البيانات - جو ستور' },
  refund: { tabLabel: 'الاستبدال والاسترجاع والضمان', defaultHeading: 'سياسة الضمان والاستبدال والاسترجاع - جو ستور' },
  shipping: { tabLabel: 'الشحن والتوصيل', defaultHeading: 'سياسة الشحن ومواعيد التوصيل - جو ستور' }
};

export function getDefaultPolicyDoc(
  key: PolicyKey,
  options?: { storeName?: string; freeThreshold?: string }
): PolicyDocContent {
  const storeName = options?.storeName || 'جو ستور - JOE Store';
  const freeThreshold = options?.freeThreshold || '2500 ج.م';

  if (key === 'terms') {
    return {
      heading: POLICY_META.terms.defaultHeading,
      intro: `مرحباً بك في متجر ${storeName}. استخدامك للموقع أو إتمام أي طلب يعني موافقتك على الشروط والأحكام التالية لحماية حقوق العميل والمتجر.`,
      body: [
        '### 1. صحة بيانات الطلب والتواصل',
        '- يجب تسجيل بيانات تواصل صحيحة (الاسم، الهاتف، الواتساب، وعنوان التوصيل أو موقع GPS) لضمان سرعة الشحن وتفعيل الضمان.',
        '- يتحمل المستخدم مسؤولية سرية حسابه، ويمكنه تعديل بياناته أو حذف حسابه في أي وقت من صفحة الملف الشخصي.',
        '',
        '### 2. الأسعار والضمان والطلبات',
        '- جميع الأسعار بالجنيه المصري (EGP)، ويُعرض إجمالي الطلب وتكلفة الشحن بوضوح قبل التأكيد.',
        '- يحق للعميل إلغاء الطلب مجاناً قبل خروجه مع شركة الشحن عبر حسابه أو عبر خدمة عملاء الواتساب.'
      ].join('\n')
    };
  }

  if (key === 'privacy') {
    return {
      heading: POLICY_META.privacy.defaultHeading,
      intro: `في ${storeName} نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية واستخدامها فقط في إتمام طلباتك وتفعيل ضمان أجهزتك.`,
      body: [
        '### 1. البيانات التي نجمعها',
        '- بيانات الطلب والتوصيل: الاسم، رقم الهاتف والواتساب، البريد الإلكتروني، العنوان التفصيلي، وإحداثيات الموقع على الخريطة عند اختيارها.',
        '- سجل التصفح والسلة لتسهيل عودتك للمنتجات التي شاهدتها وتنبيهات التوفر.',
        '',
        '### 2. حماية الحسابات ومشاركة البيانات',
        '- تُحفظ كلمات المرور مشفرة والجلسات عبر Cookies آمنة، ولا يتم بيع أو مشاركة بيانات العملاء مع أي جهات تسويقية غير مصرح بها.',
        '- يمكنك تعديل بياناتك أو حذف حسابك نهائياً في أي وقت من تبويب «منطقة الخطر» في ملفك الشخصي.'
      ].join('\n')
    };
  }

  if (key === 'refund') {
    return {
      heading: POLICY_META.refund.defaultHeading,
      intro: `يلتزم ${storeName} بتقديم أجهزة أصلية مفحوصة 100% مع حق المعاينة وضمان استبدال معتمد.`,
      body: [
        '### 1. الفحص والمعاينة + 14 يوم استبدال',
        '- يحق للعميل فحص الجهاز وسلامة البطاريات والكاميرات وFace ID مع المندوب قبل الدفع.',
        '- يحق الاستبدال خلال 14 يوماً من الاستلام لأي عيب صناعي غير ناتج عن سوء استخدام أو كسر أو سوائل.',
        '',
        '### 2. مدة الضمان المعتمد',
        '- ضمان 6 أشهر للأجهزة كسر زيرو وسنة كاملة للأجهزة الجديدة المتبرشمة وفق الفاتورة المعتمدة بالمتجر.'
      ].join('\n')
    };
  }

  return {
    heading: POLICY_META.shipping.defaultHeading,
    intro: `نشحن طلبات ${storeName} لجميع محافظات مصر من فرعنا الرئيسي بالمنصورة بسرعة وأمان.`,
    body: [
      '### 1. مواعيد وتكلفة التوصيل',
      `- المنصورة والدقهلية: توصيل في نفس اليوم (3 إلى 6 ساعات). التوصيل مجاني تماماً للطلبات بدءاً من ${freeThreshold}.`,
      '- القاهرة والجيزة والإسكندرية: التوصيل خلال 24 - 48 ساعة، وباقي المحافظات خلال 48 - 72 ساعة.'
    ].join('\n')
  };
}

export interface ParsedPolicySection {
  title: string;
  paragraphs: string[];
  bullets: string[];
}

export function parsePolicyBody(rawBody: string): ParsedPolicySection[] {
  const lines = String(rawBody || '').split(/\r?\n/);
  const sections: ParsedPolicySection[] = [];
  let current: ParsedPolicySection = { title: '', paragraphs: [], bullets: [] };

  const flush = () => {
    if (current.title || current.paragraphs.length || current.bullets.length) {
      sections.push(current);
      current = { title: '', paragraphs: [], bullets: [] };
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('### ')) {
      flush();
      current.title = line.slice(4).trim();
    } else if (/^[-•*]\s+/.test(line)) {
      current.bullets.push(line.replace(/^[-•*]\s+/, '').trim());
    } else {
      current.paragraphs.push(line);
    }
  }
  flush();
  return sections;
}
