import React, { useEffect, useState } from 'react';
import {
  Users,
  ShoppingCart,
  AlertCircle,
  Clock,
  MessageCircle,
  DollarSign,
  Search,
  RefreshCw,
  TrendingUp,
  Phone,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { generateWhatsAppWebLink } from '../../utils/whatsappService';
import { neonDb } from '../../services/neonDb';
import { MetricCard, useDetails } from '../../components/DetailsDialog';

export const CustomerCrmTab: React.FC = () => {
  const { activeCarts, refreshActiveCarts, settings } = useStore();
  const { formatPrice, language } = useLanguage();
  const { openDetails } = useDetails();

  const [isLoading, setIsLoading] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'abandoned' | 'active'>('all');

  const handleRefresh = async () => {
    setIsLoading(true);
    await refreshActiveCarts();
    setIsLoading(false);
  };

  useEffect(() => {
    handleRefresh();
  }, []);

  // Filter carts
  const filteredCarts = activeCarts.filter(c => {
    if (filterMode === 'abandoned') return c.is_abandoned;
    if (filterMode === 'active') return !c.is_abandoned;
    return true;
  });

  const abandonedCartsCount = activeCarts.filter(c => c.is_abandoned).length;
  const abandonedCartsValue = activeCarts.filter(c => c.is_abandoned).reduce((sum, c) => sum + Number(c.subtotal || 0), 0);
  const activeNowCount = activeCarts.filter(c => !c.is_abandoned).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid sm:grid-cols-3 gap-4">
        <MetricCard title="السلات المتروكة" value={abandonedCartsCount} note={`بقيمة ${formatPrice(abandonedCartsValue)} — اضغط لعرض هذه السلات`} onClick={() => setFilterMode('abandoned')} />
        <MetricCard title="جلسات تسوّق نشطة" value={activeNowCount} note="اضغط لعرض السلات غير المعلّمة كمتروكة" onClick={() => setFilterMode('active')} />
        <MetricCard title="قيمة السلات المتروكة" value={formatPrice(abandonedCartsValue)} note="فرص بيع محتملة، وليست مبيعات مؤكدة" onClick={() => openDetails({ title: 'كيف تُحسب قيمة السلات المتروكة؟', description: 'مجموع القيم الفرعية للسلات المعلّمة كمتروكة في البيانات الحالية. لا يعني ترك السلة أن العميل اشترى أو دفع.', rows: activeCarts.filter(c => c.is_abandoned).map((c, i) => ({ id: String(i), label: c.customer_name || 'جلسة عميل', value: formatPrice(Number(c.subtotal || 0)), facts: [{ label: 'الأصناف', value: c.items?.length || 0 }] })), actions: [{ label: 'عرض السلات المتروكة', run: () => setFilterMode('abandoned') }] })} />
      </div>

      {/* 2. Abandoned & Active Carts Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <h3 className="font-black text-sm text-slate-900 font-cairo flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-amber-700" />
              <span>سجل سلات الشراء الحية والمتروكة (Abandoned Carts CRM)</span>
            </h3>
            <p className="text-xs text-slate-600 font-cairo mt-0.5">
              متابعة أي حركة وضع منتجات بالسلة وتذكير العميل مباشرة عبر واتساب لإتمام الشراء
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                filterMode === 'all' ? 'bg-amber-500 text-black' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل ({activeCarts.length})
            </button>
            <button
              onClick={() => setFilterMode('abandoned')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                filterMode === 'abandoned' ? 'bg-rose-500 text-slate-900' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              المتروكة فقط ({abandonedCartsCount})
            </button>
            <button
              onClick={() => setFilterMode('active')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                filterMode === 'active' ? 'bg-emerald-500 text-black' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              النشطة الآن ({activeNowCount})
            </button>
          </div>
        </div>

        {filteredCarts.length === 0 ? (
          <div className="p-12 text-center text-slate-600 text-xs">
            لا توجد سلات شراء مسجلة بهذه الفئة حالياً.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 font-cairo">
                  <th className="pb-3 pr-2">معرف الجلسة / العميل</th>
                  <th className="pb-3 px-3">المنتجات الموجودة بالسلة</th>
                  <th className="pb-3 px-3">القيمة الإجمالية</th>
                  <th className="pb-3 px-3">آخر نشاط</th>
                  <th className="pb-3 px-3 text-center">الحالة</th>
                  <th className="pb-3 pl-2 text-center">إجراء الاسترجاع السريع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCarts.map((cart) => {
                  const items = Array.isArray(cart.items) ? cart.items : [];
                  const phone = cart.customer_phone;
                  const name = cart.customer_name || 'عميل المتجر';

                  // Pre-filled personalized WhatsApp recovery message
                  const itemsList = items.map((it: any) => it.product?.name_ar || 'منتج').slice(0, 2).join(' و ');
                  const recoveryMsg = `أهلاً بحضرتك يا ${name} من متجر جو ستور بالمنصورة 📱✨! لاحظنا أنك تركت سلة بها (${itemsList}) بإجمالي (${formatPrice(cart.subtotal)}). حابب نساعدك في إتمام الطلب وتوصيله لمنزلك اليوم؟`;

                  const whatsappLink = phone
                    ? generateWhatsAppWebLink(phone, recoveryMsg)
                    : null;

                  return (
                    <tr key={cart.session_id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Session / Customer */}
                      <td className="py-3 pr-2">
                        <div className="space-y-0.5">
                          <strong className="text-slate-900 block font-bold">
                            {name}
                          </strong>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            {phone || `جلسة: ${cart.session_id.substring(0, 14)}...`}
                          </span>
                        </div>
                      </td>

                      {/* Items */}
                      <td className="py-3 px-3">
                        <div className="space-y-1 max-w-xs">
                          {items.map((it: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-[11px] text-slate-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                              <span className="truncate">{it.product?.name_ar || 'صنف'}</span>
                              <span className="text-amber-700 font-outfit">×{it.quantity || 1}</span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Subtotal */}
                      <td className="py-3 px-3">
                        <strong className="text-amber-700 font-outfit font-black text-sm block">
                          {formatPrice(cart.subtotal)}
                        </strong>
                      </td>

                      {/* Last active time */}
                      <td className="py-3 px-3 text-slate-600 text-[11px]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{new Date(cart.last_updated_at).toLocaleTimeString('ar-EG')}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        {cart.is_abandoned ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-700 border border-rose-500/30">
                            سلة متروكة ⚠️
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 border border-emerald-500/30">
                            نشطة حالياً 🟢
                          </span>
                        )}
                      </td>

                      {/* WhatsApp Recovery Button */}
                      <td className="py-3 pl-2 text-center">
                        {whatsappLink ? (
                          <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-400 text-black font-extrabold text-xs transition-all inline-flex items-center gap-1.5 shadow-sm"
                            title="إرسال تذكير مباشر بالواتساب للعميل"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>تذكير عبر واتساب 💬</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-500">
                            زائر بدون رقم مسجل
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
