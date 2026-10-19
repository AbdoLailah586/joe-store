import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  ShoppingBag,
  Heart,
  Menu,
  X,
  MapPin,
  Languages,
  LayoutDashboard,
  ArrowUpLeft,
  Grid2X2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { AccountMenu } from "./AccountMenu";
import { JoeStoreLogo } from "./JoeStoreLogo";
import { CategoryKey } from "../types";
import { priceLabel } from "../utils/amazonEnricher";

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
    products,
    trackActivity,
  } = useStore();
  const { t, language, toggleLanguage, formatPrice } = useLanguage();
  const { canAccessAdmin: isAdmin } = useAuth();
  const ar = language === "ar";
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const menu = useRef<HTMLDialogElement>(null);
  const categories: { key: CategoryKey; ar: string; en: string }[] = [
    { key: "audio", ar: "سماعات وصوتيات", en: "Audio & earbuds" },
    { key: "smartwatches", ar: "ساعات ذكية", en: "Smartwatches" },
    { key: "chargers_cables", ar: "شواحن وكابلات", en: "Chargers & cables" },
    { key: "powerbanks", ar: "باور بانك", en: "Power banks" },
    { key: "cases_protection", ar: "كفرات وحماية", en: "Cases & protection" },
    { key: "smartphones", ar: "موبايلات", en: "Phones" },
    { key: "accessories", ar: "إكسسوارات", en: "Accessories" },
  ];
  const browse = (category: CategoryKey = "all") => {
    navigate("catalog", undefined, { category, search: "" });
    setMenuOpen(false);
    setSearchFocused(false);
  };
  const search = () => {
    if (searchQuery.trim())
      trackActivity("search", undefined, {
        query: searchQuery.trim(),
        category: "all",
      });
    setSearchFocused(false);
    navigate("catalog", undefined, { category: "all", search: searchQuery });
  };
  const results = searchQuery.trim()
    ? products
        .filter((p) => {
          const text =
            `${p.name_ar} ${p.name_en} ${p.brand} ${p.storage || ""}`.toLowerCase();
          return (
            p.is_active !== false &&
            text.includes(searchQuery.trim().toLowerCase())
          );
        })
        .slice(0, 5)
    : [];

  useEffect(() => {
    const measure = () => {
      if (headerRef.current)
        document.documentElement.style.setProperty(
          "--store-header-height",
          `${headerRef.current.getBoundingClientRect().height}px`,
        );
    };
    measure();
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;
    if (headerRef.current) observer?.observe(headerRef.current);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!searchRef.current?.contains(e.target as Node))
        setSearchFocused(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  useEffect(() => {
    if (menuOpen) menu.current?.showModal();
    else menu.current?.close();
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  return (
    <>
      <header
        ref={headerRef}
        data-testid="store-header"
        className="joe-navbar sticky top-0 z-40"
      >
        <div className="joe-utility">
          <div className="joe-container">
            <span>
              <MapPin size={13} />
              {ar
                ? "جو ستور · المنصورة، شارع الإمام محمد عبده"
                : "JOE Store · Mansoura, Imam Mohamed Abdo St."}
            </span>
            <div>
              <button onClick={() => navigate("track-order")}>
                {t("trackOrder")}
              </button>
              <button
                onClick={toggleLanguage}
                aria-label={ar ? "Switch to English" : "التحويل للعربية"}
              >
                <Languages size={13} />
                {ar ? "English" : "العربية"}
              </button>
              {isAdmin && (
                <button onClick={() => navigate("admin")}>
                  <LayoutDashboard size={13} />
                  <span>{ar ? "الإدارة" : "Admin"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="joe-container joe-header-main">
          <button
            className="joe-mobile-menu joe-header-icon"
            onClick={() => setMenuOpen(true)}
            aria-label={ar ? "فتح القائمة" : "Open menu"}
            aria-expanded={menuOpen}
          >
            <Menu size={22} />
          </button>
          <button
            onClick={() => navigate("home")}
            className="joe-header-logo"
            aria-label={ar ? "العودة للرئيسية" : "Back to home"}
          >
            <JoeStoreLogo showSubtitle={false} size="md" />
          </button>
          <div ref={searchRef} className="joe-header-search">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                search();
              }}
              role="search"
            >
              <Search size={19} aria-hidden="true" />
              <input
                aria-label={ar ? "ابحث في المنتجات" : "Search products"}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setSearchFocused(false);
                }}
                placeholder={
                  ar ? "إيه اللي بتدوّر عليه؟" : "What are you looking for?"
                }
              />
              <button
                type="submit"
                aria-label={ar ? "بحث في المنتجات" : "Search products"}
              >
                {ar ? "بحث" : "Search"}
              </button>
            </form>
            {searchFocused && results.length > 0 && (
              <div className="joe-search-results">
                <p>{ar ? "نتائج سريعة" : "Quick results"}</p>
                {results.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      navigate("product", p.id);
                      setSearchFocused(false);
                    }}
                  >
                    <img
                      src={p.images[0] || "/product-placeholder.svg"}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/product-placeholder.svg";
                      }}
                    />
                    <span>
                      <strong>{ar ? p.name_ar : p.name_en}</strong>
                      <small>{priceLabel(p, language, formatPrice)}</small>
                    </span>
                  </button>
                ))}
                <button className="joe-search-all" onClick={search}>
                  {ar ? "عرض كل النتائج" : "See all results"}
                  {ar ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>
              </div>
            )}
          </div>
          <div className="joe-header-controls">
            <AccountMenu />
            <button
              className="joe-header-icon joe-wishlist-button"
              aria-label={t("wishlist")}
              onClick={() =>
                navigate("wishlist", undefined, { category: "all", search: "" })
              }
            >
              <Heart size={21} />
              {wishlist.length > 0 && (
                <span className="joe-count">{wishlist.length}</span>
              )}
            </button>
            <button
              className="joe-cart-button"
              onClick={() => setIsCartOpen(true)}
              aria-label={`${t("cart")} (${cartCount})`}
            >
              <span className="relative">
                <ShoppingBag size={21} />
                {cartCount > 0 && (
                  <span className="joe-count">{cartCount}</span>
                )}
              </span>
              <span className="joe-cart-label">
                <small>{t("cart")}</small>
                <strong>{formatPrice(cartSubtotal)}</strong>
              </span>
            </button>
          </div>
        </div>
        <nav
          className="joe-header-nav"
          aria-label={ar ? "أقسام المتجر" : "Store navigation"}
        >
          <div className="joe-container">
            <button
              className="joe-nav-all"
              aria-current={
                currentTab === "catalog" && selectedCategory === "all"
                  ? "page"
                  : undefined
              }
              onClick={() => browse()}
            >
              <Grid2X2 size={16} />
              {ar ? "كل المنتجات" : "All products"}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.key}
                aria-current={
                  currentTab === "catalog" && selectedCategory === cat.key
                    ? "page"
                    : undefined
                }
                onClick={() => browse(cat.key)}
              >
                {ar ? cat.ar : cat.en}
              </button>
            ))}
            <button
              className="joe-nav-offers"
              onClick={() =>
                navigate("deals", undefined, { category: "all", search: "" })
              }
            >
              <span className="joe-status-dot" />
              {ar ? "العروض" : "Offers"}
              <ArrowUpLeft size={15} />
            </button>
          </div>
        </nav>
      </header>
      <dialog
        ref={menu}
        aria-label={ar ? "قائمة المتجر" : "Store menu"}
        className="joe-menu-dialog"
        onCancel={() => setMenuOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setMenuOpen(false);
        }}
      >
        <div className="joe-menu-panel">
          <div className="joe-menu-top">
            <JoeStoreLogo size="sm" showSubtitle={false} />
            <button
              onClick={() => setMenuOpen(false)}
              className="joe-header-icon"
              aria-label={ar ? "إغلاق القائمة" : "Close menu"}
            >
              <X size={21} />
            </button>
          </div>
          <h2>{ar ? "كل اللي محتاجه" : "Your everyday essentials"}</h2>
          <button
            onClick={() => {
              navigate("home");
              setMenuOpen(false);
            }}
          >
            {ar ? "الرئيسية" : "Home"}
          </button>
          <button onClick={() => browse()}>
            {ar ? "كل المنتجات" : "All products"}
          </button>
          {categories.map((cat) => (
            <button key={cat.key} onClick={() => browse(cat.key)}>
              {ar ? cat.ar : cat.en}
              <ArrowUpLeft size={17} />
            </button>
          ))}
          <div className="joe-menu-extra">
            {(
              [
                ["brands", "الماركات", "Brands"],
                ["finder", "مساعد الشراء", "Buying assistant"],
                ["bundles", "جمّع باقتك", "Build your set"],
                ["track-order", "تتبع طلبك", "Track your order"],
                ["help", "المساعدة", "Help"],
              ] as const
            ).map(([tab, a, en]) => (
              <button
                key={tab}
                onClick={() => {
                  navigate(tab);
                  setMenuOpen(false);
                }}
              >
                {ar ? a : en}
              </button>
            ))}
            {isAdmin && (
              <button
                onClick={() => {
                  navigate("admin");
                  setMenuOpen(false);
                }}
              >
                {ar ? "لوحة الإدارة" : "Administration"}
              </button>
            )}
          </div>
          <button
            onClick={() => {
              toggleLanguage();
              setMenuOpen(false);
            }}
          >
            <Languages size={17} />
            {ar ? "English" : "العربية"}
          </button>
        </div>
      </dialog>
    </>
  );
};
