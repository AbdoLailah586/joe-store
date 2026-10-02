import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldCheck, 
  ShieldAlert, 
  UserCheck, 
  UserX, 
  Search, 
  RefreshCw, 
  Mail, 
  Phone, 
  Calendar, 
  Trash2, 
  MapPin, 
  CheckCircle, 
  AlertCircle,
  Crown,
  KeyRound,
  ExternalLink
} from 'lucide-react';
import { neonDb } from '../../services/neonDb';
import { isAccountAdmin, useAuth } from '../../context/AuthContext';

export const UsersTab: React.FC = () => {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'customer'>('all');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [selectedUserAddresses, setSelectedUserAddresses] = useState<any[] | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await neonDb.getAllUsers();
      // Ensure owner has admin role in list
      const normalized = data.map(u => ({
        ...u,
        role: isAccountAdmin(u) ? 'admin' : (u.role || 'customer')
      }));
      setUsers(normalized);
    } catch (err) {
      console.error('Failed to load users:', err);
      setAlert({ type: 'error', msg: 'تعذر جلب قائمة المستخدمين من قاعدة البيانات.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleRole = async (targetUser: any) => {
    const isTargetOwner = targetUser.email?.toLowerCase() === 'abdolailah586@gmail.com';
    if (isTargetOwner) {
      setAlert({ type: 'error', msg: 'لا يمكن تعديل صلاحيات الحساب الرئيسي للمالك (abdolailah586@gmail.com).' });
      return;
    }

    const newRole = targetUser.role === 'admin' ? 'customer' : 'admin';
    const actionName = newRole === 'admin' ? 'ترقية المستخدم إلى مدير (Admin)' : 'خفض الرتبة إلى عميل عادي (Customer)';

    if (!confirm(`هل أنت متأكد من ${actionName} للمستخدم: ${targetUser.name || targetUser.email}؟`)) {
      return;
    }

    try {
      const res = await neonDb.updateUserRole(targetUser.id, newRole);
      if (res.success) {
        setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, role: newRole } : u));
        setAlert({ 
          type: 'success', 
          msg: `تم بنجاح تغيير رتبة (${targetUser.name || targetUser.email}) إلى ${newRole === 'admin' ? 'مسؤول 👑' : 'عميل عادي'}.` 
        });
      } else {
        setAlert({ type: 'error', msg: res.error || 'فشل تحديث رتبة المستخدم.' });
      }
    } catch (err: any) {
      setAlert({ type: 'error', msg: err.message || 'حدث خطأ أثناء تعديل الصلاحية.' });
    }
  };

  const handleDeleteUser = async (targetUser: any) => {
    const isTargetOwner = targetUser.email?.toLowerCase() === 'abdolailah586@gmail.com';
    if (isTargetOwner) {
      setAlert({ type: 'error', msg: 'لا يمكن حذف الحساب الرئيسي للمالك.' });
      return;
    }

    if (targetUser.id === currentAdmin?.id) {
      setAlert({ type: 'error', msg: 'لا يمكنك حذف حسابك الحالي من لوحة التحكم.' });
      return;
    }

    if (!confirm(`تحذير نهائي: هل أنت متأكد تماماً من حذف حساب ${targetUser.name || targetUser.email} نهائياً؟ هذا الإجراء لا يمكن التراجع عنه!`)) {
      return;
    }

    try {
      const res = await neonDb.deleteUser(targetUser.id);
      if (res.success) {
        setUsers(prev => prev.filter(u => u.id !== targetUser.id));
        setAlert({ type: 'success', msg: `تم حذف حساب ${targetUser.name || targetUser.email} نهائياً.` });
      } else {
        setAlert({ type: 'error', msg: res.error || 'فشل حذف المستخدم.' });
      }
    } catch (err: any) {
      setAlert({ type: 'error', msg: err.message || 'حدث خطأ أثناء حذف الحساب.' });
    }
  };

  // Filtered users
  const filteredUsers = users.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const phone = (u.phone || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    }
    return true;
  });

  const totalAdmins = users.filter(u => u.role === 'admin' || isAccountAdmin(u)).length;
  const totalCustomers = users.length - totalAdmins;

  return (
    <div className="space-y-6 font-cairo">
      {/* Alert Banner */}
      {alert && (
        <div className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold ${
          alert.type === 'success' 
            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {alert.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{alert.msg}</span>
          </div>
          <button onClick={() => setAlert(null)} className="text-white/60 hover:text-white">✕</button>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-[#0F1626] border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block font-bold">إجمالي الحسابات المسجلة</span>
            <strong className="text-2xl font-black text-white font-outfit mt-1 block">{users.length}</strong>
            <span className="text-[10px] text-slate-500">مسجلين في قاعدة بيانات Neon</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[#0F1626] border border-amber-500/30 flex items-center justify-between shadow-glow-gold">
          <div>
            <span className="text-xs text-amber-300 block font-bold">المسؤولين (Admins)</span>
            <strong className="text-2xl font-black text-amber-400 font-outfit mt-1 block">{totalAdmins}</strong>
            <span className="text-[10px] text-amber-400/80">لهم صلاحية الدخول للوحة التحكم</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Crown className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[#0F1626] border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block font-bold">العملاء (Customers)</span>
            <strong className="text-2xl font-black text-emerald-400 font-outfit mt-1 block">{totalCustomers}</strong>
            <span className="text-[10px] text-slate-500">حسابات تسوق عادية</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Control Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#0F1626] border border-white/10">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم، الإيميل أو رقم الهاتف..."
              className="w-full bg-slate-900 border border-white/10 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-cairo"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">كل الرتب ({users.length})</option>
            <option value="admin">مسؤولين فقط ({totalAdmins})</option>
            <option value="customer">عملاء فقط ({totalCustomers})</option>
          </select>
        </div>

        <button
          onClick={fetchUsers}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-bold flex items-center gap-1.5 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${loading ? 'animate-spin' : ''}`} />
          <span>تحديث القائمة</span>
        </button>
      </div>

      {/* Users List Table */}
      <div className="rounded-3xl bg-[#0F1626] border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#0A0E1A] text-slate-400 text-[11px] font-bold border-b border-white/10">
              <tr>
                <th className="p-3.5">المستخدم</th>
                <th className="p-3.5">البريد الإلكتروني</th>
                <th className="p-3.5">الهاتف</th>
                <th className="p-3.5">مزود الدخول</th>
                <th className="p-3.5">الرتبة والصلاحية</th>
                <th className="p-3.5">تاريخ التسجيل</th>
                <th className="p-3.5 text-center">التحكم بالرتبة والإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 text-amber-400 animate-spin mx-auto mb-2" />
                    <span>جاري تحميل بيانات المستخدمين من Neon DB...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    لا يوجد مستخدمين يطابقون شروط البحث.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isOwner = u.email?.toLowerCase() === 'abdolailah586@gmail.com';
                  const isCurrent = u.id === currentAdmin?.id;
                  const isAdminUser = u.role === 'admin' || isAccountAdmin(u);

                  return (
                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                      {/* Name & Avatar */}
                      <td className="p-3.5 flex items-center gap-3">
                        <img
                          src={u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover border border-amber-400/40 bg-slate-800 flex-shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <strong className="text-white block font-bold">{u.name || 'عميل جو ستور'}</strong>
                            {isOwner && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-black border border-amber-500/30 flex items-center gap-0.5">
                                <Crown className="w-2.5 h-2.5 text-amber-400" />
                                <span>المالك</span>
                              </span>
                            )}
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 text-[9px] font-bold">
                                أنت
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">ID: {u.id?.slice(0, 10)}...</span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="p-3.5 font-outfit">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-300">{u.email || '-'}</span>
                          {u.email_verified && (
                            <span title="تم توثيق البريد الإلكتروني بنجاح">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="p-3.5 font-outfit">
                        {u.phone ? (
                          <a 
                            href={`https://wa.me/${u.phone.replace(/[^0-9]/g, '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:underline flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3 text-emerald-400" />
                            <span>{u.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>

                      {/* Provider */}
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.provider === 'google' 
                            ? 'bg-red-500/10 text-red-300 border border-red-500/20' 
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {u.provider === 'google' ? 'Google Auth' : 'Email / OTP'}
                        </span>
                      </td>

                      {/* Role Badge */}
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 w-max ${
                          isAdminUser
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-glow-gold'
                            : 'bg-slate-800 text-slate-400 border border-white/5'
                        }`}>
                          {isAdminUser ? <ShieldCheck className="w-3 h-3 text-amber-400" /> : <Users className="w-3 h-3 text-slate-400" />}
                          <span>{isAdminUser ? 'مسؤول (Admin)' : 'عميل (Customer)'}</span>
                        </span>
                      </td>

                      {/* Created At */}
                      <td className="p-3.5 text-[11px] text-slate-400 font-outfit">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('ar-EG') : '-'}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-2">
                          {/* Role Toggle Button */}
                          <button
                            onClick={() => handleToggleRole(u)}
                            disabled={isOwner}
                            className={`px-3 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all ${
                              isOwner
                                ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-500'
                                : isAdminUser
                                ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30'
                                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30'
                            }`}
                            title={isOwner ? 'المالك الرئيسي محمي دائماً' : isAdminUser ? 'تخفيض الرتبة إلى عميل' : 'ترقية إلى مسؤول'}
                          >
                            {isAdminUser ? (
                              <>
                                <UserX className="w-3 h-3" />
                                <span>خفض إلى عميل</span>
                              </>
                            ) : (
                              <>
                                <Crown className="w-3 h-3" />
                                <span>ترقية لمدير 👑</span>
                              </>
                            )}
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={isOwner || isCurrent}
                            className={`p-1.5 rounded-xl transition-all ${
                              isOwner || isCurrent
                                ? 'opacity-20 cursor-not-allowed text-slate-600'
                                : 'bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400'
                            }`}
                            title={isOwner ? 'لا يمكن حذف المالك' : 'حذف الحساب نهائياً'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
