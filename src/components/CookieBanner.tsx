import React, { useEffect, useState } from 'react';
import { Cookie, ShieldCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { readStorage, writeStorage } from '../utils/browserStorage';

export const COOKIE_CONSENT_STORAGE_KEY = 'joe_cookie_consent_v1';

export type CookieConsentChoice = 'accepted' | 'essential';

export function hasCookieConsent(): boolean {
  return Boolean(readStorage(COOKIE_CONSENT_STORAGE_KEY));
}

export function saveCookieConsent(choice: CookieConsentChoice): boolean {
  return writeStorage(
    COOKIE_CONSENT_STORAGE_KEY,
    JSON.stringify({ choice, savedAt: new Date().toISOString() })
  );
}

export const CookieBanner: React.FC = () => {
  const { navigate, trackActivity } = useStore();
  const { language } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hasCookieConsent()) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const ar = language === 'ar';

  const handleChoice = (choice: CookieConsentChoice) => {
    saveCookieConsent(choice);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('joe-cookie-consent-changed', { detail: { choice } }));
    }
    if (choice === 'accepted' && typeof trackActivity === 'function') {
      trackActivity('visit', undefined, { cookie_consent: choice });
    }
    setVisible(false);
  };

  return (
    <aside
      role="dialog"
      aria-live="polite"
      aria-label={ar ? 'إشعار ملفات تعريف الارتباط' : 'Cookie Consent Banner'}
      data-testid="cookie-consent-banner"
      className="fixed bottom-24 md:bottom-5 inset-x-3 sm:inset-x-auto sm:end-5 sm:max-w-lg z-40 rounded-3xl bg-white/95 backdrop-blur-xl border border-amber-500/35 shadow-[0_20px_50px_rgba(15,23,42,0.18)] p-4 sm:p-5 text-slate-900 font-cairo animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-700 flex items-center justify-center shrink-0">
          <Cookie className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-1.5">
            <h3 className="text-xs sm:text-sm font-black text-slate-900">
              {ar ? 'نستخدم ملفات تعريف الارتباط (Cookies)' : 'We use Cookies'}
            </h3>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          </div>
          <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
            {ar ? (
              <>
                نستخدم الكوكيز لحفظ سلة التسوق وتسجيل الدخول وتحسين تجربتك وتوصيل طلباتك بدقة. بالمتابعة أو الموافقة فأنت تقر بسياسة{' '}
                <button
                  type="button"
                  onClick={() => navigate('privacy')}
                  className="text-amber-700 font-bold underline hover:text-amber-800"
                >
                  الخصوصية
                </button>{' '}
                و{' '}
                <button
                  type="button"
                  onClick={() => navigate('terms')}
                  className="text-amber-700 font-bold underline hover:text-amber-800"
                >
                  الشروط
                </button>
                .
              </>
            ) : (
              <>
                We use cookies to keep your cart, session, and delivery preferences working smoothly. Read our{' '}
                <button
                  type="button"
                  onClick={() => navigate('privacy')}
                  className="text-amber-700 font-bold underline"
                >
                  Privacy Policy
                </button>
                .
              </>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              data-testid="cookie-accept-all"
              onClick={() => handleChoice('accepted')}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow-sm transition active:scale-95"
            >
              {ar ? 'موافق على الكوكيز' : 'Accept All Cookies'}
            </button>
            <button
              type="button"
              data-testid="cookie-essential-only"
              onClick={() => handleChoice('essential')}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
            >
              {ar ? 'الضرورية فقط' : 'Essential Only'}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
