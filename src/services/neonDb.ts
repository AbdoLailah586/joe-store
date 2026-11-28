/// <reference types="vite/client" />
import { decodeDeliveryNotes, encodeDeliveryNotes, formatDeliveryAddress } from '../utils/deliveryAddress';
import { Product, Order, CategoryKey, OrderStatus, PaymentMethod, PaymentStatus } from '../types';

async function callStore(method: string, args: any[] = []) {
  const response = await fetch('/api/store', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({method,args}) });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || 'تعذر تنفيذ الطلب. راجع صلاحية حسابك.'),{code:data.code});
  return data.result;
}

async function callPublicStoreGet(method: string, query: Record<string, string | number | undefined> = {}) {
  const searchParams = new URLSearchParams({ method });
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') searchParams.set(key, String(value));
  }
  const response = await fetch(`/api/store?${searchParams.toString()}`, { method: 'GET', credentials: 'same-origin' });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || 'تعذر تنفيذ الطلب. راجع صلاحية حسابك.'),{code:data.code});
  return data.result;
}

async function callAction(method: string,args: any[] = []) {try{return await callStore(method,args)}catch(e:any){return {success:false,error:e.message,code:e.code}}}
export interface ActiveCartRecord {
  session_id: string;
  customer_name?: string;
  customer_phone?: string;
  items: any[];
  subtotal: number;
  is_abandoned: boolean;
  recovered: boolean;
  last_updated_at: string;
}

export interface CustomerActivityRecord {
  id: number;
  session_id: string;
  customer_id?: string;
  action_type: 'search' | 'view_product' | 'view_category' | 'add_to_cart';
  target_id?: string;
  metadata: Record<string, any>;
  created_at: string;
}

function sanitizeRowSocialLinks(raw: any): Product['social_links'] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out: NonNullable<Product['social_links']> = {};
  for (const k of ['facebook', 'tiktok', 'instagram'] as const) {
    const v = typeof raw[k] === 'string' ? raw[k].trim() : '';
    if (!v) continue;
    try {
      const u = new URL(v);
      if (u.protocol === 'http:' || u.protocol === 'https:') out[k] = u.toString();
    } catch {}
  }
  return Object.keys(out).length ? out : undefined;
}

// Convert PostgreSQL DB row to frontend Product type
function mapRowToProduct(row: any): Product {
  const isPreowned = Boolean(row.is_preowned);
  let details: Partial<Product> = {};
  try {
    const saved = row.specs?.__product_data;
    details = typeof saved === 'string' ? JSON.parse(saved) : (saved || {});
    if (!details || typeof details !== 'object' || Array.isArray(details)) details = {};
  } catch { details = {}; }
  const publicSpecs = Object.fromEntries(Object.entries(row.specs || {})
    .filter(([key, value]) => !key.startsWith('__') && !key.startsWith('description_') && typeof value === 'string'));
  const imported = row.id?.startsWith('prod-pos-');
  return {
    id: row.id,
    sku: details.sku || row.id.toUpperCase(),
    model_name: details.model_name,
    catalog_status: details.catalog_status,
    image_is_illustrative: details.image_is_illustrative,
    data_sources: details.data_sources,
    social_links: sanitizeRowSocialLinks(details.social_links),
    source_row: details.source_row,
    source_item_code: details.source_item_code,
    source_name: details.source_name,
    raw_source_stock: details.raw_source_stock,
    name_ar: row.name_ar,
    name_en: row.name_en,
    category: row.category as CategoryKey,
    brand: row.brand,
    condition: details.condition || (isPreowned ? 'mint' : imported ? 'unknown' : 'brand_new'),
    battery_health: row.battery_health ? parseInt(String(row.battery_health).replace('%', '')) : undefined,
    storage: details.storage || (Array.isArray(row.storage_options) && row.storage_options.length > 0 ? row.storage_options[0] : undefined),
    available_storages: details.available_storages || (Array.isArray(row.storage_options) ? row.storage_options : []),
    color_ar: details.color_ar || (Array.isArray(row.colors) && row.colors.length > 0 ? row.colors[0]?.name_ar : undefined),
    color_en: details.color_en || (Array.isArray(row.colors) && row.colors.length > 0 ? row.colors[0]?.name_en : undefined),
    color_hex: details.color_hex || (Array.isArray(row.colors) && row.colors.length > 0 ? row.colors[0]?.hex : undefined),
    available_colors: details.available_colors || (Array.isArray(row.colors) ? row.colors : []),
    price: Number(row.price),
    original_price: row.old_price ? Number(row.old_price) : undefined,
    cost_price: details.cost_price != null ? Number(details.cost_price)
      : row.cost_price != null ? Number(row.cost_price) : undefined,
    discount_percentage: row.old_price && Number(row.old_price) > Number(row.price) 
      ? Math.round(((Number(row.old_price) - Number(row.price)) / Number(row.old_price)) * 100) 
      : undefined,
    stock: Math.max(0, row.stock_quantity ?? 0),
    recorded_stock: row.stock_quantity == null ? undefined : Number(row.stock_quantity),
    recorded_images: Array.isArray(row.images) ? row.images.filter(url => typeof url === 'string' && url.trim()) : [],
    in_stock: (row.stock_quantity ?? 0) > 0 && Number(row.price) > 0 && (row.is_active ?? true),
    is_active: row.is_active ?? true,
    images: Array.isArray(row.images) && row.images.length > 0 ? row.images : ['/product-placeholder.svg'],
    description_ar: details.description_ar || row.specs?.description_ar || row.name_ar,
    description_en: details.description_en || row.specs?.description_en || row.name_en,
    specs: publicSpecs as Record<string, string>,
    warranty_months: details.warranty_months ?? (Number.parseInt(row.warranty, 10) || 0),
    rating: details.rating ?? 0,
    reviews_count: details.reviews_count ?? 0,
    about_item: details.about_item,
    quick_specs: details.quick_specs,
    feature_banners: details.feature_banners,
    customer_reviews: details.customer_reviews,
    rating_breakdown: details.rating_breakdown,
    is_featured: Boolean(row.is_featured),
    is_best_seller: Boolean(row.is_featured),
    is_flash_sale: Boolean(row.old_price && Number(row.old_price) > Number(row.price)),
    created_at: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : '2026-03-01'
  };
}

// Convert PostgreSQL DB row to frontend Order type
export function mapRowToOrder(r: any): Order {
  const delivery = decodeDeliveryNotes(r.notes);
  return {
    ...delivery,
    id: r.id,
    order_number: r.order_number || r.id,
    customer_name: r.customer_name || 'عميل جو ستور',
    customer_phone: r.customer_phone || '01554826209',
    customer_whatsapp: delivery.customer_whatsapp || r.customer_phone || '',
    customer_email: r.customer_email || undefined,
    governorate: r.governorate || 'الدقهلية - المنصورة',
    city: delivery.city || r.city || '',
    address_details: delivery.address_details || r.address || '',
    notes: delivery.notes,
    items: Array.isArray(r.items) ? r.items : [],
    subtotal: Number(r.subtotal || 0),
    shipping_fee: Number(r.shipping_fee || 0),
    discount: Number(r.discount || 0),
    coupon_code: r.coupon_code || undefined,
    payment_receipt_url: r.payment_receipt_url || undefined,
    idempotency_key: r.idempotency_key || undefined,
    invoice_number: r.invoice_number || (r.order_number ? `INV-${r.order_number}` : undefined),
    total: Number(r.total || 0),
    payment_method: (r.payment_method || 'cod') as PaymentMethod,
    payment_status: (r.payment_status || 'unpaid') as PaymentStatus,
    payment_reference: r.payment_reference || undefined,
    order_status: (r.status || 'pending') as OrderStatus,
    tracking_number: r.order_number || r.id,
    whatsapp_notification_sent: true,
    cancellation_reason: r.cancellation_reason || undefined,
    cancelled_by: r.cancelled_by || undefined,
    cancelled_at: r.cancelled_at ? new Date(r.cancelled_at).toISOString() : undefined,
    created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
  };
}

export const neonDb = {
async getAuditLog(limit = 100): Promise<any[]> { return callStore("getAuditLog", [limit]); },
async getPickingList(): Promise<Order[]> { return callStore("getPickingList", []); },
async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    options?: { courierName?: string; packedBy?: string; override?: boolean; overrideReason?: string; actor?: { id: string; name: string } }
  ): Promise<{ success: boolean; error?: string; code?: string }> { return callAction("updateOrderStatus", [orderId,status,options]); },
async confirmPacking(
    orderId: string,
    scannedCodes: string[],
    options?: { courierName?: string; override?: boolean; reason?: string; actor?: { id: string; name: string } }
  ): Promise<{ success: boolean; error?: string }> { return callAction("confirmPacking", [orderId,scannedCodes,options]); },
async getDeliveryBoard(): Promise<Order[]> { return callStore("getDeliveryBoard", []); },
async recordDeliveryRefusal(
    orderId: string,
    reason: string,
    courierName: string | undefined,
    actor?: { id: string; name: string }
  ): Promise<{ success: boolean; error?: string }> { return callAction("recordDeliveryRefusal", [orderId,reason,courierName,actor]); },
async getRefusalHistory(phone: string): Promise<any[]> { return callStore("getRefusalHistory", [phone]); },
async getAllRefusals(limit = 100): Promise<any[]> { return callStore("getAllRefusals", [limit]); },
async addSupplierQuote(productId: string, supplierName: string, price: number, actor?: { id: string }): Promise<boolean> { return callStore("addSupplierQuote", [productId,supplierName,price,actor]); },
async getSupplierQuotes(productId: string): Promise<any[]> { return callStore("getSupplierQuotes", [productId]); },
async findOrCreateSupportTicket(phone: string, name?: string, subject?: string, orderId?: string): Promise<any> { return callStore("findOrCreateSupportTicket", [phone,name,subject,orderId]); },
async createSupportTicket(phone: string, message: string, name?: string, subject?: string, orderId?: string): Promise<{ success: boolean; ticket?: any; error?: string }> { return callStore("createSupportTicket", [phone,message,name,subject,orderId]); },
async listSupportTickets(status?: string): Promise<any[]> { return callStore("listSupportTickets", [status]); },
async getSupportTicket(ticketId: string): Promise<{ ticket: any; messages: any[] } | null> { return callStore("getSupportTicket", [ticketId]); },
async replySupportTicket(ticketId: string, senderType: 'staff' | 'customer', body: string, actor?: { id: string; name: string }): Promise<{ success: boolean; error?: string }> { return callStore("replySupportTicket", [ticketId,senderType,body,actor]); },
async escalateSupportTicket(ticketId: string, reason: string, actor?: { id: string; name: string }): Promise<{ success: boolean; error?: string }> { return callStore("escalateSupportTicket", [ticketId,reason,actor]); },
async closeSupportTicket(ticketId: string, actor?: { id: string; name: string }): Promise<{ success: boolean; error?: string }> { return callStore("closeSupportTicket", [ticketId,actor]); },
async rateSupportTicket(ticketId: string, rating: number, comment?: string): Promise<{ success: boolean; error?: string }> { return callStore("rateSupportTicket", [ticketId,rating,comment]); },
async logWishlistEvent(customerId: string, productId: string): Promise<void> { return callStore("logWishlistEvent", [customerId,productId]); },
async getWishlistGap(limit = 5): Promise<{ product_id: string; name_ar: string; interest_count: number }[]> { return callStore("getWishlistGap", [limit]); },
async setupTotp(userId: string): Promise<{ success: boolean; secret?: string; otpauthUrl?: string; error?: string }> { return callAction("setupTotp", [userId]); },
async confirmTotp(userId: string, code: string): Promise<{ success: boolean; error?: string }> { return callAction("confirmTotp", [userId,code]); },
async disableTotp(userId: string, password: string): Promise<{ success: boolean; error?: string }> { return callAction("disableTotp", [userId,password]); },
async verifyTotpLogin(_email: string, code?: string): Promise<any> { return callStore('completeSecondFactor',[code]); },
  async getCoverOverrides(): Promise<Record<string, any>> { return callStore('getCoverOverrides'); },
  async saveCoverOverride(id: string, data: Record<string, any>): Promise<{success:boolean;error?:string}> { return callStore('saveCoverOverride',[id,data]); },
  async getCoverAdditions(): Promise<any[]> { return callStore('getCoverAdditions'); },
  async addCoverEntry(data: { brand: string; model: string; style?: string; color?: string; location?: string; notes?: string }): Promise<{success:boolean;entry?:any;error?:string}> { return callStore('addCoverEntry',[data]); },
  async getScreenAdditions(): Promise<any[]> { return callStore('getScreenAdditions'); },
  async addScreenEntry(data: { boxCode: string; screenTitle: string; category?: string; shelfLocation?: string; notes?: string; models: { brand: string; brandAr?: string; name: string }[] }): Promise<{success:boolean;entry?:any;error?:string}> { return callStore('addScreenEntry',[data]); },
  async getSession(): Promise<{ success: boolean; user?: any }> { return callStore('getSession'); },
  async logoutSession(): Promise<void> { return callStore('logout'); },
  async updateUserAccess(userId: string, access: { role: 'admin' | 'customer'; permissions: string[] }): Promise<{success:boolean; user?:any; error?:string}> { return callStore('updateUserAccess',[userId,access]); },
  async trackOrder(number: string, phone: string): Promise<Order | null> { return callStore('trackOrder',[number,phone]); },
  async updateOrderState(id: string, changes: Record<string, string>): Promise<boolean> { return callStore('updateOrderState',[id,changes]); },
  async getAllProducts(params?: { includeHidden?: boolean }): Promise<Product[]> {
    const pageSize = 300;
    const first = await this.getProducts({ limit: pageSize, includeHidden: params?.includeHidden });
    if (first.total <= pageSize) return first.products;
    const remaining = await Promise.all(Array.from(
      { length: Math.ceil(first.total / pageSize) - 1 },
      (_, index) => this.getProducts({ limit: pageSize, offset: (index + 1) * pageSize,
        includeHidden: params?.includeHidden })
    ));
    const products = [...first.products, ...remaining.flatMap(page => page.products)];
    if (new Set(products.map(product => product.id)).size !== first.total) {
      throw new Error('The catalog could not be loaded completely; retaining the previous catalog.');
    }
    return products;
  },
  /**
   * 1. Get products for client catalog with pagination and search
   * Scalable for 12,000+ items using SQL indexes and LIMIT/OFFSET
   */
  async getProducts(params?: {
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
    includeHidden?: boolean;
  }): Promise<{ products: Product[]; total: number }> {
    if (params?.includeHidden) {
      return await callStore('getProducts', [params]);
    }
    return await callPublicStoreGet('getProducts', {
      limit: Math.max(1, Math.min(300, Number(params?.limit) || 50)),
      offset: Math.max(0, Number(params?.offset) || 0),
      category: params?.category && params.category !== 'all' ? params.category : undefined,
      search: params?.search?.trim() || undefined
    });
  },

  /**
   * 2. Toggle Product Visibility (Show / Hide in catalog)
   */
  async toggleProductVisibility(productId: string, isActive: boolean): Promise<boolean> { return await callStore('toggleProductVisibility', [productId,isActive]); },

  /**
   * 3. Update Product Stock and Price
   */
  async updateProduct(productId: string, updates: Partial<{
    price: number;
    old_price: number;
    stock_quantity: number;
    is_active: boolean;
    is_featured: boolean;
    product: Partial<Product>;
  }>, actor?: { id: string; name: string }): Promise<boolean> { return callStore('updateProduct',[productId,updates]); },

  /**
   * 4. Bulk Insert Products from Excel (Scales to 12,000+ items using chunked batches)
   */
  async bulkInsertProducts(products: Product[]): Promise<{ inserted: number; errors: number }> { return await callStore('bulkInsertProducts', [products]); },

  /**
   * 5. Record Customer Activity (Behavioral Signals for Personalization Engine)
   */
  async trackActivity(activity: {
    sessionId: string;
    customerId?: string;
    actionType: 'search' | 'view_product' | 'view_category' | 'add_to_cart' | 'visit' | 'wishlist';
    targetId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> { return await callStore('trackActivity', [activity]); },

  /**
   * 6. Sync Active Cart & Detect Abandoned Carts in Real-Time
   */
  async syncActiveCart(cart: {
    sessionId: string;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    items: any[];
    subtotal: number;
    attribution?: Record<string, any>;
  }): Promise<void> { return await callStore('syncActiveCart', [cart]); },

  /**
   * 7. Get Active and Abandoned Carts for Admin CRM
   */
  async getActiveCarts(): Promise<ActiveCartRecord[]> { return await callStore('getActiveCarts', []); },

  /**
   * 8. Create Order in Neon & Auto-Deduct Stock (optionally returns online gateway session)
   */
  async createOrder(order: Order): Promise<boolean | { success: boolean; id?: string; order_number?: string; payment?: any; checkout_url?: string }> {
    return await callStore('createOrder', [order]);
  },

  /**
   * 9. Cancel Order and Auto-Restock Inventory
   */
  async cancelOrder(orderId: string, reason: string, cancelledBy: 'customer_whatsapp' | 'admin'): Promise<boolean> { return await callStore('cancelOrder', [orderId,reason,cancelledBy]); },

  /**
   * 10. Get all orders for Admin
   */
  async getOrders(): Promise<Order[]> { return await callStore('getOrders', []); },

  async getOrdersPaginated(params?: { page?: number; limit?: number; status?: string; search?: string }): Promise<{ orders: Order[]; total: number; page: number; limit: number; pages: number }> {
    return await callStore('getOrdersPaginated', [params || {}]);
  },

  /**
   * 11. Intelligent Personalization Engine: Get tailored recommendations based on visitor signals
   */
  async getPersonalizedRecommendations(sessionId: string): Promise<{
    hasHistory: boolean;
    recommendedProducts: Product[];
    searchTags: string[];
    topCategory?: string;
  }> { return await callStore('getPersonalizedRecommendations', [sessionId]); },

  // ==========================================
  // AUTHENTICATION & EMAIL OTP VERIFICATION
  // ==========================================

  async sendVerificationOtp(email: string, name?: string): Promise<{ success: boolean; delivered?: boolean; message?: string; isSimulatedNotice?: boolean; simulatedCode?: string; otpCode?: string; resendNotice?: string; error?: string }> {
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name })
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      console.error('❌ neonDb.sendVerificationOtp error:', err);
      return { success: false, error: 'تعذر الاتصال بخدمة التحقق من البريد.' };
    }
  },

  async verifyOtpAndCreateUser(data: { email: string; code: string; name: string; phone: string; password?: string; marketing_opt_in?: boolean; ai_training_opt_in?: boolean; parental_consent?: boolean }): Promise<{ success: boolean; user?: any; error?: string; requiresTotp?: boolean }> {
    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      return result;
    } catch (err: any) {
      console.error('❌ neonDb.verifyOtpAndCreateUser error:', err);
      return { success: false, error: 'تعذر التحقق من الكود.' };
    }
  },

  async authenticateUser(email: string, password: string, totpCode?: string): Promise<{ success: boolean; user?: any; error?: string; requiresTotp?: boolean }> { return await callStore('authenticateUser', [email,password,totpCode]); },

  async persistGoogleUser(googleUser: { credential: string }): Promise<{ success: boolean; user?: any; error?: string; requiresTotp?: boolean }> {
    try {
      const res = await fetch('/api/google-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(googleUser)
      });
      const result = await res.json();
      return result;
    } catch (err: any) {
      console.error('❌ neonDb.persistGoogleUser error:', err);
      return { success: false, error: 'تعذر حفظ بيانات حساب Google.' };
    }
  },

  async getAllUsers(): Promise<any[]> { return await callStore('getAllUsers', []); },

  async adminCreateUser(data: { name: string; email: string; phone?: string; password: string; role?: 'admin' | 'customer'; admin_permissions?: string[] }): Promise<{ success: boolean; user?: any; error?: string }> { return await callStore('adminCreateUser', [data]); },

  async getUserInsights(userId: string): Promise<any> { return await callStore('getUserInsights', [userId]); },

  async getGuestVisitors(limit = 150): Promise<any[]> { return await callStore('getGuestVisitors', [limit]); },

  async getGuestInsights(sessionId: string): Promise<any> { return await callStore('getGuestInsights', [sessionId]); },

  async deleteGuestVisitor(sessionId: string): Promise<{ success: boolean }> { return await callStore('deleteGuestVisitor', [sessionId]); },

  async getRecentlyViewedProductIds(sessionId: string, customerId?: string | null, limit = 12): Promise<string[]> {
    try {
      const res = await callStore('getRecentlyViewedProductIds', [sessionId, customerId, limit]);
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  },

  async getUserAccess(userId: string): Promise<{ success: boolean; exists?: boolean; role?: 'admin' | 'customer'; admin_permissions?: string[]; error?: string }> { return await callStore('getUserAccess', [userId]); },

  async updateUserRole(userId: string, newRole: 'admin' | 'customer'): Promise<{ success: boolean; error?: string }> { return await callStore('updateUserRole', [userId,newRole]); },

  async deleteUser(userId: string): Promise<{ success: boolean; error?: string }> { return await callStore('deleteUser', [userId]); },

  async updateUserProfile(userId: string, data: { name?: string; phone?: string; email?: string; avatar?: string; addresses?: any[] }): Promise<{ success: boolean; user?: any; error?: string; requiresTotp?: boolean }> { return await callStore('updateUserProfile', [userId,data]); },

  async changePassword(userId: string, oldPass: string, newPass: string): Promise<{ success: boolean; error?: string }> { return await callStore('changePassword', [userId,oldPass,newPass]); },

  async getStoreSettings(options?: { bypassCache?: boolean }): Promise<any> {
    try {
      if (options?.bypassCache) {
        return await callStore('getStoreSettings', []);
      }
      return await callPublicStoreGet('getStoreSettings');
    } catch {
      return null;
    }
  },

  async updateStoreSettings(settings: any): Promise<{ success: boolean; error?: string }> {
    return await callAction('updateStoreSettings', [settings]);
  },

  async submitProductReview(reviewData: {
    product_id: string;
    product_name_ar?: string;
    author_name: string;
    author_phone?: string;
    user_id?: string;
    session_id?: string;
    rating: number;
    comment: string;
    images?: string[];
  }): Promise<{ success: boolean; review?: any; error?: string }> {
    return await callAction('submitProductReview', [reviewData]);
  },

  async getProductReviews(productId: string, sessionId?: string): Promise<any[]> {
    try {
      return await callStore('getProductReviews', [productId, sessionId]);
    } catch {
      return [];
    }
  },

  async getAllProductReviews(params?: { status?: string; productId?: string; limit?: number }): Promise<{
    reviews: any[];
    counts: { pending: number; approved: number; rejected: number; all: number };
  }> {
    try {
      return await callStore('getAllProductReviews', [params]);
    } catch {
      return { reviews: [], counts: { pending: 0, approved: 0, rejected: 0, all: 0 } };
    }
  },

  async updateProductReviewStatus(reviewId: string, status: 'approved' | 'rejected'): Promise<{ success: boolean; error?: string }> {
    return await callAction('updateProductReviewStatus', [reviewId, status]);
  },

  async deleteProductReview(reviewId: string): Promise<{ success: boolean; error?: string }> {
    return await callAction('deleteProductReview', [reviewId]);
  },

  async getWhatsAppAdminConfig(): Promise<any> {
    return await callStore('getWhatsAppAdminConfig', []);
  },

  async saveWhatsAppAdminConfig(config: any): Promise<{ success: boolean; error?: string }> {
    return await callAction('saveWhatsAppAdminConfig', [config]);
  },

  async testWhatsAppConnection(): Promise<{ success: boolean; configured?: boolean; message?: string; error?: string }> {
    return await callAction('testWhatsAppConnection', []);
  },

  async getWhatsAppNotifications(limit = 60): Promise<any[]> {
    try {
      return await callStore('getWhatsAppNotifications', [limit]);
    } catch {
      return [];
    }
  },

  async sendOrderWhatsApp(params: { orderId: string; type?: string; customText?: string; recipient?: string }): Promise<{ success: boolean; status?: string; error?: string; waLink?: string }> {
    return await callAction('sendOrderWhatsApp', [params]);
  },

  async sendTestWhatsApp(params: { phone: string; text: string }): Promise<{ success: boolean; status?: string; error?: string; waLink?: string }> {
    return await callAction('sendTestWhatsApp', [params]);
  },

  async getPaymentGatewayAdminConfig(): Promise<any> {
    return await callStore('getPaymentGatewayAdminConfig', []);
  },

  async savePaymentGatewayConfig(config: any): Promise<{ success: boolean; error?: string; state?: any }> {
    return await callAction('savePaymentGatewayConfig', [config]);
  },

  async testPaymentGatewayConfig(): Promise<{ success: boolean; message?: string; error?: string; state?: any }> {
    return await callAction('testPaymentGatewayConfig', []);
  },

  async logoutAllDevices(): Promise<{ success: boolean; error?: string }> {
    return await callAction('logoutAllDevices', []);
  },

  async requestPasswordReset(email: string): Promise<{ success: boolean; message?: string; error?: string }> {
    return await callAction('requestPasswordReset', [email]);
  },

  async completePasswordReset(token: string, newPassword: string): Promise<{ success: boolean; message?: string; error?: string }> {
    return await callAction('completePasswordReset', [token, newPassword]);
  },

  async getSystemAlerts(limit = 50): Promise<any[]> {
    try {
      return await callStore('getSystemAlerts', [limit]);
    } catch {
      return [];
    }
  },

  async resolveSystemAlert(alertId: string): Promise<boolean> {
    try {
      return await callStore('resolveSystemAlert', [alertId]);
    } catch {
      return false;
    }
  },

  async exportMyData(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      return await callStore('exportMyData', []);
    } catch (err: any) {
      return { success: false, error: err?.message || 'تعذر تصدير البيانات.' };
    }
  },

  async updateConsentPreferences(prefs: { marketing_opt_in?: boolean; ai_training_opt_in?: boolean; cookie_consent?: string }): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      return await callStore('updateConsentPreferences', [prefs]);
    } catch (err: any) {
      return { success: false, error: err?.message || 'تعذر حفظ تفضيلات الخصوصية.' };
    }
  },

  async submitBreachReport(payload: { reporter_email: string; reporter_name?: string; incident_type: string; description: string }): Promise<{ success: boolean; id?: string; report_deadline_at?: string; error?: string }> {
    try {
      return await callStore('submitBreachReport', [payload]);
    } catch (err: any) {
      return { success: false, error: err?.message || 'تعذر إرسال البلاغ الأمني.' };
    }
  },

  async listBreachReports(limit = 50): Promise<any[]> {
    try {
      return await callStore('listBreachReports', [limit]);
    } catch {
      return [];
    }
  },

  async updateBreachReportStatus(id: string, status: string, adminNotes?: string): Promise<boolean> {
    try {
      const res = await callStore('updateBreachReportStatus', [id, status, adminNotes || '']);
      return Boolean(res?.success);
    } catch {
      return false;
    }
  }
};
