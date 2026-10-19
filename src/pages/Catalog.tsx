import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Filter,
  SlidersHorizontal,
  X,
  RotateCcw,
  Search,
  BatteryMedium,
  ShieldCheck,
  Tag,
  Smartphone,
  ChevronDown
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { ProductCard } from '../components/ProductCard';
import { CategoryKey, ProductCondition } from '../types';
import { Pagination } from '../components/Pagination';
import { pageSlice } from '../utils/storeExpansion';
import { readStoredArray } from '../utils/browserStorage';
import { AnimateStorefront } from '../components/motion/AnimateStorefront';

export const Catalog: React.FC<{ mode?: 'catalog' | 'wishlist' | 'deals' | 'recent' }> = ({ mode = 'catalog' }) => {
  const {
    products,
    wishlist,
    isCatalogLoading,
    isCatalogReadyForReports,
    isOfflineCatalog,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery
  } = useStore();

  const { t, language, formatPrice } = useLanguage();
  const isAr = language === 'ar';

  const initialQuery = useRef(new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search));
  const catalogTitle = useRef<HTMLHeadingElement>(null);
  const catalogRoot = useRef<HTMLDivElement>(null);
  const restored = useRef(false);
  const [restoreVersion, setRestoreVersion] = useState(0);
  const [availableOnly, setAvailableOnly] = useState(initialQuery.current.get('stock') === 'available');
  const [page, setPage] = useState(Number(initialQuery.current.get('page')) || 1);
  const [pageSize, setPageSize] = useState([24, 36, 48].includes(Number(initialQuery.current.get('size'))) ? Number(initialQuery.current.get('size')) : 36);
  const recentIds = readStoredArray('joe_recent_products', (value): value is string => typeof value === 'string');

  // Filter States
  const [selectedBrand, setSelectedBrand] = useState<string>(initialQuery.current.get('brand') || 'all');
  const [selectedCondition, setSelectedCondition] = useState<string>(initialQuery.current.get('condition') || 'all');
  const [minBatteryHealth, setMinBatteryHealth] = useState<number>(Math.max(0, Math.min(100, Number(initialQuery.current.get('battery')) || 0)));
  const [maxPrice, setMaxPrice] = useState<number>(initialQuery.current.get('max') ? Math.max(0, Number(initialQuery.current.get('max')) || 0) : Number.POSITIVE_INFINITY);
  const priceCeiling = useMemo(() => Math.max(65000, ...products.map(product => product.price)), [products]);
  const [selectedStorage, setSelectedStorage] = useState<string>(initialQuery.current.get('storage') || 'all');
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc' | 'rating' | 'newest'>(() => (['featured', 'price_asc', 'price_desc', 'rating', 'newest'].includes(initialQuery.current.get('sort') || '') ? initialQuery.current.get('sort') : 'featured') as any);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);


  // Extract unique brands and storages
  const brands = useMemo(() => {
    const list = Array.from(new Set(products.map(p => p.brand).filter(Boolean)));
    return ['all', ...list];
  }, [products]);

  const storages = ['all', '128GB', '256GB', '512GB', '1TB'];

  // Categories list
  const categoriesList: { key: CategoryKey; label: string }[] = [
    { key: 'all', label: t('allCategories') },
    { key: 'smartphones', label: t('smartphones') },
    { key: 'smartwatches', label: t('smartwatches') },
    { key: 'audio', label: t('audio') },
    { key: 'chargers_cables', label: t('chargers_cables') },
    { key: 'powerbanks', label: t('powerbanks') },
    { key: 'cases_protection', label: t('cases_protection') },
    { key: 'accessories', label: t('accessories') },
  ];

  // Reset Filters
  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedBrand('all');
    setSelectedCondition('all');
    setMinBatteryHealth(0);
    setMaxPrice(priceCeiling);
    setSelectedStorage('all');
    setSearchQuery('');
    setAvailableOnly(false);
  };

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (p.is_active === false) return false;
      if (mode === 'wishlist' && !wishlist.includes(p.id)) return false;
      if (mode === 'deals' && !(p.price > 0 && ((p.original_price || 0) > p.price || p.is_flash_sale))) return false;
      if (mode === 'recent' && !recentIds.includes(p.id)) return false;
      if (availableOnly && !(p.in_stock && p.stock > 0 && p.price > 0)) return false;
      // Category
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      // Brand
      if (selectedBrand !== 'all' && p.brand !== selectedBrand) return false;
      // Condition
      if (selectedCondition !== 'all' && p.condition !== selectedCondition) return false;
      // Battery Health
      if (minBatteryHealth > 0) {
        if (!p.battery_health || p.battery_health < minBatteryHealth) return false;
      }
      // Price
      if (p.price > maxPrice) return false;
      // Storage
      if (selectedStorage !== 'all' && p.storage !== selectedStorage && !p.available_storages?.includes(selectedStorage)) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const combined = `${p.name_ar} ${p.name_en} ${p.brand} ${p.storage || ''} ${p.description_ar}`.toLowerCase();
        if (!combined.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'newest') return (b.created_at || '').localeCompare(a.created_at || '');
      return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
    });
  }, [products, selectedCategory, selectedBrand, selectedCondition, minBatteryHealth, maxPrice, selectedStorage, searchQuery, sortBy, availableOnly, mode, wishlist, recentIds.join()]);

  const filterKey = JSON.stringify([selectedCategory, selectedBrand, selectedCondition, minBatteryHealth, maxPrice, selectedStorage, searchQuery, sortBy, availableOnly, pageSize, mode]);
  const previousFilters = useRef(filterKey);
  const slice = pageSlice(filteredProducts, page, pageSize);
  useEffect(() => {
    if (restored.current) { restored.current = false; previousFilters.current = filterKey; return; }
    if (previousFilters.current !== filterKey) { previousFilters.current = filterKey; setPage(1); }
  }, [filterKey, restoreVersion]);
  useEffect(() => {
    const restore = () => {
      const q = new URLSearchParams(window.location.search); restored.current = true; setRestoreVersion(v => v + 1);
      setPage(Number(q.get('page')) || 1); setPageSize([24, 36, 48].includes(Number(q.get('size'))) ? Number(q.get('size')) : 36);
      setSelectedBrand(q.get('brand') || 'all'); setSelectedCondition(q.get('condition') || 'all');
      setMinBatteryHealth(Number(q.get('battery')) || 0); setMaxPrice(q.get('max') ? Number(q.get('max')) : Infinity);
      setSelectedStorage(q.get('storage') || 'all'); setSortBy((q.get('sort') || 'featured') as any); setAvailableOnly(q.get('stock') === 'available');
    };
    window.addEventListener('popstate', restore); return () => window.removeEventListener('popstate', restore);
  }, []);
  useEffect(() => {
    if (isCatalogLoading || (!isCatalogReadyForReports && !isOfflineCatalog)) return;
    const q = new URLSearchParams();
    if (selectedCategory !== 'all') q.set('category', selectedCategory);
    if (searchQuery.trim()) q.set('q', searchQuery);
    if (selectedBrand !== 'all') q.set('brand', selectedBrand);
    if (selectedCondition !== 'all') q.set('condition', selectedCondition);
    if (minBatteryHealth) q.set('battery', String(minBatteryHealth));
    if (Number.isFinite(maxPrice) && maxPrice < priceCeiling) q.set('max', String(maxPrice));
    if (selectedStorage !== 'all') q.set('storage', selectedStorage);
    if (sortBy !== 'featured') q.set('sort', sortBy);
    if (availableOnly) q.set('stock', 'available');
    if (slice.page > 1) q.set('page', String(slice.page));
    if (pageSize !== 36) q.set('size', String(pageSize));
    window.history.replaceState(window.history.state, '', `/${mode === 'catalog' ? 'catalog' : mode}${q.size ? '?' + q.toString() : ''}`);
  }, [filterKey, slice.page, isCatalogLoading, isCatalogReadyForReports, isOfflineCatalog]);
  const changePage = (next: number) => { const q = new URLSearchParams(window.location.search); if (next > 1) q.set('page', String(next)); else q.delete('page'); window.history.pushState({}, '', `${window.location.pathname}${q.size ? '?' + q.toString() : ''}`); setPage(next); catalogTitle.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const displayedProducts = slice.rows;
  const title = mode === 'wishlist' ? (isAr ? 'المفضلة' : 'Wishlist') : mode === 'deals' ? (isAr ? 'العروض الحالية' : 'Current deals') : mode === 'recent' ? (isAr ? 'شاهدتها مؤخرًا' : 'Recently viewed') : t('catalog');

  return (
    <div ref={catalogRoot} className="joe-catalog joe-container space-y-6">
      <AnimateStorefront root={catalogRoot} motionKey={`${language}-${mode}`} />
      {!isCatalogLoading && !isCatalogReadyForReports && !isOfflineCatalog && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">تعذر تحديث الكتالوج الحالي. المعروض نسخة محلية مؤقتة؛ حدّث الصفحة بعد التأكد من الاتصال للحصول على أحدث المنتجات والأسعار.</p>}
      {/* Header and Controls */}
      <div className="joe-catalog-intro flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200">
        <div>
          <span className="joe-eyebrow">{isAr ? 'تفاصيل تكمل يومك / JOE COLLECTION' : 'THE JOE COLLECTION / EVERYDAY UPGRADES'}</span>
          <h1 ref={catalogTitle} style={{ scrollMarginTop: 'calc(var(--store-header-height, 160px) + 20px)' }} className="text-2xl sm:text-3xl font-black text-slate-900 font-cairo flex items-center gap-2">
            <span key={language} data-split-title>{title}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 font-bold border border-amber-500/30">
              {filteredProducts.length} منتج
            </span>
          </h1>
          <p className="text-xs text-slate-600 font-cairo">
            {isCatalogLoading ? 'جارٍ تحميل المنتجات…' : `عرض ${slice.from}–${slice.to} من ${filteredProducts.length} • صفحة ${slice.page} من ${slice.pages}`}
          </p>
        </div>

        {/* Sort and Mobile Filter Button */}
        <div className="flex items-center gap-3">
          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setIsMobileFiltersOpen(true)}
            className="md:hidden flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800"
          >
            <Filter className="w-4 h-4 text-amber-700" />
            <span>الفلاتر</span>
          </button>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs">
            <span className="text-slate-600 font-cairo">{t('sortBy')}:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-slate-900 font-bold font-cairo focus:outline-none cursor-pointer"
            >
              <option value="featured" className="bg-slate-100">{t('sortFeatured')}</option>
              <option value="price_asc" className="bg-slate-100">{t('sortPriceAsc')}</option>
              <option value="price_desc" className="bg-slate-100">{t('sortPriceDesc')}</option>
              <option value="rating" className="bg-slate-100">{t('sortRating')}</option>
              <option value="newest" className="bg-slate-100">{language === 'ar' ? 'الأحدث إضافة' : 'Newest'}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="joe-catalog-toolbar flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={availableOnly} onChange={e => setAvailableOnly(e.target.checked)} className="accent-amber-600" />{isAr ? 'المتاح للشراء فقط' : 'Available to buy only'}</label>
        <label className="flex items-center gap-2">{isAr ? 'منتجات في الصفحة' : 'Per page'}<select className="border border-slate-300 rounded-lg p-2 bg-white" value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>{[24,36,48].map(n => <option key={n}>{n}</option>)}</select></label>
      </div>
      {/* Main Layout: Sidebar Filters + Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden md:block col-span-1 bg-white border border-slate-200 rounded-2xl p-5 space-y-6 sticky top-28">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 font-cairo">
              <SlidersHorizontal className="w-4 h-4 text-amber-700" />
              <span>{t('filters')}</span>
            </h3>
            <button
              onClick={handleResetFilters}
              className="text-[11px] text-amber-700 hover:text-amber-700 flex items-center gap-1 font-semibold"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t('clearFilters')}</span>
            </button>
          </div>

          {/* Category Filter */}
          <div>
            <h4 className="text-xs font-bold text-slate-600 mb-2 font-cairo">
              {language === 'ar' ? 'الأقسام' : 'Categories'}
            </h4>
            <div className="space-y-1">
              {categoriesList.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`w-full text-right px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                    selectedCategory === cat.key
                      ? 'bg-amber-500 text-black font-bold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Condition Filter */}
          <div className="pt-3 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-600 mb-2 font-cairo">
              {t('filterCondition')}
            </h4>
            <div className="flex flex-col gap-1.5 text-xs">
              <button
                onClick={() => setSelectedCondition('all')}
                className={`text-right px-3 py-1.5 rounded-lg ${selectedCondition === 'all' ? 'bg-amber-500/20 text-amber-700 font-bold border border-amber-500/30' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {language === 'ar' ? 'الكل (جديد ومستعمل)' : 'All (New & Pre-Owned)'}
              </button>
              <button
                onClick={() => setSelectedCondition('mint')}
                className={`text-right px-3 py-1.5 rounded-lg flex items-center justify-between ${selectedCondition === 'mint' ? 'bg-amber-500/20 text-amber-700 font-bold border border-amber-500/30' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <span>{t('mint')}</span>
                <span className="text-[10px] bg-amber-500/10 text-amber-700 px-1.5 py-0.2 rounded font-bold">
                  {language === 'ar' ? 'الأكثر طلباً' : 'Popular'}
                </span>
              </button>
              <button
                onClick={() => setSelectedCondition('brand_new')}
                className={`text-right px-3 py-1.5 rounded-lg ${selectedCondition === 'brand_new' ? 'bg-amber-500/20 text-amber-700 font-bold border border-amber-500/30' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {t('brandNew')}
              </button>
            </div>
          </div>

          {/* Battery Health Slider (Featured from user's video) */}
          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-600 font-cairo flex items-center gap-1.5">
                <BatteryMedium className="w-4 h-4 text-emerald-700" />
                <span>{language === 'ar' ? 'الحد الأدنى للبطارية:' : 'Min Battery Health:'}</span>
              </h4>
              <span className="text-xs font-bold text-emerald-700 font-outfit">
                {minBatteryHealth > 0 ? `${minBatteryHealth}%+` : (language === 'ar' ? 'الكل' : 'All')}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={minBatteryHealth}
              onChange={(e) => setMinBatteryHealth(Number(e.target.value))}
              className="w-full accent-amber-500 bg-slate-100 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-outfit">
              <span>{language === 'ar' ? 'أي نسبة' : 'Any'}</span>
              <span>85%</span>
              <span>90%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Max Price Slider */}
          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-600 font-cairo">
                {language === 'ar' ? 'الحد الأقصى للسعر:' : 'Max Price:'}
              </h4>
              <span className="text-xs font-bold text-amber-700 font-outfit">
                {formatPrice(Math.min(maxPrice, priceCeiling))}
              </span>
            </div>
            <input
              type="range"
              min="500"
              max={priceCeiling}
              step="500"
              value={Math.min(maxPrice, priceCeiling)}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-amber-500 bg-slate-100 rounded-lg cursor-pointer"
            />
          </div>

          {/* Storage Filter */}
          <div className="pt-3 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-600 mb-2 font-cairo">
              {t('storage')}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {storages.map(st => (
                <button
                  key={st}
                  onClick={() => setSelectedStorage(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold font-outfit border transition-all ${
                    selectedStorage === st
                      ? 'bg-amber-500 text-black border-amber-400'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-200'
                  }`}
                >
                  {st === 'all' ? (language === 'ar' ? 'الكل' : 'All') : st}
                </button>
              ))}
            </div>
          </div>

          {/* Brand Filter */}
          <div className="pt-3 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-600 mb-2 font-cairo">
              {t('filterBrand')}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {brands.map(b => (
                <button
                  key={b}
                  onClick={() => setSelectedBrand(b)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold font-outfit border transition-all ${
                    selectedBrand === b
                      ? 'bg-amber-500 text-black border-amber-400 font-bold'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-200'
                  }`}
                >
                  {b === 'all' ? (language === 'ar' ? 'الكل' : 'All') : b}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Product Grid Area (3 Cols) */}
        <main className="col-span-1 md:col-span-3 space-y-4">
          {/* Active filter pills */}
          {(selectedCategory !== 'all' || selectedBrand !== 'all' || selectedCondition !== 'all' || minBatteryHealth > 0 || searchQuery.trim()) && (
            <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-100/60 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-600 font-semibold">{language === 'ar' ? 'فلاتر مفعلة:' : 'Active Filters:'}</span>
              {selectedCategory !== 'all' && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 flex items-center gap-1">
                  <span>{selectedCategory}</span>
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedCategory('all')} />
                </span>
              )}
              {selectedCondition !== 'all' && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 flex items-center gap-1">
                  <span>{selectedCondition === 'mint' ? (language === 'ar' ? 'كسر زيرو' : 'Mint') : (language === 'ar' ? 'جديد' : 'Brand New')}</span>
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedCondition('all')} />
                </span>
              )}
              {minBatteryHealth > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 flex items-center gap-1">
                  <span>{language === 'ar' ? `بطارية ${minBatteryHealth}%+` : `Battery ${minBatteryHealth}%+`}</span>
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setMinBatteryHealth(0)} />
                </span>
              )}
              {searchQuery.trim() && (
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-700 flex items-center gap-1">
                  <span>"{searchQuery}"</span>
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchQuery('')} />
                </span>
              )}
              <button
                onClick={handleResetFilters}
                className="text-slate-600 hover:text-slate-900 underline text-[11px] mr-auto"
              >
                {language === 'ar' ? 'مسح الكل' : 'Clear All'}
              </button>
            </div>
          )}

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-3xl mx-auto">
                🔍
              </div>
              <h3 className="text-base font-bold text-slate-900 font-cairo">
                {language === 'ar' ? 'لا توجد منتجات تطابق الفلاتر المحددة' : 'No products match the selected filters'}
              </h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto font-cairo">
                {language === 'ar'
                  ? 'جرب تغيير نطاق السعر أو إزالة نسبة البطارية المحددة أو إعادة تعيين الفلاتر.'
                  : 'Try changing price range, battery filter, or resetting all filters.'}
              </p>
              <button
                onClick={handleResetFilters}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-glow-gold"
              >
                {language === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset All Filters'}
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="joe-catalog-products grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                {displayedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              <Pagination page={slice.page} pages={slice.pages} onChange={changePage} language={language} />

            </div>
          )}
        </main>
      </div>

      {/* Mobile Filters Slide-in Modal */}
      {isMobileFiltersOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex">
          <div className={`w-4/5 max-w-xs bg-white h-full p-5 overflow-y-auto ${isAr ? 'border-l' : 'border-r'} border-amber-500/30 flex flex-col justify-between`}>
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-amber-700" />
                  <span>{isAr ? 'الفلاتر والخيارات' : 'Filters & Options'}</span>
                </h3>
                <button
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-100 text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Categories */}
              <div>
                <h4 className="text-xs font-bold text-slate-600 mb-2">{isAr ? 'الأقسام' : 'Categories'}</h4>
                <div className="space-y-1">
                  {categoriesList.map(cat => (
                    <button
                      key={cat.key}
                      onClick={() => {
                        setSelectedCategory(cat.key);
                        setIsMobileFiltersOpen(false);
                      }}
                      className={`w-full ${isAr ? 'text-right' : 'text-left'} px-3 py-1.5 rounded-lg text-xs ${
                        selectedCategory === cat.key ? 'bg-amber-500 text-black font-bold' : 'text-slate-600'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Condition */}
              <div className="pt-3 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-600 mb-2">{isAr ? 'الحالة' : 'Condition'}</h4>
                <div className="flex flex-col gap-1 text-xs">
                  <button onClick={() => setSelectedCondition('all')} className={`${isAr ? 'text-right' : 'text-left'} py-1 text-slate-600`}>{isAr ? 'الكل' : 'All'}</button>
                  <button onClick={() => setSelectedCondition('mint')} className={`${isAr ? 'text-right' : 'text-left'} py-1 text-amber-700 font-bold`}>{t('mint')}</button>
                  <button onClick={() => setSelectedCondition('brand_new')} className={`${isAr ? 'text-right' : 'text-left'} py-1 text-emerald-700`}>{t('brandNew')}</button>
                </div>
              </div>

              {/* Battery slider */}
              <div className="pt-3 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-600 mb-1">
                  {isAr ? `الحد الأدنى للبطارية: ${minBatteryHealth}%` : `Min Battery Health: ${minBatteryHealth}%`}
                </h4>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={minBatteryHealth}
                  onChange={(e) => setMinBatteryHealth(Number(e.target.value))}
                  className="w-full accent-amber-500 bg-slate-100 rounded-lg"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 space-y-2">
              <button
                onClick={() => setIsMobileFiltersOpen(false)}
                className="w-full py-2.5 rounded-xl bg-amber-500 text-black font-bold text-xs"
              >
                {isAr ? `تطبيق (${filteredProducts.length}) منتج` : `Apply (${filteredProducts.length}) Products`}
              </button>
              <button
                onClick={handleResetFilters}
                className="w-full py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold"
              >
                {isAr ? 'مسح الفلاتر' : 'Reset Filters'}
              </button>
            </div>
          </div>

          <div className="flex-1" onClick={() => setIsMobileFiltersOpen(false)} />
        </div>
      )}
    </div>
  );
};
