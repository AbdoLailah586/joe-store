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

export const CustomerCrmTab: React.FC = () => {
  const { activeCarts, refreshActiveCarts, settings } = useStore();
  const { formatPrice, language } = useLanguage();

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
      {/* 1. Header Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Abandoned Carts Alert */}
        <div className="p-5 rounded-3xl bg-[#0F1626] border border-rose-500/30 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-rose-500/10 blur-2xl -z-0" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>سلات متروكة (فرص استرجاع مبيعات)</span>
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          </div>
          <strong className="text-2xl sm:text-3xl font-black font-outfit text-white block">
            {abandonedCartsCount} <span className="text-xs text-rose-400 font-cairo">سلة متروكة</span>
          </strong>
          <span className="text-xs text-slate-400 mt-1 block">
            بقيمة إجمالية: <strong className="text-amber-400 font-outfit">{formatPrice(abandonedCartsValue)}</strong>
          </span>
        </div>

        {/* Active Carts Now */}
        <div className="p-5 rounded-3xl bg-[#0F1626] border border-emerald-500/30 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 blur-2xl -z-0" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4" />
              <span>يتسوقون الآن (سلات قيد الاختيار)</span>
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <strong className="text-2xl sm:text-3xl font-black font-outfit text-white block">
            {activeNowCount} <span className="text-xs text-emerald-400 font-cairo">جلسة نشطة</span>
          </strong>
          <span className="text-xs text-slate-400 mt-1 block">
            عملاء يختارون منتجاتهم في الوقت الحالي
          </span>
        </div>

        {/* CRM Action Tip */}
        <div className="p-5 rounded-3xl bg-[#0F1626] border border-amber-500/30 shadow-lg flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>استراتيجية جو ستور لاسترجاع العملاء</span>
            </span>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed font-cairo">
              إرسال رسالة تذكير ودية عبر واتساب للعميل الذي ترك سلته يرفع معدل إتمام الطلبات بنسبة تتجاوز 40%!
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="mt-3 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all self-start"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>تحديث بيانات السلات الحية</span>
          </button>
        </div>
      </div>

      {/* 2. Abandoned & Active Carts Table */}
      <div className="p-6 rounded-3xl bg-[#0F1626] border border-white/10 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <h3 className="font-black text-sm text-white font-cairo flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-amber-400" />
              <span>سجل سلات الشراء الحية والمتروكة (Abandoned Carts CRM)</span>
            </h3>
            <p className="text-xs text-slate-400 font-cairo mt-0.5">
              متابعة أي حركة وضع منتجات بالسلة وتذكير العميل مباشرة عبر واتساب لإتمام الشراء
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                filterMode === 'all' ? 'bg-amber-500 text-black' : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              الكل ({activeCarts.length})
            </button>
            <button
              onClick={() => setFilterMode('abandoned')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                filterMode === 'abandoned' ? 'bg-rose-500 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              المتروكة فقط ({abandonedCartsCount})
            </button>
            <button
              onClick={() => setFilterMode('active')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                filterMode === 'active' ? 'bg-emerald-500 text-black' : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              النشطة الآن ({activeNowCount})
            </button>
          </div>
        </div>

        {filteredCarts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            لا توجد سلات شراء مسجلة بهذه الفئة حالياً.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-cairo">
                  <th className="pb-3 pr-2">معرف الجلسة / العميل</th>
                  <th className="pb-3 px-3">المنتجات الموجودة بالسلة</th>
                  <th className="pb-3 px-3">القيمة الإجمالية</th>
                  <th className="pb-3 px-3">آخر نشاط</th>
                  <th className="pb-3 px-3 text-center">الحالة</th>
                  <th className="pb-3 pl-2 text-center">إجراء الاسترجاع السريع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
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
                          <strong className="text-white block font-bold">
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
                            <div key={i} className="flex items-center gap-2 text-[11px] text-slate-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                              <span className="truncate">{it.product?.name_ar || 'صنف'}</span>
                              <span className="text-amber-400 font-outfit">×{it.quantity || 1}</span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Subtotal */}
                      <td className="py-3 px-3">
                        <strong className="text-amber-400 font-outfit font-black text-sm block">
                          {formatPrice(cart.subtotal)}
                        </strong>
                      </td>

                      {/* Last active time */}
                      <td className="py-3 px-3 text-slate-400 text-[11px]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{new Date(cart.last_updated_at).toLocaleTimeString('ar-EG')}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        {cart.is_abandoned ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            سلة متروكة ⚠️
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
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
                            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition-all inline-flex items-center gap-1.5 shadow-sm"
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
