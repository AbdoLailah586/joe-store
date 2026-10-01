import React, { createContext, useContext, useState, useEffect } from 'react';
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
  addProduct: (product: Partial<Product>) => void;
  bulkAddProducts: (newProducts: Partial<Product>[]) => void;
  updateProduct: (id: string, updated: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  duplicateProduct: (id: string) => void;

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

  // Orders
  orders: Order[];
  currentOrder: Order | null;
  createOrder: (orderData: Omit<Order, 'id' | 'order_number' | 'created_at' | 'updated_at' | 'whatsapp_notification_sent'>) => Promise<Order>;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus, courier?: string, trackingNo?: string) => Promise<void>;
  updatePaymentStatus: (orderId: string, status: 'unpaid' | 'paid' | 'verified') => Promise<void>;
  getOrderById: (orderIdOrNumber: string) => Order | undefined;

  // Navigation & Search
  currentTab: AppTab;
  navigate: (tab: AppTab, productId?: string) => void;
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

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Products State
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('joe_store_products');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return initialProducts;
  });

  // Save products to local storage
  useEffect(() => {
    localStorage.setItem('joe_store_products', JSON.stringify(products));
  }, [products]);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('joe_store_cart');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('joe_store_cart', JSON.stringify(cart));
  }, [cart]);

  // Wishlist State
  const [wishlist, setWishlist] = useState<string[]>(() => {
    const saved = localStorage.getItem('joe_store_wishlist');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('joe_store_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  // Orders State
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('joe_store_orders');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('joe_store_orders', JSON.stringify(orders));
  }, [orders]);

  // Settings State
  const [settings, setSettings] = useState<StoreSettings>(() => {
    const saved = localStorage.getItem('joe_store_settings');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        // Force migration of outdated TikTok URLs to official @joestore2026
        const tiktok_url = (!parsed.tiktok_url || (parsed.tiktok_url.includes('@joestore') && !parsed.tiktok_url.includes('2026')))
          ? 'https://www.tiktok.com/@joestore2026'
          : parsed.tiktok_url;

        const merged: StoreSettings = { 
          ...defaultSettings, 
          ...parsed,
          tiktok_url
        };

        if (parsed.tiktok_url !== tiktok_url) {
          localStorage.setItem('joe_store_settings', JSON.stringify(merged));
        }

        return merged;
      } catch (e) {}
    }
    return defaultSettings;
  });

  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('joe_store_settings', JSON.stringify(updated));
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

  // Navigation State
  const [currentTab, setCurrentTab] = useState<AppTab>('home');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('all');
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);

  const navigate = (tab: AppTab, productId?: string) => {
    setCurrentTab(tab);
    if (productId) {
      setSelectedProductId(productId);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      images: p.images && p.images.length > 0 ? p.images : ['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80'],
      description_ar: p.description_ar || '',
      description_en: p.description_en || '',
      specs: p.specs || {},
      warranty_months: p.warranty_months || 6,
      rating: 5.0,
      reviews_count: 1,
      created_at: new Date().toISOString().split('T')[0]
    }));

    setProducts(prev => [...fullProducts, ...prev]);
  };

  const updateProduct = (id: string, updated: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
  };

  const deleteProduct = (id: string) => {
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
    setProducts(prev => [clone, ...prev]);
  };

  // Cart Operations
  const addToCart = (product: Product, quantity = 1, storage?: string, color?: string) => {
    setCart(prev => {
      const matchIndex = prev.findIndex(item => 
        item.product.id === product.id && 
        item.selected_storage === (storage || product.storage) &&
        item.selected_color === (color || product.color_ar)
      );

      if (matchIndex > -1) {
        const next = [...prev];
        next[matchIndex].quantity += quantity;
        return next;
      } else {
        return [...prev, {
          product,
          quantity,
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
        return { ...item, quantity };
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
    const orderNumber = `JOE-${Math.floor(10000 + Math.random() * 90000)}`;
    const newOrder: Order = {
      ...orderData,
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
    return newOrder;
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
        addProduct,
        bulkAddProducts,
        updateProduct,
        deleteProduct,
        duplicateProduct,
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
        updateOrderStatus,
        updatePaymentStatus,
        getOrderById,
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
