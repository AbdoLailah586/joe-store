/// <reference types="vite/client" />
import { neon } from '@neondatabase/serverless';
import { Product, Order, CategoryKey, OrderStatus, PaymentMethod, PaymentStatus } from '../types';

// Fallback connection string or from environment variables
const DB_URL = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DATABASE_URL) || 
  'postgresql://neondb_owner:npg_iZDByh9KMPY5@ep-patient-cherry-b1hjbgjn-pooler.c-5.eu-central-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DB_URL);

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
  return {
    id: row.id,
    sku: row.id.toUpperCase(),
    name_ar: row.name_ar,
    name_en: row.name_en,
    category: row.category as CategoryKey,
    brand: row.brand,
    condition: isPreowned ? 'mint' : 'brand_new',
    battery_health: row.battery_health ? parseInt(String(row.battery_health).replace('%', '')) : undefined,
    storage: Array.isArray(row.storage_options) && row.storage_options.length > 0 ? row.storage_options[0] : undefined,
    available_storages: Array.isArray(row.storage_options) ? row.storage_options : [],
    color_ar: Array.isArray(row.colors) && row.colors.length > 0 ? row.colors[0]?.name_ar : undefined,
    color_en: Array.isArray(row.colors) && row.colors.length > 0 ? row.colors[0]?.name_en : undefined,
    color_hex: Array.isArray(row.colors) && row.colors.length > 0 ? row.colors[0]?.hex : undefined,
    available_colors: Array.isArray(row.colors) ? row.colors : [],
    price: Number(row.price),
    original_price: row.old_price ? Number(row.old_price) : undefined,
    cost_price: row.cost_price ? Number(row.cost_price) : Math.round(Number(row.price) * 0.8),
    discount_percentage: row.old_price && Number(row.old_price) > Number(row.price) 
      ? Math.round(((Number(row.old_price) - Number(row.price)) / Number(row.old_price)) * 100) 
      : undefined,
    stock: row.stock_quantity ?? 10,
    in_stock: (row.stock_quantity ?? 10) > 0 && (row.is_active ?? true),
    is_active: row.is_active ?? true,
    images: Array.isArray(row.images) && row.images.length > 0 ? row.images : ['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80'],
    description_ar: row.specs?.description_ar || `${row.name_ar} مع ضمان رسمي من جو ستور.`,
    description_en: row.specs?.description_en || `${row.name_en} with official JOE Store warranty.`,
    specs: row.specs || {},
    warranty_months: 6,
    rating: 4.9,
    reviews_count: 24,
    is_featured: Boolean(row.is_featured),
    is_best_seller: Boolean(row.is_featured),
    is_flash_sale: Boolean(row.old_price && Number(row.old_price) > Number(row.price)),
    created_at: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : '2026-03-01'
  };
}

// Convert PostgreSQL DB row to frontend Order type
function mapRowToOrder(r: any): Order {
  return {
    id: r.id,
    order_number: r.order_number || r.id,
    customer_name: r.customer_name || 'عميل جو ستور',
    customer_phone: r.customer_phone || '01554826209',
    customer_whatsapp: r.customer_phone || '201554826209',
    customer_email: r.customer_email || undefined,
    governorate: r.governorate || 'الدقهلية - المنصورة',
    city: r.governorate || 'المنصورة',
    address_details: r.address || 'المنصورة',
    notes: r.notes || undefined,
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
    try {
      const limit = params?.limit || 50;
      const offset = params?.offset || 0;
      const category = params?.category;
      const search = params?.search?.trim();
      const includeHidden = params?.includeHidden ?? false;

      let queryStr = `SELECT * FROM products WHERE 1=1`;
      let countStr = `SELECT COUNT(*) as total FROM products WHERE 1=1`;
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (!includeHidden) {
        queryStr += ` AND is_active = true`;
        countStr += ` AND is_active = true`;
      }

      if (category && category !== 'all') {
        queryStr += ` AND category = $${paramIndex}`;
        countStr += ` AND category = $${paramIndex}`;
        queryParams.push(category);
        paramIndex++;
      }

      if (search) {
        queryStr += ` AND (name_ar ILIKE $${paramIndex} OR name_en ILIKE $${paramIndex} OR brand ILIKE $${paramIndex})`;
        countStr += ` AND (name_ar ILIKE $${paramIndex} OR name_en ILIKE $${paramIndex} OR brand ILIKE $${paramIndex})`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      queryStr += ` ORDER BY is_featured DESC, created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      const finalParams = [...queryParams, limit, offset];

      const [rows, countRows] = await Promise.all([
        sql.query(queryStr, finalParams),
        sql.query(countStr, queryParams)
      ]);

      const total = Number(countRows[0]?.total || 0);
      const products = (rows as any[]).map(mapRowToProduct);

      return { products, total };
    } catch (error) {
      console.error('❌ neonDb.getProducts error:', error);
      return { products: [], total: 0 };
    }
  },

  /**
   * 2. Toggle Product Visibility (Show / Hide in catalog)
   */
  async toggleProductVisibility(productId: string, isActive: boolean): Promise<boolean> {
    try {
      await sql`
        UPDATE products 
        SET is_active = ${isActive}, updated_at = NOW() 
        WHERE id = ${productId};
      `;
      return true;
    } catch (error) {
      console.error('❌ neonDb.toggleProductVisibility error:', error);
      return false;
    }
  },

  /**
   * 3. Update Product Stock and Price
   */
  async updateProduct(productId: string, updates: Partial<{
    price: number;
    old_price: number;
    stock_quantity: number;
    is_active: boolean;
    is_featured: boolean;
  }>): Promise<boolean> {
    try {
      const setParts: string[] = ['updated_at = NOW()'];
      const params: any[] = [productId];
      let pIdx = 2;

      if (updates.price !== undefined) {
        setParts.push(`price = $${pIdx}`);
        params.push(Number(updates.price));
        pIdx++;
      }
      if (updates.old_price !== undefined) {
        setParts.push(`old_price = $${pIdx}`);
        params.push(Number(updates.old_price));
        pIdx++;
      }
      if (updates.stock_quantity !== undefined) {
        setParts.push(`stock_quantity = $${pIdx}`);
        params.push(Number(updates.stock_quantity));
        pIdx++;
      }
      if (updates.is_active !== undefined) {
        setParts.push(`is_active = $${pIdx}`);
        params.push(Boolean(updates.is_active));
        pIdx++;
      }
      if (updates.is_featured !== undefined) {
        setParts.push(`is_featured = $${pIdx}`);
        params.push(Boolean(updates.is_featured));
        pIdx++;
      }

      const q = `UPDATE products SET ${setParts.join(', ')} WHERE id = $1;`;
      await sql.query(q, params);
      return true;
    } catch (error) {
      console.error('❌ neonDb.updateProduct error:', error);
      return false;
    }
  },

  /**
   * 4. Bulk Insert Products from Excel (Scales to 12,000+ items using chunked batches)
   */
  async bulkInsertProducts(products: Product[]): Promise<{ inserted: number; errors: number }> {
    let inserted = 0;
    let errors = 0;
    const chunkSize = 100;

    for (let i = 0; i < products.length; i += chunkSize) {
      const chunk = products.slice(i, i + chunkSize);
      try {
        for (const p of chunk) {
          const isPre = p.condition === 'mint' || p.condition === 'used_good';
          await sql`
            INSERT INTO products (
              id, name_ar, name_en, category, brand, price, old_price, cost_price,
              stock_quantity, is_active, is_featured, is_preowned, battery_health,
              warranty, colors, storage_options, images, specs
            )
            VALUES (
              ${p.id},
              ${p.name_ar},
              ${p.name_en},
              ${p.category},
              ${p.brand || 'Apple'},
              ${p.price},
              ${p.original_price || null},
              ${p.cost_price || Math.round(p.price * 0.8)},
              ${p.stock || 10},
              ${p.is_active !== false},
              ${p.is_featured || false},
              ${isPre},
              ${p.battery_health ? `${p.battery_health}%` : null},
              ${p.specs?.['الضمان'] || `${p.warranty_months || 6} شهور`},
              ${JSON.stringify(p.available_colors || [])}::jsonb,
              ${JSON.stringify(p.available_storages || [])}::jsonb,
              ${JSON.stringify(p.images || [])}::jsonb,
              ${JSON.stringify(p.specs || {})}::jsonb
            )
            ON CONFLICT (id) DO UPDATE SET
              name_ar = EXCLUDED.name_ar,
              name_en = EXCLUDED.name_en,
              price = EXCLUDED.price,
              old_price = EXCLUDED.old_price,
              stock_quantity = EXCLUDED.stock_quantity,
              is_active = EXCLUDED.is_active,
              colors = EXCLUDED.colors,
              storage_options = EXCLUDED.storage_options,
              images = EXCLUDED.images,
              updated_at = NOW();
          `;
          inserted++;
        }
      } catch (err) {
        console.error('❌ Chunk insertion error:', err);
        errors += chunk.length;
      }
    }

    return { inserted, errors };
  },

  /**
   * 5. Record Customer Activity (Behavioral Signals for Personalization Engine)
   */
  async trackActivity(activity: {
    sessionId: string;
    customerId?: string;
    actionType: 'search' | 'view_product' | 'view_category' | 'add_to_cart';
    targetId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await sql`
        INSERT INTO customer_activity (session_id, customer_id, action_type, target_id, metadata)
        VALUES (
          ${activity.sessionId},
          ${activity.customerId || null},
          ${activity.actionType},
          ${activity.targetId || null},
          ${JSON.stringify(activity.metadata || {})}::jsonb
        );
      `;
    } catch (error) {
      console.warn('⚠️ Could not log customer activity:', error);
    }
  },

  /**
   * 6. Sync Active Cart & Detect Abandoned Carts in Real-Time
   */
  async syncActiveCart(cart: {
    sessionId: string;
    customerName?: string;
    customerPhone?: string;
    items: any[];
    subtotal: number;
  }): Promise<void> {
    try {
      if (!cart.items || cart.items.length === 0) {
        await sql`DELETE FROM active_carts WHERE session_id = ${cart.sessionId};`;
        return;
      }

      await sql`
        INSERT INTO active_carts (session_id, customer_name, customer_phone, items, subtotal, is_abandoned, last_updated_at)
        VALUES (
          ${cart.sessionId},
          ${cart.customerName || null},
          ${cart.customerPhone || null},
          ${JSON.stringify(cart.items)}::jsonb,
          ${cart.subtotal},
          false,
          NOW()
        )
        ON CONFLICT (session_id) DO UPDATE SET
          customer_name = COALESCE(EXCLUDED.customer_name, active_carts.customer_name),
          customer_phone = COALESCE(EXCLUDED.customer_phone, active_carts.customer_phone),
          items = EXCLUDED.items,
          subtotal = EXCLUDED.subtotal,
          is_abandoned = false,
          last_updated_at = NOW();
      `;
    } catch (error) {
      console.warn('⚠️ Could not sync active cart:', error);
    }
  },

  /**
   * 7. Get Active and Abandoned Carts for Admin CRM
   */
  async getActiveCarts(): Promise<ActiveCartRecord[]> {
    try {
      await sql`
        UPDATE active_carts 
        SET is_abandoned = true 
        WHERE last_updated_at < NOW() - INTERVAL '15 minutes' AND is_abandoned = false;
      `;

      const rows = await sql`
        SELECT * FROM active_carts 
        ORDER BY last_updated_at DESC 
        LIMIT 50;
      `;
      return rows as ActiveCartRecord[];
    } catch (error) {
      console.error('❌ neonDb.getActiveCarts error:', error);
      return [];
    }
  },

  /**
   * 8. Create Order in Neon & Auto-Deduct Stock
   */
  async createOrder(order: Order): Promise<boolean> {
    try {
      await sql`
        INSERT INTO orders (
          id, order_number, customer_id, customer_name, customer_phone, customer_email,
          governorate, address, notes, items, subtotal, shipping_fee, total,
          payment_method, payment_status, status
        )
        VALUES (
          ${order.id},
          ${order.order_number || order.id},
          ${order.customer_email || null},
          ${order.customer_name || 'عميل جو ستور'},
          ${order.customer_phone || '01554826209'},
          ${order.customer_email || null},
          ${order.governorate || 'الدقهلية - المنصورة'},
          ${order.address_details || 'المنصورة'},
          ${order.notes || null},
          ${JSON.stringify(order.items)}::jsonb,
          ${order.subtotal},
          ${order.shipping_fee},
          ${order.total},
          ${order.payment_method},
          ${order.payment_status || 'unpaid'},
          ${order.order_status || 'pending'}
        )
        ON CONFLICT (id) DO NOTHING;
      `;

      // Deduct stock for each item in the order
      for (const item of order.items) {
        if (item.product?.id) {
          await sql`
            UPDATE products 
            SET stock_quantity = GREATEST(0, stock_quantity - ${item.quantity || 1}) 
            WHERE id = ${item.product.id};
          `;
        }
      }

      // Clear the active cart record since order was placed!
      if (order.customer_phone) {
        await sql`DELETE FROM active_carts WHERE customer_phone = ${order.customer_phone};`;
      }

      return true;
    } catch (error) {
      console.error('❌ neonDb.createOrder error:', error);
      return false;
    }
  },

  /**
   * 9. Cancel Order and Auto-Restock Inventory
   */
  async cancelOrder(orderId: string, reason: string, cancelledBy: 'customer_whatsapp' | 'admin'): Promise<boolean> {
    try {
      const rows = await sql`SELECT items, status FROM orders WHERE id = ${orderId} OR order_number = ${orderId};`;
      if (!rows || rows.length === 0) return false;

      const order = rows[0];
      if (order.status === 'cancelled') return true;

      await sql`
        UPDATE orders 
        SET 
          status = 'cancelled',
          cancellation_reason = ${reason},
          cancelled_by = ${cancelledBy},
          cancelled_at = NOW(),
          updated_at = NOW()
        WHERE id = ${orderId} OR order_number = ${orderId};
      `;

      // Restock items back to inventory
      const items = Array.isArray(order.items) ? order.items : [];
      for (const item of items) {
        const prodId = item.product?.id || item.product_id;
        const qty = item.quantity || 1;
        if (prodId) {
          await sql`
            UPDATE products 
            SET stock_quantity = stock_quantity + ${qty} 
            WHERE id = ${prodId};
          `;
        }
      }

      return true;
    } catch (error) {
      console.error('❌ neonDb.cancelOrder error:', error);
      return false;
    }
  },

  /**
   * 10. Get all orders for Admin
   */
  async getOrders(): Promise<Order[]> {
    try {
      const rows = await sql`SELECT * FROM orders ORDER BY created_at DESC LIMIT 100;`;
      return (rows as any[]).map(mapRowToOrder);
    } catch (error) {
      console.error('❌ neonDb.getOrders error:', error);
      return [];
    }
  },

  /**
   * 11. Intelligent Personalization Engine: Get tailored recommendations based on visitor signals
   */
  async getPersonalizedRecommendations(sessionId: string): Promise<{
    hasHistory: boolean;
    recommendedProducts: Product[];
    searchTags: string[];
    topCategory?: string;
  }> {
    try {
      const activities = await sql`
        SELECT action_type, target_id, metadata, created_at 
        FROM customer_activity 
        WHERE session_id = ${sessionId} 
        ORDER BY created_at DESC 
        LIMIT 25;
      `;

      if (!activities || activities.length === 0) {
        const trending = await sql`
          SELECT * FROM products 
          WHERE is_active = true 
          ORDER BY is_featured DESC, price DESC 
          LIMIT 4;
        `;
        return {
          hasHistory: false,
          recommendedProducts: (trending as any[]).map(mapRowToProduct),
          searchTags: []
        };
      }

      const searchTags: string[] = [];
      const categoryCounts: Record<string, number> = {};

      for (const act of (activities as any[])) {
        if (act.action_type === 'search' && act.metadata?.query) {
          const q = String(act.metadata.query).trim();
          if (q.length > 2 && !searchTags.includes(q)) {
            searchTags.push(q);
          }
        }
        if (act.action_type === 'view_category' && act.target_id) {
          categoryCounts[act.target_id] = (categoryCounts[act.target_id] || 0) + 1;
        }
        if (act.metadata?.category) {
          categoryCounts[act.metadata.category] = (categoryCounts[act.metadata.category] || 0) + 1;
        }
      }

      let topCategory: string | undefined;
      let maxCount = 0;
      for (const [cat, cnt] of Object.entries(categoryCounts)) {
        if (cnt > maxCount) {
          maxCount = cnt;
          topCategory = cat;
        }
      }

      let recQuery = `SELECT * FROM products WHERE is_active = true`;
      const clauses: string[] = [];
      const params: any[] = [];
      let pIdx = 1;

      if (searchTags.length > 0) {
        const tagConditions: string[] = [];
        for (const tag of searchTags.slice(0, 3)) {
          tagConditions.push(`(name_ar ILIKE $${pIdx} OR name_en ILIKE $${pIdx} OR brand ILIKE $${pIdx})`);
          params.push(`%${tag}%`);
          pIdx++;
        }
        clauses.push(`(${tagConditions.join(' OR ')})`);
      }

      if (topCategory) {
        clauses.push(`category = $${pIdx}`);
        params.push(topCategory);
        pIdx++;
      }

      if (clauses.length > 0) {
        recQuery += ` AND (${clauses.join(' OR ')})`;
      }

      recQuery += ` ORDER BY is_featured DESC, created_at DESC LIMIT 6;`;

      let recommendedRows = await sql.query(recQuery, params);

      if (!recommendedRows || recommendedRows.length < 4) {
        const fillRows = await sql`
          SELECT * FROM products 
          WHERE is_active = true 
          ORDER BY is_featured DESC, stock_quantity DESC 
          LIMIT 6;
        `;
        recommendedRows = fillRows;
      }

      return {
        hasHistory: searchTags.length > 0 || Boolean(topCategory),
        recommendedProducts: (recommendedRows as any[]).map(mapRowToProduct),
        searchTags,
        topCategory
      };
    } catch (error) {
      console.error('❌ neonDb.getPersonalizedRecommendations error:', error);
      return {
        hasHistory: false,
        recommendedProducts: [],
        searchTags: []
      };
    }
  },

  // ==========================================
  // AUTHENTICATION & EMAIL OTP VERIFICATION
  // ==========================================

  async sendVerificationOtp(email: string, name?: string): Promise<{ success: boolean; message?: string; isSimulatedNotice?: boolean; simulatedCode?: string; error?: string }> {
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

  async verifyOtpAndCreateUser(data: { email: string; code: string; name: string; phone: string; password?: string }): Promise<{ success: boolean; user?: any; error?: string }> {
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

  async authenticateUser(email: string, password: string): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const rows = await sql`
        SELECT id, name, email, phone, avatar, role, provider, email_verified, addresses, created_at, password_hash
        FROM users
        WHERE email = ${cleanEmail}
        LIMIT 1;
      `;

      if (!rows || rows.length === 0) {
        return { success: false, error: 'البريد الإلكتروني غير مسجل، يرجى إنشاء حساب جديد.' };
      }

      const user = rows[0];
      if (user.password_hash && user.password_hash !== password) {
        return { success: false, error: 'كلمة المرور غير صحيحة.' };
      }

      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          role: user.role,
          provider: user.provider,
          email_verified: user.email_verified,
          addresses: Array.isArray(user.addresses) ? user.addresses : [],
          created_at: user.created_at
        }
      };
    } catch (err: any) {
      console.error('❌ neonDb.authenticateUser error:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء تسجيل الدخول.' };
    }
  },

  async persistGoogleUser(googleUser: { name: string; email: string; avatar?: string; googleId?: string; phone?: string }): Promise<{ success: boolean; user?: any; error?: string }> {
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
  }
};
