import React, { useEffect, useState } from 'react';
import {
  X,
  Eye,
  Search,
  ShoppingCart,
  Package,
  Globe,
  Smartphone,
  Clock,
  MessageCircle,
  Star,
  Headset,
  Heart,
  MapPin,
  Layers,
  Activity
} from 'lucide-react';
import { neonDb } from '../../services/neonDb';
import { useLanguage } from '../../context/LanguageContext';
import { generateWhatsAppWebLink } from '../../utils/whatsappService';
import { orderStatusNames, paymentMethodNames, paymentStatusNames } from '../../utils/detailModels';

type InsightTab = 'overview' | 'views' | 'activity' | 'cart' | 'orders';

const actionLabels: Record<string, string> = {
  view_product: 'شاهد منتجاً',
  search: 'بحث في المتجر',
  view_category: 'تصفح قسماً',
  add_to_cart: 'أضاف للسلة',
  wishlist: 'أضاف للمفضلة',
  visit: 'زيارة صفحة'
};

function formatDurationMinutes(firstIso?: string, lastIso?: string): string {
  if (!firstIso || !lastIso) return '—';
  const diffMs = Math.max(0, new Date(lastIso).getTime() - new Date(firstIso).getTime());
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'أقل من دقيقة';
  if (mins < 60) return `${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hrs < 24) return rem ? `${hrs} ساعة و ${rem} د` : `${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  return `${days} يوم`;
}

export const GuestInsightsModal: React.FC<{
  guest: any | null;
  onClose: () => void;
  initialTab?: InsightTab;
}> = ({ guest, onClose, initialTab = 'overview' }) => {
  const { formatPrice } = useLanguage();
  const [tab, setTab] = useState<InsightTab>(initialTab);
  const [insights, setInsights] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab, guest?.session_id]);

  useEffect(() => {
    if (!guest?.session_id) {
      setInsights(null);
      return;
    }
    let active = true;
    setLoading(true);
    setInsights(null);
    neonDb
      .getGuestInsights(guest.session_id)
      .then(data => {
        if (active) setInsights(data);
      })
      .catch(() => {
        if (active) setInsights(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [guest?.session_id]);

  if (!guest) return null;

  const visitor = insights?.visitor || guest;
  const meta = (visitor?.metadata && typeof visitor.metadata === 'object' ? visitor.metadata : {}) as Record<string, any>;
  const phone = visitor.customer_phone || insights?.active_cart?.customer_phone || '';
  const name = visitor.customer_name || insights?.active_cart?.customer_name || 'زائر بدون حساب';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 font-cairo"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-y-auto p-5 sm:p-7 space-y-5 shadow-2xl border border-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black">
                زائر بدون حساب
              </span>
              <h3 className="font-black text-lg text-slate-900 truncate">{name}</h3>
            </div>
            <p className="text-xs text-slate-500 break-all">
              معرف الجلسة: <span className="font-mono text-slate-700">{visitor.session_id}</span>
              {phone ? ` • 📞 ${phone}` : ''}
              {visitor.customer_email ? ` • ✉️ ${visitor.customer_email}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {phone && (
              <a
                href={generateWhatsAppWebLink(
                  phone,
                  `أهلاً ${visitor.customer_name || ''} من متجر جو ستور! لاحظنا اهتمامك بمنتجاتنا، هل نساعدك في إتمام طلبك؟`
                )}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>تواصل واتساب</span>
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق ملف الزائر"
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {(
            [
              ['overview', 'البيانات التقنية والمصدر'],
              ['views', `المنتجات والأقسام (${insights?.recent_views?.length ?? guest.views_count ?? 0})`],
              ['activity', `البحث والسجل (${insights?.searches?.length ?? guest.searches_count ?? 0})`],
              ['cart', `السلة (${insights?.active_cart?.items?.length ?? guest.cart_items_count ?? 0})`],
              ['orders', `الطلبات والتقييمات (${(insights?.orders?.length || 0) + (insights?.reviews?.length || 0) + (insights?.support_tickets?.length || 0)})`]
            ] as [InsightTab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-3.5 py-2 rounded-xl font-bold transition-colors ${
                tab === id ? 'bg-amber-500 text-black' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="py-12 text-center text-sm text-slate-500 font-bold">جاري تحميل كل بيانات وتحليلات الزائر...</p>
        ) : !insights ? (
          <p className="py-12 text-center text-sm text-rose-600 font-bold">تعذر تحميل التفاصيل الإضافية لهذه الجلسة.</p>
        ) : (
          <div className="space-y-5 text-xs">
            {tab === 'overview' && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 block">عدد الزيارات</span>
                    <strong className="text-base font-black text-slate-900">{visitor.visit_count || 1}</strong>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 block">منتجات شاهدها</span>
                    <strong className="text-base font-black text-slate-900">{insights.stats?.views_count ?? 0}</strong>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 block">عمليات البحث</span>
                    <strong className="text-base font-black text-slate-900">{insights.stats?.searches_count ?? 0}</strong>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 block">مدة الجلسة</span>
                    <strong className="text-sm font-black text-slate-900">
                      {formatDurationMinutes(visitor.first_seen_at, visitor.last_seen_at)}
                    </strong>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <h4 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-indigo-600" />
                      <span>مصدر الزيارة وتتبع الإعلانات (UTM & Attribution)</span>
                    </h4>
                    <dl className="space-y-1.5">
                      <div className="flex justify-between gap-2"><dt className="text-slate-500">المصدر الرئيسي:</dt><dd className="font-bold text-slate-900">{visitor.source_label || 'دخول مباشر'}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-slate-500">القناة (Channel):</dt><dd className="font-mono text-slate-700">{visitor.source_channel || 'direct'}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-slate-500">UTM Source / Medium:</dt><dd className="font-mono text-slate-700">{[visitor.utm_source, visitor.utm_medium].filter(Boolean).join(' / ') || '—'}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-slate-500">اسم الحملة (Campaign):</dt><dd className="font-bold text-amber-800">{visitor.utm_campaign || '—'}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-slate-500">محتوى / كلمة (Content / Term):</dt><dd className="text-slate-700">{[visitor.utm_content, visitor.utm_term].filter(Boolean).join(' • ') || '—'}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-slate-500">Click ID:</dt><dd className="font-mono text-[11px] break-all text-slate-700">{visitor.click_id || '—'}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-slate-500">المُحيل (Referrer):</dt><dd dir="ltr" className="break-all text-slate-700">{visitor.referrer || 'مباشر'}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-slate-500">أول صفحة (Landing):</dt><dd dir="ltr" className="break-all font-mono text-slate-800">{visitor.landing_path || '/'}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-slate-500">آخر صفحة (Last Path):</dt><dd dir="ltr" className="break-all font-mono text-slate-800">{visitor.last_path || '/'}</dd></div>
                    </dl>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <h4 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-amber-700" />
                      <span>بيانات الجهاز والشبكة والهوية المجمعة</span>
                    </h4>
                    <dl className="space-y-1.5">
                      <div className="flex justify-between gap-2"><dt className="text-slate-500">الاسم المُدخل:</dt><dd className="font-bold text-slate-900">{visitor.customer_name || 'غير متوفر'}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-slate-500">الهاتف المُدخل:</dt><dd dir="ltr" className="font-bold text-slate-900">{phone || 'غير متوفر'}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-slate-500">البريد المُدخل:</dt><dd dir="ltr" className="text-slate-800 break-all">{visitor.customer_email || 'غير متوفر'}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-slate-500">المحافظة / المدينة (شيك أوت):</dt><dd className="text-slate-800">{[meta.governorate, meta.city].filter(Boolean).join(' - ') || '—'}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-slate-500">نوع الجهاز:</dt><dd className="font-bold text-slate-900">{visitor.device_type || 'غير معروف'}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-slate-500">عنوان IP / الموقع الجغرافي:</dt><dd className="font-mono text-slate-700">{[meta.ip_address, meta.geo_city, meta.geo_country].filter(Boolean).join(' • ') || 'غير مسجل'}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-slate-500">الشاشة / النافذة:</dt><dd className="font-mono text-slate-700">{[meta.screen_size, meta.viewport].filter(Boolean).join(' / ') || '—'}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-slate-500">اللغة والمنطقة الزمنية:</dt><dd className="text-slate-700">{[meta.browser_lang, meta.timezone].filter(Boolean).join(' • ') || '—'}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-slate-500">موافقة الكوكيز:</dt><dd className="font-bold text-slate-800">{meta.cookie_consent === 'accepted' ? 'موافق على الكل' : meta.cookie_consent === 'essential' ? 'الضرورية فقط' : 'لم يختر بعد'}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-slate-500">أول ظهور:</dt><dd className="text-slate-700">{visitor.first_seen_at ? new Date(visitor.first_seen_at).toLocaleString('ar-EG') : '—'}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-slate-500">آخر نشاط:</dt><dd className="text-slate-700">{visitor.last_seen_at ? new Date(visitor.last_seen_at).toLocaleString('ar-EG') : '—'}</dd></div>
                    </dl>
                    {visitor.user_agent && (
                      <div className="pt-2 border-t border-slate-200">
                        <span className="text-[11px] text-slate-500 block mb-1">User Agent الكامل:</span>
                        <code dir="ltr" className="block text-[10px] bg-white border border-slate-200 rounded-lg p-2 break-all text-slate-600">
                          {visitor.user_agent}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {tab === 'views' && (
              <div className="space-y-5">
                <div>
                  <h4 className="font-black text-sm text-slate-900 mb-2.5 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-amber-700" />
                    <span>المنتجات التي شاهدها ({(insights.recent_views || []).length})</span>
                  </h4>
                  {(insights.recent_views || []).length === 0 ? (
                    <p className="text-slate-500 py-4 bg-slate-50 rounded-xl text-center">لم تتم زيارة أي صفحات منتجات في هذه الجلسة بعد.</p>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-2.5">
                      {insights.recent_views.map((v: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {Array.isArray(v.images) && v.images[0] && (
                              <img src={v.images[0]} alt="" className="w-10 h-10 rounded-xl object-contain bg-white border border-slate-200 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <strong className="text-slate-900 block truncate">{v.name_ar || v.product_id}</strong>
                              <span className="text-[11px] text-slate-500 block">
                                {[v.brand, v.category].filter(Boolean).join(' • ')} • {new Date(v.viewed_at).toLocaleString('ar-EG')}
                              </span>
                            </div>
                          </div>
                          {v.price && <strong className="text-amber-700 font-outfit shrink-0">{formatPrice(Number(v.price))}</strong>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {(insights.category_views || []).length > 0 && (
                  <div>
                    <h4 className="font-black text-sm text-slate-900 mb-2 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>الأقسام التي تصفحها</span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {insights.category_views.map((c: any, i: number) => (
                        <span key={i} className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 font-bold">
                          {c.category} ({c.count}×)
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {(insights.wishlist_events || []).length > 0 && (
                  <div>
                    <h4 className="font-black text-sm text-slate-900 mb-2 flex items-center gap-1.5">
                      <Heart className="w-4 h-4 text-rose-600" />
                      <span>أضافها للمفضلة</span>
                    </h4>
                    <div className="space-y-1.5">
                      {insights.wishlist_events.map((w: any, i: number) => (
                        <div key={i} className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200 flex justify-between items-center">
                          <strong className="text-slate-900">{w.name_ar || w.product_id}</strong>
                          {w.price && <span className="text-amber-800 font-bold">{formatPrice(Number(w.price))}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'activity' && (
              <div className="space-y-5">
                <div>
                  <h4 className="font-black text-sm text-slate-900 mb-2 flex items-center gap-1.5">
                    <Search className="w-4 h-4 text-amber-700" />
                    <span>عمليات البحث داخل المتجر ({(insights.searches || []).length})</span>
                  </h4>
                  {(insights.searches || []).length === 0 ? (
                    <p className="text-slate-500 py-4 bg-slate-50 rounded-xl text-center">لم يجرِ أي عمليات بحث مسجلة في هذه الجلسة.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {insights.searches.map((s: any, i: number) => (
                        <div key={i} className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2">
                          <strong className="text-slate-900">{s.query}</strong>
                          <span className="text-[10px] text-slate-500">{new Date(s.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-black text-sm text-slate-900 mb-2 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-700" />
                    <span>السجل الزمني للنشاط ({(insights.timeline || []).length})</span>
                  </h4>
                  {(insights.timeline || []).length === 0 ? (
                    <p className="text-slate-500 py-4 bg-slate-50 rounded-xl text-center">لا توجد أحداث سلوكية مسجلة بعد.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-72 overflow-y-auto">
                      {insights.timeline.map((ev: any) => {
                        const evMeta = ev.metadata && typeof ev.metadata === 'object' ? ev.metadata : {};
                        const label =
                          ev.product_name_ar ||
                          evMeta.product_name ||
                          evMeta.query ||
                          evMeta.category ||
                          ev.target_id ||
                          '';
                        return (
                          <div key={ev.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap justify-between gap-2">
                            <div>
                              <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold text-[10px] me-2">
                                {actionLabels[ev.action_type] || ev.action_type}
                              </span>
                              <strong className="text-slate-900">{label || 'نشاط تصفح'}</strong>
                              {evMeta.path && <span dir="ltr" className="text-[10px] text-slate-500 ms-2">{evMeta.path}</span>}
                            </div>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(ev.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'cart' && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-black text-sm text-slate-900 mb-2 flex items-center gap-1.5">
                    <ShoppingCart className="w-4 h-4 text-amber-700" />
                    <span>السلة الحالية / المتروكة</span>
                  </h4>
                  {!insights.active_cart || !insights.active_cart.items?.length ? (
                    <p className="text-slate-500 py-6 bg-slate-50 rounded-xl text-center">لا توجد منتجات في السلة الحالية لهذه الجلسة.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {insights.active_cart.items.map((it: any, i: number) => (
                        <div key={i} className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-3">
                          <div>
                            <strong className="text-slate-900 block">{it.product?.name_ar || 'منتج'}</strong>
                            <span className="text-[11px] text-slate-600">
                              الكمية: {it.quantity || 1}
                              {it.selected_storage ? ` • ${it.selected_storage}` : ''}
                              {it.selected_color ? ` • ${it.selected_color}` : ''}
                            </span>
                          </div>
                          <strong className="text-amber-800 font-outfit">
                            {formatPrice(Number((it.product?.price || 0) * (it.quantity || 1)))}
                          </strong>
                        </div>
                      ))}
                      <div className="p-3 rounded-2xl bg-slate-100 flex flex-wrap justify-between items-center gap-2 font-bold">
                        <span>
                          الإجمالي: {formatPrice(Number(insights.active_cart.subtotal || 0))} •{' '}
                          <span className={insights.active_cart.is_abandoned ? 'text-rose-700' : 'text-emerald-700'}>
                            {insights.active_cart.is_abandoned ? 'سلة متروكة' : 'نشطة الآن'}
                          </span>
                        </span>
                        <span className="text-[11px] text-slate-500">
                          آخر تحديث: {new Date(insights.active_cart.last_updated_at).toLocaleString('ar-EG')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {(insights.cart_events || []).length > 0 && (
                  <div>
                    <h4 className="font-bold text-slate-900 mb-2">سجل إضافات السلة:</h4>
                    <div className="space-y-1.5">
                      {insights.cart_events.map((ce: any, i: number) => (
                        <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between">
                          <span>{ce.name_ar} × {ce.quantity || 1}</span>
                          <span className="text-slate-500">{new Date(ce.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'orders' && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-black text-sm text-slate-900 mb-2 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-emerald-700" />
                    <span>الطلبات المرتبطة بالهاتف أو البريد ({(insights.orders || []).length})</span>
                  </h4>
                  {(insights.orders || []).length === 0 ? (
                    <p className="text-slate-500 py-4 bg-slate-50 rounded-xl text-center">لا توجد طلبات مسجلة مرتبطة بهذه الجلسة أو رقم الهاتف.</p>
                  ) : (
                    <div className="space-y-2">
                      {insights.orders.map((o: any) => (
                        <div key={o.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap justify-between items-center gap-2">
                          <div>
                            <strong className="font-outfit text-slate-900 block">#{o.order_number}</strong>
                            <span className="text-[11px] text-slate-600 block">
                              {orderStatusNames[o.order_status] || o.order_status} • {paymentMethodNames[o.payment_method] || o.payment_method} ({paymentStatusNames[o.payment_status] || o.payment_status})
                            </span>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />
                              {[o.governorate, o.city, o.address_details].filter(Boolean).join(' - ')}
                            </span>
                          </div>
                          <div className="text-end">
                            <strong className="text-amber-800 font-outfit block">{formatPrice(Number(o.total || 0))}</strong>
                            <span className="text-[11px] text-slate-500">{new Date(o.created_at).toLocaleDateString('ar-EG')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {(insights.reviews || []).length > 0 && (
                  <div>
                    <h4 className="font-black text-sm text-slate-900 mb-2 flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-500" />
                      <span>التقييمات المرسلة ({insights.reviews.length})</span>
                    </h4>
                    <div className="space-y-2">
                      {insights.reviews.map((r: any) => (
                        <div key={r.id} className="p-3 rounded-xl bg-amber-50/50 border border-amber-200">
                          <div className="flex justify-between font-bold">
                            <span>{r.product_name_ar || r.product_id} — {r.rating}/5 ⭐</span>
                            <span className="text-[11px] text-slate-500">{r.status}</span>
                          </div>
                          <p className="text-slate-700 mt-1">{r.comment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(insights.support_tickets || []).length > 0 && (
                  <div>
                    <h4 className="font-black text-sm text-slate-900 mb-2 flex items-center gap-1.5">
                      <Headset className="w-4 h-4 text-blue-600" />
                      <span>تذاكر الدعم الفني ({insights.support_tickets.length})</span>
                    </h4>
                    <div className="space-y-2">
                      {insights.support_tickets.map((t: any) => (
                        <div key={t.id} className="p-3 rounded-xl bg-blue-50/50 border border-blue-200 flex justify-between">
                          <div>
                            <strong className="text-slate-900 block">{t.subject || 'استفسار عميل'}</strong>
                            <span className="text-[11px] text-slate-500">{t.status}</span>
                          </div>
                          <span className="text-[11px] text-slate-500">{new Date(t.updated_at).toLocaleString('ar-EG')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
