import React, { useEffect, useState } from 'react';
import {
  RefreshCw,
  Globe,
  Smartphone,
  Eye,
  Search,
  ShoppingCart,
  Clock,
  MessageCircle,
  Trash2,
  Download,
  Sparkles,
  MapPin,
  ShieldCheck,
  Users
} from 'lucide-react';
import { neonDb } from '../../services/neonDb';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { MetricCard, useDetails } from '../../components/DetailsDialog';
import { generateWhatsAppWebLink } from '../../utils/whatsappService';
import { downloadCsv } from '../../utils/storeExpansion';
import { GuestInsightsModal } from './GuestInsightsModal';
import type { AdminSection } from './AdminShell';

const field = 'rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-900';

function formatRelativeSeen(iso?: string): string {
  if (!iso) return 'لا يوجد نشاط';
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 2) return 'أونلاين الآن';
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  const hrs = Math.round(diffMin / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  const days = Math.round(hrs / 24);
  return `منذ ${days} يوم`;
}

export const GuestVisitorsTab: React.FC<{
  onNavigateSection?: (section: AdminSection) => void;
}> = ({ onNavigateSection }) => {
  const { isAdmin, canAccessSection } = useAuth();
  const { formatPrice } = useLanguage();
  const { openDetails } = useDetails();

  const [guests, setGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [selectedGuest, setSelectedGuest] = useState<any | null>(null);
  const [selectedGuestTab, setSelectedGuestTab] = useState<'overview' | 'views' | 'activity' | 'cart' | 'orders'>('overview');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await neonDb.getGuestVisitors(300);
      setGuests(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e?.message || 'تعذر تحميل بيانات الزوار غير المسجلين.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleDelete = async (g: any) => {
    if (!isAdmin) return;
    if (!confirm(`حذف سجل الزائر (${g.customer_name || g.session_id}) نهائياً؟`)) return;
    const res = await neonDb.deleteGuestVisitor(g.session_id);
    if (res.success) {
      setGuests(prev => prev.filter(item => item.session_id !== g.session_id));
      setNotice('تم حذف سجل الجلسة بنجاح.');
    }
  };

  const now = Date.now();
  const active24h = guests.filter(g => g.last_seen_at && now - new Date(g.last_seen_at).getTime() < 86400000);
  const onlineNow = guests.filter(g => g.last_seen_at && now - new Date(g.last_seen_at).getTime() < 120000);
  const identified = guests.filter(g => Boolean(g.customer_name || g.customer_phone || g.customer_email));
  const withCart = guests.filter(g => Number(g.cart_items_count || 0) > 0 || Number(g.cart_subtotal || 0) > 0);
  const abandonedCarts = withCart.filter(g => Boolean(g.cart_abandoned));
  const totalCartValue = withCart.reduce((s, g) => s + Number(g.cart_subtotal || 0), 0);
  const fromAdsOrCampaigns = guests.filter(g => (g.source_channel || 'direct') !== 'direct');

  const guestRow = (g: any, tab: 'overview' | 'views' | 'activity' | 'cart' | 'orders' = 'overview') => ({
    id: g.session_id,
    label: g.customer_name || `زائر (${String(g.session_id).slice(0, 14)})`,
    subtitle: [
      g.source_label || 'دخول مباشر',
      g.utm_campaign ? `حملة: ${g.utm_campaign}` : '',
      g.device_type || '',
      formatRelativeSeen(g.last_seen_at)
    ]
      .filter(Boolean)
      .join(' • '),
    value:
      Number(g.cart_subtotal || 0) > 0
        ? `سلة: ${formatPrice(Number(g.cart_subtotal))}`
        : `${Number(g.views_count || 0)} مشاهدة • ${Number(g.searches_count || 0)} بحث`,
    facts: [
      ...(g.customer_phone ? [{ label: 'الهاتف', value: g.customer_phone }] : []),
      ...(g.customer_email ? [{ label: 'البريد', value: g.customer_email }] : []),
      { label: 'أول صفحة', value: g.landing_path || '/' },
      { label: 'الزيارات', value: Number(g.visit_count || 1) }
    ],
    onOpen: () => {
      setSelectedGuestTab(tab);
      setSelectedGuest(g);
    }
  });

  const filtered = guests.filter(g => {
    if (channelFilter !== 'all' && (g.source_channel || 'direct') !== channelFilter) return false;
    if (deviceFilter !== 'all') {
      const dev = String(g.device_type || '').toLowerCase();
      if (deviceFilter === 'mobile' && !dev.includes('mobile') && !dev.includes('موبايل')) return false;
      if (deviceFilter === 'desktop' && !dev.includes('desktop') && !dev.includes('كمبيوتر')) return false;
      if (deviceFilter === 'tablet' && !dev.includes('tablet') && !dev.includes('تابلت')) return false;
    }
    if (segmentFilter === 'identified' && !g.customer_name && !g.customer_phone && !g.customer_email) return false;
    if (segmentFilter === 'active_24h' && (!g.last_seen_at || now - new Date(g.last_seen_at).getTime() >= 86400000)) return false;
    if (segmentFilter === 'has_cart' && Number(g.cart_items_count || 0) <= 0 && Number(g.cart_subtotal || 0) <= 0) return false;
    if (segmentFilter === 'abandoned_cart' && !(g.cart_abandoned && (Number(g.cart_items_count || 0) > 0 || Number(g.cart_subtotal || 0) > 0))) return false;
    if (segmentFilter === 'has_searches' && Number(g.searches_count || 0) <= 0) return false;
    if (segmentFilter === 'has_views' && Number(g.views_count || 0) <= 0) return false;
    if (segmentFilter === 'has_orders' && Number(g.orders_count || 0) <= 0) return false;
    if (segmentFilter === 'has_reviews' && Number(g.reviews_count || 0) <= 0) return false;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const m = g.metadata && typeof g.metadata === 'object' ? g.metadata : {};
      const hay = [
        g.session_id,
        g.customer_name,
        g.customer_phone,
        g.customer_email,
        g.source_label,
        g.source_channel,
        g.utm_source,
        g.utm_medium,
        g.utm_campaign,
        g.utm_content,
        g.utm_term,
        g.click_id,
        g.landing_path,
        g.last_path,
        g.referrer,
        g.device_type,
        g.user_agent,
        g.last_search_query,
        g.last_viewed_product_name,
        m.ip_address,
        m.geo_city,
        m.governorate,
        m.city
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const exportGuestsCsv = () => {
    downloadCsv(
      'JOE_Guest_Visitors',
      [
        'Session ID',
        'الاسم',
        'الهاتف',
        'البريد',
        'المصدر',
        'القناة',
        'UTM Source',
        'UTM Medium',
        'UTM Campaign',
        'UTM Content',
        'UTM Term',
        'Click ID',
        'المُحيل',
        'أول صفحة',
        'آخر صفحة',
        'الجهاز',
        'IP',
        'المدينة الجغرافية',
        'الشاشة',
        'اللغة',
        'الكوكيز',
        'عدد الزيارات',
        'مشاهدات المنتجات',
        'عمليات البحث',
        'آخر بحث',
        'إضافات السلة',
        'قيمة السلة',
        'حالة السلة',
        'الطلبات',
        'التقييمات',
        'أول ظهور',
        'آخر ظهور'
      ],
      filtered.map(g => {
        const m = g.metadata && typeof g.metadata === 'object' ? g.metadata : {};
        return [
          g.session_id,
          g.customer_name || '',
          g.customer_phone || '',
          g.customer_email || '',
          g.source_label || '',
          g.source_channel || '',
          g.utm_source || '',
          g.utm_medium || '',
          g.utm_campaign || '',
          g.utm_content || '',
          g.utm_term || '',
          g.click_id || '',
          g.referrer || '',
          g.landing_path || '',
          g.last_path || '',
          g.device_type || '',
          m.ip_address || '',
          [m.geo_city, m.geo_country, m.governorate, m.city].filter(Boolean).join(' / '),
          m.screen_size || '',
          m.browser_lang || '',
          m.cookie_consent || '',
          g.visit_count || 1,
          g.views_count || 0,
          g.searches_count || 0,
          g.last_search_query || '',
          g.add_to_cart_count || 0,
          g.cart_subtotal || 0,
          Number(g.cart_subtotal || 0) > 0 ? (g.cart_abandoned ? 'متروكة' : 'نشطة') : 'فارغة',
          g.orders_count || 0,
          g.reviews_count || 0,
          g.first_seen_at || '',
          g.last_seen_at || ''
        ];
      })
    );
  };

  return (
    <div className="space-y-5 font-cairo">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4">
        <div>
          <h2 className="font-black text-base text-slate-900">
            سجل الزوار بدون حساب وبياناتهم الكاملة ({guests.length})
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            جميع البيانات المجمعة للزوار غير المسجلين: مصدر الدخول والإعلانات (UTM / Click ID)، الأجهزة والـ IP، الصفحات، المنتجات المشاهدة، عمليات البحث، السلات الحية والمتروكة، وبيانات التواصل.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onNavigateSection && canAccessSection('users') && (
            <button
              type="button"
              onClick={() => onNavigateSection('users')}
              className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50"
            >
              <Users className="w-4 h-4 text-amber-700" />
              <span>المستخدمون والصلاحيات</span>
            </button>
          )}
          <button
            type="button"
            onClick={exportGuestsCsv}
            disabled={!filtered.length}
            className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50 disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            <span>تصدير CSV ({filtered.length})</span>
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {notice && <p role="status" className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold">{notice}</p>}
      {error && <p role="alert" className="p-3 bg-rose-50 text-rose-800 rounded-xl text-xs font-bold">{error}</p>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricCard
          title="إجمالي الزوار بدون حساب"
          value={guests.length}
          note={`بيانات تواصل: ${identified.length} • من إعلانات: ${fromAdsOrCampaigns.length}`}
          onClick={() =>
            openDetails({
              title: 'تفاصيل إجمالي الزوار بدون حساب',
              description:
                'جميع الجلسات المتتبعة في المتجر لزوار لم يفتحوا حساباً بعد أو لم يسجلوا الدخول خلال هذه الجلسة.',
              facts: [
                { label: 'إجمالي الجلسات', value: guests.length },
                { label: 'لديهم اسم أو هاتف أو بريد', value: identified.length },
                { label: 'أونلاين الآن (آخر دقيقتين)', value: onlineNow.length },
                { label: 'قادمون من مصادر غير مباشرة', value: fromAdsOrCampaigns.length }
              ],
              rows: guests.map(g => guestRow(g, 'overview')),
              actions: [{ label: 'عرض الكل في الصفحة', run: () => setSegmentFilter('all') }]
            })
          }
        />
        <MetricCard
          title="نشطون خلال 24 ساعة"
          value={active24h.length}
          note={`أونلاين الآن: ${onlineNow.length}`}
          onClick={() =>
            openDetails({
              title: 'زوار بدون حساب نشطون خلال 24 ساعة',
              description: 'الزوار الذين تصفحوا المتجر أو بحثوا أو عدلوا السلة خلال آخر 24 ساعة بدون حساب.',
              facts: [
                { label: 'نشطون خلال 24 ساعة', value: active24h.length },
                { label: 'أونلاين الآن', value: onlineNow.length },
                { label: 'شاهدوا منتجات', value: active24h.filter(g => Number(g.views_count || 0) > 0).length }
              ],
              rows: active24h.map(g => guestRow(g, 'activity')),
              actions: [{ label: 'فلترة النشطين (24 ساعة)', run: () => setSegmentFilter('active_24h') }]
            })
          }
        />
        <MetricCard
          title="لديهم بيانات تواصل مُجمّعة"
          value={identified.length}
          note="اسم أو هاتف أو بريد من الشيك أوت أو التقييم"
          onClick={() =>
            openDetails({
              title: 'زوار تركوا بيانات تواصل بدون حساب',
              description:
                'زوار أدخلوا الاسم أو رقم الهاتف أو البريد في صفحة الدفع أو التقييمات أو السلة قبل إتمام التسجيل.',
              facts: [
                { label: 'لديهم بيانات تواصل', value: identified.length },
                { label: 'لديهم رقم هاتف', value: identified.filter(g => g.customer_phone).length },
                { label: 'لديهم بريد إلكتروني', value: identified.filter(g => g.customer_email).length }
              ],
              rows: identified.map(g => guestRow(g, 'overview')),
              actions: [{ label: 'فلترة أصحاب بيانات التواصل', run: () => setSegmentFilter('identified') }]
            })
          }
        />
        <MetricCard
          title="سلات نشطة ومتروكة"
          value={withCart.length}
          note={`متروكة: ${abandonedCarts.length} • ${formatPrice(totalCartValue)}`}
          onClick={() =>
            openDetails({
              title: 'سلات الشراء للزوار بدون حساب',
              description: 'جلسات الزوار التي تحتوي على منتجات بالسلة حالياً (نشطة أو متروكة بعد 15 دقيقة).',
              facts: [
                { label: 'إجمالي السلات', value: withCart.length },
                { label: 'سلات متروكة', value: abandonedCarts.length },
                { label: 'القيمة المحتملة', value: formatPrice(totalCartValue) }
              ],
              rows: withCart.map(g => guestRow(g, 'cart')),
              actions: [
                { label: 'فلترة أصحاب السلات', run: () => setSegmentFilter('has_cart') },
                { label: 'السلات المتروكة فقط', run: () => setSegmentFilter('abandoned_cart') }
              ]
            })
          }
        />
        <MetricCard
          title="مصادر الإعلانات والحملات"
          value={fromAdsOrCampaigns.length}
          note="Facebook / Instagram / TikTok / Google / WhatsApp"
          onClick={() => {
            const byChannel = new Map<string, number>();
            for (const g of guests) {
              const label = g.source_label || 'دخول مباشر';
              byChannel.set(label, (byChannel.get(label) || 0) + 1);
            }
            openDetails({
              title: 'توزيع مصادر الزيارات والإعلانات',
              description: 'تحليل مصادر دخول الزوار غير المسجلين بناءً على روابط UTM و Click IDs والمُحيل.',
              facts: Array.from(byChannel.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([label, count]) => ({ label, value: `${count} زائر` })),
              rows: fromAdsOrCampaigns.map(g => guestRow(g, 'overview')),
              actions: [{ label: 'عرض الكل', run: () => setChannelFilter('all') }]
            });
          }}
        />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200 text-xs">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ابحث بالاسم، الهاتف، البريد، الجلسة، البحث، IP، الحملة..."
          className={`${field} lg:col-span-2`}
        />
        <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)} className={field}>
          <option value="all">كل المصادر ({guests.length})</option>
          <option value="facebook_ads">إعلانات فيسبوك</option>
          <option value="instagram_ads">إعلانات إنستجرام</option>
          <option value="tiktok_ads">إعلانات تيك توك</option>
          <option value="google_ads">إعلانات جوجل</option>
          <option value="google_search">بحث جوجل</option>
          <option value="whatsapp">واتساب</option>
          <option value="referral">إحالات خارجية</option>
          <option value="direct">دخول مباشر</option>
        </select>
        <div className="flex gap-2">
          <select value={segmentFilter} onChange={e => setSegmentFilter(e.target.value)} className={`${field} flex-1`}>
            <option value="all">كل الحالات ({guests.length})</option>
            <option value="identified">تركوا اسم/هاتف/بريد ({identified.length})</option>
            <option value="active_24h">نشطون خلال 24 ساعة ({active24h.length})</option>
            <option value="has_cart">لديهم سلة ({withCart.length})</option>
            <option value="abandoned_cart">سلة متروكة ({abandonedCarts.length})</option>
            <option value="has_searches">أجروا بحثاً</option>
            <option value="has_views">شاهدوا منتجات</option>
            <option value="has_orders">لديهم طلبات</option>
            <option value="has_reviews">كتبوا تقييمات</option>
          </select>
          <select value={deviceFilter} onChange={e => setDeviceFilter(e.target.value)} className={field}>
            <option value="all">كل الأجهزة</option>
            <option value="mobile">موبايل</option>
            <option value="desktop">كمبيوتر</option>
            <option value="tablet">تابلت</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p role="status" className="p-10 text-center text-sm text-slate-500">جاري تحميل بيانات الزوار بدون حساب...</p>
      ) : !filtered.length ? (
        <div className="p-10 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
          لا توجد جلسات زوار بدون حساب مطابقة للفلاتر الحالية.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(g => {
            const meta = g.metadata && typeof g.metadata === 'object' ? g.metadata : {};
            const totalSignals =
              Number(g.views_count || 0) +
              Number(g.searches_count || 0) +
              Number(g.add_to_cart_count || 0) +
              Number(g.wishlist_count || 0);
            return (
              <article key={g.session_id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 text-xs">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black text-[10px]">
                        زائر بدون حساب
                      </span>
                      <strong className="text-sm font-black text-slate-900">
                        {g.customer_name || `زائر (${String(g.session_id).slice(0, 14)})`}
                      </strong>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                        {formatRelativeSeen(g.last_seen_at)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[10px]">
                        {g.source_label || 'دخول مباشر'}
                      </span>
                      {g.utm_campaign && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold text-[10px]">
                          حملة: {g.utm_campaign}
                        </span>
                      )}
                      {g.device_type && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] flex items-center gap-1">
                          <Smartphone className="w-3 h-3" />
                          {g.device_type}
                        </span>
                      )}
                      {meta.cookie_consent && meta.cookie_consent !== 'pending' && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          {meta.cookie_consent === 'accepted' ? 'وافق على الكوكيز' : 'الضرورية فقط'}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 break-all">
                      <span className="font-mono">{g.session_id}</span>
                      {g.customer_phone ? ` • 📞 ${g.customer_phone}` : ''}
                      {g.customer_email ? ` • ✉️ ${g.customer_email}` : ''}
                      {meta.ip_address ? ` • IP: ${meta.ip_address}` : ''}
                      {(meta.geo_city || meta.governorate) ? ` • 📍 ${[meta.governorate, meta.city, meta.geo_city, meta.geo_country].filter(Boolean).join(' / ')}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGuestTab('overview');
                        setSelectedGuest(g);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>كل البيانات ({totalSignals} إشارة)</span>
                    </button>
                    {g.customer_phone && (
                      <a
                        href={generateWhatsAppWebLink(
                          g.customer_phone,
                          `أهلاً ${g.customer_name || ''} من متجر جو ستور! لاحظنا اهتمامك بمنتجاتنا، هل نقدر نساعدك؟`
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>واتساب</span>
                      </a>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDelete(g)}
                        aria-label={`حذف بيانات الزائر ${g.session_id}`}
                        className="p-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                    <span className="text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />الزيارات والظهور</span>
                    <strong className="text-slate-900 block mt-0.5">
                      {Number(g.visit_count || 1)} زيارة • {g.last_seen_at ? new Date(g.last_seen_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                    <span className="text-slate-500 flex items-center gap-1"><Globe className="w-3 h-3" />صفحة الدخول / آخر مسار</span>
                    <strong dir="ltr" className="text-slate-900 block mt-0.5 truncate" title={`${g.landing_path || '/'} → ${g.last_path || '/'}`}>
                      {g.landing_path || '/'} → {g.last_path || '/'}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                    <span className="text-slate-500 flex items-center gap-1"><Eye className="w-3 h-3" />منتجات زارها ومفضلة</span>
                    <strong className="text-slate-900 block mt-0.5 truncate" title={g.last_viewed_product_name || ''}>
                      {Number(g.views_count || 0)} منتج • {Number(g.wishlist_count || 0)} مفضلة
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                    <span className="text-slate-500 flex items-center gap-1"><Search className="w-3 h-3" />عمليات البحث</span>
                    <strong className="text-slate-900 block mt-0.5 truncate" title={g.last_search_query || ''}>
                      {Number(g.searches_count || 0)} بحث {g.last_search_query ? `(${g.last_search_query})` : ''}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                    <span className="text-slate-500 flex items-center gap-1"><ShoppingCart className="w-3 h-3" />السلة الحالية</span>
                    <strong className="text-slate-900 block mt-0.5">
                      {Number(g.cart_subtotal || 0) > 0
                        ? `${Number(g.cart_items_count || 0)} صنف • ${formatPrice(Number(g.cart_subtotal))} (${g.cart_abandoned ? 'متروكة' : 'نشطة'})`
                        : 'سلة فارغة'}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                    <span className="text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" />التقنية والطلبات</span>
                    <strong className="text-slate-900 block mt-0.5 truncate">
                      {[meta.screen_size, meta.browser_lang].filter(Boolean).join(' • ') || '—'} • {Number(g.orders_count || 0)} طلب
                    </strong>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <GuestInsightsModal
        guest={selectedGuest}
        initialTab={selectedGuestTab}
        onClose={() => setSelectedGuest(null)}
      />
    </div>
  );
};
