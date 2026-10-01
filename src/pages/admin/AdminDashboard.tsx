import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  MessageCircle, 
  Settings, 
  Plus, 
  FileSpreadsheet, 
  Download, 
  Upload, 
  Trash2, 
  Copy, 
  Edit, 
  CheckCircle, 
  Clock, 
  Truck, 
  DollarSign, 
  AlertCircle, 
  Search, 
  Check, 
  ExternalLink, 
  Send, 
  BatteryMedium,
  ShieldCheck,
  RefreshCw,
  X,
  FileCheck,
  Star,
  Palette,
  Image as ImageIcon,
  MapPin,
  CreditCard,
  PhoneCall
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { Product, Order, OrderStatus, CategoryKey, ProductCondition, HeroSlide } from '../../types';
import { ExcelImportModal } from '../../components/ExcelImportModal';
import { downloadSampleExcelTemplate, exportCatalogToExcel } from '../../utils/excelParser';
import { generateWhatsAppWebLink, sendWhatsAppMessage } from '../../utils/whatsappService';

export const AdminDashboard: React.FC = () => {
  const { 
    products, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    duplicateProduct,
    orders, 
    updateOrderStatus, 
    updatePaymentStatus,
    manualSendWhatsAppNotification,
    whatsappLogs, 
    refreshWhatsAppLogs,
    settings, 
    updateSettings,
    navigate 
  } = useStore();

  const { t, language, formatPrice } = useLanguage();

  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'whatsapp' | 'settings'>('overview');
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Filter states for orders & products
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [productSearch, setProductSearch] = useState('');
  const [productCatFilter, setProductCatFilter] = useState<string>('all');

  // Manual WhatsApp Send Modal
  const [whatsappModalOrder, setWhatsappModalOrder] = useState<Order | null>(null);
  const [customMsgType, setCustomMsgType] = useState<'order_confirmed' | 'payment_verified' | 'shipped' | 'out_for_delivery' | 'delivered' | 'review_request'>('shipped');
  const [courierInput, setCourierInput] = useState('مندوب جو ستور');
  const [trackingInput, setTrackingInput] = useState('');
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [sendWhatsAppAlert, setSendWhatsAppAlert] = useState<{ success: boolean; msg: string } | null>(null);

  // Hero Slide Customization State
  const [showSlideForm, setShowSlideForm] = useState(false);
  const [newSlide, setNewSlide] = useState<Partial<HeroSlide>>({
    badge: 'عرض حصري جديد ⚡',
    title_ar: '',
    title_en: '',
    subtitle_ar: '',
    subtitle_en: '',
    price: '',
    oldPrice: '',
    tag: 'متوفر بالمحل',
    image: '',
    cat: 'smartphones'
  });

  const handleAddSlide = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlide.title_ar || !newSlide.image) return;
    const slideItem: HeroSlide = {
      id: `slide-${Date.now()}`,
      badge: newSlide.badge || 'عرض خاص ⚡',
      title_ar: newSlide.title_ar,
      title_en: newSlide.title_en || newSlide.title_ar,
      subtitle_ar: newSlide.subtitle_ar || '',
      subtitle_en: newSlide.subtitle_en || '',
      price: newSlide.price || '0',
      oldPrice: newSlide.oldPrice || '',
      tag: newSlide.tag || '',
      image: newSlide.image,
      cat: (newSlide.cat as CategoryKey) || 'smartphones'
    };
    const currentSlides = settings.hero_slides || [];
    updateSettings({ hero_slides: [...currentSlides, slideItem] });
    setShowSlideForm(false);
    setNewSlide({
      badge: 'عرض حصري جديد ⚡',
      title_ar: '',
      title_en: '',
      subtitle_ar: '',
      subtitle_en: '',
      price: '',
      oldPrice: '',
      tag: 'متوفر بالمحل',
      image: '',
      cat: 'smartphones'
    });
  };

  const handleDeleteSlide = (id: string) => {
    const currentSlides = settings.hero_slides || [];
    updateSettings({ hero_slides: currentSlides.filter(s => s.id !== id) });
  };

  // New/Edit Product Form State
  const [prodForm, setProdForm] = useState<Partial<Product>>({
    name_ar: '',
    name_en: '',
    brand: 'Apple',
    category: 'smartphones',
    condition: 'mint',
    battery_health: 94,
    storage: '128GB',
    color_ar: 'أبيض',
    price: 19500,
    original_price: 22000,
    stock: 5,
    warranty_months: 6,
    images: ['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80'],
    description_ar: '',
  });

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProdForm({
      name_ar: '',
      name_en: '',
      brand: 'Apple',
      category: 'smartphones',
      condition: 'mint',
      battery_health: 94,
      storage: '128GB',
      color_ar: 'أزرق',
      price: 19500,
      original_price: 22000,
      stock: 5,
      warranty_months: 6,
      images: ['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80'],
      description_ar: 'جهاز كسر زيرو خالي من الخدوش مع ضمان معتمد من متجر جو ستور.',
    });
    setIsAddProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProdForm(prod);
    setIsAddProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodForm.name_ar || !prodForm.price) return;

    if (editingProduct) {
      updateProduct(editingProduct.id, prodForm);
    } else {
      addProduct(prodForm);
    }
    setIsAddProductModalOpen(false);
  };

  // WhatsApp Trigger Handling
  const handleTriggerWhatsApp = async () => {
    if (!whatsappModalOrder) return;
    setIsSendingWhatsApp(true);
    setSendWhatsAppAlert(null);

    try {
      const res = await manualSendWhatsAppNotification(whatsappModalOrder, customMsgType);
      if (res.success) {
        setSendWhatsAppAlert({ success: true, msg: 'تم إرسال إشعار الواتساب للعميل بنجاح!' });
      } else {
        setSendWhatsAppAlert({ 
          success: false, 
          msg: res.error || 'تم تجهيز رابط الإرسال المباشر للواتساب.' 
        });
      }
    } catch (err: any) {
      setSendWhatsAppAlert({ success: false, msg: `فشل الإرسال: ${err.message}` });
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  // Quick stats
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const pendingOrders = orders.filter(o => o.order_status === 'pending');
  const deliveredOrders = orders.filter(o => o.order_status === 'delivered');

  // Filtered orders list
  const filteredOrders = orders.filter(o => {
    if (orderStatusFilter !== 'all' && o.order_status !== orderStatusFilter) return false;
    return true;
  });

  // Filtered products list
  const filteredProducts = products.filter(p => {
    if (productCatFilter !== 'all' && p.category !== productCatFilter) return false;
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase();
      return (p.name_ar + ' ' + p.name_en + ' ' + p.brand).toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 font-cairo">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30">
              Enterprise Admin Hub
            </span>
            <span className="text-xs text-slate-400">نظام إدارة متجر جو ستور المتقدم</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
            {t('adminTitle')}
          </h1>
        </div>

        {/* Quick Nav Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#0F1626] border border-white/10 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'overview' ? 'bg-amber-500 text-black shadow-glow-gold' : 'text-slate-300 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>{t('overviewTab')}</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'products' ? 'bg-amber-500 text-black shadow-glow-gold' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>{t('productsTab')}</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'orders' ? 'bg-amber-500 text-black shadow-glow-gold' : 'text-slate-300 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{t('ordersTab')}</span>
            {pendingOrders.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-outfit">
                {pendingOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'whatsapp' ? 'bg-amber-500 text-black shadow-glow-gold' : 'text-slate-300 hover:text-white'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('whatsappTab')}</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'settings' ? 'bg-amber-500 text-black shadow-glow-gold' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{t('settingsTab')}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-[#0F1626] border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>إجمالي الإيرادات</span>
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <strong className="text-2xl font-black text-amber-400 font-outfit block">
                {formatPrice(totalRevenue)}
              </strong>
              <p className="text-[10px] text-emerald-400">مبيعات متجر جو ستور</p>
            </div>

            <div className="p-5 rounded-3xl bg-[#0F1626] border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>إجمالي الطلبات</span>
                <ShoppingBag className="w-4 h-4 text-blue-400" />
              </div>
              <strong className="text-2xl font-black text-white font-outfit block">
                {orders.length}
              </strong>
              <p className="text-[10px] text-amber-400 font-bold">{pendingOrders.length} طلبات قيد المراجعة</p>
            </div>

            <div className="p-5 rounded-3xl bg-[#0F1626] border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>المنتجات بالمخزن</span>
                <Package className="w-4 h-4 text-emerald-400" />
              </div>
              <strong className="text-2xl font-black text-white font-outfit block">
                {products.length}
              </strong>
              <p className="text-[10px] text-slate-400">هواتف وإكسسوارات معروضة</p>
            </div>

            <div className="p-5 rounded-3xl bg-[#0F1626] border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>ربط واتساب برو</span>
                <MessageCircle className="w-4 h-4 text-emerald-400" />
              </div>
              <strong className="text-sm font-bold text-emerald-400 block flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>جاهز للإرسال الآلي</span>
              </strong>
              <p className="text-[10px] text-slate-400">{whatsappLogs.length} إشعار تم إرساله</p>
            </div>
          </div>

          {/* Recent Orders Overview */}
          <div className="p-6 rounded-3xl bg-[#0F1626] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">أحدث طلبات الشراء المسجلة</h3>
              <button
                onClick={() => setActiveTab('orders')}
                className="text-xs text-amber-400 hover:underline"
              >
                عرض كل الطلبات ({orders.length}) ←
              </button>
            </div>

            {orders.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">لا توجد طلبات مسجلة بعد.</p>
            ) : (
              <div className="divide-y divide-white/5 text-xs">
                {orders.slice(0, 5).map((o) => (
                  <div key={o.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <strong className="text-white font-outfit">#{o.order_number}</strong>
                      <span className="text-slate-400 mx-2">•</span>
                      <span className="text-slate-200">{o.customer_name}</span>
                      <span className="text-slate-400 mx-2">•</span>
                      <span className="text-slate-400">{o.governorate}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-outfit font-bold text-amber-400">{formatPrice(o.total)}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                        {o.order_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCTS MANAGER (Manual + Excel Bulk Import + Export) */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          {/* Action Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#0F1626] border border-white/10">
            {/* Search and Category Filter */}
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="ابحث باسم المنتج أو الماركة..."
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <select
                value={productCatFilter}
                onChange={(e) => setProductCatFilter(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
              >
                <option value="all">كل الأقسام</option>
                <option value="smartphones">هواتف ذكية</option>
                <option value="smartwatches">ساعات ذكية</option>
                <option value="audio">سماعات</option>
                <option value="chargers_cables">شواحن وكابلات</option>
                <option value="powerbanks">باوربانك</option>
                <option value="cases_protection">جرابات وحمايات</option>
              </select>
            </div>

            {/* Action Buttons: Add Manual, Excel Bulk Upload, Download Template, Export */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Add Product Manual */}
              <button
                onClick={handleOpenAddProduct}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-glow-gold transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>{t('addProduct')}</span>
              </button>

              {/* Excel Bulk Upload */}
              <button
                onClick={() => setIsExcelModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{t('bulkExcelImport')}</span>
              </button>

              {/* Download Template */}
              <button
                onClick={downloadSampleExcelTemplate}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors"
                title={t('downloadTemplate')}
              >
                <Download className="w-4 h-4" />
              </button>

              {/* Export Catalog to Excel */}
              <button
                onClick={() => exportCatalogToExcel(products)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors"
                title={t('exportProducts')}
              >
                <FileCheck className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Products Table */}
          <div className="rounded-3xl bg-[#0F1626] border border-white/10 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#0A0E1A] text-slate-400 text-[11px] font-bold border-b border-white/10">
                  <tr>
                    <th className="p-3.5">المنتج</th>
                    <th className="p-3.5">القسم</th>
                    <th className="p-3.5">الحالة</th>
                    <th className="p-3.5">البطارية</th>
                    <th className="p-3.5">السعر</th>
                    <th className="p-3.5">المخزون</th>
                    <th className="p-3.5 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3.5 flex items-center gap-3">
                        <img
                          src={p.images[0]}
                          alt=""
                          className="w-10 h-10 rounded-xl object-cover bg-slate-800 border border-white/10 flex-shrink-0"
                        />
                        <div>
                          <strong className="text-white block line-clamp-1">{p.name_ar}</strong>
                          <span className="text-[10px] text-slate-400 font-outfit">{p.brand} {p.storage && `• ${p.storage}`}</span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-white/5 text-[10px]">
                          {p.category}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.condition === 'mint' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {p.condition === 'mint' ? 'كسر زيرو' : 'جديد'}
                        </span>
                      </td>

                      <td className="p-3.5">
                        {p.battery_health ? (
                          <span className="text-emerald-400 font-bold font-outfit">
                            🔋 {p.battery_health}%
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>

                      <td className="p-3.5 font-bold font-outfit text-amber-400">
                        {formatPrice(p.price)}
                      </td>

                      <td className="p-3.5 font-outfit">
                        <span className={`px-2 py-0.5 rounded font-bold ${p.stock > 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                          {p.stock} قطعة
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Duplicate */}
                          <button
                            onClick={() => duplicateProduct(p.id)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-amber-400"
                            title="تكرار ونسخ المنتج"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEditProduct(p)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-blue-400"
                            title="تعديل"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف المنتج: ${p.name_ar}؟`)) {
                                deleteProduct(p.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ORDERS & SALES MANAGER (WhatsApp Automated Status Triggers) */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Order Status Filter */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#0F1626] border border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold">تصفية حسب الحالة:</span>
              <div className="flex gap-1 overflow-x-auto text-xs">
                {['all', 'pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setOrderStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                      orderStatusFilter === st 
                        ? 'bg-amber-500 text-black' 
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {st === 'all' && 'الكل'}
                    {st === 'pending' && 'قيد المراجعة'}
                    {st === 'confirmed' && 'تم التأكيد'}
                    {st === 'processing' && 'جاري التجهيز'}
                    {st === 'shipped' && 'تم الشحن'}
                    {st === 'out_for_delivery' && 'مع المندوب'}
                    {st === 'delivered' && 'تم التوصيل'}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-xs text-slate-400 font-outfit">
              {filteredOrders.length} طلبات
            </span>
          </div>

          {/* Orders Cards List */}
          <div className="space-y-4">
            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-[#0F1626] border border-white/10 text-slate-400 text-xs">
                لا توجد طلبات مسجلة بهذه الحالة.
              </div>
            ) : (
              filteredOrders.map((ord) => (
                <div key={ord.id} className="p-6 rounded-3xl bg-[#0F1626] border border-white/10 shadow-xl space-y-4">
                  {/* Order Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <strong className="text-base font-black text-white font-outfit">
                        #{ord.order_number}
                      </strong>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {ord.order_status}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(ord.created_at).toLocaleString('ar-EG')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">المطلوب:</span>
                      <strong className="text-lg font-black text-amber-400 font-outfit">
                        {formatPrice(ord.total)}
                      </strong>
                    </div>
                  </div>

                  {/* Customer Info & Items */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    {/* Customer & Delivery */}
                    <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-2xl border border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 block text-[11px] font-bold">العميل والتوصيل:</span>
                        {ord.google_maps_url && (
                          <a
                            href={ord.google_maps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 font-bold bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 transition-colors"
                            title="فتح موقع العميل على خرائط جوجل"
                          >
                            <MapPin className="w-3 h-3 text-amber-400" />
                            <span>موقع GPS 📍</span>
                          </a>
                        )}
                      </div>
                      <strong className="text-white block font-bold text-sm">{ord.customer_name}</strong>
                      <div className="flex flex-wrap items-center gap-2 text-slate-300 font-outfit text-xs">
                        <a href={`tel:${ord.customer_phone}`} className="hover:text-amber-400 flex items-center gap-1">
                          <PhoneCall className="w-3 h-3 text-emerald-400" />
                          <span>{ord.customer_phone}</span>
                        </a>
                        {ord.customer_secondary_phone && (
                          <span className="text-[11px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
                            بديل: {ord.customer_secondary_phone}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-300 text-xs">
                        <span className="text-amber-300/80 font-bold">{ord.governorate}</span> - {ord.city}
                      </p>
                      <p className="text-slate-400 text-[11px]">
                        {ord.address_details}
                      </p>
                      {(ord.building_no || ord.floor_no || ord.apartment_no || ord.landmark) && (
                        <div className="text-[10px] text-slate-400 bg-slate-950/60 p-1.5 rounded-lg border border-white/5 space-y-0.5">
                          {(ord.building_no || ord.floor_no || ord.apartment_no) && (
                            <p>
                              {ord.building_no && `مبنى/عمارة: ${ord.building_no} `}
                              {ord.floor_no && `• طابق: ${ord.floor_no} `}
                              {ord.apartment_no && `• شقة: ${ord.apartment_no}`}
                            </p>
                          )}
                          {ord.landmark && (
                            <p className="text-amber-300/80">علامة مميزة: {ord.landmark}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Payment details */}
                    <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-2xl border border-white/5">
                      <span className="text-slate-400 block text-[11px] font-bold">طريقة الدفع:</span>
                      <div className="flex items-center gap-2">
                        {ord.payment_method === 'credit_card' ? (
                          <CreditCard className="w-4 h-4 text-blue-400" />
                        ) : ord.payment_method === 'instapay' ? (
                          <span className="text-[11px] font-black text-purple-400 font-outfit">INSTAPAY</span>
                        ) : (
                          <Truck className="w-4 h-4 text-amber-400" />
                        )}
                        <strong className="text-white block font-bold text-xs">
                          {ord.payment_method === 'credit_card' ? 'بطاقة بنكية (فيزا/ماستركارد)' :
                           ord.payment_method === 'instapay' ? 'انستاباي / فودافون كاش' :
                           'الدفع عند الاستلام'}
                        </strong>
                      </div>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        ord.payment_status === 'verified' || ord.payment_status === 'paid' 
                          ? 'bg-emerald-500/20 text-emerald-300' 
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {ord.payment_status === 'verified' ? 'تم التحقق من الدفع' : ord.payment_status === 'paid' ? 'مدفوع' : 'غير مدفوع (عند الاستلام)'}
                      </span>
                      {ord.card_last4 && (
                        <p className="text-[11px] text-blue-300 font-outfit bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 inline-block">
                          بطاقة: **** {ord.card_last4} {ord.card_holder ? `(${ord.card_holder})` : ''}
                        </p>
                      )}
                      {ord.payment_reference && (
                        <p className="text-[10px] text-slate-400">مرجع: {ord.payment_reference}</p>
                      )}
                    </div>

                    {/* Products */}
                    <div className="space-y-1 bg-slate-900/60 p-3 rounded-2xl border border-white/5">
                      <span className="text-slate-400 block text-[11px]">المنتجات المطلوبة:</span>
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                        {ord.items.map((it, i) => (
                          <div key={i} className="flex justify-between text-slate-300">
                            <span className="truncate max-w-[140px]">{it.product.name_ar}</span>
                            <span className="font-outfit text-amber-400">×{it.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions & WhatsApp automated dispatch triggers */}
                  <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-slate-400 font-semibold">تغيير الحالة مع إشعار واتساب فوري:</span>

                      {/* Payment Verified */}
                      {ord.payment_status !== 'verified' && (
                        <button
                          onClick={() => updatePaymentStatus(ord.id, 'verified')}
                          className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all"
                        >
                          تأكيد الدفع ⚡
                        </button>
                      )}

                      {/* Ship order */}
                      {ord.order_status !== 'shipped' && ord.order_status !== 'delivered' && (
                        <button
                          onClick={() => {
                            const courier = prompt('اسم شركة الشحن أو المندوب:', 'مندوب جو ستور السريع');
                            const tracking = prompt('رقم بوليصة الشحن (اختياري):', '');
                            if (courier !== null) {
                              updateOrderStatus(ord.id, 'shipped', courier, tracking || undefined);
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all"
                        >
                          تسليم للشحن 🚚
                        </button>
                      )}

                      {/* Out for delivery */}
                      {ord.order_status === 'shipped' && (
                        <button
                          onClick={() => updateOrderStatus(ord.id, 'out_for_delivery')}
                          className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all"
                        >
                          خروج للتسليم 🛵
                        </button>
                      )}

                      {/* Delivered */}
                      {ord.order_status !== 'delivered' && (
                        <button
                          onClick={() => updateOrderStatus(ord.id, 'delivered')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all"
                        >
                          تم التسليم بنجاح 🎉
                        </button>
                      )}

                      {/* Review Request */}
                      {ord.order_status === 'delivered' && (
                        <button
                          onClick={() => manualSendWhatsAppNotification(ord, 'review_request')}
                          className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span>إرسال طلب تقييم واتساب ⭐</span>
                        </button>
                      )}
                    </div>

                    {/* Direct WhatsApp Message Modal Trigger */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setWhatsappModalOrder(ord);
                          setSendWhatsAppAlert(null);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center gap-1.5 transition-all"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>إرسال رسالة واتساب مخصصة</span>
                      </button>

                      <a
                        href={generateWhatsAppWebLink(ord.customer_whatsapp || ord.customer_phone, `مرحباً ${ord.customer_name}، نتواصل معك بخصوص طلبك رقم #${ord.order_number} من متجر جو ستور.`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-emerald-400"
                        title="فتح المحادثة المباشرة"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: WHATSAPP AUTOMATION HUB */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-[#0F1626] border border-emerald-500/30 shadow-2xl space-y-4">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <MessageCircle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    ربط نظام واتساب برو الآلي (WhatsApp Pro Automation)
                  </h3>
                  <p className="text-xs text-slate-400">
                    مرتبط بخادم مشروع <code className="text-emerald-300 font-mono">whatsapp-pro-automation</code> لإرسال الرسائل عبر رقم واتساب المحل الرسمي.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-bold text-emerald-400">النظام نشط وجاهز</span>
              </div>
            </div>

            {/* Connection Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-white/10 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">رابط خادم واتساب برو:</label>
                <input
                  type="text"
                  value={settings.whatsapp_automation_url}
                  onChange={(e) => updateSettings({ whatsapp_automation_url: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">البريد الإلكتروني / الحساب:</label>
                <input
                  type="text"
                  value={settings.whatsapp_automation_email}
                  onChange={(e) => updateSettings({ whatsapp_automation_email: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">كلمة المرور:</label>
                <input
                  type="password"
                  value={settings.whatsapp_automation_pass}
                  onChange={(e) => updateSettings({ whatsapp_automation_pass: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            {/* Automation Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-white/10 text-xs">
              <label className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900 border border-white/5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.auto_send_on_order}
                  onChange={(e) => updateSettings({ auto_send_on_order: e.target.checked })}
                  className="accent-amber-500 rounded"
                />
                <div>
                  <strong className="text-white block font-bold">إرسال إشعار فوري عند تسجيل طلب جديد</strong>
                  <span className="text-[11px] text-slate-400">يتلقى العميل فاتورة الطلب كاملة فور الضغط على تأكيد الطلب.</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900 border border-white/5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.auto_send_on_status_change}
                  onChange={(e) => updateSettings({ auto_send_on_status_change: e.target.checked })}
                  className="accent-amber-500 rounded"
                />
                <div>
                  <strong className="text-white block font-bold">إرسال تحديثات عند تغيير حالة الطلب</strong>
                  <span className="text-[11px] text-slate-400">إشعار العميل عند تأكيد الدفع، التسليم للشحن، أو التوصيل.</span>
                </div>
              </label>
            </div>
          </div>

          {/* WhatsApp Sent Logs */}
          <div className="p-6 rounded-3xl bg-[#0F1626] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">سجل الرسائل والإشعارات المرسلة ({whatsappLogs.length})</h3>
              <button
                onClick={refreshWhatsAppLogs}
                className="text-xs text-amber-400 flex items-center gap-1 hover:underline"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>تحديث السجل</span>
              </button>
            </div>

            {whatsappLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">لا توجد رسائل مسجلة بعد.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {whatsappLogs.map((log) => (
                  <div key={log.id} className="p-4 rounded-2xl bg-slate-900 border border-white/5 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <strong className="text-emerald-400 font-outfit">{log.phone}</strong>
                        <span className="px-2 py-0.2 rounded bg-white/5 text-[10px] text-slate-300">
                          {log.type}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-outfit">
                        {new Date(log.sent_at).toLocaleTimeString('ar-EG')}
                      </span>
                    </div>

                    <pre className="text-[11px] text-slate-300 font-cairo whitespace-pre-wrap bg-slate-950/80 p-3 rounded-xl border border-white/5">
                      {log.text}
                    </pre>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>الحالة: <strong className="text-emerald-400">{log.status}</strong></span>
                      <a
                        href={generateWhatsAppWebLink(log.phone, log.text)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-400 hover:underline flex items-center gap-1"
                      >
                        <span>فتح الرابط في واتساب</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: STORE SETTINGS */}
      {activeTab === 'settings' && (
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Section 1: Store Info & Socials */}
          <div className="p-6 rounded-3xl bg-[#0F1626] border border-white/10 space-y-6">
            <h3 className="font-bold text-base text-white border-b border-white/10 pb-3 flex items-center gap-2">
              <Settings className="w-5 h-5 text-amber-400" />
              <span>{language === 'ar' ? 'بيانات المتجر وحسابات التواصل' : 'Store Info & Social Profiles'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-cairo">
              <div>
                <label className="block text-slate-300 mb-1">{language === 'ar' ? 'اسم المتجر بالعربي:' : 'Store Name (AR):'}</label>
                <input
                  type="text"
                  value={settings.store_name_ar}
                  onChange={(e) => updateSettings({ store_name_ar: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">{language === 'ar' ? 'اسم المتجر بالإنجليزي:' : 'Store Name (EN):'}</label>
                <input
                  type="text"
                  value={settings.store_name_en}
                  onChange={(e) => updateSettings({ store_name_en: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white font-outfit"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">{language === 'ar' ? 'رقم الهاتف الأساسي:' : 'Primary Phone:'}</label>
                <input
                  type="text"
                  value={settings.store_phone}
                  onChange={(e) => updateSettings({ store_phone: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white font-outfit"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">{language === 'ar' ? 'رقم الواتساب الرسمي (بدون +):' : 'Official WhatsApp:'}</label>
                <input
                  type="text"
                  value={settings.store_whatsapp}
                  onChange={(e) => updateSettings({ store_whatsapp: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white font-outfit"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-300 mb-1">{language === 'ar' ? 'عنوان الفرع بالمنصورة:' : 'Mansoura Branch Address:'}</label>
                <input
                  type="text"
                  value={settings.store_address_ar}
                  onChange={(e) => updateSettings({ store_address_ar: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white"
                />
              </div>

              {/* TikTok Link (Dedicated User Audio Request) */}
              <div className="sm:col-span-2 p-4 rounded-2xl bg-slate-900/80 border border-amber-500/30 space-y-2">
                <label className="block text-amber-300 font-bold">
                  {language === 'ar' ? 'رابط حساب تيك توك الرسمي (TikTok Profile URL) *' : 'Official TikTok Profile URL *'}
                </label>
                <input
                  type="text"
                  value={settings.tiktok_url || ''}
                  onChange={(e) => updateSettings({ tiktok_url: e.target.value })}
                  placeholder="https://www.tiktok.com/@joestore2026"
                  className="w-full bg-slate-950 border border-white/15 rounded-xl px-4 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-400">
                  {language === 'ar'
                    ? '💡 يمكنك تعديل رابط التيك توك هنا في أي وقت وسيتم تحديثه تلقائياً في الفوتر وكافة أزرار التواصل بالموقع.'
                    : '💡 Modify your TikTok link here anytime; it updates automatically across all footer links.'}
                </p>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">{language === 'ar' ? 'رابط حساب فيسبوك:' : 'Facebook Page URL:'}</label>
                <input
                  type="text"
                  value={settings.facebook_url || ''}
                  onChange={(e) => updateSettings({ facebook_url: e.target.value })}
                  placeholder="https://facebook.com/joestore"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">{language === 'ar' ? 'رابط حساب إنستجرام:' : 'Instagram URL:'}</label>
                <input
                  type="text"
                  value={settings.instagram_url || ''}
                  onChange={(e) => updateSettings({ instagram_url: e.target.value })}
                  placeholder="https://instagram.com/joestore"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Payments & Wallets */}
          <div className="p-6 rounded-3xl bg-[#0F1626] border border-white/10 space-y-6">
            <h3 className="font-bold text-base text-white border-b border-white/10 pb-3 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span>{language === 'ar' ? 'بيانات الدفع والمحافظ الإلكترونية' : 'Payment Wallets & Invoicing'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-cairo">
              <div>
                <label className="block text-slate-300 mb-1">{language === 'ar' ? 'معرف إنستاباي (InstaPay ID):' : 'InstaPay ID:'}</label>
                <input
                  type="text"
                  value={settings.instapay_address}
                  onChange={(e) => updateSettings({ instapay_address: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white font-outfit"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">{language === 'ar' ? 'رقم محفظة فودافون كاش:' : 'Vodafone Cash Number:'}</label>
                <input
                  type="text"
                  value={settings.vodafone_cash_number}
                  onChange={(e) => updateSettings({ vodafone_cash_number: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white font-outfit"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">{language === 'ar' ? 'حد الشحن المجاني (ج.م):' : 'Free Shipping Threshold (EGP):'}</label>
                <input
                  type="number"
                  value={settings.free_shipping_threshold || 2500}
                  onChange={(e) => updateSettings({ free_shipping_threshold: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white font-outfit"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">{language === 'ar' ? 'مصاريف الشحن الافتراضية:' : 'Default Shipping Fee:'}</label>
                <input
                  type="number"
                  value={settings.shipping_fee_default || 35}
                  onChange={(e) => updateSettings({ shipping_fee_default: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white font-outfit"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Theme Customizer (Templates) */}
          <div className="p-6 rounded-3xl bg-[#0F1626] border border-white/10 space-y-4">
            <h3 className="font-bold text-base text-white border-b border-white/10 pb-3 flex items-center gap-2">
              <Palette className="w-5 h-5 text-amber-400" />
              <span>{language === 'ar' ? 'مظهر وقالب المتجر (Theme Presets)' : 'Store Theme Presets'}</span>
            </h3>
            <p className="text-xs text-slate-400">
              {language === 'ar'
                ? 'اختر القالب اللوني الذي تريده لواجهة المتجر، وسيقوم النظام بتطبيقه فوراً على كافة الصفحات:'
                : 'Select the color palette for your store; changes apply instantly across the whole app:'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {/* Royal Gold */}
              <div 
                onClick={() => updateSettings({ active_theme: 'royal_gold' })}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  settings.active_theme === 'royal_gold' || !settings.active_theme
                    ? 'border-amber-400 bg-amber-500/10 shadow-glow-gold'
                    : 'border-white/10 bg-slate-900 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 shadow-sm" />
                  <strong className="text-white text-xs font-bold">{language === 'ar' ? 'الذهبي الملكي (الافتراضي)' : 'Royal Gold (Default)'}</strong>
                </div>
                <p className="text-[11px] text-slate-400">
                  {language === 'ar' ? 'طابع الفخامة لمتجر جو ستور الرسمي مع تدرجات الذهب.' : 'Luxury obsidian & gold signature styling.'}
                </p>
              </div>

              {/* Titanium Blue */}
              <div 
                onClick={() => updateSettings({ active_theme: 'titanium_blue' })}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  settings.active_theme === 'titanium_blue'
                    ? 'border-sky-400 bg-sky-500/10 shadow-lg'
                    : 'border-white/10 bg-slate-900 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-sky-400 to-blue-600 shadow-sm" />
                  <strong className="text-white text-xs font-bold">{language === 'ar' ? 'التيتانيوم الفضائي' : 'Titanium Blue'}</strong>
                </div>
                <p className="text-[11px] text-slate-400">
                  {language === 'ar' ? 'مظهر تيتانيوم أزرق عصري مستوحى من أحدث أجهزة أبل.' : 'Aerospace titanium blue aesthetic.'}
                </p>
              </div>

              {/* Emerald Tech */}
              <div 
                onClick={() => updateSettings({ active_theme: 'emerald_tech' })}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  settings.active_theme === 'emerald_tech'
                    ? 'border-emerald-400 bg-emerald-500/10 shadow-lg'
                    : 'border-white/10 bg-slate-900 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-emerald-400 to-teal-600 shadow-sm" />
                  <strong className="text-white text-xs font-bold">{language === 'ar' ? 'الزمرد السيبراني' : 'Emerald Tech'}</strong>
                </div>
                <p className="text-[11px] text-slate-400">
                  {language === 'ar' ? 'لمسة تكنولوجية متقدمة بتدرجات الزمرد والأخضر المتألق.' : 'Cyber emerald high-tech matrix styling.'}
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Hero Banners & Slider Manager */}
          <div className="p-6 rounded-3xl bg-[#0F1626] border border-white/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-amber-400" />
                  <span>{language === 'ar' ? 'إدارة بانرات السلايدر الترويجي بالرئيسية' : 'Homepage Hero Slider & Banners'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {language === 'ar' ? 'أضف صورك وعروضك الترويجية الخاصة أو احذف الشرائح الحالية' : 'Add custom images and promos or delete existing slides'}
                </p>
              </div>

              <button
                onClick={() => setShowSlideForm(!showSlideForm)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-glow-gold transition-all self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'ar' ? 'إضافة بانر / شريحة جديدة' : 'Add New Slide'}</span>
              </button>
            </div>

            {/* Slide Creation Form */}
            {showSlideForm && (
              <form onSubmit={handleAddSlide} className="p-5 rounded-2xl bg-slate-900 border border-amber-500/40 space-y-4 text-xs font-cairo">
                <h4 className="font-bold text-amber-400 text-sm">{language === 'ar' ? 'بيانات الشريحة / البانر الجديد' : 'New Banner Slide Details'}</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">{language === 'ar' ? 'عنوان العرض (عربي) *:' : 'Title (AR) *:'}</label>
                    <input
                      type="text"
                      required
                      value={newSlide.title_ar}
                      onChange={(e) => setNewSlide({ ...newSlide, title_ar: e.target.value })}
                      placeholder="مثال: خصومات حصرية على الآيفون 14 برو"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">{language === 'ar' ? 'عنوان العرض (إنجليزي):' : 'Title (EN):'}</label>
                    <input
                      type="text"
                      value={newSlide.title_en}
                      onChange={(e) => setNewSlide({ ...newSlide, title_en: e.target.value })}
                      placeholder="e.g. Exclusive Deals on iPhone 14 Pro"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white font-outfit"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">{language === 'ar' ? 'نص الشارة العلوية (Badge):' : 'Badge Tag:'}</label>
                    <input
                      type="text"
                      value={newSlide.badge}
                      onChange={(e) => setNewSlide({ ...newSlide, badge: e.target.value })}
                      placeholder="عرض المنصورة الأقوى ⚡"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">{language === 'ar' ? 'القسم المرتبط:' : 'Linked Category:'}</label>
                    <select
                      value={newSlide.cat}
                      onChange={(e) => setNewSlide({ ...newSlide, cat: e.target.value as CategoryKey })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white"
                    >
                      <option value="smartphones">هواتف ذكية</option>
                      <option value="smartwatches">ساعات ذكية</option>
                      <option value="audio">سماعات</option>
                      <option value="chargers_cables">شواحن وكابلات</option>
                      <option value="powerbanks">باوربانك</option>
                      <option value="cases_protection">جرابات وحمايات</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">{language === 'ar' ? 'السعر المعروض:' : 'Displayed Price:'}</label>
                    <input
                      type="text"
                      value={newSlide.price}
                      onChange={(e) => setNewSlide({ ...newSlide, price: e.target.value })}
                      placeholder="24,500"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white font-outfit"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">{language === 'ar' ? 'السعر قبل الخصم:' : 'Old Price:'}</label>
                    <input
                      type="text"
                      value={newSlide.oldPrice}
                      onChange={(e) => setNewSlide({ ...newSlide, oldPrice: e.target.value })}
                      placeholder="27,000"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white font-outfit"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 mb-1">{language === 'ar' ? 'رابط صورة البانر (Image URL) *:' : 'Banner Image URL *:'}</label>
                    <input
                      type="text"
                      required
                      value={newSlide.image}
                      onChange={(e) => setNewSlide({ ...newSlide, image: e.target.value })}
                      placeholder="https://images.unsplash.com/... أو رابط الصورة المباشر"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 mb-1">{language === 'ar' ? 'الوصف الفرعي (عربي):' : 'Subtitle (AR):'}</label>
                    <textarea
                      rows={2}
                      value={newSlide.subtitle_ar}
                      onChange={(e) => setNewSlide({ ...newSlide, subtitle_ar: e.target.value })}
                      placeholder="أجهزة كسر زيرو ببطارية 90%+ مع شاحن أصلي وضمان استبدال"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSlideForm(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 text-slate-300"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 text-black font-extrabold shadow-glow-gold"
                  >
                    {language === 'ar' ? 'حفظ الشريحة للرئيسية' : 'Save Slide to Homepage'}
                  </button>
                </div>
              </form>
            )}

            {/* Existing Slides List */}
            <div className="space-y-3">
              {(settings.hero_slides || []).map((slide, index) => (
                <div key={slide.id} className="p-4 rounded-2xl bg-slate-900 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-cairo">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <img
                      src={slide.image}
                      alt=""
                      className="w-16 h-16 rounded-xl object-cover bg-slate-950 border border-white/10 flex-shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                          {slide.badge}
                        </span>
                        <strong className="text-white text-sm">{language === 'ar' ? slide.title_ar : slide.title_en}</strong>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-1 max-w-md line-clamp-1">
                        {language === 'ar' ? slide.subtitle_ar : slide.subtitle_en}
                      </p>
                      <span className="text-amber-400 font-outfit font-bold mt-1 inline-block">
                        {slide.price} EGP
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleDeleteSlide(slide.id)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                      title={language === 'ar' ? 'حذف هذه الشريحة' : 'Delete Slide'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT PRODUCT INTERACTIVE MODAL */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#0F1626] border border-amber-500/40 rounded-3xl p-6 text-slate-100 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-base text-white">
                {editingProduct ? 'تعديل بيانات المنتج' : 'إضافة منتج يدوي جديد'}
              </h3>
              <button
                onClick={() => setIsAddProductModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs font-cairo">
              <div>
                <label className="block text-slate-300 mb-1">اسم المنتج بالعربي *</label>
                <input
                  type="text"
                  required
                  value={prodForm.name_ar}
                  onChange={(e) => setProdForm({ ...prodForm, name_ar: e.target.value })}
                  placeholder="مثال: آيفون 13 مساحة 128 كسر زيرو"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">اسم المنتج بالإنجليزي</label>
                <input
                  type="text"
                  value={prodForm.name_en}
                  onChange={(e) => setProdForm({ ...prodForm, name_en: e.target.value })}
                  placeholder="e.g. Apple iPhone 13 128GB Mint"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white font-outfit"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">القسم</label>
                  <select
                    value={prodForm.category}
                    onChange={(e) => setProdForm({ ...prodForm, category: e.target.value as CategoryKey })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white"
                  >
                    <option value="smartphones">هواتف ذكية</option>
                    <option value="smartwatches">ساعات ذكية</option>
                    <option value="audio">سماعات</option>
                    <option value="chargers_cables">شواحن وكابلات</option>
                    <option value="powerbanks">باوربانك</option>
                    <option value="cases_protection">جرابات وحمايات</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">الماركة</label>
                  <input
                    type="text"
                    value={prodForm.brand}
                    onChange={(e) => setProdForm({ ...prodForm, brand: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">الحالة</label>
                  <select
                    value={prodForm.condition}
                    onChange={(e) => setProdForm({ ...prodForm, condition: e.target.value as ProductCondition })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white"
                  >
                    <option value="mint">كسر زيرو ممتاز</option>
                    <option value="brand_new">جديد متبرشم</option>
                    <option value="used_good">استعمال خفيف</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">نسبة البطارية %</label>
                  <input
                    type="number"
                    value={prodForm.battery_health || ''}
                    onChange={(e) => setProdForm({ ...prodForm, battery_health: Number(e.target.value) || null })}
                    placeholder="94"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white font-outfit"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">السعر (ج.م) *</label>
                  <input
                    type="number"
                    required
                    value={prodForm.price || ''}
                    onChange={(e) => setProdForm({ ...prodForm, price: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white font-outfit font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">السعر قبل الخصم</label>
                  <input
                    type="number"
                    value={prodForm.original_price || ''}
                    onChange={(e) => setProdForm({ ...prodForm, original_price: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white font-outfit"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">المخزون (الكمية)</label>
                  <input
                    type="number"
                    value={prodForm.stock || 1}
                    onChange={(e) => setProdForm({ ...prodForm, stock: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white font-outfit"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">شهور الضمان</label>
                  <input
                    type="number"
                    value={prodForm.warranty_months || 6}
                    onChange={(e) => setProdForm({ ...prodForm, warranty_months: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white font-outfit"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">رابط الصورة (URL)</label>
                <input
                  type="text"
                  value={prodForm.images?.[0] || ''}
                  onChange={(e) => setProdForm({ ...prodForm, images: [e.target.value] })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">الوصف</label>
                <textarea
                  rows={3}
                  value={prodForm.description_ar}
                  onChange={(e) => setProdForm({ ...prodForm, description_ar: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white font-cairo"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-slate-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold shadow-glow-gold"
                >
                  حفظ المنتج
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MANUAL WHATSAPP DISPATCH */}
      {whatsappModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-[#0F1626] border border-emerald-500/40 rounded-3xl p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-400" />
                <span>إرسال إشعار واتساب للطلب #{whatsappModalOrder.order_number}</span>
              </h3>
              <button
                onClick={() => setWhatsappModalOrder(null)}
                className="p-1 rounded-lg bg-white/5 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-cairo">
              <div>
                <label className="block text-slate-400 mb-1">رقم المستلم:</label>
                <strong className="text-white font-outfit text-sm">
                  {whatsappModalOrder.customer_whatsapp || whatsappModalOrder.customer_phone}
                </strong>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">نوع الرسالة / القالب الآلي:</label>
                <select
                  value={customMsgType}
                  onChange={(e) => setCustomMsgType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white"
                >
                  <option value="order_confirmed">تأكيد الطلب والفاتورة (Order Placed)</option>
                  <option value="payment_verified">تأكيد استلام الدفع (Payment Verified)</option>
                  <option value="shipped">تسليم للشحن ورقم البوليصة (Shipped)</option>
                  <option value="out_for_delivery">خروج الشحنة مع المندوب (Out for Delivery)</option>
                  <option value="delivered">تم التوصيل بنجاح (Delivered)</option>
                  <option value="review_request">طلب تقييم الخدمة والجهاز (Review Request)</option>
                </select>
              </div>

              {sendWhatsAppAlert && (
                <div className={`p-3 rounded-xl border text-xs ${
                  sendWhatsAppAlert.success 
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                    : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                }`}>
                  {sendWhatsAppAlert.msg}
                </div>
              )}

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  onClick={() => setWhatsappModalOrder(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-slate-300"
                >
                  إغلاق
                </button>
                <button
                  onClick={handleTriggerWhatsApp}
                  disabled={isSendingWhatsApp}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold flex items-center gap-1.5 shadow-md"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingWhatsApp ? 'جاري الإرسال...' : 'إرسال الإشعار الآن'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EXCEL BULK IMPORT MODAL */}
      <ExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
      />
    </div>
  );
};
