import React from "react";
import {
  Heart,
  Eye,
  ShoppingBag,
  BatteryMedium,
  ShieldCheck,
  MessageCircle,
  Star,
  ArrowUpLeft,
  ArrowUpRight,
} from "lucide-react";
import { Product } from "../types";
import { useStore } from "../context/StoreContext";
import { useLanguage } from "../context/LanguageContext";
import { generateWhatsAppWebLink } from "../utils/whatsappService";
import {
  canPurchaseProduct,
  productNotice,
  priceLabel,
} from "../utils/amazonEnricher";

export const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const {
    addToCart,
    isInWishlist,
    toggleWishlist,
    setQuickViewProduct,
    navigate,
    settings,
  } = useStore();
  const { t, language, formatPrice, isRTL } = useLanguage();
  if (product.is_active === false) return null;
  const ar = language === "ar";
  const name = (ar ? product.name_ar : product.name_en) || product.name_ar;
  const liked = isInWishlist(product.id);
  const purchasable = canPurchaseProduct(product);
  const notice = productNotice(product, language);
  const displayedPrice = priceLabel(product, language, formatPrice);
  const stock = product.stock > 0 && product.in_stock !== false;
  const condition = {
    brand_new: t("brandNew"),
    mint: t("mint"),
    used_good: t("usedGood"),
    unknown: ar ? "الحالة تحتاج تأكيد" : "Confirm condition",
  }[product.condition];
  const whatsapp = generateWhatsAppWebLink(
    settings.store_whatsapp,
    `مرحباً جو ستور، أود الاستفسار عن: ${product.name_ar} (السعر: ${displayedPrice})`,
  );
  const Arrow = isRTL ? ArrowUpLeft : ArrowUpRight;
  return (
    <article className="joe-product-card">
      <div className="joe-product-media">
        <button
          className="joe-product-image"
          onClick={() => navigate("product", product.id)}
          aria-label={ar ? `عرض ${name}` : `View ${name}`}
        >
          <img
            src={product.images[0] || "/product-placeholder.svg"}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/product-placeholder.svg";
            }}
            alt={name}
            loading="lazy"
            width="400"
            height="400"
          />
        </button>
        <div className="joe-product-badges">
          {product.discount_percentage > 0 ? (
            <span className="joe-discount">
              −{product.discount_percentage}%
            </span>
          ) : (
            condition && <span>{condition}</span>
          )}
          {product.battery_health > 0 && product.battery_health < 100 && (
            <span>
              <BatteryMedium size={12} />
              {product.battery_health}%
            </span>
          )}
        </div>
        <button
          className={`joe-product-like ${liked ? "is-liked" : ""}`}
          aria-label={`${t("wishlist")}: ${name}`}
          aria-pressed={liked}
          onClick={() => toggleWishlist(product.id)}
        >
          <Heart size={18} fill={liked ? "currentColor" : "none"} />
        </button>
        <button
          className="joe-quick-view"
          onClick={() => setQuickViewProduct(product)}
          aria-label={`${t("quickView")}: ${name}`}
        >
          <Eye size={15} />
          <span>{t("quickView")}</span>
        </button>
        {product.storage && (
          <span className="joe-product-storage">{product.storage}</span>
        )}
      </div>
      <div className="joe-product-content">
        <div className="joe-product-meta">
          <span>{product.brand || "JOE Store"}</span>
          {product.reviews_count > 0 && product.rating > 0 && (
            <span className="joe-product-rating">
              <Star size={12} fill="currentColor" />
              {product.rating}
              <small>({product.reviews_count})</small>
            </span>
          )}
        </div>
        <h3>
          <button onClick={() => navigate("product", product.id)}>
            {name}
          </button>
        </h3>
        {product.available_colors?.length > 0 && (
          <div className="joe-product-colors" aria-label={t("color")}>
            {product.available_colors.slice(0, 4).map((color, i) => (
              <span
                key={i}
                style={{ backgroundColor: color.hex }}
                title={ar ? color.name_ar : color.name_en}
              />
            ))}
          </div>
        )}
        {notice && <p className="joe-product-notice">{notice}</p>}
        {product.warranty_months > 0 && (
          <span className="joe-product-warranty">
            <ShieldCheck size={13} />
            {ar
              ? `ضمان ${product.warranty_months} شهر`
              : `${product.warranty_months} month warranty`}
          </span>
        )}
        <div className="joe-product-purchase">
          <div className="joe-product-price">
            <strong>{displayedPrice}</strong>
            {product.original_price > product.price && product.price > 0 && (
              <del>{formatPrice(product.original_price)}</del>
            )}
          </div>
          <span className={`joe-product-stock ${stock ? "is-available" : ""}`}>
            {stock
              ? ar
                ? "متوفر"
                : "In stock"
              : ar
                ? "غير متوفر"
                : "Out of stock"}
          </span>
        </div>
        <div className="joe-product-actions">
          <button
            onClick={() => {
              if (purchasable) addToCart(product, 1);
            }}
            disabled={!purchasable}
          >
            <ShoppingBag size={15} />
            <span>{t("addToCart")}</span>
            <Arrow size={15} />
          </button>
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={
              ar
                ? `استفسر عن ${name} عبر واتساب`
                : `Ask about ${name} on WhatsApp`
            }
          >
            <MessageCircle size={18} />
          </a>
        </div>
      </div>
    </article>
  );
};
