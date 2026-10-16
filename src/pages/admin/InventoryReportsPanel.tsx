import React, { useMemo, useState } from 'react';
import { Download, SlidersHorizontal, RotateCcw, Save, FileSpreadsheet } from 'lucide-react';
import type { Product } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { readStoredArray, writeStoredJson } from '../../utils/browserStorage';
import { categoryLabels, defaultInventoryFilters, defaultReportColumns, InventoryFilters, inventorySummary,
  inventoryCategorySummary, inventoryFilterDescription, isSavedInventoryReport, reportColumns, reportOptions, SavedInventoryReport } from '../../utils/inventoryReports';

const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200';
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed';
const savedKey = 'joe_inventory_report_templates_v1';
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="block space-y-1.5 min-w-0"><span className="text-xs font-bold text-slate-700">{label}</span>{children}</label>;

interface Props {
  products: Product[]; rows: Product[]; filters: InventoryFilters; onChange: (value: InventoryFilters) => void;
  errors: string[]; loading: boolean; ready: boolean;
}
export function InventoryReportsPanel({ products, rows, filters, onChange, errors, loading, ready }: Props) {
  const { formatPrice } = useLanguage();
  const [columns, setColumns] = useState(defaultReportColumns);
  const [title, setTitle] = useState('تقرير المخزون');
  const [saved, setSaved] = useState(() => readStoredArray(savedKey, isSavedInventoryReport));
  const [notice, setNotice] = useState('');
  const [exporting, setExporting] = useState(false);
  const summary = useMemo(() => inventorySummary(rows), [rows]);
  const groups = useMemo(() => inventoryCategorySummary(rows), [rows]);
  const brands = useMemo(() => [...new Set(products.map(p => p.brand?.trim() || 'غير محدد'))].sort((a, b) => a.localeCompare(b, 'ar')), [products]);
  const categories = useMemo(() => [...new Set(products.map(p => p.category))].sort(), [products]);
  const update = (key: keyof InventoryFilters, value: string) => { onChange({ ...filters, [key]: value }); setNotice(''); };
  const select = (key: keyof InventoryFilters, label: string, options: Record<string, string>) => <Field label={label}>
    <select className={inputClass} value={filters[key]} onChange={e => update(key, e.target.value)}>{Object.entries(options).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select>
  </Field>;
  const preset = (name: string, changes: Partial<InventoryFilters>) => { onChange({ ...defaultInventoryFilters, ...changes }); setTitle(name); setNotice(''); };
  const save = () => {
    const name = title.trim();
    if (!name || errors.length || !columns.length) { setNotice('اكتب اسم التقرير، وصحح الشروط، واختر عمودًا واحدًا على الأقل.'); return; }
    const entry: SavedInventoryReport = { id: String(Date.now()), name, filters: { ...filters }, columns: [...columns] };
    const next = [entry, ...saved.filter(s => s.name !== name)].slice(0, 20);
    if (writeStoredJson(savedKey, next)) { setSaved(next); setNotice('تم حفظ شروط التقرير وأعمدته في هذا المتصفح. النتائج تُحسب من البيانات الحالية عند فتحه.'); }
    else setNotice('تعذر الحفظ في المتصفح. يمكنك تنزيل التقرير الآن.');
  };
  const download = async (format: 'xlsx' | 'csv') => {
    if (!ready || loading || errors.length || !rows.length || !columns.length || exporting) return;
    setExporting(true); setNotice('');
    try {
      const { downloadInventoryReport } = await import('../../utils/inventoryReportExport');
      downloadInventoryReport(rows, filters, columns, title.trim() || 'تقرير المخزون', format);
      setNotice(`تم تجهيز تقرير يضم ${rows.length} صنفًا للتنزيل.`);
    } catch { setNotice('تعذر تجهيز الملف. جرّب التنزيل مرة أخرى.'); }
    finally { setExporting(false); }
  };
  return <section aria-label="تقارير المخزون" className="space-y-5">
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
      <div><h2 className="text-xl font-black text-slate-900 flex items-center gap-2"><SlidersHorizontal className="w-5 h-5 text-amber-700" />تقارير المخزون حسب اختيارك</h2>
        <p className="text-sm text-slate-600 mt-2">اجمع أكثر من شرط، راجع الإحصائيات، ونزّل كل النتائج المطابقة. إجمالي المخزون: {products.length} صنف.</p></div>
      <button type="button" className={buttonClass} onClick={() => preset('تقرير المخزون', {})}><RotateCcw className="w-4 h-4" />مسح الفلاتر</button>
    </div>

    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
      <div><h3 className="text-sm font-bold text-slate-900 mb-2">ابدأ بتقرير جاهز ثم عدّل شروطه</h3>
        <div className="flex flex-wrap gap-2">
          <button className={buttonClass} onClick={() => preset('كل المخزون', {})}>كل المخزون</button>
          <button className={buttonClass} onClick={() => preset('المخزون النافد', { stockOp: 'eq', stockValue: '0', sort: 'name' })}>مخزون صفر</button>
          <button className={buttonClass} onClick={() => preset('المخزون أقل من الحد', { stockOp: 'lt', stockValue: '3', sort: 'stock_asc' })}>أقل من حد تختاره</button>
          <button className={buttonClass} onClick={() => preset('أرصدة سالبة للمراجعة', { stockOp: 'lt', stockValue: '0', sort: 'stock_asc' })}>أرصدة سالبة</button>
          <button className={buttonClass} onClick={() => preset('مراجعة بيانات المنتجات والصور', { details: 'needs_review' })}>بيانات أو صور للمراجعة</button>
          <button className={buttonClass} onClick={() => preset('الصور التوضيحية', { images: 'illustrative' })}>صور توضيحية</button>
          <button className={buttonClass} onClick={() => preset('بدون سعر بيع', { priceStatus: 'missing' })}>بدون سعر</button>
          <button className={buttonClass} onClick={() => preset('بدون رابط صورة', { images: 'missing' })}>بدون صورة</button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Field label="بحث بالاسم أو الموديل أو الكود"><input className={inputClass} value={filters.search} onChange={e => update('search', e.target.value)} placeholder="اسم المنتج أو الاسم الأصلي في الإكسل" /></Field>
        {select('category', 'القسم', { all: 'كل الأقسام', ...Object.fromEntries(categories.map(c => [c, categoryLabels[c] || c])) })}
        {select('brand', 'الماركة', { all: 'كل الماركات', ...Object.fromEntries(brands.map(b => [b, b])) })}
        {select('visibility', 'الظهور في المتجر', reportOptions.visibility)}
        {select('stockOp', 'شرط كمية المخزون', reportOptions.stockOp)}
        {filters.stockOp !== 'all' && <Field label={filters.stockOp === 'between' ? 'الكمية من' : 'قيمة شرط المخزون'}><input className={inputClass} inputMode="numeric" value={filters.stockValue} onChange={e => update('stockValue', e.target.value)} /></Field>}
        {filters.stockOp === 'between' && <Field label="الكمية إلى"><input className={inputClass} inputMode="numeric" value={filters.stockMax} onChange={e => update('stockMax', e.target.value)} /></Field>}
        <Field label="سعر البيع من (جنيه)"><input className={inputClass} inputMode="decimal" value={filters.minPrice} onChange={e => update('minPrice', e.target.value)} placeholder="بلا حد" /></Field>
        <Field label="سعر البيع إلى (جنيه)"><input className={inputClass} inputMode="decimal" value={filters.maxPrice} onChange={e => update('maxPrice', e.target.value)} placeholder="بلا حد" /></Field>
        {select('details', 'حالة التفاصيل', reportOptions.details)}
        {select('images', 'حالة الصور', reportOptions.images)}
        {select('priceStatus', 'حالة سعر البيع', reportOptions.priceStatus)}
        {select('costStatus', 'حالة سعر التكلفة', reportOptions.costStatus)}
        {select('condition', 'حالة المنتج', reportOptions.condition)}
        {select('sort', 'ترتيب النتائج', reportOptions.sort)}
      </div>
      <p className="text-xs text-slate-600">الشروط تعمل معًا. «أقل من» يشمل الصفر والأرصدة السالبة؛ «مخزون صفر» يطابق الصفر فقط. مراجعة البيانات تشمل التفاصيل غير الموثقة والصور التوضيحية أو المفقودة.</p>
      {errors.length > 0 && <div role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{errors.join(' ')}</div>}
    </div>

    <div aria-live="polite" className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {[
        ['الأصناف المطابقة', summary.count, `من ${products.length} صنف`],
        ['القطع المتاحة', summary.units, 'مجموع الكميات الموجبة'],
        ['أصناف مخزونها صفر', summary.zero, `${summary.negative} صنف برصيد سالب`],
        ['تحتاج مراجعة', summary.review, `${summary.illustrative} بصور توضيحية`],
        ['قيمة المخزون بالتكلفة', formatPrice(summary.costCents / 100), `${summary.unvaluedUnits} قطعة بدون تكلفة موجبة`],
        ['قيمة المخزون بسعر البيع', formatPrice(summary.sellingCents / 100), `${summary.unpricedUnits} قطعة بدون سعر موجب`],
        ['بدون سعر بيع صالح', summary.missingPrice, 'سعر غير مسجل أو غير موجب'],
        ['بدون رابط صورة', summary.missingImage, 'حسب روابط الصور المسجلة'],
      ].map(([label, value, note]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 min-w-0">
        <span className="block text-xs text-slate-600 font-bold">{label}</span><strong className="block mt-1 text-xl font-black text-slate-900 break-words">{loading ? '…' : value}</strong><span className="block text-xs text-slate-500 mt-1">{note}</span>
      </div>)}
    </div>
    <p className="text-xs text-slate-600">الإحصائيات تخص النتائج المطابقة فقط. القيم المالية تخص الكميات الموجبة والأسعار المسجلة؛ قيمة البيع ليست مبيعات أو أرباحًا محققة.{summary.unknownStock > 0 && ` يوجد ${summary.unknownStock} صنف بلا كمية مسجلة.`}</p>

    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1"><Field label="اسم التقرير"><input className={inputClass} maxLength={80} value={title} onChange={e => setTitle(e.target.value)} /></Field></div>
        <button className={buttonClass} onClick={save} disabled={!!errors.length || !columns.length}><Save className="w-4 h-4" />حفظ الشروط</button>
        <button onClick={() => download('xlsx')} disabled={!ready || loading || exporting || !!errors.length || !rows.length || !columns.length} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2.5 font-bold text-sm text-white text-on-brand disabled:opacity-50 disabled:cursor-not-allowed"><FileSpreadsheet className="w-4 h-4" />{exporting ? 'جارٍ التجهيز…' : `تنزيل Excel (${rows.length})`}</button>
        <button className={buttonClass} onClick={() => download('csv')} disabled={!ready || loading || exporting || !!errors.length || !rows.length || !columns.length}><Download className="w-4 h-4" />CSV للأصناف</button>
      </div>
      <p className="text-xs text-slate-600">Excel يشمل ملخصًا بالإحصائيات والفلاتر والقيم حسب القسم، وورقة بكل الأصناف المطابقة. CSV يشمل أعمدة الأصناف المختارة فقط. الحفظ في هذا المتصفح، بحد أقصى 20 تقريرًا؛ نفس الاسم يستبدل شروطه السابقة.</p>
      {saved.length > 0 && <div className="flex flex-col sm:flex-row gap-2 items-start">
        <Field label="فتح تقرير محفوظ"><select className={inputClass} value="" onChange={e => { const s = saved.find(item => item.id === e.target.value); if (s) { onChange({ ...s.filters }); setColumns([...s.columns]); setTitle(s.name); setNotice('تم تطبيق الشروط المحفوظة على بيانات المخزون الحالية.'); } }}><option value="">اختر تقريرًا محفوظًا</option>{saved.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
      </div>}
      <details className="border-t border-slate-200 pt-3"><summary className="cursor-pointer font-bold text-sm text-slate-800">أعمدة الملف ({columns.length} عمودًا)</summary>
        <div className="flex gap-2 my-3"><button className={buttonClass} onClick={() => setColumns(reportColumns.map(c => c.key))}>اختيار الكل</button><button className={buttonClass} onClick={() => setColumns(defaultReportColumns)}>الأعمدة الأساسية</button></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">{reportColumns.map(c => <label key={c.key} className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={columns.includes(c.key)} onChange={e => setColumns(prev => e.target.checked ? [...prev, c.key] : prev.filter(key => key !== c.key))} className="accent-amber-600 w-4 h-4" />{c.label}</label>)}</div>
        {!columns.length && <p role="alert" className="text-rose-700 text-sm mt-3">اختر عمودًا واحدًا على الأقل لتنزيل التقرير.</p>}
      </details>
      {notice && <p role="status" className="text-sm text-slate-800 bg-slate-100 rounded-xl p-3">{notice}</p>}
      {loading && <p role="status" className="text-sm text-slate-600">جارٍ تحميل المخزون قبل إتاحة التنزيل…</p>}
      {!loading && !ready && <p role="alert" className="text-sm text-rose-800 bg-rose-50 rounded-xl p-3">لم يكتمل تحميل المخزون الحالي. المعروض نسخة محلية وقد تكون ناقصة. أعد تحميل الصفحة بعد التأكد من الاتصال لتنزيل تقرير مكتمل.</p>}
    </div>
    {groups.length > 0 && !loading && <details className="rounded-2xl border border-slate-200 p-4 bg-white"><summary className="cursor-pointer text-sm font-bold text-slate-800">إحصائيات النتائج حسب القسم</summary>
      <div className="overflow-x-auto mt-3"><table className="w-full text-right text-sm"><thead><tr className="text-slate-600 border-b border-slate-200">{['القسم', 'الأصناف', 'القطع المتاحة', 'مخزون صفر', 'قيمة التكلفة', 'قيمة البيع'].map(h => <th key={h} className="p-2 whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{groups.map(g => <tr key={g.category} className="border-b border-slate-100"><td className="p-2 whitespace-nowrap">{g.category}</td><td className="p-2">{g.count}</td><td className="p-2">{g.units}</td><td className="p-2">{g.zero}</td><td className="p-2 whitespace-nowrap">{formatPrice(g.costCents / 100)}</td><td className="p-2 whitespace-nowrap">{formatPrice(g.sellingCents / 100)}</td></tr>)}</tbody>
      </table></div>
    </details>}
    <p className="text-xs text-slate-500">شروط المخزون الحالية: {inventoryFilterDescription(filters).find(([label]) => label === 'شرط المخزون')?.[1]}</p>
  </section>;
}
