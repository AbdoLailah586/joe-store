import React, { useEffect, useRef, useState } from 'react';
import {
  RefreshCw,
  X,
  Trash2,
  UserPlus,
  Sparkles,
  Eye,
  ShoppingCart,
  Clock,
  Calendar,
  Activity,
  MessageCircle,
  Globe,
  Smartphone,
  Search,
  UserX
} from 'lucide-react';
import { neonDb } from '../../services/neonDb';
import { useAuth, User } from '../../context/AuthContext';
import { adminSections, AdminSection } from './AdminShell';
import { MetricCard, useDetails } from '../../components/DetailsDialog';
import { generateWhatsAppWebLink } from '../../utils/whatsappService';
import { GuestInsightsModal } from './GuestInsightsModal';

const field = 'w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900';
const owner = 'abdolailah586@gmail.com';
type Mode = 'customer' | 'limited' | 'admin';
const accessMode = (u: User): Mode => (u.role === 'admin' ? 'admin' : u.admin_permissions?.length ? 'limited' : 'customer');
const formatEgp = (val: number) => `${Number(val || 0).toLocaleString()} ج.م`;

function formatRelativeSeen(iso?: string): string {
  if (!iso) return 'لا يوجد نشاط مسجل بعد';
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 2) return 'أونلاين الآن';
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  const hrs = Math.round(diffMin / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  const days = Math.round(hrs / 24);
  return `منذ ${days} يوم`;
}

function isWithin24h(iso?: string): boolean {
  return Boolean(iso && Date.now() - new Date(iso).getTime() < 86400000);
}

export function UsersTab({ onNavigateSection }: { onNavigateSection?: (section: AdminSection) => void } = {}) {
  const { user: current, isAdmin, canAccessSection } = useAuth();
  const { openDetails } = useDetails();
  const [users, setUsers] = useState<any[]>([]);
  const [guests, setGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  // Permissions Modal
  const [editing, setEditing] = useState<any | null>(null);
  const [mode, setMode] = useState<Mode>('customer');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  // Add User Modal
  const [showAddUser, setShowAddUser] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<Mode>('customer');
  const [newPermissions, setNewPermissions] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // User Insights 4-Tab Modal
  const [insightsUser, setInsightsUser] = useState<any | null>(null);
  const [insights, setInsights] = useState<any | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightsTab, setInsightsTab] = useState<'views' | 'cart' | 'orders' | 'stats'>('views');

  // Guest Insights Modal
  const [selectedGuest, setSelectedGuest] = useState<any | null>(null);
  const [selectedGuestTab, setSelectedGuestTab] = useState<'overview' | 'views' | 'activity' | 'cart' | 'orders'>('overview');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [usersData, guestsData] = await Promise.all([
        neonDb.getAllUsers(),
        typeof neonDb.getGuestVisitors === 'function'
          ? neonDb.getGuestVisitors(300).catch(() => [])
          : Promise.resolve([])
      ]);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setGuests(Array.isArray(guestsData) ? guestsData : []);
    } catch (e: any) {
      setError(e.message || 'تعذر تحميل المستخدمين.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (editing) dialog.current?.showModal();
  }, [editing]);

  const openPermissions = (u: any) => {
    setEditing(u);
    setMode(accessMode(u));
    setPermissions(u.admin_permissions || []);
    setError('');
    setNotice('');
  };

  const openInsightsModal = async (u: any, initialTab: 'views' | 'cart' | 'orders' | 'stats' = 'views') => {
    setInsightsUser(u);
    setInsightsTab(initialTab);
    setInsights(null);
    setLoadingInsights(true);
    try {
      const data = await neonDb.getUserInsights(u.id);
      setInsights(data);
    } finally {
      setLoadingInsights(false);
    }
  };

  const openGuestModal = (g: any, initialTab: 'overview' | 'views' | 'activity' | 'cart' | 'orders' = 'overview') => {
    setSelectedGuestTab(initialTab);
    setSelectedGuest(g);
  };

  const savePermissions = async () => {
    if (!editing || !isAdmin || saving) return;
    if (mode === 'limited' && !permissions.length) {
      setError('اختر قسمًا واحدًا على الأقل للدخول المحدد.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await neonDb.updateUserAccess(editing.id, {
        role: mode === 'admin' ? 'admin' : 'customer',
        permissions: mode === 'limited' ? permissions : []
      });
      if (!result.success || !result.user) throw new Error(result.error || 'تعذر حفظ الصلاحيات.');
      setUsers(prev => prev.map(u => (u.id === editing.id ? { ...u, ...result.user } : u)));
      setNotice(`تم تحديث صلاحيات ${editing.name}.`);
      dialog.current?.close();
      setEditing(null);
    } catch (e: any) {
      setError(e.message || 'تعذر حفظ الصلاحيات.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || creating) return;
    if (newRole === 'limited' && !newPermissions.length) {
      setError('اختر قسماً واحداً على الأقل للصلاحيات المحددة.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const res = await neonDb.adminCreateUser({
        name: newName,
        email: newEmail,
        phone: newPhone,
        password: newPassword,
        role: newRole === 'admin' ? 'admin' : 'customer',
        admin_permissions: newRole === 'limited' ? newPermissions : []
      });
      if (!res.success || !res.user) throw new Error(res.error || 'تعذر إنشاء الحساب.');
      setNotice(`تم إنشاء حساب ${res.user.name} بنجاح!`);
      setShowAddUser(false);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewPassword('');
      setNewRole('customer');
      setNewPermissions([]);
      await load();
    } catch (e: any) {
      setError(e.message || 'تعذر إنشاء الحساب.');
    } finally {
      setCreating(false);
    }
  };

  const remove = async (u: any) => {
    if (!isAdmin || u.id === current?.id || u.email.toLowerCase() === owner) return;
    if (!confirm(`هل تريد حذف حساب ${u.name} نهائيًا؟ لا يمكن التراجع عن الحذف.`)) return;
    try {
      const result = await neonDb.deleteUser(u.id);
      if (!result.success) throw new Error(result.error);
      setUsers(prev => prev.filter(x => x.id !== u.id));
      setNotice('تم حذف الحساب.');
    } catch (e: any) {
      setError(e.message || 'تعذر حذف الحساب.');
    }
  };

  const removeGuest = async (g: any) => {
    if (!isAdmin || typeof neonDb.deleteGuestVisitor !== 'function') return;
    if (!confirm(`هل تريد حذف سجل الزائر (${g.customer_name || g.session_id})؟`)) return;
    const res = await neonDb.deleteGuestVisitor(g.session_id);
    if (res?.success) {
      setGuests(prev => prev.filter(x => x.session_id !== g.session_id));
      setNotice('تم حذف سجل الزائر.');
    }
  };

  const titles: Record<Mode, string> = { customer: 'عميل عادي', limited: 'أقسام محددة', admin: 'مدير كامل' };
  const sectionTitles = Object.fromEntries(adminSections.map(([key, label]) => [key, label]));

  const staffUsers = users.filter(u => accessMode(u) !== 'customer');
  const fullAdmins = users.filter(u => accessMode(u) === 'admin');
  const limitedStaff = users.filter(u => accessMode(u) === 'limited');
  const googleUsers = users.filter(u => u.provider === 'google');
  const emailUsers = users.filter(u => u.provider !== 'google');

  const activeUsers24h = users.filter(u => isWithin24h(u.last_seen_at || u.last_activity_at));
  const activeGuests24h = guests.filter(g => isWithin24h(g.last_seen_at));
  const onlineNowCount =
    users.filter(u => {
      const iso = u.last_seen_at || u.last_activity_at;
      return iso && Date.now() - new Date(iso).getTime() < 120000;
    }).length +
    guests.filter(g => g.last_seen_at && Date.now() - new Date(g.last_seen_at).getTime() < 120000).length;

  const usersWithCart = users.filter(u => Number(u.cart_items_count || 0) > 0);
  const guestsWithCart = guests.filter(g => Number(g.cart_items_count || 0) > 0 || Number(g.cart_subtotal || 0) > 0);
  const totalCartValue =
    usersWithCart.reduce((s, u) => s + Number(u.cart_subtotal || 0), 0) +
    guestsWithCart.reduce((s, g) => s + Number(g.cart_subtotal || 0), 0);

  const usersWithOrders = users.filter(u => Number(u.orders_count || 0) > 0);
  const guestsWithOrders = guests.filter(g => Number(g.orders_count || 0) > 0);
  const totalCompletedOrders =
    users.reduce((s, u) => s + Number(u.completed_orders_count || 0), 0) +
    guests.reduce((s, g) => s + Number(g.completed_orders_count || 0), 0);
  const totalRevenue =
    users.reduce((s, u) => s + Number(u.total_spent || 0), 0) +
    guests.reduce((s, g) => s + Number(g.total_spent || 0), 0);

  const canOpenGuestsPage = Boolean(onNavigateSection && canAccessSection?.('guests'));

  const q = search.trim().toLowerCase();
  const rows = users.filter(u => {
    const matchFilter =
      filter === 'all' || filter === 'registered'
        ? true
        : filter === 'guests'
          ? false
          : filter === 'staff'
            ? accessMode(u) !== 'customer'
            : filter === 'active_24h'
              ? isWithin24h(u.last_seen_at || u.last_activity_at)
              : filter === 'active_cart'
                ? Number(u.cart_items_count || 0) > 0
                : filter === 'has_orders'
                  ? Number(u.orders_count || 0) > 0
                  : accessMode(u) === filter;
    const hay = [u.name, u.email, u.phone, u.source_label, u.utm_campaign, u.device_type].filter(Boolean).join(' ').toLowerCase();
    return matchFilter && (!q || hay.includes(q));
  });

  const guestRows = guests.filter(g => {
    const matchFilter =
      filter === 'all' || filter === 'guests'
        ? true
        : filter === 'active_24h'
          ? isWithin24h(g.last_seen_at)
          : filter === 'active_cart'
            ? Number(g.cart_items_count || 0) > 0 || Number(g.cart_subtotal || 0) > 0
            : filter === 'has_orders'
              ? Number(g.orders_count || 0) > 0
              : false;
    const m = g.metadata && typeof g.metadata === 'object' ? g.metadata : {};
    const hay = [
      g.customer_name,
      g.customer_phone,
      g.customer_email,
      g.session_id,
      g.source_label,
      g.utm_campaign,
      g.device_type,
      g.landing_path,
      g.last_path,
      g.last_search_query,
      m.ip_address,
      m.geo_city,
      m.governorate
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return matchFilter && (!q || hay.includes(q));
  });

  const userDetailRow = (u: any, tab: 'views' | 'cart' | 'orders' | 'stats' = 'views') => ({
    id: u.id,
    label: `${u.name} (${titles[accessMode(u)]})`,
    subtitle: [u.email, u.phone, u.source_label, formatRelativeSeen(u.last_seen_at || u.last_activity_at)].filter(Boolean).join(' • '),
    value: Number(u.total_spent || 0) > 0 ? `${Number(u.completed_orders_count || 0)} طلب • ${formatEgp(Number(u.total_spent))}` : Number(u.cart_items_count || 0) > 0 ? `سلة: ${formatEgp(Number(u.cart_subtotal || 0))}` : undefined,
    facts: [
      { label: 'طريقة الدخول', value: u.provider === 'google' ? 'Google' : 'Email' },
      ...(accessMode(u) === 'limited'
        ? [{ label: 'الأقسام المسموحة', value: (u.admin_permissions || []).map((k: string) => sectionTitles[k] || k).join('، ') }]
        : []),
      { label: 'الزيارات والمنتجات', value: `${Number(u.views_count || 0)} منتج` }
    ],
    onOpen: () => void openInsightsModal(u, tab)
  });

  const guestDetailRow = (g: any, tab: 'overview' | 'views' | 'activity' | 'cart' | 'orders' = 'overview') => ({
    id: `guest-${g.session_id}`,
    label: `${g.customer_name || `زائر (${String(g.session_id).slice(0, 12)})`} — بدون حساب`,
    subtitle: [g.customer_phone, g.source_label || 'دخول مباشر', g.device_type, formatRelativeSeen(g.last_seen_at)].filter(Boolean).join(' • '),
    value: Number(g.cart_subtotal || 0) > 0 ? `سلة: ${formatEgp(Number(g.cart_subtotal))}` : `${Number(g.views_count || 0)} مشاهدة • ${Number(g.searches_count || 0)} بحث`,
    facts: [
      { label: 'أول صفحة', value: g.landing_path || '/' },
      { label: 'آخر مسار', value: g.last_path || '/' }
    ],
    onOpen: () => openGuestModal(g, tab)
  });

  return (
    <div className="space-y-5 font-cairo">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4">
        <div>
          <h2 className="font-black text-base text-slate-900">
            المستخدمون وصلاحيات الفريق والزوار بدون حساب ({users.length} حساب • {guests.length} زائر)
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            إدارة الحسابات والصلاحيات، متابعة الزوار غير المسجلين بحساب، الإيرادات، مصادر الدخول، آخر 15 منتجاً تمت زيارتها، السلة الحالية، والأوردرات المنفذة.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canOpenGuestsPage && (
            <button
              type="button"
              onClick={() => onNavigateSection!('guests')}
              className="px-3.5 py-2.5 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-black flex items-center gap-1.5"
            >
              <UserX className="w-4 h-4" />
              <span>صفحة الزوار بدون حساب ({guests.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setError('');
                setShowAddUser(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black flex items-center gap-1.5 shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة حساب جديد</span>
            </button>
          )}
        </div>
      </div>

      {!isAdmin && (
        <p className="p-4 rounded-xl bg-amber-50 text-amber-900 text-sm">
          لديك صلاحية عرض المستخدمين فقط. حفظ الصلاحيات وإنشاء أو حذف الحسابات متاح للمدير الكامل.
        </p>
      )}
      {notice && <p role="status" className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold">{notice}</p>}
      {error && !editing && !showAddUser && <p role="alert" className="p-4 bg-rose-50 text-rose-800 rounded-xl text-xs font-bold">{error}</p>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <MetricCard
          title="إجمالي الحسابات"
          value={users.length}
          note={`Google: ${googleUsers.length} • بريد: ${emailUsers.length}`}
          onClick={() =>
            openDetails({
              title: `إجمالي الحسابات المسجلة (${users.length})`,
              description: 'جميع الحسابات المسجلة فعلياً في قاعدة البيانات سواء عبر Google أو البريد الإلكتروني، شاملة العملاء والإدارة والموظفين.',
              facts: [
                { label: 'إجمالي الحسابات', value: users.length },
                { label: 'عبر Google', value: googleUsers.length },
                { label: 'عبر البريد الإلكتروني', value: emailUsers.length },
                { label: 'حسابات موثقة البريد', value: users.filter(u => u.email_verified).length },
                { label: 'فريق الإدارة والموظفون', value: staffUsers.length },
                { label: 'إجمالي إنفاق الحسابات', value: formatEgp(users.reduce((s, u) => s + Number(u.total_spent || 0), 0)) }
              ],
              rows: users.map(u => userDetailRow(u, 'stats')),
              actions: [{ label: 'فلترة الحسابات المسجلة في القائمة', run: () => setFilter('registered') }]
            })
          }
        />

        <MetricCard
          title="زوار بدون حساب"
          value={guests.length}
          note={`${activeGuests24h.length} نشط (24س) • ${guestsWithCart.length} بسلة`}
          onClick={() =>
            openDetails({
              title: `زوار بدون حساب (${guests.length})`,
              description: 'المستخدمون الذين تصفحوا المتجر أو بحثوا أو أضافوا للسلة أو تركوا بياناتهم في الدفع/التقييمات بدون فتح حساب مسجل.',
              facts: [
                { label: 'إجمالي الزوار بدون حساب', value: guests.length },
                { label: 'نشطون خلال 24 ساعة', value: activeGuests24h.length },
                { label: 'تركوا اسماً أو هاتفاً أو بريداً', value: guests.filter(g => g.customer_name || g.customer_phone || g.customer_email).length },
                { label: 'لديهم سلة نشطة/متروكة', value: guestsWithCart.length },
                { label: 'من حملات أو مصادر خارجية', value: guests.filter(g => (g.source_channel || 'direct') !== 'direct').length }
              ],
              rows: guests.map(g => guestDetailRow(g, 'overview')),
              actions: [
                { label: 'عرض الزوار بدون حساب هنا', run: () => setFilter('guests') },
                ...(canOpenGuestsPage ? [{ label: 'فتح الصفحة المخصصة للزوار بدون حساب', run: () => onNavigateSection!('guests') }] : [])
              ]
            })
          }
        />

        <MetricCard
          title="الإدارة والموظفون"
          value={staffUsers.length}
          note={`مدير كامل: ${fullAdmins.length} • صلاحيات: ${limitedStaff.length}`}
          onClick={() =>
            openDetails({
              title: `الإدارة والموظفون (${staffUsers.length})`,
              description: 'الحسابات التي تملك صلاحية دخول لوحة الإدارة سواء بصلاحية مدير كامل أو بصلاحيات لأقسام محددة.',
              facts: [
                { label: 'إجمالي فريق العمل', value: staffUsers.length },
                { label: 'مديرون كاملون', value: fullAdmins.length },
                { label: 'موظفون بصلاحيات محددة', value: limitedStaff.length },
                { label: 'نشطون خلال 24 ساعة', value: staffUsers.filter(u => isWithin24h(u.last_seen_at || u.last_activity_at)).length }
              ],
              rows: staffUsers.map(u => userDetailRow(u, 'stats')),
              actions: [{ label: 'عرض فريق العمل في القائمة', run: () => setFilter('staff') }]
            })
          }
        />

        <MetricCard
          title="نشطون خلال 24 ساعة"
          value={activeUsers24h.length + activeGuests24h.length}
          note={`حسابات: ${activeUsers24h.length} • زوار: ${activeGuests24h.length}`}
          onClick={() => {
            const combined = [
              ...activeUsers24h.map(u => ({
                sortAt: new Date(u.last_seen_at || u.last_activity_at || 0).getTime(),
                row: userDetailRow(u, 'views')
              })),
              ...activeGuests24h.map(g => ({
                sortAt: new Date(g.last_seen_at || 0).getTime(),
                row: guestDetailRow(g, 'activity')
              }))
            ]
              .sort((a, b) => b.sortAt - a.sortAt)
              .map(x => x.row);

            openDetails({
              title: `النشطون خلال آخر 24 ساعة (${combined.length})`,
              description: 'كل من زار المتجر أو تصفح منتجات أو أضاف للسلة أو سجّل دخولاً خلال آخر 24 ساعة من الحسابات المسجلة والزوار بدون حساب.',
              facts: [
                { label: 'إجمالي النشطين (24 ساعة)', value: combined.length },
                { label: 'أونلاين الآن (آخر دقيقتين)', value: onlineNowCount },
                { label: 'حسابات مسجلة نشطة', value: activeUsers24h.length },
                { label: 'زوار بدون حساب نشطون', value: activeGuests24h.length }
              ],
              rows: combined,
              actions: [{ label: 'فلترة النشطين خلال 24 ساعة', run: () => setFilter('active_24h') }]
            });
          }}
        />

        <MetricCard
          title="لديهم أصناف بالسلة"
          value={usersWithCart.length + guestsWithCart.length}
          note={`حسابات: ${usersWithCart.length} • زوار: ${guestsWithCart.length}`}
          onClick={() =>
            openDetails({
              title: `لديهم أصناف بالسلة (${usersWithCart.length + guestsWithCart.length})`,
              description: 'الحسابات المسجلة والزوار بدون حساب الذين توجد منتجات في سلة التسوق الخاصة بهم حالياً (نشطة أو متروكة).',
              facts: [
                { label: 'إجمالي السلات', value: usersWithCart.length + guestsWithCart.length },
                { label: 'سلات لحسابات مسجلة', value: usersWithCart.length },
                { label: 'سلات لزوار بدون حساب', value: guestsWithCart.length },
                { label: 'القيمة الإجمالية للسلات', value: formatEgp(totalCartValue) }
              ],
              rows: [
                ...usersWithCart.map(u => userDetailRow(u, 'cart')),
                ...guestsWithCart.map(g => guestDetailRow(g, 'cart'))
              ],
              actions: [{ label: 'فلترة أصحاب السلات في القائمة', run: () => setFilter('active_cart') }]
            })
          }
        />

        <MetricCard
          title="الأوردرات المنفذة والإيرادات"
          value={totalCompletedOrders}
          note={`الإيرادات: ${formatEgp(totalRevenue)}`}
          onClick={() => {
            const avgOrder = totalCompletedOrders > 0 ? Math.round(totalRevenue / totalCompletedOrders) : 0;
            const customerRows = [
              ...usersWithOrders.map(u => ({
                spent: Number(u.total_spent || 0),
                row: userDetailRow(u, 'orders')
              })),
              ...guestsWithOrders.map(g => ({
                spent: Number(g.total_spent || 0),
                row: guestDetailRow(g, 'orders')
              }))
            ]
              .sort((a, b) => b.spent - a.spent)
              .map(x => x.row);

            openDetails({
              title: `الأوردرات المنفذة والإيرادات (${totalCompletedOrders} طلب)`,
              description: 'ملخص الطلبات غير الملغاة وإجمالي الإيرادات المسجلة من عملاء الحسابات والطلبات المطابقة لهواتف وبريد الزوار.',
              facts: [
                { label: 'عدد الأوردرات المنفذة (غير الملغاة)', value: totalCompletedOrders },
                { label: 'إجمالي الإيرادات المسجلة', value: formatEgp(totalRevenue) },
                { label: 'متوسط قيمة الطلب', value: formatEgp(avgOrder) },
                { label: 'حسابات لديها طلبات', value: usersWithOrders.length },
                { label: 'زوار لديهم طلبات مطابقة', value: guestsWithOrders.length }
              ],
              rows: customerRows,
              actions: [{ label: 'فلترة العملاء أصحاب الطلبات', run: () => setFilter('has_orders') }]
            });
          }}
        />
      </div>

      {/* Quick Toggle Pills + Search + Granular Filter */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {[
            ['all', `الكل: حسابات وزوار (${users.length + guests.length})`],
            ['registered', `الحسابات المسجلة (${users.length})`],
            ['guests', `زوار بدون حساب (${guests.length})`],
            ['staff', `الإدارة والموظفون (${staffUsers.length})`],
            ['active_24h', `نشطون خلال 24 ساعة (${activeUsers24h.length + activeGuests24h.length})`],
            ['active_cart', `لديهم سلة (${usersWithCart.length + guestsWithCart.length})`]
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-3.5 py-2 rounded-xl font-bold transition-colors ${
                filter === key ? 'bg-amber-500 text-black' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <input
            className={`${field} flex-1 min-w-48`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو البريد أو الهاتف أو مصدر الزيارة أو معرف الجلسة..."
          />
          <select className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">الكل — حسابات وزوار ({users.length + guests.length})</option>
            <option value="registered">الحسابات المسجلة فقط ({users.length})</option>
            <option value="guests">زوار بدون حساب فقط ({guests.length})</option>
            <option value="staff">الإدارة والموظفون ({staffUsers.length})</option>
            <option value="admin">مدير كامل ({fullAdmins.length})</option>
            <option value="limited">صلاحيات محددة ({limitedStaff.length})</option>
            <option value="customer">العملاء المسجلون ({users.filter(u => accessMode(u) === 'customer').length})</option>
            <option value="active_24h">نشطون خلال 24 ساعة ({activeUsers24h.length + activeGuests24h.length})</option>
            <option value="active_cart">بسلة نشطة ({usersWithCart.length + guestsWithCart.length})</option>
            <option value="has_orders">لديهم طلبات ({usersWithOrders.length + guestsWithOrders.length})</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p role="status" className="p-8 text-center">جارٍ تحميل المستخدمين والزوار…</p>
      ) : (
        <div className="space-y-6">
          {/* Registered Accounts Section */}
          {rows.length > 0 && (
            <section className="space-y-3">
              {guestRows.length > 0 && (
                <h3 className="font-black text-sm text-slate-800 px-1">
                  الحسابات المسجلة ({rows.length})
                </h3>
              )}
              {rows.map(u => {
                const seenIso = u.last_seen_at || u.last_activity_at;
                return (
                  <article key={u.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex flex-wrap justify-between gap-4 items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-bold text-slate-900">
                            <button
                              type="button"
                              className="detail-info-button"
                              onClick={() =>
                                openDetails({
                                  title: u.name,
                                  description: 'بيانات الحساب والصلاحيات المسجلة.',
                                  facts: [
                                    { label: 'البريد', value: u.email },
                                    { label: 'الهاتف', value: u.phone || 'غير مسجل' },
                                    { label: 'نوع الوصول', value: titles[accessMode(u)] },
                                    { label: 'تاريخ الإنشاء', value: u.created_at ? new Date(u.created_at).toLocaleString('ar-EG') : '' }
                                  ]
                                })
                              }
                            >
                              {u.name}
                            </button>
                          </h2>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                            {u.provider === 'google' ? 'GOOGLE' : 'EMAIL'}
                          </span>
                          {u.email?.toLowerCase() === owner && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                              المالك المحمي
                            </span>
                          )}
                          {u.id === current?.id && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">أنت</span>
                          )}
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            {formatRelativeSeen(seenIso)}
                          </span>
                          {u.source_label && (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                              {u.source_label}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 break-all mt-1">
                          {u.email} {u.phone ? `• ${u.phone}` : ''}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void openInsightsModal(u)}
                          className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>تحليلات الحساب والسلة والطلبات</span>
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              disabled={u.email?.toLowerCase() === owner || u.id === current?.id}
                              onClick={() => openPermissions(u)}
                              className="border border-slate-300 rounded-xl px-3.5 py-2 bg-slate-50 text-slate-800 font-bold text-xs disabled:opacity-40"
                            >
                              {titles[accessMode(u)]}
                            </button>
                            <button
                              aria-label={`حذف حساب ${u.name}`}
                              disabled={u.email?.toLowerCase() === owner || u.id === current?.id}
                              onClick={() => remove(u)}
                              className="p-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-30"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Telemetry Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                        <span className="text-slate-500 flex items-center gap-1"><Calendar className="w-3 h-3" />تاريخ الإنشاء</span>
                        <strong className="text-slate-900 block mt-0.5">{u.created_at ? new Date(u.created_at).toLocaleDateString('ar-EG') : '—'}</strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                        <span className="text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />آخر ترافيك / أونلاين</span>
                        <strong className="text-slate-900 block mt-0.5">{seenIso ? new Date(seenIso).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                        <span className="text-slate-500 flex items-center gap-1"><Eye className="w-3 h-3" />منتجات زارها</span>
                        <strong className="text-slate-900 block mt-0.5">{Number(u.views_count || 0)} منتج (آخر 15)</strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                        <span className="text-slate-500 flex items-center gap-1"><ShoppingCart className="w-3 h-3" />السلة والأوردرات</span>
                        <strong className="text-slate-900 block mt-0.5">
                          {Number(u.cart_items_count || 0) > 0 ? `${u.cart_items_count} بالسلة` : 'سلة فارغة'} • {Number(u.completed_orders_count || 0)} طلب ({formatEgp(Number(u.total_spent || 0))})
                        </strong>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          )}

          {/* Unregistered Guests Section */}
          {guestRows.length > 0 && (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <h3 className="font-black text-sm text-slate-800 flex items-center gap-2">
                  <UserX className="w-4 h-4 text-amber-700" />
                  <span>زوار بدون حساب ({guestRows.length})</span>
                </h3>
                {canOpenGuestsPage && (
                  <button
                    type="button"
                    onClick={() => onNavigateSection!('guests')}
                    className="text-xs font-bold text-amber-800 hover:underline"
                  >
                    عرض كل التفاصيل والتصدير في الصفحة المخصصة ←
                  </button>
                )}
              </div>

              {guestRows.map(g => {
                const meta = g.metadata && typeof g.metadata === 'object' ? g.metadata : {};
                return (
                  <article key={g.session_id} className="bg-white border border-amber-200/80 rounded-2xl p-4 space-y-3">
                    <div className="flex flex-wrap justify-between gap-4 items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black">
                            بدون حساب
                          </span>
                          <h2 className="font-bold text-slate-900">
                            {g.customer_name || `زائر (${String(g.session_id).slice(0, 14)})`}
                          </h2>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            {formatRelativeSeen(g.last_seen_at)}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                            {g.source_label || 'دخول مباشر'}
                          </span>
                          {g.utm_campaign && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold">
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
                        <p className="text-xs text-slate-600 break-all mt-1">
                          <span className="font-mono text-[11px]">{g.session_id}</span>
                          {g.customer_phone ? ` • 📞 ${g.customer_phone}` : ''}
                          {g.customer_email ? ` • ✉️ ${g.customer_email}` : ''}
                          {meta.ip_address ? ` • IP: ${meta.ip_address}` : ''}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openGuestModal(g, 'overview')}
                          className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>تحليلات الزائر الكاملة</span>
                        </button>
                        {g.customer_phone && (
                          <a
                            href={generateWhatsAppWebLink(
                              g.customer_phone,
                              `أهلاً ${g.customer_name || ''} من متجر جو ستور! لاحظنا اهتمامك بمنتجاتنا، هل نساعدك؟`
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>واتساب</span>
                          </a>
                        )}
                        {isAdmin && (
                          <button
                            aria-label={`حذف سجل الزائر ${g.session_id}`}
                            onClick={() => removeGuest(g)}
                            className="p-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                        <span className="text-slate-500 flex items-center gap-1"><Globe className="w-3 h-3" />أول وآخر مسار ({g.visit_count || 1} زيارة)</span>
                        <strong dir="ltr" className="text-slate-900 block mt-0.5 truncate">{g.landing_path || '/'} → {g.last_path || '/'}</strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                        <span className="text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />آخر ترافيك / أونلاين</span>
                        <strong className="text-slate-900 block mt-0.5">{g.last_seen_at ? new Date(g.last_seen_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                        <span className="text-slate-500 flex items-center gap-1"><Search className="w-3 h-3" />مشاهدات وبحث</span>
                        <strong className="text-slate-900 block mt-0.5 truncate">
                          {Number(g.views_count || 0)} منتج • {Number(g.searches_count || 0)} بحث {g.last_search_query ? `(${g.last_search_query})` : ''}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                        <span className="text-slate-500 flex items-center gap-1"><ShoppingCart className="w-3 h-3" />السلة والطلبات</span>
                        <strong className="text-slate-900 block mt-0.5">
                          {Number(g.cart_subtotal || 0) > 0 ? `${Number(g.cart_items_count || 0)} بالسلة (${formatEgp(Number(g.cart_subtotal))})` : 'سلة فارغة'} • {Number(g.orders_count || 0)} طلب
                        </strong>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          )}

          {!rows.length && !guestRows.length && (
            <p className="text-center p-8 text-slate-600">لا توجد حسابات أو زوار تطابق البحث والفلتر الحالي.</p>
          )}
        </div>
      )}

      {/* Permissions Dialog */}
      <dialog ref={dialog} onCancel={e => { if (saving) e.preventDefault(); }} onClose={() => { if (!saving) setEditing(null); }} className="w-[min(800px,95vw)] max-h-[90vh] p-0 rounded-2xl bg-white text-slate-900 backdrop:bg-black/50">
        {editing && (
          <div className="p-5 sm:p-7 space-y-5">
            <div className="flex justify-between gap-3">
              <div>
                <h2 className="font-black text-xl">صلاحيات {editing.name}</h2>
                <p className="text-sm text-slate-500 break-all mt-1">{editing.email}</p>
              </div>
              <button disabled={saving} onClick={() => dialog.current?.close()} aria-label="إغلاق الصلاحيات">
                <X className="w-5 h-5" />
              </button>
            </div>
            <label className="block text-sm font-bold">
              نوع الوصول
              <select className={`${field} mt-2`} value={mode} onChange={e => setMode(e.target.value as Mode)} disabled={saving}>
                {Object.entries(titles).map(([key, title]) => (
                  <option key={key} value={key}>{title}</option>
                ))}
              </select>
            </label>
            {mode === 'admin' && <p className="bg-amber-50 p-4 rounded-xl text-sm text-amber-900">المدير الكامل يمكنه فتح كل الأقسام وتعديل صلاحيات بقية المستخدمين.</p>}
            {mode === 'customer' && <p className="text-sm text-slate-600">حساب تسوق بدون دخول لوحة الإدارة.</p>}
            {mode === 'limited' && (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <button disabled={saving} onClick={() => setPermissions(adminSections.map(s => s[0]))} className="underline text-sm text-amber-800">تحديد كل الصفحات</button>
                  <button disabled={saving} onClick={() => setPermissions([])} className="underline text-sm text-slate-600">مسح التحديد</button>
                </div>
                {[...new Set(adminSections.map(s => s[3]))].map(group => (
                  <fieldset key={group} className="border border-slate-200 rounded-xl p-4">
                    <legend className="px-2 font-bold text-sm">{group}</legend>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {adminSections.filter(s => s[3] === group).map(([key, title]) => (
                        <label key={key} className="flex items-center gap-3 text-sm cursor-pointer">
                          <input type="checkbox" disabled={saving} checked={permissions.includes(key)} onChange={e => setPermissions(prev => e.target.checked ? [...prev, key] : prev.filter(k => k !== key))} />
                          {title}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
            )}
            {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
            <div className="flex justify-between items-center border-t border-slate-200 pt-4 gap-3">
              <p className="text-xs text-slate-500">{mode === 'limited' ? `${permissions.length} قسم محدد` : titles[mode]}</p>
              <button disabled={saving} onClick={savePermissions} className="px-5 py-3 bg-amber-500 rounded-xl font-bold disabled:opacity-50">
                {saving ? 'جارٍ الحفظ…' : 'حفظ الصلاحيات'}
              </button>
            </div>
          </div>
        )}
      </dialog>

      {/* Add Account Modal */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateUser} className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-black text-base text-slate-900">إضافة حساب جديد</h3>
              <button type="button" onClick={() => setShowAddUser(false)}><X className="w-5 h-5" /></button>
            </div>
            <input required value={newName} onChange={e => setNewName(e.target.value)} placeholder="الاسم الكامل" className={field} />
            <input required type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="البريد الإلكتروني" className={field} />
            <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="رقم الهاتف (01XXXXXXXXX)" className={field} />
            <input required minLength={6} type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="كلمة المرور (6 أحرف على الأقل)" className={field} />
            <select value={newRole} onChange={e => setNewRole(e.target.value as Mode)} className={field}>
              <option value="customer">عميل عادي</option>
              <option value="limited">موظف بصلاحيات محددة</option>
              <option value="admin">مدير كامل</option>
            </select>
            {newRole === 'limited' && (
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 max-h-48 overflow-y-auto text-xs">
                {adminSections.map(([key, title]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input type="checkbox" checked={newPermissions.includes(key)} onChange={e => setNewPermissions(prev => e.target.checked ? [...prev, key] : prev.filter(k => k !== key))} />
                    <span>{title}</span>
                  </label>
                ))}
              </div>
            )}
            {error && <p className="text-xs text-rose-700 font-bold">{error}</p>}
            <button type="submit" disabled={creating} className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm">
              {creating ? 'جارٍ الإنشاء...' : 'إنشاء الحساب وحفظه'}
            </button>
          </form>
        </div>
      )}

      {/* User Insights Modal (4 Tabs) */}
      {insightsUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900">تحليلات وسجل حساب: {insightsUser.name}</h3>
                <p className="text-xs text-slate-500">{insightsUser.email} {insightsUser.phone ? `• ${insightsUser.phone}` : ''}</p>
              </div>
              <button type="button" onClick={() => setInsightsUser(null)}><X className="w-5 h-5" /></button>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              {[
                ['views', 'آخر 15 منتجاً زارها'],
                ['cart', 'السلة الآن'],
                ['orders', 'الأوردرات المنفذة'],
                ['stats', 'الإحصائيات ومصدر الدخول']
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setInsightsTab(id as any)}
                  className={`px-3.5 py-2 rounded-xl font-bold ${insightsTab === id ? 'bg-amber-500 text-black' : 'bg-slate-100 text-slate-700'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {loadingInsights ? (
              <p className="py-10 text-center text-sm text-slate-500">جاري تحميل تحليلات الحساب...</p>
            ) : !insights ? (
              <p className="py-10 text-center text-sm text-rose-600">تعذر تحميل تحليلات هذا الحساب.</p>
            ) : (
              <>
                {insightsTab === 'views' && (
                  <div className="space-y-2">
                    {(insights.recent_views || []).length === 0 ? (
                      <p className="text-xs text-slate-500 py-6 text-center">لم تتم زيارة أي منتجات مسجلة بعد.</p>
                    ) : (
                      (insights.recent_views || []).map((v: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
                          <div>
                            <strong className="text-slate-900 block">{v.name_ar || v.product_id}</strong>
                            <span className="text-[11px] text-slate-500">{v.brand} • {new Date(v.viewed_at).toLocaleString('ar-EG')}</span>
                          </div>
                          {v.price && <strong className="text-amber-700 font-outfit">{formatEgp(Number(v.price))}</strong>}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {insightsTab === 'cart' && (
                  <div className="space-y-3">
                    {!insights.active_cart || !insights.active_cart.items?.length ? (
                      <p className="text-xs text-slate-500 py-6 text-center">السلة فارغة حالياً.</p>
                    ) : (
                      <>
                        {insights.active_cart.items.map((it: any, idx: number) => (
                          <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between text-xs">
                            <span>{it.product?.name_ar || 'منتج'} × {it.quantity || 1}</span>
                            <strong className="font-outfit">{formatEgp(Number((it.product?.price || 0) * (it.quantity || 1)))}</strong>
                          </div>
                        ))}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs font-bold">
                          <span>الإجمالي: {formatEgp(Number(insights.active_cart.subtotal || 0))}</span>
                          {insightsUser.phone && (
                            <a
                              href={generateWhatsAppWebLink(insightsUser.phone, `أهلاً ${insightsUser.name}! لاحظنا وجود أصناف بسلتك في جو ستور، نساعدك في إتمام الطلب؟`)}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white flex items-center gap-1"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>متابعة عبر واتساب</span>
                            </a>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {insightsTab === 'orders' && (
                  <div className="space-y-2">
                    {(insights.orders || []).length === 0 ? (
                      <p className="text-xs text-slate-500 py-6 text-center">لا توجد أوردرات لهذا الحساب بعد.</p>
                    ) : (
                      (insights.orders || []).map((o: any) => (
                        <div key={o.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs">
                          <div>
                            <strong className="font-outfit text-slate-900">#{o.order_number}</strong>
                            <span className="text-[11px] text-slate-500 block">{o.order_status} • {new Date(o.created_at).toLocaleDateString('ar-EG')}</span>
                          </div>
                          <strong className="text-amber-700 font-outfit">{formatEgp(Number(o.total || 0))}</strong>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {insightsTab === 'stats' && (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-3 rounded-xl bg-slate-50"><span>إجمالي الطلبات</span><strong className="block text-sm">{insights.stats?.total_orders || 0}</strong></div>
                      <div className="p-3 rounded-xl bg-slate-50"><span>المنفذة</span><strong className="block text-sm">{insights.stats?.completed_orders || 0}</strong></div>
                      <div className="p-3 rounded-xl bg-slate-50"><span>إجمالي الإنفاق</span><strong className="block text-sm">{formatEgp(Number(insights.stats?.total_spent || 0))}</strong></div>
                      <div className="p-3 rounded-xl bg-slate-50"><span>منتجات شاهدها</span><strong className="block text-sm">{insights.stats?.distinct_products_viewed || 0}</strong></div>
                    </div>
                    {(insights.searches || []).length > 0 && (
                      <div className="space-y-1.5">
                        <strong className="block text-slate-800">عمليات البحث المسجلة:</strong>
                        <div className="flex flex-wrap gap-1.5">
                          {insights.searches.map((s: any, idx: number) => (
                            <span key={idx} className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-slate-800">{s.query}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(insights.sessions || []).length > 0 && (
                      <div className="space-y-2">
                        <strong className="block text-slate-800">مصادر الزيارات والأجهزة:</strong>
                        {insights.sessions.map((s: any) => (
                          <div key={s.session_id} className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200 flex flex-wrap justify-between gap-2">
                            <span>{s.source_label || 'دخول مباشر'} {s.utm_campaign ? `(${s.utm_campaign})` : ''}</span>
                            <span className="text-slate-600">{s.device_type} • زيارات: {s.visit_count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <GuestInsightsModal
        guest={selectedGuest}
        initialTab={selectedGuestTab}
        onClose={() => setSelectedGuest(null)}
      />
    </div>
  );
}
