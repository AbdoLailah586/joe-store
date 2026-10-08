import React, { useState, useRef, useEffect } from 'react';
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
  Sparkles, 
  Check, 
  Zap, 
  Info, 
  ExternalLink, 
  Lock, 
  RotateCcw, 
  Flame, 
  Maximize2, 
  X, 
  Clock, 
  Plus, 
  ThumbsUp, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  SlidersHorizontal,
  ChevronRight,
  Eye,
  Award
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { ProductCard } from '../components/ProductCard';
import { generateWhatsAppWebLink } from '../utils/whatsappService';
import { enrichProductData, canPurchaseProduct, productNotice, priceLabel, publicSpecs } from '../utils/amazonEnricher';
import { Product } from '../types';

export const ProductDetails: React.FC = () => {
  const { 
    selectedProductId, 
    products,
    isCatalogLoading,
    addToCart, 
    isInWishlist, 
    toggleWishlist, 
    navigate,
    settings 
  } = useStore();

  const { t, language, formatPrice, isRTL } = useLanguage();

  const rawProduct = products.find(p => p.id === selectedProductId && p.is_active !== false) || null;

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedStorage, setSelectedStorage] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [addedToast, setAddedToast] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Zoom magnifier states
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Frequently Bought Together Bundle Selection state
  const [bundleSelected, setBundleSelected] = useState<{ [id: string]: boolean }>({});
  const [bundleToast, setBundleToast] = useState(false);

  // Review Filter & Helpful counters
  const [reviewFilter, setReviewFilter] = useState<'all' | '5' | '4'>('all');
  const [helpfulCounts, setHelpfulCounts] = useState<{ [id: string]: number }>({});
  const [userVotedHelpful, setUserVotedHelpful] = useState<{ [id: string]: boolean }>({});

  // Review Submission Modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newReviewAuthor, setNewReviewAuthor] = useState('');
  const [newReviewCity, setNewReviewCity] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewTitle, setNewReviewTitle] = useState('');
  const [newReviewComment, setNewReviewComment] = useState('');
  const [reviewSubmittedToast, setReviewSubmittedToast] = useState(false);

  // Enrich product data using our intelligent engine
  const enriched = rawProduct ? enrichProductData(rawProduct, products) : null;
  const product = rawProduct;

  // Initialize bundle selection when product changes
  useEffect(() => {
    if (product && enriched) {
      setSelectedImage(0);
      setQuantity(1);
      setSelectedStorage(product.available_storages?.[0] || product.storage || '');
      setSelectedColor(product.available_colors?.[0]?.name_ar || product.color_ar || '');
      document.title = `${enriched.detailed_title_ar.slice(0, 60)} | متجر جو ستور`;

      // Select all bundle items by default
      const initialBundleMap: { [id: string]: boolean } = { [product.id]: true };
      enriched.bundle_accessories.forEach(acc => {
        initialBundleMap[acc.id] = true;
      });
      setBundleSelected(initialBundleMap);
    }
  }, [product?.id, language]);

  if (!product || !enriched) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center animate-pulse">
          <Sparkles className="w-8 h-8 text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-white font-cairo">
          {isCatalogLoading
            ? (language === 'ar' ? 'جاري تحميل بيانات المنتج…' : 'Loading product details…')
            : (language === 'ar' ? 'عفواً، هذا المنتج غير موجود أو غير متاح حالياً' : 'This product could not be found or is currently unavailable')}
        </h2>
        {!isCatalogLoading && (
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
  const canPurchase = canPurchaseProduct(product);
  const notice = productNotice(product, language);
  const displayedPrice = priceLabel(product, language, formatPrice);

  // Zoom handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomPos({ x, y });
  };

  const handleAddToCart = () => {
    if (!canPurchase || quantity < 1 || quantity > product.stock) return;
    addToCart(product, quantity, selectedStorage, selectedColor);
    setAddedToast(true);
    confetti({ particleCount: 35, spread: 60, origin: { y: 0.8 } });
    setTimeout(() => setAddedToast(false), 2500);
  };

  const handleBuyNow = () => {
    if (!canPurchase || quantity < 1 || quantity > product.stock) return;
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
  const inquiryText = `مرحباً متجر جو ستور، أود الاستفسار عن المنتج:\n*${product.name_ar}*\n- السعر: ${displayedPrice}\n- كود المنتج: ${product.sku || product.id}\n- اللون المختار: ${selectedColor || 'الافتراضي'}\n- الكمية: ${quantity}`;
  const whatsappUrl = generateWhatsAppWebLink(settings.store_whatsapp, inquiryText);

  // Bundle pricing calculation
  const selectedBundleItems: Product[] = [
    ...(bundleSelected[product.id] ? [product] : []),
    ...enriched.bundle_accessories.filter(item => bundleSelected[item.id])
  ];

  const bundleRawTotal = selectedBundleItems.reduce((sum, item) => sum + item.price, 0);
  const bundleDiscount = 0;
  const bundleFinalTotal = bundleRawTotal - bundleDiscount;

  const handleAddBundleToCart = () => {
    if (!selectedBundleItems.length || !selectedBundleItems.every(canPurchaseProduct)) return;
    selectedBundleItems.forEach(item => {
      addToCart(item, 1);
    });
    setBundleToast(true);
    confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
    setTimeout(() => setBundleToast(false), 3000);
  };

  // Review helpful voter
  const handleHelpfulVote = (reviewId: string, initialCount: number) => {
    if (userVotedHelpful[reviewId]) return;
    setUserVotedHelpful(prev => ({ ...prev, [reviewId]: true }));
    setHelpfulCounts(prev => ({
      ...prev,
      [reviewId]: (prev[reviewId] ?? initialCount) + 1
    }));
  };

  // Add customer review handler
  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewAuthor || !newReviewComment) return;

    const newRev = {
      id: `rev-user-${Date.now()}`,
      author: newReviewAuthor,
      location: newReviewCity || 'مصر',
      rating: newReviewRating,
      date: 'اليوم',
      title: newReviewTitle || 'تقييم ممتاز وتجربة رائعة',
      comment: newReviewComment,
      verified_purchase: false,
      helpful_count: 0
    };

    enriched.customer_reviews.unshift(newRev);
    setShowReviewModal(false);
    setReviewSubmittedToast(true);
    setNewReviewAuthor('');
    setNewReviewTitle('');
    setNewReviewComment('');
    setTimeout(() => setReviewSubmittedToast(false), 3000);
  };

  const filteredReviews = enriched.customer_reviews.filter(r => {
    if (reviewFilter === '5') return r.rating === 5;
    if (reviewFilter === '4') return r.rating === 4;
    return true;
  });

  return (
    <div className="w-full bg-[#080C14] text-slate-100 font-cairo">
      {/* 1. Amazon Top Breadcrumbs & Brand Store Strip */}
      <div className="bg-[#0B101B] border-b border-white/5 py-2.5 px-4 sm:px-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => navigate('home')} className="hover:text-amber-400 transition-colors">الرئيسية</button>
            <span className="text-slate-600">/</span>
            <button onClick={() => navigate('catalog')} className="hover:text-amber-400 transition-colors">الهواتف والإكسسوارات</button>
            <span className="text-slate-600">/</span>
            <span className="text-amber-400/90 font-semibold">{product.brand}</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-200 truncate max-w-xs">{product.name_ar}</span>
          </nav>

          {/* Jump Links & Store Banner */}
          <div className="flex items-center gap-4 text-[11px]">
            <a 
              href="#about-item" 
              className="text-slate-400 hover:text-amber-400 hidden md:inline transition-colors"
            >
              عن السلعة
            </a>
            <span className="text-slate-700 hidden md:inline">|</span>
            <a 
              href="#features-showcase" 
              className="text-slate-400 hover:text-amber-400 hidden md:inline transition-colors"
            >
              ميزات المنتج
            </a>
            <span className="text-slate-700 hidden md:inline">|</span>
            <a 
              href="#customer-reviews" 
              className="text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1"
            >
              <span>التقييمات ({product.reviews_count})</span>
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-12">
        {/* ==============================================================
            MAIN AMAZON 3-COLUMN PRODUCT VIEW (Gallery | Details | Buy Box)
           ============================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ------------------------------------------------------------
              COLUMN 1: Left Gallery (5 cols on lg)
             ------------------------------------------------------------ */}
          <div className="lg:col-span-5 flex flex-col md:flex-row gap-4 items-start sticky lg:top-24">
            {/* Vertical Thumbnails (Desktop) */}
            <div className="flex md:flex-col gap-2.5 overflow-x-auto md:overflow-y-auto max-h-[480px] scrollbar-none order-2 md:order-1 flex-shrink-0">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onMouseEnter={() => setSelectedImage(idx)}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden border-2 bg-slate-900 transition-all flex-shrink-0 relative ${
                    selectedImage === idx 
                      ? 'border-amber-400 shadow-glow-gold scale-105' 
                      : 'border-white/10 opacity-70 hover:opacity-100 hover:border-slate-500'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* Main Image with Zoom Magnifier */}
            <div className="flex-1 w-full order-1 md:order-2 space-y-3">
              <div 
                ref={imageContainerRef}
                onMouseEnter={() => setIsZooming(true)}
                onMouseLeave={() => setIsZooming(false)}
                onMouseMove={handleMouseMove}
                onClick={() => setLightboxOpen(true)}
                className="aspect-square w-full rounded-2xl overflow-hidden bg-slate-900 border border-white/10 relative cursor-crosshair group select-none shadow-xl"
              >
                <img
                  src={product.images[selectedImage] || product.images[0] || '/product-placeholder.svg'}
                  onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/product-placeholder.svg'; }}
                  alt={product.name_ar}
                  className={`w-full h-full object-contain p-4 transition-transform duration-200 ${
                    isZooming ? 'scale-125' : 'scale-100'
                  }`}
                  style={
                    isZooming
                      ? {
                          transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                        }
                      : undefined
                  }
                />

                {/* Badges on Main Image */}
                <div className="absolute top-3 right-3 flex flex-col gap-1.5 pointer-events-none">
                  {product.discount_percentage > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-rose-600/90 text-white font-extrabold text-[11px] backdrop-blur-md shadow-md">
                      خصم {product.discount_percentage}%
                    </span>
                  )}
                  {product.is_best_seller && (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-black font-extrabold text-[11px] shadow-md flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 fill-black" />
                      الأكثر مبيعاً
                    </span>
                  )}
                </div>

                {/* Expand Fullscreen Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxOpen(true);
                  }}
                  className="absolute bottom-3 left-3 p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition-all opacity-80 group-hover:opacity-100"
                  title="تكبير الصورة بالحجم الكامل"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>

                {/* Hover zoom hint */}
                <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-black/70 text-slate-300 text-[10px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                  حرك المؤشر للتكبير
                </div>
              </div>

              {/* Share and Wishlist below image */}
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <button
                  onClick={handleShareProduct}
                  className="flex items-center gap-1.5 hover:text-amber-400 transition-colors py-1 px-2 rounded-lg hover:bg-white/5"
                >
                  <Share2 className="w-4 h-4" />
                  <span>مشاركة رابط السلعة</span>
                </button>

                <button
                  onClick={() => toggleWishlist(product.id)}
                  className="flex items-center gap-1.5 hover:text-rose-400 transition-colors py-1 px-2 rounded-lg hover:bg-white/5"
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span>{isLiked ? 'في قائمة الرغبات' : 'إضافة للرغبات'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------
              COLUMN 2: Center Product Details (4.5 cols on lg)
             ------------------------------------------------------------ */}
          <div className="lg:col-span-4 space-y-5">
            {/* Brand Store Link */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-amber-400 hover:underline cursor-pointer flex items-center gap-1">
                  <span>{enriched.brand_store_name}</span>
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                </span>
              </div>

              {/* Amazon Detailed Title */}
              <h1 className="text-lg sm:text-xl font-black text-white font-cairo leading-snug">
                {language === 'ar' ? enriched.detailed_title_ar : enriched.detailed_title_en}
              </h1>
              {notice && <p role="note" className="mt-3 p-3 rounded-xl border border-amber-500/50 bg-amber-500/10 text-xs leading-relaxed text-amber-300 font-bold">{notice}</p>}
              {!!product.data_sources?.length && <div className="mt-2 text-[11px] text-slate-400 flex flex-wrap gap-2">
                <span>{language === 'ar' ? 'مصادر معلومات المنتج:' : 'Product sources:'}</span>
                {product.data_sources.filter(source => /^https?:\/\//.test(source.url)).map(source =>
                  <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="text-amber-400 underline">{source.title || source.url}</a>)}
              </div>}

              {/* ASIN / SKU */}
              <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 font-outfit">
                {enriched.asin && <span>ASIN: <strong className="text-slate-300">{enriched.asin}</strong></span>}
                <span>SKU: <strong className="text-slate-300">{product.sku || product.id}</strong></span>
              </div>
            </div>

            {/* Ratings & Social Proof Strip */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/5 text-xs">
              {/* Star Rating */}
              {product.reviews_count > 0 && product.rating > 0 && <a href="#customer-reviews" className="flex items-center gap-1 text-amber-400 hover:underline">
                <span className="font-extrabold font-outfit text-sm text-white">{product.rating}</span>
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`w-3.5 h-3.5 ${i < Math.floor(product.rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} 
                    />
                  ))}
                </div>
                <span className="text-slate-400 text-[11px] mr-1">({product.reviews_count} تقييم)</span>
              </a>}

              {/* Amazon's Choice Badge */}
              {product.is_featured && <span className="px-2 py-0.5 rounded bg-[#131921] border border-amber-500/40 text-[11px] font-bold text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>اختيار جو ستور</span>
              </span>}

              {/* Bought in Past Month */}
              {enriched.bought_past_month > 0 && <div className="w-full sm:w-auto flex items-center gap-1 text-[11px] text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                <Flame className="w-3 h-3 text-emerald-400" />
                <span>تم شراء أكثر من {enriched.bought_past_month.toLocaleString('ar-EG')} قطعة الشهر الماضي</span>
              </div>}
            </div>

            {/* Price Box */}
            <div className="p-4 rounded-2xl bg-[#0F1626] border border-white/10 space-y-2">
              <div className="flex items-baseline gap-3 flex-wrap">
                {product.discount_percentage > 0 && (
                  <span className="text-2xl font-black text-rose-500 font-outfit">
                    -{product.discount_percentage}%
                  </span>
                )}
                <span className="text-3xl font-black text-amber-400 font-outfit">
                  {displayedPrice}
                </span>
                {product.original_price > product.price && product.price > 0 && (
                  <span className="text-xs text-slate-500 line-through font-outfit">
                    سعر القائمة: {formatPrice(product.original_price)}
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-400">
                {language === 'ar' ? 'تأكد من الملحقات والضمان والتوافق مع المحل قبل الشراء.' : 'Confirm included items, warranty and compatibility with the store before buying.'}
              </p>

              {/* Installment teaser */}
              <div className="pt-2 border-t border-white/5 flex items-center gap-2 text-[11px] text-amber-300">
                <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span>{language === 'ar' ? 'اسأل المحل عن خيارات الدفع المتاحة.' : 'Ask the store about available payment options.'}</span>
              </div>
            </div>

            {/* Model Variants (if applicable) */}
            {product.model_variants && product.model_variants.length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  الطراز المختار: <strong className="text-amber-400">{product.model_name || 'النموذج القياسي'}</strong>
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.model_variants.map((v, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (v.id) navigate('product', v.id);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        v.id === product.id 
                          ? 'border-amber-400 bg-amber-500/15 text-white shadow-sm'
                          : 'border-white/10 bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>{v.name}</span>
                      {v.price && <span className="text-[10px] text-amber-400/90 mr-1.5 font-outfit">({formatPrice(v.price)})</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Colors Selection Swatches */}
            {product.available_colors && product.available_colors.length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  اللون: <strong className="text-amber-400">{selectedColor}</strong>
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.available_colors.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedColor(c.name_ar)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        selectedColor === c.name_ar
                          ? 'border-amber-400 bg-amber-500/15 text-white ring-1 ring-amber-400'
                          : 'border-white/10 bg-slate-900 text-slate-400 hover:text-white'
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

            {/* Storages Selection (for phones) */}
            {product.available_storages && product.available_storages.length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  سعة التخزين: <strong className="text-amber-400">{selectedStorage}</strong>
                </label>
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

            {/* Quick Specs Attribute Table */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <h3 className="text-xs font-bold text-slate-300">المواصفات الأساسية:</h3>
              <div className="rounded-xl border border-white/10 bg-slate-900/60 overflow-hidden divide-y divide-white/5 text-xs">
                {Object.entries(enriched.quick_specs).map(([key, val]) => (
                  <div key={key} className="grid grid-cols-12 px-3 py-2">
                    <span className="col-span-5 text-slate-400 font-medium">{key}</span>
                    <span className="col-span-7 text-white font-bold">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* About This Item (Amazon Bullet Points) */}
            <div id="about-item" className="pt-4 border-t border-white/10 space-y-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400" />
                <span>عن هذه السلعة:</span>
              </h3>
              <ul className="space-y-2 text-xs text-slate-300 leading-relaxed pr-2 list-none">
                {enriched.about_item.map((bullet, idx) => {
                  const parts = bullet.split(']:');
                  if (parts.length === 2) {
                    return (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold mt-0.5">•</span>
                        <div>
                          <strong className="text-amber-300 font-bold">{parts[0].replace('[', '')}:</strong>
                          <span className="text-slate-300 mr-1">{parts[1]}</span>
                        </div>
                      </li>
                    );
                  }
                  return (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold mt-0.5">•</span>
                      <span>{bullet}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* ------------------------------------------------------------
              COLUMN 3: Right Amazon Buy Box (2.5 cols on lg)
             ------------------------------------------------------------ */}
          <div className="lg:col-span-3 sticky lg:top-24">
            <div className="rounded-2xl bg-[#0F1626] border border-amber-500/30 p-5 space-y-4 shadow-xl relative">
              {/* Price inside Buy Box */}
              <div>
                <div className="text-2xl font-black text-amber-400 font-outfit">
                  {displayedPrice}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {language === 'ar' ? 'سعر البيع المسجل لدى المحل' : 'Store-listed selling price'}
                </p>
              </div>

              {/* Delivery info */}
              <div className="space-y-1.5 text-xs border-t border-white/10 pt-3">
                <div className="flex items-start gap-2 text-slate-200">
                  <Truck className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-400">{language === 'ar' ? 'التوصيل حسب المحافظة' : 'Delivery depends on your location'}</span>
                    <p className="text-[11px] text-slate-400">
                      {language === 'ar' ? 'التكلفة والموعد عند تأكيد الطلب' : 'Cost and timing are confirmed with your order'}
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pr-6">
                  <span>التوصيل إلى:</span>
                  <strong className="text-white">مصر (كافة المحافظات)</strong>
                </div>
              </div>

              {/* Stock status */}
              <div className="space-y-1">
                <div className="text-emerald-400 font-black text-sm flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  <span>{product.stock > 0 && product.in_stock !== false ? (language === 'ar' ? 'متوفر في المخزون' : 'In stock') : (language === 'ar' ? 'غير متوفر حالياً' : 'Out of stock')}</span>
                </div>
                {product.stock > 0 && product.stock <= 20 && (
                  <p className="text-[11px] text-amber-400 font-bold">
                    متبقي فقط {product.stock} قطع في المحل - اطلب قريباً!
                  </p>
                )}
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-300 font-bold">الكمية:</span>
                <div className="flex items-center bg-slate-900 border border-white/10 rounded-xl px-2 py-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={!canPurchase || quantity <= 1}
                    className="text-slate-400 hover:text-white px-2 font-bold text-sm"
                  >
                    -
                  </button>
                  <span className="px-2 font-outfit font-bold text-white text-sm">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    disabled={!canPurchase || quantity >= product.stock}
                    className="text-slate-400 hover:text-white px-2 font-bold text-sm"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                {/* Add to Cart (Amazon Amber) */}
                <button
                  onClick={handleAddToCart}
                  disabled={!canPurchase}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-glow-gold transition-all active:scale-95"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>أضف إلى عربة التسوق</span>
                </button>

                {/* Buy Now (Amazon Gold) */}
                <button
                  onClick={handleBuyNow}
                  disabled={!canPurchase}
                  className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
                >
                  <Zap className="w-4 h-4 fill-black" />
                  <span>شراء الآن (إتمام فوري)</span>
                </button>

                {/* WhatsApp Quick Order */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{language === 'ar' ? 'استفسر عبر واتساب' : 'Ask on WhatsApp'}</span>
                </a>
              </div>

              {/* Guarantees & Seller info */}
              <div className="text-[11px] text-slate-400 border-t border-white/10 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span>يُشحن من:</span>
                  <strong className="text-white">متجر جو ستور الرسمي</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>يباع بواسطة:</span>
                  <strong className="text-white">جو ستور (JOE Store)</strong>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{language === 'ar' ? 'تأكد من تفاصيل المنتج مع المحل' : 'Confirm product details with the store'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>{language === 'ar' ? 'تطبق سياسة الاستبدال والاسترجاع الخاصة بالمحل' : 'Store return and exchange policies apply'}</span>
                </div>
              </div>

              {/* Toast Alerts */}
              {addedToast && (
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                  <Check className="w-4 h-4" />
                  <span>تمت إضافة المنتج إلى عربة التسوق بنجاح!</span>
                </div>
              )}

              {shareToast && (
                <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                  <CheckCircle className="w-4 h-4 text-amber-400" />
                  <span>تم نسخ الرابط بنجاح! 📋 يمكنك مشاركته الآن</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ==============================================================
            2. FREQUENTLY BOUGHT TOGETHER (اشتريها معاً)
           ============================================================== */}
        {enriched.bundle_accessories.length > 0 && (
          <div className="p-6 rounded-2xl bg-[#0F1626] border border-white/10 space-y-6">
            <div>
              <h2 className="text-base sm:text-lg font-black text-white font-cairo flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" />
                <span>{language === 'ar' ? 'منتجات مقترحة مع هذه السلعة' : 'Suggested companion products'}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {language === 'ar' ? 'اقتراحات من الكتالوج؛ تحقق من التوافق قبل الشراء. الأسعار تجمع دون خصم إضافي.' : 'Catalog suggestions; confirm compatibility before buying. Prices are summed without an extra discount.'}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Product cards row */}
              <div className="lg:col-span-8 flex flex-wrap items-center gap-3">
                {/* Main Product */}
                <div className="w-28 sm:w-32 flex-shrink-0 text-center space-y-2">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl bg-slate-900 border border-white/10 p-2 flex items-center justify-center overflow-hidden">
                    <img src={product.images[0]} alt="" className="w-full h-full object-contain" />
                  </div>
                  <p className="text-[11px] font-bold text-white truncate px-1">{product.name_ar}</p>
                  <p className="text-xs font-black text-amber-400 font-outfit">{displayedPrice}</p>
                </div>

                {/* Plus sign */}
                {enriched.bundle_accessories.map((acc, idx) => (
                  <React.Fragment key={acc.id}>
                    <div className="w-6 h-6 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      +
                    </div>

                    <div className="w-28 sm:w-32 flex-shrink-0 text-center space-y-2">
                      <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl bg-slate-900 border border-white/10 p-2 flex items-center justify-center overflow-hidden">
                        <img src={acc.images[0]} alt="" className="w-full h-full object-contain" />
                      </div>
                      <p className="text-[11px] font-bold text-white truncate px-1">{acc.name_ar}</p>
                      <p className="text-xs font-black text-amber-400 font-outfit">{formatPrice(acc.price)}</p>
                    </div>
                  </React.Fragment>
                ))}
              </div>

              {/* Total & Action Box */}
              <div className="lg:col-span-4 p-4 rounded-xl bg-slate-900/80 border border-amber-500/20 space-y-3">
                {/* Checkboxes */}
                <div className="space-y-1.5 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={!!bundleSelected[product.id]}
                      onChange={(e) => setBundleSelected(prev => ({ ...prev, [product.id]: e.target.checked }))}
                      className="accent-amber-500 w-4 h-4 rounded"
                    />
                    <span className="truncate"><strong>هذه السلعة:</strong> {product.name_ar}</span>
                  </label>

                  {enriched.bundle_accessories.map(acc => (
                    <label key={acc.id} className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={!!bundleSelected[acc.id]}
                        onChange={(e) => setBundleSelected(prev => ({ ...prev, [acc.id]: e.target.checked }))}
                        className="accent-amber-500 w-4 h-4 rounded"
                      />
                      <span className="truncate">{acc.name_ar} (<strong>{formatPrice(acc.price)}</strong>)</span>
                    </label>
                  ))}
                </div>

                {/* Price display */}
                <div className="pt-2 border-t border-white/10">
                  <div className="text-xs text-slate-400">السعر الإجمالي للسلع المختارة:</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black text-amber-400 font-outfit">
                      {formatPrice(bundleFinalTotal)}
                    </span>
                    {bundleDiscount > 0 && (
                      <span className="text-xs text-slate-500 line-through font-outfit">
                        {formatPrice(bundleRawTotal)}
                      </span>
                    )}
                  </div>
                  {bundleDiscount > 0 && (
                    <span className="text-[11px] text-emerald-400 font-bold block mt-0.5">
                      ✓ وفرت {formatPrice(bundleDiscount)} مع خصم الباقة
                    </span>
                  )}
                </div>

                {/* Add Bundle Button */}
                <button
                  onClick={handleAddBundleToCart}
                  disabled={selectedBundleItems.length === 0 || !selectedBundleItems.every(canPurchaseProduct)}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-glow-gold active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة السلع المختارة إلى عربة التسوق</span>
                </button>

                {bundleToast && (
                  <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold text-center">
                    ✓ تمت إضافة الباقة كاملة إلى سلتك بنجاح!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==============================================================
            3. A+ ENHANCED BRAND CONTENT & VISUAL FEATURE SHOWCASE
           ============================================================== */}
        <div id="features-showcase" className="space-y-6 pt-4">
          <div className="border-b border-white/10 pb-3 flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider font-outfit">
                {language === 'ar' ? 'تفاصيل الكتالوج' : 'CATALOG DETAILS'}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white font-cairo">
                {language === 'ar' ? 'ميزات وتفاصيل المنتج' : 'Product features and details'}
              </h2>
            </div>
            <span className="px-3 py-1 rounded-full bg-slate-900 border border-white/10 text-xs text-slate-400">
              {product.catalog_status === 'estimated' ? (language === 'ar' ? 'محتوى تقديري يحتاج مراجعة' : 'Estimated content for review') : (language === 'ar' ? 'محتوى المنتج المسجل' : 'Saved product content')}
            </span>
          </div>

          {/* Feature Banners Grid & Visual Cards */}
          <div className="space-y-8">
            {enriched.feature_banners.map((feat, idx) => (
              <div 
                key={idx}
                className={`rounded-2xl bg-[#0F1626] border border-white/10 overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-center gap-6 p-6 sm:p-8 ${
                  idx % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}
              >
                {/* Text Content (6 cols) */}
                <div className={`space-y-3 ${idx % 2 === 1 ? 'lg:col-span-6 lg:order-2' : 'lg:col-span-6 lg:order-1'}`}>
                  {feat.tag && (
                    <span className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold font-cairo">
                      {feat.tag}
                    </span>
                  )}
                  <h3 className="text-lg sm:text-xl font-black text-white font-cairo leading-snug">
                    {feat.title}
                  </h3>
                  {feat.subtitle && (
                    <p className="text-xs font-semibold text-amber-400/80 font-outfit">
                      {feat.subtitle}
                    </p>
                  )}
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-1">
                    {feat.description}
                  </p>
                </div>

                {/* Image (6 cols) */}
                <div className={`aspect-video lg:aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 border border-white/10 relative group ${
                  idx % 2 === 1 ? 'lg:col-span-6 lg:order-1' : 'lg:col-span-6 lg:order-2'
                }`}>
                  <img
                    src={feat.image_url}
                    alt={feat.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ==============================================================
            4. PRODUCT COMPARISON TABLE (مقارنة المنتجات المشابهة)
           ============================================================== */}
        {enriched.comparison_items.length > 0 && (
          <div className="space-y-4 pt-6">
            <h2 className="text-lg sm:text-xl font-black text-white font-cairo flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-amber-400" />
              <span>مقارنة مع منتجات مشابهة من نفس الفئة</span>
            </h2>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0F1626]">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-white/10">
                    <th className="p-4 text-slate-400 font-bold min-w-[140px]">المواصفة / المنتج</th>
                    {/* Current Product */}
                    <th className="p-4 text-center min-w-[180px] bg-amber-500/10 border-x border-amber-500/20">
                      <div className="space-y-2">
                        <div className="w-16 h-16 mx-auto rounded-lg overflow-hidden bg-slate-900 p-1">
                          <img src={product.images[0]} alt="" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-amber-400 font-bold block truncate max-w-[160px]">{product.name_ar}</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black font-extrabold text-[10px]">المنتج الحالي</span>
                      </div>
                    </th>

                    {/* Comparison items */}
                    {enriched.comparison_items.map(comp => (
                      <th key={comp.id} className="p-4 text-center min-w-[180px]">
                        <div className="space-y-2">
                          <div className="w-16 h-16 mx-auto rounded-lg overflow-hidden bg-slate-900 p-1">
                            <img src={comp.images[0]} alt="" className="w-full h-full object-contain" />
                          </div>
                          <button
                            onClick={() => navigate('product', comp.id)}
                            className="text-white hover:text-amber-400 font-bold block truncate max-w-[160px] mx-auto text-center"
                          >
                            {comp.name_ar}
                          </button>
                          <span className="text-slate-400 text-[10px] block">{comp.brand}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {/* Price */}
                  <tr>
                    <td className="p-3 text-slate-400 font-semibold">السعر</td>
                    <td className="p-3 text-center font-black font-outfit text-amber-400 bg-amber-500/5 border-x border-amber-500/20">
                      {displayedPrice}
                    </td>
                    {enriched.comparison_items.map(comp => (
                      <td key={comp.id} className="p-3 text-center font-bold font-outfit text-white">
                        {priceLabel(comp, language, formatPrice)}
                      </td>
                    ))}
                  </tr>

                  {/* Rating */}
                  <tr>
                    <td className="p-3 text-slate-400 font-semibold">التقييم</td>
                    <td className="p-3 text-center bg-amber-500/5 border-x border-amber-500/20">
                      {product.reviews_count > 0 && product.rating > 0 ? <><span className="font-bold text-white font-outfit">★ {product.rating}</span><span className="text-[10px] text-slate-400 block font-outfit">({product.reviews_count})</span></> : <span>{language === 'ar' ? 'لا توجد تقييمات' : 'No reviews'}</span>}
                    </td>
                    {enriched.comparison_items.map(comp => (
                      <td key={comp.id} className="p-3 text-center">
                        {comp.reviews_count > 0 && comp.rating > 0 ? <><span className="font-bold text-white font-outfit">★ {comp.rating}</span><span className="text-[10px] text-slate-400 block font-outfit">({comp.reviews_count})</span></> : <span>{language === 'ar' ? 'لا توجد تقييمات' : 'No reviews'}</span>}
                      </td>
                    ))}
                  </tr>

                  {/* Battery */}
                  <tr>
                    <td className="p-3 text-slate-400 font-semibold">عمر البطارية</td>
                    <td className="p-3 text-center text-emerald-400 font-bold bg-amber-500/5 border-x border-amber-500/20">
                      {publicSpecs(product.specs)['عمر البطارية'] || (language === 'ar' ? 'غير مذكور' : 'Not specified')}
                    </td>
                    {enriched.comparison_items.map(comp => (
                      <td key={comp.id} className="p-3 text-center text-slate-300">
                        {publicSpecs(comp.specs)['عمر البطارية'] || (language === 'ar' ? 'غير مذكور' : 'Not specified')}
                      </td>
                    ))}
                  </tr>

                  {/* Wireless Charging */}
                  <tr>
                    <td className="p-3 text-slate-400 font-semibold">الشحن اللاسلكي</td>
                    <td className="p-3 text-center text-emerald-400 font-bold bg-amber-500/5 border-x border-amber-500/20">
                      {publicSpecs(product.specs)['الشحن اللاسلكي'] || (language === 'ar' ? 'غير مذكور' : 'Not specified')}
                    </td>
                    {enriched.comparison_items.map(comp => (
                      <td key={comp.id} className="p-3 text-center text-slate-400">
                        {publicSpecs(comp.specs)['الشحن اللاسلكي'] || (language === 'ar' ? 'غير مذكور' : 'Not specified')}
                      </td>
                    ))}
                  </tr>

                  {/* Action row */}
                  <tr>
                    <td className="p-3 text-slate-400 font-semibold">الإجراء</td>
                    <td className="p-3 text-center bg-amber-500/5 border-x border-amber-500/20">
                      <button
                        onClick={handleAddToCart}
                        disabled={!canPurchase}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs"
                      >
                        أضف للسلة
                      </button>
                    </td>
                    {enriched.comparison_items.map(comp => (
                      <td key={comp.id} className="p-3 text-center">
                        <button
                          onClick={() => {
                            if (!canPurchaseProduct(comp)) return;
                            addToCart(comp, 1);
                            setAddedToast(true);
                            setTimeout(() => setAddedToast(false), 2000);
                          }}
                          disabled={!canPurchaseProduct(comp)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                        >
                          أضف للسلة
                        </button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==============================================================
            5. TECHNICAL SPECIFICATIONS TABLE (المواصفات الفنية)
           ============================================================== */}
        <div className="space-y-4 pt-6">
          <h2 className="text-lg sm:text-xl font-black text-white font-cairo">
            المواصفات والتفاصيل الفنية الكاملة
          </h2>
          <div className="rounded-2xl border border-white/10 bg-[#0F1626] p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {Object.entries(publicSpecs(product.specs)).map(([key, val]) => (
                <div key={key} className="flex justify-between items-center p-3 rounded-xl bg-slate-900 border border-white/5">
                  <span className="text-slate-400 font-medium">{key}</span>
                  <span className="text-white font-bold">{val}</span>
                </div>
              ))}
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-900 border border-white/5">
                <span className="text-slate-400 font-medium">{language === 'ar' ? 'كود المنتج' : 'Product code'}</span>
                <span className="text-white font-mono font-bold">{product.sku || product.id}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-900 border border-white/5">
                <span className="text-slate-400 font-medium">الضمان المعتمد</span>
                <span className="text-emerald-400 font-bold">{product.warranty_months > 0 ? `${product.warranty_months} ${language === 'ar' ? 'شهور' : 'months'}` : (language === 'ar' ? 'اسأل المحل عن الضمان' : 'Ask about warranty')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ==============================================================
            6. CUSTOMER REVIEWS & RATINGS BREAKDOWN (تقييمات وآراء العملاء)
           ============================================================== */}
        {enriched.customer_reviews.length > 0 ? <div id="customer-reviews" className="space-y-6 pt-6 border-t border-white/10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white font-cairo">
                تقييمات وآراء العملاء المسجلة
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                المراجعات المتاحة لهذا المنتج؛ تظهر علامة الشراء الموثق فقط عند تسجيلها.
              </p>
            </div>

            <button
              disabled
              title="تقديم المراجعات غير متاح حالياً"
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 font-bold text-xs flex items-center gap-2 transition-all"
            >
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>تقديم المراجعات قريباً</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Breakdown Column (4 cols) */}
            <div className="lg:col-span-4 p-6 rounded-2xl bg-[#0F1626] border border-white/10 space-y-6">
              {/* Big Score */}
              <div className="flex items-center gap-4">
                <div className="text-5xl font-black text-white font-outfit">
                  {product.rating}
                </div>
                <div>
                  <div className="flex text-amber-400 mb-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-xs text-slate-400 font-outfit">
                    {product.reviews_count} تقييم عالمي
                  </span>
                </div>
              </div>

              {/* Rating Bars */}
              <div className="space-y-2 text-xs">
                {[
                  { stars: 5, pct: enriched.rating_breakdown.five_star },
                  { stars: 4, pct: enriched.rating_breakdown.four_star },
                  { stars: 3, pct: enriched.rating_breakdown.three_star },
                  { stars: 2, pct: enriched.rating_breakdown.two_star },
                  { stars: 1, pct: enriched.rating_breakdown.one_star }
                ].map(({ stars, pct }) => (
                  <div key={stars} className="flex items-center gap-3">
                    <span className="w-12 text-slate-400 font-medium">{stars} نجوم</span>
                    <div className="flex-1 h-3 rounded-full bg-slate-800 overflow-hidden relative">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      />
                    </div>
                    <span className="w-9 text-slate-400 font-outfit text-left">{pct}%</span>
                  </div>
                ))}
              </div>

            </div>

            {/* Right Reviews List Column (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              {/* Review Filter Pills */}
              <div className="flex gap-2 pb-2 overflow-x-auto text-xs">
                <button
                  onClick={() => setReviewFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    reviewFilter === 'all' 
                      ? 'bg-amber-500 text-black' 
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-white/10'
                  }`}
                >
                  جميع المراجعات ({enriched.customer_reviews.length})
                </button>
                <button
                  onClick={() => setReviewFilter('5')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    reviewFilter === '5' 
                      ? 'bg-amber-500 text-black' 
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-white/10'
                  }`}
                >
                  5 نجوم فقط
                </button>
                <button
                  onClick={() => setReviewFilter('4')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    reviewFilter === '4' 
                      ? 'bg-amber-500 text-black' 
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-white/10'
                  }`}
                >
                  4 نجوم فقط
                </button>
              </div>

              {/* Review Items */}
              <div className="space-y-3">
                {filteredReviews.map(rev => {
                  const currentHelpful = helpfulCounts[rev.id] ?? rev.helpful_count;
                  const isVoted = !!userVotedHelpful[rev.id];

                  return (
                    <div key={rev.id} className="p-5 rounded-2xl bg-[#0F1626] border border-white/10 space-y-3">
                      <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center border border-white/10 text-xs">
                            {rev.author.charAt(0)}
                          </div>
                          <div>
                            <strong className="text-white block font-bold">{rev.author}</strong>
                            <span className="text-[11px] text-slate-400">{rev.location || 'مصر'}</span>
                          </div>
                        </div>

                        <span className="text-[11px] text-slate-400 font-outfit">{rev.date}</span>
                      </div>

                      {/* Stars & Verified Badge */}
                      <div className="flex items-center gap-3">
                        <div className="flex text-amber-400">
                          {[...Array(rev.rating)].map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        {rev.verified_purchase && (
                          <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>شراء موثق من جو ستور</span>
                          </span>
                        )}
                      </div>

                      {/* Title & Comment */}
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white">{rev.title}</h4>
                        <p className="text-xs text-slate-300 leading-relaxed">{rev.comment}</p>
                      </div>

                      {/* Helpful Button */}
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                        <span>هل كانت هذه المراجعة مفيدة لك؟</span>
                        <button
                          onClick={() => handleHelpfulVote(rev.id, rev.helpful_count)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border transition-all ${
                            isVoted 
                              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' 
                              : 'border-white/10 bg-slate-900 hover:border-slate-600 text-slate-300'
                          }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>مفيد ({currentHelpful})</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div> : <div id="customer-reviews" className="pt-6 border-t border-white/10 text-sm text-slate-400">{language === 'ar' ? 'لا توجد مراجعات مسجلة لهذا المنتج بعد.' : 'No recorded reviews for this product yet.'}</div>}

        {/* ==============================================================
            7. RELATED PRODUCTS CAROUSEL / GRID
           ============================================================== */}
        <div className="space-y-4 pt-6 border-t border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-black text-white font-cairo">
              منتجات متعلقة بهذه السلعة (Related Products)
            </h2>
            <button
              onClick={() => navigate('catalog')}
              className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-bold"
            >
              <span>مشاهدة الكل في الكتالوج</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products
              .filter(p => p.id !== product.id && p.is_active !== false)
              .slice(0, 4)
              .map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
          </div>
        </div>
      </div>

      {/* ==============================================================
          FULL-SCREEN LIGHTBOX GALLERY MODAL
         ============================================================== */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col p-4 sm:p-6 animate-fadeIn">
          {/* Top bar */}
          <div className="flex items-center justify-between text-white pb-4 border-b border-white/10">
            <span className="text-sm font-bold truncate max-w-md">{product.name_ar}</span>
            <button
              onClick={() => setLightboxOpen(false)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main big image */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
            <img
              src={product.images[selectedImage]}
              alt=""
              className="max-h-[75vh] max-w-full object-contain drop-shadow-2xl"
            />
          </div>

          {/* Bottom Thumbnails */}
          <div className="flex items-center justify-center gap-3 overflow-x-auto pt-4 border-t border-white/10">
            {product.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImage(idx)}
                className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                  selectedImage === idx ? 'border-amber-400 scale-105 shadow-glow-gold' : 'border-white/20 opacity-50 hover:opacity-100'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ==============================================================
          WRITE A REVIEW MODAL
         ============================================================== */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-[#0F1626] border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-base text-white">إضافة تقييم جديد للمنتج</h3>
              <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddReview} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">اسمك الكامل:</label>
                <input
                  type="text"
                  required
                  value={newReviewAuthor}
                  onChange={(e) => setNewReviewAuthor(e.target.value)}
                  placeholder="مثال: أحمد محمود"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">المحافظة / المدينة:</label>
                <input
                  type="text"
                  value={newReviewCity}
                  onChange={(e) => setNewReviewCity(e.target.value)}
                  placeholder="مثال: القاهرة، المنصورة، الإسكندرية..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">تقييمك بالنجوم:</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(st => (
                    <button
                      type="button"
                      key={st}
                      onClick={() => setNewReviewRating(st)}
                      className="p-1 text-amber-400"
                    >
                      <Star className={`w-6 h-6 ${st <= newReviewRating ? 'fill-amber-400' : 'text-slate-600'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">عنوان المراجعة:</label>
                <input
                  type="text"
                  value={newReviewTitle}
                  onChange={(e) => setNewReviewTitle(e.target.value)}
                  placeholder="مثال: منتج ممتاز وصوت نقي جداً"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">تفاصيل تجربتك:</label>
                <textarea
                  required
                  rows={3}
                  value={newReviewComment}
                  onChange={(e) => setNewReviewComment(e.target.value)}
                  placeholder="اكتب رأيك بصراحة في جودة المنتج وسرعة التوصيل..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold transition-all shadow-glow-gold"
                >
                  نشر التقييم فوراً
                </button>
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Submitted Toast */}
      {reviewSubmittedToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-emerald-950 border border-emerald-500 text-emerald-300 text-xs font-bold shadow-2xl flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span>شكراً لك! تم نشر تقييمك بنجاح وأصبح ظاهراً لكافة المشترين.</span>
        </div>
      )}
    </div>
  );
};
