import React from 'react';
import { 
  Heart, 
  Eye, 
  ShoppingCart, 
  BatteryMedium, 
  ShieldCheck, 
  MessageCircle, 
  Check, 
  Star,
  Sparkles
} from 'lucide-react';
import { Product } from '../types';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { generateWhatsAppWebLink } from '../utils/whatsappService';
import { canPurchaseProduct, productNotice, priceLabel } from '../utils/amazonEnricher';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { 
    addToCart, 
    isInWishlist, 
    toggleWishlist, 
    setQuickViewProduct, 
    navigate,
    settings 
  } = useStore();

  const { t, language, formatPrice } = useLanguage();

  const isLiked = isInWishlist(product.id);
  const canPurchase = canPurchaseProduct(product);
  const notice = productNotice(product, language);
  const displayedPrice = priceLabel(product, language, formatPrice);
  if (product.is_active === false) return null;

  // Condition Badge styling
  const conditionConfig = {
    brand_new: { text: t('brandNew'), bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    mint: { text: t('mint'), bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    used_good: { text: t('usedGood'), bg: 'bg-blue-500/20 text-blue-300 border-blue-500/30' }
    ,unknown: { text: language === 'ar' ? 'الحالة تحتاج تأكيد' : 'Confirm condition', bg: 'bg-slate-700 text-slate-300' }
  }[product.condition] || { text: product.condition, bg: 'bg-slate-700 text-slate-300' };

  // Direct WhatsApp inquiry message
  const inquiryText = `مرحباً متجر جو ستور، أود الاستفسار عن توفر: *${product.name_ar}* (السعر: ${displayedPrice})`;
  const whatsappUrl = generateWhatsAppWebLink(settings.store_whatsapp, inquiryText);

  return (
    <div className="group relative bg-white dark:bg-[#0F1626] border border-slate-200 dark:border-white/10 hover:border-amber-500/40 rounded-2xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-glow-gold hover:-translate-y-1 flex flex-col justify-between">
      {/* Top Media & Badges Container */}
      <div className="relative aspect-square overflow-hidden bg-slate-900/80 cursor-pointer" onClick={() => navigate('product', product.id)}>
        <img
          src={product.images[0] || '/product-placeholder.svg'}
          onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/product-placeholder.svg'; }}
          alt={product.name_ar}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Gradient Overlay for badges */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F1626]/80 via-transparent to-black/40 pointer-events-none" />

        {/* Top Badges (Condition + Battery + Discount) */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
          <div className="flex flex-col gap-1 items-start">
            {/* Condition Badge */}
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border backdrop-blur-md ${conditionConfig.bg}`}>
              {conditionConfig.text}
            </span>

            {/* Battery Health Badge (Highlighted feature from user's video) */}
            {product.battery_health > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 backdrop-blur-md shadow-sm">
                <BatteryMedium className="w-3 h-3 text-emerald-400" />
                <span>بطارية {product.battery_health}%</span>
              </span>
            )}
          </div>

          {/* Discount Tag */}
          {product.discount_percentage > 0 && (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-md font-outfit">
              -{product.discount_percentage}%
            </span>
          )}
        </div>

        {/* Floating Action Buttons (Wishlist & Quick View) */}
        <div className="absolute bottom-2.5 right-2.5 flex flex-col gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Wishlist Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(product.id);
            }}
            className="p-2 rounded-xl bg-slate-900/90 text-white hover:text-rose-400 hover:bg-slate-800 border border-white/10 shadow-lg backdrop-blur-sm transition-all"
            title={t('wishlist')}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>

          {/* Quick View Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setQuickViewProduct(product);
            }}
            className="p-2 rounded-xl bg-slate-900/90 text-white hover:text-amber-400 hover:bg-slate-800 border border-white/10 shadow-lg backdrop-blur-sm transition-all"
            title={t('quickView')}
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>

        {/* Storage pill if available */}
        {product.storage && (
          <div className="absolute bottom-2.5 left-2.5 pointer-events-none">
            <span className="px-2 py-0.5 rounded bg-black/70 text-slate-200 text-[10px] font-bold font-outfit border border-white/10 backdrop-blur-sm">
              {product.storage}
            </span>
          </div>
        )}
      </div>

      {/* Card Content & Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Brand & Rating */}
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-amber-400/80 font-outfit">
              {product.brand}
            </span>
            {product.reviews_count > 0 && product.rating > 0 && <div className="flex items-center gap-1 text-amber-500 dark:text-amber-400">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-bold text-xs text-slate-800 dark:text-white font-outfit">{product.rating}</span>
              <span className="text-[10px] text-slate-400">({product.reviews_count})</span>
            </div>}
          </div>

          {/* Title */}
          <h3 
            onClick={() => navigate('product', product.id)}
            className="text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-amber-500 dark:hover:text-amber-400 transition-colors line-clamp-2 cursor-pointer leading-snug"
          >
            {language === 'ar' ? product.name_ar : product.name_en}
          </h3>
          {notice && <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[10px] leading-relaxed font-semibold text-amber-700 dark:text-amber-300">{notice}</p>}

          {/* Color preview dots */}
          {product.available_colors && product.available_colors.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] text-slate-400">{t('color')}:</span>
              <div className="flex items-center gap-1">
                {product.available_colors.slice(0, 4).map((c, i) => (
                  <span
                    key={i}
                    style={{ backgroundColor: c.hex }}
                    className="w-3 h-3 rounded-full border border-white/30 shadow-sm"
                    title={language === 'ar' ? c.name_ar : c.name_en}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Warranty tag */}
          {product.warranty_months > 0 && <div className="flex items-center gap-1 text-[11px] text-emerald-500 dark:text-emerald-400/90 mt-2 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            <span>ضمان {product.warranty_months} {t('months')} من جو ستور</span>
          </div>}
        </div>

        {/* Pricing & Actions */}
        <div className="pt-3 mt-3 border-t border-slate-100 dark:border-white/5">
          <div className="flex items-baseline justify-between gap-2 mb-3">
            <div>
              <span className="text-lg font-black text-amber-500 dark:text-amber-400 font-outfit">
                {displayedPrice}
              </span>
              {product.original_price > product.price && product.price > 0 && (
                <span className="block text-xs text-slate-500 line-through font-outfit">
                  {formatPrice(product.original_price)}
                </span>
              )}
            </div>

            {/* In stock badge */}
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {product.stock > 0 && product.in_stock !== false ? t('inStock') : (language === 'ar' ? 'غير متوفر' : 'Out of stock')}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-5 gap-1.5">
            {/* Add to Cart Button (Takes 4 cols) */}
            <button
              onClick={() => { if (canPurchase) addToCart(product, 1); }}
              disabled={!canPurchase}
              className="col-span-4 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all group/btn disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
              <span>{t('addToCart')}</span>
            </button>

            {/* Direct WhatsApp Chat Button (Takes 1 col) */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="col-span-1 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 flex items-center justify-center transition-all hover:scale-105"
              title="استفسر أو احجز عبر واتساب فوراً"
            >
              <MessageCircle className="w-4 h-4 fill-emerald-400" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
