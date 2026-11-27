import React from 'react';
import { Home, Grid, ShoppingBag, Truck, User, ShieldCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export const MobileBottomNav: React.FC = () => {
  const { currentTab, navigate, cartCount, setIsCartOpen } = useStore();
  const { t, language } = useLanguage();
  const { isAuthenticated, canAccessAdmin, openAuthModal } = useAuth();

  if (currentTab === 'admin') return null;

  const pillClass = (active: boolean) =>
    `relative flex flex-col items-center justify-center gap-0.5 flex-1 py-2 px-1 rounded-full text-[10px] font-bold font-cairo transition-all duration-300 active:scale-95 ${
      active
        ? 'joe-liquid-glass-pill text-amber-800'
        : 'text-slate-700/80 hover:text-slate-900'
    }`;

  return (
    <div
      data-testid="mobile-liquid-glass-dock"
      className="md:hidden fixed bottom-[max(14px,env(safe-area-inset-bottom))] inset-x-3 z-40 mx-auto max-w-[430px] pointer-events-none"
    >
      <nav
        aria-label={language === 'ar' ? 'التنقل السريع للموبايل' : 'Mobile quick navigation'}
        className="joe-liquid-glass-dock pointer-events-auto relative rounded-full p-1.5 overflow-visible"
      >
        <span
          aria-hidden="true"
          className="joe-liquid-glass-sheen pointer-events-none absolute inset-0 rounded-full"
        />

        <div className="relative z-10 flex items-center justify-between gap-1">
          <button type="button" onClick={() => navigate('home')} className={pillClass(currentTab === 'home')}>
            <Home className={`w-[18px] h-[18px] ${currentTab === 'home' ? 'stroke-[2.4]' : ''}`} />
            <span>{t('home')}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('catalog')}
            className={pillClass(currentTab === 'catalog' || currentTab === 'product')}
          >
            <Grid className={`w-[18px] h-[18px] ${currentTab === 'catalog' || currentTab === 'product' ? 'stroke-[2.4]' : ''}`} />
            <span>{t('catalog')}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            aria-label={t('cart')}
            className="relative -mt-4 mx-0.5 flex flex-col items-center justify-center shrink-0 active:scale-95 transition-transform duration-200"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 shadow-[0_10px_24px_-4px_rgba(245,158,11,0.55),inset_0_1.5px_1px_rgba(255,255,255,0.75)] flex items-center justify-center relative border-2 border-white/95">
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -left-1 min-w-[20px] h-[20px] px-1 rounded-full bg-slate-900 text-white text-[10px] font-extrabold font-outfit flex items-center justify-center border border-white shadow-sm">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-extrabold font-cairo text-slate-900 mt-0.5 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]">
              {t('cart')}
            </span>
          </button>

          <button type="button" onClick={() => navigate('track-order')} className={pillClass(currentTab === 'track-order')}>
            <Truck className={`w-[18px] h-[18px] ${currentTab === 'track-order' ? 'stroke-[2.4]' : ''}`} />
            <span>{language === 'ar' ? 'تتبع' : 'Track'}</span>
          </button>

          {canAccessAdmin ? (
            <button type="button" onClick={() => navigate('admin')} className={pillClass(false)}>
              <ShieldCheck className="w-[18px] h-[18px] text-amber-700" />
              <span>{language === 'ar' ? 'الإدارة' : 'Admin'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (isAuthenticated) {
                  navigate('profile');
                } else {
                  openAuthModal(language === 'ar' ? 'سجل دخولك لعرض ملفك الشخصي وطلباتك' : 'Sign in to view your profile & orders');
                }
              }}
              className={pillClass(currentTab === 'profile')}
            >
              <User className={`w-[18px] h-[18px] ${currentTab === 'profile' ? 'stroke-[2.4]' : ''}`} />
              <span>{t('profile')}</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
};
