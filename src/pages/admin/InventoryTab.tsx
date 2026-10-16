import React, { useState, useMemo, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  Plus,
  Minus,
  Layers,
  FileSpreadsheet,
  Edit,
  Trash2,
  Copy,
  Smartphone
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { Product } from '../../types';
import { InventoryReportsPanel } from './InventoryReportsPanel';
import { categoryLabels, defaultInventoryFilters, filterInventory, validateInventoryFilters, detailsLabel, imageLabel } from '../../utils/inventoryReports';

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
  const { products, isCatalogLoading, isCatalogReadyForReports, toggleProductVisibility, updateProduct, deleteProduct, duplicateProduct } = useStore();
  const { formatPrice } = useLanguage();

  const [filters, setFilters] = useState({ ...defaultInventoryFilters });
  const [visibleCount, setVisibleCount] = useState(50);
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [tempStock, setTempStock] = useState<number>(0);
  const totalCount = products.length;
  const errors = useMemo(() => validateInventoryFilters(filters), [filters]);
  const filteredProducts = useMemo(() => filterInventory(products, filters), [products, filters]);
  useEffect(() => setVisibleCount(50), [filters]);

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
      <InventoryReportsPanel products={products} rows={filteredProducts} filters={filters} onChange={setFilters} errors={errors} loading={isCatalogLoading} ready={isCatalogReadyForReports} />
      <div className="flex flex-wrap gap-2">
        <button onClick={onOpenExcelModal} className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-sm font-bold flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" />رفع إكسل جماعي</button>
        <button onClick={onOpenAddProduct} className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4" />إضافة صنف جديد</button>
      </div>

      {/* 3. High Density Stock Table */}
      <div className="p-3 sm:p-6 rounded-3xl bg-white border border-slate-200 overflow-hidden">
        <div className="flex flex-wrap gap-2 items-center justify-between pb-4 border-b border-slate-200 mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-700" />
            <h3 className="font-black text-sm text-slate-900 font-cairo">
              الأصناف المطابقة للتقرير
            </h3>
          </div>
          <span className="text-xs text-slate-600 font-outfit">
            عرض {Math.min(visibleCount, filteredProducts.length)} من {filteredProducts.length} نتيجة • الإجمالي {totalCount}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 font-cairo">
                <th className="pb-3 pr-2">المنتج والموديل</th>
                <th className="pb-3 px-3">القسم</th>
                <th className="pb-3 px-3">السعر</th>
                <th className="pb-3 px-3 text-center">الكمية بالمخزن</th>
                <th className="pb-3 px-3 text-center">حالة الظهور (Show/Hide)</th>
                <th className="pb-3 px-3 text-center">الحالة الفنية</th>
                <th className="pb-3 pl-2 text-center">إجراءات سريعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {!filteredProducts.length && <tr><td colSpan={7} className="py-12 text-center text-slate-600">{isCatalogLoading ? 'جارٍ تحميل المخزون…' : errors.length ? 'صحح شروط التقرير لعرض النتائج.' : 'لا توجد أصناف مطابقة. جرّب تعديل الفلاتر أو مسحها.'}</td></tr>}
              {filteredProducts.slice(0, visibleCount).map((p) => {
                const isPre = p.condition === 'mint' || p.condition === 'used_good';
                const isHidden = p.is_active === false;
                const isLow = (p.stock ?? 0) <= 0;

                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-white/[0.02] transition-colors ${
                      isHidden ? 'opacity-60 bg-slate-100/40' : ''
                    }`}
                  >
                    {/* Product & SKU */}
                    <td className="py-3 pr-2">
                      <div className="flex items-center gap-3">
                        {p.images?.find(url => url.trim()) ? <img
                          src={p.images.find(url => url.trim())}
                          alt=""
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                        /> : <span className="w-10 h-10 rounded-xl bg-slate-100 text-[9px] text-slate-500 flex items-center justify-center flex-shrink-0">بلا صورة</span>}
                        <div className="space-y-0.5">
                          <strong className="text-slate-900 block font-bold truncate max-w-[200px] sm:max-w-xs">
                            {p.name_ar}
                          </strong>
                          <span className="text-[10px] text-slate-500 font-outfit block">
                            SKU: {p.sku || p.id} • {p.brand}
                          </span>
                          <span className="text-[10px] block text-slate-600">التفاصيل: {detailsLabel(p)} • الصور: {imageLabel(p)}{p.source_row ? ` • صف الإكسل ${p.source_row}` : ''}</span>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-cairo text-[11px] whitespace-nowrap">
                        {categoryLabels[p.category] || p.category}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="py-3 px-3">
                      <strong className="text-amber-700 font-outfit font-black block">
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
                      <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200">
                        <button
                          onClick={() => handleStockChange(p, -1)}
                          className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-rose-500/20 hover:text-rose-700 text-slate-600 flex items-center justify-center transition-colors"
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
                            className="w-12 bg-white text-amber-700 text-center font-outfit font-black text-xs rounded border border-amber-400 focus:outline-none"
                          />
                        ) : (
                          <span
                            onClick={() => { setEditingStockId(p.id); setTempStock(p.stock || 0); }}
                            className={`min-w-8 text-center font-outfit font-black cursor-pointer hover:underline ${
                              isLow ? 'text-rose-700 font-extrabold' : 'text-slate-900'
                            }`}
                            title="انقر لتعديل الرقم يدوياً"
                          >
                            {p.stock}
                          </span>
                        )}

                        <button
                          onClick={() => handleStockChange(p, 1)}
                          className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-emerald-500/20 hover:text-emerald-700 text-slate-600 flex items-center justify-center transition-colors"
                          title="زيادة قطعة"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      {isLow && (
                        <span className="block text-[9px] text-rose-700 font-bold mt-1">
                          {p.stock < 0 ? 'رصيد سالب يحتاج مراجعة' : 'نفد المخزون'}
                        </span>
                      )}
                    </td>

                    {/* Visibility Switch (Show / Hide in store) */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => toggleProductVisibility(p.id, isHidden)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 mx-auto ${
                          !isHidden
                            ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 border border-emerald-500/40 shadow-sm'
                            : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 border border-amber-500/40'
                        }`}
                        title={!isHidden ? 'انقر لإخفاء المنتج مؤقتاً عن الزوار' : 'انقر لإظهار المنتج وإتاحته للبيع'}
                      >
                        {!isHidden ? (
                          <>
                            <Eye className="w-3.5 h-3.5 text-emerald-700" />
                            <span>معروض للبيع</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                            <span>مخفي مؤقتاً</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Technical State / Battery */}
                    <td className="py-3 px-3 text-center">
                      {isPre ? (
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-700 border border-blue-500/30 font-cairo text-[10px]">
                          <Smartphone className="w-3 h-3 text-blue-700" />
                          <span>{p.condition === 'mint' ? 'كسر زيرو' : 'مستعمل'}{p.battery_health != null ? ` (${p.battery_health}%)` : ''}</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px]">
                          {p.condition === 'unknown' ? 'غير محددة' : 'جديد متبرشم'}
                        </span>
                      )}
                    </td>

                    {/* Quick Row Actions */}
                    <td className="py-3 pl-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onOpenEditProduct(p)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-500/20 text-slate-600 hover:text-blue-700 transition-colors"
                          title="تعديل التفاصيل"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => duplicateProduct(p.id)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-500/20 text-slate-600 hover:text-amber-700 transition-colors"
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
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-700 transition-colors"
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
            className="m-4 rounded-xl bg-slate-100 px-5 py-2 text-sm text-slate-900">عرض المزيد ({Math.min(visibleCount, filteredProducts.length)} / {filteredProducts.length})</button>}
        </div>
      </div>
    </div>
  );
};
