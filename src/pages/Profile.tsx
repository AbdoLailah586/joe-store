import React, { useState } from 'react';
import { 
  User, 
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
  BatteryMedium
} from 'lucide-react';
import { useAuth, UserAddress } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { egyptianGovernorates } from '../data/governorates';

export const Profile: React.FC = () => {
  const { user, logout, updateProfile, addAddress, deleteAddress } = useAuth();
  const { orders, navigate } = useStore();
  const { t, formatPrice } = useLanguage();

  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'warranties' | 'settings'>('orders');
  
  // New Address Form
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newTitle, setNewTitle] = useState('المنزل');
  const [newGov, setNewGov] = useState(egyptianGovernorates[0].name_ar);
  const [newCity, setNewCity] = useState('');
  const [newDetails, setNewDetails] = useState('');

  // Edit Name/Phone
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 rounded-3xl bg-[#0F1626] border border-white/10 text-center space-y-4 font-cairo">
        <h2 className="text-xl font-bold text-white">تسجيل الدخول مطلوب</h2>
        <p className="text-xs text-slate-400">يرجى تسجيل الدخول لعرض حسابك وطلباتك المسجلة.</p>
        <button
          onClick={() => navigate('home')}
          className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs"
        >
          العودة للرئيسية
        </button>
      </div>
    );
  }

  // Filter orders made by this user (by phone or name)
  const userOrders = orders.filter(o => 
    (user.phone && o.customer_phone.includes(user.phone)) ||
    (user.email && o.customer_email === user.email) ||
    o.customer_name === user.name
  );

  const handleSaveProfile = () => {
    updateProfile({ name: editName, phone: editPhone });
    setIsEditing(false);
  };

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
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 font-cairo">
      {/* 1. Header Profile Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0F1626] border border-amber-500/30 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right">
          <img
            src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
            alt=""
            className="w-20 h-20 rounded-full object-cover border-2 border-amber-400 shadow-glow-gold"
          />
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">{user.name}</h1>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                {user.provider === 'google' ? 'Google Account' : 'عضو مسجل'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center justify-center sm:justify-start gap-2">
              <Mail className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-outfit">{user.email}</span>
              <span>•</span>
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-outfit">{user.phone}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={logout}
            className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
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
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'orders' ? 'bg-amber-500 text-black shadow-glow-gold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>طلباتي السابقة ({userOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('addresses')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'addresses' ? 'bg-amber-500 text-black shadow-glow-gold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>عناوين التوصيل المحفوظة ({user.addresses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('warranties')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'warranties' ? 'bg-amber-500 text-black shadow-glow-gold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>شهادات الضمان المعتمدة</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'settings' ? 'bg-amber-500 text-black shadow-glow-gold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <User className="w-4 h-4" />
          <span>تعديل الملف الشخصي</span>
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
            <h3 className="font-bold text-sm text-white">عناويني المسجلة للشحن السريع</h3>
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
              <div key={addr.id} className="p-5 rounded-2xl bg-[#0F1626] border border-white/10 space-y-2 relative">
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
                    onClick={() => deleteAddress(addr.id)}
                    className="text-slate-500 hover:text-rose-400 p-1"
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
          <div className="p-6 rounded-3xl bg-[#0F1626] border border-emerald-500/30 space-y-4">
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
                <p className="text-[10px] text-emerald-400 font-bold">✓ يشمل الشاشة واللوحة الأم والكاميرات Face ID</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EDIT PROFILE */}
      {activeTab === 'settings' && (
        <div className="max-w-md p-6 rounded-3xl bg-[#0F1626] border border-white/10 space-y-4 text-xs">
          <h3 className="font-bold text-white text-sm">تعديل بيانات الحساب</h3>
          <div>
            <label className="block text-slate-400 mb-1">الاسم الكامل:</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">رقم الهاتف الأساسي:</label>
            <input
              type="tel"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white font-outfit"
            />
          </div>

          <button
            onClick={handleSaveProfile}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs"
          >
            حفظ التغييرات
          </button>
        </div>
      )}
    </div>
  );
};
