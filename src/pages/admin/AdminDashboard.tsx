import { formatDeliveryAddress } from '../../utils/deliveryAddress';
import { normalizeProductImage, normalizeProductImages, compressImageFile } from '../../utils/imageUrl';
import { validateImageFile } from '../../utils/fileValidation';
import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { AdminShell, AdminSection, initialAdminSection } from './AdminShell';
const AdminTools = lazy(() => import('./AdminTools').then(m => ({ default: m.AdminTools })));
const ScreenFinder = lazy(() => import('./ScreenFinder').then(m => ({ default: m.ScreenFinder })));
const CoverFinder = lazy(() => import('./CoverFinder').then(m => ({ default: m.CoverFinder })));
const ReviewsModerationPanel = lazy(() => import('./ReviewsModerationPanel').then(m => ({ default: m.ReviewsModerationPanel })));
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
  FolderPlus,
  Eye,
  EyeOff
} from 'lucide-react';

function sanitizeAdminSocialLinks(input: any): Product['social_links'] | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
  const out: NonNullable<Product['social_links']> = {};
  for (const key of ['facebook', 'tiktok', 'instagram'] as const) {
    const raw = typeof input[key] === 'string' ? input[key].trim() : '';
    if (!raw) continue;
    const withScheme = /^(https?:)?\/\//i.test(raw)
      ? (raw.startsWith('//') ? `https:${raw}` : raw)
      : /^(?:www\.)?(?:facebook\.com|fb\.watch|m\.facebook\.com|tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com|instagram\.com|instagr\.am)\//i.test(raw)
        ? `https://${raw}`
        : raw;
    try {
      const u = new URL(withScheme);
      if (u.protocol === 'http:' || u.protocol === 'https:') out[key] = u.toString();
    } catch {}
  }
  return Object.keys(out).length ? out : undefined;
}
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Product, Order, OrderStatus, CategoryKey, ProductCondition, HeroSlide, CustomCategory, DiscountCoupon, CustomShippingRate, CustomCity } from '../../types';
import { egyptianGovernorates } from '../../data/governorates';
import { ExcelImportModal } from '../../components/ExcelImportModal';
import { downloadSampleExcelTemplate, exportCatalogToExcel } from '../../utils/excelParser';
import { generateWhatsAppWebLink, sendWhatsAppMessage, buildDefaultWhatsAppMessage } from '../../utils/whatsappService';
import { InventoryTab } from './InventoryTab';
import { CustomerCrmTab } from './CustomerCrmTab';
import { EmailTemplatesTab } from './EmailTemplatesTab';
import { UsersTab } from './UsersTab';
import { GuestVisitorsTab } from './GuestVisitorsTab';
import { WhatsAppCrmAdminSection } from './WhatsAppCrmAdminSection';
import { PaymentGatewaySettingsCard } from './PaymentGatewaySettingsCard';
import { MarketingAdToolsCard } from './MarketingAdToolsCard';
import { PolicyPagesEditorCard } from './PolicyPagesEditorCard';
import { InvoiceModal } from '../../components/InvoiceModal';
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
    toggleProductVisibility,
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

  const [productsSubTab, setProductsSubTab] = useState<'catalog' | 'reviews'>('catalog');
  const [pendingReviewsCount, setPendingReviewsCount] = useState(0);

  useEffect(() => {
    neonDb.getAllProductReviews({ status: 'pending', limit: 1 }).then(res => {
      if (res?.counts?.pending != null) {
        setPendingReviewsCount(res.counts.pending);
      }
    }).catch(() => {});
  }, [activeTab]);


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
  const [orderSearchInput, setOrderSearchInput] = useState<string>('');
  const [orderSearchDebounced, setOrderSearchDebounced] = useState<string>('');
  const [ordersPage, setOrdersPage] = useState<number>(1);
  const [paginatedOrders, setPaginatedOrders] = useState<Order[]>([]);
  const [ordersTotal, setOrdersTotal] = useState<number>(0);
  const [ordersTotalPages, setOrdersTotalPages] = useState<number>(1);
  const [ordersLoadingPage, setOrdersLoadingPage] = useState<boolean>(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setOrderSearchDebounced(orderSearchInput.trim());
      setOrdersPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [orderSearchInput]);

  useEffect(() => {
    setOrdersPage(1);
  }, [orderStatusFilter]);

  useEffect(() => {
    if (activeTab !== 'orders' || !canAccessSection('orders')) return;
    let cancelled = false;
    setOrdersLoadingPage(true);
    neonDb
      .getOrdersPaginated({
        page: ordersPage,
        limit: 50,
        status: orderStatusFilter,
        search: orderSearchDebounced
      })
      .then((res) => {
        if (cancelled) return;
        setPaginatedOrders(res.orders || []);
        setOrdersTotal(Number(res.total || 0));
        setOrdersTotalPages(Math.max(1, Number(res.pages || 1)));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setOrdersLoadingPage(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, ordersPage, orderStatusFilter, orderSearchDebounced, orders.length]);
  const [productSearch, setProductSearch] = useState('');
  const [productCatFilter, setProductCatFilter] = useState<string>('all');

  // Manual WhatsApp Send Modal
  const [whatsappModalOrder, setWhatsappModalOrder] = useState<Order | null>(null);
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<Order | null>(null);
  const [customMsgType, setCustomMsgType] = useState<'order_confirmed' | 'payment_verified' | 'shipped' | 'out_for_delivery' | 'delivered' | 'review_request'>('shipped');
  const [courierInput, setCourierInput] = useState('مندوب جو ستور');
  const [trackingInput, setTrackingInput] = useState('');
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [sendWhatsAppAlert, setSendWhatsAppAlert] = useState<{ success: boolean; msg: string } | null>(null);
  const [editableWhatsAppText, setEditableWhatsAppText] = useState<string>('');

  useEffect(() => {
    if (whatsappModalOrder) {
      const defaultText = buildDefaultWhatsAppMessage(
        customMsgType,
        whatsappModalOrder,
        settings,
        courierInput || whatsappModalOrder.courier_name,
        trackingInput || whatsappModalOrder.tracking_number
      );
      setEditableWhatsAppText(defaultText);
    }
  }, [whatsappModalOrder, customMsgType]);

  // Hero Slide Customization State
  const [showSlideForm, setShowSlideForm] = useState(false);
  const [selectedBannerProduct, setSelectedBannerProduct] = useState<Product | null>(null);
  const [bannerProductSearch, setBannerProductSearch] = useState<string>('');
  const [isBannerSearchOpen, setIsBannerSearchOpen] = useState<boolean>(false);
  const [newSlide, setNewSlide] = useState<Partial<HeroSlide>>({
    slide_type: 'banner',
    badge: 'جديد وحصري 🔥',
    title_ar: '',
    title_en: '',
    subtitle_ar: '',
    subtitle_en: '',
    price: '',
    oldPrice: '',
    tag: 'متوفر بالمحل',
    image: '',
    cat: 'chargers_cables',
    linked_product_id: '',
    product_id: '',
    link_type: 'search',
    link_target: 'HUNTER'
  });

  const filteredBannerProducts = useMemo(() => {
    if (!bannerProductSearch.trim()) return products.slice(0, 20);
    const q = bannerProductSearch.toLowerCase().trim();
    return products.filter(p =>
      p.name_ar.toLowerCase().includes(q) ||
      (p.name_en && p.name_en.toLowerCase().includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.model_name && p.model_name.toLowerCase().includes(q))
    ).slice(0, 30);
  }, [products, bannerProductSearch]);

  const handleAddSlide = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlide.title_ar || !newSlide.image) return;
    const slideItem: HeroSlide = {
      id: `slide-${Date.now()}`,
      slide_type: newSlide.slide_type || 'banner',
      badge: newSlide.badge || '',
      title_ar: newSlide.title_ar,
      title_en: newSlide.title_en || newSlide.title_ar,
      subtitle_ar: newSlide.subtitle_ar || '',
      subtitle_en: newSlide.subtitle_en || '',
      price: newSlide.price || '',
      oldPrice: newSlide.oldPrice || '',
      tag: newSlide.tag || '',
      image: newSlide.image,
      cat: (newSlide.cat as CategoryKey) || 'chargers_cables',
      linked_product_id: newSlide.linked_product_id || newSlide.product_id || selectedBannerProduct?.id,
      product_id: newSlide.product_id || newSlide.linked_product_id || selectedBannerProduct?.id,
      link_type: newSlide.link_type || 'search',
      link_target: newSlide.link_target || ''
    };
    const currentSlides = settings.hero_slides || [];
    updateSettings({ hero_slides: [...currentSlides, slideItem] });
    setShowSlideForm(false);
    setSelectedBannerProduct(null);
    setBannerProductSearch('');
    setIsBannerSearchOpen(false);
    setNewSlide({
      slide_type: 'banner',
      badge: 'جديد وحصري 🔥',
      title_ar: '',
      title_en: '',
      subtitle_ar: '',
      subtitle_en: '',
      price: '',
      oldPrice: '',
      tag: 'متوفر بالمحل',
      image: '',
      cat: 'chargers_cables',
      linked_product_id: '',
      product_id: '',
      link_type: 'search',
      link_target: 'HUNTER'
    });
  };

  const handleDeleteSlide = (id: string) => {
    const currentSlides = settings.hero_slides || [];
    updateSettings({ hero_slides: currentSlides.filter(s => s.id !== id) });
  };

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

  // Helper for reading files directly from laptop to Base64 Data URL with type & size guards
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, callback: (base64Url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const check = validateImageFile(file);
    if (!check.valid) {
      alert(check.error);
      e.target.value = '';
      return;
    }
    try {
      const compressed = await compressImageFile(file, 1400, 0.84);
      callback(compressed);
    } catch {
      alert('تعذر قراءة أو ضغط ملف الصورة.');
    } finally {
      e.target.value = '';
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
    { key: 'iphones', name_ar: 'هواتف آيفون', name_en: 'iPhones', image: '/product-images/cat-iphone-16pm.jpg' },
    { key: 'feature_phones', name_ar: 'هواتف زراير', name_en: 'Feature Phones', image: '/product-images/cat-feature-phone-nokia.jpg' },
    { key: 'chargers', name_ar: 'شواحن جدارية وسريعة', name_en: 'Fast Wall Chargers', image: '/product-images/onmust-zolo-30w-studio.jpg' },
    { key: 'cables', name_ar: 'كابلات الشحن والداتا', name_en: 'Charging Cables', image: '/product-images/4eb8c59128f84c84a66cd390.webp' },
    { key: 'car_chargers', name_ar: 'شواحن سيارات', name_en: 'Car Chargers', image: '/product-images/b5e6d3bea2ecc40b6fd50a29.webp' },
    { key: 'wireless_chargers', name_ar: 'شواحن لاسلكية MagSafe', name_en: 'Wireless Chargers', image: '/product-images/cat-wireless-charger.jpg' },
    { key: 'headsets', name_ar: 'سماعات هيدسيت وإيربودز', name_en: 'Headsets & Earbuds', image: '/product-images/3c06d2c8e8216b7d3f06254a.webp' },
    { key: 'headphones', name_ar: 'سماعات هيدفون', name_en: 'Headphones', image: '/product-images/f6427a20c128ea77c56bc426.webp' },
    { key: 'smartwatches', name_ar: 'ساعات ذكية', name_en: 'Smartwatches', image: '/product-images/cat-apple-watch-ultra.jpg' },
    { key: 'powerbanks', name_ar: 'باور بانك', name_en: 'Power Banks', image: '/product-images/15c3630cb4bb430b367edd7f.webp' },
    { key: 'cases_protection', name_ar: 'كفرات وحماية', name_en: 'Cases & Covers', image: '/product-images/case-xinreeu-frosted-orange-ip17promax.jpg' },
    { key: 'screen_protectors', name_ar: 'اسكرينات وحماية العدسات', name_en: 'Screen & Lens Guards', image: '/product-images/a792cefeb7c50327e00a5792.png' },
    { key: 'smart_rings', name_ar: 'خواتم التسبيح الذكية', name_en: 'Smart Tasbih Rings', image: '/product-images/tasbih-beiqi-s7pro-studio.png' },
    { key: 'holders_stands', name_ar: 'حوامل وترايبود', name_en: 'Holders & Stands', image: '/product-images/1eb83468cd59fda0e5a9ca9a.webp' },
    { key: 'straps_bands', name_ar: 'أساور وحماية الساعات', name_en: 'Watch Straps & Bumpers', image: '/product-images/strap-alpine-loop-titanium-ghook-4colors.jpg' },
    { key: 'photography_mics', name_ar: 'مايكات ومعدات تصوير', name_en: 'Mics & Gimbals', image: '/product-images/m1-gimbal-stabilizer-studio.png' },
    { key: 'trackers', name_ar: 'أجهزة تتبع ذكية', name_en: 'Smart Trackers', image: '/product-images/world-tag-apple-findmy-studio.jpg' },
    { key: 'car_accessories', name_ar: 'مستلزمات وطوارئ السيارات', name_en: 'Car Accessories', image: '/product-images/earldom-js02-studio.png' },
    { key: 'speakers', name_ar: 'مكبرات صوت سبيكر', name_en: 'Bluetooth Speakers', image: '/product-images/3af3d5bd2ec35679a678251e.webp' },
    { key: 'adapters', name_ar: 'محولات ووصلات OTG', name_en: 'Adapters & Hubs', image: '/product-images/4312cb7f98e9ef14a712461d.webp' },
    { key: 'printers', name_ar: 'طابعات محمولة', name_en: 'Portable Printers', image: '/product-images/fb-mini-thermal-printer-1.jpg' },
    { key: 'gaming', name_ar: 'أجهزة وأكسسوارات الألعاب', name_en: 'Gaming Consoles & Gear', image: '/product-images/fb-r36s-retro-console-1.jpg' },
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
    is_active: true,
    social_links: { facebook: '', tiktok: '', instagram: '' },
    images: ['/product-placeholder.svg'],
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
      is_active: true,
      social_links: { facebook: '', tiktok: '', instagram: '' },
      images: ['/product-placeholder.svg'],
      description_ar: 'جهاز كسر زيرو خالي من الخدوش مع ضمان معتمد من متجر جو ستور.',
    });
    setIsAddProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    if (!canAccessSection('products')) return;
    setEditingProduct(prod);
    setProdForm({
      ...prod,
      is_featured: !!prod.is_featured,
      is_active: prod.is_active !== false,
      social_links: {
        facebook: prod.social_links?.facebook || '',
        tiktok: prod.social_links?.tiktok || '',
        instagram: prod.social_links?.instagram || '',
      },
      images: normalizeProductImages(prod.images)
    });
    setSpecsInput(JSON.stringify(prod.specs || {}, null, 2));
    setProductSaveError('');
    setIsAddProductModalOpen(true);
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const newImages: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const check = validateImageFile(file);
        if (!check.valid) {
          setProductSaveError(check.error || 'ملف صورة غير مدعوم.');
          continue;
        }
        const compressed = await compressImageFile(file, 1200, 0.85);
        if (compressed) {
          newImages.push(compressed);
        }
      }
      if (newImages.length > 0) {
        setProdForm(prev => ({
          ...prev,
          images: [...(prev.images || []).filter(Boolean), ...newImages]
        }));
      }
    } catch (err: any) {
      setProductSaveError(err.message || 'حدث خطأ أثناء قراءة الصور من الجهاز');
    } finally {
      e.target.value = '';
    }
  };

  const handleSetPrimaryImage = (indexToMakePrimary: number) => {
    setProdForm(prev => {
      const current = [...(prev.images || []).filter(Boolean)];
      if (indexToMakePrimary < 0 || indexToMakePrimary >= current.length) return prev;
      const [selected] = current.splice(indexToMakePrimary, 1);
      return {
        ...prev,
        images: [selected, ...current]
      };
    });
  };

  const handleRemoveProductImage = (indexToRemove: number) => {
    setProdForm(prev => {
      const current = [...(prev.images || []).filter(Boolean)];
      current.splice(indexToRemove, 1);
      return {
        ...prev,
        images: current
      };
    });
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
    const cleanedImages = normalizeProductImages(prodForm.images);
    const cleanedSocial = sanitizeAdminSocialLinks(prodForm.social_links);
    const isActive = prodForm.is_active !== false;
    const saved = { ...prodForm,
      images: cleanedImages,
      recorded_images: cleanedImages,
      specs, quick_specs: specs,
      social_links: cleanedSocial ?? {},
      is_active: isActive,
      is_featured: !!prodForm.is_featured,
      in_stock: (prodForm.stock ?? 0) > 0 && (prodForm.price ?? 0) > 0 && isActive };

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
      const res = await manualSendWhatsAppNotification(whatsappModalOrder, customMsgType, editableWhatsAppText);
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

  // Filtered orders list (prefers server-paginated results when loaded)
  const fallbackFilteredOrders = orders.filter(o => {
    if (orderStatusFilter !== 'all' && o.order_status !== orderStatusFilter) return false;
    if (orderSearchDebounced) {
      const q = orderSearchDebounced.toLowerCase();
      return `${o.order_number} ${o.customer_name} ${o.customer_phone} ${o.customer_email || ''}`.toLowerCase().includes(q);
    }
    return true;
  });
  const filteredOrders = paginatedOrders.length > 0 || ordersLoadingPage || ordersTotal > 0 ? paginatedOrders : fallbackFilteredOrders;

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
              منطقة إدارية مقيدة
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
          {/* Sub-tab Switcher: Catalog vs Reviews */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-200/70 rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setProductsSubTab('catalog')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                productsSubTab === 'catalog'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-4 h-4 text-amber-600" />
              <span>إدارة المنتجات والكتالوج</span>
            </button>

            <button
              type="button"
              onClick={() => setProductsSubTab('reviews')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                productsSubTab === 'reviews'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
              <span>مراجعة تقييمات العملاء</span>
              {pendingReviewsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500 text-black font-black">
                  {pendingReviewsCount} جديد
                </span>
              )}
            </button>
          </div>

          {productsSubTab === 'reviews' ? (
            <Suspense fallback={<div className="p-12 text-center text-xs text-slate-500 font-bold">جاري تحميل لوحة التقييمات...</div>}>
              <ReviewsModerationPanel
                onNavigateToProduct={(prodId) => {
                  navigate('product', prodId);
                }}
              />
            </Suspense>
          ) : (
            <>
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
                {defaultCategoriesList.map((c) => (
                  <option key={c.key} value={c.key}>{c.name_ar}</option>
                ))}
                <option value="printers">طابعات محمولة وملحقاتها</option>
                <option value="gaming">أجهزة وإكسسوارات الألعاب</option>
                <option value="accessories">إكسسوارات متنوعة</option>
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
                  {filteredProducts.map((p) => {
                    const isHidden = p.is_active === false;
                    const cleanedSocial = sanitizeAdminSocialLinks(p.social_links);
                    const socialEntries = cleanedSocial
                      ? (['facebook', 'tiktok', 'instagram'] as const)
                          .filter(k => Boolean(cleanedSocial[k]))
                          .map(k => ({ platform: k, url: cleanedSocial[k]! }))
                      : [];
                    return (
                    <tr key={p.id} className={`hover:bg-slate-100 transition-colors ${isHidden ? 'opacity-65 bg-slate-50/70' : ''}`}>
                      <td className="p-3.5 flex items-center gap-3">
                        <img
                          src={p.images[0]}
                          alt=""
                          className="w-10 h-10 rounded-xl object-cover bg-slate-100 border border-slate-200 flex-shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button type="button" onClick={() => showProductInfo(p)} className="detail-info-button text-start font-bold text-slate-900 block line-clamp-1">{p.name_ar}</button>
                            {isHidden && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 text-[9px] font-bold">مخفي</span>
                            )}
                            {socialEntries.map(({ platform, url }) => (
                              <a
                                key={platform}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`رابط ${platform}`}
                                className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 text-[9px] font-bold uppercase font-outfit"
                              >
                                {platform === 'facebook' ? 'FB' : platform === 'tiktok' ? 'TT' : 'IG'}
                              </a>
                            ))}
                          </div>
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
                            {p.battery_health}%
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
                          {/* Show / Hide visibility toggle */}
                          <button
                            type="button"
                            onClick={() => toggleProductVisibility(p.id, isHidden)}
                            className={`p-1.5 rounded-lg transition-colors border ${
                              !isHidden
                                ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 border-emerald-500/30'
                                : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 border-amber-500/30'
                            }`}
                            title={!isHidden ? 'ظاهر في المتجر (انقر لإخفاء المنتج عن العملاء)' : 'مخفي عن العملاء (انقر لإظهار المنتج)'}
                          >
                            {!isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>

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
                  );})}
                </tbody>
              </table>
            </div>
          </div>
            </>
          )}
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

      {/* TAB 4: ORDERS & SALES MANAGER (WhatsApp Automated Status Triggers + Server Pagination) */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Order Status Filter & Search */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200">
            <div className="flex items-center gap-2 flex-wrap">
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

            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={orderSearchInput}
                  onChange={(e) => setOrderSearchInput(e.target.value)}
                  placeholder="بحث برقم الطلب أو هاتف العميل..."
                  className="bg-slate-50 border border-slate-200 rounded-xl pr-8 pl-3 py-1.5 text-xs text-slate-900 w-56 focus:outline-none focus:border-amber-400"
                />
              </div>
              <span className="text-xs text-slate-600 font-outfit">
                {ordersTotal || filteredOrders.length} طلبات
              </span>
            </div>
          </div>

          {ordersTotalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs">
              <button
                type="button"
                disabled={ordersPage <= 1 || ordersLoadingPage}
                onClick={() => setOrdersPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold disabled:opacity-40"
              >
                الصفحة السابقة
              </button>
              <span className="font-bold text-slate-700">
                صفحة {ordersPage} من {ordersTotalPages}
              </span>
              <button
                type="button"
                disabled={ordersPage >= ordersTotalPages || ordersLoadingPage}
                onClick={() => setOrdersPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold disabled:opacity-40"
              >
                الصفحة التالية
              </button>
            </div>
          )}

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
                            <span>موقع GPS</span>
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
                          تأكيد الدفع
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
                          تسليم للشحن
                        </button>
                      )}

                      {/* Out for delivery */}
                      {ord.order_status === 'shipped' && (
                        <button
                          onClick={() => updateOrderStatus(ord.id, 'out_for_delivery')}
                          className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 border border-amber-500/30 text-xs font-bold transition-all"
                        >
                          خروج للتسليم
                        </button>
                      )}

                      {/* Delivered */}
                      {ord.order_status !== 'delivered' && (
                        <button
                          onClick={() => updateOrderStatus(ord.id, 'delivered')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 border border-emerald-500/30 text-xs font-bold transition-all"
                        >
                          تم التسليم بنجاح
                        </button>
                      )}

                      {/* Review Request */}
                      {ord.order_status === 'delivered' && (
                        <button
                          onClick={() => manualSendWhatsAppNotification(ord, 'review_request')}
                          className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span>إرسال طلب تقييم واتساب</span>
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
                          <span>إلغاء الطلب واسترجاع المخزن</span>
                        </button>
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-700 border border-rose-500/30 text-xs font-bold">
                          تم إلغاء الطلب واسترجاع القطع للمخزن ↺
                        </span>
                      )}
                    </div>

                    {/* Direct WhatsApp Message & E-Invoice Modal Triggers */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setInvoiceModalOrder(ord)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold text-xs flex items-center gap-1.5 transition-all"
                      >
                        <span>الفاتورة الإلكترونية (QR)</span>
                      </button>

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
        <CustomerCrmTab onNavigateSection={setActiveTab} />
      )}

      {activeTab === 'guests' && (
        <GuestVisitorsTab onNavigateSection={setActiveTab} />
      )}

      {/* TAB 6: EMAIL TEMPLATES & OTP CUSTOMIZATION STUDIO */}
      {activeTab === 'emails' && (
        <EmailTemplatesTab />
      )}

      {/* TAB 7: WHATSAPP AUTOMATION HUB */}
      {activeTab === 'whatsapp' && (
        <WhatsAppCrmAdminSection />
      )}

      {/* TAB 5: STORE SETTINGS */}
      {activeTab === 'settings' && (
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Gateway, Meta Marketing & Policy Pages Cards */}
          <PaymentGatewaySettingsCard />
          <MarketingAdToolsCard settings={settings} updateSettings={updateSettings} />
          <PolicyPagesEditorCard settings={settings} updateSettings={updateSettings} />

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

              <div>
                <label className="block text-slate-600 mb-1">{language === 'ar' ? 'رقم السجل التجاري (للفواتير الإلكترونية والفوتر):' : 'Commercial Register:'}</label>
                <input
                  type="text"
                  dir="ltr"
                  value={settings.commercial_register || ''}
                  onChange={(e) => updateSettings({ commercial_register: e.target.value })}
                  placeholder="مثال: 123456"
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">{language === 'ar' ? 'رقم البطاقة الضريبية (Tax ID):' : 'Tax Registration ID:'}</label>
                <input
                  type="text"
                  dir="ltr"
                  value={settings.tax_id || ''}
                  onChange={(e) => updateSettings({ tax_id: e.target.value })}
                  placeholder="مثال: 123-456-789"
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">{language === 'ar' ? 'نسبة ضريبة القيمة المضافة % (0 = بدون تفصيل ضريبي):' : 'VAT Rate (%):'}</label>
                <input
                  type="number"
                  min={0}
                  max={25}
                  value={settings.vat_rate ?? 0}
                  onChange={(e) => updateSettings({ vat_rate: Number(e.target.value) })}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-outfit"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">{language === 'ar' ? 'بريد مسؤول حماية البيانات / البلاغات (DPO):' : 'DPO Contact Email:'}</label>
                <input
                  type="email"
                  dir="ltr"
                  value={settings.dpo_contact_email || ''}
                  onChange={(e) => updateSettings({ dpo_contact_email: e.target.value })}
                  placeholder="privacy@joestore.com"
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-mono"
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
                    ? 'يمكنك تعديل رابط التيك توك هنا في أي وقت وسيتم تحديثه تلقائياً في الفوتر وكافة أزرار التواصل بالموقع.'
                    : 'Modify your TikTok link here anytime; it updates automatically across all footer links.'}
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-amber-500/20 pb-3 gap-2">
                  <h4 className="font-bold text-amber-700 text-sm">
                    {language === 'ar' ? 'إضافة بانر أو شريحة جديدة للواجهة الرئيسية' : 'Add New Hero Banner / Slide'}
                  </h4>

                  {/* Slide Type Switcher */}
                  <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl shadow-xs">
                    <button
                      type="button"
                      onClick={() => setNewSlide(prev => ({ ...prev, slide_type: 'banner' }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        newSlide.slide_type === 'banner'
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'صورة بانر دعائي مخصص (كامل العرض)' : 'Full Promotional Banner'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewSlide(prev => ({ ...prev, slide_type: 'product' }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        newSlide.slide_type === 'product'
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'عرض منتج تفصيلي (سعر ومواصفات)' : 'Single Product Slide'}</span>
                    </button>
                  </div>
                </div>

                {newSlide.slide_type === 'banner' ? (
                  /* =======================================================
                     FULL PROMOTIONAL BANNER CONFIGURATION
                     ======================================================= */
                  <div className="space-y-4">
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 text-slate-700 space-y-1">
                      <span className="font-bold text-amber-900 block flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        {language === 'ar' ? 'بانر دعائي مخصص بصورة جاهزة:' : 'Full Promotional Banner Image:'}
                      </span>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {language === 'ar'
                          ? 'يمكنك رفع تصميم إعلاني كامل (مثل بانر سلسلة شواحن هنتر أو عروض الكفرات) وتحديد إلى أين ينتقل العميل عند الضغط على الصورة (ماركة، قسم، أو منتج).'
                          : 'Upload a ready promotional design banner and configure where customers are redirected upon clicking.'}
                      </p>
                    </div>

                    {/* Banner Image Upload & URL */}
                    <div className="space-y-1.5">
                      <label className="block text-slate-700 font-bold mb-1">
                        {language === 'ar' ? 'صورة البانر (رفع من اللاب توب أو لصق رابط) *:' : 'Banner Image *:'}
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2.5 items-center">
                        <input
                          type="text"
                          required
                          value={newSlide.image}
                          onChange={(e) => setNewSlide({ ...newSlide, image: e.target.value })}
                          placeholder={language === 'ar' ? 'مثال: /product-images/banner-hunter-charging-series.jpg' : 'Paste image URL or upload'}
                          className="flex-1 w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-mono text-xs"
                        />
                        <label className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-all whitespace-nowrap self-stretch sm:self-auto justify-center">
                          <Upload className="w-4 h-4 text-amber-400" />
                          <span>رفع صورة البانر من اللاب توب</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, (url) => setNewSlide(prev => ({ ...prev, image: url })))}
                          />
                        </label>
                      </div>

                      {/* Quick Banner Presets from store inventory */}
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <span className="text-[11px] text-slate-500 font-semibold">بانرات جاهزة مقترحة:</span>
                        <button
                          type="button"
                          onClick={() => setNewSlide(prev => ({
                            ...prev,
                            image: '/product-images/banner-hunter-charging-series.jpg',
                            title_ar: 'سلسلة شواحن هنتر الأصلية HUNTER Series',
                            link_type: 'search',
                            link_target: 'HUNTER',
                            badge: 'جديد وحصري 🔥'
                          }))}
                          className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-[11px] font-bold border border-amber-300 transition-colors"
                        >
                          بانر سلسلة شواحن HUNTER
                        </button>
                      </div>

                      {newSlide.image && (
                        <div className="p-3 bg-white rounded-xl border border-slate-200 mt-2 space-y-1.5">
                          <span className="text-[11px] text-emerald-700 font-bold block">معاينة صورة البانر المرفوعة ✓</span>
                          <img
                            src={newSlide.image}
                            alt=""
                            className="w-full max-h-48 object-contain rounded-lg bg-slate-900 border"
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 mb-1">
                          {language === 'ar' ? 'اسم الحملة الإعلانية / العنوان (عربي) *:' : 'Banner Title (AR) *:'}
                        </label>
                        <input
                          type="text"
                          required
                          value={newSlide.title_ar}
                          onChange={(e) => setNewSlide({ ...newSlide, title_ar: e.target.value })}
                          placeholder="مثال: سلسلة شواحن هنتر الأصلية HUNTER"
                          className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 mb-1">
                          {language === 'ar' ? 'نص الشارة العلوية (Badge):' : 'Badge Tag:'}
                        </label>
                        <input
                          type="text"
                          value={newSlide.badge}
                          onChange={(e) => setNewSlide({ ...newSlide, badge: e.target.value })}
                          placeholder="مثال: جديد وحصري 🔥 أو عرض خاص"
                          className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900"
                        />
                      </div>
                    </div>

                    {/* Banner Click Action (Destination) */}
                    <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-300 space-y-3">
                      <label className="block text-slate-900 font-bold text-xs flex items-center gap-1.5">
                        <ExternalLink className="w-4 h-4 text-amber-600" />
                        <span>{language === 'ar' ? 'عندما يضغط العميل على البانر ينقله إلى:' : 'When customer clicks banner, redirect to:'}</span>
                      </label>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: 'search', label: 'بحث عن ماركة / اسم', desc: 'مثل HUNTER أو Apple' },
                          { id: 'category', label: 'قسم كامل بالمتجر', desc: 'مثل الشواحن أو الكفرات' },
                          { id: 'product', label: 'صفحة منتج محدد', desc: 'اختيار منتج معين' },
                          { id: 'url', label: 'رابط مخصص', desc: 'رابط صفحة أو خارجي' },
                        ].map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setNewSlide(prev => ({ ...prev, link_type: opt.id as any }))}
                            className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                              (newSlide.link_type || 'search') === opt.id
                                ? 'bg-amber-500/15 border-amber-500 font-bold text-amber-900 ring-1 ring-amber-400'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <span className="block text-xs">{opt.label}</span>
                            <span className="block text-[10px] text-slate-500 mt-0.5">{opt.desc}</span>
                          </button>
                        ))}
                      </div>

                      {/* Destination Target Input based on link_type */}
                      {(newSlide.link_type === 'search' || !newSlide.link_type || newSlide.link_type === 'brand') && (
                        <div className="space-y-1.5">
                          <label className="block text-slate-600">
                            {language === 'ar' ? 'كلمة البحث أو اسم الماركة (ينقل العميل لنتائج البحث عنها):' : 'Brand or search keyword:'}
                          </label>
                          <input
                            type="text"
                            value={newSlide.link_target || ''}
                            onChange={(e) => setNewSlide({ ...newSlide, link_target: e.target.value })}
                            placeholder="مثال: HUNTER أو BMW أو كفر"
                            className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold"
                          />
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            <span className="text-[10px] text-slate-500">اختصارات سريعة:</span>
                            {['HUNTER', 'BMW', 'Apple', 'Anker', 'Oraimo', 'Lito'].map(b => (
                              <button
                                key={b}
                                type="button"
                                onClick={() => setNewSlide(prev => ({ ...prev, link_target: b }))}
                                className="px-2 py-0.5 rounded bg-white border border-slate-200 hover:border-amber-400 text-[10px] text-slate-700 font-bold"
                              >
                                {b}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {newSlide.link_type === 'category' && (
                        <div className="space-y-1.5">
                          <label className="block text-slate-600">
                            {language === 'ar' ? 'اختر القسم الذي ينقل العميل إليه:' : 'Select Category:'}
                          </label>
                          <select
                            value={newSlide.link_target || newSlide.cat || 'chargers_cables'}
                            onChange={(e) => setNewSlide({ ...newSlide, link_target: e.target.value, cat: e.target.value as CategoryKey })}
                            className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold"
                          >
                            {currentCategories.map(cat => (
                              <option key={cat.key} value={cat.key}>
                                {cat.name_ar} ({cat.key})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {newSlide.link_type === 'product' && (
                        <div className="space-y-1.5">
                          <label className="block text-slate-600">
                            {language === 'ar' ? 'اختر المنتج من القائمة:' : 'Select Product:'}
                          </label>
                          <select
                            value={newSlide.link_target || newSlide.product_id || ''}
                            onChange={(e) => {
                              const p = products.find(prod => prod.id === e.target.value);
                              setNewSlide({
                                ...newSlide,
                                link_target: e.target.value,
                                product_id: e.target.value,
                                linked_product_id: e.target.value,
                                title_ar: newSlide.title_ar || p?.name_ar || ''
                              });
                            }}
                            className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900"
                          >
                            <option value="">-- اختر المنتج المرتبط --</option>
                            {products.slice(0, 100).map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name_ar} ({p.price} ج.م)
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {newSlide.link_type === 'url' && (
                        <div className="space-y-1.5">
                          <label className="block text-slate-600">
                            {language === 'ar' ? 'الرابط المخصص:' : 'Custom URL:'}
                          </label>
                          <input
                            type="text"
                            value={newSlide.link_target || ''}
                            onChange={(e) => setNewSlide({ ...newSlide, link_target: e.target.value })}
                            placeholder="https://... أو /catalog"
                            className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-mono text-xs"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* =======================================================
                     SINGLE PRODUCT SLIDE CONFIGURATION
                     ======================================================= */
                  <>
                    {/* Instant Store Product Picker - Auto Fill Banner Details */}
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                      <label className="block text-slate-800 font-bold text-xs flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>{language === 'ar' ? 'بحث واختيار منتج من المتجر لتعبئة بيانات البانر:' : 'Search & pick product to auto-fill banner:'}</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          ({products.length} {language === 'ar' ? 'منتج متاح' : 'products'})
                        </span>
                      </label>

                      <div className="relative">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder={language === 'ar' ? 'ابحث باسم المنتج أو الموديل أو الماركة (مثال: شاحن، آيفون، 1006)...' : 'Search by name, model, brand...'}
                            value={bannerProductSearch}
                            onChange={(e) => {
                              setBannerProductSearch(e.target.value);
                              setIsBannerSearchOpen(true);
                            }}
                            onFocus={() => setIsBannerSearchOpen(true)}
                            className="w-full bg-white border border-amber-500/40 focus:border-amber-600 rounded-xl px-4 py-2.5 text-xs text-slate-900 pr-9 focus:outline-none focus:ring-2 focus:ring-amber-500/30 font-cairo shadow-inner"
                          />
                          <Search className="w-4 h-4 text-amber-600 absolute right-3 top-2.5 pointer-events-none" />
                          {bannerProductSearch && (
                            <button
                              type="button"
                              onClick={() => {
                                setBannerProductSearch('');
                                setSelectedBannerProduct(null);
                              }}
                              className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {isBannerSearchOpen && (
                          <div className="absolute z-30 mt-1.5 w-full bg-white border border-slate-300 rounded-2xl shadow-2xl max-h-60 overflow-y-auto p-1.5 space-y-1">
                            <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 text-[11px] text-slate-500 font-bold">
                              <span>{language === 'ar' ? `نتائج البحث (${filteredBannerProducts.length})` : `Results (${filteredBannerProducts.length})`}</span>
                              <button
                                type="button"
                                onClick={() => setIsBannerSearchOpen(false)}
                                className="text-amber-700 hover:underline"
                              >
                                {language === 'ar' ? 'إغلاق' : 'Close'}
                              </button>
                            </div>
                            {filteredBannerProducts.length === 0 ? (
                              <div className="p-3 text-center text-slate-500 text-xs">
                                {language === 'ar' ? `لا يوجد منتج يطابق بحثك "${bannerProductSearch}"` : 'No matching products'}
                              </div>
                            ) : (
                              filteredBannerProducts.map(prod => (
                                <button
                                  key={prod.id}
                                  type="button"
                                  onClick={() => {
                                    setNewSlide({
                                      ...newSlide,
                                      slide_type: 'product',
                                      title_ar: prod.name_ar,
                                      title_en: prod.name_en || prod.name_ar,
                                      price: String(prod.price),
                                      oldPrice: prod.original_price ? String(prod.original_price) : String(Math.round(prod.price * 1.2)),
                                      cat: prod.category || 'smartphones',
                                      badge: 'الأكثر طلباً ⚡',
                                      subtitle_ar: prod.description_ar ? prod.description_ar.slice(0, 110) : `متوفر الآن بحالة ${prod.condition === 'mint' ? 'كسر زيرو ممتاز' : 'جديد'} مع ضمان جو ستور المعتمد`,
                                      image: prod.images?.[0] || '/product-placeholder.svg',
                                      linked_product_id: prod.id,
                                      product_id: prod.id,
                                      link_type: 'product',
                                      link_target: prod.id
                                    });
                                    setSelectedBannerProduct(prod);
                                    setBannerProductSearch(prod.name_ar);
                                    setIsBannerSearchOpen(false);
                                  }}
                                  className="w-full text-right p-2 rounded-xl hover:bg-amber-500/10 flex items-center gap-3 transition-colors text-xs cursor-pointer border border-transparent hover:border-amber-200"
                                >
                                  <img
                                    src={prod.images?.[0] || '/product-placeholder.svg'}
                                    alt={prod.name_ar}
                                    className="w-10 h-10 object-contain rounded-lg border border-slate-200 bg-white flex-shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <strong className="block text-slate-900 truncate font-cairo">{prod.name_ar}</strong>
                                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-outfit">
                                      <span className="text-amber-700 font-bold">{prod.price} ج.م</span>
                                      <span>•</span>
                                      <span>{prod.brand || 'عام'}</span>
                                      <span>•</span>
                                      <span>كود: {prod.sku || prod.id}</span>
                                    </div>
                                  </div>
                                  <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md flex-shrink-0">
                                    اختيار
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {selectedBannerProduct && (
                        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                            <span className="text-emerald-900 font-bold text-xs">
                              تم ربط البانر بالمنتج: {selectedBannerProduct.name_ar}
                            </span>
                          </div>
                          <span className="text-emerald-700 font-bold text-xs">
                            {selectedBannerProduct.price} ج.م
                          </span>
                        </div>
                      )}

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
                        <label className="block text-slate-600 mb-1">{language === 'ar' ? 'صورة المنتج المعروض *:' : 'Product Image *:'}</label>
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
                            <span className="text-[11px] text-emerald-700 font-bold">معاينة الصورة ✓</span>
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
                  </>
                )}

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
              {(settings.hero_slides || []).map((slide) => (
                <div key={slide.id} className="p-4 rounded-2xl bg-slate-100 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-cairo">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <img
                      src={slide.image}
                      alt=""
                      className="w-20 h-14 rounded-xl object-cover bg-slate-950 border border-slate-300 flex-shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          slide.slide_type === 'banner'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {slide.slide_type === 'banner' ? 'بانر دعائي كامل' : 'منتج فردي'}
                        </span>
                        {slide.badge && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 text-[10px] font-bold">
                            {slide.badge}
                          </span>
                        )}
                        <strong className="text-slate-900 text-sm">{language === 'ar' ? slide.title_ar : slide.title_en}</strong>
                      </div>
                      {slide.subtitle_ar && (
                        <p className="text-slate-600 text-[11px] mt-1 max-w-md line-clamp-1">
                          {language === 'ar' ? slide.subtitle_ar : slide.subtitle_en}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {slide.link_type && (
                          <span className="text-[11px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                            {slide.link_type === 'search' && `يوجه لبحث: "${slide.link_target}"`}
                            {slide.link_type === 'brand' && `يوجه لماركة: "${slide.link_target}"`}
                            {slide.link_type === 'category' && `يوجه لقسم: ${slide.link_target}`}
                            {slide.link_type === 'product' && `يوجه للمنتج: ${slide.link_target}`}
                            {slide.link_type === 'url' && `يوجه لرابط: ${slide.link_target}`}
                          </span>
                        )}
                        {slide.price && (
                          <span className="text-slate-700 font-outfit font-bold">
                            {slide.price} EGP
                          </span>
                        )}
                      </div>
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
                      {!['iphones', 'feature_phones', 'chargers', 'cables', 'car_chargers', 'wireless_chargers', 'headsets', 'headphones', 'smartwatches', 'powerbanks', 'cases_protection', 'accessories'].includes(cat.key) && (
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
        <UsersTab onNavigateSection={setActiveTab} />
      )}

      {/* MODAL 1: ADD / EDIT PRODUCT INTERACTIVE MODAL */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div role="dialog" aria-modal="true" aria-label={editingProduct ? 'تعديل بيانات المنتج' : 'إضافة منتج يدوي جديد'} className="relative w-full max-w-2xl bg-white border border-amber-500/40 rounded-3xl p-6 text-slate-900 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
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
                    {!currentCategories.some((c) => c.key === 'printers') && (
                      <option value="printers">طابعات محمولة وملحقاتها (printers)</option>
                    )}
                    {!currentCategories.some((c) => c.key === 'gaming') && (
                      <option value="gaming">أجهزة وإكسسوارات الألعاب (gaming)</option>
                    )}
                    {!currentCategories.some((c) => c.key === prodForm.category) && prodForm.category && !['printers', 'gaming'].includes(prodForm.category) && (
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

              <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="block text-slate-800 font-bold text-sm">
                      صور المنتج ({prodForm.images?.filter(Boolean).length || 0})
                    </label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      يمكنك رفع صورة أو أكثر مباشرة من اللابتوب أو تعديل الروابط. الصورة الأولى هي الصورة الرئيسية.
                    </p>
                  </div>
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-sm transition-all hover:scale-105 active:scale-95">
                    <Upload className="w-4 h-4" />
                    <span>رفع صورة من اللابتوب</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleProductImageUpload}
                    />
                  </label>
                </div>

                {/* Image Previews / Gallery */}
                {prodForm.images && prodForm.images.filter(Boolean).length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    {prodForm.images.filter(Boolean).map((imgUrl, idx) => (
                      <div
                        key={idx}
                        className={`group relative rounded-xl overflow-hidden border-2 bg-white flex flex-col items-center justify-between p-2 shadow-sm ${
                          idx === 0 ? 'border-amber-400 bg-amber-50/20 ring-2 ring-amber-200' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="w-full aspect-square rounded-lg overflow-hidden bg-slate-100 mb-2 relative flex items-center justify-center">
                          <img
                            src={normalizeProductImage(imgUrl)}
                            alt=""
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = '/product-placeholder.svg';
                            }}
                          />
                          {idx === 0 && (
                            <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[10px] shadow">
                              الرئيسية
                            </span>
                          )}
                        </div>

                        <div className="w-full flex items-center justify-between gap-1 text-[11px]">
                          {idx !== 0 ? (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryImage(idx)}
                              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 font-bold text-[10px] transition-colors"
                              title="جعل هذه الصورة هي الصورة الرئيسية الأولى للمنتج"
                            >
                              تعيين كرئيسية
                            </button>
                          ) : (
                            <span className="text-[10px] text-amber-800 font-extrabold">صورة الغلاف</span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveProductImage(idx)}
                            className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                            title="حذف هذه الصورة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Textarea for manual URLs */}
                <div>
                  <label className="block text-slate-600 text-xs mb-1">
                    أو تعديل الروابط يدوياً (رابط في كل سطر):
                  </label>
                  <textarea
                    rows={2}
                    value={prodForm.images?.join('\n') || ''}
                    onChange={(e) => {
                      const lines = e.target.value.split('\n');
                      setProdForm({ ...prodForm, images: lines });
                    }}
                    placeholder="/product-images/example.png"
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
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
              <div className="space-y-2.5 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div>
                  <label className="block text-slate-800 font-bold text-xs">
                    روابط بوستات وإعلانات السوشيال ميديا (اختياري — تظهر للعميل في صفحة المنتج)
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    أضف رابط البوست أو الفيديو الترويجي على فيسبوك أو تيك توك أو إنستجرام ليتمكن العميل من مشاهدته مباشرة.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="flex items-center gap-1.5 text-slate-700 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-[#1877F2]/15 text-[#1877F2] text-[10px] font-outfit">FB</span>
                      <span>رابط بوست فيسبوك</span>
                    </label>
                    <input
                      type="url"
                      dir="ltr"
                      value={prodForm.social_links?.facebook || ''}
                      onChange={e => setProdForm({
                        ...prodForm,
                        social_links: { ...(prodForm.social_links || {}), facebook: e.target.value }
                      })}
                      placeholder="https://www.facebook.com/..."
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-[11px] text-slate-900 font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-slate-700 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-slate-900/10 text-slate-900 text-[10px] font-outfit">TT</span>
                      <span>رابط فيديو تيك توك</span>
                    </label>
                    <input
                      type="url"
                      dir="ltr"
                      value={prodForm.social_links?.tiktok || ''}
                      onChange={e => setProdForm({
                        ...prodForm,
                        social_links: { ...(prodForm.social_links || {}), tiktok: e.target.value }
                      })}
                      placeholder="https://www.tiktok.com/@..."
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-[11px] text-slate-900 font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-slate-700 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-700 text-[10px] font-outfit">IG</span>
                      <span>رابط بوست إنستجرام</span>
                    </label>
                    <input
                      type="url"
                      dir="ltr"
                      value={prodForm.social_links?.instagram || ''}
                      onChange={e => setProdForm({
                        ...prodForm,
                        social_links: { ...(prodForm.social_links || {}), instagram: e.target.value }
                      })}
                      placeholder="https://www.instagram.com/..."
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-[11px] text-slate-900 font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-slate-800 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={prodForm.is_active !== false}
                  onChange={e => setProdForm({ ...prodForm, is_active: e.target.checked })}
                  className="accent-emerald-600 w-4 h-4 rounded cursor-pointer"
                />
                <span className="flex items-center gap-1.5">
                  {prodForm.is_active !== false ? <Eye className="w-4 h-4 text-emerald-700" /> : <EyeOff className="w-4 h-4 text-amber-700" />}
                  <span>{prodForm.is_active !== false ? 'ظاهر للعملاء في المتجر (مفعّل)' : 'مخفي عن العملاء حالياً (مسودة / أرشيف)'}</span>
                </span>
              </label>

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
          <div role="dialog" aria-modal="true" aria-label={`إرسال إشعار واتساب للطلب #${whatsappModalOrder.order_number}`} className="relative w-full max-w-xl bg-white border border-emerald-500/40 rounded-3xl p-6 text-slate-900 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-700" />
                <span>إرسال إشعار واتساب للطلب #{whatsappModalOrder.order_number}</span>
              </h3>
              <button
                onClick={() => setWhatsappModalOrder(null)}
                className="p-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs font-cairo">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[11px]">رقم هاتف العميل:</span>
                  <strong className="text-slate-900 font-outfit text-sm">
                    {whatsappModalOrder.customer_whatsapp || whatsappModalOrder.customer_phone}
                  </strong>
                </div>
                <div className="text-end">
                  <span className="text-slate-500 block text-[11px]">العميل:</span>
                  <strong className="text-slate-900 text-xs font-bold">
                    {whatsappModalOrder.customer_name}
                  </strong>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">نوع الرسالة / القالب الآلي:</label>
                <select
                  value={customMsgType}
                  onChange={(e) => setCustomMsgType(e.target.value as any)}
                  className="w-full bg-slate-100 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium"
                >
                  <option value="order_confirmed">تأكيد الطلب والفاتورة (Order Placed)</option>
                  <option value="payment_verified">تأكيد استلام الدفع (Payment Verified)</option>
                  <option value="processing">تم التجهيز والتسليم لشركة الشحن (Processing)</option>
                  <option value="shipped">تسليم للشحن ورقم البوليصة (Shipped)</option>
                  <option value="out_for_delivery">خروج الشحنة مع المندوب (Out for Delivery)</option>
                  <option value="delivered">تم التوصيل بنجاح (Delivered)</option>
                  <option value="review_request">طلب تقييم الخدمة والجهاز (Review Request)</option>
                </select>
              </div>

              {customMsgType === 'shipped' && (
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-slate-600 mb-1">اسم المندوب / شركة الشحن:</label>
                    <input
                      type="text"
                      value={courierInput}
                      onChange={(e) => {
                        setCourierInput(e.target.value);
                        if (whatsappModalOrder) {
                          setEditableWhatsAppText(buildDefaultWhatsAppMessage(
                            'shipped',
                            whatsappModalOrder,
                            settings,
                            e.target.value,
                            trackingInput
                          ));
                        }
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">رقم البوليصة (اختياري):</label>
                    <input
                      type="text"
                      value={trackingInput}
                      onChange={(e) => {
                        setTrackingInput(e.target.value);
                        if (whatsappModalOrder) {
                          setEditableWhatsAppText(buildDefaultWhatsAppMessage(
                            'shipped',
                            whatsappModalOrder,
                            settings,
                            courierInput,
                            e.target.value
                          ));
                        }
                      }}
                      placeholder="مثال: EGY-98213"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-700 font-bold text-xs">
                    نص الرسالة (يمكنك تعديل أو حذف أي جزء منها بحرية قبل الإرسال):
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (whatsappModalOrder) {
                        const resetText = buildDefaultWhatsAppMessage(
                          customMsgType,
                          whatsappModalOrder,
                          settings,
                          courierInput || whatsappModalOrder.courier_name,
                          trackingInput || whatsappModalOrder.tracking_number
                        );
                        setEditableWhatsAppText(resetText);
                      }
                    }}
                    className="text-[11px] text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>استعادة القالب الأصلي</span>
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={editableWhatsAppText}
                  onChange={(e) => setEditableWhatsAppText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 leading-relaxed resize-y"
                  placeholder="اكتب أو عدل نص رسالة الواتساب هنا..."
                  dir="rtl"
                />
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                  <span>ملاحظة: لا يتم ذكر الضمان إلا للأصناف المشمولة بضمان رسمي، ويمكنك تعديل أو حذف أي سطر يدوياً.</span>
                  <span>{editableWhatsAppText.length} حرف</span>
                </div>
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

              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <a
                  href={generateWhatsAppWebLink(whatsappModalOrder.customer_whatsapp || whatsappModalOrder.customer_phone, editableWhatsAppText)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold flex items-center gap-1.5 transition-colors text-xs"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>فتح في واتساب ويب مباشرة</span>
                </a>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setWhatsappModalOrder(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  >
                    إغلاق
                  </button>
                  <button
                    onClick={handleTriggerWhatsApp}
                    disabled={isSendingWhatsApp}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold flex items-center gap-1.5 shadow-md transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSendingWhatsApp ? 'جاري الإرسال...' : 'إرسال الإشعار الآن'}</span>
                  </button>
                </div>
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

      <InvoiceModal
        order={invoiceModalOrder}
        settings={settings}
        onClose={() => setInvoiceModalOrder(null)}
      />
    </div></AdminShell>
  );
};
