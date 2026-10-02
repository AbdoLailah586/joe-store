import React, { useState } from 'react';
import { 
  ShieldCheck, 
  BatteryMedium, 
  Truck, 
  CheckCircle, 
  ShoppingCart, 
  MessageCircle, 
  Heart, 
  Share2, 
  Star, 
  ArrowLeft, 
  ArrowRight,
  Sparkles,
  ChevronRight,
  Check,
  Zap,
  Info
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { ProductCard } from '../components/ProductCard';
import { generateWhatsAppWebLink } from '../utils/whatsappService';

export const ProductDetails: React.FC = () => {
  const { 
    selectedProductId, 
    products, 
    addToCart, 
    isInWishlist, 
    toggleWishlist, 
    navigate,
    settings 
  } = useStore();

  const { t, language, formatPrice, isRTL } = useLanguage();

  const product = products.find(p => p.id === selectedProductId) || (products.length > 0 ? products[0] : null);

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedStorage, setSelectedStorage] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'specs' | 'inspection' | 'reviews'>('specs');
  const [addedToast, setAddedToast] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  // Sync state and document title whenever product changes
  React.useEffect(() => {
    if (product) {
      setSelectedImage(0);
      setSelectedStorage(product.available_storages?.[0] || product.storage || '');
      setSelectedColor(product.available_colors?.[0]?.name_ar || product.color_ar || '');
      document.title = `${language === 'ar' ? product.name_ar : product.name_en} | متجر جو ستور`;
    }
  }, [product?.id, language]);

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center animate-pulse">
          <Sparkles className="w-8 h-8 text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-white font-cairo">
          {products.length === 0 ? 'جاري تحميل تفاصيل المنتج المباشرة...' : 'عفواً، هذا المنتج غير متوفر حالياً أو تم حذفه'}
        </h2>
        {products.length > 0 && (
          <button
            onClick={() => navigate('catalog')}
            className="px-6 py-2.5 rounded-xl bg-amber-500 text-black font-bold font-cairo hover:bg-amber-400 transition-colors shadow-glow-gold"
          >
            تصفح جميع المنتجات المتاحة في المتجر
          </button>
        )}
      </div>
    );
  }

  const isLiked = isInWishlist(product.id);

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedStorage, selectedColor);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2000);
  };

  const handleBuyNow = () => {
    addToCart(product, quantity, selectedStorage, selectedColor);
    navigate('checkout');
  };

  const handleShareProduct = async () => {
    const shareUrl = window.location.href;
    const shareTitle = `${product.name_ar} | متجر جو ستور`;
    const shareText = `شاهد تفاصيل وسعر ${product.name_ar} في متجر جو ستور:`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (_) {}
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2500);
    } catch (_) {
      window.prompt('انسخ رابط المنتج المباشر:', shareUrl);
    }
  };

  // Direct WhatsApp inquiry URL
  const inquiryText = `مرحباً متجر جو ستور، أود الاستفسار عن توفر: *${product.name_ar}* (المساحة: ${selectedStorage || 'الافتراضية'} - اللون: ${selectedColor || 'الافتراضي'})`;
  const whatsappUrl = generateWhatsAppWebLink(settings.store_whatsapp, inquiryText);

  // Similar Products in the same category
  const similarProducts = products
    .filter(p => p.id !== product.id && p.category === product.category)
    .slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-12">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-cairo">
        <button onClick={() => navigate('home')} className="hover:text-amber-400">{t('home')}</button>
        <span>/</span>
        <button onClick={() => navigate('catalog')} className="hover:text-amber-400">{t('catalog')}</button>
        <span>/</span>
        <span className="text-slate-200 truncate max-w-xs">{language === 'ar' ? product.name_ar : product.name_en}</span>
      </nav>

      {/* Main Product Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Image Gallery (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="aspect-square rounded-3xl overflow-hidden bg-slate-900 border border-white/10 relative group">
            <img
              src={product.images[selectedImage] || product.images[0]}
              alt={product.name_ar}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            />
            {product.battery_health && (
              <div className="absolute top-4 right-4 px-3 py-1.5 rounded-xl bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 backdrop-blur-md shadow-lg">
                <BatteryMedium className="w-4 h-4 text-emerald-400" />
                <span>{language === 'ar' ? `صحة البطارية: ${product.battery_health}%` : `Battery Health: ${product.battery_health}%`}</span>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-20 h-20 rounded-2xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                    selectedImage === idx ? 'border-amber-400 scale-105 shadow-glow-gold' : 'border-white/10 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Product Details & Purchase Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Header & Title */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-bold uppercase tracking-wider font-outfit border border-amber-500/20">
                {product.brand}
              </span>
              <div className="flex items-center gap-1 text-amber-400">
                <Star className="w-4 h-4 fill-amber-400" />
                <span className="font-bold text-sm text-white font-outfit">{product.rating}</span>
                <span className="text-xs text-slate-500 font-outfit">
                  ({product.reviews_count} {language === 'ar' ? 'تقييم موثق' : 'verified reviews'})
                </span>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white font-cairo leading-snug">
              {language === 'ar' ? product.name_ar : product.name_en}
            </h1>

            {product.sku && (
              <p className="text-[11px] text-slate-500 font-outfit mt-1">
                {language === 'ar' ? 'كود المنتج: ' : 'SKU: '}{product.sku}
              </p>
            )}
          </div>

          {/* Price Box */}
          <div className="p-4 rounded-2xl bg-[#0F1626] border border-amber-500/30 flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-black text-amber-400 font-outfit">
                  {formatPrice(product.price)}
                </span>
                {product.original_price && (
                  <span className="text-sm text-slate-500 line-through font-outfit">
                    {formatPrice(product.original_price)}
                  </span>
                )}
                {product.discount_percentage && (
                  <span className="px-2 py-0.5 rounded bg-rose-500 text-white font-bold text-xs font-outfit">
                    {language === 'ar' ? `خصم ${product.discount_percentage}%` : `Discount ${product.discount_percentage}%`}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-emerald-400 font-cairo mt-1">
                {language === 'ar' ? '✓ السعر شامل الضريبة وضمان جو ستور الرسمي' : '✓ Price includes tax & official JOE Store warranty'}
              </p>
            </div>

            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30 font-cairo">
              {t('inStock')} {language === 'ar' ? 'بالمحل' : 'In Store'}
            </span>
          </div>

          {/* Condition and Battery Inspection Card */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 flex items-center gap-1.5 font-cairo">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{language === 'ar' ? 'حالة الجهاز والضمان:' : 'Device Condition & Warranty:'}</span>
              </span>
              <strong className="text-amber-400 font-cairo">
                {product.condition === 'mint' 
                  ? (language === 'ar' ? 'كسر زيرو ممتاز (بحالة الجديد)' : 'Mint Like-New (Pristine)') 
                  : product.condition === 'brand_new' 
                  ? (language === 'ar' ? 'جديد متبرشم أصلي' : 'Brand New Sealed') 
                  : (language === 'ar' ? 'استعمال خفيف ممتاز' : 'Light Use')}
              </strong>
            </div>

            {product.battery_health && (
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="text-slate-400 flex items-center gap-1.5 font-cairo">
                  <BatteryMedium className="w-4 h-4 text-emerald-400" />
                  <span>{language === 'ar' ? 'نسبة صحة البطارية الأصلية:' : 'Original Battery Health:'}</span>
                </span>
                <span className="text-emerald-400 font-black font-outfit text-sm">
                  {product.battery_health}% {language === 'ar' ? '(مفحوصة معملياً)' : '(Lab Tested)'}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <span className="text-slate-400 font-cairo">{language === 'ar' ? 'مدة الضمان المعتمد:' : 'Certified Warranty:'}</span>
              <span className="text-white font-bold font-cairo">
                {product.warranty_months} {language === 'ar' ? 'شهور استبدال وصيانة من متجر جو ستور' : 'Months Replacement & Maintenance by JOE Store'}
              </span>
            </div>
          </div>

          {/* Storages Selection */}
          {product.available_storages && product.available_storages.length > 0 && (
            <div>
              <label className="block text-xs text-slate-300 font-bold mb-2 font-cairo">
                {language === 'ar' ? 'مساحة التخزين المتاحة:' : 'Available Storage:'}
              </label>
              <div className="flex flex-wrap gap-2.5">
                {product.available_storages.map(st => (
                  <button
                    key={st}
                    onClick={() => setSelectedStorage(st)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold font-outfit transition-all border ${
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

          {/* Colors Selection */}
          {product.available_colors && product.available_colors.length > 0 && (
            <div>
              <label className="block text-xs text-slate-300 font-bold mb-2 font-cairo">
                {language === 'ar' ? 'الألوان المتوفرة: ' : 'Available Colors: '}<span className="text-amber-400">{selectedColor}</span>
              </label>
              <div className="flex flex-wrap gap-2.5">
                {product.available_colors.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedColor(c.name_ar)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      selectedColor === c.name_ar
                        ? 'border-amber-400 bg-amber-500/15 text-white'
                        : 'border-white/10 bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span
                      style={{ backgroundColor: c.hex }}
                      className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                    />
                    <span>{language === 'ar' ? c.name_ar : c.name_en}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Purchase Actions (Quantity + Add to Cart + Buy Now + WhatsApp) */}
          <div className="pt-4 border-t border-white/10 space-y-3">
            <div className="flex gap-3">
              {/* Quantity selector */}
              <div className="flex items-center bg-slate-900 border border-white/10 rounded-xl px-3 py-2">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="text-slate-400 hover:text-white px-1 font-bold text-base"
                >
                  -
                </button>
                <span className="px-3 font-outfit font-bold text-white text-sm">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="text-slate-400 hover:text-white px-1 font-bold text-base"
                >
                  +
                </button>
              </div>

              {/* Add to Cart */}
              <button
                onClick={handleAddToCart}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-glow-gold transition-all active:scale-95"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>{t('addToCart')}</span>
              </button>

              {/* Wishlist */}
              <button
                onClick={() => toggleWishlist(product.id)}
                title={language === 'ar' ? 'إضافة إلى المفضلة' : 'Add to wishlist'}
                className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-rose-400 border border-white/10 transition-colors"
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>

              {/* Share Direct Product Link */}
              <button
                onClick={handleShareProduct}
                title={language === 'ar' ? 'مشاركة رابط المنتج' : 'Share product link'}
                className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-white/10 transition-all active:scale-95 flex items-center justify-center"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            {/* Direct Buy Now & WhatsApp Direct Order */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={handleBuyNow}
                className="w-full py-3 rounded-xl bg-white hover:bg-slate-100 text-black font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <Zap className="w-4 h-4 text-amber-500" />
                <span>{language === 'ar' ? 'شراء فوري وإتمام الطلب (Buy Now)' : 'Fast Buy Now & Checkout'}</span>
              </button>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{language === 'ar' ? 'احجز عبر واتساب فوراً' : 'Inquire & Order via WhatsApp'}</span>
              </a>
            </div>

            {addedToast && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{language === 'ar' ? 'تمت إضافة المنتج إلى عربة التسوق بنجاح!' : 'Product added to cart successfully!'}</span>
              </div>
            )}

            {shareToast && (
              <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                <CheckCircle className="w-4 h-4 text-amber-400" />
                <span>{language === 'ar' ? 'تم نسخ رابط المنتج المباشر بنجاح! 📋 يمكنك مشاركته الآن' : 'Product direct link copied! 📋 Ready to share'}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Section: Specifications, Inspection Report, Reviews */}
      <div className="border-t border-white/10 pt-8 space-y-6">
        <div className="flex gap-4 border-b border-white/10 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('specs')}
            className={`pb-2 text-sm font-bold font-cairo transition-all border-b-2 flex-shrink-0 ${
              activeTab === 'specs' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {language === 'ar' ? 'المواصفات التقنية' : 'Technical Specifications'}
          </button>
          <button
            onClick={() => setActiveTab('inspection')}
            className={`pb-2 text-sm font-bold font-cairo transition-all border-b-2 flex-shrink-0 ${
              activeTab === 'inspection' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {language === 'ar' ? 'تقرير الفحص المعتمد والضمان' : 'Certified Inspection & Warranty'}
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-2 text-sm font-bold font-cairo transition-all border-b-2 flex-shrink-0 ${
              activeTab === 'reviews' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {language === 'ar' ? `آراء وتقييمات المشترين (${product.reviews_count})` : `Customer Reviews (${product.reviews_count})`}
          </button>
        </div>

        {/* Tab 1: Specs */}
        {activeTab === 'specs' && (
          <div className="rounded-2xl bg-[#0F1626] border border-white/10 p-6 space-y-4">
            <h3 className="font-bold text-sm text-white font-cairo">
              {language === 'ar' ? 'تفاصيل المواصفات:' : 'Detailed Specifications:'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {Object.entries(product.specs).map(([key, val]) => (
                <div key={key} className="flex justify-between p-3 rounded-xl bg-slate-900 border border-white/5">
                  <span className="text-slate-400 font-semibold">{key}</span>
                  <span className="text-white font-bold">{val}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed pt-2">
              {language === 'ar' ? product.description_ar : product.description_en}
            </p>
          </div>
        )}

        {/* Tab 2: Certified Inspection */}
        {activeTab === 'inspection' && (
          <div className="rounded-2xl bg-[#0F1626] border border-white/10 p-6 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-white font-cairo flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>{language === 'ar' ? 'معايير فحص أجهزة كسر زيرو في جو ستور:' : 'JOE Store Pristine Device Inspection Checklist:'}</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-900 border border-white/5 flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white block font-bold">
                    {language === 'ar' ? 'فحص الشاشة وتقنية True Tone' : 'Screen & True Tone Calibration'}
                  </strong>
                  <span className="text-slate-400 text-[11px]">
                    {language === 'ar' ? 'شاشة أصلية 100% بدون بقع أو خطوط مع تفعيل الحساسات كاملة.' : '100% genuine screen with zero pixel flaws and active True Tone.'}
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-white/5 flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white block font-bold">
                    {language === 'ar' ? 'بصمة الوجه Face ID وبصمة اليد Touch ID' : 'Biometrics: Face ID & Touch ID'}
                  </strong>
                  <span className="text-slate-400 text-[11px]">
                    {language === 'ar' ? 'استجابة فورية بدون أي أخطاء ومفحوصة بأجهزة التشخيص.' : 'Instant response, fully verified with certified diagnostic tools.'}
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-white/5 flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white block font-bold">
                    {language === 'ar' ? 'البطارية الأصلية ودورات الشحن' : 'Original Battery & Charge Cycles'}
                  </strong>
                  <span className="text-slate-400 text-[11px]">
                    {language === 'ar' ? 'نسبة البطارية أصلية مصنعية بدون أي تعديل برمجي أو استبدال رديء.' : 'Factory-certified original capacity without software alteration or aftermarket cells.'}
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-white/5 flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white block font-bold">
                    {language === 'ar' ? 'الكاميرات والميكروفونات والسماعات' : 'Cameras, Microphones & Speakers'}
                  </strong>
                  <span className="text-slate-400 text-[11px]">
                    {language === 'ar' ? 'عزل صوتي تام ووضوح سينمائي فائق في التصوير والمكالمات.' : 'Total acoustic isolation and razor-sharp 4K cinematic clarity.'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Reviews */}
        {activeTab === 'reviews' && (
          <div className="rounded-2xl bg-[#0F1626] border border-white/10 p-6 space-y-4">
            <h3 className="font-bold text-sm text-white font-cairo">
              {language === 'ar' ? 'تقييمات وتجارب المشترين:' : 'Verified Buyer Experiences:'}
            </h3>
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-900 border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">
                    {language === 'ar' ? 'أحمد حسام (المنصورة)' : 'Ahmed Hossam (Mansoura)'}
                  </span>
                  <div className="flex text-amber-400"><Star className="w-3.5 h-3.5 fill-amber-400" /><Star className="w-3.5 h-3.5 fill-amber-400" /><Star className="w-3.5 h-3.5 fill-amber-400" /><Star className="w-3.5 h-3.5 fill-amber-400" /><Star className="w-3.5 h-3.5 fill-amber-400" /></div>
                </div>
                <p className="text-xs text-slate-300">
                  {language === 'ar' 
                    ? 'استلمت آيفون 13 كسر زيرو البطارية فعلاً 94% والجهاز زيرو مفيش فيه خدش واحد، ومعاينة الجهاز مع المندوب طمنتني جداً، شكراً جو ستور!'
                    : 'Received iPhone 13 in mint condition with 94% battery health, completely scratch-free. Physical courier inspection gave total peace of mind. Thank you JOE Store!'}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">
                    {language === 'ar' ? 'محمود عبد العزيز (القاهرة)' : 'Mahmoud Abdelaziz (Cairo)'}
                  </span>
                  <div className="flex text-amber-400"><Star className="w-3.5 h-3.5 fill-amber-400" /><Star className="w-3.5 h-3.5 fill-amber-400" /><Star className="w-3.5 h-3.5 fill-amber-400" /><Star className="w-3.5 h-3.5 fill-amber-400" /><Star className="w-3.5 h-3.5 fill-amber-400" /></div>
                </div>
                <p className="text-xs text-slate-300">
                  {language === 'ar'
                    ? 'إيربودز برو وشاحن أنكر الأصلي وصلوني في خلال 24 ساعة، ورسالة الواتساب بالتتبع كانت ممتازة جداً.'
                    : 'AirPods Pro and original Anker charger arrived within 24 hours. The automated WhatsApp tracking was exceptional.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Similar Products */}
      {similarProducts.length > 0 && (
        <div className="space-y-4 pt-6">
          <h2 className="text-lg font-black text-white font-cairo">
            {language === 'ar' ? 'منتجات ذات صلة' : 'Related Products'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {similarProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
