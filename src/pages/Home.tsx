import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpLeft,
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  Headphones,
  Watch,
  Cable,
  BatteryCharging,
  ShieldCheck,
  Camera,
  MapPin,
  MessageCircle,
  SlidersHorizontal,
  Layers3,
  History,
  ChevronLeft,
  ChevronRight,
  Truck,
  CreditCard,
  PackageCheck,
  Sparkles,
  Flame,
  Award,
  Zap,
  Smartphone,
  CheckCircle,
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import { useLanguage } from "../context/LanguageContext";
import { ProductCard } from "../components/ProductCard";
import { CategoryKey, Product } from "../types";
import { neonDb } from "../services/neonDb";
import { SpotlightCard } from "../components/motion/SpotlightCard";
import { AnimateStorefront } from "../components/motion/AnimateStorefront";
import { generateWhatsAppWebLink } from "../utils/whatsappService";
import { useDetails } from "../components/DetailsDialog";

// Dubai Phone style categories with real product imagery
const dubaiCategories: {
  key: CategoryKey;
  ar: string;
  en: string;
  image: string;
}[] = [
  {
    key: "smartphones",
    ar: "هواتف ذكية",
    en: "Smartphones",
    image: "/product-images/15c3630cb4bb430b367edd7f.webp",
  },
  {
    key: "chargers_cables",
    ar: "شواحن وكابلات",
    en: "Chargers & Cables",
    image: "/product-images/onmust-zolo-30w-studio.jpg",
  },
  {
    key: "audio",
    ar: "سماعات وصوتيات",
    en: "Audio & Earbuds",
    image: "/product-images/f6427a20c128ea77c56bc426.webp",
  },
  {
    key: "smartwatches",
    ar: "ساعات ذكية",
    en: "Smartwatches",
    image: "/product-images/3f4452f62308aae22858b473.webp",
  },
  {
    key: "powerbanks",
    ar: "باور بانك",
    en: "Power Banks",
    image: "/product-images/0e1a38acbfd018e570a0b515.webp",
  },
  {
    key: "cases_protection",
    ar: "كفرات وحماية",
    en: "Cases & Protection",
    image: "/product-images/2e1f8fb369b614aba97f55d1.webp",
  },
  {
    key: "accessories",
    ar: "إكسسوارات متنوعة",
    en: "Accessories",
    image: "/product-images/3af3d5bd2ec35679a678251e.webp",
  },
];

// Default high-converting slides if none configured in admin dashboard
const defaultHeroSlides = [
  {
    id: "slide-1",
    badge: "العرض الأقوى في المنصورة ⚡",
    title_ar: "آيفون 13 و 15 برو ماكس كسر زيرو ومتبرشم",
    title_en: "iPhone 13 & 15 Pro Max Mint & Sealed",
    subtitle_ar: "أجهزة مفحوصة 100% مع ضمان استبدال رسمي وبطاريات أصلية حتى 98%",
    subtitle_en: "100% tested with official warranty and original battery health up to 98%",
    price: "19,800",
    oldPrice: "23,500",
    tag: "ضمان جو ستور المعتمد",
    image: "/product-images/15c3630cb4bb430b367edd7f.webp",
    cat: "smartphones" as CategoryKey,
  },
  {
    id: "slide-2",
    badge: "أحدث تكنولوجيا شحن سريع ⚡",
    title_ar: "رؤوس شواحن ONMUST وAnker السريعة 30W PD",
    title_en: "ONMUST & Anker 30W Fast PD Chargers",
    subtitle_ar: "شحن 60% في 30 دقيقة بتقنية التبريد الذكي وحماية البطارية",
    subtitle_en: "60% charge in 30 mins with smart low-temperature battery protection",
    price: "350",
    oldPrice: "450",
    tag: "منفذ تايب سي فائق السرعة",
    image: "/product-images/onmust-zolo-30w-studio.jpg",
    cat: "chargers_cables" as CategoryKey,
  },
  {
    id: "slide-3",
    badge: "صوت سينمائي ونقاء استثنائي 🎧",
    title_ar: "تشكيلة سماعات Apple وJoyroom اللاسلكية",
    title_en: "Apple & Joyroom Wireless Earbuds Collection",
    subtitle_ar: "عزل ضوضاء فائق، ميكروفونات عالية الدقة للمكالمات، وبطارية تدوم طوال اليوم",
    subtitle_en: "Active noise cancellation, crystal clear mic, and all-day battery life",
    price: "1,250",
    oldPrice: "1,600",
    tag: "صوت نقي وباس عميق",
    image: "/product-images/f6427a20c128ea77c56bc426.webp",
    cat: "audio" as CategoryKey,
  },
  {
    id: "slide-4",
    badge: "أناقة وتقنية في معصمك ⌚",
    title_ar: "ساعات ذكية متوافقة مع آيفون وأندرويد",
    title_en: "Smartwatches for iPhone & Android",
    subtitle_ar: "شاشات AMOLED فائقة الوضوح، تتبع النبض والأنشطة الرياضية، وتنبيهات المكالمات",
    subtitle_en: "Vibrant AMOLED display, fitness tracking, and call notifications",
    price: "1,850",
    oldPrice: "2,300",
    tag: "أحدث إصدارات 2026",
    image: "/product-images/3f4452f62308aae22858b473.webp",
    cat: "smartwatches" as CategoryKey,
  },
];

export const Home: React.FC = () => {
  const { products: allProducts, navigate, settings, sessionId } = useStore();
  const { language, isRTL, t } = useLanguage();
  const ar = language === "ar";
  const { openDetails } = useDetails();
  const root = useRef<HTMLDivElement>(null);
  const products = useMemo(
    () => allProducts.filter((p) => p.is_active !== false),
    [allProducts],
  );
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [personalized, setPersonalized] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [activeCollection, setActiveCollection] = useState<CategoryKey>("all");

  // Determine slides from admin settings or default
  const slides = useMemo(() => {
    return settings.hero_slides && settings.hero_slides.length > 0
      ? settings.hero_slides
      : defaultHeroSlides;
  }, [settings.hero_slides]);

  const currentSlide = slides[slideIndex % slides.length];
  const Arrow = isRTL ? ArrowLeft : ArrowRight;
  const DiagonalArrow = isRTL ? ArrowUpLeft : ArrowUpRight;
  const shop = (category: CategoryKey = "all") =>
    navigate("catalog", undefined, { category, search: "" });

  // Auto-play hero slider every 5 seconds
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  // Touch Swipe for Hero Slider on Mobile
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchEndX(null);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };
  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null || slides.length <= 1) return;
    const distance = touchStartX - touchEndX;
    if (distance > 40) {
      setSlideIndex((prev) => (prev + 1) % slides.length);
    } else if (distance < -40) {
      setSlideIndex((prev) => (prev - 1 + slides.length) % slides.length);
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  useEffect(() => {
    let cancelled = false;
    neonDb
      .getPersonalizedRecommendations(sessionId)
      .then((result) => {
        if (cancelled || !result?.recommendedProducts?.length) return;
        setRecommendations(
          result.recommendedProducts.filter((p) => p.is_active !== false),
        );
        setPersonalized(!!result.hasHistory);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const featured = useMemo(() => {
    const base =
      activeCollection === "all"
        ? recommendations.length
          ? recommendations
          : [...products].sort(
              (a, b) => Number(!!b.is_featured) - Number(!!a.is_featured),
            )
        : products.filter((p) => p.category === activeCollection);
    if (activeCollection !== "all" || recommendations.length)
      return base.slice(0, 8);
    const picks: Product[] = [];
    for (const category of [
      "smartphones",
      "chargers_cables",
      "audio",
      "smartwatches",
      "powerbanks",
      "cases_protection",
      "accessories",
    ]) {
      const item = base.find((p) => p.category === category);
      if (item && !picks.some((x) => x.id === item.id)) picks.push(item);
    }
    return [
      ...picks,
      ...base.filter((p) => !picks.some((item) => item.id === p.id)),
    ].slice(0, 8);
  }, [products, recommendations, activeCollection]);

  // Flash deals & offers (Up to 8 items)
  const offers = useMemo(() => {
    return products
      .filter((p) => p.is_flash_sale || p.discount_percentage > 0)
      .slice(0, 8);
  }, [products]);

  // Smartphones collection (Up to 8 items)
  const phones = useMemo(() => {
    return products
      .filter((p) => p.category === "smartphones")
      .slice(0, 8);
  }, [products]);

  // Collect all unique brands from products for the animated marquee
  const allBrands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.brand && p.brand.trim() && !/unknown|unbranded|غير|متنوع/i.test(p.brand)) {
        set.add(p.brand.trim());
      }
    });
    // Ensure verified store brands are featured
    ["Apple", "ONMUST", "Anker", "Joyroom", "Samsung", "Oraimo", "Pitaka", "Xiaomi"].forEach((b) =>
      set.add(b)
    );
    return Array.from(set);
  }, [products]);

  const whatsapp = generateWhatsAppWebLink(
    settings.store_whatsapp,
    ar
      ? "مرحباً جو ستور، محتاج مساعدة في اختيار المنتج المناسب."
      : "Hello JOE Store, can you help me choose a product?",
  );

  return (
    <div ref={root} className="joe-home font-cairo">
      <AnimateStorefront
        root={root}
        motionKey={`${language}-${products.length}`}
      />

      {/* ==============================================================
          1. DUBAI PHONE STYLE HERO SLIDER (At the very top)
         ============================================================== */}
      <section
        className="joe-container pt-3 sm:pt-6"
        aria-label={ar ? "عروض المتجر الرئيسية" : "Store Hero Banner Slider"}
      >
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 text-white shadow-2xl border border-amber-500/20"
        >
          {/* Main Slide Content */}
          <div className="relative min-h-[340px] sm:min-h-[420px] md:min-h-[460px] flex flex-col md:flex-row items-center justify-between p-6 sm:p-10 md:p-14 gap-6 select-none">
            {/* Background ambient lighting */}
            <div className="absolute inset-0 bg-radial-gradient from-amber-500/10 via-transparent to-transparent pointer-events-none" />

            {/* Left/Start: Promotional Text & Action */}
            <div className="w-full md:w-3/5 space-y-3 sm:space-y-4 z-10 text-start">
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs sm:text-sm font-bold shadow-glow-gold backdrop-blur-md">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>{currentSlide.badge}</span>
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black font-cairo text-white leading-tight">
                {ar ? currentSlide.title_ar : currentSlide.title_en}
              </h1>

              {/* Subtitle */}
              <p className="text-xs sm:text-base text-slate-300 max-w-xl leading-relaxed">
                {ar ? currentSlide.subtitle_ar : currentSlide.subtitle_en}
              </p>

              {/* Price & Tag Box */}
              <div className="flex items-center gap-3 pt-1 flex-wrap">
                {currentSlide.price && (
                  <div className="flex items-baseline gap-2">
                    <strong className="text-2xl sm:text-3xl font-black text-amber-400 font-outfit">
                      {currentSlide.price} {ar ? "ج.م" : "EGP"}
                    </strong>
                    {currentSlide.oldPrice && (
                      <del className="text-xs sm:text-sm text-slate-400 font-outfit">
                        {currentSlide.oldPrice} {ar ? "ج.م" : "EGP"}
                      </del>
                    )}
                  </div>
                )}
                {currentSlide.tag && (
                  <span className="px-2.5 py-1 rounded-md bg-white/10 text-slate-200 text-xs font-semibold backdrop-blur-md border border-white/10">
                    {currentSlide.tag}
                  </span>
                )}
              </div>

              {/* CTA Action Buttons */}
              <div className="flex items-center gap-3 pt-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => shop(currentSlide.cat || "all")}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-sm sm:text-base flex items-center gap-2 shadow-glow-gold transition-all active:scale-95 cursor-pointer"
                >
                  <span>{ar ? "تسوق العرض الآن" : "Shop Offer Now"}</span>
                  <Arrow size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => shop()}
                  className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm flex items-center gap-2 backdrop-blur-md transition-all cursor-pointer"
                >
                  <span>{ar ? "اكتشف الكتالوج" : "Explore Catalog"}</span>
                  <DiagonalArrow size={16} />
                </button>
              </div>
            </div>

            {/* Right/End: Product Cutout Image */}
            <div className="w-full md:w-2/5 flex items-center justify-center z-10">
              <button
                type="button"
                onClick={() => shop(currentSlide.cat || "all")}
                className="relative group cursor-pointer focus:outline-none"
              >
                <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-3xl transform group-hover:scale-110 transition-transform duration-500" />
                <img
                  src={currentSlide.image}
                  alt={ar ? currentSlide.title_ar : currentSlide.title_en}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/product-placeholder.svg";
                  }}
                  className="relative max-h-[200px] sm:max-h-[280px] md:max-h-[340px] w-auto object-contain transform group-hover:scale-105 transition-transform duration-300 drop-shadow-[0_20px_35px_rgba(0,0,0,0.6)]"
                />
              </button>
            </div>
          </div>

          {/* Slider Controls (Chevrons & Dots) */}
          {slides.length > 1 && (
            <>
              {/* Prev Button */}
              <button
                type="button"
                aria-label={ar ? "العرض السابق" : "Previous slide"}
                onClick={() =>
                  setSlideIndex((prev) => (prev - 1 + slides.length) % slides.length)
                }
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all z-20 cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Next Button */}
              <button
                type="button"
                aria-label={ar ? "العرض التالي" : "Next slide"}
                onClick={() => setSlideIndex((prev) => (prev + 1) % slides.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all z-20 cursor-pointer"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Dots Pagination */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    aria-label={`انتقل إلى العرض ${idx + 1}`}
                    onClick={() => setSlideIndex(idx)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      (slideIndex % slides.length) === idx
                        ? "w-6 bg-amber-400 shadow-glow-gold"
                        : "w-2 bg-white/50 hover:bg-white"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ==============================================================
          2. STORE TRUST STRIP (Dubai Phone style trust signals)
         ============================================================== */}
      <div className="joe-service-strip mt-6">
        <div className="joe-container joe-service-items">
          {[
            {
              icon: PackageCheck,
              a: "فحص فني وضمان رسمي",
              e: "100% Tested & Official Warranty",
            },
            {
              icon: Truck,
              a: "توصيل سريع لكافة المحافظات",
              e: "Fast Delivery Nationwide",
            },
            {
              icon: CreditCard,
              a: "دفع عند الاستلام · إنستاباي · فودافون كاش",
              e: "COD · InstaPay · Vodafone Cash",
            },
            {
              icon: ShieldCheck,
              a: "قطع أصلية ومعتمدة 100%",
              e: "100% Original & Certified",
            },
          ].map(({ icon: Icon, a, e }, index) => (
            <button
              type="button"
              key={e}
              className="text-start"
              onClick={() =>
                openDetails({
                  title: ar ? a : e,
                  description:
                    index === 0
                      ? ar
                        ? "جميع أجهزتنا تخضع لفحص فني شامل لأكثر من 30 نقطة، مع ضمان استبدال رسمي وفاتورة شراء معتمدة."
                        : "All devices undergo a 30-point technical check with official replacement warranty."
                      : index === 1
                      ? ar
                        ? "شحن سريع لكافة محافظات مصر. يتم تأكيد الموعد والتفاصيل هاتفياً قبل خروج الشحنة."
                        : "Fast shipping to all Egyptian governorates with phone confirmation."
                      : index === 2
                      ? ar
                        ? "خيارات دفع مرنة تشمل الدفع نقداً عند الاستلام، أو التحويل الفوري عبر إنستاباي ومحافظ فودافون كاش."
                        : "Flexible payment options: Cash on delivery, InstaPay, and Vodafone Cash."
                      : ar
                      ? "منتجات أصلية من كبرى الشركات العالمية مثل Apple وAnker وONMUST وJoyroom."
                      : "Genuine products from leading global brands.",
                  facts:
                    index === 1
                      ? [
                          {
                            label: ar ? "حد الشحن المجاني" : "Free Shipping Threshold",
                            value: `${settings.free_shipping_threshold ?? 2500} ${ar ? "ج.م" : "EGP"}`,
                          },
                        ]
                      : [],
                  actions: [
                    {
                      label: ar ? "المساعدة والتواصل" : "Help & Contact",
                      run: () => navigate("help"),
                    },
                  ],
                })
              }
            >
              <Icon size={19} strokeWidth={1.5} className="text-amber-600" />
              <span>{ar ? a : e}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ==============================================================
          3. SHOP BY CATEGORY (تسوق حسب الفئات - Dubai Phone Style)
         ============================================================== */}
      <section className="joe-container joe-section" data-reveal>
        <div className="joe-section-heading">
          <div>
            <span className="joe-eyebrow">
              {ar ? "اكتشف الأقسام" : "BROWSE CATEGORIES"}
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900">
              {ar ? "تسوق حسب الفئات" : "Shop by Category"}
            </h2>
          </div>
          <button onClick={() => shop()} className="joe-text-link">
            {ar ? "كل الأقسام" : "All categories"}
            <Arrow size={17} />
          </button>
        </div>

        {/* Dubai Phone Style Round Category Cards */}
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-7 gap-3 sm:gap-4 md:gap-5">
          {dubaiCategories.map(({ key, ar: title, en, image }) => {
            const count = products.filter((p) => p.category === key).length;
            return (
              <button
                key={key}
                type="button"
                onClick={() => shop(key)}
                className="joe-category-circle group focus:outline-none"
              >
                <div className="joe-category-circle-img">
                  <img
                    src={image}
                    alt={ar ? title : en}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/product-placeholder.svg";
                    }}
                    className="w-full h-full object-contain p-2.5 group-hover:scale-110 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                <strong className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-amber-700 transition-colors line-clamp-1">
                  {ar ? title : en}
                </strong>
                <span className="text-[11px] text-slate-500 font-outfit">
                  {count} {ar ? "منتج" : "items"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ==============================================================
          4. SHOP BY BRAND (تسوق حسب الماركة مع أنيميشن متحرك مستمر)
         ============================================================== */}
      {allBrands.length > 0 && (
        <section className="joe-container joe-section" data-reveal>
          <div className="joe-section-heading">
            <div>
              <span className="joe-eyebrow">
                {ar ? "العلامات التجارية المعتمدة" : "OFFICIAL PARTNERS"}
              </span>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900">
                {ar ? "تسوق حسب العلامة التجارية" : "Shop by Brand"}
              </h2>
            </div>
            <button onClick={() => navigate("brands")} className="joe-text-link">
              {ar ? "كل الماركات" : "All brands"}
              <Arrow size={17} />
            </button>
          </div>

          {/* Continuous Infinite Gliding Marquee */}
          <div className="joe-marquee-container" dir="ltr">
            <div className="joe-marquee-track">
              {[...allBrands, ...allBrands].map((brand, idx) => (
                <button
                  key={`${brand}-${idx}`}
                  type="button"
                  onClick={() =>
                    navigate("catalog", undefined, {
                      category: "all",
                      brand,
                      search: "",
                    })
                  }
                  className="joe-brand-pill"
                  title={
                    ar
                      ? `عرض جميع منتجات ماركة ${brand}`
                      : `View all ${brand} products`
                  }
                >
                  <Award className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span>{brand}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ==============================================================
          5. FLASH DEALS & OFFERS (عروض وتخفيضات حصرية - 2 منتجات بالموبايل)
         ============================================================== */}
      {offers.length > 0 && (
        <section className="joe-container joe-section" data-reveal>
          <div className="joe-section-heading">
            <div>
              <span className="joe-eyebrow flex items-center gap-1.5 text-rose-600 font-bold">
                <Flame className="w-4 h-4 text-rose-600 fill-rose-600 animate-pulse" />
                <span>{ar ? "عروض لفترة محدودة" : "LIMITED TIME DEALS"}</span>
              </span>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900">
                {ar ? "أقوى عروض وتخفيضات جو ستور" : "Top Store Offers & Deals"}
              </h2>
            </div>
            <button
              onClick={() =>
                navigate("deals", undefined, { category: "all", search: "" })
              }
              className="joe-text-link text-rose-600 font-bold hover:underline"
            >
              {ar ? "جميع العروض" : "All deals"}
              <Arrow size={17} />
            </button>
          </div>

          {/* Guaranteed 2 products per row on mobile (grid-cols-2) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6">
            {offers.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* ==============================================================
          6. THE JOE SELECTION (الأكثر طلباً ومبيعاً - 2 منتجات بالموبايل)
         ============================================================== */}
      <section className="joe-container joe-section" data-reveal>
        <div className="joe-section-heading">
          <div>
            <span className="joe-eyebrow">
              {personalized
                ? ar
                  ? "على ذوقك"
                  : "JUST FOR YOU"
                : ar
                  ? "من تشكيلة جو ستور"
                  : "THE JOE SELECTION"}
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900">
              {ar ? "اختيارات تستاهل تبص عليها" : "Worth a closer look"}
            </h2>
          </div>
          <button
            className="joe-text-link"
            onClick={() => shop(activeCollection)}
          >
            {ar ? "تسوق الكل" : "Shop all"}
            <Arrow size={17} />
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div
          className="joe-collection-tabs"
          role="group"
          aria-label={ar ? "تصفية اختيارات المتجر" : "Filter store picks"}
        >
          {[
            { key: "all", a: "اختياراتنا", e: "Our picks" },
            { key: "audio", a: "صوتيات", e: "Audio" },
            { key: "chargers_cables", a: "شحن وتوصيل", e: "Charging" },
            { key: "smartwatches", a: "ساعات", e: "Watches" },
            { key: "powerbanks", a: "باور بانك", e: "Power banks" },
          ].map(({ key, a, e }) => (
            <button
              key={key}
              aria-pressed={activeCollection === key}
              onClick={() => setActiveCollection(key as CategoryKey)}
            >
              {ar ? a : e}
            </button>
          ))}
        </div>

        {/* Guaranteed 2 products per row on mobile (grid-cols-2) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        {!featured.length && (
          <p className="joe-empty-note">
            {ar ? "بنجهّز لك التشكيلة…" : "Getting the collection ready…"}
          </p>
        )}
      </section>

      {/* ==============================================================
          7. SMARTPHONES COLLECTION (قسم الموبايلات - 2 منتجات بالموبايل)
         ============================================================== */}
      {phones.length > 0 && (
        <section className="joe-container joe-section" data-reveal>
          <div className="joe-section-heading">
            <div>
              <span className="joe-eyebrow">
                {ar ? "جاهز للتغيير؟" : "READY FOR AN UPGRADE?"}
              </span>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900">
                {ar ? "أحدث الموبايلات والهواتف الذكية" : "Latest Smartphones"}
              </h2>
            </div>
            <button
              className="joe-text-link"
              onClick={() => shop("smartphones")}
            >
              {ar ? "كل الموبايلات" : "All phones"}
              <Arrow size={17} />
            </button>
          </div>

          {/* Guaranteed 2 products per row on mobile (grid-cols-2) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6">
            {phones.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* ==============================================================
          8. ASSISTANT & BUNDLES (مساعد الشراء وتجميع الباقات)
         ============================================================== */}
      <section
        className="joe-container joe-section joe-discovery-grid"
        data-reveal
      >
        <SpotlightCard className="joe-discovery-card joe-discovery-a">
          <div>
            <span className="joe-eyebrow">
              {ar ? "اختيار أسهل" : "FIND YOUR FIT"}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold">
              {ar ? (
                <>
                  مش عارف تبدأ
                  <br />
                  منين؟
                </>
              ) : (
                <>
                  Not sure
                  <br />
                  where to start?
                </>
              )}
            </h2>
            <p>
              {ar
                ? "نوع المنتج وميزانيتك… ونقرّب لك الاختيارات."
                : "Tell us your category and budget. We’ll narrow it down."}
            </p>
            <button
              onClick={() => navigate("finder")}
              className="joe-button joe-button-dark"
            >
              {ar ? "جرّب مساعد الشراء" : "Try the buying assistant"}
              <Arrow size={17} />
            </button>
          </div>
          <SlidersHorizontal
            className="joe-discovery-graphic"
            strokeWidth={0.7}
            aria-hidden="true"
          />
        </SpotlightCard>
        <SpotlightCard className="joe-discovery-card joe-discovery-b">
          <div>
            <span className="joe-eyebrow">
              {ar ? "كل حاجة بتكمل التانية" : "BETTER TOGETHER"}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold">
              {ar ? (
                <>
                  موبايلك.
                  <br />
                  على ذوقك.
                </>
              ) : (
                <>
                  Your phone.
                  <br />
                  Your way.
                </>
              )}
            </h2>
            <p>
              {ar
                ? "اختار القطع اللي تناسبك وجمّعها في سلة واحدة."
                : "Put your everyday essentials together in one basket."}
            </p>
            <button
              onClick={() => navigate("bundles")}
              className="joe-text-link"
            >
              {ar ? "جمّع باقتك" : "Build your set"}
              <DiagonalArrow size={19} />
            </button>
          </div>
          <Layers3
            className="joe-discovery-graphic"
            strokeWidth={0.7}
            aria-hidden="true"
          />
        </SpotlightCard>
      </section>

      {/* ==============================================================
          9. VISIT US IN STORE (نوّرنا في المحل - المنصورة)
         ============================================================== */}
      <section className="joe-container joe-section" data-reveal>
        <div className="joe-visit">
          <div className="joe-visit-mark" aria-hidden="true">
            <MapPin size={65} strokeWidth={1} />
            <span dir="ltr">
              MANSOURA,
              <br />
              EGYPT.
            </span>
          </div>
          <div>
            <span className="joe-eyebrow">
              {ar ? "قريبين منك" : "COME SAY HELLO"}
            </span>
            <h2>
              {ar
                ? "منوّرنا أونلاين. نوّرنا في المحل."
                : "Great online. Even better in person."}
            </h2>
            <p>{ar ? settings.store_address_ar : settings.store_address_en}</p>
            <p className="joe-visit-hours">
              {ar ? settings.working_hours_ar : settings.working_hours_en}
            </p>
          </div>
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="joe-button joe-button-dark"
          >
            <MessageCircle size={18} />
            {ar ? "كلّمنا على واتساب" : "Chat on WhatsApp"}
          </a>
        </div>
      </section>

      {/* ==============================================================
          10. RECENTLY VIEWED & DISCOVERY LINKS
         ============================================================== */}
      <div className="joe-container joe-last-links">
        <button
          onClick={() =>
            navigate("recent", undefined, { category: "all", search: "" })
          }
        >
          <History size={17} />
          {ar ? "ارجع للي شوفته مؤخرًا" : "Your recently viewed products"}
          <Arrow size={16} />
        </button>
        <button onClick={() => navigate("brands")}>
          {ar ? "استكشف كل الماركات" : "Explore all brands"}
          <Arrow size={16} />
        </button>
      </div>
    </div>
  );
};
