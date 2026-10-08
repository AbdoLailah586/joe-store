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
import {
  readStorage, writeStorage, removeStorage, writeStoredJson, readStoredArray, readStoredSettings,
  isStoredProduct, isStoredCartItem, isStoredOrder
} from '../utils/browserStorage';

export type AppTab = 
  | 'home' 
  | 'catalog' 
  | 'product' 
  | 'cart' 
  | 'checkout' 
  | 'order-success' 
  | 'track-order' 
  | 'profile'
  | 'admin';

interface StoreContextType {
  products: Product[];
  isCatalogLoading: boolean;
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
  updateOrderStatus: (orderId: string, newStatus: OrderStatus, courier?: string, trackingNo?: string) => Promise<void>;
  updatePaymentStatus: (orderId: string, status: 'unpaid' | 'paid' | 'verified') => Promise<void>;
  getOrderById: (orderIdOrNumber: string) => Order | undefined;

  // Analytics & Personalization
  sessionId: string;
  trackActivity: (actionType: 'search' | 'view_product' | 'view_category' | 'add_to_cart', targetId?: string, metadata?: Record<string, any>) => void;
  activeCarts: ActiveCartRecord[];
  refreshActiveCarts: () => Promise<void>;

  // Navigation & Search
  currentTab: AppTab;
  navigate: (tab: AppTab, productId?: string, options?: { replace?: boolean; category?: CategoryKey; search?: string }) => void;
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
  const CURRENT_VERSION = 'v5_researched_excel_catalog';
  const productCacheDirty = useRef(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const locallyEditedIds = useRef(new Set<string>());
  const locallyDeletedIds = useRef(new Set(readStoredArray('joe_store_product_deletions',
    (value): value is string => typeof value === 'string')));
  // The bundled catalog is already available offline. Cache only administrator edits,
  // leaving browser storage available for carts, account preferences and orders.
  const [products, setProducts] = useState<Product[]>(() => {
    const savedVersion = readStorage('joe_store_catalog_ver');
    // Previous builds generated Excel entries with guessed stock/prices. Keep
    // their cache on disk, but use the reconciled database entries for those IDs.
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
      // Older/partial caches may contain administrator edits. Retain them while
      // filling missing catalog entries from the current bundled inventory.
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
    const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    neonDb.syncActiveCart({
      sessionId,
      items: cart,
      subtotal
    }).catch(console.warn).finally(() => setIsCatalogLoading(false));
  }, [cart, sessionId]);

  // Wishlist State
  const [wishlist, setWishlist] = useState<string[]>(() =>
    readStoredArray('joe_store_wishlist', (value): value is string => typeof value === 'string'));

  useEffect(() => {
    writeStoredJson('joe_store_wishlist', wishlist);
  }, [wishlist]);

  // Orders State
  const [orders, setOrders] = useState<Order[]>(() => readStoredArray('joe_store_orders', isStoredOrder));

  useEffect(() => {
    writeStoredJson('joe_store_orders', orders);
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

  // Initial load from Neon PostgreSQL (with graceful fallback to local cache)
  useEffect(() => {
    // 1. Fetch live products from Neon
    neonDb.getAllProducts({ includeHidden: true }).then(dbProds => {
      if (dbProds && dbProds.length > 0) {
        setProducts(previous => {
          const previousById = new Map(previous.map(product => [product.id, product]));
          const dbIds = new Set(dbProds.map(product => product.id));
          return [
            ...dbProds.filter(product => !locallyDeletedIds.current.has(product.id))
              .map(product => locallyEditedIds.current.has(product.id)
                ? previousById.get(product.id) || product : product),
            ...previous.filter(product => locallyEditedIds.current.has(product.id)
              && !dbIds.has(product.id) && !locallyDeletedIds.current.has(product.id))
          ];
        });
        setCatalogLoaded(true);
      }
    }).catch(console.warn);

    // 2. Fetch live orders from Neon
    neonDb.getOrders().then(dbOrders => {
      if (dbOrders && dbOrders.length > 0) {
        setOrders(dbOrders);
      }
    }).catch(console.warn);

    // 3. Load active carts for CRM
    refreshActiveCarts();
  }, []);

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

  // Settings State
  const [settings, setSettings] = useState<StoreSettings>(() => {
    const merged = readStoredSettings(defaultSettings);
    if (!merged.tiktok_url || (merged.tiktok_url.includes('@joestore') && !merged.tiktok_url.includes('2026'))) {
      merged.tiktok_url = 'https://www.tiktok.com/@joestore2026';
      writeStoredJson('joe_store_settings', merged);
    }
    return merged;
  });

  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      writeStoredJson('joe_store_settings', updated);
      return updated;
    });
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.active_theme || 'royal_gold');
    if (settings.theme_mode === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, [settings.active_theme, settings.theme_mode]);

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

  const navigate = (tab: AppTab, productId?: string, options?: { replace?: boolean; category?: CategoryKey; search?: string }) => {
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
    } else if (tab === 'catalog') {
      const cat = options?.category || selectedCategory;
      const q = options?.search !== undefined ? options.search : searchQuery;
      const params = new URLSearchParams();
      if (cat && cat !== 'all') params.set('category', cat);
      if (q) params.set('q', q);
      const queryStr = params.toString();
      targetPath = queryStr ? `/catalog?${queryStr}` : '/catalog';
    } else if (tab === 'checkout') {
      targetPath = '/checkout';
    } else if (tab === 'order-success') {
      targetPath = '/order-success';
    } else if (tab === 'track-order') {
      targetPath = '/track-order';
    } else if (tab === 'profile') {
      targetPath = '/profile';
    } else if (tab === 'admin') {
      targetPath = '/admin';
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Product Operations
  const addProduct = (newProd: Partial<Product>) => {
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
      price: newProd.price || 0,
      original_price: newProd.original_price,
      discount_percentage: newProd.discount_percentage,
      stock: newProd.stock || 1,
      in_stock: (newProd.stock || 1) > 0,
      images: newProd.images && newProd.images.length > 0 ? newProd.images : ['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80'],
      description_ar: newProd.description_ar || '',
      description_en: newProd.description_en || '',
      specs: newProd.specs || {},
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
  };

  const bulkAddProducts = (newProducts: Partial<Product>[]) => {
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
      images: p.images && p.images.length > 0 ? p.images : ['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80'],
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
    productCacheDirty.current = true;
    locallyEditedIds.current.add(id);
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
    neonDb.updateProduct(id, {
      price: updated.price,
      old_price: updated.original_price,
      stock_quantity: updated.stock,
      is_active: updated.is_active,
      is_featured: updated.is_featured,
      product: updated
    }).catch(console.warn);
  };

  const toggleProductVisibility = async (id: string, isActive: boolean): Promise<boolean> => {
    productCacheDirty.current = true;
    locallyEditedIds.current.add(id);
    setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: isActive, in_stock: isActive && p.stock > 0 } : p));
    return await neonDb.toggleProductVisibility(id, isActive);
  };

  const trackActivity = (
    actionType: 'search' | 'view_product' | 'view_category' | 'add_to_cart',
    targetId?: string,
    metadata?: Record<string, any>
  ) => {
    neonDb.trackActivity({
      sessionId,
      actionType,
      targetId,
      metadata
    });
  };

  const deleteProduct = (id: string) => {
    productCacheDirty.current = true;
    locallyDeletedIds.current.add(id);
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const duplicateProduct = (id: string) => {
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
    setWishlist(prev => 
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  // Order Operations
  const createOrder = async (
    orderData: Omit<Order, 'id' | 'order_number' | 'created_at' | 'updated_at' | 'whatsapp_notification_sent'>
  ): Promise<Order> => {
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
    const newOrder: Order = {
      ...orderData,
      items: checkedItems,
      id: `ord-${Date.now()}`,
      order_number: orderNumber,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      whatsapp_notification_sent: false
    };

    // Deduct stock
    setProducts(prev => prev.map(p => {
      const orderedItem = orderData.items.find(item => item.product.id === p.id);
      if (orderedItem) {
        const nextStock = Math.max(0, p.stock - orderedItem.quantity);
        return { ...p, stock: nextStock, in_stock: nextStock > 0 };
      }
      return p;
    }));

    // Trigger WhatsApp notification automatically if enabled
    let sentNotice = false;
    if (settings.auto_send_on_order && (newOrder.customer_whatsapp || newOrder.customer_phone)) {
      const msgText = buildOrderConfirmationMessage(newOrder, settings);
      const recipient = newOrder.customer_whatsapp || newOrder.customer_phone;
      const res = await sendWhatsAppMessage(recipient, msgText, settings);
      
      recordWhatsAppNotification({
        id: `notif-${Date.now()}`,
        order_id: newOrder.id,
        phone: recipient,
        type: 'order_confirmed',
        text: msgText,
        sent_at: new Date().toISOString(),
        status: res.success ? 'sent' : res.simulated ? 'simulated' : 'failed',
        error_message: res.error
      });
      refreshWhatsAppLogs();
      sentNotice = true;
    }

    newOrder.whatsapp_notification_sent = sentNotice;

    setOrders(prev => [newOrder, ...prev]);
    setCurrentOrder(newOrder);
    clearCart();

    // Async persist to Neon PostgreSQL
    neonDb.createOrder(newOrder).catch(console.warn);

    return newOrder;
  };

  const cancelOrder = async (
    orderId: string, 
    reason: string, 
    cancelledBy: 'customer_whatsapp' | 'admin' = 'admin'
  ): Promise<boolean> => {
    const success = await neonDb.cancelOrder(orderId, reason, cancelledBy);
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
          return { ...p, stock: newStock, in_stock: newStock > 0 };
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
    trackingNo?: string
  ) => {
    let targetOrder: Order | undefined;

    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const updated: Order = {
          ...o,
          order_status: newStatus,
          courier_name: courier || o.courier_name,
          tracking_number: trackingNo || o.tracking_number,
          updated_at: new Date().toISOString()
        };
        targetOrder = updated;
        return updated;
      }
      return o;
    }));

    if (targetOrder && settings.auto_send_on_status_change) {
      let msgText = '';
      let notifType: WhatsAppNotification['type'] = 'custom';

      if (newStatus === 'shipped') {
        msgText = buildShippedMessage(targetOrder, courier, trackingNo);
        notifType = 'shipped';
      } else if (newStatus === 'out_for_delivery') {
        msgText = buildOutForDeliveryMessage(targetOrder);
        notifType = 'out_for_delivery';
      } else if (newStatus === 'delivered') {
        msgText = buildDeliveredMessage(targetOrder);
        notifType = 'delivered';
      }

      if (msgText) {
        const recipient = targetOrder.customer_whatsapp || targetOrder.customer_phone;
        const res = await sendWhatsAppMessage(recipient, msgText, settings);
        recordWhatsAppNotification({
          id: `notif-${Date.now()}`,
          order_id: targetOrder.id,
          phone: recipient,
          type: notifType,
          text: msgText,
          sent_at: new Date().toISOString(),
          status: res.success ? 'sent' : res.simulated ? 'simulated' : 'failed',
          error_message: res.error
        });
        refreshWhatsAppLogs();
      }
    }
  };

  const updatePaymentStatus = async (orderId: string, status: 'unpaid' | 'paid' | 'verified') => {
    let targetOrder: Order | undefined;

    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const updated = { ...o, payment_status: status, updated_at: new Date().toISOString() };
        targetOrder = updated;
        return updated;
      }
      return o;
    }));

    if (targetOrder && status === 'verified' && settings.auto_send_on_status_change) {
      const msgText = buildPaymentConfirmedMessage(targetOrder, settings);
      const recipient = targetOrder.customer_whatsapp || targetOrder.customer_phone;
      const res = await sendWhatsAppMessage(recipient, msgText, settings);
      recordWhatsAppNotification({
        id: `notif-${Date.now()}`,
        order_id: targetOrder.id,
        phone: recipient,
        type: 'payment_verified',
        text: msgText,
        sent_at: new Date().toISOString(),
        status: res.success ? 'sent' : res.simulated ? 'simulated' : 'failed',
        error_message: res.error
      });
      refreshWhatsAppLogs();
    }
  };

  const manualSendWhatsAppNotification = async (
    order: Order, 
    type: WhatsAppNotification['type'], 
    customText?: string
  ) => {
    let msgText = customText || '';
    if (!msgText) {
      if (type === 'order_confirmed') msgText = buildOrderConfirmationMessage(order, settings);
      else if (type === 'payment_verified') msgText = buildPaymentConfirmedMessage(order, settings);
      else if (type === 'shipped') msgText = buildShippedMessage(order, order.courier_name, order.tracking_number);
      else if (type === 'out_for_delivery') msgText = buildOutForDeliveryMessage(order);
      else if (type === 'delivered') msgText = buildDeliveredMessage(order);
      else if (type === 'review_request') msgText = buildReviewRequestMessage(order);
    }

    const recipient = order.customer_whatsapp || order.customer_phone;
    const res = await sendWhatsAppMessage(recipient, msgText, settings);
    recordWhatsAppNotification({
      id: `notif-${Date.now()}`,
      order_id: order.id,
      phone: recipient,
      type,
      text: msgText,
      sent_at: new Date().toISOString(),
      status: res.success ? 'sent' : res.simulated ? 'simulated' : 'failed',
      error_message: res.error
    });
    refreshWhatsAppLogs();
    return res;
  };

  const getOrderById = (idOrNumber: string): Order | undefined => {
    const clean = idOrNumber.trim().toUpperCase().replace('#', '');
    return orders.find(o => 
      o.id === idOrNumber || 
      o.order_number.toUpperCase() === clean ||
      o.customer_phone.includes(idOrNumber)
    );
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        isCatalogLoading,
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
        whatsappLogs,
        refreshWhatsAppLogs,
        manualSendWhatsAppNotification
      }}
    >
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
