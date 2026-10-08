import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Eye, 
  EyeOff, 
  Plus, 
  Minus, 
  AlertTriangle, 
  Layers, 
  FileSpreadsheet, 
  Download, 
  Upload, 
  CheckCircle, 
  BatteryMedium,
  Edit,
  Trash2,
  Copy,
  Sparkles,
  Smartphone
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { Product, CategoryKey } from '../../types';
import { exportCatalogToExcel } from '../../utils/excelParser';

interface InventoryTabProps {
  onOpenAddProduct: () => void;
  onOpenEditProduct: (p: Product) => void;
  onOpenExcelModal: () => void;
}

export const InventoryTab: React.FC<InventoryTabProps> = ({
  onOpenAddProduct,
  onOpenEditProduct,
  onOpenExcelModal
}) => {
  const { products, toggleProductVisibility, updateProduct, deleteProduct, duplicateProduct } = useStore();
  const { formatPrice, language } = useLanguage();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'hidden' | 'low_stock' | 'preowned' | 'estimated' | 'missing_price'>('all');
  const [visibleCount, setVisibleCount] = useState(50);
  const [catFilter, setCatFilter] = useState<string>('all');
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [tempStock, setTempStock] = useState<number>(0);

  // Statistics
  const totalCount = products.length;
  const activeCount = products.filter(p => p.is_active !== false).length;
  const hiddenCount = products.filter(p => p.is_active === false).length;
  const lowStockCount = products.filter(p => (p.stock ?? 0) < 3).length;
  const preownedCount = products.filter(p => p.condition === 'mint' || p.condition === 'used_good').length;

  // Filtered List
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !search.trim() || 
        p.name_ar.toLowerCase().includes(search.toLowerCase()) ||
        p.name_en.toLowerCase().includes(search.toLowerCase()) ||
        p.brand.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));

      const matchCat = catFilter === 'all' || p.category === catFilter;

      let matchType = true;
      if (filterType === 'active') matchType = p.is_active !== false;
      if (filterType === 'hidden') matchType = p.is_active === false;
      if (filterType === 'low_stock') matchType = (p.stock ?? 0) < 3;
      if (filterType === 'preowned') matchType = p.condition === 'mint' || p.condition === 'used_good';
      if (filterType === 'estimated') matchType = p.catalog_status === 'estimated';
      if (filterType === 'missing_price') matchType = p.price <= 0;

      return matchSearch && matchCat && matchType;
    });
  }, [products, search, catFilter, filterType]);
  useEffect(() => setVisibleCount(50), [search, catFilter, filterType]);

  const handleStockChange = (p: Product, delta: number) => {
    const nextStock = Math.max(0, (p.stock || 0) + delta);
    updateProduct(p.id, { stock: nextStock, in_stock: nextStock > 0 });
  };

  const handleSaveStockInput = (p: Product) => {
    const nextStock = Math.max(0, tempStock);
    updateProduct(p.id, { stock: nextStock, in_stock: nextStock > 0 });
    setEditingStockId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 space-y-3">
        <h2 className="font-bold text-amber-300">تقرير مراجعة بيانات المنتجات</h2>
        <p className="text-xs text-slate-300">التفاصيل التقديرية والصور التوضيحية قابلة للمراجعة من زر تعديل المنتج. الأسعار والمخزون من ملف الأصناف.</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <button onClick={() => setFilterType('estimated')} className="rounded-lg bg-amber-500/20 px-3 py-2 text-amber-300">
            تحتاج مراجعة: {products.filter(p => p.catalog_status === 'estimated').length}
          </button>
          <button onClick={() => setFilterType('missing_price')} className="rounded-lg bg-rose-500/20 px-3 py-2 text-rose-300">
            بدون سعر بيع: {products.filter(p => p.price <= 0).length}
          </button>
          <button onClick={() => exportCatalogToExcel(filteredProducts)} className="rounded-lg bg-white/10 px-3 py-2 text-white">تصدير التقرير الحالي</button>
        </div>
      </div>
      {/* 1. Header Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div 
          onClick={() => setFilterType('all')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            filterType === 'all' 
              ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-2 ring-amber-500/20' 
              : 'bg-[#0F1626] border-white/10 text-slate-300 hover:border-white/20'
          }`}
        >
          <span className="text-[11px] block font-bold text-slate-400">إجمالي الأصناف</span>
          <strong className="text-xl sm:text-2xl font-black font-outfit text-white">{totalCount}</strong>
          <span className="text-[10px] text-slate-500 block">في قاعدة البيانات</span>
        </div>

        <div 
          onClick={() => setFilterType('active')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            filterType === 'active' 
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/20' 
              : 'bg-[#0F1626] border-white/10 text-slate-300 hover:border-white/20'
          }`}
        >
          <span className="text-[11px] block font-bold text-emerald-400">معروض للبيع</span>
          <strong className="text-xl sm:text-2xl font-black font-outfit text-emerald-300">{activeCount}</strong>
          <span className="text-[10px] text-slate-500 block">يظهر للزبائن</span>
        </div>

        <div 
          onClick={() => setFilterType('hidden')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            filterType === 'hidden' 
              ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-2 ring-amber-500/20' 
              : 'bg-[#0F1626] border-white/10 text-slate-300 hover:border-white/20'
          }`}
        >
          <span className="text-[11px] block font-bold text-amber-400">مخفي مؤقتاً</span>
          <strong className="text-xl sm:text-2xl font-black font-outfit text-amber-300">{hiddenCount}</strong>
          <span className="text-[10px] text-slate-500 block">مخفي بالكتالوج</span>
        </div>

        <div 
          onClick={() => setFilterType('low_stock')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            filterType === 'low_stock' 
              ? 'bg-rose-500/20 border-rose-500 text-rose-300 ring-2 ring-rose-500/20' 
              : 'bg-[#0F1626] border-white/10 text-slate-300 hover:border-white/20'
          }`}
        >
          <span className="text-[11px] block font-bold text-rose-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>قارب على النفاد</span>
          </span>
          <strong className="text-xl sm:text-2xl font-black font-outfit text-rose-300">{lowStockCount}</strong>
          <span className="text-[10px] text-slate-500 block">أقل من 3 قطع بالمخزن</span>
        </div>

        <div 
          onClick={() => setFilterType('preowned')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all col-span-2 sm:col-span-1 ${
            filterType === 'preowned' 
              ? 'bg-blue-500/20 border-blue-500 text-blue-300 ring-2 ring-blue-500/20' 
              : 'bg-[#0F1626] border-white/10 text-slate-300 hover:border-white/20'
          }`}
        >
          <span className="text-[11px] block font-bold text-blue-400">آيفون كسر زيرو</span>
          <strong className="text-xl sm:text-2xl font-black font-outfit text-blue-300">{preownedCount}</strong>
          <span className="text-[10px] text-slate-500 block">ببطاريات أصلية معلنة</span>
        </div>
      </div>

      {/* 2. Control Toolbar */}
      <div className="p-4 rounded-3xl bg-[#0F1626] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto flex-1">
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو الموديل أو السيريال..."
              className="w-full bg-slate-900 border border-white/10 rounded-xl pr-9 pl-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 font-cairo"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          </div>

          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="w-full sm:w-auto bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-cairo cursor-pointer"
          >
            <option value="all">جميع الأقسام</option>
            <option value="smartphones">هواتف ذكية</option>
            <option value="smartwatches">ساعات ذكية</option>
            <option value="audio">سماعات وصوتيات</option>
            <option value="chargers_cables">شواحن وكابلات</option>
            <option value="powerbanks">بنوك طاقة</option>
            <option value="cases_protection">جرابات وحمايات</option>
          </select>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          <button
            onClick={() => exportCatalogToExcel(products)}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition-all flex items-center gap-1.5"
            title="تصدير كشف المخزون بالكامل كملف Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">تصدير إكسل</span>
          </button>

          <button
            onClick={onOpenExcelModal}
            className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>رفع إكسل جماعي</span>
          </button>

          <button
            onClick={onOpenAddProduct}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all shadow-glow-gold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة صنف جديد</span>
          </button>
        </div>
      </div>

      {/* 3. High Density Stock Table */}
      <div className="p-6 rounded-3xl bg-[#0F1626] border border-white/10 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <h3 className="font-black text-sm text-white font-cairo">
              جدول إدارة ومراقبة المخزون الفوري (Neon PostgreSQL)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-outfit">
            عرض {filteredProducts.length} من {totalCount} صنف
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 font-cairo">
                <th className="pb-3 pr-2">المنتج والموديل</th>
                <th className="pb-3 px-3">القسم</th>
                <th className="pb-3 px-3">السعر</th>
                <th className="pb-3 px-3 text-center">الكمية بالمخزن</th>
                <th className="pb-3 px-3 text-center">حالة الظهور (Show/Hide)</th>
                <th className="pb-3 px-3 text-center">الحالة الفنية</th>
                <th className="pb-3 pl-2 text-center">إجراءات سريعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredProducts.slice(0, visibleCount).map((p) => {
                const isPre = p.condition === 'mint' || p.condition === 'used_good';
                const isHidden = p.is_active === false;
                const isLow = (p.stock || 0) < 3;

                return (
                  <tr 
                    key={p.id}
                    className={`hover:bg-white/[0.02] transition-colors ${
                      isHidden ? 'opacity-60 bg-slate-950/40' : ''
                    }`}
                  >
                    {/* Product & SKU */}
                    <td className="py-3 pr-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.images[0] || 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=150&q=80'}
                          alt=""
                          className="w-10 h-10 rounded-xl object-cover border border-white/10 flex-shrink-0"
                        />
                        <div className="space-y-0.5">
                          <strong className="text-white block font-bold truncate max-w-[200px] sm:max-w-xs">
                            {p.name_ar}
                          </strong>
                          <span className="text-[10px] text-slate-500 font-outfit block">
                            SKU: {p.sku || p.id} • {p.brand}
                          </span>
                          {p.catalog_status && <span className={`text-[10px] block ${p.catalog_status === 'estimated' ? 'text-amber-300' : 'text-emerald-300'}`}>
                            {p.catalog_status === 'estimated' ? 'تفاصيل تقديرية / صور توضيحية' : 'موديل موثق'}
                            {p.source_row ? ` • صف الإكسل ${p.source_row}` : ''}
                          </span>}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-cairo text-[11px] whitespace-nowrap">
                        {p.category}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="py-3 px-3">
                      <strong className="text-amber-400 font-outfit font-black block">
                        {formatPrice(p.price)}
                      </strong>
                      {p.original_price && p.original_price > p.price && (
                        <span className="text-[10px] text-slate-500 line-through font-outfit block">
                          {formatPrice(p.original_price)}
                        </span>
                      )}
                    </td>

                    {/* Stock Quick Adjustment */}
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-white/10">
                        <button
                          onClick={() => handleStockChange(p, -1)}
                          className="w-6 h-6 rounded-lg bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 flex items-center justify-center transition-colors"
                          title="إنقاص قطعة"
                        >
                          <Minus className="w-3 h-3" />
                        </button>

                        {editingStockId === p.id ? (
                          <input
                            type="number"
                            autoFocus
                            value={tempStock}
                            onChange={(e) => setTempStock(parseInt(e.target.value) || 0)}
                            onBlur={() => handleSaveStockInput(p)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveStockInput(p); }}
                            className="w-12 bg-black text-amber-300 text-center font-outfit font-black text-xs rounded border border-amber-400 focus:outline-none"
                          />
                        ) : (
                          <span
                            onClick={() => { setEditingStockId(p.id); setTempStock(p.stock || 0); }}
                            className={`min-w-8 text-center font-outfit font-black cursor-pointer hover:underline ${
                              isLow ? 'text-rose-400 font-extrabold animate-pulse' : 'text-white'
                            }`}
                            title="انقر لتعديل الرقم يدوياً"
                          >
                            {p.stock}
                          </span>
                        )}

                        <button
                          onClick={() => handleStockChange(p, 1)}
                          className="w-6 h-6 rounded-lg bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-400 text-slate-400 flex items-center justify-center transition-colors"
                          title="زيادة قطعة"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      {isLow && (
                        <span className="block text-[9px] text-rose-400 font-bold mt-1">
                          تنبيه: قارب على النفاد!
                        </span>
                      )}
                    </td>

                    {/* Visibility Switch (Show / Hide in store) */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => toggleProductVisibility(p.id, isHidden)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 mx-auto ${
                          !isHidden
                            ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-sm'
                            : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                        }`}
                        title={!isHidden ? 'انقر لإخفاء المنتج مؤقتاً عن الزوار' : 'انقر لإظهار المنتج وإتاحته للبيع'}
                      >
                        {!isHidden ? (
                          <>
                            <Eye className="w-3.5 h-3.5 text-emerald-400" />
                            <span>معروض للبيع</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                            <span>مخفي مؤقتاً</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Technical State / Battery */}
                    <td className="py-3 px-3 text-center">
                      {isPre ? (
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 font-cairo text-[10px]">
                          <Smartphone className="w-3 h-3 text-blue-400" />
                          <span>كسر زيرو ({p.battery_health ? `${p.battery_health}%` : '85%-97%'})</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px]">
                          {p.condition === 'unknown' ? 'غير محددة' : 'جديد متبرشم'}
                        </span>
                      )}
                    </td>

                    {/* Quick Row Actions */}
                    <td className="py-3 pl-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onOpenEditProduct(p)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-blue-500/20 text-slate-300 hover:text-blue-400 transition-colors"
                          title="تعديل التفاصيل"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => duplicateProduct(p.id)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400 transition-colors"
                          title="تكرار الصنف"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`هل أنت متأكد من حذف المنتج: ${p.name_ar}؟`)) {
                              deleteProduct(p.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {visibleCount < filteredProducts.length && <button onClick={() => setVisibleCount(count => count + 50)}
            className="m-4 rounded-xl bg-white/10 px-5 py-2 text-sm text-white">عرض المزيد ({Math.min(visibleCount, filteredProducts.length)} / {filteredProducts.length})</button>}
        </div>
      </div>
    </div>
  );
};
