import React, { useState } from 'react';
import { 
  User as UserIcon, 
  MapPin, 
  ShoppingBag, 
  ShieldCheck, 
  Phone, 
  Mail, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Clock, 
  LogOut, 
  ExternalLink,
  Edit,
  Save,
  BatteryMedium,
  Lock,
  KeyRound,
  AlertTriangle,
  Crown,
  LayoutDashboard,
  Sparkles,
  Camera,
  Check,
  X,
  FileText
} from 'lucide-react';
import { useAuth, UserAddress } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { egyptianGovernorates } from '../data/governorates';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&w=250&q=80'
];

export const Profile: React.FC = () => {
  const { 
    user, 
    isAdmin, 
    logout, 
    updateProfile, 
    changePassword, 
    updateEmail, 
    deleteAccount, 
    addAddress, 
    deleteAddress 
  } = useAuth();
  
  const { orders, navigate } = useStore();
  const { t, formatPrice } = useLanguage();

  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'warranties' | 'personal' | 'security' | 'danger'>('orders');
  
  // Notification Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  // Address Form State
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newTitle, setNewTitle] = useState('المنزل');
  const [newGov, setNewGov] = useState(egyptianGovernorates[0].name_ar);
  const [newCity, setNewCity] = useState('');
  const [newDetails, setNewDetails] = useState('');

  // Personal Info Form State
  const [nameInput, setNameInput] = useState(user?.name || '');
  const [phoneInput, setPhoneInput] = useState(user?.phone || '');
  const [bioInput, setBioInput] = useState(user?.bio || '');
  const [avatarInput, setAvatarInput] = useState(user?.avatar || PRESET_AVATARS[0]);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);

  // Security Form State (Change Password)
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Email Change State
  const [emailInput, setEmailInput] = useState(user?.email || '');
  const [isChangingEmail, setIsChangingEmail] = useState(false);

  // Delete Account Confirmation State
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 rounded-3xl bg-[#0F1626] border border-white/10 text-center space-y-4 font-cairo shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
          <UserIcon className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">تسجيل الدخول مطلوب</h2>
        <p className="text-xs text-slate-400">يرجى تسجيل الدخول أو إنشاء حساب لعرض ملفك وطلباتك.</p>
        <button
          onClick={() => navigate('home')}
          className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-glow-gold transition-all"
        >
          العودة للرئيسية
        </button>
      </div>
    );
  }

  // Filter orders made by this user
  const userOrders = orders.filter(o => 
    (user.phone && o.customer_phone.includes(user.phone)) ||
    (user.email && o.customer_email?.toLowerCase() === user.email.toLowerCase()) ||
    o.customer_name === user.name
  );

  // 1. Handle Save Personal Profile
  const handleSavePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPersonal(true);
    try {
      const res = await updateProfile({
        name: nameInput.trim(),
        phone: phoneInput.trim(),
        avatar: avatarInput,
        bio: bioInput.trim()
      });
      if (res.success) {
        showToast('success', 'تم حفظ وتحديث بيانات حسابك بنجاح في قاعدة البيانات.');
      } else {
        showToast('error', res.error || 'تعذر تحديث البيانات.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'حدث خطأ أثناء الحفظ.');
    } finally {
      setIsSavingPersonal(false);
    }
  };

  // 2. Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast('error', 'يجب أن تتكون كلمة المرور الجديدة من 6 أحرف على الأقل.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('error', 'كلمة المرور الجديدة غير متطابقة مع تأكيد كلمة المرور.');
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await changePassword(oldPassword, newPassword);
      if (res.success) {
        showToast('success', 'تم تحديث كلمة المرور الخاصة بك بنجاح!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast('error', res.error || 'فشل تحديث كلمة المرور.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'حدث خطأ أثناء تغيير كلمة المرور.');
    } finally {
      setIsChangingPass(false);
    }
  };

  // 3. Handle Change Email
  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      showToast('error', 'يرجى إدخال بريد إلكتروني صحيح.');
      return;
    }
    if (emailInput.trim().toLowerCase() === user.email.toLowerCase()) {
      showToast('error', 'هذا هو بريدك الإلكتروني الحالي بالفعل.');
      return;
    }

    setIsChangingEmail(true);
    try {
      const res = await updateEmail(emailInput);
      if (res.success) {
        showToast('success', 'تم تعديل البريد الإلكتروني لحسابك بنجاح!');
      } else {
        showToast('error', res.error || 'فشل تحديث البريد الإلكتروني.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'حدث خطأ.');
    } finally {
      setIsChangingEmail(false);
    }
  };

  // 4. Handle Delete Account
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'حذف' && deleteConfirmText !== 'DELETE') {
      showToast('error', 'يرجى كتابة كلمة "حذف" في المربع لتأكيد الحذف.');
      return;
    }

    if (user.email?.toLowerCase() === 'abdolailah586@gmail.com') {
      showToast('error', 'لا يمكن حذف الحساب الرئيسي للمالك (abdolailah586@gmail.com).');
      setShowDeleteModal(false);
      return;
    }

    setIsDeleting(true);
    try {
      const res = await deleteAccount();
      if (res.success) {
        navigate('home');
      } else {
        showToast('error', res.error || 'تعذر حذف الحساب.');
        setIsDeleting(false);
      }
    } catch (err: any) {
      showToast('error', err.message || 'حدث خطأ أثناء محاولة حذف الحساب.');
      setIsDeleting(false);
    }
  };

  // 5. Handle Add Address
  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDetails) return;
    addAddress({
      title: newTitle,
      governorate: newGov,
      city: newCity || 'المدينة',
      details: newDetails,
      isDefault: user.addresses.length === 0
    });
    setShowAddressForm(false);
    setNewDetails('');
    setNewCity('');
    showToast('success', 'تمت إضافة العنوان الجديد إلى دفتر العناوين بنجاح.');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 font-cairo">
      {/* Toast Alert */}
      {toast && (
        <div className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold transition-all shadow-xl animate-fade-in ${
          toast.type === 'success' 
            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{toast.msg}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-white/60 hover:text-white">✕</button>
        </div>
      )}

      {/* Admin Special Notification Banner */}
      {isAdmin && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-glow-gold">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-amber-300 text-xs sm:text-sm">أهلاً بك يا مدير النظام! (Admin Privileges Active)</h3>
              <p className="text-[11px] text-slate-300">حسابك يمتلك صلاحية الوصول الكاملة للتحكم في المتجر والمخزون والطلبات.</p>
            </div>
          </div>
          <button
            onClick={() => navigate('admin')}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-md transition-all flex-shrink-0"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>فتح لوحة التحكم الإدارية ←</span>
          </button>
        </div>
      )}

      {/* 1. Header Profile Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0F1626] border border-amber-500/30 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-right">
          <div className="relative group">
            <img
              src={user.avatar || PRESET_AVATARS[0]}
              alt=""
              className="w-20 h-20 rounded-full object-cover border-2 border-amber-400 shadow-glow-gold"
            />
            <button
              onClick={() => { setActiveTab('personal'); setShowAvatarPicker(true); }}
              className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-amber-400"
              title="تغيير الصورة الرمزية"
            >
              <Camera className="w-5 h-5" />
            </button>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">{user.name}</h1>
              {isAdmin ? (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/40 flex items-center gap-1 shadow-glow-gold">
                  <Crown className="w-3 h-3 text-amber-400" />
                  <span>مسؤول المتجر (Admin)</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30">
                  عميل مميز (VIP Customer)
                </span>
              )}

              <span className="px-2 py-0.5 rounded-md bg-white/5 text-slate-400 text-[10px] font-outfit">
                {user.provider === 'google' ? 'Google Auth' : 'Verified Email'}
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3 font-outfit">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                <span>{user.email}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>{user.phone || 'لم يسجل هاتف'}</span>
              </span>
            </p>

            {user.bio && (
              <p className="text-xs text-slate-300 mt-1.5 line-clamp-1 italic">
                "{user.bio}"
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={logout}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-white/10 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'orders' ? 'bg-amber-500 text-black shadow-glow-gold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>طلباتي السابقة ({userOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('addresses')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'addresses' ? 'bg-amber-500 text-black shadow-glow-gold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>عناوين التوصيل ({user.addresses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('warranties')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'warranties' ? 'bg-amber-500 text-black shadow-glow-gold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>شهادات الضمان</span>
        </button>

        <button
          onClick={() => setActiveTab('personal')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'personal' ? 'bg-amber-500 text-black shadow-glow-gold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Edit className="w-4 h-4" />
          <span>البيانات والملف الشخصي</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'security' ? 'bg-amber-500 text-black shadow-glow-gold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>الأمان وكلمة المرور</span>
        </button>

        <button
          onClick={() => setActiveTab('danger')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'danger' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-rose-400/70 hover:text-rose-400'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>حذف الحساب</span>
        </button>
      </div>

      {/* TAB 1: ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {userOrders.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[#0F1626] border border-white/10 space-y-3">
              <ShoppingBag className="w-12 h-12 text-slate-500 mx-auto" />
              <h3 className="font-bold text-white text-base">لا توجد طلبات سابقة حتى الآن</h3>
              <p className="text-xs text-slate-400">استكشف أحدث الهواتف والإكسسوارات وسجل طلبك الأول!</p>
              <button
                onClick={() => navigate('catalog')}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-glow-gold"
              >
                تصفح المنتجات الآن
              </button>
            </div>
          ) : (
            userOrders.map((ord) => (
              <div key={ord.id} className="p-6 rounded-3xl bg-[#0F1626] border border-white/10 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <strong className="text-white font-outfit text-base">#{ord.order_number}</strong>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {ord.order_status === 'pending' && 'قيد المراجعة'}
                      {ord.order_status === 'confirmed' && 'تم التأكيد'}
                      {ord.order_status === 'shipped' && 'تم الشحن'}
                      {ord.order_status === 'delivered' && 'تم التوصيل بنجاح'}
                    </span>
                    <span className="text-xs text-slate-400 font-outfit">
                      {new Date(ord.created_at).toLocaleDateString('ar-EG')}
                    </span>
                  </div>

                  <strong className="text-lg font-black text-amber-400 font-outfit">
                    {formatPrice(ord.total)}
                  </strong>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  {ord.items.map((it, i) => (
                    <div key={i} className="flex items-center justify-between text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <img src={it.product.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-800" />
                        <div>
                          <span className="font-bold text-white block">{it.product.name_ar}</span>
                          <span className="text-[10px] text-slate-400">{it.selected_storage || it.product.storage} • {it.selected_color || it.product.color_ar}</span>
                        </div>
                      </div>
                      <span className="font-outfit font-bold">{formatPrice(it.product.price * it.quantity)}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="text-slate-400">التوصيل إلى: {ord.governorate} - {ord.city}</span>
                  <button
                    onClick={() => navigate('track-order')}
                    className="text-amber-400 hover:underline flex items-center gap-1 font-bold"
                  >
                    <span>تتبع مسار الشحنة</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: SAVED ADDRESSES */}
      {activeTab === 'addresses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white">دفتر عناوين الشحن</h3>
              <p className="text-[11px] text-slate-400">احفظ عناوينك المفضلة (المنزل، العمل) لتسريع الشحن بضغطة زر واحدة.</p>
            </div>
            <button
              onClick={() => setShowAddressForm(!showAddressForm)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-glow-gold"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة عنوان جديد</span>
            </button>
          </div>

          {showAddressForm && (
            <form onSubmit={handleAddAddress} className="p-6 rounded-3xl bg-[#0F1626] border border-amber-500/40 space-y-4 text-xs">
              <h4 className="font-bold text-white text-sm">بيانات العنوان الجديد</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">تسمية العنوان:</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="المنزل، العمل، إلخ"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">المحافظة:</label>
                  <select
                    value={newGov}
                    onChange={(e) => setNewGov(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white"
                  >
                    {egyptianGovernorates.map(g => (
                      <option key={g.id} value={g.name_ar}>{g.name_ar}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">المدينة / الحي:</label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="المنصورة، طلخا، ميت غمر..."
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">العنوان التفصيلي:</label>
                <input
                  type="text"
                  required
                  value={newDetails}
                  onChange={(e) => setNewDetails(e.target.value)}
                  placeholder="الشارع، رقم العمارة، الشقة، علامة مميزة"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddressForm(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-slate-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 text-black font-bold"
                >
                  حفظ العنوان
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {user.addresses.map((addr) => (
              <div key={addr.id} className="p-5 rounded-2xl bg-[#0F1626] border border-white/10 space-y-2 relative shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-400" />
                    <strong className="text-white text-xs">{addr.title}</strong>
                    {addr.isDefault && (
                      <span className="px-2 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                        افتراضي
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => { deleteAddress(addr.id); showToast('success', 'تم حذف العنوان بنجاح.'); }}
                    className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                    title="حذف العنوان"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-white font-bold">{addr.governorate} - {addr.city}</p>
                <p className="text-xs text-slate-400">{addr.details}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: WARRANTIES */}
      {activeTab === 'warranties' && (
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-[#0F1626] border border-emerald-500/30 space-y-4 shadow-xl">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>الضمان المعتمد لأجهزتك من متجر جو ستور</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              جميع الأجهزة المشتراة من متجر جو ستور (JOE Store) مشمولة بضمان استبدال فوري وصيانة رسمية معتمدة ضد عيوب الصناعة بفرعنا في المنصورة.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-900 border border-white/5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <strong className="text-white font-bold">آبل آيفون 13 (iPhone 13 - 128GB)</strong>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    ساري حتى سبتمبر 2026
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">حالة الجهاز: كسر زيرو ممتاز • نسبة البطارية: 94%</p>
                <p className="text-[10px] text-emerald-400 font-bold">✓ يشمل الشاشة واللوحة الأم والكاميرات ومستشعر Face ID</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-white/5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <strong className="text-white font-bold">سماعة Apple AirPods Pro 2 الأصلية</strong>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    ساري حتى مارس 2027
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">حالة المنتج: جديد متبرشم • الضمان: استبدال فوري</p>
                <p className="text-[10px] text-emerald-400 font-bold">✓ عزل الضوضاء النشط وجودة الميكروفونات وشريحة H2</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PERSONAL INFO & AVATAR PICKER */}
      {activeTab === 'personal' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-[#0F1626] border border-white/10 shadow-2xl space-y-6">
          <div className="border-b border-white/10 pb-4">
            <h3 className="font-bold text-white text-base">تعديل الملف الشخصي والبيانات الإضافية</h3>
            <p className="text-xs text-slate-400 mt-1">خصص اسمك، صورة حسابك، رقم هاتفك للتواصل السريع ومعلومات التوصيل.</p>
          </div>

          <form onSubmit={handleSavePersonalInfo} className="space-y-6 text-xs font-cairo max-w-2xl">
            {/* Avatar Selection */}
            <div>
              <label className="block text-slate-300 mb-2 font-bold">الصورة الرمزية للحساب (Avatar):</label>
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {PRESET_AVATARS.map((av, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setAvatarInput(av)}
                    className={`relative w-14 h-14 rounded-2xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                      avatarInput === av ? 'border-amber-400 scale-105 shadow-glow-gold' : 'border-white/10 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={av} alt="" className="w-full h-full object-cover" />
                    {avatarInput === av && (
                      <div className="absolute inset-0 bg-amber-500/30 flex items-center justify-center">
                        <Check className="w-5 h-5 text-amber-300 font-black" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Custom Image URL input */}
              <div className="mt-3">
                <input
                  type="url"
                  value={avatarInput}
                  onChange={(e) => setAvatarInput(e.target.value)}
                  placeholder="أو ضع رابط صورة خارجي مخصص (URL)..."
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 mb-1.5 font-bold">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="اسمك الكامل"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1.5 font-bold">رقم الهاتف الأساسي (واتساب) *</label>
                <input
                  type="tel"
                  required
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="01554826209"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white font-outfit focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-1.5 font-bold">نبذة أو ملاحظات عنك (Bio / Notes):</label>
              <textarea
                rows={3}
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                placeholder="أضف أي تفاصيل مفضلة للتوصيل، نوع الهواتف المفضلة، إلخ..."
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingPersonal}
              className="px-8 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-glow-gold transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingPersonal ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 5: SECURITY (CHANGE EMAIL & PASSWORD) */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Card A: Change Email */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0F1626] border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">تغيير البريد الإلكتروني للحساب</h3>
                <p className="text-[11px] text-slate-400">البريد الإلكتروني الحالي: <span className="font-outfit text-white font-bold">{user.email}</span></p>
              </div>
            </div>

            <form onSubmit={handleChangeEmail} className="space-y-3 max-w-md text-xs font-cairo">
              <div>
                <label className="block text-slate-300 mb-1 font-bold">البريد الإلكتروني الجديد:</label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="new-email@example.com"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white font-outfit focus:outline-none focus:border-blue-400"
                />
              </div>

              <button
                type="submit"
                disabled={isChangingEmail}
                className="px-6 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs shadow-md transition-all"
              >
                {isChangingEmail ? 'جاري التحديث...' : 'تحديث البريد الإلكتروني'}
              </button>
            </form>
          </div>

          {/* Card B: Change Password */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0F1626] border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">تغيير كلمة المرور (Security & Password)</h3>
                <p className="text-[11px] text-slate-400">احرص على استخدام كلمة مرور قوية تحتوي على أحرف وأرقام لحماية حسابك.</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md text-xs font-cairo">
              <div>
                <label className="block text-slate-300 mb-1 font-bold">كلمة المرور الحالية:</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white font-outfit focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold">كلمة المرور الجديدة:</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="6 أحرف أو أكثر..."
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white font-outfit focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold">تأكيد كلمة المرور الجديدة:</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور الجديدة..."
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white font-outfit focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                type="submit"
                disabled={isChangingPass}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-glow-gold transition-all"
              >
                {isChangingPass ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 6: DANGER ZONE (DELETE ACCOUNT) */}
      {activeTab === 'danger' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-rose-500/10 border border-rose-500/30 shadow-2xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-rose-300 text-base">منطقة الخطر: حذف الحساب نهائياً</h3>
              <p className="text-xs text-slate-300 mt-0.5">حذف حسابك سيؤدي إلى مسح جميع بياناتك المحفوظة وعناوين التوصيل بشكل نهائي من قاعدة البيانات.</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-rose-500/20 text-xs text-slate-300 space-y-2">
            <p className="font-bold text-rose-400">ماذا يحدث عند حذف حسابك؟</p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
              <li>سيتم إزالة حسابك نهائياً من قاعدة بيانات Neon PostgreSQL.</li>
              <li>سيتم مسح جميع عناوين الشحن المسجلة لك.</li>
              <li>لن تتمكن من استرجاع هذا الحساب مجدداً بنفس الصلاحيات.</li>
            </ul>
          </div>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-rose-900/30 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>طلب حذف الحساب نهائياً</span>
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0F1626] border border-rose-500/40 rounded-3xl p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <span>تأكيد نهائي لحذف الحساب</span>
              </h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              لتأكيد الحذف النهائي، يرجى كتابة كلمة <strong className="text-rose-400 font-bold">حذف</strong> في المربع التالي ثم اضغط على زر التأكيد:
            </p>

            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="اكتب: حذف"
              className="w-full bg-slate-900 border border-rose-500/40 rounded-xl p-2.5 text-center text-white font-bold text-sm focus:outline-none focus:border-rose-400"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-bold"
              >
                إلغاء التراجع
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || (deleteConfirmText !== 'حذف' && deleteConfirmText !== 'DELETE')}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                  deleteConfirmText === 'حذف' || deleteConfirmText === 'DELETE'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg'
                    : 'bg-rose-900/30 text-rose-400/40 cursor-not-allowed'
                }`}
              >
                {isDeleting ? 'جاري الحذف...' : 'تأكيد الحذف نهائياً'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
