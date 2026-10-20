import React, { useEffect, useRef, useState } from 'react';
import { Truck, PackageCheck, Printer, Search } from 'lucide-react';
import { neonDb } from '../../services/neonDb';
import { useAuth } from '../../context/AuthContext';
import type { Order } from '../../types';
import { InfoButton, useDetails } from '../../components/DetailsDialog';
import { orderDetail, orderRows } from '../../utils/detailModels';
import { useLanguage } from '../../context/LanguageContext';

const button = 'rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40';
const box = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';

const REASONS: Record<string, string> = {
  not_available: 'العميل غير متواجد',
  changed_mind: 'العميل عدل عن الطلب',
  price_dispute: 'خلاف على السعر عند الاستلام',
  wrong_item: 'صنف أو مقاس خاطئ',
  delayed: 'تأخر الشحن',
  other: 'سبب آخر'
};

export const FulfillmentPanel: React.FC = () => {
  const { user } = useAuth();
  const { openDetails } = useDetails();
  const { formatPrice } = useLanguage();
  const actor = user ? { id: user.id, name: user.name } : undefined;
  const [tab, setTab] = useState<'packing' | 'delivery' | 'refusals'>('packing');
  const [picking, setPicking] = useState<Order[]>([]);
  const [board, setBoard] = useState<Order[]>([]);
  const [active, setActive] = useState<Order | null>(null);
  const [scan, setScan] = useState('');
  const [scanned, setScanned] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [printed, setPrinted] = useState<Order | null>(null);
  const [refusals, setRefusals] = useState<any[]>([]);
  const [refusalPhone, setRefusalPhone] = useState('');
  const scanInput = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    const [p, d] = await Promise.all([neonDb.getPickingList(), neonDb.getDeliveryBoard()]);
    setPicking(p); setBoard(d);
  };
  useEffect(() => { refresh(); }, []);
  useEffect(() => { if (tab === 'refusals') neonDb.getAllRefusals().then(setRefusals); }, [tab]);

  // Packing-bench keyboard shortcuts: F2 focuses the scan input, F9 confirms packing.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'F2') { event.preventDefault(); scanInput.current?.focus(); }
      else if (event.key === 'F9' && active) { event.preventDefault(); confirmPack(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, scanned]);

  const openOrder = (order: Order) => { setActive(order); setScanned([]); setScan(''); setError(''); };
  const addScan = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || !scan.trim()) return;
    event.preventDefault();
    setScanned(previous => [...previous, scan.trim()]); setScan('');
  };

  const confirmPack = async (override: boolean) => {
    if (!active) return;
    let reason = '';
    if (override) {
      reason = prompt('سبب تجاوز عدم تطابق المسح:') || '';
      if (!reason) { setError('اذكري سبب التجاوز.'); return; }
    }
    const result = await neonDb.confirmPacking(active.id, scanned, { override, reason, actor });
    if (!result.success) {
      if (!override && confirm(`${result.error}\nهل تريدين تجاوز المدير؟`)) { await confirmPack(true); return; }
      setError(result.error || 'تعذر تأكيد التعبئة.');
      return;
    }
    setPrinted(active); setActive(null); setError(''); await refresh();
  };

  const assignCourier = async (order: Order) => {
    const courierName = prompt('اسم المندوب / شركة الشحن:', order.courier_name || '');
    if (courierName === null) return;
    const targetStatus = order.order_status === 'processing' ? 'shipped' : order.order_status;
    const result = await neonDb.updateOrderStatus(order.id, targetStatus, { courierName, actor });
    if (!result.success && result.code === 'PAYMENT_HOLD') {
      const overrideReason = prompt(`${result.error}\nاكتبي سبب التجاوز أو اتركيه فارغًا للإلغاء:`);
      if (overrideReason?.trim()) await neonDb.updateOrderStatus(order.id, 'shipped', { courierName, override: true, overrideReason, actor });
    } else if (!result.success) {
      setError(result.error || 'تعذر التحديث.');
    }
    await refresh();
  };

  const recordRefusal = async (order: Order) => {
    const reasonKey = prompt(`سبب رفض الاستلام (${Object.entries(REASONS).map(([k, v]) => `${k}=${v}`).join(' | ')}):`, 'not_available');
    if (!reasonKey || !REASONS[reasonKey]) { if (reasonKey !== null) alert('اكتبي أحد المفاتيح الموضحة بالضبط.'); return; }
    if (!confirm(`سيتم تسجيل الرفض وإلغاء الطلب #${order.order_number}. متابعة؟`)) return;
    const result = await neonDb.recordDeliveryRefusal(order.id, reasonKey, order.courier_name, actor);
    if (!result.success) { setError(result.error || 'تعذر تسجيل الرفض.'); return; }
    await refresh();
  };

  const loadRefusalHistory = async () => {
    if (!refusalPhone.trim()) return;
    setRefusals(await neonDb.getRefusalHistory(refusalPhone.trim()));
  };

  const grouped = board.reduce<Record<string, Order[]>>((groups, order) => {
    const key = order.courier_name || 'غير محدد';
    (groups[key] ||= []).push(order);
    return groups;
  }, {});

  return <div className="space-y-6 font-cairo">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-2">
        <button onClick={() => setTab('packing')} className={`${button} ${tab === 'packing' ? 'bg-amber-100 border-amber-300' : ''}`}>شاشة التجهيز والتعبئة</button>
        <button onClick={() => setTab('delivery')} className={`${button} ${tab === 'delivery' ? 'bg-amber-100 border-amber-300' : ''}`}><Truck className="w-4 h-4 inline ms-1" />لوحة الشحن العامة</button>
        <button onClick={() => setTab('refusals')} className={`${button} ${tab === 'refusals' ? 'bg-amber-100 border-amber-300' : ''}`}>سجل رفض الاستلام</button>
      </div>
      {printed && <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2">
        <span className="text-xs text-emerald-800">تم تجهيز الطلب #{printed.order_number}</span>
        <button onClick={() => window.print()} className={button}><Printer className="w-3.5 h-3.5 inline ms-1" />طباعة ملصق الشحن</button>
      </div>}
    </div>
    {error && <p role="alert" className="text-rose-700 text-sm">{error}</p>}

    {tab === 'packing' && <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-2">
        {!picking.length && <p className="text-slate-500 text-sm">لا توجد طلبات بانتظار التجهيز.</p>}
        {picking.map(order => <button key={order.id} onClick={() => openOrder(order)}
          className={`w-full text-right rounded-xl border p-3 ${active?.id === order.id ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white'}`}>
          <div className="flex justify-between text-sm"><strong>#{order.order_number}</strong><span className="text-slate-500">{order.items?.length || 0} صنف</span></div>
          <p className="text-xs text-slate-500 mt-1">{order.customer_name} · {order.governorate}</p>
        </button>)}
      </div>
      <div className={box}>
        {!active ? <p className="text-slate-500 text-sm">اختاري طلبًا من القائمة لبدء التعبئة.</p> : <div className="space-y-3">
          <h3 className="font-bold flex items-center gap-2"><PackageCheck className="w-4 h-4 text-amber-700" />تعبئة الطلب #{active.order_number}</h3>
          <ul className="text-xs space-y-1">{active.items.map((item: any, index: number) =>
            <li key={index} className="flex justify-between"><span>{item.product?.name_ar}</span><span className="font-outfit">{item.product?.sku || item.product?.id} × {item.quantity}</span></li>)}</ul>
          <input ref={scanInput} autoFocus value={scan} onChange={e => setScan(e.target.value)} onKeyDown={addScan}
            placeholder="امسحي الباركود أو SKU ثم Enter (F2 للتركيز، F9 للتأكيد)" className="w-full p-2 rounded-lg border border-amber-300 text-sm" />
          <div className="flex flex-wrap gap-1">{scanned.map((code, index) => <span key={index} className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-[10px] font-outfit border border-emerald-200">{code}</span>)}</div>
          <div className="flex gap-2">
            <button onClick={() => confirmPack(false)} className="flex-1 bg-amber-500 hover:bg-amber-400 text-black p-2.5 rounded-xl font-bold text-sm">تأكيد التعبئة ومطابقة الأصناف</button>
            <button onClick={() => setActive(null)} className={button}>إلغاء</button>
          </div>
        </div>}
      </div>
    </div>}

    {tab === 'delivery' && <div className="space-y-4">
      {Object.entries(grouped).map(([courier, orders]) => <div key={courier} className={box}>
        <h3 className="font-bold text-sm mb-2"><button type="button" className="detail-info-button" onClick={() => openDetails({ title: `شحنات ${courier}`, description: 'الشحنات الحالية المسندة لهذا المندوب. اضغط على الطلب للاطلاع على أصنافه وعنوانه؛ العرض لا يعيّن مندوبًا أو يغيّر الحالة.', rows: orderRows(orders, formatPrice, o => openDetails(orderDetail(o, formatPrice))) })}>{courier} · {orders.length} شحنة</button></h3>
        <div className="space-y-1">{orders.map(order => <div key={order.id} className="flex flex-wrap items-center justify-between gap-2 text-xs border-t border-slate-100 pt-2 mt-2 first:border-0 first:pt-0 first:mt-0">
          <div><InfoButton className="font-bold" details={orderDetail(order, formatPrice)}>#{order.order_number}</InfoButton><span className="text-slate-500 mx-2">{order.customer_name}</span><span className="text-slate-500">{order.governorate}</span></div>
          <div className="flex items-center gap-2"><span className="px-2 py-0.5 rounded bg-slate-100">{order.order_status}</span>
            <button onClick={() => assignCourier(order)} className="text-amber-700 font-bold">تعيين مندوب / شحن</button>
            <button onClick={() => recordRefusal(order)} className="text-rose-700 font-bold">تسجيل رفض استلام</button></div>
        </div>)}</div>
      </div>)}
      {!board.length && <p className="text-slate-500 text-sm">لا توجد شحنات نشطة حاليًا.</p>}
    </div>}

    {tab === 'refusals' && <div className="space-y-4">
      <div className="flex gap-2">
        <input value={refusalPhone} onChange={e => setRefusalPhone(e.target.value)} placeholder="ابحثي برقم هاتف العميل" className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        <button onClick={loadRefusalHistory} className={button}><Search className="w-4 h-4 inline ms-1" />بحث</button>
        <button onClick={() => neonDb.getAllRefusals().then(setRefusals)} className={button}>كل السجلات</button>
      </div>
      <div className={box}>
        {!refusals.length ? <p className="text-slate-500 text-sm">لا توجد حالات رفض مسجلة.</p> : <table className="w-full text-right text-xs">
          <thead className="text-slate-500 border-b border-slate-200"><tr><th className="p-2">التاريخ</th><th className="p-2">الطلب</th><th className="p-2">الهاتف</th><th className="p-2">السبب</th><th className="p-2">المندوب</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{refusals.map(row => <tr key={row.id}>
            <td className="p-2 whitespace-nowrap text-slate-500">{new Date(row.created_at).toLocaleString('ar-EG')}</td>
            <td className="p-2 font-outfit">#{row.order_id}</td>
            <td className="p-2 font-outfit">{row.customer_phone}</td>
            <td className="p-2">{REASONS[row.reason] || row.reason}</td>
            <td className="p-2">{row.courier_name || '-'}</td>
          </tr>)}</tbody>
        </table>}
      </div>
    </div>}

    {printed && <div className="hidden print:block" id="fulfillment-label">
      <h1>JOE Store</h1><p>#{printed.order_number}</p><p>{printed.customer_name}</p><p>{printed.governorate}</p><p>{printed.customer_phone}</p>
    </div>}
    <style>{`@media print{body *{visibility:hidden!important}#fulfillment-label,#fulfillment-label *{visibility:visible!important}
      #fulfillment-label{display:block!important;position:absolute;top:0;right:0;width:10cm;height:15cm;background:white;color:black;padding:5mm;font:14px Arial}}`}</style>
  </div>;
};
