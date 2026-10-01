import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Heart, 
  Menu, 
  X, 
  Phone, 
  MapPin, 
  Languages, 
  Sun, 
  Moon, 
  ShieldCheck, 
  Flame, 
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  LayoutDashboard,
  CheckCircle,
  Smartphone,
  User as UserIcon,
  Palette
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { JoeStoreLogo } from './JoeStoreLogo';
import { CategoryKey } from '../types';

export const Navbar: React.FC = () => {
  const { 
    cartCount, 
    cartSubtotal, 
    setIsCartOpen, 
    wishlist, 
    currentTab, 
    navigate,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    products,
    settings,
    updateSettings
  } = useStore();

  const { t, language, toggleLanguage, formatPrice, isRTL } = useLanguage();
  const { user, isAuthenticated, openAuthModal } = useAuth();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const isDarkMode = settings.theme_mode !== 'light';
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Toggle Dark / Light Mode with persistence
  const toggleTheme = () => {
    const next = !isDarkMode;
    updateSettings({ theme_mode: next ? 'dark' : 'light' });
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Close search suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter products for live search preview
  const searchResults = searchQuery.trim() ? products.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchText = (p.name_ar + ' ' + p.name_en + ' ' + p.brand + ' ' + (p.storage || '')).toLowerCase();
    const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
    return matchText.includes(q) && matchCat;
  }).slice(0, 5) : [];

  const categoriesList: { key: CategoryKey; label: string; icon: string }[] = [
    { key: 'all', label: t('allCategories'), icon: '📱' },
    { key: 'smartphones', label: t('smartphones'), icon: '📲' },
    { key: 'smartwatches', label: t('smartwatches'), icon: '⌚' },
    { key: 'audio', label: t('audio'), icon: '🎧' },
    { key: 'chargers_cables', label: t('chargers_cables'), icon: '🔌' },
    { key: 'powerbanks', label: t('powerbanks'), icon: '🔋' },
    { key: 'cases_protection', label: t('cases_protection'), icon: '🛡️' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#080C14]/95 backdrop-blur-md border-b border-slate-200 dark:border-amber-500/20 text-slate-800 dark:text-slate-100 shadow-md dark:shadow-lg transition-colors overflow-x-clip">
      {/* 1. Top Utility Micro-Bar */}
      <div className="bg-slate-100 dark:bg-[#05080E] border-b border-slate-200 dark:border-white/5 py-1 px-3 sm:px-4 text-xs font-cairo text-slate-600 dark:text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-y-1 gap-x-2">
          {/* Location & Announcement */}
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold text-[11px] sm:text-xs">
              <MapPin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span>
                {language === 'ar' 
                  ? 'المنصورة – شارع الإمام محمد عبده – ناصية آمون.' 
                  : 'El Mansoura – Imam Mohamed Abdo Street – Amon Corner.'}
              </span>
            </span>
            <span className="hidden md:inline-block text-slate-300 dark:text-white/20">•</span>
            <span className="hidden md:flex items-center gap-1.5 text-slate-600 dark:text-slate-300 text-[11px] sm:text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              <span>
                {language === 'ar' 
                  ? 'جميع أجهزة الكسر زيرو مفحوصة 100% مع ضمان استبدال رسمي' 
                  : 'All certified pre-owned devices 100% tested with official warranty'}
              </span>
            </span>
          </div>

          {/* Quick Actions (Theme Preset, Language, Track Order, User Profile, Admin) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 ms-auto flex-wrap">
            {/* Theme Preset Selector */}
            <div className="relative">
              <button
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-200/80 hover:bg-slate-300 dark:bg-white/5 dark:hover:bg-amber-500/20 text-slate-700 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-300 transition-all text-[11px] font-bold border border-slate-300 dark:border-white/10"
                title={language === 'ar' ? 'تغيير مظهر المتجر والواجهة' : 'Change Store Theme'}
              >
                <Palette className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span className="hidden sm:inline">
                  {settings.active_theme === 'titanium_blue' ? 'Titanium' : settings.active_theme === 'emerald_tech' ? 'Emerald' : 'Gold'}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-500 dark:text-slate-400" />
              </button>

              {showThemeMenu && (
                <div className="absolute top-full mt-1.5 left-0 z-50 w-44 bg-white dark:bg-[#0F1626] border border-slate-200 dark:border-amber-500/30 rounded-xl shadow-2xl p-1.5 space-y-1 text-xs animate-in fade-in zoom-in-95">
                  <button
                    onClick={() => { updateSettings({ active_theme: 'royal_gold' }); setShowThemeMenu(false); }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-right ${settings.active_theme === 'royal_gold' || !settings.active_theme ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                      <span>{language === 'ar' ? 'الذهبي الملكي' : 'Royal Gold'}</span>
                    </span>
                    {(settings.active_theme === 'royal_gold' || !settings.active_theme) && <CheckCircle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />}
                  </button>

                  <button
                    onClick={() => { updateSettings({ active_theme: 'titanium_blue' }); setShowThemeMenu(false); }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-right ${settings.active_theme === 'titanium_blue' ? 'bg-sky-500/20 text-sky-700 dark:text-sky-300 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-sky-400"></span>
                      <span>{language === 'ar' ? 'التيتانيوم الأزرق' : 'Titanium Blue'}</span>
                    </span>
                    {settings.active_theme === 'titanium_blue' && <CheckCircle className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />}
                  </button>

                  <button
                    onClick={() => { updateSettings({ active_theme: 'emerald_tech' }); setShowThemeMenu(false); }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-right ${settings.active_theme === 'emerald_tech' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                      <span>{language === 'ar' ? 'الزمرد السيبراني' : 'Emerald Tech'}</span>
                    </span>
                    {settings.active_theme === 'emerald_tech' && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />}
                  </button>
                </div>
              )}
            </div>

            {/* Track Order */}
            <button
              onClick={() => navigate('track-order')}
              className={`hover:text-amber-600 dark:hover:text-amber-400 transition-colors flex items-center gap-1 ${currentTab === 'track-order' ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-600 dark:text-slate-400'}`}
            >
              <span>{t('trackOrder')}</span>
            </button>

            <span className="text-slate-300 dark:text-white/20">|</span>

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-200/80 hover:bg-slate-300 dark:bg-white/5 dark:hover:bg-amber-500/20 text-slate-700 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-300 transition-all font-outfit text-[11px] font-bold border border-slate-300 dark:border-white/10"
              title="تغيير اللغة / Switch Language"
            >
              <Languages className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span>{language === 'ar' ? 'English (EN)' : 'عربي (AR)'}</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1 rounded bg-slate-200/80 hover:bg-slate-300 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-amber-500 transition-colors"
              title="تغيير الوضع المظلم / الفاتح"
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
            </button>

            <span className="text-slate-300 dark:text-white/20">|</span>

            {/* Admin Dashboard Quick Button */}
            <button
              onClick={() => navigate('admin')}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all ${
                currentTab === 'admin' 
                  ? 'bg-amber-500 text-black shadow-glow-gold' 
                  : 'bg-amber-500/15 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25 border border-amber-500/30'
              }`}
            >
              <LayoutDashboard className="w-3 h-3" />
              <span className="hidden sm:inline">{t('adminPanel')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Header Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden p-1.5 sm:p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 focus:outline-none flex-shrink-0"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
        </button>

        {/* Logo */}
        <div 
          onClick={() => navigate('home')}
          className="cursor-pointer flex-shrink-0"
        >
          <JoeStoreLogo size="md" className="hidden sm:flex" />
          <JoeStoreLogo size="sm" className="sm:hidden" />
        </div>

        {/* Search Bar (Amazon / Noon Style) */}
        <div ref={searchRef} className="flex-1 max-w-2xl hidden md:block relative">
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-300 dark:border-amber-500/30 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all overflow-hidden shadow-inner">
            {/* Category Selector inside search */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as CategoryKey)}
              className="bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-cairo py-2.5 px-3 border-l border-slate-300 dark:border-white/10 focus:outline-none cursor-pointer hover:bg-slate-300/80 dark:hover:bg-slate-750"
            >
              <option value="all">{t('allCategories')}</option>
              <option value="smartphones">{t('smartphones')}</option>
              <option value="smartwatches">{t('smartwatches')}</option>
              <option value="audio">{t('audio')}</option>
              <option value="chargers_cables">{t('chargers_cables')}</option>
              <option value="powerbanks">{t('powerbanks')}</option>
              <option value="cases_protection">{t('cases_protection')}</option>
            </select>

            {/* Input field */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder={t('searchPlaceholder')}
              className="w-full bg-transparent px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none font-cairo"
            />

            {/* Search Button */}
            <button
              onClick={() => {
                navigate('catalog');
                setIsSearchFocused(false);
              }}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black px-5 py-2.5 font-bold transition-all flex items-center justify-center"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* Live Search Instant Dropdown Results */}
          {isSearchFocused && searchResults.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-white dark:bg-[#0F1626] border border-slate-200 dark:border-amber-500/30 rounded-xl shadow-2xl overflow-hidden z-50 divide-y divide-slate-100 dark:divide-white/5 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-2 bg-slate-100 dark:bg-slate-900/80 text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center justify-between">
                <span>{language === 'ar' ? 'نتائج البحث الفورية' : 'Instant Results'} ({searchResults.length})</span>
                <span className="text-slate-500 dark:text-slate-400 font-normal">{language === 'ar' ? 'اضغط على أي منتج لمعاينته' : 'Click to preview product'}</span>
              </div>
              {searchResults.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => {
                    navigate('product', prod.id);
                    setIsSearchFocused(false);
                  }}
                  className="flex items-center gap-3 p-3 hover:bg-slate-100 dark:hover:bg-amber-500/10 cursor-pointer transition-colors"
                >
                  <img src={prod.images[0]} alt={prod.name_ar} className="w-12 h-12 object-cover rounded-lg bg-slate-100 dark:bg-slate-800" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                      {language === 'ar' ? prod.name_ar : prod.name_en}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-outfit">
                        {formatPrice(prod.price)}
                      </span>
                      {prod.battery_health && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-bold">
                          🔋 {prod.battery_health}%
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {prod.condition === 'mint' ? (language === 'ar' ? 'كسر زيرو' : 'Mint') : (language === 'ar' ? 'جديد' : 'Brand New')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              <div 
                onClick={() => {
                  navigate('catalog');
                  setIsSearchFocused(false);
                }}
                className="p-2.5 text-center text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/15 cursor-pointer bg-slate-50 dark:bg-slate-900/50"
              >
                {language === 'ar' ? 'عرض كافة النتائج في المتجر ←' : 'View all products in catalog →'}
              </div>
            </div>
          )}
        </div>

        {/* Right Header Controls (Account, Cart, Wishlist) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* User Account / Profile / Sign-in */}
          {isAuthenticated && user ? (
            <button
              onClick={() => navigate('profile')}
              className={`hidden sm:flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border transition-all ${
                currentTab === 'profile'
                  ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-glow-gold'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10'
              }`}
              title={language === 'ar' ? 'الملف الشخصي والطلبات' : 'My Profile & Orders'}
            >
              <img
                src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                alt=""
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover border border-amber-400"
              />
              <span className="hidden md:inline text-xs font-bold max-w-[80px] truncate">
                {user.name.split(' ')[0]}
              </span>
            </button>
          ) : (
            <button
              onClick={() => openAuthModal()}
              className="hidden sm:flex items-center gap-1 p-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-amber-500/20 text-slate-700 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-300 border border-slate-200 dark:border-white/10 transition-all text-xs font-bold"
              title={language === 'ar' ? 'تسجيل الدخول / حسابي' : 'Sign In / My Account'}
            >
              <UserIcon className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span className="hidden md:inline">{t('signIn')}</span>
            </button>
          )}

          {/* Wishlist */}
          <button
            onClick={() => navigate('catalog')}
            className="relative p-2 sm:p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 hover:text-rose-500 transition-all"
            title={t('wishlist')}
          >
            <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${wishlist.length > 0 ? 'fill-rose-500 text-rose-500' : ''}`} />
            {wishlist.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-rose-500 text-white text-[9px] sm:text-[10px] font-bold flex items-center justify-center shadow-lg font-outfit">
                {wishlist.length}
              </span>
            )}
          </button>

          {/* Cart Drawer Trigger */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-amber-500/10 dark:bg-gradient-to-r dark:from-amber-500/20 dark:to-amber-600/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-300 transition-all group shadow-sm active:scale-95 flex-shrink-0"
          >
            <div className="relative">
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform text-amber-600 dark:text-amber-400" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-black text-[10px] sm:text-[11px] font-black flex items-center justify-center shadow-glow-gold font-outfit">
                  {cartCount}
                </span>
              )}
            </div>
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-cairo">{t('cart')}</span>
              <span className="text-xs font-bold text-slate-800 dark:text-white font-outfit">
                {formatPrice(cartSubtotal)}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* 3. Mobile Search Input Bar */}
      <div className="md:hidden px-3 sm:px-4 pb-2.5">
        <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-amber-500/30 overflow-hidden shadow-inner">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full bg-transparent px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none font-cairo"
          />
          <button
            onClick={() => navigate('catalog')}
            className="bg-amber-500 text-black px-3.5 py-2 hover:bg-amber-400"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. Sub-Navigation (Category Quick Links Strip) */}
      <nav className="bg-slate-100/90 dark:bg-[#0C121F] border-t border-slate-200 dark:border-white/5 px-3 sm:px-4 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto flex items-center gap-1 sm:gap-2 py-2 text-xs font-semibold whitespace-nowrap">
          {/* All Categories Dropdown trigger */}
          <button
            onClick={() => {
              setSelectedCategory('all');
              navigate('catalog');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              selectedCategory === 'all' && currentTab === 'catalog'
                ? 'bg-amber-500 text-black font-bold shadow-glow-gold'
                : 'text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-200 dark:hover:bg-white/5'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{t('allCategories')}</span>
          </button>

          {/* Certified Pre-owned Special Pill (Featured Video Concept) */}
          <button
            onClick={() => {
              setSelectedCategory('smartphones');
              navigate('catalog');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 dark:bg-gradient-to-r dark:from-amber-500/20 dark:to-orange-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:border-amber-400 transition-all font-bold animate-pulse-subtle flex-shrink-0"
          >
            <Smartphone className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>{language === 'ar' ? 'آيفون كسر زيرو (بطاريات 85% - 97%)' : 'Certified Pre-Owned iPhones'}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </button>

          {/* Categories */}
          {categoriesList.filter(c => c.key !== 'all').map((cat) => (
            <button
              key={cat.key}
              onClick={() => {
                setSelectedCategory(cat.key);
                navigate('catalog');
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all flex-shrink-0 ${
                selectedCategory === cat.key && currentTab === 'catalog'
                  ? 'bg-amber-500 text-black font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-200 dark:hover:bg-white/5'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}

          {/* Daily Deals Pill */}
          <button
            onClick={() => navigate('catalog')}
            className="ms-auto flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition-all font-bold flex-shrink-0"
          >
            <Flame className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
            <span>{t('deals')}</span>
          </button>
        </div>
      </nav>
    </header>

    {/* 5. Mobile Drawer Menu - Rendered outside header to prevent clipping */}
    {isMobileMenuOpen && (
      <div className="lg:hidden fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex animate-in fade-in duration-200">
        <div className="w-4/5 max-w-xs sm:max-w-sm bg-white dark:bg-[#0C121F] h-full p-5 overflow-y-auto border-l border-slate-200 dark:border-amber-500/30 flex flex-col justify-between shadow-2xl text-slate-800 dark:text-slate-100">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
              <JoeStoreLogo size="sm" />
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Links */}
            <div className="py-4 space-y-1">
              {/* Profile / Auth Button */}
              {isAuthenticated && user ? (
                <button
                  onClick={() => { navigate('profile'); setIsMobileMenuOpen(false); }}
                  className="w-full text-right px-3 py-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                    <span>{user.name}</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400 text-black font-extrabold">
                    {t('profile')}
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => { openAuthModal(); setIsMobileMenuOpen(false); }}
                  className="w-full text-right px-3 py-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold flex items-center gap-2"
                >
                  <UserIcon className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  <span>{t('signIn')} / {t('signUp')}</span>
                </button>
              )}

              <button
                onClick={() => { navigate('home'); setIsMobileMenuOpen(false); }}
                className="w-full text-right px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-amber-500/10 font-bold text-slate-800 dark:text-slate-200"
              >
                {t('home')}
              </button>
              <button
                onClick={() => { navigate('catalog'); setIsMobileMenuOpen(false); }}
                className="w-full text-right px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-amber-500/10 font-bold text-slate-800 dark:text-slate-200"
              >
                {t('catalog')}
              </button>
              <button
                onClick={() => { navigate('track-order'); setIsMobileMenuOpen(false); }}
                className="w-full text-right px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-amber-500/10 font-bold text-slate-800 dark:text-slate-200"
              >
                {t('trackOrder')}
              </button>
              <button
                onClick={() => { navigate('admin'); setIsMobileMenuOpen(false); }}
                className="w-full text-right px-3 py-2.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/20"
              >
                {t('adminPanel')}
              </button>
            </div>

            {/* Categories Section */}
            <div className="py-4 border-t border-slate-200 dark:border-white/10">
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
                {language === 'ar' ? 'الأقسام الرئيسية' : 'Main Categories'}
              </p>
              <div className="space-y-1">
                {categoriesList.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => {
                      setSelectedCategory(cat.key);
                      navigate('catalog');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-right px-3 py-2 text-xs rounded hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 flex items-center justify-between"
                  >
                    <span>{cat.label}</span>
                    <span>{cat.icon}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-white/10 space-y-2">
            {/* Direct TikTok Profile Link */}
            {(() => {
              const tiktokHref = (settings.tiktok_url && (!settings.tiktok_url.includes('@joestore') || settings.tiktok_url.includes('2026')))
                ? settings.tiktok_url
                : 'https://www.tiktok.com/@joestore2026';
              return (
                <a
                  href={tiktokHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 rounded-lg bg-black text-white hover:bg-zinc-800 transition-colors text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>TikTok: @joestore2026 🎵</span>
                </a>
              );
            })()}

            <button
              onClick={() => { toggleLanguage(); setIsMobileMenuOpen(false); }}
              className="w-full py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 text-xs font-bold flex items-center justify-center gap-2 text-amber-600 dark:text-amber-300"
            >
              <Languages className="w-4 h-4" />
              <span>{language === 'ar' ? 'Switch to English' : 'التحويل للغة العربية'}</span>
            </button>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center font-cairo">
              {language === 'ar' ? 'جو ستور - المنصورة' : 'JOE Store - Mansoura'}
            </div>
          </div>
        </div>

        <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
      </div>
    )}
  </>
  );
};
