import React, { useState } from 'react';
import { 
  Search, 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Phone, 
  MessageCircle, 
  AlertCircle,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { Order, OrderStatus } from '../types';
import { generateWhatsAppWebLink } from '../utils/whatsappService';

export const OrderTracking: React.FC = () => {
  const { orders, getOrderById, currentOrder, settings, navigate } = useStore();
  const { t, language, formatPrice } = useLanguage();

  const [searchVal, setSearchVal] = useState(currentOrder?.order_number || '');
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(currentOrder || (orders[0] || null));
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchVal.trim()) return;

    const found = getOrderById(searchVal);
    setSearchedOrder(found || null);
    setHasSearched(true);
  };

  const steps: { key: OrderStatus; title: string; desc: string; icon: string }[] = [
    { key: 'pending', title: 'تم استلام الطلب', desc: 'جاري مراجعة الطلب مع خدمة العملاء', icon: '📝' },
    { key: 'confirmed', title: 'تم التأكيد وتجهيز الفاتورة', desc: 'تم حجز المنتجات ومراجعة بيانات التوصيل', icon: '✅' },
    { key: 'processing', title: 'التغليف والفحص النهائي', desc: 'فحص الجهاز واختبار البطارية قبل التغليف', icon: '📦' },
    { key: 'shipped', title: 'تم التسليم لشركة الشحن', desc: 'الشحنة بحوزة شركة الشحن والمندوب', icon: '🚚' },
    { key: 'out_for_delivery', title: 'جاري التوصيل اليوم', desc: 'المندوب في طريقه لعنوانك للتسليم', icon: '🛵' },
    { key: 'delivered', title: 'تم التوصيل بنجاح', desc: 'تم استلام الجهاز ومطابقة المواصفات', icon: '🎉' }
  ];

  const getStepIndex = (status: OrderStatus) => {
    const orderMap: Record<OrderStatus, number> = {
      pending: 0,
      confirmed: 1,
      processing: 2,
      shipped: 3,
      out_for_delivery: 4,
      delivered: 5,
      cancelled: -1
    };
    return orderMap[status] ?? 0;
  };

  const currentStepIdx = searchedOrder ? getStepIndex(searchedOrder.order_status) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 font-cairo">
      {/* Header & Search Bar */}
      <div className="text-center space-y-4">
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          تتبع حالة شحنتك المباشرة
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          أدخل رقم الطلب (مثال: JOE-84291) أو رقم هاتفك لمعرفة مكان الشحنة وحالتها اللحظية.
        </p>

        <form onSubmit={handleSearch} className="max-w-md mx-auto flex items-center rounded-2xl bg-[#0F1626] border border-amber-500/30 overflow-hidden shadow-xl p-1">
          <input
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="رقم الطلب أو رقم الهاتف..."
            className="w-full bg-transparent px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none font-cairo"
          />
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-glow-gold transition-all"
          >
            <Search className="w-3.5 h-3.5" />
            <span>بحث</span>
          </button>
        </form>
      </div>

      {/* Order Results */}
      {searchedOrder ? (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="p-6 rounded-3xl bg-[#0F1626] border border-amber-500/30 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-base font-black text-white font-outfit">
                  #{searchedOrder.order_number}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  searchedOrder.order_status === 'cancelled' 
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
                    : searchedOrder.order_status === 'delivered'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {searchedOrder.order_status === 'pending' && 'قيد المراجعة'}
                  {searchedOrder.order_status === 'confirmed' && 'تم التأكيد'}
                  {searchedOrder.order_status === 'processing' && 'جاري التجهيز'}
                  {searchedOrder.order_status === 'shipped' && 'تم التسليم للشحن'}
                  {searchedOrder.order_status === 'out_for_delivery' && 'مع المندوب للتسليم'}
                  {searchedOrder.order_status === 'delivered' && 'تم التوصيل بنجاح'}
                  {searchedOrder.order_status === 'cancelled' && 'ملغي'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                تاريخ التسجيل: {new Date(searchedOrder.created_at).toLocaleDateString('ar-EG')} • العميل: {searchedOrder.customer_name}
              </p>
              {searchedOrder.order_status === 'cancelled' && (
                <div className="mt-2 p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                  ⚠️ <strong>تم إلغاء هذا الطلب:</strong> {searchedOrder.cancellation_reason || 'بناءً على طلب العميل'}
                </div>
              )}
            </div>

            <div className="text-right sm:text-left">
              <span className="text-xs text-slate-400 block">الإجمالي المطلوب:</span>
              <strong className="text-lg font-black text-amber-400 font-outfit">
                {formatPrice(searchedOrder.total)}
              </strong>
            </div>
          </div>

          {/* Timeline Visualizer */}
          <div className="p-6 rounded-3xl bg-[#0F1626] border border-white/10 space-y-6">
            <h3 className="font-bold text-sm text-white border-b border-white/5 pb-3">
              مسار وتحديثات الشحنة
            </h3>

            <div className="space-y-6 relative before:absolute before:inset-y-0 before:right-4 before:w-0.5 before:bg-white/10">
              {steps.map((step, idx) => {
                const isPassed = currentStepIdx >= idx;
                const isCurrent = currentStepIdx === idx;

                return (
                  <div key={step.key} className="relative flex items-start gap-4">
                    {/* Step Icon Indicator */}
                    <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-md ${
                      isCurrent
                        ? 'bg-amber-500 text-black shadow-glow-gold ring-4 ring-amber-500/20'
                        : isPassed
                        ? 'bg-emerald-500 text-black'
                        : 'bg-slate-800 text-slate-500 border border-white/10'
                    }`}>
                      {isPassed ? '✓' : idx + 1}
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 text-xs">
                      <div className="flex items-center gap-2">
                        <strong className={`font-bold ${isCurrent ? 'text-amber-400 text-sm' : isPassed ? 'text-white' : 'text-slate-500'}`}>
                          {step.title}
                        </strong>
                        {isCurrent && (
                          <span className="px-2 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold animate-pulse">
                            الحالة الحالية
                          </span>
                        )}
                      </div>
                      <p className={`mt-0.5 ${isPassed ? 'text-slate-300' : 'text-slate-600'}`}>
                        {step.desc}
                      </p>
                      {step.key === 'shipped' && searchedOrder.courier_name && isPassed && (
                        <div className="mt-1 text-[11px] text-amber-300">
                          🚚 شركة الشحن: {searchedOrder.courier_name} {searchedOrder.tracking_number && `(بوليصة: ${searchedOrder.tracking_number})`}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Customer & Items Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Delivery address */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-2">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span>عنوان التوصيل المسجل:</span>
              </span>
              <p className="text-white font-bold">{searchedOrder.governorate} - {searchedOrder.city}</p>
              <p className="text-slate-400">{searchedOrder.address_details}</p>
            </div>

            {/* WhatsApp Contact */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-2 flex flex-col justify-between">
              <div>
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span>هاتف العميل والواتساب:</span>
                </span>
                <p className="text-white font-outfit font-bold">{searchedOrder.customer_phone}</p>
                <p className="text-[11px] text-slate-400">تصلك كافة إشعارات الشحن عبر واتساب</p>
              </div>

              <a
                href={generateWhatsAppWebLink(settings.store_whatsapp, `مرحباً متجر جو ستور، أود الاستفسار عن موعد وصول طلبي رقم #${searchedOrder.order_number}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-[11px] font-bold flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>الاستفسار عن الشحنة عبر واتساب</span>
              </a>
            </div>
          </div>

          {/* Cancellation Request Section */}
          {searchedOrder.order_status !== 'cancelled' && searchedOrder.order_status !== 'delivered' && (
            <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <span className="font-bold text-rose-400 text-sm flex items-center gap-1.5 font-cairo">
                  <span>هل ترغب في إلغاء هذا الطلب أو تعديله؟</span>
                </span>
                <p className="text-[11px] text-slate-400 font-cairo">
                  يمكنك التواصل مباشرة مع خدمة عملاء جو ستور عبر واتساب لطلب إلغاء الأوردر أو استبدال أي صنف قبل شحنه.
                </p>
              </div>

              <a
                href={generateWhatsAppWebLink(
                  settings.store_whatsapp,
                  `مرحباً متجر جو ستور بالمنصورة، أود تقديم طلب لإلغاء طلبي رقم #${searchedOrder.order_number} لسبب: `
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs font-cairo flex items-center gap-2 transition-all flex-shrink-0 shadow-md"
              >
                <MessageCircle className="w-4 h-4" />
                <span>طلب إلغاء الأوردر عبر واتساب</span>
              </a>
            </div>
          )}
        </div>
      ) : hasSearched ? (
        <div className="p-8 rounded-3xl bg-[#0F1626] border border-white/10 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
          <h3 className="font-bold text-base text-white">لم يتم العثور على طلب مطابق</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            تأكد من كتابة رقم الطلب بصورة صحيحة (مثال: JOE-84291) أو رقم هاتفك الذي سجلت به الطلب.
          </p>
        </div>
      ) : null}
    </div>
  );
};
