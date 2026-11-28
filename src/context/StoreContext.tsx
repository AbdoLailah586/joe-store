import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  Product,
  CartItem,
  Order,
  OrderStatus,
  CategoryKey,
  StoreSettings,
  WhatsAppNotification
} from '../types';
import { initialProducts } from '../data/seedProducts';
import {
  defaultSettings,
  sendWhatsAppMessage,
  recordWhatsAppNotification,
  getWhatsAppLogs,
  buildOrderConfirmationMessage,
  buildPaymentConfirmedMessage,
  buildShippedMessage,
  buildOutForDeliveryMessage,
  buildDeliveredMessage,
  buildReviewRequestMessage
} from '../utils/whatsappService';
import { neonDb, ActiveCartRecord } from '../services/neonDb';
import { useAuth } from './AuthContext';
import { deviceIsOnline, readOfflineCatalog, saveOfflineCatalog } from '../services/offlineCatalog';
import {
  readStorage, writeStorage, removeStorage, writeStoredJson, readStoredArray, readStoredSettings,
  isStoredProduct, isStoredCartItem, isStoredOrder
} from '../utils/browserStorage';
import { normalizeProductImages } from '../utils/imageUrl';
import { getOrCaptureVisitorAttribution } from '../utils/visitorAttribution';

function sanitizeProductSocialLinks(input: any): Product['social_links'] {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
  const out: NonNullable<Product['social_links']> = {};
  for (const key of ['facebook', 'tiktok', 'instagram'] as const) {
    const raw = typeof input[key] === 'string' ? input[key].trim() : '';
    if (!raw) continue;
    const withScheme = /^(https?:)?\/\//i.test(raw) ? (raw.startsWith('//') ? `https:${raw}` : raw) : `https://${raw}`;
    try {
      const u = new URL(withScheme);
      if (u.protocol === 'http:' || u.protocol === 'https:') out[key] = u.toString();
    } catch {}
  }
  return Object.keys(out).length ? out : undefined;
}
import { applyPageSeo, buildProductJsonLd, buildStoreJsonLd } from '../utils/seo';
import { disableMetaPixel, initMetaPixel, trackMetaEvent } from '../utils/metaPixel';
import {
  hasAnalyticsConsent,
  initGa4,
  revokeAnalyticsIfDeclined,
  trackGa4AddToCart,
  trackGa4PageView,
  trackGa4Purchase
} from '../utils/analytics';
import { syncSiteVerificationMeta } from '../utils/seo';
import { startWebVitalsObserver } from '../utils/webVitals';

export type AppTab =
  | 'home'
  | 'catalog'
  | 'product'
  | 'cart'
  | 'checkout'
  | 'order-success'
  | 'track-order'
  | 'profile'
  | 'admin'
  | 'terms' | 'privacy' | 'refund' | 'shipping'
  | 'wishlist' | 'deals' | 'recent' | 'brands' | 'finder' | 'help' | 'contact' | 'bundles';
export type DiscoveryTab = 'wishlist' | 'deals' | 'recent' | 'brands' | 'finder' | 'help' | 'contact' | 'bundles';

interface StoreContextType {
  products: Product[];
  isCatalogLoading: boolean;
  isCatalogReadyForReports: boolean;
  isOfflineCatalog: boolean;
  catalogSavedAt?: number;
  refreshCatalog: () => void;
  addProduct: (product: Partial<Product>) => void;
  bulkAddProducts: (newProducts: Partial<Product>[]) => void;
  updateProduct: (id: string, updated: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  duplicateProduct: (id: string) => void;
  toggleProductVisibility: (id: string, isActive: boolean) => Promise<boolean>;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, storage?: string, color?: string) => void;
  removeFromCart: (productId: string, storage?: string, color?: string) => void;
  updateCartQuantity: (productId: string, quantity: number, storage?: string, color?: string) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;

  // Wishlist
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;

  // Orders & Cancellation
  orders: Order[];
  currentOrder: Order | null;
  createOrder: (orderData: Omit<Order, 'id' | 'order_number' | 'created_at' | 'updated_at' | 'whatsapp_notification_sent'>) => Promise<Order>;
  cancelOrder: (orderId: string, reason: string, cancelledBy?: 'customer_whatsapp' | 'admin') => Promise<boolean>;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus, courier?: string, trackingNo?: string, override?: { override: boolean; overrideReason: string }) => Promise<{success:boolean; error?:string; code?:string}>;
  updatePaymentStatus: (orderId: string, status: 'unpaid' | 'paid' | 'verified') => Promise<void>;
  getOrderById: (orderIdOrNumber: string) => Order | undefined;

  // Analytics & Personalization
  sessionId: string;
  recentlyViewedIds: string[];
  trackActivity: (actionType: 'search' | 'view_product' | 'view_category' | 'add_to_cart' | 'visit' | 'wishlist', targetId?: string, metadata?: Record<string, any>) => void;
  activeCarts: ActiveCartRecord[];
  refreshActiveCarts: () => Promise<void>;

  // Navigation & Search
  currentTab: AppTab;
  navigate: (tab: AppTab, productId?: string, options?: { replace?: boolean; category?: CategoryKey; search?: string; section?: string; brand?: string; sub?: string; device?: string; model?: string }) => void;
  selectedProductId: string | null;
  quickViewProduct: Product | null;
  setQuickViewProduct: (prod: Product | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: CategoryKey;
  setSelectedCategory: (cat: CategoryKey) => void;

  // Settings & WhatsApp
  settings: StoreSettings;
  updateSettings: (newSettings: Partial<StoreSettings>) => void;
  themeMode: 'light' | 'dark';
  toggleThemeMode: () => void;
  whatsappLogs: WhatsAppNotification[];
  refreshWhatsAppLogs: () => void;
  manualSendWhatsAppNotification: (order: Order, type: WhatsAppNotification['type'], customText?: string) => Promise<{ success: boolean; simulated?: boolean; error?: string }>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

interface ParsedRoute {
  tab: AppTab;
  productId?: string;
  category?: CategoryKey;
  search?: string;
}

export const parseRouteFromLocation = (): ParsedRoute => {
  if (typeof window === 'undefined') return { tab: 'home' };

  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const searchParams = new URLSearchParams(window.location.search);

  // 1. /product/:id or /p/:id
  const productMatch = pathname.match(/^\/(?:product|p)\/([^/]+)/);
  if (productMatch) {
    return {
      tab: 'product',
      productId: decodeURIComponent(productMatch[1])
    };
  }

  if (['/wishlist', '/deals', '/recent', '/brands', '/finder', '/help', '/contact', '/bundles'].includes(pathname)) {
    return { tab: pathname.slice(1) as AppTab, category: (searchParams.get('category') || 'all') as CategoryKey, search: searchParams.get('q') || '' };
  }

  // Policy routes
  if (pathname === '/terms') return { tab: 'terms' };
  if (pathname === '/privacy-policy' || pathname === '/privacy') return { tab: 'privacy' };
  if (pathname === '/return-policy' || pathname === '/refund') return { tab: 'refund' };
  if (pathname === '/shipping-policy' || pathname === '/shipping') return { tab: 'shipping' };

  // 2. /catalog or /products or /shop
  if (pathname === '/catalog' || pathname === '/products' || pathname === '/shop') {
    const cat = (searchParams.get('category') || 'all') as CategoryKey;
    const q = searchParams.get('q') || searchParams.get('search') || '';
    return {
      tab: 'catalog',
      category: cat,
      search: q
    };
  }

  // 3. /category/:catKey
  const categoryMatch = pathname.match(/^\/category\/([^/]+)/);
  if (categoryMatch) {
    return {
      tab: 'catalog',
      category: decodeURIComponent(categoryMatch[1]) as CategoryKey
    };
  }

  // 4. Standalone tabs
  if (pathname === '/checkout') return { tab: 'checkout' };
  if (pathname === '/order-success') return { tab: 'order-success' };
  if (pathname === '/track-order' || pathname === '/tracking') return { tab: 'track-order' };
  if (pathname === '/profile' || pathname === '/account') return { tab: 'profile' };
  if (pathname === '/admin') return { tab: 'admin' };
  if (pathname === '/cart') return { tab: 'cart' };

  return { tab: 'home' };
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: account, sessionReady, adminSections: accountSections = [] } = useAuth();
  const accountAccessKey = `${account?.id || ''}:${account?.role || ''}:${accountSections.join(',')}`;
  const CURRENT_VERSION = 'v15_ac_202_cases_and_device_filters';
  const productCacheDirty = useRef(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [isOfflineCatalog, setIsOfflineCatalog] = useState(() => !deviceIsOnline());
  const [catalogSavedAt, setCatalogSavedAt] = useState<number | undefined>();
  const [connectionVersion, setConnectionVersion] = useState(0);
  const locallyEditedIds = useRef(new Set<string>());
  const locallyDeletedIds = useRef(new Set(readStoredArray('joe_store_product_deletions',
    (value): value is string => typeof value === 'string')));

  const [products, setProducts] = useState<Product[]>(() => {
    if (!deviceIsOnline()) return [];
    const savedVersion = readStorage('joe_store_catalog_ver');
    if (savedVersion && savedVersion !== CURRENT_VERSION) {
      removeStorage('joe_store_products');
      writeStorage('joe_store_catalog_ver', CURRENT_VERSION);
      return initialProducts.filter(product => !locallyDeletedIds.current.has(product.id));
    }
    const saved = readStoredArray('joe_store_products', isStoredProduct).filter(product =>
      !product.id.startsWith('prod-pos-') || product.catalog_status !== undefined);
    if (saved.length) {
      const seedById = new Map(initialProducts.map(product => [product.id, product]));
      for (const product of saved) {
        if (JSON.stringify(product) !== JSON.stringify(seedById.get(product.id))) {
          locallyEditedIds.current.add(product.id);
        }
      }
      if (saved.length === initialProducts.length && locallyEditedIds.current.size === 0
        && locallyDeletedIds.current.size === 0) {
        // This is an exact duplicate of the bundled seed, not administrator data.
        removeStorage('joe_store_products');
        return initialProducts;
      }
      if (savedVersion === CURRENT_VERSION && saved.length >= 2200) {
        const savedIds = new Set(saved.map(product => product.id));
        initialProducts.forEach(product => {
          if (!savedIds.has(product.id)) locallyDeletedIds.current.add(product.id);
        });
        return saved;
      }
      const cachedById = new Map(saved.map(product => [product.id, product]));
      const seededIds = new Set(initialProducts.map(product => product.id));
      return [
        ...saved.filter(product => !seededIds.has(product.id)),
        ...initialProducts.filter(product => !locallyDeletedIds.current.has(product.id))
          .map(product => cachedById.get(product.id) || product)
      ];
    }
    return initialProducts.filter(product => !locallyDeletedIds.current.has(product.id));
  });

  useEffect(() => {
    if (productCacheDirty.current) {
      if (writeStoredJson('joe_store_products', products.filter(product => locallyEditedIds.current.has(product.id)))) {
        writeStorage('joe_store_catalog_ver', CURRENT_VERSION);
      }
      writeStoredJson('joe_store_product_deletions', [...locallyDeletedIds.current]);
      productCacheDirty.current = false;
    }
  }, [products]);

  // Session ID for behavioral personalization & active cart signals
  const [sessionId] = useState<string>(() => {
    let sid = readStorage('joe_session_id');
    if (!sid) {
      sid = `sess_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
      writeStorage('joe_session_id', sid);
    }
    return sid;
  });

  // Cart State
  const [cart, setCart] = useState<CartItem[]>(() => readStoredArray('joe_store_cart', isStoredCartItem));

  useEffect(() => {
    writeStoredJson('joe_store_cart', cart);
    if (!deviceIsOnline()) return;
    const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const attribution = getOrCaptureVisitorAttribution();
    neonDb.syncActiveCart({
      sessionId,
      customerId: account?.id,
      customerName: account?.name,
      customerPhone: account?.phone,
      items: cart,
      subtotal,
      attribution
    }).catch(console.warn);
  }, [cart, sessionId, account?.id]);

  // Wishlist State
  const [wishlist, setWishlist] = useState<string[]>(() =>
    readStoredArray('joe_store_wishlist', (value): value is string => typeof value === 'string'));

  useEffect(() => {
    writeStoredJson('joe_store_wishlist', wishlist);
  }, [wishlist]);

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    removeStorage('joe_store_orders');
  }, [orders]);

  // Active & Abandoned Carts State for Admin CRM
  const [activeCarts, setActiveCarts] = useState<ActiveCartRecord[]>([]);

  const refreshActiveCarts = async () => {
    try {
      const carts = await neonDb.getActiveCarts();
      setActiveCarts(carts);
    } catch (e) {
      console.warn('Could not fetch active carts from Neon:', e);
    }
  };

  useEffect(()=>{
    const connected=()=>setConnectionVersion(value=>value+1);
    const disconnected=()=>{setIsOfflineCatalog(true);setConnectionVersion(value=>value+1)};
    window.addEventListener('online',connected);window.addEventListener('offline',disconnected);
    return()=>{window.removeEventListener('online',connected);window.removeEventListener('offline',disconnected)};
  },[]);
  useEffect(()=>{
    if(!isOfflineCatalog)return;
    const retry=()=>{if(deviceIsOnline())setConnectionVersion(value=>value+1)};
    window.addEventListener('focus',retry);return()=>window.removeEventListener('focus',retry);
  },[isOfflineCatalog]);

  // Only the complete public product projection is persisted for offline browsing.
  useEffect(() => {
    if (sessionReady === false) return;
    let cancelled = false;
    setIsCatalogLoading(true); setCatalogLoaded(false); setOrders([]); setActiveCarts([]);
    const offlineFallback=async()=>{
      const snapshot=await readOfflineCatalog();
      if(!cancelled){setProducts(snapshot?.products||[]);setCatalogSavedAt(snapshot?.savedAt);setIsOfflineCatalog(true)}
    };
    // 1. Fetch public catalog via CDN-cacheable GET; staff with product access fetch live uncached rows via POST
    const canViewHiddenProducts = ['products', 'inventory', 'quality', 'stocktake', 'reorder', 'labels', 'suppliers']
      .some(section => accountSections.includes(section));
    const catalogRequest = deviceIsOnline()
      ? neonDb.getAllProducts({ includeHidden: canViewHiddenProducts })
      : Promise.reject(new Error('Offline'));
    catalogRequest.then(dbProds => {
      if (!cancelled && dbProds && dbProds.length > 0) {
        const sanitize = (p: Product): Product => ({
          ...p,
          images: normalizeProductImages(p.images)
        });
        setProducts(dbProds.map(sanitize));
        setCatalogLoaded(true);
        setIsOfflineCatalog(false);
      }
    }).catch(offlineFallback).finally(() => { if (!cancelled) setIsCatalogLoading(false); });

    // 2. Fetch live orders from Neon only for signed-in users
    if(deviceIsOnline() && account) neonDb.getOrders().then(dbOrders => {
      if (!cancelled && dbOrders) {
        setOrders(dbOrders);
      }
    }).catch(console.warn);

    // 3. Load active carts for CRM
    if (deviceIsOnline() && accountSections.includes('crm')) refreshActiveCarts();
    return () => { cancelled = true; };
  }, [sessionReady, accountAccessKey, connectionVersion]);

  // Old carts contain product snapshots. Reconcile only after the complete live
  // catalog arrives so a temporary seed/fetch failure cannot erase valid items.
  useEffect(() => {
    if (!catalogLoaded) return;
    const currentById = new Map(products.map(product => [product.id, product]));
    setCart(previous => {
      const next = previous.flatMap(item => {
        const current = currentById.get(item.product.id);
        if (!current || current.is_active === false || !current.in_stock || current.price <= 0 || current.stock <= 0) return [];
        return [{ ...item, product: current, quantity: Math.min(item.quantity, current.stock) }];
      });
      return JSON.stringify(previous) === JSON.stringify(next) ? previous : next;
    });
  }, [products, catalogLoaded]);

  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem('joe_theme_mode') : null;
      return saved === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  // Settings State
  const [settings, setSettings] = useState<StoreSettings>(() => {
    const merged = readStoredSettings(defaultSettings);
    if (!merged.tiktok_url || (merged.tiktok_url.includes('@joestore') && !merged.tiktok_url.includes('2026'))) {
      merged.tiktok_url = 'https://www.tiktok.com/@joestore2026';
      writeStoredJson('joe_store_settings', merged);
    }
    return { ...merged, theme_mode: themeMode };
  });

  // Synchronize settings with database across all devices (mobile, laptop, and customers)
  useEffect(() => {
    let active = true;
    neonDb.getStoreSettings().then(remoteSettings => {
      if (!active || !remoteSettings || typeof remoteSettings !== 'object') return;
      setSettings(prev => {
        const merged = { ...defaultSettings, ...prev, ...remoteSettings, theme_mode: themeMode };
        writeStoredJson('joe_store_settings', merged);
        return merged;
      });
    }).catch(err => {
      console.warn('⚠️ Could not fetch remote store settings:', err);
    });
    return () => { active = false; };
  }, []);

  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    setSettings(prev => {
      const nextMode = newSettings.theme_mode === 'dark' || newSettings.theme_mode === 'light'
        ? newSettings.theme_mode
        : themeMode;
      const updated = { ...prev, ...newSettings, theme_mode: nextMode };
      writeStoredJson('joe_store_settings', updated);
      neonDb.updateStoreSettings(updated).catch(err => {
        console.warn('⚠️ Could not sync settings to database:', err);
      });
      return updated;
    });
  };

  const toggleThemeMode = () => {
    setThemeMode(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        window.localStorage.setItem('joe_theme_mode', next);
      } catch {
        // Ignore storage restrictions
      }
      setSettings(s => ({ ...s, theme_mode: next }));
      return next;
    });
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.active_theme || 'royal_gold');
    document.documentElement.classList.toggle('dark', themeMode === 'dark');
    document.documentElement.style.colorScheme = themeMode === 'dark' ? 'dark' : 'light';
  }, [settings.active_theme, themeMode]);

  // WhatsApp Logs
  const [whatsappLogs, setWhatsappLogs] = useState<WhatsAppNotification[]>(getWhatsAppLogs);
  const refreshWhatsAppLogs = () => {
    setWhatsappLogs(getWhatsAppLogs());
  };

  // Navigation State with URL Deep Linking
  const initialRoute = parseRouteFromLocation();
  const [currentTab, setCurrentTab] = useState<AppTab>(initialRoute.tab);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(initialRoute.productId || null);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(initialRoute.tab === 'cart');
  const [searchQuery, setSearchQuery] = useState(initialRoute.search || '');
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>(initialRoute.category || 'all');
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() =>
    readStoredArray('joe_recent_products', (v): v is string => typeof v === 'string')
  );
  const lastPixelRouteRef = useRef<string>('');
  const lastVisitTrackedRef = useRef<string>('');

  const [consentVersion, setConsentVersion] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onConsentChange = () => setConsentVersion(v => v + 1);
    window.addEventListener('joe-cookie-consent-changed', onConsentChange);
    window.addEventListener('storage', onConsentChange);
    return () => {
      window.removeEventListener('joe-cookie-consent-changed', onConsentChange);
      window.removeEventListener('storage', onConsentChange);
    };
  }, []);

  const readClientTelemetry = () => {
    if (typeof window === 'undefined') return {};
    const consented = hasAnalyticsConsent();
    if (!consented) {
      return {
        path: window.location.pathname,
        cookie_consent: 'essential'
      };
    }
    let timezone = '';
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch {}
    return {
      path: `${window.location.pathname}${window.location.search}`,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      screen_size: typeof window.screen !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : '',
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      browser_lang: typeof navigator !== 'undefined' ? navigator.language : '',
      timezone,
      cookie_consent: 'accepted'
    };
  };

  // Track attribution & visitor session on load and navigation ONLY after explicit non-essential consent
  useEffect(() => {
    if (!deviceIsOnline() || !hasAnalyticsConsent()) return;
    const attr = getOrCaptureVisitorAttribution();
    const visitKey = `${sessionId}:${account?.id || 'guest'}:${currentTab}:${selectedProductId || ''}`;
    if (lastVisitTrackedRef.current === visitKey) return;
    lastVisitTrackedRef.current = visitKey;
    neonDb.trackActivity({
      sessionId,
      customerId: account?.id,
      actionType: 'visit',
      metadata: {
        ...attr,
        ...readClientTelemetry()
      }
    }).catch(() => {});
  }, [sessionId, account?.id, currentTab, selectedProductId, consentVersion]);

  // Merge recently viewed products from server DB
  useEffect(() => {
    if (!deviceIsOnline()) return;
    let cancelled = false;
    neonDb.getRecentlyViewedProductIds(sessionId, account?.id, 12).then(remoteIds => {
      if (cancelled || !Array.isArray(remoteIds) || !remoteIds.length) return;
      setRecentlyViewedIds(prev => {
        const merged = Array.from(new Set([...prev, ...remoteIds])).slice(0, 24);
        writeStoredJson('joe_recent_products', merged);
        return merged;
      });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [sessionId, account?.id]);

  // Record product view locally + remotely
  useEffect(() => {
    if (currentTab !== 'product' || !selectedProductId || isCatalogLoading || !products.some(p => p.id === selectedProductId && p.is_active !== false)) return;
    setRecentlyViewedIds(prev => {
      const next = [selectedProductId, ...prev.filter(id => id !== selectedProductId)].slice(0, 24);
      writeStoredJson('joe_recent_products', next);
      return next;
    });
  }, [currentTab, selectedProductId, isCatalogLoading, products]);

  // Initialize Meta Pixel, GA4 & Core Web Vitals (strictly after analytics consent) + Dynamic SEO/JSON-LD
  useEffect(() => {
    syncSiteVerificationMeta(settings.gsc_verification_token, settings.meta_domain_verification_token);

    if (hasAnalyticsConsent()) {
      const pixelActive = settings.meta_pixel_enabled !== false && initMetaPixel(settings.meta_pixel_id);
      if (!pixelActive) {
        disableMetaPixel();
      }
      initGa4(settings.ga4_measurement_id);
      const stopVitals = startWebVitalsObserver();
      const routeKey = `${currentTab}:${selectedProductId || ''}:${selectedCategory || ''}:${searchQuery || ''}`;
      if (lastPixelRouteRef.current !== routeKey) {
        lastPixelRouteRef.current = routeKey;
        if (pixelActive) trackMetaEvent('PageView');
        if (typeof window !== 'undefined') {
          trackGa4PageView(`${window.location.pathname}${window.location.search}`);
        }
      }
      return stopVitals;
    } else {
      disableMetaPixel();
      revokeAnalyticsIfDeclined(settings.ga4_measurement_id);
    }
  }, [
    settings.meta_pixel_id,
    settings.meta_pixel_enabled,
    settings.ga4_measurement_id,
    settings.gsc_verification_token,
    settings.meta_domain_verification_token,
    consentVersion,
    currentTab,
    selectedProductId,
    selectedCategory,
    searchQuery
  ]);

  useEffect(() => {

    if (typeof window === 'undefined') return;
    const origin = window.location.origin;
    const storeName = settings.store_name_ar || 'JOE Store | جو ستور';

    if (currentTab === 'product' && selectedProductId) {
      const prod = products.find(p => p.id === selectedProductId);
      if (prod) {
        applyPageSeo({
          title: `${prod.name_ar} | ${storeName}`,
          description: prod.description_ar || `اشترِ ${prod.name_ar} بأفضل سعر في مصر مع ضمان معتمد من جو ستور وتوصيل سريع لكافة المحافظات.`,
          path: `/product/${encodeURIComponent(prod.id)}`,
          image: prod.images?.[0],
          type: 'product',
          jsonLd: buildProductJsonLd(origin, prod, settings)
        });
        return;
      }
    }

    const tabTitles: Partial<Record<AppTab, [string, string]>> = {
      home: [storeName, 'متجر جو ستور بالمنصورة للإلكترونيات والأجهزة الذكية والآيفون والإكسسوارات الأصلية بضمان معتمد وتوصيل لكل محافظات مصر.'],
      catalog: [`الكتالوج الشامل | ${storeName}`, 'تصفح أحدث الهواتف الذكية والسماعات والشواحن والساعات الذكية والكفرات الأصلية في جو ستور.'],
      deals: [`العروض والخصومات | ${storeName}`, 'أقوى عروض وتخفيضات جو ستور على الهواتف والإكسسوارات الأصلية.'],
      finder: [`دليل اختيار الجراب والإسكرينة | ${storeName}`, 'اعثر على الكفر والإسكرينة المناسبة لموبايلك في ثوانٍ في جو ستور.'],
      'track-order': [`تتبع طلبك | ${storeName}`, 'تابع حالة شحنتك وطلبك لحظة بلحظة من جو ستور.'],
      checkout: [`إتمام الطلب | ${storeName}`, 'أكمل طلبك مع تحديد موقعك بدقة والدفع عند الاستلام أو أونلاين بأمان.'],
      terms: [`الشروط والأحكام | ${storeName}`, 'الشروط والأحكام المنظمة للتسوق والاستخدام في متجر جو ستور.'],
      privacy: [`سياسة الخصوصية | ${storeName}`, 'كيف نحمي بياناتك وموقع التوصيل وسرية معاملاتك في جو ستور.'],
      refund: [`سياسة الاسترجاع والاستبدال | ${storeName}`, 'شروط الاستبدال والاسترجاع والضمان لمنتجات جو ستور.'],
      shipping: [`سياسة الشحن والتوصيل | ${storeName}`, 'مواعيد ورسوم التوصيل لجميع محافظات مصر من المنصورة.']
    };
    const [title, description] = tabTitles[currentTab] || [storeName, tabTitles.home![1]];
    applyPageSeo({
      title,
      description,
      path: `${window.location.pathname}${window.location.search}`,
      jsonLd: currentTab === 'home' ? buildStoreJsonLd(origin, settings) : undefined
    });
  }, [currentTab, selectedProductId, selectedCategory, searchQuery, products, settings]);

  // Sync state when user clicks Browser Back/Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const route = parseRouteFromLocation();
      setCurrentTab(route.tab);
      if (route.productId) {
        setSelectedProductId(route.productId);
      }
      if (route.category) {
        setSelectedCategory(route.category);
      }
      if (route.search !== undefined) {
        setSearchQuery(route.search);
      }
      if (window.location.pathname === '/cart') {
        setIsCartOpen(true);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (tab: AppTab, productId?: string, options?: { replace?: boolean; category?: CategoryKey; search?: string; section?: string; brand?: string; sub?: string; device?: string; model?: string }) => {
    setCurrentTab(tab);
    let targetProductId = selectedProductId;
    if (productId) {
      setSelectedProductId(productId);
      targetProductId = productId;
    }
    if (options?.category) {
      setSelectedCategory(options.category);
    }
    if (options?.search !== undefined) {
      setSearchQuery(options.search);
    }

    let targetPath = '/';
    if (tab === 'product' && (productId || targetProductId)) {
      targetPath = `/product/${encodeURIComponent(productId || targetProductId || '')}`;
    } else if (tab === 'catalog' || tab === 'wishlist' || tab === 'deals' || tab === 'recent') {
      const cat = options?.category || selectedCategory;
      const q = options?.search !== undefined ? options.search : searchQuery;
      const params = new URLSearchParams();
      if (cat && cat !== 'all') params.set('category', cat);
      if (q) params.set('q', q);
      if (options?.brand) params.set('brand', options.brand);
      if (options?.sub) params.set('sub', options.sub);
      if (options?.device) params.set('device', options.device);
      if (options?.model) params.set('model', options.model);
      const queryStr = params.toString();
      targetPath = queryStr ? `/${tab}?${queryStr}` : `/${tab}`;
    } else if (tab === 'checkout') {
      targetPath = '/checkout';
    } else if (tab === 'order-success') {
      targetPath = '/order-success';
    } else if (tab === 'track-order') {
      targetPath = '/track-order';
    } else if (tab === 'profile') {
      targetPath = options?.section ? `/profile?tab=${encodeURIComponent(options.section)}` : '/profile';
    } else if (tab === 'admin') {
      targetPath = '/admin';
    } else if (tab === 'terms') {
      targetPath = '/terms';
    } else if (tab === 'privacy') {
      targetPath = '/privacy-policy';
    } else if (tab === 'refund') {
      targetPath = '/return-policy';
    } else if (tab === 'shipping') {
      targetPath = '/shipping-policy';
    } else if (['brands', 'finder', 'help', 'contact', 'bundles'].includes(tab)) {
      targetPath = `/${tab}`;
    } else if (tab === 'cart') {
      targetPath = '/catalog';
      setIsCartOpen(true);
    } else {
      targetPath = '/';
    }

    if (typeof window !== 'undefined') {
      const currentFullUrl = window.location.pathname + window.location.search;
      if (currentFullUrl !== targetPath) {
        if (options?.replace) {
          window.history.replaceState({ tab, productId: targetProductId }, '', targetPath);
        } else {
          window.history.pushState({ tab, productId: targetProductId }, '', targetPath);
        }
      }
      if (typeof window.dispatchEvent === 'function') window.dispatchEvent(new Event('joe:navigate'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Product Operations
  const addProduct = (newProd: Partial<Product>) => {
    if (!accountSections.includes('products')) return;
    const isActive = newProd.is_active !== false;
    const stockQty = newProd.stock ?? 1;
    const priceVal = newProd.price ?? 0;
    const socialLinks = sanitizeProductSocialLinks(newProd.social_links);
    const fullProd: Product = {
      id: newProd.id || `prod-${Date.now()}`,
      sku: newProd.sku || `JOE-${Math.floor(1000 + Math.random() * 9000)}`,
      name_ar: newProd.name_ar || 'منتج جديد',
      name_en: newProd.name_en || 'New Product',
      brand: newProd.brand || 'Apple',
      category: newProd.category || 'accessories',
      condition: newProd.condition || 'brand_new',
      battery_health: newProd.battery_health ?? null,
      storage: newProd.storage || '',
      color_ar: newProd.color_ar || '',
      color_en: newProd.color_en || '',
      price: priceVal,
      original_price: newProd.original_price,
      discount_percentage: newProd.discount_percentage,
      stock: stockQty,
      in_stock: isActive && stockQty > 0 && priceVal > 0,
      is_active: isActive,
      images: newProd.images && newProd.images.length > 0 ? newProd.images : ['/product-placeholder.svg'],
      description_ar: newProd.description_ar || '',
      description_en: newProd.description_en || '',
      specs: newProd.specs || {},
      ...(socialLinks ? { social_links: socialLinks } : {}),
      warranty_months: newProd.warranty_months || 6,
      rating: 5.0,
      reviews_count: 1,
      is_featured: !!newProd.is_featured,
      is_flash_sale: !!newProd.is_flash_sale,
      is_best_seller: !!newProd.is_best_seller,
      created_at: new Date().toISOString().split('T')[0]
    };

    productCacheDirty.current = true;
    locallyEditedIds.current.add(fullProd.id);
    locallyDeletedIds.current.delete(fullProd.id);
    setProducts(prev => [fullProd, ...prev]);
    neonDb.bulkInsertProducts([fullProd]).catch(console.warn);
  };

  const bulkAddProducts = (newProducts: Partial<Product>[]) => {
    if (!accountSections.includes('products')) return;
    const fullProducts: Product[] = newProducts.map((p, idx) => ({
      id: p.id || `prod-bulk-${Date.now()}-${idx}`,
      sku: p.sku || `JOE-BULK-${Math.floor(1000 + Math.random() * 9000)}`,
      name_ar: p.name_ar || 'منتج غير مسمى',
      name_en: p.name_en || 'Product',
      brand: p.brand || 'Generic',
      category: p.category || 'accessories',
      condition: p.condition || 'brand_new',
      battery_health: p.battery_health ?? null,
      storage: p.storage || '',
      color_ar: p.color_ar || '',
      color_en: p.color_en || '',
      price: p.price || 0,
      original_price: p.original_price,
      discount_percentage: p.discount_percentage,
      stock: p.stock ?? 5,
      in_stock: (p.stock ?? 5) > 0,
      is_active: true,
      images: p.images && p.images.length > 0 ? p.images : ['/product-placeholder.svg'],
      description_ar: p.description_ar || '',
      description_en: p.description_en || '',
      specs: p.specs || {},
      warranty_months: p.warranty_months || 6,
      rating: 5.0,
      reviews_count: 1,
      created_at: new Date().toISOString().split('T')[0]
    }));

    productCacheDirty.current = true;
    fullProducts.forEach(product => {
      locallyEditedIds.current.add(product.id);
      locallyDeletedIds.current.delete(product.id);
    });
    setProducts(prev => [...fullProducts, ...prev]);
    neonDb.bulkInsertProducts(fullProducts).catch(console.warn);
  };

  const updateProduct = (id: string, updated: Partial<Product>) => {
    if (!accountSections.includes('products')) return;
    const sanitizedImages = Array.isArray(updated.images) ? normalizeProductImages(updated.images) : undefined;
    const changes = { ...updated,
      ...(sanitizedImages ? { images: sanitizedImages } : {}),
      ...(typeof updated.stock === 'number' ? { recorded_stock: updated.stock } : {}),
      ...(sanitizedImages ? { recorded_images: sanitizedImages } : {}) };
    productCacheDirty.current = true;
    locallyEditedIds.current.add(id);
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p));
    neonDb.updateProduct(id, {
      price: updated.price,
      old_price: updated.original_price,
      stock_quantity: updated.stock,
      is_active: updated.is_active,
      is_featured: updated.is_featured,
      product: changes
    }).catch(console.warn);
  };

  const toggleProductVisibility = async (id: string, isActive: boolean): Promise<boolean> => {
    const previous = products.find(p => p.id === id);
    productCacheDirty.current = true;
    locallyEditedIds.current.add(id);
    setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: isActive, in_stock: isActive && p.stock > 0 && p.price > 0 } : p));
    try {
      const ok = await neonDb.toggleProductVisibility(id, isActive);
      if (!ok && previous) {
        setProducts(prev => prev.map(p => p.id === id ? previous : p));
      }
      return ok;
    } catch {
      if (previous) {
        setProducts(prev => prev.map(p => p.id === id ? previous : p));
      }
      return false;
    }
  };

  const trackActivity = (
    actionType: 'search' | 'view_product' | 'view_category' | 'add_to_cart' | 'visit' | 'wishlist',
    targetId?: string,
    metadata?: Record<string, any>
  ) => {
    if (!hasAnalyticsConsent()) return;
    const attr = getOrCaptureVisitorAttribution();
    neonDb.trackActivity({
      sessionId,
      customerId: account?.id,
      actionType,
      targetId,
      metadata: { ...attr, ...readClientTelemetry(), ...(metadata || {}) }
    });
  };

  const deleteProduct = (id: string) => {
    if (!accountSections.includes('products')) return;
    productCacheDirty.current = true;
    locallyDeletedIds.current.add(id);
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const duplicateProduct = (id: string) => {
    if (!accountSections.includes('products')) return;
    const target = products.find(p => p.id === id);
    if (!target) return;
    const clone: Product = {
      ...target,
      id: `prod-copy-${Date.now()}`,
      sku: `${target.sku || 'JOE'}-COPY`,
      name_ar: `${target.name_ar} (نسخة)`,
      name_en: `${target.name_en} (Copy)`,
      created_at: new Date().toISOString().split('T')[0]
    };
    productCacheDirty.current = true;
    locallyEditedIds.current.add(clone.id);
    setProducts(prev => [clone, ...prev]);
    neonDb.bulkInsertProducts([clone]).catch(console.warn);
  };

  // Cart Operations
  const addToCart = (product: Product, quantity = 1, storage?: string, color?: string) => {
    if (product.is_active === false || !product.in_stock || product.price <= 0 || product.stock <= 0 || quantity <= 0) return;
    setCart(prev => {
      const matchIndex = prev.findIndex(item =>
        item.product.id === product.id &&
        item.selected_storage === (storage || product.storage) &&
        item.selected_color === (color || product.color_ar)
      );

      if (matchIndex > -1) {
        const next = [...prev];
        next[matchIndex].quantity = Math.min(product.stock, next[matchIndex].quantity + quantity);
        return next;
      } else {
        return [...prev, {
          product,
          quantity: Math.min(quantity, product.stock),
          selected_storage: storage || product.storage,
          selected_color: color || product.color_ar
        }];
      }
    });
    trackActivity('add_to_cart', product.id, { quantity });
    if (hasAnalyticsConsent()) {
      if (settings.meta_pixel_enabled !== false && initMetaPixel(settings.meta_pixel_id)) {
        trackMetaEvent('AddToCart', {
          content_ids: [product.id],
          content_name: product.name_ar,
          content_type: 'product',
          value: product.price * quantity,
          currency: 'EGP'
        });
      }
      initGa4(settings.ga4_measurement_id);
      trackGa4AddToCart(product, quantity);
    }
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string, storage?: string, color?: string) => {
    setCart(prev => prev.filter(item =>
      !(item.product.id === productId &&
        item.selected_storage === storage &&
        item.selected_color === color)
    ));
  };

  const updateCartQuantity = (productId: string, quantity: number, storage?: string, color?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, storage, color);
      return;
    }
    setCart(prev => prev.map(item => {
      if (item.product.id === productId &&
          item.selected_storage === storage &&
          item.selected_color === color) {
        return { ...item, quantity: Math.min(quantity, item.product.stock) };
      }
      return item;
    }));
  };

  const clearCart = () => setCart([]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  // Wishlist
  const toggleWishlist = (productId: string) => {
    if (!wishlist.includes(productId)) {
      if (account) void neonDb.logWishlistEvent(account.id, productId).catch(console.warn);
      const prod = products.find(p => p.id === productId);
      trackActivity('wishlist', productId, { product_name: prod?.name_ar, brand: prod?.brand, category: prod?.category });
    }
    setWishlist(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  // Order Operations
  const createOrder = async (
    orderData: Omit<Order, 'id' | 'order_number' | 'created_at' | 'updated_at' | 'whatsapp_notification_sent'>
  ): Promise<Order> => {
    if (!deviceIsOnline() || isOfflineCatalog) throw new Error('اتصل بالإنترنت وحدّث الكتالوج قبل تأكيد الطلب. سلتك محفوظة ولن يتم إرسال الطلب تلقائيًا.');
    const checkedItems = orderData.items.map(item => {
      const current = products.find(product => product.id === item.product.id);
      if (!current || current.is_active === false || !current.in_stock || current.price <= 0
        || item.quantity <= 0 || item.quantity > current.stock) {
        throw new Error('أحد المنتجات غير متاح بهذه الكمية. راجع عربة التسوق قبل تأكيد الطلب.');
      }
      if (current.price !== item.product.price) {
        throw new Error('تم تحديث سعر أحد المنتجات. راجع عربة التسوق ثم أكد الطلب.');
      }
      return { ...item, product: current };
    });
    if (!checkedItems.length) throw new Error('عربة التسوق فارغة.');
    const orderNumber = `JOE-${Math.floor(10000 + Math.random() * 90000)}`;
    const idempotencyKey =
      orderData.idempotency_key ||
      (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `idem-${crypto.randomUUID()}`
        : `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
    const newOrder: Order = {
      ...orderData,
      idempotency_key: idempotencyKey,
      items: checkedItems,
      id: `ord-${Date.now()}`,
      order_number: orderNumber,
      invoice_number: `INV-${orderNumber}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      whatsapp_notification_sent: false
    };

    const persisted: any = await neonDb.createOrder(newOrder);
    if (!persisted || (typeof persisted === 'object' && persisted.success === false)) {
      throw new Error('تعذّر حفظ الطلب. سلتك محفوظة، حاول مرة أخرى.');
    }
    if (typeof persisted === 'object') {
      if (persisted.id) newOrder.id = persisted.id;
      if (persisted.order_number) newOrder.order_number = persisted.order_number;
      if (persisted.invoice_number) newOrder.invoice_number = persisted.invoice_number;
      if (Number.isFinite(persisted.subtotal)) newOrder.subtotal = persisted.subtotal;
      if (Number.isFinite(persisted.discount)) newOrder.discount = persisted.discount;
      if (Number.isFinite(persisted.shipping_fee)) newOrder.shipping_fee = persisted.shipping_fee;
      if (Number.isFinite(persisted.total)) newOrder.total = persisted.total;
      if (persisted.checkout_url) newOrder.checkout_url = persisted.checkout_url;
    }

    // Deduct stock
    setProducts(prev => prev.map(p => {
      const orderedItem = orderData.items.find(item => item.product.id === p.id);
      if (orderedItem) {
        const nextStock = Math.max(0, p.stock - orderedItem.quantity);
        return { ...p, stock: nextStock, recorded_stock: nextStock, in_stock: nextStock > 0 };
      }
      return p;
    }));

    // Server handles automatic customer & admin WhatsApp notifications via WhatsApp Pro CRM
    newOrder.whatsapp_notification_sent = true;

    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('joe_last_order', JSON.stringify(newOrder));
      }
    } catch {}

    if (!newOrder.checkout_url && hasAnalyticsConsent()) {
      if (settings.meta_pixel_enabled !== false) {
        trackMetaEvent(
          'Purchase',
          {
            value: newOrder.total,
            currency: 'EGP',
            content_ids: newOrder.items.map(i => i.product.id),
            content_type: 'product',
            num_items: newOrder.items.reduce((sum, i) => sum + i.quantity, 0)
          },
          newOrder.order_number
        );
      }
      trackGa4Purchase(newOrder);
      try {
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(`joe_purchase_tracked_${newOrder.order_number}`, '1');
        }
      } catch {}
    }

    setOrders(prev => [newOrder, ...prev]);
    setCurrentOrder(newOrder);
    clearCart();

    return newOrder;
  };

  const cancelOrder = async (
    orderId: string,
    reason: string,
    cancelledBy: 'customer_whatsapp' | 'admin' = 'admin'
  ): Promise<boolean> => {
    const success = await neonDb.cancelOrder(orderId, reason, cancelledBy);
    if (!success) return false;
    setOrders(prev => prev.map(o => (o.id === orderId || o.order_number === orderId) ? {
      ...o,
      order_status: 'cancelled',
      cancellation_reason: reason,
      cancelled_by: cancelledBy,
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } : o));

    // Restock items in local products state
    const target = orders.find(o => o.id === orderId || o.order_number === orderId);
    if (target) {
      setProducts(prev => prev.map(p => {
        const item = target.items.find(i => i.product.id === p.id);
        if (item) {
          const newStock = p.stock + item.quantity;
          return { ...p, stock: newStock, recorded_stock: newStock, in_stock: newStock > 0 };
        }
        return p;
      }));
    }
    return success;
  };

  const updateOrderStatus = async (
    orderId: string,
    newStatus: OrderStatus,
    courier?: string,
    trackingNo?: string,
    override?: { override: boolean; overrideReason: string }
  ) => {
    if (!accountSections.includes('orders')) throw new Error('هذا الإجراء يحتاج صلاحية الطلبات.');
    const persisted = await neonDb.updateOrderStatus(orderId,newStatus,{courierName:courier,override:override?.override,overrideReason:override?.overrideReason});
    if(!persisted.success) return persisted;

    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          order_status: newStatus,
          courier_name: courier || o.courier_name,
          tracking_number: trackingNo || o.tracking_number,
          updated_at: new Date().toISOString()
        };
      }
      return o;
    }));
    return {success:true};
  };

  const updatePaymentStatus = async (orderId: string, status: 'unpaid' | 'paid' | 'verified') => {
    if (!accountSections.includes('orders')) throw new Error('هذا الإجراء يحتاج صلاحية الطلبات.');
    await neonDb.updateOrderState(orderId, { payment_status: status });

    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return { ...o, payment_status: status, updated_at: new Date().toISOString() };
      }
      return o;
    }));
  };

  const manualSendWhatsAppNotification = async (
    order: Order,
    type: WhatsAppNotification['type'],
    customText?: string
  ) => {
    let fallbackText = customText || '';
    if (!fallbackText) {
      if (type === 'order_confirmed') fallbackText = buildOrderConfirmationMessage(order, settings);
      else if (type === 'payment_verified') fallbackText = buildPaymentConfirmedMessage(order, settings);
      else if (type === 'shipped') fallbackText = buildShippedMessage(order, order.courier_name, order.tracking_number);
      else if (type === 'out_for_delivery') fallbackText = buildOutForDeliveryMessage(order);
      else if (type === 'delivered') fallbackText = buildDeliveredMessage(order);
      else if (type === 'review_request') fallbackText = buildReviewRequestMessage(order);
    }

    const recipient = order.customer_whatsapp || order.customer_phone;
    const res = await neonDb.sendOrderWhatsApp({
      orderId: order.id,
      type,
      customText: fallbackText,
      recipient
    });
    recordWhatsAppNotification({
      id: `notif-${Date.now()}`,
      order_id: order.id,
      phone: recipient,
      type,
      text: fallbackText,
      sent_at: new Date().toISOString(),
      status: res.success ? 'sent' : 'failed',
      error_message: res.error
    });
    refreshWhatsAppLogs();
    return { success: Boolean(res.success), simulated: !res.success, error: res.error };
  };

  const getOrderById = (idOrNumber: string): Order | undefined => {
    const clean = idOrNumber.trim().toUpperCase().replace('#', '');
    return orders.find(o =>
      o.id === idOrNumber ||
      o.order_number.toUpperCase() === clean ||
      o.customer_phone.includes(idOrNumber)
    );
  };

  const contextPayload: StoreContextType = {
    products,
    isCatalogLoading,
    isOfflineCatalog,
    catalogSavedAt,
    refreshCatalog: () => setConnectionVersion(value => value + 1),
    isCatalogReadyForReports: catalogLoaded,
    addProduct,
    bulkAddProducts,
    updateProduct,
    deleteProduct,
    duplicateProduct,
    toggleProductVisibility,
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    cartCount,
    cartSubtotal,
    isCartOpen,
    setIsCartOpen,
    wishlist,
    toggleWishlist,
    isInWishlist,
    orders,
    currentOrder,
    createOrder,
    cancelOrder,
    updateOrderStatus,
    updatePaymentStatus,
    getOrderById,
    sessionId,
    recentlyViewedIds,
    trackActivity,
    activeCarts,
    refreshActiveCarts,
    currentTab,
    navigate,
    selectedProductId,
    quickViewProduct,
    setQuickViewProduct,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    settings,
    updateSettings,
    themeMode,
    toggleThemeMode,
    whatsappLogs,
    refreshWhatsAppLogs,
    manualSendWhatsAppNotification
  };

  return (
    <StoreContext.Provider value={contextPayload}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
