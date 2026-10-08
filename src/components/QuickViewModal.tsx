import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, MessageCircle, Heart, ShieldCheck, BatteryMedium, Star, Check } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { generateWhatsAppWebLink } from '../utils/whatsappService';
import { canPurchaseProduct, productNotice, priceLabel } from '../utils/amazonEnricher';

export const QuickViewModal: React.FC = () => {
  const { 
    quickViewProduct, 
    setQuickViewProduct, 
    addToCart, 
    isInWishlist, 
    toggleWishlist,
    navigate,
    settings 
  } = useStore();

  const { t, language, formatPrice } = useLanguage();

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedStorage, setSelectedStorage] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [addedAnimation, setAddedAnimation] = useState(false);
  useEffect(() => {
    setSelectedImage(0);
    setSelectedStorage(quickViewProduct?.available_storages?.[0] || quickViewProduct?.storage || '');
    setSelectedColor(quickViewProduct?.available_colors?.[0]?.name_ar || quickViewProduct?.color_ar || '');
    setQuantity(1);
    setAddedAnimation(false);
  }, [quickViewProduct?.id]);

  if (!quickViewProduct || quickViewProduct.is_active === false) return null;
  const product = quickViewProduct;
  const isLiked = isInWishlist(product.id);
  const canPurchase = canPurchaseProduct(product);
  const notice = productNotice(product, language);

  const handleAddToCart = () => {
    if (!canPurchase || quantity > product.stock) return;
    addToCart(product, quantity, selectedStorage, selectedColor);
    setAddedAnimation(true);
    setTimeout(() => {
      setAddedAnimation(false);
      setQuickViewProduct(null);
    }, 600);
  };

  const inquiryText = `مرحباً متجر جو ستور، أود الاستفسار عن تفاصيل: *${product.name_ar}* (المساحة: ${selectedStorage || 'الافتراضية'} - اللون: ${selectedColor || 'الافتراضي'})`;
  const whatsappUrl = generateWhatsAppWebLink(settings.store_whatsapp, inquiryText);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl bg-[#0F1626] border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col md:flex-row max-h-[90vh]"
      >
        {/* Close Button */}
        <button
          onClick={() => setQuickViewProduct(null)}
          className="absolute top-4 left-4 z-10 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Product Images Side */}
        <div className="md:w-1/2 p-6 bg-slate-900/60 flex flex-col items-center justify-between border-b md:border-b-0 md:border-l border-white/10">
          <div className="w-full aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-white/10 mb-4 relative">
            <img
              src={product.images[selectedImage] || product.images[0] || '/product-placeholder.svg'}
              onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/product-placeholder.svg'; }}
              alt={product.name_ar}
              className="w-full h-full object-cover object-center"
            />
            {product.battery_health > 0 && (
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 backdrop-blur-md">
                <BatteryMedium className="w-4 h-4 text-emerald-400" />
                <span>{language === 'ar' ? `صحة البطارية: ${product.battery_health}%` : `Battery: ${product.battery_health}%`}</span>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto w-full justify-center">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${
                    selectedImage === i ? 'border-amber-400 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info Side */}
        <div className="md:w-1/2 p-6 overflow-y-auto space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-bold text-amber-400 uppercase tracking-wider font-outfit">{product.brand}</span>
              {product.reviews_count > 0 && product.rating > 0 && <div className="flex items-center gap-1 text-amber-400">
                <Star className="w-4 h-4 fill-amber-400" />
                <span className="font-bold text-xs text-white">{product.rating}</span>
                <span className="text-[11px] text-slate-500 font-outfit">
                  ({product.reviews_count} {language === 'ar' ? 'تقييم' : 'reviews'})
                </span>
              </div>}
            </div>

            <h2 className="text-lg font-bold text-white font-cairo leading-snug">
              {language === 'ar' ? product.name_ar : product.name_en}
            </h2>
            {notice && <p className="mt-2 p-2 rounded-lg border border-amber-500/40 bg-amber-500/10 text-[11px] leading-relaxed text-amber-300 font-semibold">{notice}</p>}

            {/* Price Row */}
            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-2xl font-black text-amber-400 font-outfit">
                {priceLabel(product, language, formatPrice)}
              </span>
              {product.original_price > product.price && product.price > 0 && (
                <span className="text-sm text-slate-500 line-through font-outfit">
                  {formatPrice(product.original_price)}
                </span>
              )}
              {product.discount_percentage > 0 && (
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold font-outfit">
                  {language === 'ar' ? `وفر ${product.discount_percentage}%` : `Save ${product.discount_percentage}%`}
                </span>
              )}
            </div>
          </div>

          {/* Condition and Warranty */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5">
              <span className="text-slate-400 block text-[10px]">{language === 'ar' ? 'حالة الجهاز' : 'Condition'}</span>
              <strong className="text-white mt-0.5 block font-bold">
                {product.condition === 'mint' 
                  ? (language === 'ar' ? 'كسر زيرو ممتاز' : 'Mint Like-New') 
                  : product.condition === 'brand_new' 
                  ? (language === 'ar' ? 'جديد متبرشم' : 'Brand New Sealed') 
                  : product.condition === 'used_good' ? (language === 'ar' ? 'استعمال خفيف' : 'Light Use') : (language === 'ar' ? 'تحتاج تأكيد' : 'Confirm condition')}
              </strong>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5">
              <span className="text-slate-400 block text-[10px]">{language === 'ar' ? 'الضمان المعتمد' : 'Certified Warranty'}</span>
              <strong className="text-emerald-400 mt-0.5 block font-bold">
                {product.warranty_months > 0 ? `${product.warranty_months} ${language === 'ar' ? 'شهور جو ستور' : 'Mo JOE Store'}` : (language === 'ar' ? 'اسأل عن الضمان' : 'Ask about warranty')}
              </strong>
            </div>
          </div>

          {/* Storages Selection */}
          {product.available_storages && product.available_storages.length > 0 && (
            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1.5">{t('storage')}</label>
              <div className="flex flex-wrap gap-2">
                {product.available_storages.map(st => (
                  <button
                    key={st}
                    onClick={() => setSelectedStorage(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold font-outfit transition-all border ${
                      selectedStorage === st 
                        ? 'bg-amber-500 text-black border-amber-400 shadow-glow-gold' 
                        : 'bg-slate-900 text-slate-300 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color Selection */}
          {product.available_colors && product.available_colors.length > 0 && (
            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1.5">
                {t('color')}: <span className="text-amber-300 font-bold">{selectedColor}</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {product.available_colors.map((c, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedColor(c.name_ar)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      selectedColor === c.name_ar
                        ? 'border-amber-400 bg-amber-500/10 text-white'
                        : 'border-white/10 bg-slate-900 text-slate-400'
                    }`}
                  >
                    <span 
                      style={{ backgroundColor: c.hex }} 
                      className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                    />
                    <span>{language === 'ar' ? c.name_ar : c.name_en}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Description snippet */}
          <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
            {language === 'ar' ? product.description_ar : product.description_en}
          </p>

          {/* Action CTAs */}
          <div className="pt-3 border-t border-white/10 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={handleAddToCart}
                disabled={addedAnimation || !canPurchase}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-glow-gold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {addedAnimation ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{language === 'ar' ? 'تمت الإضافة بنجاح!' : 'Added Successfully!'}</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    <span>{canPurchase ? t('addToCart') : product.price <= 0 ? (language === 'ar' ? 'اسأل عن السعر' : 'Ask for price') : (language === 'ar' ? 'غير متوفر' : 'Out of stock')}</span>
                  </>
                )}
              </button>

              <button
                onClick={() => toggleWishlist(product.id)}
                className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-rose-400 border border-white/10 transition-colors"
                title={t('wishlist')}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>
            </div>

            <div className="flex gap-2">
              {/* WhatsApp direct Inquiry */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{t('whatsappInquiry')}</span>
              </a>

              {/* View Full Page */}
              <button
                onClick={() => {
                  setQuickViewProduct(null);
                  navigate('product', product.id);
                }}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 font-semibold"
              >
                {language === 'ar' ? 'الصفحة الكاملة ←' : 'Full Page →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
