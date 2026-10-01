import React from 'react';
import { Home, Grid, ShoppingBag, Truck, User } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export const MobileBottomNav: React.FC = () => {
  const { currentTab, navigate, cartCount, setIsCartOpen } = useStore();
  const { t, language } = useLanguage();
  const { isAuthenticated, openAuthModal } = useAuth();

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#080C14]/95 backdrop-blur-lg border-t border-slate-200 dark:border-white/10 px-2 py-1.5 shadow-2xl">
      <div className="flex items-center justify-around">
        {/* Home */}
        <button
          onClick={() => navigate('home')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-colors ${
            currentTab === 'home' ? 'text-amber-500 dark:text-amber-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-cairo">{t('home')}</span>
        </button>

        {/* Catalog */}
        <button
          onClick={() => navigate('catalog')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-colors ${
            currentTab === 'catalog' ? 'text-amber-500 dark:text-amber-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Grid className="w-5 h-5" />
          <span className="text-[10px] font-cairo">{t('catalog')}</span>
        </button>

        {/* Track Order */}
        <button
          onClick={() => navigate('track-order')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-colors ${
            currentTab === 'track-order' ? 'text-amber-500 dark:text-amber-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Truck className="w-5 h-5" />
          <span className="text-[10px] font-cairo">{language === 'ar' ? 'تتبع' : 'Track'}</span>
        </button>

        {/* Profile / Account */}
        <button
          onClick={() => {
            if (isAuthenticated) {
              navigate('profile');
            } else {
              openAuthModal(language === 'ar' ? 'سجل دخولك لعرض ملفك الشخصي وطلباتك' : 'Sign in to view your profile & orders');
            }
          }}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-colors ${
            currentTab === 'profile' ? 'text-amber-500 dark:text-amber-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-cairo">{t('profile')}</span>
        </button>

        {/* Cart */}
        <button
          onClick={() => setIsCartOpen(true)}
          className="relative flex flex-col items-center gap-1 p-1.5 rounded-xl text-amber-500 dark:text-amber-400 font-bold"
        >
          <ShoppingBag className="w-5 h-5" />
          {cartCount > 0 && (
            <span className="absolute top-1 right-2 w-4 h-4 rounded-full bg-amber-500 text-black text-[9px] font-extrabold flex items-center justify-center font-outfit shadow-glow-gold">
              {cartCount}
            </span>
          )}
          <span className="text-[10px] font-cairo">{t('cart')}</span>
        </button>
      </div>
    </div>
  );
};
