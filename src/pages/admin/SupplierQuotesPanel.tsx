import React, { useEffect, useState } from 'react';
import { Boxes, Search } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { neonDb } from '../../services/neonDb';
import { matchesFinder } from '../../utils/storeExpansion';
import { InfoButton } from '../../components/DetailsDialog';

const input = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900';
const button = 'rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40';
const box = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';

export const SupplierQuotesPanel: React.FC = () => {
  const { products } = useStore();
  const { formatPrice } = useLanguage();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [quotes, setQuotes] = useState<any[]>([]);
  const [supplierName, setSupplierName] = useState('');
  const [price, setPrice] = useState('');
  const [notice, setNotice] = useState('');

  const selected = products.find(p => p.id === selectedId);
  const matches = search.trim() ? products.filter(p => matchesFinder([p.name_ar, p.name_en, p.sku, p.brand].join(' '), search)).slice(0, 30) : [];

  const loadQuotes = async (productId: string) => setQuotes(await neonDb.getSupplierQuotes(productId));
  useEffect(() => { if (selectedId) loadQuotes(selectedId); }, [selectedId]);

  const addQuote = async () => {
    const value = Number(price);
    if (!selectedId || !supplierName.trim() || !Number.isFinite(value) || value <= 0) { setNotice('اختاري صنفًا واكتبي اسم المورد وسعرًا صحيحًا أكبر من صفر.'); return; }
    const ok = await neonDb.addSupplierQuote(selectedId, supplierName.trim(), value, user ? { id: user.id } : undefined);
    if (!ok) { setNotice('تعذر حفظ عرض المورد.'); return; }
    setSupplierName(''); setPrice(''); setNotice('');
    await loadQuotes(selectedId);
  };

  return <div className="space-y-4 font-cairo">
    <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
      سجل يدوي لمقارنة عروض أسعار الموردين لكل صنف مقابل تكلفته الحالية المسجلة — لا يوجد مفهوم طلبات شراء في قاعدة البيانات الحالية بعد.
    </p>
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4">
      <div className={box}>
        <h3 className="font-bold flex items-center gap-2 mb-3"><Search className="w-4 h-4 text-amber-700" />اختيار الصنف</h3>
        <input className={input} value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحثي بالاسم أو الكود أو الماركة" />
        <div className="mt-2 max-h-72 overflow-auto space-y-1">
          {matches.map(p => <button key={p.id} onClick={() => { setSelectedId(p.id); setSearch(''); }} className={`${button} w-full text-right block`}>
            {p.name_ar} <span className="text-slate-400 text-xs">({p.sku || p.id})</span>
          </button>)}
        </div>
      </div>
      <div className={box}>
        {!selected ? <p className="text-slate-500 text-sm">اختاري صنفًا من القائمة لعرض ومقارنة عروض الموردين.</p> : <div className="space-y-4">
          <div><h3 className="font-bold flex items-center gap-2"><Boxes className="w-4 h-4 text-amber-700" />{selected.name_ar}</h3>
            <p className="text-xs text-slate-500 mt-1">التكلفة الحالية المسجلة: {selected.cost_price != null ? formatPrice(selected.cost_price) : 'غير محددة'}</p></div>
          <div className="grid sm:grid-cols-[1fr_140px_auto] gap-2">
            <input className={input} value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="اسم المورد" />
            <input className={input} inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} placeholder="السعر المعروض" />
            <button className={button} onClick={addQuote}>إضافة عرض</button>
          </div>
          {notice && <p role="alert" className="text-rose-700 text-xs">{notice}</p>}
          {!quotes.length ? <p className="text-slate-500 text-sm">لا توجد عروض مسجلة لهذا الصنف بعد.</p> : <table className="w-full text-right text-xs">
            <thead className="text-slate-500 border-b border-slate-200"><tr><th className="p-2">المورد</th><th className="p-2">السعر</th><th className="p-2">مقابل التكلفة الحالية</th><th className="p-2">التاريخ</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{quotes.map(q => {
              const diff = selected.cost_price != null ? Number(q.quoted_price) - selected.cost_price : null;
              return <tr key={q.id}><td className="p-2 font-bold"><InfoButton details={{ title: `عرض المورد: ${q.supplier_name}`, description: 'عرض سعر مسجل للمقارنة، وليس طلب شراء أو التزامًا بالدفع.', facts: [{ label: 'الصنف', value: selected.name_ar }, { label: 'السعر المعروض', value: formatPrice(q.quoted_price) }, { label: 'التكلفة الحالية المسجلة', value: selected.cost_price > 0 ? formatPrice(selected.cost_price) : 'غير محددة' }, { label: 'تاريخ العرض', value: new Date(q.quoted_at).toLocaleString('ar-EG') }] }}>{q.supplier_name}</InfoButton></td><td className="p-2 font-outfit"><InfoButton details={{ title: `تفاصيل سعر ${q.supplier_name}`, description: 'هذا هو سعر القطعة المسجل في عرض المورد. لا يغيّر تكلفة الصنف أو سعر بيعه.', facts: [{ label: 'السعر', value: formatPrice(q.quoted_price) }, { label: 'الفرق عن التكلفة الحالية', value: diff === null ? 'التكلفة غير محددة' : formatPrice(diff) }] }}>{formatPrice(q.quoted_price)}</InfoButton></td>
                <td className={`p-2 font-outfit ${diff != null && diff < 0 ? 'text-emerald-700' : diff != null && diff > 0 ? 'text-rose-700' : ''}`}>{diff != null ? (diff <= 0 ? `أوفر بـ ${formatPrice(Math.abs(diff))}` : `أغلى بـ ${formatPrice(diff)}`) : '-'}</td>
                <td className="p-2 text-slate-500 whitespace-nowrap">{new Date(q.quoted_at).toLocaleDateString('ar-EG')}</td></tr>;
            })}</tbody>
          </table>}
        </div>}
      </div>
    </div>
  </div>;
};
