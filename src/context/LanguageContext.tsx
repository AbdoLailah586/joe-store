import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'ar' | 'en';

interface Translations {
  [key: string]: {
    ar: string;
    en: string;
  };
}

export const translations: Translations = {
  // Brand & Header
  storeName: { ar: 'جو ستور', en: 'JOE Store' },
  storeSubtitle: { ar: 'وجهتك الأولى للهواتف والإكسسوارات الأصلية', en: 'Your Premier Hub for Phones & Accessories' },
  searchPlaceholder: { ar: 'ابحث عن هاتف، سماعة، شاحن، أو إكسسوار...', en: 'Search phones, earbuds, chargers, or accessories...' },
  allCategories: { ar: 'جميع الأقسام', en: 'All Categories' },
  smartphones: { ar: 'الهواتف الذكية', en: 'Smartphones' },
  smartwatches: { ar: 'الساعات الذكية', en: 'Smartwatches' },
  audio: { ar: 'سماعات وصوتيات', en: 'Audio & Earbuds' },
  chargers_cables: { ar: 'شواحن وكابلات', en: 'Chargers & Cables' },
  powerbanks: { ar: 'بنوك طاقة (باوربانك)', en: 'Powerbanks' },
  cases_protection: { ar: 'جرابات وحمايات', en: 'Cases & Protectors' },
  accessories: { ar: 'إكسسوارات متنوعة', en: 'Accessories' },

  // Navigation
  home: { ar: 'الرئيسية', en: 'Home' },
  catalog: { ar: 'المتجر والمنتجات', en: 'Catalog' },
  usedIphones: { ar: 'آيفون كسر زيرو', en: 'Certified Pre-Owned' },
  deals: { ar: 'عروض اليوم', en: 'Daily Deals' },
  trackOrder: { ar: 'تتبع طلبك', en: 'Track Order' },
  contactUs: { ar: 'تواصل معنا', en: 'Contact Us' },
  adminPanel: { ar: 'لوحة التحكم (الإدارة)', en: 'Admin Panel' },
  cart: { ar: 'عربة التسوق', en: 'Cart' },
  wishlist: { ar: 'المفضلة', en: 'Wishlist' },

  // Badges & Conditions
  brandNew: { ar: 'جديد متبرشم', en: 'Brand New (Sealed)' },
  mint: { ar: 'كسر زيرو ممتاز', en: 'Mint Condition' },
  usedGood: { ar: 'استعمال خفيف بحالة ممتازة', en: 'Gently Used (Grade A)' },
  batteryHealth: { ar: 'صحة البطارية', en: 'Battery Health' },
  testedCertified: { ar: 'مفحوص ومضمون 100%', en: '100% Tested & Certified' },
  inStock: { ar: 'متوفر فوراً بالمحل', en: 'In Stock' },
  outOfStock: { ar: 'نفد من المخزون', en: 'Out of Stock' },
  limitedStock: { ar: 'قطع محدودة متبقية', en: 'Limited Stock Left' },
  freeDeliveryPromo: { ar: 'توصيل فوري داخل المنصورة وشحن سريع لجميع محافظات مصر', en: 'Same-day delivery in Mansoura & express shipping across Egypt' },

  // Product Details
  priceEGP: { ar: 'ج.م', en: 'EGP' },
  saveAmount: { ar: 'وفر', en: 'Save' },
  addToCart: { ar: 'أضف للسلة', en: 'Add to Cart' },
  buyNow: { ar: 'شراء فوري', en: 'Buy Now' },
  storage: { ar: 'المساحة', en: 'Storage' },
  color: { ar: 'اللون', en: 'Color' },
  quantity: { ar: 'الكمية', en: 'Quantity' },
  warranty: { ar: 'الضمان', en: 'Warranty' },
  months: { ar: 'أشهر', en: 'Months' },
  whatsappInquiry: { ar: 'استفسر أو احجز عبر واتساب', en: 'Inquire or Reserve via WhatsApp' },
  quickView: { ar: 'نظرة سريعة', en: 'Quick View' },
  specifications: { ar: 'المواصفات التقنية', en: 'Specifications' },
  deviceConditionReport: { ar: 'تقرير فحص الجهاز والبطارية', en: 'Device Condition & Battery Inspection' },
  similarProducts: { ar: 'منتجات مشابهة قد تعجبك', en: 'Similar Products You May Like' },

  // Filters & Sorting
  filters: { ar: 'الفلاتر والخيارات', en: 'Filters' },
  priceRange: { ar: 'نطاق السعر', en: 'Price Range' },
  filterBrand: { ar: 'الماركة', en: 'Brand' },
  filterCondition: { ar: 'حالة الجهاز', en: 'Device Condition' },
  filterBattery: { ar: 'نسبة البطارية', en: 'Battery Percentage' },
  sortBy: { ar: 'الترتيب حسب', en: 'Sort By' },
  sortFeatured: { ar: 'المميز والموصى به', en: 'Featured' },
  sortPriceAsc: { ar: 'السعر: من الأقل للأعلى', en: 'Price: Low to High' },
  sortPriceDesc: { ar: 'السعر: من الأعلى للأقل', en: 'Price: High to Low' },
  sortRating: { ar: 'الأعلى تقييماً', en: 'Highest Rated' },
  clearFilters: { ar: 'إعادة ضبط الفلاتر', en: 'Clear Filters' },
  showingProducts: { ar: 'عرض منتجات', en: 'Showing products' },

  // Cart & Checkout
  emptyCart: { ar: 'عربة التسوق فارغة', en: 'Your cart is empty' },
  emptyCartSub: { ar: 'استكشف أحدث الهواتف والإكسسوارات وأضفها لسلتك الآن!', en: 'Discover our latest smartphones and gadgets to add items!' },
  subtotal: { ar: 'المجموع الفرعي', en: 'Subtotal' },
  shippingFee: { ar: 'تكلفة الشحن والتوصيل', en: 'Shipping Fee' },
  freeShipping: { ar: 'شحن مجاني', en: 'Free Shipping' },
  total: { ar: 'الإجمالي النهائي', en: 'Grand Total' },
  proceedToCheckout: { ar: 'متابعة إتمام الطلب', en: 'Proceed to Checkout' },
  checkoutTitle: { ar: 'إتمام الطلب وبيانات التوصيل', en: 'Checkout & Delivery Info' },
  customerName: { ar: 'الاسم الكامل', en: 'Full Name' },
  customerPhone: { ar: 'رقم الهاتف الأساسي', en: 'Primary Phone Number' },
  customerWhatsApp: { ar: 'رقم الواتساب (لاستلام إشعار وتفاصيل الطلب)', en: 'WhatsApp Number (for order updates)' },
  customerEmail: { ar: 'البريد الإلكتروني (اختياري)', en: 'Email (Optional)' },
  governorate: { ar: 'المحافظة', en: 'Governorate' },
  city: { ar: 'المدينة / المركز', en: 'City / District' },
  detailedAddress: { ar: 'العنوان التفصيلي (الشارع، رقم العمارة، الشقة، علامة مميزة)', en: 'Detailed Address (Street, Building, Apt, Landmark)' },
  orderNotes: { ar: 'ملاحظات خاصة بالتوصيل أو الاستلام (اختياري)', en: 'Delivery notes or instructions (Optional)' },

  // Payments
  paymentMethod: { ar: 'طريقة الدفع', en: 'Payment Method' },
  cod: { ar: 'الدفع عند الاستلام (مع إمكانية المعاينة قبل الدفع)', en: 'Cash on Delivery (Inspect before paying)' },
  codShort: { ar: 'الدفع عند الاستلام', en: 'Cash on Delivery' },
  instapay: { ar: 'تحويل عبر إنستاباي (InstaPay)', en: 'InstaPay Instant Transfer' },
  vodafoneCash: { ar: 'فودافون كاش ومحافظ إلكترونية', en: 'Vodafone Cash & Mobile Wallets' },
  creditCard: { ar: 'بطاقة بنكية / فيزا أو ماستركارد', en: 'Credit / Debit Card' },
  instapayInstruction: { ar: 'قم بالتحويل إلى معرف إنستاباي الخاص بمتجر جو ستور، ثم ارفع صورة الإيصال أو اكتب رقم العملية:', en: 'Transfer to Joe Store InstaPay ID, then upload receipt or reference code:' },
  vodafoneInstruction: { ar: 'قم بالتحويل على رقم محفظة فودافون كاش الخاص بمتجر جو ستور، ثم أرفق إثبات التحويل:', en: 'Transfer to Joe Store Vodafone Cash wallet, then attach transfer proof:' },
  uploadReceipt: { ar: 'إرفاق إيصال التحويل (صورة أو سكرين شوت)', en: 'Upload Transfer Receipt (Image)' },
  referenceCode: { ar: 'رقم العملية المرجعي / اسم المحول', en: 'Reference Number / Sender Name' },
  confirmOrderBtn: { ar: 'تأكيد وإرسال الطلب الآن', en: 'Confirm & Place Order' },

  // Order Success & Tracking
  orderPlacedSuccess: { ar: 'تم استلام طلبك بنجاح! 🎉', en: 'Order Placed Successfully! 🎉' },
  orderNumber: { ar: 'رقم الطلب', en: 'Order Number' },
  whatsappAlertNotice: { ar: 'تم إرسال رسالة واتساب آلية إلى رقمك تحتوي على تفاصيل الطلب وكود المتابعة.', en: 'An automated WhatsApp message was dispatched with your order receipt & tracking details.' },
  orderStatus: { ar: 'حالة الطلب', en: 'Order Status' },
  statusPending: { ar: 'قيد المراجعة والتأكيد', en: 'Pending Review' },
  statusConfirmed: { ar: 'تم تأكيد الطلب', en: 'Order Confirmed' },
  statusProcessing: { ar: 'جاري التجهيز والتغليف', en: 'Processing & Packing' },
  statusShipped: { ar: 'تم التسليم لشركة الشحن', en: 'Shipped to Courier' },
  statusOutForDelivery: { ar: 'جاري التوصيل مع المندوب اليوم', en: 'Out for Delivery' },
  statusDelivered: { ar: 'تم الاستلام بنجاح', en: 'Delivered' },
  statusCancelled: { ar: 'ملغي', en: 'Cancelled' },
  backToHome: { ar: 'العودة للتسوق', en: 'Continue Shopping' },
  trackLive: { ar: 'متابعة مسار الشحنة', en: 'Track Shipment' },

  // Admin Dashboard
  adminTitle: { ar: 'لوحة إدارة متجر جو ستور', en: 'JOE Store Admin Hub' },
  overviewTab: { ar: 'نظرة عامة وإحصائيات', en: 'Overview' },
  productsTab: { ar: 'إدارة المنتجات والمخزون', en: 'Products & Inventory' },
  ordersTab: { ar: 'الطلبات والمبيعات', en: 'Orders & Sales' },
  whatsappTab: { ar: 'ربط واتساب برو الآلي', en: 'WhatsApp Pro Automation' },
  settingsTab: { ar: 'إعدادات المتجر وبيانات الدفع', en: 'Store Settings' },
  addProduct: { ar: 'إضافة منتج يدوي', en: 'Add Product Manually' },
  bulkExcelImport: { ar: 'استيراد بملف إكسل (Excel / CSV)', en: 'Bulk Excel / CSV Import' },
  downloadTemplate: { ar: 'تحميل نموذج إكسل الجاهز', en: 'Download Excel Template' },
  exportProducts: { ar: 'تصدير المنتجات كـ إكسل', en: 'Export Catalog to Excel' },
  duplicateProduct: { ar: 'نسخ وتكرار المنتج', en: 'Duplicate Product' },
  deleteProduct: { ar: 'حذف المنتج', en: 'Delete Product' },
  editProduct: { ar: 'تعديل البيانات', en: 'Edit Product' },

  // WhatsApp Automation Section
  whatsappProStatus: { ar: 'حالة خادم واتساب برو', en: 'WhatsApp Pro Server Status' },
  connected: { ar: 'متصل وجاهز للإرسال الفوري', en: 'Connected & Ready' },
  disconnected: { ar: 'غير متصل (يعمل بالوضع الاحتياطي)', en: 'Disconnected (Fallback Mode)' },
  testWhatsAppBtn: { ar: 'إرسال رسالة اختبار عبر واتساب', en: 'Send Test WhatsApp Message' },
  sendWhatsAppNotification: { ar: 'إرسال إشعار واتساب للعميل', en: 'Send WhatsApp Notification' },
  whatsappTemplates: { ar: 'قوالب الرسائل الآلية', en: 'Automated Message Templates' },
  orderConfirmedTemplate: { ar: 'رسالة تأكيد الطلب فور الشراء', en: 'Order Placed Template' },
  shippedTemplate: { ar: 'رسالة تسليم الشحنة لشركة الشحن', en: 'Order Shipped Template' },
  outForDeliveryTemplate: { ar: 'رسالة خروج الشحنة مع المندوب', en: 'Out for Delivery Template' },
  deliveredTemplate: { ar: 'رسالة تأكيد الاستلام وتقييم الشراء', en: 'Delivered & Review Request Template' },

  // User Profile & Authentication
  profile: { ar: 'الملف الشخصي', en: 'My Profile' },
  signIn: { ar: 'تسجيل الدخول', en: 'Sign In' },
  signUp: { ar: 'إنشاء حساب جديد', en: 'Create Account' },
  signOut: { ar: 'تسجيل الخروج', en: 'Sign Out' },
  myOrders: { ar: 'طلباتي السابقة', en: 'My Orders' },
  savedAddresses: { ar: 'عناوين التوصيل', en: 'Saved Addresses' },
  activeWarranties: { ar: 'الضمانات المعتمدة', en: 'Device Warranties' },
  loginRequiredToOrder: { ar: 'تسجيل الدخول مطلوب لإتمام الطلب وحفظ فواتيرك وبيانات الضمان.', en: 'Sign-in is required to place your order and secure your warranty certificates.' },
  loginWithGoogle: { ar: 'المتابعة باستخدام Google', en: 'Continue with Google' },

  // General Actions & Badges
  shopNow: { ar: 'تسوق الآن', en: 'Shop Now' },
  viewAll: { ar: 'عرض الكل', en: 'View All' },
  shopPreowned: { ar: 'تصفح هواتف كسر زيرو', en: 'Explore Pre-Owned' },
  browseCategories: { ar: 'تصفح الأقسام الرئيسية', en: 'Browse Main Categories' },
  browseCategoriesSub: { ar: 'اختر القسم وتصفح أحدث الأجهزة والإكسسوارات الأصلية', en: 'Select a category to explore genuine devices & accessories' },
  certifiedPreownedTitle: { ar: 'أجهزة مفحوصة 100% بحالة الزيرو', en: '100% Certified Devices in Mint Condition' },
  certifiedPreownedSub: { ar: 'جميع الأجهزة خالية من الخدوش ومضمونة بتقرير فحص رسمي شامل لشاشة العرض والبطارية وFaceID والكاميرات مع إمكانية المعاينة قبل الدفع.', en: 'All devices are scratch-free, tested for battery health, display, FaceID, and cameras with inspection prior to payment.' },
  mansouraBranch: { ar: 'فرع متجر جو ستور (JOE Store) - المنصورة', en: 'JOE Store Flagship Branch - Mansoura' },
  mansouraLocation: { ar: 'المنصورة – شارع الإمام محمد عبده – ناصية آمون.', en: 'El Mansoura – Imam Mohamed Abdo St – Amon Corner.' },
  mansouraHours: { ar: 'يومياً: 12:00 ظهراً - 12:00 منتصف الليل', en: 'Daily: 12:00 PM - 12:00 AM' },
  mansouraDeliveryNotice: { ar: 'توصيل فوري خلال 3-6 ساعات في نفس اليوم داخل المنصورة', en: 'Same-day express delivery within 3-6 hours in Mansoura' },

  // Policies
  privacyPolicy: { ar: 'سياسة الخصوصية', en: 'Privacy Policy' },
  termsConditions: { ar: 'الشروط والأحكام', en: 'Terms & Conditions' },
  warrantyPolicy: { ar: 'سياسة الضمان والاستبدال', en: 'Warranty & Replacement Policy' },
  shippingPolicy: { ar: 'مواعيد ورسوم الشحن', en: 'Shipping & Delivery Policy' },
  allRightsReserved: { ar: 'جميع الحقوق محفوظة', en: 'All rights reserved' },
  inspectBeforePayNotice: { ar: 'المعاينة والفحص قبل الدفع', en: 'Inspect & Test Before Paying' },
  inspectBeforePayDesc: { ar: 'حقك في فحص وتجربة الجهاز بالكامل مع المندوب قبل دفع أي مبالغ.', en: 'Full right to inspect and test the device with the courier before paying.' },
  fastDeliveryDesc: { ar: 'توصيل في نفس اليوم داخل المنصورة، وشحن لجميع محافظات مصر خلال 24-48 ساعة.', en: 'Same-day delivery in Mansoura, and shipping to all Egypt governorates in 24-48 hours.' },
  whatsappTrackingTitle: { ar: 'إشعارات واتساب آلية', en: 'Automated WhatsApp Tracking' },
  whatsappTrackingDesc: { ar: 'متابعة مباشرة عبر الواتساب لتفاصيل طلبك وموقع الشحنة أولاً بأول.', en: 'Live updates on your order invoice and shipment location directly via WhatsApp.' },
  themeCustomizer: { ar: 'مظهر وواجهة المتجر', en: 'Store Theme & UI' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: keyof typeof translations) => string;
  formatPrice: (amount: number) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('joe_store_lang');
    return (saved === 'en' || saved === 'ar') ? saved : 'ar';
  });

  useEffect(() => {
    localStorage.setItem('joe_store_lang', language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    setLanguageState(prev => prev === 'ar' ? 'en' : 'ar');
  };

  const t = (key: keyof typeof translations): string => {
    const item = translations[key];
    if (!item) return String(key);
    return item[language] || item['ar'] || String(key);
  };

  const formatPrice = (amount: number): string => {
    const formatted = new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US').format(amount);
    return language === 'ar' ? `${formatted} ج.م` : `${formatted} EGP`;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        formatPrice,
        isRTL: language === 'ar'
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
