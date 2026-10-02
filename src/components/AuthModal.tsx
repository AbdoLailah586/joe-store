import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Lock, 
  Mail, 
  User as UserIcon, 
  Phone, 
  CheckCircle, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft,
  KeyRound,
  RotateCcw,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useStore } from '../context/StoreContext';

declare global {
  interface Window {
    google?: any;
  }
}

export const AuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, 
    closeAuthModal, 
    authMessage, 
    loginWithGoogle, 
    loginWithEmail, 
    sendOtp,
    verifyOtpAndRegister,
    redirectAfterLogin 
  } = useAuth();

  const { navigate } = useStore();
  const { t, isRTL } = useLanguage();

  // Mode: 'login' | 'register' | 'otp_verify'
  const [mode, setMode] = useState<'login' | 'register' | 'otp_verify'>('login');
  
  // Registration & Login inputs
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // OTP inputs
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [devNotice, setDevNotice] = useState<string | null>(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Google Sign-In Client ID
  const googleClientId = 
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_CLIENT_ID) || 
    '294509556603-op9cbf1s15b9nk1hgpnb8sfugfvqeer8.apps.googleusercontent.com';

  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  // Initialize Google One-Tap & Identity Services
  useEffect(() => {
    if (!isAuthModalOpen) return;

    const initGoogle = () => {
      if (window.google?.accounts?.id && googleClientId) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Render official Google button if container exists
          if (googleBtnContainerRef.current) {
            window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
              theme: 'outline',
              size: 'large',
              width: 320,
              text: 'continue_with',
              shape: 'pill',
              locale: 'ar'
            });
          }
        } catch (e) {
          console.warn('Google GSI init warning:', e);
        }
      }
    };

    const timer = setTimeout(initGoogle, 400);
    return () => clearTimeout(timer);
  }, [isAuthModalOpen, mode]);

  // Cooldown countdown timer for OTP resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  if (!isAuthModalOpen) return null;

  // Decode JWT from Google Credential Response
  const handleGoogleCredentialResponse = async (response: any) => {
    if (!response || !response.credential) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);

      await loginWithGoogle(payload);
      
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });

      if (redirectAfterLogin) navigate(redirectAfterLogin as any);
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      setErrorMsg('تعذر تسجيل الدخول بحساب Google. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomGoogleClick = () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      // Fallback
      loginWithGoogle();
      if (redirectAfterLogin) navigate(redirectAfterLogin as any);
    }
  };

  // Submit Handler for Login or Register
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setDevNotice(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const ok = await loginWithEmail(email, password);
        if (ok) {
          if (redirectAfterLogin) navigate(redirectAfterLogin as any);
        }
      } else if (mode === 'register') {
        if (!name.trim() || !phone.trim() || !email.trim() || !password) {
          setErrorMsg('يرجى ملء جميع الحقول المطلوبة.');
          setLoading(false);
          return;
        }

        // Send 6-digit Verification Code via Resend
        const otpRes = await sendOtp(email.trim(), name.trim());
        if (otpRes.success) {
          setMode('otp_verify');
          setResendCooldown(60);
          setSuccessMsg(`تم إرسال كود التأكيد إلى بريدك الإلكتروني: ${email}`);

          if (otpRes.isSimulatedNotice && otpRes.simulatedCode) {
            setDevNotice(`كود التحقق الخاص بك هو: ${otpRes.simulatedCode}`);
          }
        } else {
          setErrorMsg(otpRes.error || 'تعذر إرسال كود التأكيد، يرجى مراجعة البريد الإلكتروني.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء المعالجة.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP Digit Input
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }

    const newCode = [...otpCode];
    newCode[index] = value;
    setOtpCode(newCode);

    // Auto-advance to next input
    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  // Handle OTP Paste (e.g. user copies 6-digit code)
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().slice(0, 6);
    if (/^\d+$/.test(pasted)) {
      const digits = pasted.split('');
      const newCode = [...otpCode];
      digits.forEach((d, i) => {
        if (i < 6) newCode[i] = d;
      });
      setOtpCode(newCode);
      const nextIdx = Math.min(digits.length, 5);
      otpInputsRef.current[nextIdx]?.focus();
    }
  };

  // Submit OTP Verification
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = otpCode.join('');
    if (fullCode.length < 6) {
      setErrorMsg('يرجى إدخال كود التأكيد كاملاً (6 أرقام).');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await verifyOtpAndRegister({
        email: email.trim(),
        code: fullCode,
        name: name.trim(),
        phone: phone.trim(),
        password: password
      });

      if (res.success) {
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.6 }
        });

        if (redirectAfterLogin) {
          navigate(redirectAfterLogin as any);
        }
      } else {
        setErrorMsg(res.error || 'كود التأكيد غير صحيح.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء التحقق من الكود.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP Code
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    setErrorMsg('');
    setDevNotice(null);

    try {
      const res = await sendOtp(email.trim(), name.trim());
      if (res.success) {
        setResendCooldown(60);
        setSuccessMsg('تمت إعادة إرسال كود التأكيد إلى بريدك الإلكتروني بنجاح!');
        if (res.isSimulatedNotice && res.simulatedCode) {
          setDevNotice(`كود التحقق الخاص بك هو: ${res.simulatedCode}`);
        }
      } else {
        setErrorMsg(res.error || 'تعذر إعادة إرسال الكود.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء إعادة إرسال الكود.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-[#0F1626] border border-amber-500/40 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-100 font-cairo space-y-5 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-5 left-5 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          title="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ============================================================== */}
        {/* SCREEN 1 & 2: LOGIN OR REGISTRATION FORM                      */}
        {/* ============================================================== */}
        {mode !== 'otp_verify' ? (
          <>
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-inner">
                <Lock className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-black text-white">
                {mode === 'login' ? 'تسجيل الدخول إلى جو ستور' : 'إنشاء حساب جديد وتوثيقه'}
              </h2>
              <p className="text-xs text-slate-400">
                {mode === 'login' 
                  ? 'مرحباً بعودتك! سجل دخولك لمتابعة طلباتك وشهادات الضمان.' 
                  : 'أنشئ حسابك واستمتع بتجربة تسوق حصرية وضمان معتمد.'}
              </p>
              {authMessage && (
                <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold leading-relaxed">
                  {authMessage}
                </div>
              )}
            </div>

            {/* 1. Google One-Click Button */}
            <div className="space-y-2">
              <div ref={googleBtnContainerRef} className="flex justify-center w-full min-h-[44px]">
                {/* Fallback Custom Google Button */}
                <button
                  type="button"
                  onClick={handleCustomGoogleClick}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-3 shadow-md transition-all active:scale-95 border border-slate-200"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.26 21.36 7.33 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.26C.46 8.18 0 9.98 0 12s.46 3.82 1.26 5.42l4.02-3.13z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.26 6.58l4.02 3.13c.95-2.83 3.6-4.96 6.72-4.96z" />
                  </svg>
                  <span>المتابعة باستخدام حساب Google</span>
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-[#0F1626] px-3 text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                أو بالبريد الإلكتروني
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">الاسم الكامل *</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="مثال: أحمد عبد الرحمن"
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                      <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">رقم الهاتف (الواتساب) *</label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="010XXXXXXXX"
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white font-outfit placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  البريد الإلكتروني (Gmail / Email) *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white font-outfit placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                </div>
                {mode === 'register' && (
                  <p className="text-[10px] text-amber-300/80 mt-1 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>سيتم إرسال كود تأكيد مكون من 6 أرقام إلى هذا البريد.</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">كلمة المرور *</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white font-outfit placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-400 font-semibold bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs sm:text-sm shadow-glow-gold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>جاري المعالجة...</span>
                ) : mode === 'login' ? (
                  <span>تسجيل الدخول</span>
                ) : (
                  <span>متابعة وإرسال كود التأكيد 📩</span>
                )}
              </button>
            </form>

            {/* Toggle Mode */}
            <div className="text-center pt-2 text-xs text-slate-400">
              {mode === 'login' ? (
                <span>
                  ليس لديك حساب بعد؟{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setErrorMsg('');
                    }}
                    className="text-amber-400 font-bold hover:underline"
                  >
                    إنشاء حساب جديد
                  </button>
                </span>
              ) : (
                <span>
                  لديك حساب بالفعل؟{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMsg('');
                    }}
                    className="text-amber-400 font-bold hover:underline"
                  >
                    تسجيل الدخول
                  </button>
                </span>
              )}
            </div>
          </>
        ) : (
          /* ============================================================== */
          /* SCREEN 3: 6-DIGIT EMAIL OTP VERIFICATION SCREEN                */
          /* ============================================================== */
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center mx-auto shadow-inner">
                <KeyRound className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-black text-white">
                تأكيد بريدك الإلكتروني
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                أرسلنا كود تحقق مكون من 6 أرقام إلى:
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
                <Mail className="w-3.5 h-3.5" />
                <span>{email}</span>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-[10px] text-slate-400 hover:text-white underline mr-1"
                >
                  تعديل
                </button>
              </div>
            </div>

            {/* Development / Testing Notice */}
            {devNotice && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>{devNotice}</span>
              </div>
            )}

            {/* 6 Digits Boxes */}
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="flex items-center justify-center gap-2 sm:gap-3 dir-ltr" dir="ltr">
                {otpCode.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputsRef.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={handleOtpPaste}
                    className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black font-outfit text-amber-400 bg-slate-900 border-2 border-white/10 rounded-2xl focus:border-amber-400 focus:bg-slate-950 focus:outline-none transition-all shadow-inner"
                  />
                ))}
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-400 font-semibold bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20 text-center">
                  {errorMsg}
                </p>
              )}

              {successMsg && !errorMsg && (
                <p className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 text-center">
                  {successMsg}
                </p>
              )}

              {/* Submit Verification */}
              <button
                type="submit"
                disabled={loading || otpCode.join('').length < 6}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs sm:text-sm shadow-glow-gold transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading ? 'جاري التحقق...' : 'تأكيد وتفعيل الحساب ⚡'}
              </button>

              {/* Resend Cooldown */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="hover:text-white flex items-center gap-1"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>العودة للخلف</span>
                </button>

                <button
                  type="button"
                  disabled={resendCooldown > 0 || loading}
                  onClick={handleResendOtp}
                  className={`flex items-center gap-1.5 font-bold ${
                    resendCooldown > 0 ? 'text-slate-500 cursor-not-allowed' : 'text-amber-400 hover:underline'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>
                    {resendCooldown > 0 
                      ? `إعادة الإرسال بعد (${resendCooldown} ث)` 
                      : 'إعادة إرسال الكود'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
