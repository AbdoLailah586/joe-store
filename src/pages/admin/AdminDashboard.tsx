import { formatDeliveryAddress } from '../../utils/deliveryAddress';
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { AdminShell, AdminSection, initialAdminSection } from './AdminShell';
const AdminTools = lazy(() => import('./AdminTools').then(m => ({ default: m.AdminTools })));
const ScreenFinder = lazy(() => import('./ScreenFinder').then(m => ({ default: m.ScreenFinder })));
const CoverFinder = lazy(() => import('./CoverFinder').then(m => ({ default: m.CoverFinder })));
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
  PhoneCall,
  Layers,
  Users,
  Mail,
  ShieldAlert,
  KeyRound,
  Sparkles,
  Tag,
  Gift,
  FolderPlus
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Product, Order, OrderStatus, CategoryKey, ProductCondition, HeroSlide, CustomCategory, DiscountCoupon, CustomShippingRate, CustomCity } from '../../types';
import { egyptianGovernorates } from '../../data/governorates';
import { ExcelImportModal } from '../../components/ExcelImportModal';
import { downloadSampleExcelTemplate, exportCatalogToExcel } from '../../utils/excelParser';
import { generateWhatsAppWebLink, sendWhatsAppMessage } from '../../utils/whatsappService';
import { InventoryTab } from './InventoryTab';
import { CustomerCrmTab } from './CustomerCrmTab';
import { EmailTemplatesTab } from './EmailTemplatesTab';
import { UsersTab } from './UsersTab';
import { neonDb } from '../../services/neonDb';
import { SecurityPanel } from './SecurityPanel';
import { FulfillmentPanel } from './FulfillmentPanel';
import { SupplierQuotesPanel } from './SupplierQuotesPanel';
import { SupportPanel } from './SupportPanel';
import { OverviewPanel } from './OverviewPanel';
import { useDetails } from '../../components/DetailsDialog';
import { orderDetail, productDetail } from '../../utils/detailModels';

export const AdminDashboard: React.FC = () => {
  const { user, isAdmin, canAccessAdmin, canAccessSection, adminSections: allowedSections, sessionReady, openAuthModal, refreshAccess, isAccessRefreshing, accessRefreshError } = useAuth();
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    duplicateProduct,
    orders,
    cancelOrder,
    updateOrderStatus,
    updatePaymentStatus,
    manualSendWhatsAppNotification,
    whatsappLogs,
    refreshWhatsAppLogs,
    settings,
    updateSettings,
    activeCarts,
    navigate
  } = useStore();

  const { t, language, formatPrice } = useLanguage();
  const { openDetails } = useDetails();
  const showProductInfo = (p: Product) => openDetails({ ...productDetail(p, language, formatPrice, canAccessSection('inventory') || canAccessSection('products')), actions: canAccessSection('products') ? [{ label: 'تعديل المنتج', run: () => handleOpenEditProduct(p) }] : [] });
  const showOrderInfo = (o: Order) => openDetails(orderDetail(o, formatPrice, showProductInfo));

  const [activeTab, setSection] = useState<AdminSection>(initialAdminSection);
  const setActiveTab = (section: AdminSection) => {
    if (!canAccessSection(section)) return;
    setSection(section);
    window.history.pushState({}, '', `/admin?section=${section}`);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  useEffect(() => { const restore = () => setSection(initialAdminSection()); window.addEventListener('popstate', restore); return () => window.removeEventListener('popstate', restore); }, []);
  useEffect(() => { if (sessionReady && canAccessAdmin && !new URLSearchParams(window.location.search).has('section') && !canAccessSection(activeTab)) setSection(allowedSections[0] as AdminSection); }, [sessionReady, canAccessAdmin, allowedSections.join(',')]);


  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [specsInput, setSpecsInput] = useState('{}');
  const [productSaveError, setProductSaveError] = useState('');

  useEffect(() => {
    if (!isAddProductModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsAddProductModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddProductModalOpen]);

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
    setSelectedBannerProduct(null);
    setNewSlide({
      badge: 'عرض حصري جديد',
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

  const [selectedBannerProduct, setSelectedBannerProduct] = useState<Product | null>(null);

  // Toggle Homepage Default Featured Product
  const handleToggleHomepageFeatured = (productId: string) => {
    const current = settings.homepage_featured_ids || [];
    const updated = current.includes(productId)
      ? current.filter(id => id !== productId)
      : [...current, productId];
    updateSettings({ homepage_featured_ids: updated });
  };

  // Shipping & Cities States & Handlers
  const [shippingGovId, setShippingGovId] = useState<string>('daqahlia');
  const [newCityNameAr, setNewCityNameAr] = useState('');
  const [newCityFee, setNewCityFee] = useState<number>(35);

  const currentShippingGov = egyptianGovernorates.find(g => g.id === shippingGovId) || egyptianGovernorates[0];

  const handleSetGovBaseFee = (govId: string, fee: number) => {
    const existing = settings.custom_shipping_rates || [];
    const filtered = existing.filter(r => !(r.governorate_id === govId && (!r.city_name || r.city_name === '*')));
    const updated: CustomShippingRate[] = [...filtered, { governorate_id: govId, city_name: '*', shipping_fee: fee, is_active: true }];
    updateSettings({ custom_shipping_rates: updated });
  };

  const handleSetCityFee = (govId: string, cityName: string, fee: number) => {
    const existing = settings.custom_shipping_rates || [];
    const filtered = existing.filter(r => !(r.governorate_id === govId && r.city_name === cityName));
    const updated: CustomShippingRate[] = [...filtered, { governorate_id: govId, city_name: cityName, shipping_fee: fee, is_active: true }];
    updateSettings({ custom_shipping_rates: updated });
  };

  const handleAddCustomCity = (govId: string, nameAr: string, fee: number) => {
    if (!nameAr.trim()) return;
    const existingCities = settings.custom_cities || [];
    if (!existingCities.some(c => c.governorate_id === govId && c.name_ar === nameAr.trim())) {
      updateSettings({
        custom_cities: [...existingCities, { governorate_id: govId, name_ar: nameAr.trim() }]
      });
    }
    handleSetCityFee(govId, nameAr.trim(), fee);
    setNewCityNameAr('');
  };

  const handleToggleDisableCity = (cityName: string) => {
    const currentDisabled = settings.disabled_cities || [];
    const updated = currentDisabled.includes(cityName)
      ? currentDisabled.filter(c => c !== cityName)
      : [...currentDisabled, cityName];
    updateSettings({ disabled_cities: updated });
  };

  // Helper for reading files directly from laptop to Base64 Data URL
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64Url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          callback(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Category Manager States
  const [showAddCatForm, setShowAddCatForm] = useState(false);
  const [newCatNameAr, setNewCatNameAr] = useState('');
  const [newCatNameEn, setNewCatNameEn] = useState('');
  const [newCatKey, setNewCatKey] = useState('');
  const [newCatImage, setNewCatImage] = useState('');
  const [editingCatKey, setEditingCatKey] = useState<string | null>(null);
  const [editingCatImage, setEditingCatImage] = useState('');
  const [editingCatNameAr, setEditingCatNameAr] = useState('');
  const [editingCatNameEn, setEditingCatNameEn] = useState('');

  const defaultCategoriesList: CustomCategory[] = [
    { key: 'smartphones', name_ar: 'هواتف ذكية', name_en: 'Smartphones', image: '/product-images/15c3630cb4bb430b367edd7f.webp' },
    { key: 'chargers_cables', name_ar: 'شواحن وكابلات', name_en: 'Chargers & Cables', image: '/product-images/onmust-zolo-30w-studio.jpg' },
    { key: 'audio', name_ar: 'سماعات وصوتيات', name_en: 'Audio & Earbuds', image: '/product-images/f6427a20c128ea77c56bc426.webp' },
    { key: 'smartwatches', name_ar: 'ساعات ذكية', name_en: 'Smartwatches', image: '/product-images/3f4452f62308aae22858b473.webp' },
    { key: 'powerbanks', name_ar: 'باور بانك', name_en: 'Power Banks', image: '/product-images/0e1a38acbfd018e570a0b515.webp' },
    { key: 'cases_protection', name_ar: 'كفرات وحماية', name_en: 'Cases & Protection', image: '/product-images/2e1f8fb369b614aba97f55d1.webp' },
    { key: 'accessories', name_ar: 'إكسسوارات متنوعة', name_en: 'Accessories', image: '/product-images/3af3d5bd2ec35679a678251e.webp' },
  ];

  const currentCategories: CustomCategory[] = (settings.custom_categories && settings.custom_categories.length > 0)
    ? settings.custom_categories
    : defaultCategoriesList;

  const handleSaveNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatNameAr.trim()) return;
    const key = newCatKey.trim() || newCatNameEn.trim().toLowerCase().replace(/\s+/g, '_') || `cat_${Date.now()}`;
    const newCat: CustomCategory = {
      key,
      name_ar: newCatNameAr.trim(),
      name_en: newCatNameEn.trim() || newCatNameAr.trim(),
      image: newCatImage.trim() || '/product-placeholder.svg',
    };
    updateSettings({ custom_categories: [...currentCategories.filter(c => c.key !== key), newCat] });
    setShowAddCatForm(false);
    setNewCatNameAr('');
    setNewCatNameEn('');
    setNewCatKey('');
    setNewCatImage('');
  };

  const handleStartEditCategory = (cat: CustomCategory) => {
    setEditingCatKey(cat.key);
    setEditingCatNameAr(cat.name_ar);
    setEditingCatNameEn(cat.name_en);
    setEditingCatImage(cat.image);
  };

  const handleSaveCategoryEdit = (key: string) => {
    const updated = currentCategories.map(c => {
      if (c.key === key) {
        return {
          ...c,
          name_ar: editingCatNameAr.trim() || c.name_ar,
          name_en: editingCatNameEn.trim() || c.name_en,
          image: editingCatImage.trim() || c.image,
        };
      }
      return c;
    });
    updateSettings({ custom_categories: updated });
    setEditingCatKey(null);
  };

  const handleDeleteCategory = (key: string) => {
    const updated = currentCategories.filter(c => c.key !== key);
    updateSettings({ custom_categories: updated });
  };

  // Coupon Manager States
  const [showAddCouponForm, setShowAddCouponForm] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [newCouponValue, setNewCouponValue] = useState<number>(10);
  const [newCouponMinOrder, setNewCouponMinOrder] = useState<number>(0);
  const [newCouponMaxDisc, setNewCouponMaxDisc] = useState<number>(0);

  const handleSaveNewCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim() || newCouponValue <= 0) return;
    const coupon: DiscountCoupon = {
      id: `coupon-${Date.now()}`,
      code: newCouponCode.trim().toUpperCase(),
      discount_type: newCouponType,
      discount_value: newCouponValue,
      min_order_amount: newCouponMinOrder > 0 ? newCouponMinOrder : undefined,
      max_discount_amount: newCouponMaxDisc > 0 ? newCouponMaxDisc : undefined,
      is_active: true,
      used_by: [],
      created_at: new Date().toISOString()
    };
    const current = settings.coupons || [];
    updateSettings({ coupons: [...current.filter(c => c.code.toUpperCase() !== coupon.code), coupon] });
    setShowAddCouponForm(false);
    setNewCouponCode('');
    setNewCouponValue(10);
    setNewCouponMinOrder(0);
    setNewCouponMaxDisc(0);
  };

  const handleToggleCoupon = (code: string) => {
    const current = settings.coupons || [];
    updateSettings({
      coupons: current.map(c => c.code === code ? { ...c, is_active: !c.is_active } : c)
    });
  };

  const handleDeleteCoupon = (code: string) => {
    const current = settings.coupons || [];
    updateSettings({
      coupons: current.filter(c => c.code !== code)
    });
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
    is_featured: false,
    images: ['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80'],
    description_ar: '',
  });

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setSpecsInput('{}');
    setProductSaveError('');
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
      is_featured: false,
      images: ['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80'],
      description_ar: 'جهاز كسر زيرو خالي من الخدوش مع ضمان معتمد من متجر جو ستور.',
    });
    setIsAddProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    if (!canAccessSection('products')) return;
    setEditingProduct(prod);
    setProdForm({ ...prod, is_featured: !!prod.is_featured });
    setSpecsInput(JSON.stringify(prod.specs || {}, null, 2));
    setProductSaveError('');
    setIsAddProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodForm.name_ar || prodForm.price === undefined || prodForm.price < 0) return;
    let specs: Record<string, string>;
    try {
      specs = JSON.parse(specsInput);
      if (!specs || Array.isArray(specs) || typeof specs !== 'object' ||
        Object.entries(specs).some(([key, value]) => key.startsWith('__') || typeof value !== 'string')) {
        throw new Error();
      }
    } catch {
      setProductSaveError('اكتب المواصفات بصيغة JSON، باستخدام اسم المواصفة وقيمتها كنصوص.');
      return;
    }
    const saved = { ...prodForm, specs, quick_specs: specs,
      is_featured: !!prodForm.is_featured,
      in_stock: (prodForm.stock ?? 0) > 0 && (prodForm.price ?? 0) > 0 && prodForm.is_active !== false };

    if (editingProduct) {
      updateProduct(editingProduct.id, saved);
    } else {
      addProduct(saved);
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

  const [wishlistGap, setWishlistGap] = useState<{ product_id: string; name_ar: string; interest_count: number }[]>([]);
  useEffect(() => { neonDb.getWishlistGap().then(setWishlistGap).catch(() => {}); }, []);

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

  // Require a verified session and check the selected section before mounting its UI.
  if (sessionReady === false) return <p role="status" className="p-10 text-center">جارٍ التحقق من جلسة الدخول والصلاحيات…</p>;
  if (!canAccessAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 font-cairo">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white border border-rose-500/40 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-700 mx-auto shadow-lg shadow-rose-500/10">
            <ShieldAlert className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-700 font-black text-[11px] border border-rose-500/30">
              منطقة إدارية مقيدة ⛔
            </span>
            <h2 className="text-xl font-black text-slate-900">لوحة تحكم الإدارة للإداريين فقط</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              الدخول متاح للمدير الكامل والمستخدمين المسموح لهم بأقسام محددة. لو حسابك مسجل من نسخة سابقة، سجّل الدخول مرة أخرى لتوثيق الجلسة.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-100/80 border border-slate-200 text-[11px] text-slate-600 text-right space-y-1.5 font-cairo">
            <div className="flex items-center justify-between text-slate-600 font-bold border-b border-slate-200 pb-1">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                <span>بيانات الحساب الحالي:</span>
              </span>
              <span className={`px-2 py-0.2 rounded text-[10px] ${user ? 'bg-blue-500/20 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                {user ? user.role : 'غير مسجل'}
              </span>
            </div>
            <p className="text-slate-600">الاسم: {user?.name || 'زائر غير مسجل'}</p>
            <p className="text-slate-600 font-outfit">البريد: {user?.email || 'لا يوجد'}</p>
            {user?.phone && <p className="text-slate-600 font-outfit">الهاتف: {user.phone}</p>}
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            {user && <>
              <button onClick={() => { void refreshAccess(); }} disabled={isAccessRefreshing}
                className="w-full py-3 rounded-xl bg-white border border-amber-400 text-amber-800 font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                <RefreshCw className={`w-4 h-4 ${isAccessRefreshing ? 'animate-spin' : ''}`} />
                {isAccessRefreshing ? 'جارٍ تحديث الصلاحيات…' : 'تحديث صلاحيات حسابي'}
              </button>
              <p className="text-xs text-slate-600">لو اتضافت لك صلاحية مسؤول وأنت مسجل دخول، اضغط تحديث الصلاحيات.</p>
              {accessRefreshError && <p role="alert" className="text-xs text-rose-700">{accessRefreshError}</p>}
            </>}
            <button
              onClick={() => openAuthModal('يرجى تسجيل الدخول بحساب الإدارة المصرح له', 'admin')}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-glow-gold transition-all"
            >
              تسجيل الدخول بحساب الإدارة
            </button>
            <button
              onClick={() => navigate('home')}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-all"
            >
              الرجوع إلى المتجر الرئيسي
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!canAccessSection(activeTab)) return <AdminShell active={activeTab} allowed={allowedSections} onChange={setActiveTab} onVisit={() => navigate('home')} name={user?.name}><div role="alert" className="rounded-2xl border border-rose-200 bg-white p-8 space-y-4"><h2 className="font-black text-xl">ليس لديك صلاحية لهذا القسم</h2><p className="text-slate-600">اختار أحد الأقسام المسموحة من القائمة، أو اطلب من المدير تعديل صلاحيات حسابك.</p><button className="px-4 py-3 bg-amber-500 rounded-xl font-bold" onClick={() => setActiveTab(allowedSections[0] as AdminSection)}>فتح أول قسم مسموح</button></div></AdminShell>;

  return (
    <AdminShell active={activeTab} allowed={allowedSections} onChange={setActiveTab} onVisit={() => navigate('home')} name={user?.name}><div className="space-y-6 font-cairo min-w-0">
      <Suspense fallback={<p role="status" className="p-8 text-slate-600">جارٍ فتح الأداة…</p>}>
        {activeTab === 'screens' && <ScreenFinder />}
        {activeTab === 'covers' && <CoverFinder />}
        {['tools', 'analytics', 'quality', 'stocktake', 'reorder', 'pricing', 'labels'].includes(activeTab) && <AdminTools key={activeTab} mode={activeTab} onEdit={handleOpenEditProduct} onSection={setActiveTab} />}
      </Suspense>

      {activeTab === 'fulfillment' && <FulfillmentPanel />}
      {activeTab === 'suppliers' && <SupplierQuotesPanel />}
      {activeTab === 'support' && <SupportPanel />}
      {activeTab === 'security' && <SecurityPanel />}

      {activeTab === 'overview' && <OverviewPanel onSection={setActiveTab} onEdit={handleOpenEditProduct} wishlistGap={wishlistGap} />}

      {/* TAB 2: PRODUCTS MANAGER (Manual + Excel Bulk Import + Export) */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          {/* Action Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200">
            {/* Search and Category Filter */}
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="ابحث باسم المنتج أو الماركة..."
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <select
                value={productCatFilter}
                onChange={(e) => setProductCatFilter(e.target.value)}
                className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 focus:outline-none"
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
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{t('bulkExcelImport')}</span>
              </button>

              {/* Download Template */}
              <button
                onClick={downloadSampleExcelTemplate}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors"
                title={t('downloadTemplate')}
              >
                <Download className="w-4 h-4" />
              </button>

              {/* Export Catalog to Excel */}
              <button
                onClick={() => exportCatalogToExcel(products)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors"
                title={t('exportProducts')}
              >
                <FileCheck className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Products Table */}
          <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-white text-slate-600 text-[11px] font-bold border-b border-slate-200">
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
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-100 transition-colors">
                      <td className="p-3.5 flex items-center gap-3">
                        <img
                          src={p.images[0]}
                          alt=""
                          className="w-10 h-10 rounded-xl object-cover bg-slate-100 border border-slate-200 flex-shrink-0"
                        />
                        <div>
                          <button type="button" onClick={() => showProductInfo(p)} className="detail-info-button text-start font-bold text-slate-900 block line-clamp-1">{p.name_ar}</button>
                          <span className="text-[10px] text-slate-600 font-outfit">{p.brand} {p.storage && `• ${p.storage}`}</span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px]">
                          {p.category}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.condition === 'mint' ? 'bg-amber-500/20 text-amber-700' : 'bg-emerald-500/20 text-emerald-700'
                        }`}>
                          {p.condition === 'mint' ? 'كسر زيرو' : 'جديد'}
                        </span>
                      </td>

                      <td className="p-3.5">
                        {p.battery_health ? (
                          <span className="text-emerald-700 font-bold font-outfit">
                            🔋 {p.battery_health}%
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>

                      <td className="p-3.5 font-bold font-outfit text-amber-700">
                        {formatPrice(p.price)}
                      </td>

                      <td className="p-3.5 font-outfit">
                        <span className={`px-2 py-0.5 rounded font-bold ${p.stock > 0 ? 'text-emerald-700 bg-emerald-500/10' : 'text-rose-700 bg-rose-500/10'}`}>
                          {p.stock} قطعة
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Pin / Star to Homepage Default */}
                          <button
                            onClick={() => handleToggleHomepageFeatured(p.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              (settings.homepage_featured_ids || []).includes(p.id)
                                ? 'bg-amber-500/20 text-amber-700 border border-amber-500/30'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-amber-600'
                            }`}
                            title={(settings.homepage_featured_ids || []).includes(p.id) ? 'مثبت في الصفحة الرئيسية (اضغط للإلغاء)' : 'تثبيت كمنتج افتراضي في الصفحة الرئيسية'}
                          >
                            <Star className={`w-3.5 h-3.5 ${(settings.homepage_featured_ids || []).includes(p.id) ? 'fill-amber-500 text-amber-600' : ''}`} />
                          </button>

                          {/* Duplicate */}
                          <button
                            onClick={() => duplicateProduct(p.id)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-100 text-slate-600 hover:text-amber-700"
                            title="تكرار ونسخ المنتج"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEditProduct(p)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-100 text-slate-600 hover:text-blue-700"
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
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-700"
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

      {/* TAB 3: INVENTORY & STOCK MANAGER (Live toggle, Quick stock editing, Pre-owned) */}
      {activeTab === 'inventory' && (
        <InventoryTab
          onOpenAddProduct={handleOpenAddProduct}
          onOpenEditProduct={handleOpenEditProduct}
          onOpenExcelModal={() => setIsExcelModalOpen(true)}
        />
      )}

      {/* TAB 4: ORDERS & SALES MANAGER (WhatsApp Automated Status Triggers) */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Order Status Filter */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 font-bold">تصفية حسب الحالة:</span>
              <div className="flex gap-1 overflow-x-auto text-xs">
                {['all', 'pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setOrderStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                      orderStatusFilter === st
                        ? 'bg-amber-500 text-black'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st === 'all' && 'الكل'}
                    {st === 'pending' && 'قيد المراجعة'}
                    {st === 'confirmed' && 'تم التأكيد'}
                    {st === 'processing' && 'جاري التجهيز'}
                    {st === 'shipped' && 'تم الشحن'}
                    {st === 'out_for_delivery' && 'مع المندوب'}
                    {st === 'delivered' && 'تم التوصيل'}
                    {st === 'cancelled' && 'ملغي'}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-xs text-slate-600 font-outfit">
              {filteredOrders.length} طلبات
            </span>
          </div>

          {/* Orders Cards List */}
          <div className="space-y-4">
            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 text-slate-600 text-xs">
                لا توجد طلبات مسجلة بهذه الحالة.
              </div>
            ) : (
              filteredOrders.map((ord) => (
                <div key={ord.id} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xl space-y-4">
                  {/* Order Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => showOrderInfo(ord)} className="detail-info-button text-base font-black text-slate-900 font-outfit">#{ord.order_number}</button>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-700 border border-amber-500/30">
                        {ord.order_status}
                      </span>
                      <span className="text-xs text-slate-600">
                        {new Date(ord.created_at).toLocaleString('ar-EG')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-600">المطلوب:</span>
                      <button type="button" onClick={() => showOrderInfo(ord)} className="detail-info-button text-lg font-black text-amber-700 font-outfit">{formatPrice(ord.total)}</button>
                    </div>
                  </div>

                  {/* Customer Info & Items */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    {/* Customer & Delivery */}
                    <div className="space-y-1.5 bg-slate-100/60 p-3 rounded-2xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 block text-[11px] font-bold">العميل والتوصيل:</span>
                        {ord.google_maps_url && (
                          <a
                            href={ord.google_maps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-amber-700 hover:text-amber-700 font-bold bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 transition-colors"
                            title="فتح موقع العميل على خرائط جوجل"
                          >
                            <MapPin className="w-3 h-3 text-amber-700" />
                            <span>موقع GPS 📍</span>
                          </a>
                        )}
                      </div>
                      <strong className="text-slate-900 block font-bold text-sm">{ord.customer_name}</strong>
                      <div className="flex flex-wrap items-center gap-2 text-slate-600 font-outfit text-xs">
                        <a href={`tel:${ord.customer_phone}`} className="hover:text-amber-700 flex items-center gap-1">
                          <PhoneCall className="w-3 h-3 text-emerald-700" />
                          <span>{ord.customer_phone}</span>
                        </a>
                        {ord.customer_secondary_phone && (
                          <span className="text-[11px] text-slate-600 bg-slate-100/80 px-1.5 py-0.5 rounded">
                            بديل: {ord.customer_secondary_phone}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 text-xs">
                        <span className="text-amber-700/80 font-bold">{ord.governorate}</span> - {ord.city}
                      </p>
                      <p className="text-slate-600 text-[11px]">
                        {formatDeliveryAddress({ ...ord, governorate: undefined, city: undefined })}
                      </p>
                      {ord.card_last4 && (
                        <p className="text-[11px] text-blue-700 font-outfit bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 inline-block">
                          بطاقة: **** {ord.card_last4} {ord.card_holder ? `(${ord.card_holder})` : ''}
                        </p>
                      )}
                      {ord.payment_reference && (
                        <p className="text-[10px] text-slate-600">مرجع: {ord.payment_reference}</p>
                      )}
                    </div>

                    {/* Products */}
                    <div className="space-y-1 bg-slate-100/60 p-3 rounded-2xl border border-slate-200">
                      <span className="text-slate-600 block text-[11px]">المنتجات المطلوبة:</span>
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                        {ord.items.map((it, i) => (
                          <div key={i} className="flex justify-between text-slate-600">
                            <span className="truncate max-w-[140px]">{it.product.name_ar}</span>
                            <span className="font-outfit text-amber-700">×{it.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions & WhatsApp automated dispatch triggers */}
                  <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-slate-600 font-semibold">تغيير الحالة مع إشعار واتساب فوري:</span>

                      {/* Payment Verified */}
                      {ord.payment_status !== 'verified' && (
                        <button
                          onClick={() => updatePaymentStatus(ord.id, 'verified')}
                          className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-700 border border-purple-500/30 text-xs font-bold transition-all"
                        >
                          تأكيد الدفع ⚡
                        </button>
                      )}

                      {/* Ship order */}
                      {ord.order_status !== 'shipped' && ord.order_status !== 'delivered' && (
                        <button
                          onClick={async () => {
                            const courier = prompt('اسم شركة الشحن أو المندوب:', 'مندوب جو ستور السريع');
                            const tracking = prompt('رقم بوليصة الشحن (اختياري):', '');
                            if (courier === null) return;
                            const result = await updateOrderStatus(ord.id, 'shipped', courier, tracking || undefined);
                            if (!result.success && result.code === 'PAYMENT_HOLD') {
                              const overrideReason = prompt(`${result.error}\nاكتبي سبب تجاوز هذا التحذير لإتمام الشحن، أو اتركيه فارغًا للإلغاء:`);
                              if (overrideReason?.trim()) {
                                await updateOrderStatus(ord.id, 'shipped', courier, tracking || undefined, { override: true, overrideReason });
                              }
                            } else if (!result.success) {
                              alert(result.error || 'تعذر تحديث حالة الطلب.');
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-700 border border-blue-500/30 text-xs font-bold transition-all"
                        >
                          تسليم للشحن 🚚
                        </button>
                      )}

                      {/* Out for delivery */}
                      {ord.order_status === 'shipped' && (
                        <button
                          onClick={() => updateOrderStatus(ord.id, 'out_for_delivery')}
                          className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 border border-amber-500/30 text-xs font-bold transition-all"
                        >
                          خروج للتسليم 🛵
                        </button>
                      )}

                      {/* Delivered */}
                      {ord.order_status !== 'delivered' && (
                        <button
                          onClick={() => updateOrderStatus(ord.id, 'delivered')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 border border-emerald-500/30 text-xs font-bold transition-all"
                        >
                          تم التسليم بنجاح 🎉
                        </button>
                      )}

                      {/* Review Request */}
                      {ord.order_status === 'delivered' && (
                        <button
                          onClick={() => manualSendWhatsAppNotification(ord, 'review_request')}
                          className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span>إرسال طلب تقييم واتساب ⭐</span>
                        </button>
                      )}

                      {/* Admin Order Cancellation with Automatic Restocking */}
                      {ord.order_status !== 'cancelled' ? (
                        <button
                          onClick={async () => {
                            const reason = prompt('سبب إلغاء الطلب (سيتم استرجاع قطع المنتجات إلى المخزن تلقائياً):', 'طلب العميل أو تغيير المواصفات');
                            if (reason !== null) {
                              if (confirm(`هل أنت متأكد من إلغاء الطلب #${ord.order_number} وإعادة المنتجات للمخزن فوراً؟`)) {
                                await cancelOrder(ord.id, reason, 'admin');
                                alert(`تم إلغاء الطلب #${ord.order_number} واسترجاع المخزون بنجاح.`);
                              }
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-700 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1"
                          title="إلغاء الطلب وإرجاع المنتجات للمخزون"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>إلغاء الطلب واسترجاع المخزن ❌</span>
                        </button>
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-700 border border-rose-500/30 text-xs font-bold">
                          تم إلغاء الطلب واسترجاع القطع للمخزن ↺
                        </span>
                      )}
                    </div>

                    {/* Direct WhatsApp Message Modal Trigger */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setWhatsappModalOrder(ord);
                          setSendWhatsAppAlert(null);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center gap-1.5 transition-all"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>إرسال رسالة واتساب مخصصة</span>
                      </button>

                      <a
                        href={generateWhatsAppWebLink(ord.customer_whatsapp || ord.customer_phone, `مرحباً ${ord.customer_name}، نتواصل معك بخصوص طلبك رقم #${ord.order_number} من متجر جو ستور.`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-100 text-slate-600 hover:text-emerald-700"
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

      {/* TAB 5: CUSTOMER INTELLIGENCE & ABANDONED CARTS CRM */}
      {activeTab === 'crm' && (
        <CustomerCrmTab />
      )}

      {/* TAB 6: EMAIL TEMPLATES & OTP CUSTOMIZATION STUDIO */}
      {activeTab === 'emails' && (
        <EmailTemplatesTab />
      )}

      {/* TAB 7: WHATSAPP AUTOMATION HUB */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white border border-emerald-500/30 shadow-2xl space-y-4">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-700 border border-emerald-500/30">
                  <MessageCircle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    ربط نظام واتساب برو الآلي (WhatsApp Pro Automation)
                  </h3>
                  <p className="text-xs text-slate-600">
                    مرتبط بخادم مشروع <code className="text-emerald-700 font-mono">whatsapp-pro-automation</code> لإرسال الرسائل عبر رقم واتساب المحل الرسمي.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-bold text-emerald-700">النظام نشط وجاهز</span>
              </div>
            </div>

            {/* Connection Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-200 text-xs">
              <div>
                <label className="block text-slate-600 mb-1">رابط خادم واتساب برو:</label>
                <input
                  type="text"
                  value={settings.whatsapp_automation_url}
                  onChange={(e) => updateSettings({ whatsapp_automation_url: e.target.value })}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">البريد الإلكتروني / الحساب:</label>
                <input
                  type="text"
                  value={settings.whatsapp_automation_email}
                  onChange={(e) => updateSettings({ whatsapp_automation_email: e.target.value })}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">كلمة المرور:</label>
                <input
                  type="password"
                  value={settings.whatsapp_automation_pass}
                  onChange={(e) => updateSettings({ whatsapp_automation_pass: e.target.value })}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono"
                />
              </div>
            </div>

            {/* Automation Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200 text-xs">
              <label className="flex items-center gap-3 p-3 rounded-2xl bg-slate-100 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.auto_send_on_order}
                  onChange={(e) => updateSettings({ auto_send_on_order: e.target.checked })}
                  className="accent-amber-500 rounded"
                />
                <div>
                  <strong className="text-slate-900 block font-bold">إرسال إشعار فوري عند تسجيل طلب جديد</strong>
                  <span className="text-[11px] text-slate-600">يتلقى العميل فاتورة الطلب كاملة فور الضغط على تأكيد الطلب.</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-2xl bg-slate-100 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.auto_send_on_status_change}
                  onChange={(e) => updateSettings({ auto_send_on_status_change: e.target.checked })}
                  className="accent-amber-500 rounded"
                />
                <div>
                  <strong className="text-slate-900 block font-bold">إرسال تحديثات عند تغيير حالة الطلب</strong>
                  <span className="text-[11px] text-slate-600">إشعار العميل عند تأكيد الدفع، التسليم للشحن، أو التوصيل.</span>
                </div>
              </label>
            </div>
          </div>

          {/* WhatsApp Sent Logs */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">سجل الرسائل والإشعارات المرسلة ({whatsappLogs.length})</h3>
              <button
                onClick={refreshWhatsAppLogs}
                className="text-xs text-amber-700 flex items-center gap-1 hover:underline"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>تحديث السجل</span>
              </button>
            </div>

            {whatsappLogs.length === 0 ? (
              <p className="text-xs text-slate-600 py-6 text-center">لا توجد رسائل مسجلة بعد.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {whatsappLogs.map((log) => (
                  <div key={log.id} className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <strong className="text-emerald-700 font-outfit">{log.phone}</strong>
                        <span className="px-2 py-0.2 rounded bg-slate-100 text-[10px] text-slate-600">
                          {log.type}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-outfit">
                        {new Date(log.sent_at).toLocaleTimeString('ar-EG')}
                      </span>
                    </div>

                    <pre className="text-[11px] text-slate-600 font-cairo whitespace-pre-wrap bg-slate-100/80 p-3 rounded-xl border border-slate-200">
                      {log.text}
                    </pre>

                    <div className="flex items-center justify-between text-[10px] text-slate-600 pt-1">
                      <span>الحالة: <strong className="text-emerald-700">{log.status}</strong></span>
                      <a
                        href={generateWhatsAppWebLink(log.phone, log.text)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-700 hover:underline flex items-center gap-1"
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
          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-6">
            <h3 className="font-bold text-base text-slate-900 border-b border-slate-200 pb-3 flex items-center gap-2">
              <Settings className="w-5 h-5 text-amber-700" />
              <span>{language === 'ar' ? 'بيانات المتجر وحسابات التواصل' : 'Store Info & Social Profiles'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-cairo">
              <div>
                <label className="block text-slate-600 mb-1">{language === 'ar' ? 'اسم المتجر بالعربي:' : 'Store Name (AR):'}</label>
                <input
                  type="text"
                  value={settings.store_name_ar}
                  onChange={(e) => updateSettings({ store_name_ar: e.target.value })}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">{language === 'ar' ? 'اسم المتجر بالإنجليزي:' : 'Store Name (EN):'}</label>
                <input
                  type="text"
                  value={settings.store_name_en}
                  onChange={(e) => updateSettings({ store_name_en: e.target.value })}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-outfit"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">{language === 'ar' ? 'رقم الهاتف الأساسي:' : 'Primary Phone:'}</label>
                <input
                  type="text"
                  value={settings.store_phone}
                  onChange={(e) => updateSettings({ store_phone: e.target.value })}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-outfit"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">{language === 'ar' ? 'رقم الواتساب الرسمي (بدون +):' : 'Official WhatsApp:'}</label>
                <input
                  type="text"
                  value={settings.store_whatsapp}
                  onChange={(e) => updateSettings({ store_whatsapp: e.target.value })}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-outfit"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 mb-1">{language === 'ar' ? 'عنوان الفرع بالمنصورة:' : 'Mansoura Branch Address:'}</label>
                <input
                  type="text"
                  value={settings.store_address_ar}
                  onChange={(e) => updateSettings({ store_address_ar: e.target.value })}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900"
                />
              </div>

              {/* TikTok Link (Dedicated User Audio Request) */}
              <div className="sm:col-span-2 p-4 rounded-2xl bg-slate-100/80 border border-amber-500/30 space-y-2">
                <label className="block text-amber-700 font-bold">
                  {language === 'ar' ? 'رابط حساب تيك توك الرسمي (TikTok Profile URL) *' : 'Official TikTok Profile URL *'}
                </label>
                <input
                  type="text"
                  value={settings.tiktok_url || ''}
                  onChange={(e) => updateSettings({ tiktok_url: e.target.value })}
                  placeholder="https://www.tiktok.com/@joestore2026"
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-mono text-xs focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-600">
                  {language === 'ar'
                    ? '💡 يمكنك تعديل رابط التيك توك هنا في أي وقت وسيتم تحديثه تلقائياً في الفوتر وكافة أزرار التواصل بالموقع.'
                    : '💡 Modify your TikTok link here anytime; it updates automatically across all footer links.'}
                </p>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">{language === 'ar' ? 'رابط حساب فيسبوك:' : 'Facebook Page URL:'}</label>
                <input
                  type="text"
                  value={settings.facebook_url || ''}
                  onChange={(e) => updateSettings({ facebook_url: e.target.value })}
                  placeholder="https://facebook.com/joestore"
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">{language === 'ar' ? 'رابط حساب إنستجرام:' : 'Instagram URL:'}</label>
                <input
                  type="text"
                  value={settings.instagram_url || ''}
                  onChange={(e) => updateSettings({ instagram_url: e.target.value })}
                  placeholder="https://instagram.com/joestore"
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Payments & Wallets */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-6">
            <h3 className="font-bold text-base text-slate-900 border-b border-slate-200 pb-3 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-700" />
              <span>{language === 'ar' ? 'بيانات الدفع والمحافظ الإلكترونية' : 'Payment Wallets & Invoicing'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-cairo">
              <div>
                <label className="block text-slate-600 mb-1">{language === 'ar' ? 'معرف إنستاباي (InstaPay ID):' : 'InstaPay ID:'}</label>
                <input
                  type="text"
                  value={settings.instapay_address}
                  onChange={(e) => updateSettings({ instapay_address: e.target.value })}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-outfit"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">{language === 'ar' ? 'رقم محفظة فودافون كاش:' : 'Vodafone Cash Number:'}</label>
                <input
                  type="text"
                  value={settings.vodafone_cash_number}
                  onChange={(e) => updateSettings({ vodafone_cash_number: e.target.value })}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-outfit"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">{language === 'ar' ? 'حد الشحن المجاني (ج.م):' : 'Free Shipping Threshold (EGP):'}</label>
                <input
                  type="number"
                  value={settings.free_shipping_threshold || 2500}
                  onChange={(e) => updateSettings({ free_shipping_threshold: Number(e.target.value) })}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-outfit"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">{language === 'ar' ? 'مصاريف الشحن الافتراضية:' : 'Default Shipping Fee:'}</label>
                <input
                  type="number"
                  value={settings.shipping_fee_default || 35}
                  onChange={(e) => updateSettings({ shipping_fee_default: Number(e.target.value) })}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-outfit"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Theme Customizer (Templates) */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-4">
            <h3 className="font-bold text-base text-slate-900 border-b border-slate-200 pb-3 flex items-center gap-2">
              <Palette className="w-5 h-5 text-amber-700" />
              <span>{language === 'ar' ? 'مظهر وقالب المتجر (Theme Presets)' : 'Store Theme Presets'}</span>
            </h3>
            <p className="text-xs text-slate-600">
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
                    : 'border-slate-200 bg-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 shadow-sm" />
                  <strong className="text-slate-900 text-xs font-bold">{language === 'ar' ? 'الذهبي الملكي (الافتراضي)' : 'Royal Gold (Default)'}</strong>
                </div>
                <p className="text-[11px] text-slate-600">
                  {language === 'ar' ? 'طابع الفخامة لمتجر جو ستور الرسمي مع تدرجات الذهب.' : 'Luxury obsidian & gold signature styling.'}
                </p>
              </div>

              {/* Titanium Blue */}
              <div
                onClick={() => updateSettings({ active_theme: 'titanium_blue' })}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  settings.active_theme === 'titanium_blue'
                    ? 'border-sky-400 bg-sky-500/10 shadow-lg'
                    : 'border-slate-200 bg-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-sky-400 to-blue-600 shadow-sm" />
                  <strong className="text-slate-900 text-xs font-bold">{language === 'ar' ? 'التيتانيوم الفضائي' : 'Titanium Blue'}</strong>
                </div>
                <p className="text-[11px] text-slate-600">
                  {language === 'ar' ? 'مظهر تيتانيوم أزرق عصري مستوحى من أحدث أجهزة أبل.' : 'Aerospace titanium blue aesthetic.'}
                </p>
              </div>

              {/* Emerald Tech */}
              <div
                onClick={() => updateSettings({ active_theme: 'emerald_tech' })}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  settings.active_theme === 'emerald_tech'
                    ? 'border-emerald-400 bg-emerald-500/10 shadow-lg'
                    : 'border-slate-200 bg-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-emerald-400 to-teal-600 shadow-sm" />
                  <strong className="text-slate-900 text-xs font-bold">{language === 'ar' ? 'الزمرد السيبراني' : 'Emerald Tech'}</strong>
                </div>
                <p className="text-[11px] text-slate-600">
                  {language === 'ar' ? 'لمسة تكنولوجية متقدمة بتدرجات الزمرد والأخضر المتألق.' : 'Cyber emerald high-tech matrix styling.'}
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Hero Banners & Slider Manager */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-amber-700" />
                  <span>{language === 'ar' ? 'إدارة بانرات السلايدر الترويجي بالرئيسية' : 'Homepage Hero Slider & Banners'}</span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
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
              <form onSubmit={handleAddSlide} className="p-5 rounded-2xl bg-slate-50 border border-amber-500/40 space-y-4 text-xs font-cairo">
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                  <h4 className="font-bold text-amber-700 text-sm">{language === 'ar' ? 'بيانات الشريحة / البانر الجديد' : 'New Banner Slide Details'}</h4>
                </div>

                {/* Instant Store Product Picker - Auto Fill Banner Details */}
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                  <label className="block text-slate-800 font-bold text-xs flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>{language === 'ar' ? 'اختيار منتج من المتجر لتعبئة بيانات وصور البانر تلقائياً:' : 'Pick product from store to auto-fill banner:'}</span>
                  </label>
                  <select
                    onChange={(e) => {
                      const prodId = e.target.value;
                      if (!prodId) {
                        setSelectedBannerProduct(null);
                        return;
                      }
                      const prod = products.find(p => p.id === prodId);
                      if (prod) {
                        setNewSlide({
                          ...newSlide,
                          title_ar: prod.name_ar,
                          title_en: prod.name_en || prod.name_ar,
                          price: String(prod.price),
                          oldPrice: prod.original_price ? String(prod.original_price) : String(Math.round(prod.price * 1.2)),
                          cat: prod.category || 'smartphones',
                          badge: `أقوى عروض ${prod.brand || 'المتجر'}`,
                          subtitle_ar: prod.description_ar ? prod.description_ar.slice(0, 110) : `متوفر الآن بحالة ${prod.condition === 'mint' ? 'كسر زيرو ممتاز' : 'جديد'} مع ضمان جو ستور المعتمد`,
                          image: prod.images?.[0] || '/product-placeholder.svg',
                        });
                        setSelectedBannerProduct(prod);
                      }
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-cairo text-xs"
                  >
                    <option value="">-- اضغط للبحث واختيار منتج من منتجات المتجر --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name_ar} - {p.price} ج.م ({p.brand || 'عام'})
                      </option>
                    ))}
                  </select>

                  {/* Thumbnail Photo Selector if product has photos */}
                  {selectedBannerProduct && (selectedBannerProduct.images?.length > 1) && (
                    <div className="pt-2 border-t border-amber-500/20 space-y-1.5">
                      <span className="text-[11px] font-semibold text-slate-700 block">
                        اختر أي صورة من صور هذا المنتج لتكون صورة البانر الرئيسية:
                      </span>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {selectedBannerProduct.images.map((img, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setNewSlide(prev => ({ ...prev, image: img }))}
                            className={`p-1 rounded-lg border transition-all flex-shrink-0 bg-white ${
                              newSlide.image === img ? 'border-amber-500 ring-2 ring-amber-400/40 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <img src={img} alt="" className="w-12 h-12 object-contain rounded" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">{language === 'ar' ? 'عنوان العرض (عربي) *:' : 'Title (AR) *:'}</label>
                    <input
                      type="text"
                      required
                      value={newSlide.title_ar}
                      onChange={(e) => setNewSlide({ ...newSlide, title_ar: e.target.value })}
                      placeholder="مثال: خصومات حصرية على الآيفون 14 برو"
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1">{language === 'ar' ? 'عنوان العرض (إنجليزي):' : 'Title (EN):'}</label>
                    <input
                      type="text"
                      value={newSlide.title_en}
                      onChange={(e) => setNewSlide({ ...newSlide, title_en: e.target.value })}
                      placeholder="e.g. Exclusive Deals on iPhone 14 Pro"
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-outfit"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1">{language === 'ar' ? 'نص الشارة العلوية (Badge):' : 'Badge Tag:'}</label>
                    <input
                      type="text"
                      value={newSlide.badge}
                      onChange={(e) => setNewSlide({ ...newSlide, badge: e.target.value })}
                      placeholder="عرض حصري في المنصورة"
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1">{language === 'ar' ? 'القسم المرتبط:' : 'Linked Category:'}</label>
                    <select
                      value={newSlide.cat}
                      onChange={(e) => setNewSlide({ ...newSlide, cat: e.target.value as CategoryKey })}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900"
                    >
                      {currentCategories.map(cat => (
                        <option key={cat.key} value={cat.key}>
                          {cat.name_ar}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1">{language === 'ar' ? 'السعر المعروض:' : 'Displayed Price:'}</label>
                    <input
                      type="text"
                      value={newSlide.price}
                      onChange={(e) => setNewSlide({ ...newSlide, price: e.target.value })}
                      placeholder="24,500"
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-outfit"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1">{language === 'ar' ? 'السعر قبل الخصم:' : 'Old Price:'}</label>
                    <input
                      type="text"
                      value={newSlide.oldPrice}
                      onChange={(e) => setNewSlide({ ...newSlide, oldPrice: e.target.value })}
                      placeholder="27,000"
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-outfit"
                    />
                  </div>

                  {/* Banner Image URL + Laptop Upload */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-slate-600 mb-1">{language === 'ar' ? 'صورة البانر (رابط أو رفع من اللاب توب) *:' : 'Banner Image *:'}</label>
                    <div className="flex flex-col sm:flex-row gap-2.5 items-center">
                      <input
                        type="text"
                        required
                        value={newSlide.image}
                        onChange={(e) => setNewSlide({ ...newSlide, image: e.target.value })}
                        placeholder="الصق رابط الصورة أو ارفعها من جهازك"
                        className="flex-1 w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-mono text-xs"
                      />
                      <label className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-all whitespace-nowrap self-stretch sm:self-auto justify-center">
                        <Upload className="w-4 h-4 text-amber-400" />
                        <span>رفع صورة من اللاب توب</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, (url) => setNewSlide(prev => ({ ...prev, image: url })))}
                        />
                      </label>
                    </div>
                    {newSlide.image && (
                      <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200 w-fit mt-1">
                        <img src={newSlide.image} alt="" className="w-12 h-12 object-contain rounded-lg bg-slate-50 border" />
                        <span className="text-[11px] text-emerald-700 font-bold">معاينة صورة البانر ✓</span>
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 mb-1">{language === 'ar' ? 'الوصف الفرعي (عربي):' : 'Subtitle (AR):'}</label>
                    <textarea
                      rows={2}
                      value={newSlide.subtitle_ar}
                      onChange={(e) => setNewSlide({ ...newSlide, subtitle_ar: e.target.value })}
                      placeholder="أجهزة كسر زيرو ببطارية 90%+ مع شاحن أصلي وضمان استبدال رسمي"
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSlideForm(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600"
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
                <div key={slide.id} className="p-4 rounded-2xl bg-slate-100 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-cairo">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <img
                      src={slide.image}
                      alt=""
                      className="w-16 h-16 rounded-xl object-cover bg-slate-100 border border-slate-200 flex-shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 text-[10px] font-bold">
                          {slide.badge}
                        </span>
                        <strong className="text-slate-900 text-sm">{language === 'ar' ? slide.title_ar : slide.title_en}</strong>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-1 max-w-md line-clamp-1">
                        {language === 'ar' ? slide.subtitle_ar : slide.subtitle_en}
                      </p>
                      <span className="text-amber-700 font-outfit font-bold mt-1 inline-block">
                        {slide.price} EGP
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleDeleteSlide(slide.id)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 border border-rose-500/20 transition-colors"
                      title={language === 'ar' ? 'حذف هذه الشريحة' : 'Delete Slide'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Category Manager & Custom Images */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 pb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-700" />
                  <span>{language === 'ar' ? 'إدارة الفئات (الأقسام) وصور العرض' : 'Category & Images Management'}</span>
                </h3>
                <p className="text-slate-600 text-xs mt-1">
                  {language === 'ar'
                    ? 'أضف فئات جديدة أو عدل صور الفئات المعروضة في الصفحة الرئيسية، مع خيار رفع أي صورة مباشرة من جهازك.'
                    : 'Add new categories or edit existing category photos with direct file upload from your device.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCatForm(!showAddCatForm)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'ar' ? 'إضافة فئة جديدة' : 'Add Category'}</span>
              </button>
            </div>

            {/* Add New Category Form */}
            {showAddCatForm && (
              <form onSubmit={handleSaveNewCategory} className="p-5 rounded-2xl bg-slate-50 border border-amber-500/30 space-y-4 text-xs font-cairo">
                <h4 className="font-bold text-sm text-slate-900">
                  {language === 'ar' ? 'إضافة فئة منتجات جديدة' : 'Add New Category'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">اسم الفئة بالعربية *</label>
                    <input
                      type="text"
                      required
                      value={newCatNameAr}
                      onChange={(e) => {
                        setNewCatNameAr(e.target.value);
                        if (!newCatKey) setNewCatKey(e.target.value.trim().toLowerCase().replace(/\s+/g, '_'));
                      }}
                      placeholder="مثال: إكسسوارات سيارات"
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">الاسم بالإنجليزية</label>
                    <input
                      type="text"
                      value={newCatNameEn}
                      onChange={(e) => setNewCatNameEn(e.target.value)}
                      placeholder="e.g. Car Accessories"
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-outfit"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">المعرف البرمجي (Key)</label>
                    <input
                      type="text"
                      value={newCatKey}
                      onChange={(e) => setNewCatKey(e.target.value)}
                      placeholder="car_accessories"
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-outfit"
                    />
                  </div>
                </div>

                {/* Image Options: URL or Direct Laptop Upload */}
                <div className="space-y-2">
                  <label className="block text-slate-700 font-semibold">صورة الفئة (رابط أو رفع من اللاب توب)</label>
                  <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <input
                      type="text"
                      value={newCatImage}
                      onChange={(e) => setNewCatImage(e.target.value)}
                      placeholder="الصق رابط صورة أو ارفع صورة من جهازك"
                      className="flex-1 bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900"
                    />
                    <label className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-all whitespace-nowrap">
                      <Upload className="w-4 h-4 text-amber-400" />
                      <span>رفع صورة من الجهاز</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, (url) => setNewCatImage(url))}
                      />
                    </label>
                  </div>
                  {newCatImage && (
                    <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200 w-fit">
                      <img src={newCatImage} alt="" className="w-12 h-12 object-contain rounded-lg bg-slate-50 border" />
                      <span className="text-[11px] text-emerald-700 font-bold">تم اختيار ومعاينة الصورة بنجاح ✓</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddCatForm(false)}
                    className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-md"
                  >
                    حفظ الفئة الجديدة
                  </button>
                </div>
              </form>
            )}

            {/* Existing Categories Grid & Image Customization */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-xs font-cairo">
              {currentCategories.map((cat) => (
                <div key={cat.key} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3 relative group">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-white border-2 border-slate-200 overflow-hidden flex items-center justify-center p-2 flex-shrink-0 shadow-sm">
                      <img
                        src={cat.image || '/product-placeholder.svg'}
                        alt={cat.name_ar}
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/product-placeholder.svg'; }}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <strong className="text-slate-900 font-bold text-sm block truncate">{cat.name_ar}</strong>
                      <span className="text-slate-500 text-[11px] font-outfit block truncate">{cat.name_en}</span>
                      <span className="text-[10px] text-amber-700 font-outfit bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block mt-0.5">
                        {cat.key}
                      </span>
                    </div>
                  </div>

                  {/* Inline Edit Form for this Category */}
                  {editingCatKey === cat.key ? (
                    <div className="p-3 rounded-xl bg-white border border-amber-400 space-y-2 mt-2">
                      <label className="block text-[11px] font-bold text-slate-800">تعديل الاسم والصورة:</label>
                      <input
                        type="text"
                        value={editingCatNameAr}
                        onChange={(e) => setEditingCatNameAr(e.target.value)}
                        placeholder="الاسم بالعربي"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-xs text-slate-900"
                      />
                      <input
                        type="text"
                        value={editingCatImage}
                        onChange={(e) => setEditingCatImage(e.target.value)}
                        placeholder="رابط الصورة"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-xs text-slate-900"
                      />
                      <label className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer">
                        <Upload className="w-3.5 h-3.5 text-amber-400" />
                        <span>رفع صورة جديدة من اللاب توب</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, (url) => setEditingCatImage(url))}
                        />
                      </label>
                      {editingCatImage && (
                        <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-lg border">
                          <img src={editingCatImage} alt="" className="w-8 h-8 object-contain rounded" />
                          <span className="text-[10px] text-emerald-700 font-bold">معاينة الصورة المحدثة</span>
                        </div>
                      )}
                      <div className="flex justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingCatKey(null)}
                          className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 text-[11px] font-bold"
                        >
                          إلغاء
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveCategoryEdit(cat.key)}
                          className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-bold"
                        >
                          حفظ
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => handleStartEditCategory(cat)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Edit className="w-3 h-3 text-amber-600" />
                        <span>تعديل الصورة</span>
                      </button>
                      {!['smartphones', 'chargers_cables', 'audio', 'smartwatches', 'powerbanks', 'cases_protection', 'accessories'].includes(cat.key) && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.key)}
                          className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors"
                          title="حذف الفئة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Discount Coupons Management */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 pb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-emerald-600" />
                  <span>{language === 'ar' ? 'أكواد الخصم والكوبونات الترويجية' : 'Discount Coupons Management'}</span>
                </h3>
                <p className="text-slate-600 text-xs mt-1">
                  {language === 'ar'
                    ? 'أنشئ كوبونات خصم (نسبة مئوية أو مبلغ ثابت). الكود صالح للاستخدام مرة واحدة لكل حساب وينتهي تلقائياً بعد إتمام الدفع.'
                    : 'Create discount coupons with single-use per account protection that expires after checkout.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCouponForm(!showAddCouponForm)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'ar' ? 'إنشاء كود خصم جديد' : 'New Coupon'}</span>
              </button>
            </div>

            {/* Add Coupon Form */}
            {showAddCouponForm && (
              <form onSubmit={handleSaveNewCoupon} className="p-5 rounded-2xl bg-slate-50 border border-emerald-500/30 space-y-4 text-xs font-cairo">
                <h4 className="font-bold text-sm text-slate-900">إنشاء كود خصم جديد</h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">كود الخصم (Promo Code) *</label>
                    <input
                      type="text"
                      required
                      value={newCouponCode}
                      onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                      placeholder="مثال: JOE2026"
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 uppercase font-outfit font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">نوع الخصم</label>
                    <select
                      value={newCouponType}
                      onChange={(e) => setNewCouponType(e.target.value as any)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900"
                    >
                      <option value="percentage">نسبة مئوية (%)</option>
                      <option value="fixed">مبلغ ثابت بالجنيه (ج.م)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">قيمة الخصم *</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={newCouponValue}
                      onChange={(e) => setNewCouponValue(Number(e.target.value) || 0)}
                      placeholder="مثال: 10 أو 100"
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-outfit"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">الحد الأدنى للطلب (ج.م)</label>
                    <input
                      type="number"
                      min={0}
                      value={newCouponMinOrder}
                      onChange={(e) => setNewCouponMinOrder(Number(e.target.value) || 0)}
                      placeholder="اختياري (مثال: 300)"
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-outfit"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddCouponForm(false)}
                    className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md"
                  >
                    حفظ وتفعيل الكود
                  </button>
                </div>
              </form>
            )}

            {/* Coupons List */}
            <div className="space-y-3">
              {(settings.coupons || []).length === 0 ? (
                <p className="text-slate-500 text-xs py-4 text-center">لا توجد أكواد خصم مضافة بعد.</p>
              ) : (
                (settings.coupons || []).map((cp) => (
                  <div key={cp.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-cairo">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-800 border border-emerald-500/30">
                        <Tag className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-900 text-sm font-outfit font-black tracking-wider">{cp.code}</strong>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${cp.is_active ? 'bg-emerald-500/20 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                            {cp.is_active ? 'مفعل وجاهز' : 'معطل'}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] mt-0.5">
                          الخصم: <strong className="text-emerald-700">{cp.discount_type === 'percentage' ? `${cp.discount_value}%` : `${cp.discount_value} ج.م`}</strong>
                          {cp.min_order_amount ? ` • الحد الأدنى: ${cp.min_order_amount} ج.م` : ''}
                          {cp.max_discount_amount ? ` • أقصى خصم: ${cp.max_discount_amount} ج.م` : ''}
                        </p>
                        <span className="text-slate-500 text-[10px] font-outfit mt-0.5 block">
                          تم استخدامه في {cp.used_by?.length || 0} طلب مكتمل
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleToggleCoupon(cp.code)}
                        className={`px-3 py-1.5 rounded-xl border font-bold text-[11px] transition-colors ${cp.is_active ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 hover:bg-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/20'}`}
                      >
                        {cp.is_active ? 'تعطيل مؤقت' : 'تفعيل الكود'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCoupon(cp.code)}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 border border-rose-500/20 transition-colors"
                        title="حذف كود الخصم"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 6: Shipping Rates, Governorates & Cities Management */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-700" />
                <span>{language === 'ar' ? 'إدارة أسعار الشحن، المحافظات، والمدن والمناطق' : 'Shipping Rates & Cities Manager'}</span>
              </h3>
              <p className="text-slate-600 text-xs mt-1">
                {language === 'ar'
                  ? 'تحكم في سعر التوصيل لكل محافظة وكل مدينة أو حي بالمنصورة بشكل مستقل، وأضف مناطق جديدة أو عطل مناطق معينة.'
                  : 'Manage shipping fees per governorate and specific city/neighborhood, add custom zones or toggle availability.'}
              </p>
            </div>

            {/* Select Governorate & Base Fee */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-cairo">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">اختر المحافظة لإدارتها:</label>
                <select
                  value={shippingGovId}
                  onChange={(e) => setShippingGovId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold"
                >
                  {egyptianGovernorates.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name_ar} {g.id === 'daqahlia' ? '(المنصورة ومراكزها)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  سعر الشحن الأساسي للمحافظة ({currentShippingGov.name_ar}):
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    defaultValue={
                      (settings.custom_shipping_rates || []).find(
                        (r) => r.governorate_id === shippingGovId && (!r.city_name || r.city_name === '*')
                      )?.shipping_fee ?? currentShippingGov.shipping_fee ?? 35
                    }
                    key={`gov-fee-${shippingGovId}`}
                    id={`input-gov-fee-${shippingGovId}`}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-outfit font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById(`input-gov-fee-${shippingGovId}`) as HTMLInputElement;
                      if (input) {
                        handleSetGovBaseFee(shippingGovId, Number(input.value) || 0);
                        alert(`تم تحديث سعر الشحن الأساسي لمحافظة ${currentShippingGov.name_ar} إلى ${input.value} ج.م`);
                      }
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl whitespace-nowrap cursor-pointer"
                  >
                    حفظ السعر
                  </button>
                </div>
              </div>
            </div>

            {/* Add Custom City / Neighborhood Form */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 text-xs font-cairo">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-amber-700" />
                <span>إضافة حي أو منطقة أو مدينة جديدة تحت ({currentShippingGov.name_ar})</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-semibold mb-1">اسم المنطقة / الحي بالعربي *</label>
                  <input
                    type="text"
                    value={newCityNameAr}
                    onChange={(e) => setNewCityNameAr(e.target.value)}
                    placeholder="مثال: المنصورة - حي الأشجار أو طلخا - شارع الجيش"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">سعر الشحن المخصص (ج.م) *</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={0}
                      value={newCityFee}
                      onChange={(e) => setNewCityFee(Number(e.target.value) || 0)}
                      placeholder="35"
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-outfit"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddCustomCity(shippingGovId, newCityNameAr, newCityFee)}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl whitespace-nowrap shadow-sm cursor-pointer"
                    >
                      إضافة
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Cities Table for selected governorate */}
            <div className="space-y-2 text-xs font-cairo">
              <h4 className="font-bold text-slate-900 text-xs">
                المدن والمناطق المسجلة في ({currentShippingGov.name_ar}) وأسعار توصيلها:
              </h4>

              <div className="max-h-80 overflow-y-auto rounded-2xl border border-slate-200 divide-y divide-slate-100 bg-white">
                {[
                  ...currentShippingGov.cities,
                  ...(settings.custom_cities || [])
                    .filter((c) => c.governorate_id === shippingGovId)
                    .map((c) => ({ name_ar: c.name_ar, name_en: c.name_en || c.name_ar })),
                ]
                  .filter((city, idx, arr) => arr.findIndex((c) => c.name_ar === city.name_ar) === idx)
                  .map((city) => {
                    const isDisabled = (settings.disabled_cities || []).includes(city.name_ar);
                    const cityRate = (settings.custom_shipping_rates || []).find(
                      (r) => r.governorate_id === shippingGovId && r.city_name === city.name_ar
                    );
                    const effectiveFee =
                      cityRate?.shipping_fee ??
                      (settings.custom_shipping_rates || []).find(
                        (r) => r.governorate_id === shippingGovId && (!r.city_name || r.city_name === '*')
                      )?.shipping_fee ??
                      currentShippingGov.shipping_fee ??
                      35;

                    return (
                      <div
                        key={city.name_ar}
                        className={`p-3 flex items-center justify-between gap-3 flex-wrap transition-colors ${
                          isDisabled ? 'bg-slate-100/70 opacity-60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-[180px]">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isDisabled ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                          />
                          <span className="font-bold text-slate-900">{city.name_ar}</span>
                          {cityRate && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                              سعر مخصص
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-[11px]">الشحن:</span>
                          <input
                            type="number"
                            min={0}
                            defaultValue={effectiveFee}
                            id={`city-fee-${city.name_ar}`}
                            className="w-20 bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-900 font-outfit text-center font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const input = document.getElementById(
                                `city-fee-${city.name_ar}`
                              ) as HTMLInputElement;
                              if (input) {
                                handleSetCityFee(shippingGovId, city.name_ar, Number(input.value) || 0);
                                alert(`تم تحديث سعر شحن ${city.name_ar} إلى ${input.value} ج.م`);
                              }
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold border border-slate-200 cursor-pointer"
                          >
                            تحديث
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleDisableCity(city.name_ar)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                              isDisabled
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            }`}
                          >
                            {isDisabled ? 'تفعيل' : 'تعطيل'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Section 7: Default Homepage Featured Products */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                <span>{language === 'ar' ? 'المنتجات الافتراضية المثبتة في الصفحة الرئيسية' : 'Default Homepage Featured Products'}</span>
              </h3>
              <p className="text-slate-600 text-xs mt-1">
                {language === 'ar'
                  ? 'اختر المنتجات التي ترغب في عرضها كواجهة أساسية بالصفحة الرئيسية للزوار الجدد (يمكنك أيضاً الضغط على علامة النجمة بجانب أي منتج في جدول المنتجات لتثبيته).'
                  : 'Select products that appear on the homepage for new visitors (or click the star icon in the products table).'}
              </p>
            </div>

            {/* Quick Add to Featured */}
            <div className="flex flex-col sm:flex-row gap-3 items-center text-xs font-cairo">
              <select
                id="select-add-featured"
                className="w-full sm:flex-1 bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900"
                defaultValue=""
              >
                <option value="">-- اختر منتجاً من المتجر لتثبيته في الصفحة الرئيسية --</option>
                {products
                  .filter((p) => !(settings.homepage_featured_ids || []).includes(p.id))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name_ar} - {p.price} ج.م ({p.brand || 'عام'})
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  const sel = document.getElementById('select-add-featured') as HTMLSelectElement;
                  if (sel && sel.value) {
                    handleToggleHomepageFeatured(sel.value);
                    sel.value = '';
                  }
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl shadow-sm whitespace-nowrap cursor-pointer"
              >
                + تثبيت بالرئيسية
              </button>
            </div>

            {/* List of currently pinned products */}
            <div className="space-y-2 text-xs font-cairo">
              <span className="font-semibold text-slate-700 block">
                المنتجات المثبتة حالياً ({(settings.homepage_featured_ids || []).length} منتج):
              </span>

              {(settings.homepage_featured_ids || []).length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center text-slate-500">
                  لا توجد منتجات مثبتة يدوياً حالياً، ويعتمد المتجر على الترتيب التلقائي الذكي حسب الأكثر طلباً.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {(settings.homepage_featured_ids || [])
                    .map((id) => products.find((p) => p.id === id))
                    .filter((p): p is Product => Boolean(p))
                    .map((p) => (
                      <div
                        key={p.id}
                        className="p-3 rounded-2xl bg-slate-50 border border-amber-500/30 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <img
                            src={p.images?.[0] || '/product-placeholder.svg'}
                            alt=""
                            className="w-10 h-10 object-contain rounded-lg bg-white border flex-shrink-0"
                          />
                          <div className="truncate">
                            <strong className="text-slate-900 block truncate text-xs">{p.name_ar}</strong>
                            <span className="text-amber-700 font-outfit font-bold text-[11px]">{p.price} ج.م</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleHomepageFeatured(p.id)}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-colors flex-shrink-0 cursor-pointer"
                          title="إلغاء التثبيت من الرئيسية"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: USERS & ROLES MANAGER (Promote/Demote Admins & Delete Accounts) */}
      {activeTab === 'users' && (
        <UsersTab />
      )}

      {/* MODAL 1: ADD / EDIT PRODUCT INTERACTIVE MODAL */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white border border-amber-500/40 rounded-3xl p-6 text-slate-900 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-base text-slate-900">
                {editingProduct ? 'تعديل بيانات المنتج' : 'إضافة منتج يدوي جديد'}
              </h3>
              <button
                onClick={() => setIsAddProductModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs font-cairo">
              <div>
                <label className="block text-slate-600 mb-1">اسم المنتج بالعربي *</label>
                <input
                  type="text"
                  required
                  value={prodForm.name_ar}
                  onChange={(e) => setProdForm({ ...prodForm, name_ar: e.target.value })}
                  placeholder="مثال: آيفون 13 مساحة 128 كسر زيرو"
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">اسم المنتج بالإنجليزي</label>
                <input
                  type="text"
                  value={prodForm.name_en}
                  onChange={(e) => setProdForm({ ...prodForm, name_en: e.target.value })}
                  placeholder="e.g. Apple iPhone 13 128GB Mint"
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-outfit"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">القسم</label>
                  <select
                    value={prodForm.category}
                    onChange={(e) => setProdForm({ ...prodForm, category: e.target.value as CategoryKey })}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  >
                    {currentCategories.map((cat) => (
                      <option key={cat.key} value={cat.key}>
                        {cat.name_ar} ({cat.key})
                      </option>
                    ))}
                    {!currentCategories.some((c) => c.key === prodForm.category) && prodForm.category && (
                      <option value={prodForm.category}>{prodForm.category}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">الماركة</label>
                  <input
                    type="text"
                    value={prodForm.brand}
                    onChange={(e) => setProdForm({ ...prodForm, brand: e.target.value })}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">الحالة</label>
                  <select
                    value={prodForm.condition}
                    onChange={(e) => setProdForm({ ...prodForm, condition: e.target.value as ProductCondition })}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  >
                    <option value="mint">كسر زيرو ممتاز</option>
                    <option value="brand_new">جديد متبرشم</option>
                    <option value="used_good">استعمال خفيف</option>
                    <option value="unknown">الحالة غير محددة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">نسبة البطارية %</label>
                  <input
                    type="number"
                    value={prodForm.battery_health || ''}
                    onChange={(e) => setProdForm({ ...prodForm, battery_health: Number(e.target.value) || null })}
                    placeholder="94"
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-outfit"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">السعر (ج.م) *</label>
                  <input
                    type="number"
                    required
                    value={prodForm.price ?? ''}
                    onChange={(e) => setProdForm({ ...prodForm, price: Number(e.target.value) })}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-outfit font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">السعر قبل الخصم</label>
                  <input
                    type="number"
                    value={prodForm.original_price || ''}
                    onChange={(e) => setProdForm({ ...prodForm, original_price: Number(e.target.value) })}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-outfit"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">المخزون (الكمية)</label>
                  <input
                    type="number"
                    value={prodForm.stock ?? 0}
                    onChange={(e) => setProdForm({ ...prodForm, stock: Number(e.target.value) })}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-outfit"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">شهور الضمان</label>
                  <input
                    type="number"
                    value={prodForm.warranty_months ?? 0}
                    onChange={(e) => setProdForm({ ...prodForm, warranty_months: Number(e.target.value) })}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-outfit"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">روابط الصور (رابط في كل سطر)</label>
                <textarea
                  rows={3}
                  value={prodForm.images?.join('\n') || ''}
                  onChange={(e) => setProdForm({ ...prodForm, images: e.target.value.split('\n') })}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">الوصف</label>
                <textarea
                  rows={3}
                  value={prodForm.description_ar}
                  onChange={(e) => setProdForm({ ...prodForm, description_ar: e.target.value })}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-cairo"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">المواصفات (JSON)</label>
                <textarea rows={7} value={specsInput} onChange={e => setSpecsInput(e.target.value)}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono" />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">أهم المميزات (ميزة في كل سطر)</label>
                <textarea rows={4} value={prodForm.about_item?.join('\n') || ''}
                  onChange={e => setProdForm({ ...prodForm, about_item: e.target.value.split('\n') })}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-slate-900" />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">الوصف بالإنجليزية</label>
                <textarea rows={3} value={prodForm.description_en || ''}
                  onChange={e => setProdForm({ ...prodForm, description_en: e.target.value })}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-slate-900" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-slate-600">حالة التفاصيل
                  <select value={prodForm.catalog_status || 'estimated'}
                    onChange={e => setProdForm({ ...prodForm, catalog_status: e.target.value as Product['catalog_status'] })}
                    className="w-full mt-1 bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-slate-900">
                    <option value="estimated">تقديرية / تحتاج مراجعة</option>
                    <option value="verified">مؤكدة بعد المراجعة</option>
                  </select>
                </label>
                <label className="text-slate-600 flex items-center gap-2">
                  <input type="checkbox" checked={!!prodForm.image_is_illustrative}
                    onChange={e => setProdForm({ ...prodForm, image_is_illustrative: e.target.checked })} />
                  الصور توضيحية
                </label>
              </div>
              <label className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-slate-800 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!prodForm.is_featured}
                  onChange={e => setProdForm({ ...prodForm, is_featured: e.target.checked })}
                  className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                />
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>تمييز كـ "اختيار جو ستور" (Joe Store's Choice) في صفحة المنتج</span>
                </span>
              </label>
              {productSaveError && <p role="alert" className="text-rose-700">{productSaveError}</p>}
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600"
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
          <div className="relative w-full max-w-lg bg-white border border-emerald-500/40 rounded-3xl p-6 text-slate-900 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-700" />
                <span>إرسال إشعار واتساب للطلب #{whatsappModalOrder.order_number}</span>
              </h3>
              <button
                onClick={() => setWhatsappModalOrder(null)}
                className="p-1 rounded-lg bg-slate-100 text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-cairo">
              <div>
                <label className="block text-slate-600 mb-1">رقم المستلم:</label>
                <strong className="text-slate-900 font-outfit text-sm">
                  {whatsappModalOrder.customer_whatsapp || whatsappModalOrder.customer_phone}
                </strong>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">نوع الرسالة / القالب الآلي:</label>
                <select
                  value={customMsgType}
                  onChange={(e) => setCustomMsgType(e.target.value as any)}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-slate-900"
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
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-700'
                    : 'bg-amber-500/20 border-amber-500/40 text-amber-700'
                }`}>
                  {sendWhatsAppAlert.msg}
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  onClick={() => setWhatsappModalOrder(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600"
                >
                  إغلاق
                </button>
                <button
                  onClick={handleTriggerWhatsApp}
                  disabled={isSendingWhatsApp}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-400 text-black font-extrabold flex items-center gap-1.5 shadow-md"
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
    </div></AdminShell>
  );
};
