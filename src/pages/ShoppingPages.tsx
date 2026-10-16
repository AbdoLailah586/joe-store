import React, { useMemo, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { ProductCard } from '../components/ProductCard';
import { categoryLabels, parseReportNumber } from '../utils/inventoryReports';
import { readStoredJson, writeStoredJson } from '../utils/browserStorage';
import { canPurchaseProduct } from '../utils/amazonEnricher';
import { matchesFinder, pageSlice } from '../utils/storeExpansion';
import { Pagination } from '../components/Pagination';
const field = 'rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm w-full text-slate-900';
type Preferences = { category: string; budget: string; brand: string };
const defaults: Preferences = { category: 'all', budget: '', brand: 'all' };
export function ShoppingPages({ mode }: { mode: 'brands' | 'finder' | 'help' | 'contact' | 'bundles' }) {
  const { products, settings, navigate, addToCart, cart, setIsCartOpen, isCatalogLoading, isCatalogReadyForReports } = useStore();
  const { formatPrice } = useLanguage();
  const [query, setQuery] = useState(''), [notice, setNotice] = useState(''), [page, setPage] = useState(1);
  const [preferences, setPreferences] = useState<Preferences>(() => readStoredJson('joe_shopping_preferences', defaults, (v): v is Preferences => !!v && typeof v === 'object' && ['category','budget','brand'].every(k => typeof (v as any)[k] === 'string')));
  const [chosen, setChosen] = useState<string[]>([]);
  const active = useMemo(() => products.filter(p => p.is_active !== false), [products]);
  const brands = [...new Set(active.map(p => p.brand).filter(b => b && b !== 'غير محدد'))].sort();
  const update = (key: keyof Preferences, value: string) => { setPreferences(p => ({ ...p, [key]: value })); setPage(1); };
  const titles = { brands: 'تسوّق حسب الماركة', finder: 'اختار المنتج المناسب لك', bundles: 'جمّع باقتك', help: 'مركز المساعدة', contact: 'زورنا وتواصل معنا' };
  const budget = parseReportNumber(preferences.budget) ?? Number.NaN;
  const validBudget = !preferences.budget.trim() || Number.isFinite(budget) && budget > 0;
  const suggested = active.filter(p => canPurchaseProduct(p) && (preferences.category === 'all' || p.category === preferences.category) && (preferences.brand === 'all' || p.brand === preferences.brand) && (!preferences.budget.trim() || validBudget && p.price <= budget) && matchesFinder([p.name_ar,p.name_en,p.brand].join(' '),query));
  const slice = pageSlice(suggested, page, 24);
  const selected = active.filter(p => chosen.includes(p.id));
  const total = selected.reduce((n,p) => n+p.price,0);
  const addBundle = () => {
    if (!selected.length || selected.some(p => !canPurchaseProduct(p) || cart.filter(i => i.product.id === p.id).reduce((n,i) => n+i.quantity,0)+1 > p.stock)) { setNotice('راجع توافر المنتجات والكميات الموجودة بالفعل في سلتك.'); return; }
    selected.forEach(p => addToCart(p,1)); setChosen([]); setIsCartOpen(true);
  };
  const faqs = [
    ['إزاي أختار المنتج؟','استخدم الأقسام والماركات والفلاتر، أو مساعد الشراء لتحديد النوع والميزانية. التوافق الفني والموديل يُراجعان مع المحل عند الحاجة.'],
    ['إزاي أتتبع طلبي؟','افتح تتبع الطلب واكتب رقم الطلب أو رقم الهاتف المسجل. تقدر تراجع الطلبات المرتبطة بحسابك من سجل المشتريات.'],
    ['إيه طرق الدفع المتاحة؟','الدفع عند الاستلام، InstaPay وفودافون كاش حسب خيارات إتمام الطلب. إيصال التحويل يراجعه المحل قبل تأكيد الدفع.'],
    ['رسوم الشحن كام؟',`رسوم الشحن تظهر في إتمام الطلب بعد اختيار المحافظة. الرسوم الافتراضية الحالية ${formatPrice(settings.shipping_fee_default)}.${settings.free_shipping_threshold > 0 ? ` الشحن المجاني من ${formatPrice(settings.free_shipping_threshold)} حسب إعدادات المتجر.` : ''}`],
    ['إزاي أعرف الضمان؟','راجع تفاصيل ضمان المنتج وتأكد من المحل من المدة ونطاق التغطية قبل الشراء. تفاصيل الأصناف التقديرية تحتاج تأكيدًا من المحل.'],
    ['الصورة مكتوب عليها توضيحية، يعني إيه؟','الصورة تمثل نوع المنتج وقد لا تطابق القطعة الفعلية بالكامل. تواصل مع المحل لطلب صورة وموديل القطعة المتاحة.'],
    ['السعر غير موجود، أعمل إيه؟','استخدم زر الاستفسار عن السعر. المنتج غير المسعر لا يمكن إضافته للشراء حتى يحدد المحل سعره.'],
    ['إزاي أراجع الاستبدال أو الإلغاء؟','تواصل مع المحل برقم الطلب وحالة المنتج لمعرفة الإجراء المناسب. يمكن متابعة حالة الطلب من حسابك.'],
  ];
  return <div className="max-w-7xl mx-auto px-4 py-8 space-y-6"><div><button onClick={() => navigate('home')} className="text-xs text-slate-500 mb-3 hover:underline">الرئيسية / جو ستور</button><h1 className="text-2xl sm:text-3xl font-black">{titles[mode]}</h1></div>
    {['brands', 'finder', 'bundles'].includes(mode) && !isCatalogLoading && !isCatalogReadyForReports && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">تعذر تحديث الكتالوج الحالي. المعروض نسخة محلية مؤقتة؛ حدّث الصفحة بعد التأكد من الاتصال للحصول على أحدث المنتجات والأسعار.</p>}
    {mode === 'brands' && <><p className="text-slate-600 text-sm">كل الماركات المسجلة في الكتالوج، وعدد المنتجات المعروضة لكل ماركة.</p><input aria-label="بحث عن ماركة" className={`${field} max-w-xl`} placeholder="ابحث عن Anker أو Oraimo…" value={query} onChange={e => setQuery(e.target.value)} /><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">{brands.filter(b => matchesFinder(b,query)).map(b => <button key={b} onClick={() => navigate('catalog',undefined,{category:'all',search:b})} className="bg-white border border-slate-200 rounded-2xl p-5 text-start hover:border-amber-400"><span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 font-black flex items-center justify-center mb-3">{b.slice(0,2).toUpperCase()}</span><strong className="block">{b}</strong><span className="text-xs text-slate-500">{active.filter(p=>p.brand===b).length} منتج</span></button>)}</div></>}
    {(mode === 'finder' || mode === 'bundles') && <>
      <p className="text-sm text-slate-600">{mode === 'finder' ? 'حدد نوع المنتج والميزانية؛ نعرض لك اختيارات متاحة من كتالوج المحل بدون افتراض مواصفات غير مسجلة.' : 'اختار من 2 إلى 4 منتجات واجمعها في سلة واحدة. الإجمالي هو مجموع الأسعار الحالية، والتوافق بين القطع يحتاج تأكيدك.'}</p>
      <div className="bg-white border border-slate-200 rounded-2xl p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4"><label className="text-sm">بتدور على إيه؟<select className={`${field} mt-2`} value={preferences.category} onChange={e=>update('category',e.target.value)}><option value="all">كل الأقسام</option>{Object.entries(categoryLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label className="text-sm">الميزانية القصوى للقطعة<input className={`${field} mt-2`} inputMode="decimal" value={preferences.budget} placeholder="بدون حد" onChange={e=>update('budget',e.target.value)} /></label><label className="text-sm">الماركة<select className={`${field} mt-2`} value={preferences.brand} onChange={e=>update('brand',e.target.value)}><option value="all">كل الماركات</option>{brands.map(b=><option key={b}>{b}</option>)}</select></label><label className="text-sm">بحث إضافي<input className={`${field} mt-2`} value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} placeholder="اسم أو موديل" /></label>
        {mode === 'finder' && <button className="rounded-xl px-4 py-3 bg-amber-500 text-black font-bold text-sm" onClick={()=>setNotice(writeStoredJson('joe_shopping_preferences',preferences) ? 'تم حفظ اختياراتك في هذا المتصفح.' : 'تعذر حفظ اختياراتك في المتصفح.')} disabled={!validBudget}>حفظ اختياراتي</button>}</div>
      {!validBudget && <p role="alert" className="text-rose-700">اكتب ميزانية صحيحة أكبر من صفر، أو اتركها فارغة.</p>}
      {mode === 'bundles' && <div className="sticky z-20 bg-white border border-amber-300 rounded-2xl p-4 flex flex-wrap justify-between items-center gap-3" style={{top:'calc(var(--store-header-height,160px) + 8px)'}}><div><strong>{selected.length} منتجات • {formatPrice(total)}</strong><p className="text-xs text-slate-500 mt-1">{selected.map(p=>p.name_ar).join(' + ') || 'علّم على المنتجات أسفل البطاقات'}</p></div><button disabled={selected.length < 2 || selected.length > 4} onClick={addBundle} className="bg-amber-500 text-black rounded-xl px-4 py-3 font-bold text-sm disabled:opacity-40">إضافة الباقة للسلة</button></div>}
      <p className="text-sm text-slate-500">{isCatalogLoading ? 'جارٍ تحميل المنتجات…' : `${suggested.length} اختيار متاح`}</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{validBudget && slice.rows.map(p=><div key={p.id} className="min-w-0"><ProductCard product={p} />{mode === 'bundles' && <label className="flex gap-2 text-sm p-3 bg-white border border-slate-200 rounded-xl mt-2"><input type="checkbox" checked={chosen.includes(p.id)} disabled={!chosen.includes(p.id)&&chosen.length>=4} onChange={e=>setChosen(prev=>e.target.checked?[...prev,p.id]:prev.filter(id=>id!==p.id))} />إضافة لاختيارات الباقة</label>}</div>)}</div>
      {!suggested.length && !isCatalogLoading && <p className="text-slate-600 bg-white border border-slate-200 p-8 rounded-2xl">لا توجد اختيارات بهذه الشروط. جرّب ميزانية أعلى أو ماركة أخرى.</p>}
      <Pagination page={slice.page} pages={slice.pages} onChange={setPage} />
    </>}
    {mode === 'help' && <><div className="flex flex-wrap gap-3">{[['track-order','تتبع طلبي'],['profile','حسابي وطلباتي'],['contact','التواصل مع المحل']].map(([key,label])=><button key={key} onClick={()=>navigate(key as any)} className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold">{label}</button>)}</div><div className="max-w-3xl space-y-3">{faqs.map(([q,a])=><details key={q} className="bg-white border border-slate-200 rounded-2xl p-5"><summary className="cursor-pointer font-bold">{q}</summary><p className="mt-3 text-sm text-slate-600 leading-7">{a}</p></details>)}</div></>}
    {mode === 'contact' && <div className="grid md:grid-cols-2 gap-5"><section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"><h2 className="font-bold text-lg">{settings.store_name_ar}</h2><p className="text-slate-600">{settings.store_address_ar}</p><p className="text-sm">المواعيد: {settings.working_hours_ar}</p><a className="block text-amber-800 font-bold" href={`tel:${settings.store_phone}`}>{settings.store_phone}</a><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.store_address_ar)}`} target="_blank" rel="noreferrer" className="inline-block rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold">فتح العنوان على الخريطة</a></section><section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"><h2 className="font-bold text-lg">استفسار عن منتج أو طلب</h2><p className="text-sm text-slate-600">جهّز اسم الموديل أو كود الصنف أو رقم الطلب عشان نقدر نساعدك أسرع.</p><a className="inline-block rounded-xl bg-emerald-700 text-white text-on-brand px-4 py-3 font-bold text-sm" href={`https://wa.me/${settings.store_whatsapp.replace(/[^0-9]/g,'')}`} target="_blank" rel="noreferrer">فتح واتساب المحل</a><button onClick={()=>navigate('track-order')} className="block text-amber-800 font-bold text-sm">تتبع طلب مسجل ←</button></section></div>}
    {notice && <p role="status" className="rounded-xl p-4 bg-amber-50 text-amber-900 text-sm">{notice}</p>}
  </div>;
}
