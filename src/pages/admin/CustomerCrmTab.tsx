import React, { useEffect, useState } from 'react';
import {
  Users,
  ShoppingCart,
  Clock,
  MessageCircle,
  RefreshCw,
  Trash2,
  Globe,
  Smartphone,
  Sparkles,
  UserX
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { generateWhatsAppWebLink } from '../../utils/whatsappService';
import { neonDb } from '../../services/neonDb';
import { MetricCard, useDetails } from '../../components/DetailsDialog';
import { GuestInsightsModal } from './GuestInsightsModal';
import type { AdminSection } from './AdminShell';

export const CustomerCrmTab: React.FC<{ onNavigateSection?: (section: AdminSection) => void }> = ({ onNavigateSection }) => {
  const { activeCarts, refreshActiveCarts } = useStore();
  const { formatPrice } = useLanguage();
  const { isAdmin, canAccessSection } = useAuth();
  const { openDetails } = useDetails();

  const [crmView, setCrmView] = useState<'carts' | 'guests'>('carts');
  const [isLoading, setIsLoading] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'abandoned' | 'active'>('all');

  const [guests, setGuests] = useState<any[]>([]);
  const [guestChannelFilter, setGuestChannelFilter] = useState<string>('all');
  const [guestSearch, setGuestSearch] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<any | null>(null);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await refreshActiveCarts();
      const gList = await neonDb.getGuestVisitors(150);
      setGuests(Array.isArray(gList) ? gList : []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void handleRefresh();
  }, []);

  const openGuestInsightsModal = (g: any) => {
    setSelectedGuest(g);
  };

  const handleDeleteGuest = async (sessionId: string) => {
    if (!isAdmin || !confirm('حذف بيانات هذه الجلسة من السجل؟')) return;
    const res = await neonDb.deleteGuestVisitor(sessionId);
    if (res.success) setGuests(prev => prev.filter(g => g.session_id !== sessionId));
  };

  // Filter carts
  const filteredCarts = activeCarts.filter(c => {
    if (filterMode === 'abandoned') return c.is_abandoned;
    if (filterMode === 'active') return !c.is_abandoned;
    return true;
  });

  const abandonedCartsCount = activeCarts.filter(c => c.is_abandoned).length;
  const abandonedCartsValue = activeCarts.filter(c => c.is_abandoned).reduce((sum, c) => sum + Number(c.subtotal || 0), 0);
  const activeNowCount = activeCarts.filter(c => !c.is_abandoned).length;

  const filteredGuests = guests.filter(g => {
    if (guestChannelFilter !== 'all' && (g.source_channel || 'direct') !== guestChannelFilter) return false;
    if (guestSearch.trim()) {
      const q = guestSearch.trim().toLowerCase();
      return [g.customer_name, g.customer_phone, g.source_label, g.utm_campaign, g.landing_path].join(' ').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-cairo">
      {/* Sub-view Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => setCrmView('carts')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 ${crmView === 'carts' ? 'bg-amber-500 text-black' : 'bg-slate-100 text-slate-700'}`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>السلات الحية والمتروكة ({activeCarts.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setCrmView('guests')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 ${crmView === 'guests' ? 'bg-amber-500 text-black' : 'bg-slate-100 text-slate-700'}`}
          >
            <Globe className="w-4 h-4" />
            <span>الزوار غير المسجلين ومصادر الإعلانات ({guests.length})</span>
          </button>
          {onNavigateSection && canAccessSection?.('guests') && (
            <button
              type="button"
              onClick={() => onNavigateSection('guests')}
              className="px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100"
            >
              <UserX className="w-4 h-4" />
              <span>فتح صفحة الزوار الكاملة</span>
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isLoading}
          className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>تحديث</span>
        </button>
      </div>

      {crmView === 'carts' ? (
        <>
          <div className="grid sm:grid-cols-3 gap-4">
            <MetricCard title="السلات المتروكة" value={abandonedCartsCount} note={`بقيمة ${formatPrice(abandonedCartsValue)} — اضغط لعرض هذه السلات`} onClick={() => setFilterMode('abandoned')} />
            <MetricCard title="جلسات تسوّق نشطة" value={activeNowCount} note="اضغط لعرض السلات غير المعلّمة كمتروكة" onClick={() => setFilterMode('active')} />
            <MetricCard title="قيمة السلات المتروكة" value={formatPrice(abandonedCartsValue)} note="فرص بيع محتملة، وليست مبيعات مؤكدة" onClick={() => openDetails({ title: 'كيف تُحسب قيمة السلات المتروكة؟', description: 'مجموع القيم الفرعية للسلات المعلّمة كمتروكة في البيانات الحالية.', rows: activeCarts.filter(c => c.is_abandoned).map((c, i) => ({ id: String(i), label: c.customer_name || 'جلسة عميل', value: formatPrice(Number(c.subtotal || 0)), facts: [{ label: 'الأصناف', value: c.items?.length || 0 }] })), actions: [{ label: 'عرض السلات المتروكة', run: () => setFilterMode('abandoned') }] })} />
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-amber-700" />
                  <span>سجل سلات الشراء الحية والمتروكة (Abandoned Carts CRM)</span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  متابعة أي حركة وضع منتجات بالسلة وتذكير العميل مباشرة عبر واتساب لإتمام الشراء
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <button onClick={() => setFilterMode('all')} className={`px-3 py-1.5 rounded-xl font-bold ${filterMode === 'all' ? 'bg-amber-500 text-black' : 'bg-slate-100 text-slate-600'}`}>الكل ({activeCarts.length})</button>
                <button onClick={() => setFilterMode('abandoned')} className={`px-3 py-1.5 rounded-xl font-bold ${filterMode === 'abandoned' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600'}`}>المتروكة ({abandonedCartsCount})</button>
                <button onClick={() => setFilterMode('active')} className={`px-3 py-1.5 rounded-xl font-bold ${filterMode === 'active' ? 'bg-emerald-500 text-black' : 'bg-slate-100 text-slate-600'}`}>النشطة ({activeNowCount})</button>
              </div>
            </div>

            {filteredCarts.length === 0 ? (
              <div className="p-12 text-center text-slate-600 text-xs">لا توجد سلات شراء مسجلة بهذه الفئة حالياً.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600">
                      <th className="pb-3 pr-2">معرف الجلسة / العميل</th>
                      <th className="pb-3 px-3">المنتجات الموجودة بالسلة</th>
                      <th className="pb-3 px-3">القيمة الإجمالية</th>
                      <th className="pb-3 px-3">آخر نشاط</th>
                      <th className="pb-3 px-3 text-center">الحالة</th>
                      <th className="pb-3 pl-2 text-center">إجراء الاسترجاع السريع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredCarts.map(cart => {
                      const items = Array.isArray(cart.items) ? cart.items : [];
                      const phone = cart.customer_phone;
                      const name = cart.customer_name || 'عميل المتجر';
                      const itemsList = items.map((it: any) => it.product?.name_ar || 'منتج').slice(0, 2).join(' و ');
                      const recoveryMsg = `أهلاً بحضرتك يا ${name} من متجر جو ستور بالمنصورة! لاحظنا أنك تركت سلة بها (${itemsList}) بإجمالي (${formatPrice(cart.subtotal)}). حابب نساعدك في إتمام الطلب؟`;
                      const whatsappLink = phone ? generateWhatsAppWebLink(phone, recoveryMsg) : null;

                      return (
                        <tr key={cart.session_id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 pr-2">
                            <strong className="text-slate-900 block font-bold">{name}</strong>
                            <span className="text-[10px] text-slate-500 font-mono block">{phone || `جلسة: ${cart.session_id.substring(0, 14)}...`}</span>
                          </td>
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
                          <td className="py-3 px-3"><strong className="text-amber-700 font-outfit font-black text-sm block">{formatPrice(cart.subtotal)}</strong></td>
                          <td className="py-3 px-3 text-slate-600 text-[11px]">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-500" /><span>{new Date(cart.last_updated_at).toLocaleTimeString('ar-EG')}</span></span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {cart.is_abandoned ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-700 border border-rose-500/30">سلة متروكة</span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 border border-emerald-500/30">نشطة حالياً</span>
                            )}
                          </td>
                          <td className="py-3 pl-2 text-center">
                            {whatsappLink ? (
                              <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs inline-flex items-center gap-1.5 shadow-sm">
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>تذكير عبر واتساب</span>
                              </a>
                            ) : (
                              <span className="text-[10px] text-slate-500">زائر بدون رقم مسجل</span>
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
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-2xl border border-slate-200 text-xs">
            <input
              value={guestSearch}
              onChange={e => setGuestSearch(e.target.value)}
              placeholder="ابحث بالاسم أو الهاتف أو اسم الحملة الإعلانية أو الصفحة..."
              className="flex-1 min-w-48 rounded-xl border border-slate-300 px-3 py-2 text-xs"
            />
            <select
              value={guestChannelFilter}
              onChange={e => setGuestChannelFilter(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white"
            >
              <option value="all">كل مصادر الزيارات ({guests.length})</option>
              <option value="facebook_ads">إعلانات فيسبوك (Facebook Ads)</option>
              <option value="instagram_ads">إعلانات إنستجرام (Instagram Ads)</option>
              <option value="tiktok_ads">إعلانات تيك توك (TikTok Ads)</option>
              <option value="google_ads">إعلانات جوجل (Google Ads)</option>
              <option value="google_search">بحث جوجل (Google Search)</option>
              <option value="whatsapp">واتساب</option>
              <option value="direct">دخول مباشر</option>
            </select>
          </div>

          <div className="space-y-3">
            {filteredGuests.map(g => (
              <div key={g.session_id} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-slate-900 font-bold text-sm">{g.customer_name || 'زائر بدون حساب'}</strong>
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[10px]">
                      {g.source_label || 'دخول مباشر'}
                    </span>
                    {g.utm_campaign && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold text-[10px]">
                        حملة: {g.utm_campaign}
                      </span>
                    )}
                    {g.device_type && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] flex items-center gap-1">
                        <Smartphone className="w-3 h-3" />
                        {g.device_type}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500">
                    {g.customer_phone ? `📞 ${g.customer_phone} • ` : ''}
                    أول صفحة: <span dir="ltr">{g.landing_path || '/'}</span> • آخر ظهور: {new Date(g.last_seen_at).toLocaleString('ar-EG')}
                  </p>
                  <p className="text-slate-600">
                    شاهد {g.views_count || 0} منتجات • بحث {g.searches_count || 0} مرات • السلة: {Number(g.cart_subtotal || 0).toLocaleString()} ج.م
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openGuestInsightsModal(g)}
                    className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>عرض تحليلات الزائر</span>
                  </button>
                  {g.customer_phone && (
                    <a
                      href={generateWhatsAppWebLink(g.customer_phone, `أهلاً ${g.customer_name || ''} من متجر جو ستور! لاحظنا اهتمامك بمنتجاتنا، هل نقدر نساعدك؟`)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded-xl bg-emerald-600 text-white font-bold flex items-center gap-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>واتساب</span>
                    </a>
                  )}
                  {isAdmin && (
                    <button type="button" onClick={() => handleDeleteGuest(g.session_id)} className="p-2 rounded-xl text-rose-700 hover:bg-rose-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {!filteredGuests.length && (
              <div className="p-10 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                لا توجد جلسات زوار مطابقة للفلتر الحالي.
              </div>
            )}
          </div>
        </div>
      )}

      <GuestInsightsModal
        guest={selectedGuest}
        onClose={() => setSelectedGuest(null)}
      />
    </div>
  );
};
