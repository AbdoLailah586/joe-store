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
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import { useLanguage } from "../context/LanguageContext";
import { ProductCard } from "../components/ProductCard";
import { CategoryKey, Product } from "../types";
import { neonDb } from "../services/neonDb";
import { SpotlightCard } from "../components/motion/SpotlightCard";
import { AnimateStorefront } from "../components/motion/AnimateStorefront";
import { generateWhatsAppWebLink } from "../utils/whatsappService";

const categoryCards = [
  {
    key: "audio",
    ar: "صوت على مزاجك",
    en: "Find your sound",
    sub: "سماعات وصوتيات",
    subEn: "Earbuds & headphones",
    icon: Headphones,
    color: "peach",
  },
  {
    key: "smartwatches",
    ar: "وقتك أذكى",
    en: "A smarter day",
    sub: "ساعات ذكية",
    subEn: "Smartwatches",
    icon: Watch,
    color: "sage",
  },
  {
    key: "chargers_cables",
    ar: "خليك متوصل",
    en: "Stay connected",
    sub: "شواحن وكابلات",
    subEn: "Chargers & cables",
    icon: Cable,
    color: "lilac",
  },
  {
    key: "powerbanks",
    ar: "طاقة تكمل يومك",
    en: "Power your day",
    sub: "باور بانك",
    subEn: "Power banks",
    icon: BatteryCharging,
    color: "butter",
  },
  {
    key: "cases_protection",
    ar: "ستايل وحماية",
    en: "Style & protection",
    sub: "كفرات وإسكرينات",
    subEn: "Cases & screen protectors",
    icon: ShieldCheck,
    color: "blue",
  },
  {
    key: "accessories",
    ar: "جهّز فكرتك",
    en: "Make it happen",
    sub: "تصوير وإكسسوارات",
    subEn: "Camera gear & accessories",
    icon: Camera,
    color: "rose",
  },
] as const;

export const Home: React.FC = () => {
  const { products: allProducts, navigate, settings, sessionId } = useStore();
  const { language, isRTL, t } = useLanguage();
  const ar = language === "ar";
  const root = useRef<HTMLDivElement>(null);
  const products = useMemo(
    () => allProducts.filter((p) => p.is_active !== false),
    [allProducts],
  );
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [personalized, setPersonalized] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [activeCollection, setActiveCollection] = useState<CategoryKey>("all");
  const slides = settings.hero_slides || [];
  const campaign = slides[slideIndex % Math.max(slides.length, 1)];
  const Arrow = isRTL ? ArrowLeft : ArrowRight;
  const DiagonalArrow = isRTL ? ArrowUpLeft : ArrowUpRight;
  const shop = (category: CategoryKey = "all") =>
    navigate("catalog", undefined, { category, search: "" });

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
      return base.slice(0, 4);
    const picks: Product[] = [];
    for (const category of [
      "audio",
      "chargers_cables",
      "powerbanks",
      "smartwatches",
    ]) {
      const item = base.find((p) => p.category === category);
      if (item) picks.push(item);
    }
    return [
      ...picks,
      ...base.filter((p) => !picks.some((item) => item.id === p.id)),
    ].slice(0, 4);
  }, [products, recommendations, activeCollection]);
  const offers = products
    .filter((p) => p.is_flash_sale || p.discount_percentage > 0)
    .slice(0, 4);
  const phones = products
    .filter((p) => p.category === "smartphones")
    .slice(0, 4);
  const brands = Array.from(
    new Set(products.map((p) => p.brand?.trim()).filter(Boolean)),
  )
    .filter((b) => !/unknown|unbranded|غير|متنوع/i.test(b))
    .slice(0, 7);
  const whatsapp = generateWhatsAppWebLink(
    settings.store_whatsapp,
    ar
      ? "مرحباً جو ستور، محتاج مساعدة في اختيار المنتج المناسب."
      : "Hello JOE Store, can you help me choose a product?",
  );

  return (
    <div ref={root} className="joe-home">
      <AnimateStorefront
        root={root}
        motionKey={`${language}-${products.length}`}
      />
      <section
        className="joe-hero joe-container"
        aria-label={ar ? "اكتشف جو ستور" : "Discover JOE Store"}
      >
        <div className="joe-hero-copy">
          <span className="joe-eyebrow">
            <span className="joe-status-dot" />
            {ar ? "من المحل… لحد عندك" : "Your local tech store, online"}
          </span>
          <h1 key={language} data-split-title>
            {ar ? (
              <>
                تفاصيل صغيرة.
                <br />
                <span>تغيّر يومك كله.</span>
              </>
            ) : (
              <>
                Little things.
                <br />
                <span>A whole new day.</span>
              </>
            )}
          </h1>
          <p>
            {ar
              ? "سماعتك، ساعتك، وشاحن ما يسيبكش. كل اللي يكمّل موبايلك وحياتك، هتلاقيه في جو ستور."
              : "Your sound, your style, your everyday power. Discover the tech and accessories that make life a little better."}
          </p>
          <div className="joe-hero-actions">
            <button
              onClick={() => shop()}
              className="joe-button joe-button-primary"
            >
              {ar ? "اكتشف التشكيلة" : "Explore the collection"}
              <Arrow size={18} />
            </button>
            <button
              onClick={() =>
                navigate("deals", undefined, { category: "all", search: "" })
              }
              className="joe-text-link"
            >
              {ar ? "شوف العروض" : "Explore offers"}
              <DiagonalArrow size={18} />
            </button>
          </div>
          <div className="joe-hero-note">
            <MapPin size={16} />
            <span>{ar ? "جو ستور · المنصورة" : "JOE Store · Mansoura"}</span>
            <span className="joe-note-divider" />
            <span>
              {ar
                ? "اختار أونلاين، أو نوّرنا في المحل"
                : "Shop online or visit us in store"}
            </span>
          </div>
        </div>
        <div
          className="joe-hero-art"
          aria-label={
            ar ? "صور توضيحية لتشكيلة المتجر" : "Illustrative collection images"
          }
        >
          <div className="joe-art-orbit" aria-hidden="true" />
          <span className="joe-art-word" aria-hidden="true" dir="ltr">
            EVERYDAY
            <br />
            UPGRADED.
          </span>
          <button
            data-hero-piece
            onClick={() => shop("audio")}
            className="joe-showcase joe-showcase-main"
          >
            <span className="joe-showcase-top">
              <span>01 / SOUND</span>
              <DiagonalArrow size={20} />
            </span>
            <img
              src="/product-images/f6427a20c128ea77c56bc426.webp"
              alt={ar ? "تشكيلة السماعات" : "Headphone collection"}
              fetchPriority="high"
              width="430"
              height="430"
            />
            <span className="joe-showcase-bottom">
              <strong>{ar ? "اعزل الدوشة." : "Tune out the noise."}</strong>
              <span>{ar ? "وعيش في المزيكا" : "Get into your music"}</span>
            </span>
          </button>
          <button
            data-hero-piece
            onClick={() => shop("smartwatches")}
            className="joe-showcase joe-showcase-watch"
          >
            <span className="joe-mini-icon">
              <Watch size={17} />
            </span>
            <img
              src="/product-images/3f4452f62308aae22858b473.webp"
              alt={ar ? "تشكيلة الساعات الذكية" : "Smartwatch collection"}
              width="220"
              height="220"
            />
            <strong>{ar ? "على توقيتك." : "On your time."}</strong>
          </button>
          <div data-hero-piece className="joe-art-sticker" aria-hidden="true">
            <span>JOE</span>
            <span>
              GOOD TECH.
              <br />
              GOOD MOOD.
            </span>
            <span>✳</span>
          </div>
          <span className="joe-art-caption">
            {ar
              ? "صور توضيحية للأقسام · اختار منتجك من الكتالوج"
              : "Collection imagery · Explore individual products in the catalog"}
          </span>
        </div>
      </section>

      <div className="joe-service-strip">
        <div className="joe-container joe-service-items">
          {[
            {
              icon: PackageCheck,
              a: "تفاصيل واضحة لكل منتج",
              e: "Product details at a glance",
            },
            {
              icon: ShieldCheck,
              a: "ضمان حسب المنتج",
              e: "Product-specific warranty",
            },
            { icon: Truck, a: "توصيل لحد عندك", e: "Delivered to your door" },
            {
              icon: CreditCard,
              a: "كاش · فودافون كاش · إنستاباي",
              e: "Cash · Vodafone Cash · InstaPay",
            },
          ].map(({ icon: Icon, a, e }) => (
            <div key={e}>
              <Icon size={19} strokeWidth={1.5} />
              <span>{ar ? a : e}</span>
            </div>
          ))}
        </div>
      </div>

      <section className="joe-container joe-section" data-reveal>
        <div className="joe-section-heading">
          <div>
            <span className="joe-eyebrow">
              {ar ? "اختار عالمك" : "YOUR EVERYDAY ESSENTIALS"}
            </span>
            <h2>
              {ar ? "إنت محتاج إيه النهارده؟" : "What’s on your list today?"}
            </h2>
          </div>
          <button onClick={() => shop()} className="joe-text-link">
            {ar ? "كل الأقسام" : "All categories"}
            <Arrow size={17} />
          </button>
        </div>
        <div className="joe-categories">
          {categoryCards.map(
            ({ key, ar: title, en, sub, subEn, icon: Icon, color }, index) => (
              <SpotlightCard
                key={key}
                className={`joe-category joe-tone-${color}`}
              >
                <button onClick={() => shop(key)}>
                  <span className="joe-category-top">
                    <Icon size={29} strokeWidth={1.25} />
                    <span className="joe-category-number">0{index + 1}</span>
                  </span>
                  <strong>{ar ? title : en}</strong>
                  <span className="joe-category-sub">{ar ? sub : subEn}</span>
                  <span className="joe-category-footer">
                    <span>
                      {products.filter((p) => p.category === key).length}{" "}
                      {ar ? "منتج" : "products"}
                    </span>
                    <DiagonalArrow size={17} />
                  </span>
                </button>
              </SpotlightCard>
            ),
          )}
        </div>
      </section>

      {campaign && (
        <section
          className="joe-container joe-section joe-campaign-wrap"
          data-reveal
          aria-label={ar ? "عروض المحل" : "Store campaigns"}
        >
          <div className="joe-campaign">
            <div>
              <span className="joe-eyebrow">{campaign.badge}</span>
              <h2>{ar ? campaign.title_ar : campaign.title_en}</h2>
              <p>{ar ? campaign.subtitle_ar : campaign.subtitle_en}</p>
              <div className="joe-campaign-price">
                <strong>
                  {campaign.price} {ar ? "ج.م" : "EGP"}
                </strong>
                {campaign.oldPrice && (
                  <del>
                    {campaign.oldPrice} {ar ? "ج.م" : "EGP"}
                  </del>
                )}
              </div>
              <button
                className="joe-button joe-button-primary"
                onClick={() => shop(campaign.cat)}
              >
                {t("shopNow")}
                <Arrow size={17} />
              </button>
            </div>
            <img
              src={campaign.image}
              alt={ar ? campaign.title_ar : campaign.title_en}
              loading="lazy"
            />
            {slides.length > 1 && (
              <div className="joe-campaign-controls">
                <button
                  aria-label={ar ? "العرض السابق" : "Previous offer"}
                  onClick={() =>
                    setSlideIndex(
                      (i) => (i - 1 + slides.length) % slides.length,
                    )
                  }
                >
                  <ChevronRight size={18} />
                </button>
                <span>
                  {(slideIndex % slides.length) + 1} / {slides.length}
                </span>
                <button
                  aria-label={ar ? "العرض التالي" : "Next offer"}
                  onClick={() => setSlideIndex((i) => (i + 1) % slides.length)}
                >
                  <ChevronLeft size={18} />
                </button>
              </div>
            )}
          </div>
        </section>
      )}

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
            <h2>
              {ar ? "اختيارات تستاهل تبص عليها." : "Worth a closer look."}
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
        <div
          className="joe-collection-tabs"
          role="group"
          aria-label={ar ? "تصفية اختيارات المتجر" : "Filter store picks"}
        >
          {[
            { key: "all", a: "اختياراتنا", e: "Our picks" },
            { key: "audio", a: "صوتيات", e: "Audio" },
            { key: "smartwatches", a: "ساعات", e: "Watches" },
            { key: "chargers_cables", a: "شحن وتوصيل", e: "Charging" },
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
        <div className="joe-product-grid">
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

      <section
        className="joe-container joe-section joe-discovery-grid"
        data-reveal
      >
        <SpotlightCard className="joe-discovery-card joe-discovery-a">
          <div>
            <span className="joe-eyebrow">
              {ar ? "اختيار أسهل" : "FIND YOUR FIT"}
            </span>
            <h2>
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
            <h2>
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

      {offers.length > 0 && (
        <section className="joe-container joe-section" data-reveal>
          <div className="joe-section-heading">
            <div>
              <span className="joe-eyebrow">
                {ar ? "فرص من المتجر" : "A LITTLE EXTRA VALUE"}
              </span>
              <h2>
                {ar
                  ? "نفس اللي محتاجه. بسعر أحلى."
                  : "Your next find. A better price."}
              </h2>
            </div>
            <button
              onClick={() =>
                navigate("deals", undefined, { category: "all", search: "" })
              }
              className="joe-text-link"
            >
              {ar ? "كل العروض" : "All offers"}
              <Arrow size={17} />
            </button>
          </div>
          <div className="joe-product-grid">
            {offers.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
      {brands.length > 0 && (
        <section className="joe-brands joe-container" data-reveal>
          <span className="joe-eyebrow">
            {ar ? "ماركات في تشكيلتنا" : "BRANDS IN OUR COLLECTION"}
          </span>
          <div>
            {brands.map((brand) => (
              <button
                key={brand}
                onClick={() =>
                  navigate("catalog", undefined, {
                    category: "all",
                    search: brand,
                  })
                }
                className="font-outfit"
              >
                {brand}
              </button>
            ))}
          </div>
        </section>
      )}
      {phones.length > 0 && (
        <section className="joe-container joe-section" data-reveal>
          <div className="joe-section-heading">
            <div>
              <span className="joe-eyebrow">
                {ar ? "جاهز للتغيير؟" : "READY FOR AN UPGRADE?"}
              </span>
              <h2>{ar ? "موبايلك الجاي هنا." : "Meet your next phone."}</h2>
            </div>
            <button
              className="joe-text-link"
              onClick={() => shop("smartphones")}
            >
              {ar ? "كل الموبايلات" : "All phones"}
              <Arrow size={17} />
            </button>
          </div>
          <div className="joe-product-grid">
            {phones.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
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
