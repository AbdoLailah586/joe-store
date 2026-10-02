import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Flame, 
  ShieldCheck, 
  BatteryMedium, 
  Truck, 
  CheckCircle, 
  ArrowLeft, 
  ArrowRight, 
  Smartphone, 
  ChevronLeft, 
  ChevronRight, 
  MessageCircle,
  TrendingUp
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { ProductCard } from '../components/ProductCard';
import { CategoryKey, Product } from '../types';
import { neonDb } from '../services/neonDb';

export const Home: React.FC = () => {
  const { products, navigate, setSelectedCategory, settings, sessionId } = useStore();
  const { t, language, formatPrice, isRTL } = useLanguage();

  const [recommendations, setRecommendations] = useState<{
    hasHistory: boolean;
    recommendedProducts: Product[];
    searchTags: string[];
    topCategory?: string;
  }>({
    hasHistory: false,
    recommendedProducts: [],
    searchTags: []
  });

  useEffect(() => {
    neonDb.getPersonalizedRecommendations(sessionId).then(res => {
      if (res && res.recommendedProducts.length > 0) {
        setRecommendations(res);
      }
    }).catch(console.warn);
  }, [sessionId]);

  const slides = settings.hero_slides && settings.hero_slides.length > 0 ? settings.hero_slides : [
    {
      id: 'slide-iphone-13',
      badge: 'العرض الأقوى في المنصورة ⚡',
      title_ar: 'آيفون 13 كسر زيرو بالضمان',
      title_en: 'iPhone 13 Mint Condition',
      subtitle_ar: 'بطاريات أصلية من 85% لـ 97% | ألوان أبيض، أزرق، زيتي، بينك | مفحوص 100% مع ضمان استبدال رسمي',
      subtitle_en: 'Original Battery Health 85%-97% | White, Blue, Olive Green, Pink | 100% Tested with Warranty',
      price: '19,800',
      oldPrice: '23,500',
      tag: 'بطاريات أصلية 85% - 97%',
      image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=1200&q=80',
      cat: 'smartphones' as CategoryKey
    },
    {
      id: 'slide-iphone-15',
      badge: 'الإصدار الرائد الجديد متبرشم 🌟',
      title_ar: 'آيفون 15 برو ماكس تيتانيوم',
      title_en: 'iPhone 15 Pro Max Titanium',
      subtitle_ar: 'أقوى أداء بمعالج A17 Pro وكاميرا تقريب بصري 5x ومنفذ تايب سي فائق السرعة',
      subtitle_en: 'Aerospace Grade Titanium with A17 Pro Chip and Ultra-fast USB-C',
      price: '56,500',
      oldPrice: '61,000',
      tag: 'جديد متبرشم بضمان دولي ومحلي',
      image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=1200&q=80',
      cat: 'smartphones' as CategoryKey
    },
    {
      id: 'slide-airpods',
      badge: 'صوت سينمائي ونقاء استثنائي 🎧',
      title_ar: 'إيربودز برو 2 الجديدة تايب سي',
      title_en: 'AirPods Pro 2 USB-C',
      subtitle_ar: 'عزل ضوضاء مضاعف، تتبع صوتي مكاني، وشحن لاسلكي MagSafe',
      subtitle_en: 'Up to 2x more Active Noise Cancellation and Personalized Spatial Audio',
      price: '9,400',
      oldPrice: '11,200',
      tag: 'متوفرة بأفضل سعر في مصر',
      image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=1200&q=80',
      cat: 'audio' as CategoryKey
    }
  ];

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  // Filter specific product sets
  const certifiedPreOwned = products.filter(p => p.condition === 'mint' || (p.battery_health && p.battery_health < 100));
  const flashSaleItems = products.filter(p => p.is_flash_sale || (p.discount_percentage && p.discount_percentage > 10)).slice(0, 4);

  const categories = [
    { key: 'smartphones' as CategoryKey, title_ar: 'هواتف ذكية', title_en: 'Smartphones', count: '15+ جهاز', count_en: '15+ Devices', icon: '📱' },
    { key: 'smartwatches' as CategoryKey, title_ar: 'ساعات ذكية', title_en: 'Smartwatches', count: '8+ ساعات', count_en: '8+ Watches', icon: '⌚' },
    { key: 'audio' as CategoryKey, title_ar: 'سماعات وصوتيات', title_en: 'Audio & Earbuds', count: '12+ سماعة', count_en: '12+ Items', icon: '🎧' },
    { key: 'chargers_cables' as CategoryKey, title_ar: 'شواحن وكابلات', title_en: 'Chargers & Cables', count: '25+ شاحن', count_en: '25+ Items', icon: '🔌' },
    { key: 'powerbanks' as CategoryKey, title_ar: 'بنوك طاقة (باوربانك)', title_en: 'Powerbanks', count: '10+ شاحن متنقل', count_en: '10+ Items', icon: '🔋' },
    { key: 'cases_protection' as CategoryKey, title_ar: 'جرابات وحمايات', title_en: 'Cases & Protectors', count: '40+ جراب واسكرين', count_en: '40+ Items', icon: '🛡️' }
  ];

  return (
    <div className="space-y-16 pb-12">
      {/* 1. Hero Dynamic Slider Section */}
      <section className="relative px-4 pt-4">
        <div className="max-w-7xl mx-auto rounded-3xl overflow-hidden bg-gradient-to-br from-slate-100 via-white to-slate-200 dark:bg-slate-900 border border-slate-200 dark:border-amber-500/30 relative min-h-[440px] sm:min-h-[500px] flex items-center shadow-xl dark:shadow-2xl hero-slider-container">
          {slides.map((slide, idx) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-1000 flex flex-col md:flex-row items-center justify-between p-6 sm:p-12 gap-8 ${
                currentSlide === idx ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              {/* Background Ambient Image & Gradient */}
              <div className="absolute inset-0 -z-10">
                <img
                  src={slide.image}
                  alt={slide.title_ar}
                  className="w-full h-full object-cover object-center opacity-30 dark:opacity-100 dark:brightness-35 filter blur-xs"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/40 dark:from-[#080C14] dark:via-[#080C14]/90 dark:to-transparent" />
              </div>

              {/* Text Side */}
              <div className={`max-w-xl space-y-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 dark:border-amber-500/40 text-xs font-bold font-cairo shadow-sm backdrop-blur-md">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span>{slide.badge}</span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white font-cairo tracking-tight leading-tight">
                  {language === 'ar' ? slide.title_ar : slide.title_en}
                </h1>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-cairo">
                  {language === 'ar' ? slide.subtitle_ar : slide.subtitle_en}
                </p>

                {/* Price and tag */}
                <div className="flex items-center gap-4 pt-2">
                  <div>
                    <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-outfit">
                      {slide.price} {language === 'ar' ? 'ج.م' : 'EGP'}
                    </span>
                    <span className="block text-xs text-slate-400 line-through font-outfit">
                      {slide.oldPrice} {language === 'ar' ? 'ج.م' : 'EGP'}
                    </span>
                  </div>

                  <span className="px-3 py-1 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 dark:border-emerald-500/40 text-xs font-bold font-cairo">
                    {slide.tag}
                  </span>
                </div>

                {/* Hero CTAs */}
                <div className="flex items-center gap-3 pt-4">
                  <button
                    onClick={() => {
                      setSelectedCategory(slide.cat);
                      navigate('catalog');
                    }}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs sm:text-sm shadow-glow-gold transition-all active:scale-95 flex items-center gap-2"
                  >
                    <span>{t('shopNow')}</span>
                    {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => {
                      setSelectedCategory('smartphones');
                      navigate('catalog');
                    }}
                    className="px-5 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-900/80 dark:hover:bg-slate-800 dark:text-white dark:border-white/10 backdrop-blur-sm transition-all font-bold text-xs sm:text-sm shadow-sm"
                  >
                    {t('shopPreowned')}
                  </button>
                </div>
              </div>

              {/* Floating Device Showcase Frame */}
              <div className="hidden md:flex relative flex-shrink-0 w-72 h-80 rounded-2xl overflow-hidden border border-slate-200 dark:border-amber-500/30 shadow-xl dark:shadow-2xl shadow-amber-500/10 group bg-slate-50 dark:bg-slate-900">
                <img
                  src={slide.image}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                  <span className="text-xs font-bold text-amber-300 font-cairo">
                    {language === 'ar' ? 'مفحوص ومضمون من متجر جو ستور بالمنصورة ✨' : 'Tested & Certified by JOE Store ✨'}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Carousel Arrows */}
          <button
            onClick={() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-white/90 dark:bg-black/60 hover:bg-amber-500 hover:text-black dark:hover:bg-amber-500 text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 shadow-lg backdrop-blur-md transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-white/90 dark:bg-black/60 hover:bg-amber-500 hover:text-black dark:hover:bg-amber-500 text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 shadow-lg backdrop-blur-md transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-4 inset-x-0 z-20 flex justify-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`h-2 rounded-full transition-all ${
                  currentSlide === i ? 'w-8 bg-amber-500 dark:bg-amber-400' : 'w-2 bg-slate-300 dark:bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 2. Highlights Strip */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#0F1626] border border-slate-200 dark:border-white/5 hover:border-amber-500/30 transition-all flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-white font-cairo">
                {language === 'ar' ? 'ضمان استبدال وصيانة' : 'Official Warranty'}
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-cairo">
                {language === 'ar' ? 'ضمان معتمد رسمي على جميع الأجهزة' : 'Certified exchange warranty on devices'}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0F1626] border border-slate-200 dark:border-white/5 hover:border-emerald-500/30 transition-all flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
              <BatteryMedium className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-white font-cairo">
                {language === 'ar' ? 'بطاريات أصلية معلنة' : 'Certified Battery Health'}
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-cairo">
                {language === 'ar' ? 'نسبة بطارية دقيقة 85% - 97% للأجهزة' : 'Accurate 85%-97% original battery'}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0F1626] border border-slate-200 dark:border-white/5 hover:border-blue-500/30 transition-all flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-white font-cairo">
                {language === 'ar' ? 'توصيل سريع وفوري' : 'Same-Day Delivery'}
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-cairo">
                {language === 'ar' ? 'توصيل في نفس اليوم بالمنصورة ومصر' : 'Instant in Mansoura & Egypt'}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0F1626] border border-slate-200 dark:border-white/5 hover:border-purple-500/30 transition-all flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-white font-cairo">
                {language === 'ar' ? 'إشعار واتساب للطلب' : 'WhatsApp Receipt'}
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-cairo">
                {language === 'ar' ? 'تحديثات فورية لحالة الشحنة لهاتفك' : 'Instant invoice & tracking on WhatsApp'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2.5 Dynamic Personalized Recommendation Section */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 relative overflow-hidden shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40 text-xs font-bold font-cairo mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                <span>
                  {recommendations.hasHistory 
                    ? (language === 'ar' ? 'مخصص لك بناءً على نشاطك وبحثك' : 'Tailored For You Based On Activity') 
                    : (language === 'ar' ? 'التريند الأكثر طلباً في المنصورة' : 'Trending Now in Mansoura')
                  }
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-cairo">
                {recommendations.hasHistory
                  ? (language === 'ar' ? 'ترشيحات ذكية اختيرت لأجلك ✨' : 'Smart Picks Chosen For You ✨')
                  : (language === 'ar' ? 'أقوى العروض الرائجة في المتجر اليوم 🔥' : 'Trending Hot Deals in Store Today 🔥')
                }
              </h2>
              {recommendations.searchTags.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-cairo">
                    {language === 'ar' ? 'بناءً على اهتمامك بـ:' : 'Based on your interest in:'}
                  </span>
                  {recommendations.searchTags.map((tag, i) => (
                    <span key={i} className="text-[11px] px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30">
                      "{tag}"
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => { setSelectedCategory('all'); navigate('catalog'); }}
              className="px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 font-bold text-xs font-cairo border border-amber-500/30 transition-all flex items-center gap-1.5"
            >
              <span>{t('viewAll')}</span>
              {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {(recommendations.recommendedProducts.length > 0 
              ? recommendations.recommendedProducts.slice(0, 4) 
              : products.slice(0, 4)
            ).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* 3. Category Showcase Grid */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-cairo flex items-center gap-2">
              <span>{t('browseCategories')}</span>
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-cairo">{t('browseCategoriesSub')}</p>
          </div>
          <button
            onClick={() => { setSelectedCategory('all'); navigate('catalog'); }}
            className="text-xs font-bold text-amber-500 hover:text-amber-400 font-cairo flex items-center gap-1"
          >
            <span>{t('viewAll')}</span>
            {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {categories.map((cat) => (
            <div
              key={cat.key}
              onClick={() => {
                setSelectedCategory(cat.key);
                navigate('catalog');
              }}
              className="group p-4 rounded-2xl bg-white dark:bg-[#0F1626] border border-slate-200 dark:border-white/10 hover:border-amber-500/50 hover:bg-slate-50 dark:hover:bg-slate-900/80 transition-all duration-300 cursor-pointer text-center flex flex-col items-center justify-between shadow-sm hover:shadow-glow-gold hover:-translate-y-1"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-500/20 border border-amber-500/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform mb-3 shadow-inner">
                {cat.icon}
              </div>
              <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100 font-cairo group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors">
                {language === 'ar' ? cat.title_ar : cat.title_en}
              </h3>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-outfit mt-1">
                {language === 'ar' ? cat.count : cat.count_en}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Certified Pre-Owned Highlight Section */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0C121F] via-[#101827] to-[#0C121F] border border-amber-500/30 relative overflow-hidden shadow-2xl dark-banner-container">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 blur-3xl -z-0 pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold font-cairo">
                <BatteryMedium className="w-4 h-4 text-emerald-400" />
                <span>{language === 'ar' ? 'أجهزة آيفون كسر زيرو (بطاريات معلنة 85% لـ 97%)' : 'Pre-Owned iPhones (85%-97% Original Battery)'}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white font-cairo">
                {t('certifiedPreownedTitle')}
              </h2>
              <p className="text-xs text-slate-400 max-w-xl font-cairo">
                {t('certifiedPreownedSub')}
              </p>
            </div>

            <button
              onClick={() => {
                setSelectedCategory('smartphones');
                navigate('catalog');
              }}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs font-cairo shadow-glow-gold transition-all flex items-center gap-2"
            >
              <span>{t('shopPreowned')}</span>
              {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {certifiedPreOwned.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* 5. Flash Sales */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-cairo flex items-center gap-2">
                <span>{language === 'ar' ? 'عروض وخصومات اليوم ⚡' : 'Flash Deals & Offers ⚡'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500 text-white font-bold font-outfit">
                  {language === 'ar' ? 'خصومات حصرية' : 'Exclusive'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-cairo">
                {language === 'ar' ? 'قطع محدودة بأسعار خاصة لفترة محدودة' : 'Limited inventory at promotional prices'}
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('catalog')}
            className="text-xs font-bold text-amber-500 hover:text-amber-400 font-cairo flex items-center gap-1"
          >
            <span>{language === 'ar' ? 'مشاهدة كل العروض' : 'View All Deals'}</span>
            {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {flashSaleItems.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 6. Physical Store Location in Mansoura */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="rounded-3xl bg-slate-900 border border-amber-500/20 p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl dark-banner-container">
          <div className={`space-y-3 max-w-xl ${isRTL ? 'text-right' : 'text-left'}`}>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider font-cairo">
              📍 {language === 'ar' ? 'تشرفنا زيارتكم في المحل بالمنصورة' : 'Visit our Flagship Store in Mansoura'}
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white font-cairo">
              {language === 'ar' ? settings.store_name_ar : settings.store_name_en}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-cairo">
              {language === 'ar' 
                ? `${settings.store_address_ar} استمتع بتجربة فحص ومعاينة حية لجميع أجهزة الآيفون كسر زيرو وتشكيلة شواحن أنكر وسماعات إيربودز مع فريقنا المتخصص.`
                : `${settings.store_address_en} Experience hands-on testing of certified pre-owned iPhones, genuine Anker chargers, and AirPods with our tech specialists.`}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
                ⏰ {language === 'ar' ? settings.working_hours_ar : settings.working_hours_en}
              </span>
              <span className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5 font-outfit">
                📞 {settings.store_phone}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <a
              href={`https://wa.me/${settings.store_whatsapp}?text=${encodeURIComponent(language === 'ar' ? 'مرحباً جو ستور، أود معرفة موقع المحل بالتحديد في المنصورة.' : 'Hello JOE Store, I would like to know the exact branch location in Mansoura.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{language === 'ar' ? 'لوكيشن المحل عبر واتساب' : 'Store Location on WhatsApp'}</span>
            </a>
            <button
              onClick={() => navigate('catalog')}
              className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-glow-gold transition-all"
            >
              <span>{t('shopNow')}</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
