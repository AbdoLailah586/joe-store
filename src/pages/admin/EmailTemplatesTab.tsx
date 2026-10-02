import React, { useState } from 'react';
import { 
  Mail, 
  Send, 
  Save, 
  Smartphone, 
  Monitor, 
  RotateCcw, 
  Sparkles, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  CheckCircle, 
  AlertCircle,
  Palette,
  ExternalLink
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';

export const EmailTemplatesTab: React.FC = () => {
  const { settings, updateSettings } = useStore();
  const { formatPrice } = useLanguage();

  // Form State
  const [headerTitle, setHeaderTitle] = useState(
    settings.email_header_title || settings.store_name_ar || 'JOE Store | متجر جو ستور'
  );
  const [headerSubtitle, setHeaderSubtitle] = useState(
    settings.email_header_subtitle || 'وجهتك الموثوقة للهواتف والإكسسوارات الأصلية - المنصورة'
  );
  const [subjectTemplate, setSubjectTemplate] = useState(
    settings.email_subject_template || 'رمز تأكيد حسابك في متجر جو ستور ⚡ (كود: {code})'
  );
  const [welcomeMsg, setWelcomeMsg] = useState(
    settings.email_welcome_msg || 'سعداء بانضمامك إلى عائلة جو ستور. لإتمام إنشاء حسابك والتحقق من بريدك الإلكتروني، يرجى استخدام رمز الأمان التالي:'
  );
  const [supportPhone, setSupportPhone] = useState(
    settings.email_support_phone || settings.store_phone || '01554826209'
  );
  const [storeAddress, setStoreAddress] = useState(
    settings.email_store_address || settings.store_address_ar || 'المنصورة - شارع الإمام محمد عبده - ناصية آمون'
  );
  const [securityNote, setSecurityNote] = useState(
    settings.email_security_note || 'هذا الرمز صالح للاستخدام خلال 10 دقائق فقط. حفاظاً على أمانك، لا تشارك هذا الرمز مع أي شخص.'
  );
  const [accentColor, setAccentColor] = useState(
    settings.email_accent_color || '#F59E0B'
  );

  // Preview Mode
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [testEmail, setTestEmail] = useState('abdolailah586@gmail.com');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Dummy OTP Code for Preview
  const previewOtp = '582914';

  // Save Settings
  const handleSave = () => {
    updateSettings({
      email_header_title: headerTitle,
      email_header_subtitle: headerSubtitle,
      email_subject_template: subjectTemplate,
      email_welcome_msg: welcomeMsg,
      email_support_phone: supportPhone,
      email_store_address: storeAddress,
      email_security_note: securityNote,
      email_accent_color: accentColor,
      store_phone: supportPhone // Also sync with general store phone
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // Reset to default
  const handleResetDefaults = () => {
    setHeaderTitle('JOE Store | متجر جو ستور');
    setHeaderSubtitle('وجهتك الموثوقة للهواتف والإكسسوارات الأصلية - المنصورة');
    setSubjectTemplate('رمز تأكيد حسابك في متجر جو ستور ⚡ (كود: {code})');
    setWelcomeMsg('سعداء بانضمامك إلى عائلة جو ستور. لإتمام إنشاء حسابك والتحقق من بريدك الإلكتروني، يرجى استخدام رمز الأمان التالي:');
    setSupportPhone('01554826209');
    setStoreAddress('المنصورة - شارع الإمام محمد عبده - ناصية آمون');
    setSecurityNote('هذا الرمز صالح للاستخدام خلال 10 دقائق فقط. حفاظاً على أمانك، لا تشارك هذا الرمز مع أي شخص.');
    setAccentColor('#F59E0B');
  };

  // Send Live Test Email
  const handleSendTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      setTestResult({ success: false, msg: 'يرجى إدخال بريد إلكتروني صحيح لإرسال التجربة.' });
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail.trim(),
          name: 'مدير المتجر (تجربة القالب)',
          customTemplate: {
            email_header_title: headerTitle,
            email_header_subtitle: headerSubtitle,
            email_subject_template: subjectTemplate,
            email_welcome_msg: welcomeMsg,
            email_support_phone: supportPhone,
            email_store_address: storeAddress,
            email_security_note: securityNote,
            email_accent_color: accentColor
          }
        })
      });

      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          msg: data.emailId 
            ? `تم إرسال الإيميل التجريبي الحقيقي بنجاح إلى ${testEmail}! تفقد صندوق الوارد (Inbox).` 
            : `تم توليد الإيميل التجريبي بالكود: ${data.simulatedCode || '123456'}`
        });
      } else {
        setTestResult({ success: false, msg: data.error || 'تعذر إرسال الإيميل التجريبي.' });
      }
    } catch (err: any) {
      setTestResult({ success: false, msg: `فشل الإرسال: ${err.message}` });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-6 font-cairo">
      {/* Top Header */}
      <div className="p-6 rounded-3xl bg-[#0F1626] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Mail className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <span>تخصيص قوالب الإيميل ورسائل الأكواد</span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs border border-amber-500/30 font-mono">
                Email Template Studio
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              تحكم كامل في نصوص، أرقام التواصل، العناوين، وشكل رسائل التوثيق المرسلة للزبائن عبر Resend.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5"
            title="استرجاع القيم الافتراضية"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>استرجاع الافتراضي</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow-glow-gold transition-all active:scale-95 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{isSaved ? 'تم الحفظ بنجاح! ✓' : 'حفظ التعديلات 💾'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Controls (5 cols) & Right Live Preview (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ============================================================== */}
        {/* LEFT COLUMN: EDITING FORM (5 Cols)                             */}
        {/* ============================================================== */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-3xl bg-[#0F1626] border border-white/10 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2 border-b border-white/5 pb-3">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>محتويات ونصوص رسالة التأكيد</span>
            </h3>

            {/* Header Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                اسم وترويسة المتجر في الإيميل
              </label>
              <input
                type="text"
                value={headerTitle}
                onChange={(e) => setHeaderTitle(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                placeholder="JOE Store | متجر جو ستور"
              />
            </div>

            {/* Header Subtitle */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                الوصف الفرعي أسفل الشعار
              </label>
              <input
                type="text"
                value={headerSubtitle}
                onChange={(e) => setHeaderSubtitle(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                placeholder="وجهتك الموثوقة للهواتف والإكسسوارات الأصلية - المنصورة"
              />
            </div>

            {/* Subject Line */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                عنوان الرسالة (Subject Line) <span className="text-[10px] text-amber-400 font-mono">&#123;code&#125;</span>
              </label>
              <input
                type="text"
                value={subjectTemplate}
                onChange={(e) => setSubjectTemplate(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-outfit"
                placeholder="رمز تأكيد حسابك في متجر جو ستور ⚡ (كود: {code})"
              />
            </div>

            {/* Welcome Message */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                الرسالة الترحيبية للعميل
              </label>
              <textarea
                rows={3}
                value={welcomeMsg}
                onChange={(e) => setWelcomeMsg(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 leading-relaxed"
                placeholder="سعداء بانضمامك إلى عائلة جو ستور..."
              />
            </div>

            {/* Support Phone Number */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
              <label className="block text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span>رقم الهاتف الرسمي للتواصل والدعم *</span>
              </label>
              <input
                type="text"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-white font-outfit font-bold focus:outline-none focus:border-amber-300 text-left"
                placeholder="01554826209"
                dir="ltr"
              />
              <p className="text-[10px] text-slate-400">
                هذا هو الرقم الفعلي الذي سيظهر لجميع العملاء في أسفل الإيميل للتواصل مع المتجر.
              </p>
            </div>

            {/* Store Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>عنوان المتجر الفعلي (في تذييل الرسالة)</span>
              </label>
              <input
                type="text"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                placeholder="المنصورة - شارع الإمام محمد عبده - ناصية آمون"
              />
            </div>

            {/* Security Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>ملاحظة الأمان وتنبيه صلاحية الكود</span>
              </label>
              <input
                type="text"
                value={securityNote}
                onChange={(e) => setSecurityNote(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                placeholder="هذا الرمز صالح للاستخدام خلال 10 دقائق فقط..."
              />
            </div>

            {/* Accent Color Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                <span>لون التمييز والأزرار في الإيميل</span>
              </label>
              <div className="flex items-center gap-3">
                {[
                  { name: 'الذهبي الملكي', hex: '#F59E0B' },
                  { name: 'الأزرق التيتانيوم', hex: '#3B82F6' },
                  { name: 'الأخضر الزمردي', hex: '#10B981' },
                  { name: 'الأرجواني الفاخر', hex: '#8B5CF6' }
                ].map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setAccentColor(c.hex)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                      accentColor === c.hex 
                        ? 'border-white bg-white/10 shadow-lg' 
                        : 'border-white/10 bg-slate-900 text-slate-400'
                    }`}
                  >
                    <span 
                      className="w-3.5 h-3.5 rounded-full" 
                      style={{ backgroundColor: c.hex }} 
                    />
                    <span className="text-[11px]">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Test Email Dispatch Card */}
          <div className="p-5 rounded-3xl bg-[#0F1626] border border-emerald-500/30 space-y-3">
            <h4 className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" />
              <span>إرسال إيميل تجريبي حي لمعاينته في بريدك</span>
            </h4>
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="name@gmail.com"
                className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-outfit focus:outline-none focus:border-emerald-400"
                dir="ltr"
              />
              <button
                type="button"
                disabled={isSendingTest}
                onClick={handleSendTestEmail}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingTest ? 'جاري الإرسال...' : 'إرسال تجربة'}</span>
              </button>
            </div>

            {testResult && (
              <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                testResult.success ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
              }`}>
                {testResult.success ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                <span>{testResult.msg}</span>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT COLUMN: LIVE GMAIL CLIENT PREVIEW (7 Cols)               */}
        {/* ============================================================== */}
        <div className="lg:col-span-7 space-y-4">
          {/* Preview Device Switcher */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0F1626] border border-white/10">
            <div className="flex items-center gap-2 text-xs text-slate-300 font-bold">
              <span>المعاينة الحية للبريد (Real-time Email Preview):</span>
            </div>

            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  previewDevice === 'desktop' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>سطح المكتب</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  previewDevice === 'mobile' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>الجوال</span>
              </button>
            </div>
          </div>

          {/* Simulated Email Client Container */}
          <div className="rounded-3xl bg-[#131b2e] border border-white/10 shadow-2xl overflow-hidden">
            {/* Fake Email Client Bar */}
            <div className="bg-[#0b101d] px-4 py-3 border-b border-white/10 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                <span className="font-outfit text-slate-300 font-semibold mr-2">Gmail Inbox</span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                From: JOE Store &lt;onboarding@resend.dev&gt;
              </div>
            </div>

            {/* Email Subject Line Bar */}
            <div className="bg-[#0e1526] px-5 py-3 border-b border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 block">الموضوع (Subject):</span>
                <strong className="text-white text-xs sm:text-sm font-bold">
                  {subjectTemplate.replace('{code}', previewOtp)}
                </strong>
              </div>
              <span className="text-[10px] text-slate-500">الآن ⏱️</span>
            </div>

            {/* Email Content Body Frame */}
            <div className="p-4 sm:p-8 bg-[#080C14] flex justify-center min-h-[460px] overflow-x-auto">
              <div 
                className={`w-full transition-all duration-300 ${
                  previewDevice === 'mobile' ? 'max-w-[360px]' : 'max-w-[520px]'
                }`}
              >
                {/* Real HTML Template Simulation */}
                <div className="rounded-3xl bg-[#0F1626] border border-amber-500/30 overflow-hidden shadow-2xl">
                  {/* Top Branding Header */}
                  <div 
                    className="p-6 text-center border-b border-white/5"
                    style={{
                      background: `linear-gradient(180deg, ${accentColor}18 0%, rgba(15, 22, 38, 0) 100%)`
                    }}
                  >
                    <h1 
                      className="text-2xl font-black tracking-wide"
                      style={{ color: accentColor }}
                    >
                      {headerTitle}
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                      {headerSubtitle}
                    </p>
                  </div>

                  {/* Body Box */}
                  <div className="p-6 space-y-4 text-center">
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                      <h3 className="text-sm font-bold text-white">
                        مرحباً أحمد عبد الرحمن 👋
                      </h3>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {welcomeMsg}
                      </p>

                      {/* Code Box */}
                      <div 
                        className="py-4 px-6 rounded-2xl border-2 border-dashed mx-auto my-3"
                        style={{
                          backgroundColor: `${accentColor}12`,
                          borderColor: accentColor
                        }}
                      >
                        <span 
                          className="block text-[10px] font-bold uppercase tracking-wider mb-1"
                          style={{ color: accentColor }}
                        >
                          رمز التحقق المعتمد (OTP)
                        </span>
                        <div 
                          className="text-3xl sm:text-4xl font-black font-outfit tracking-[10px]"
                          style={{ color: accentColor }}
                        >
                          {previewOtp}
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-400 leading-normal">
                        ⏱️ {securityNote}
                      </p>
                    </div>
                  </div>

                  {/* Footer Box */}
                  <div className="p-5 bg-black/30 border-t border-white/5 text-center text-[11px] text-slate-400 space-y-1">
                    <p className="text-slate-300 flex items-center justify-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-400" />
                      <span>{storeAddress}</span>
                    </p>
                    <p className="text-slate-300 flex items-center justify-center gap-1 font-outfit">
                      <Phone className="w-3 h-3 text-emerald-400" />
                      <span>خدمة العملاء والدعم: <strong style={{ color: accentColor }}>{supportPhone}</strong></span>
                    </p>
                    <p className="text-[10px] text-slate-500 pt-1">
                      © 2026 {headerTitle}. جميع الحقوق محفوظة.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
