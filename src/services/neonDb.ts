/// <reference types="vite/client" />
import { decodeDeliveryNotes, encodeDeliveryNotes, formatDeliveryAddress } from '../utils/deliveryAddress';
import { Product, Order, CategoryKey, OrderStatus, PaymentMethod, PaymentStatus } from '../types';

async function callStore(method: string, args: any[] = []) {
  const response = await fetch('/api/store', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({method,args}) });
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
    images: Array.isArray(row.images) && row.images.length > 0 ? row.images : ['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80'],
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
    discount: 0,
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
  }): Promise<{ products: Product[]; total: number }> { return await callStore('getProducts', [params]); },

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
    actionType: 'search' | 'view_product' | 'view_category' | 'add_to_cart';
    targetId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> { return await callStore('trackActivity', [activity]); },

  /**
   * 6. Sync Active Cart & Detect Abandoned Carts in Real-Time
   */
  async syncActiveCart(cart: {
    sessionId: string;
    customerName?: string;
    customerPhone?: string;
    items: any[];
    subtotal: number;
  }): Promise<void> { return await callStore('syncActiveCart', [cart]); },

  /**
   * 7. Get Active and Abandoned Carts for Admin CRM
   */
  async getActiveCarts(): Promise<ActiveCartRecord[]> { return await callStore('getActiveCarts', []); },

  /**
   * 8. Create Order in Neon & Auto-Deduct Stock
   */
  async createOrder(order: Order): Promise<boolean> { return await callStore('createOrder', [order]); },

  /**
   * 9. Cancel Order and Auto-Restock Inventory
   */
  async cancelOrder(orderId: string, reason: string, cancelledBy: 'customer_whatsapp' | 'admin'): Promise<boolean> { return await callStore('cancelOrder', [orderId,reason,cancelledBy]); },

  /**
   * 10. Get all orders for Admin
   */
  async getOrders(): Promise<Order[]> { return await callStore('getOrders', []); },

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

  async verifyOtpAndCreateUser(data: { email: string; code: string; name: string; phone: string; password?: string }): Promise<{ success: boolean; user?: any; error?: string; requiresTotp?: boolean }> {
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

  async getUserAccess(userId: string): Promise<{ success: boolean; exists?: boolean; role?: 'admin' | 'customer'; admin_permissions?: string[]; error?: string }> { return await callStore('getUserAccess', [userId]); },

  async updateUserRole(userId: string, newRole: 'admin' | 'customer'): Promise<{ success: boolean; error?: string }> { return await callStore('updateUserRole', [userId,newRole]); },

  async deleteUser(userId: string): Promise<{ success: boolean; error?: string }> { return await callStore('deleteUser', [userId]); },

  async updateUserProfile(userId: string, data: { name?: string; phone?: string; email?: string; avatar?: string; addresses?: any[] }): Promise<{ success: boolean; user?: any; error?: string; requiresTotp?: boolean }> { return await callStore('updateUserProfile', [userId,data]); },

  async changePassword(userId: string, oldPass: string, newPass: string): Promise<{ success: boolean; error?: string }> { return await callStore('changePassword', [userId,oldPass,newPass]); }
};
