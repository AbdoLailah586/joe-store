import { cancelOrder as cancelStoredOrder } from './orderWrites.js';
/// <reference types="vite/client" />
import { neon } from '@neondatabase/serverless';
import { decodeDeliveryNotes, encodeDeliveryNotes, formatDeliveryAddress } from '../src/utils/deliveryAddress.js';
import type { Product, Order, CategoryKey, OrderStatus, PaymentMethod, PaymentStatus } from '../src/types.js';
// Read connection string strictly from environment variables
// Dev configuration loads .env after imports. Resolve the server connection when
// a query runs, so localhost and deployed functions use the same private setting.
const queryClient = () => neon(process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || '');
const sql: any = Object.assign((strings: any, ...values: any[]) => queryClient()(strings, ...values), {
    query: (...args: any[]) => (queryClient().query as any)(...args)
});
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
        if (!details || typeof details !== 'object' || Array.isArray(details))
            details = {};
    }
    catch {
        details = {};
    }
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
        courier_name: r.courier_name || undefined,
        packed_at: r.packed_at || undefined, packed_by: r.packed_by || undefined,
        whatsapp_notification_sent: true,
        cancellation_reason: r.cancellation_reason || undefined,
        cancelled_by: r.cancelled_by || undefined,
        cancelled_at: r.cancelled_at ? new Date(r.cancelled_at).toISOString() : undefined,
        created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
    };
}
export async function logAudit(entry: {
  actorId?: string; actorName?: string; action: string; entity: string; entityId?: string;
  before?: any; after?: any; reason?: string;
}): Promise<void> {
  try {
    await sql`
      INSERT INTO audit_log (id, actor_id, actor_name, action, entity, entity_id, before_data, after_data, reason)
      VALUES (
        ${`audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`},
        ${entry.actorId || null},
        ${entry.actorName || null},
        ${entry.action},
        ${entry.entity},
        ${entry.entityId || null},
        ${entry.before !== undefined ? JSON.stringify(entry.before) : null}::jsonb,
        ${entry.after !== undefined ? JSON.stringify(entry.after) : null}::jsonb,
        ${entry.reason || null}
      );
    `;
  } catch (error) {
    console.warn('⚠️ Could not write audit log entry:', error);
  }
}
export const neonDb = {
    async getAllProducts(params?: {
        includeHidden?: boolean;
    }): Promise<Product[]> {
        const pageSize = 300;
        const first = await this.getProducts({ limit: pageSize, includeHidden: params?.includeHidden });
        if (first.total <= pageSize)
            return first.products;
        const remaining = await Promise.all(Array.from({ length: Math.ceil(first.total / pageSize) - 1 }, (_, index) => this.getProducts({ limit: pageSize, offset: (index + 1) * pageSize,
            includeHidden: params?.includeHidden })));
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
    }): Promise<{
        products: Product[];
        total: number;
    }> {
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
            queryStr += ` ORDER BY is_featured DESC, created_at DESC, id ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            const finalParams = [...queryParams, limit, offset];
            const [rows, countRows] = await Promise.all([
                sql.query(queryStr, finalParams),
                sql.query(countStr, queryParams)
            ]);
            const total = Number(countRows[0]?.total || 0);
            const products = (rows as any[]).map(mapRowToProduct);
            return { products, total };
        }
        catch (error) {
            console.error('❌ neonDb.getProducts error:', error);
            return { products: [], total: 0 };
        }
    },
    /**
     * 2. Toggle Product Visibility (Show / Hide in catalog)
     */
    async toggleProductVisibility(productId: string, isActive: boolean): Promise<boolean> {
        try {
            await sql `
        UPDATE products
        SET is_active = ${isActive}, updated_at = NOW()
        WHERE id = ${productId};
      `;
            return true;
        }
        catch (error) {
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
    product: Partial<Product>;
  }>, actor?: { id: string; name: string }): Promise<boolean> {
    try {
      const priceChanging = updates.price !== undefined || updates.product?.cost_price !== undefined;
      const before = priceChanging
        ? (await sql`SELECT price, cost_price FROM products WHERE id = ${productId};`)[0]
        : null;
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

      if (updates.product) {
        const product = updates.product;
        for (const key of ['name_ar', 'name_en', 'brand', 'category', 'cost_price'] as const) {
          if (product[key] !== undefined) {
            setParts.push(`${key} = $${pIdx++}`);
            params.push(product[key]);
          }
        }
        if (product.images) {
          setParts.push(`images = $${pIdx++}::jsonb`);
          params.push(JSON.stringify(product.images));
        }
        const details = Object.fromEntries(Object.entries(product).filter(([key]) =>
          !['id', 'price', 'stock', 'specs', 'images'].includes(key)));
        const existingSpecs = product.specs === undefined ? "COALESCE(specs, '{}'::jsonb)"
          : "COALESCE((SELECT jsonb_object_agg(key,value) FROM jsonb_each(COALESCE(specs, '{}'::jsonb)) WHERE left(key,2) = '__'), '{}'::jsonb)";
        setParts.push(`specs = jsonb_set(${existingSpecs} || $${pIdx + 1}::jsonb,
          '{__product_data}',
          (CASE WHEN jsonb_typeof(specs->'__product_data') = 'object'
            THEN specs->'__product_data' ELSE '{}'::jsonb END) || $${pIdx}::jsonb, true)`);
        params.push(JSON.stringify(details), JSON.stringify(product.specs || {}));
        pIdx += 2;
      }

      const q = `UPDATE products SET ${setParts.join(', ')} WHERE id = $1;`;
      await sql.query(q, params);
      if (priceChanging && before) {
        await logAudit({
          actorId: actor?.id, actorName: actor?.name, action: 'PRODUCT_PRICE_CHANGED', entity: 'product', entityId: productId,
          before: { price: before.price, cost_price: before.cost_price },
          after: { price: updates.price ?? before.price, cost_price: updates.product?.cost_price ?? before.cost_price }
        });
      }
      return true;
    } catch (error) {
      console.error('❌ neonDb.updateProduct error:', error);
      return false;
    }
  },
    /**
     * 4. Bulk Insert Products from Excel (Scales to 12,000+ items using chunked batches)
     */
    async bulkInsertProducts(products: Product[]): Promise<{
        inserted: number;
        errors: number;
    }> {
        let inserted = 0;
        let errors = 0;
        const chunkSize = 100;
        for (let i = 0; i < products.length; i += chunkSize) {
            const chunk = products.slice(i, i + chunkSize);
            try {
                for (const p of chunk) {
                    const isPre = p.condition === 'mint' || p.condition === 'used_good';
                    await sql `
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
              ${p.cost_price ?? 0},
              ${p.stock ?? 0},
              ${p.is_active !== false},
              ${p.is_featured || false},
              ${isPre},
              ${p.battery_health ? `${p.battery_health}%` : null},
              ${p.warranty_months > 0 ? `${p.warranty_months} شهور` : null},
              ${JSON.stringify(p.available_colors || [])}::jsonb,
              ${JSON.stringify(p.available_storages || [])}::jsonb,
              ${JSON.stringify(p.images || [])}::jsonb,
              ${JSON.stringify({ ...p.specs, __product_data: { ...p, cost_price: undefined, specs: undefined, images: undefined } })}::jsonb
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
              specs = EXCLUDED.specs,
              updated_at = NOW();
          `;
                    inserted++;
                }
            }
            catch (err) {
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
            await sql `
        INSERT INTO customer_activity (session_id, customer_id, action_type, target_id, metadata)
        VALUES (
          ${activity.sessionId},
          ${activity.customerId || null},
          ${activity.actionType},
          ${activity.targetId || null},
          ${JSON.stringify(activity.metadata || {})}::jsonb
        );
      `;
        }
        catch (error) {
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
                await sql `DELETE FROM active_carts WHERE session_id = ${cart.sessionId};`;
                return;
            }
            await sql `
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
        }
        catch (error) {
            console.warn('⚠️ Could not sync active cart:', error);
        }
    },
    /**
     * 7. Get Active and Abandoned Carts for Admin CRM
     */
    async getActiveCarts(): Promise<ActiveCartRecord[]> {
        try {
            await sql `
        UPDATE active_carts
        SET is_abandoned = true
        WHERE last_updated_at < NOW() - INTERVAL '15 minutes' AND is_abandoned = false;
      `;
            const rows = await sql `
        SELECT * FROM active_carts
        ORDER BY last_updated_at DESC
        LIMIT 50;
      `;
            return rows as ActiveCartRecord[];
        }
        catch (error) {
            console.error('❌ neonDb.getActiveCarts error:', error);
            return [];
        }
    },
    /**
     * 10. Get all orders for Admin
     */
    async getOrders(): Promise<Order[]> {
        try {
            const rows = await sql `SELECT * FROM orders ORDER BY created_at DESC LIMIT 100;`;
            return (rows as any[]).map(mapRowToOrder);
        }
        catch (error) {
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
            const activities = await sql `
        SELECT action_type, target_id, metadata, created_at 
        FROM customer_activity 
        WHERE session_id = ${sessionId} 
        ORDER BY created_at DESC 
        LIMIT 25;
      `;
            if (!activities || activities.length === 0) {
                const trending = await sql `
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
                const fillRows = await sql `
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
        }
        catch (error) {
            console.error('❌ neonDb.getPersonalizedRecommendations error:', error);
            return {
                hasHistory: false,
                recommendedProducts: [],
                searchTags: []
            };
        }
    },
    async getAllUsers(): Promise<any[]> {
        try {
            const rows = await sql `
        SELECT id, name, email, phone, avatar, role, provider, email_verified, addresses, created_at, admin_permissions
        FROM users
        ORDER BY created_at DESC;
      `;
            return rows || [];
        }
        catch (err) {
            console.error('❌ neonDb.getAllUsers error:', err);
            return [];
        }
    },
    async updateUserProfile(userId: string, data: {
        name?: string;
        phone?: string;
        email?: string;
        avatar?: string;
        addresses?: any[];
    }): Promise<{
        success: boolean;
        user?: any;
        error?: string;
    }> {
        try {
            const rows = await sql `
        UPDATE users
        SET 
          name = COALESCE(${data.name || null}, name),
          phone = COALESCE(${data.phone || null}, phone),
          email = COALESCE(${data.email || null}, email),
          avatar = COALESCE(${data.avatar || null}, avatar),
          addresses = COALESCE(${data.addresses ? JSON.stringify(data.addresses) : null}::jsonb, addresses),
          updated_at = NOW()
        WHERE id = ${userId}
        RETURNING id, name, email, phone, avatar, role, provider, email_verified, addresses, created_at;
      `;
            if (rows && rows.length > 0) {
                return { success: true, user: rows[0] };
            }
            return { success: false, error: 'لم يتم العثور على المستخدم.' };
        }
        catch (err: any) {
            console.error('❌ neonDb.updateUserProfile error:', err);
            return { success: false, error: err.message };
        }
    },
async getAuditLog(limit = 100): Promise<any[]> {
    try {
      const rows = await sql`SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ${limit};`;
      return rows || [];
    } catch (err) {
      console.error('❌ neonDb.getAuditLog error:', err);
      return [];
    }
  },
async getPickingList(): Promise<Order[]> {
    try {
      const rows = await sql`
        SELECT * FROM orders WHERE status IN ('confirmed', 'processing') AND packed_at IS NULL
        ORDER BY created_at ASC LIMIT 100;
      `;
      return (rows as any[]).map(mapRowToOrder);
    } catch (error) {
      console.error('❌ neonDb.getPickingList error:', error);
      return [];
    }
  },
async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    options?: { courierName?: string; packedBy?: string; override?: boolean; overrideReason?: string; actor?: { id: string; name: string } }
  ): Promise<{ success: boolean; error?: string; code?: string }> {
    try {
      if (status === 'shipped') {
        const rows = await sql`SELECT payment_method, payment_status FROM orders WHERE id = ${orderId} OR order_number = ${orderId};`;
        const order = rows[0];
        if (order && order.payment_method !== 'cod' && !['paid', 'verified'].includes(order.payment_status)) {
          if (!options?.override || !options?.overrideReason?.trim()) {
            return {
              success: false,
              code: 'PAYMENT_HOLD',
              error: 'هذا الطلب يتطلب دفعًا مسبقًا (بطاقة أو تحويل) ولم يُعتمد ماليًا بالكامل بعد.'
            };
          }
          await logAudit({
            actorId: options.actor?.id, actorName: options.actor?.name, action: 'PAYMENT_HOLD_OVERRIDDEN',
            entity: 'order', entityId: orderId, reason: options.overrideReason
          });
        }
      }

      await sql`
        UPDATE orders SET
          status = ${status},
          courier_name = COALESCE(${options?.courierName || null}, courier_name),
          packed_at = CASE WHEN ${options?.packedBy ? true : false} THEN NOW() ELSE packed_at END,
          packed_by = COALESCE(${options?.packedBy || null}, packed_by),
          updated_at = NOW()
        WHERE id = ${orderId} OR order_number = ${orderId};
      `;
      return { success: true };
    } catch (err: any) {
      console.error('❌ neonDb.updateOrderStatus error:', err);
      return { success: false, error: err.message || 'تعذر حفظ حالة الطلب.' };
    }
  },
async confirmPacking(
    orderId: string,
    scannedCodes: string[],
    options?: { courierName?: string; override?: boolean; reason?: string; actor?: { id: string; name: string } }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const rows = await sql`SELECT items, status FROM orders WHERE id = ${orderId} OR order_number = ${orderId};`;
      if (!rows.length) return { success: false, error: 'الطلب غير موجود.' };
      const items = Array.isArray(rows[0].items) ? rows[0].items : [];
      const expected = items.map((item: any) => String(item.product?.sku || item.product?.id || '').toUpperCase()).filter(Boolean).sort();
      const scanned = [...new Set(scannedCodes.map(code => code.trim().toUpperCase()))].sort();
      const matches = expected.length === scanned.length && expected.every((value, index) => value === scanned[index]);
      if (!matches && !(options?.override && options?.reason?.trim())) {
        return { success: false, error: 'الأصناف الممسوحة لا تطابق بنود الطلب. أعيدي المسح أو استخدمي تجاوز المدير مع ذكر السبب.' };
      }
      if (!matches) {
        await logAudit({
          actorId: options?.actor?.id, actorName: options?.actor?.name, action: 'PACKING_OVERRIDDEN',
          entity: 'order', entityId: orderId, reason: options?.reason
        });
      }
      const nextStatus = rows[0].status === 'confirmed' ? 'processing' : rows[0].status;
      await this.updateOrderStatus(orderId, nextStatus, {
        courierName: options?.courierName,
        packedBy: options?.actor?.name || options?.actor?.id || 'admin',
        actor: options?.actor
      });
      return { success: true };
    } catch (err: any) {
      console.error('❌ neonDb.confirmPacking error:', err);
      return { success: false, error: err.message || 'تعذر تأكيد التعبئة.' };
    }
  },
async getDeliveryBoard(): Promise<Order[]> {
    try {
      const rows = await sql`
        SELECT * FROM orders WHERE status IN ('processing', 'shipped', 'out_for_delivery')
        ORDER BY courier_name NULLS FIRST, packed_at ASC NULLS LAST LIMIT 200;
      `;
      return (rows as any[]).map(mapRowToOrder);
    } catch (error) {
      console.error('❌ neonDb.getDeliveryBoard error:', error);
      return [];
    }
  },
async recordDeliveryRefusal(
    orderId: string,
    reason: string,
    courierName: string | undefined,
    actor?: { id: string; name: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const rows = await sql`SELECT customer_phone FROM orders WHERE id = ${orderId} OR order_number = ${orderId};`;
      if (!rows.length) return { success: false, error: 'الطلب غير موجود.' };
      await sql`
        INSERT INTO delivery_refusals (id, order_id, customer_phone, reason, courier_name, created_by)
        VALUES (${`refusal-${Date.now()}`}, ${orderId}, ${rows[0].customer_phone}, ${reason}, ${courierName || null}, ${actor?.id || null});
      `;
      await logAudit({ actorId: actor?.id, actorName: actor?.name, action: 'DELIVERY_REFUSED', entity: 'order', entityId: orderId, reason });
      await cancelStoredOrder(sql, orderId, `رفض استلام: ${reason}`, 'admin');
      return { success: true };
    } catch (err: any) {
      console.error('❌ neonDb.recordDeliveryRefusal error:', err);
      return { success: false, error: err.message || 'تعذر تسجيل الرفض.' };
    }
  },
async getRefusalHistory(phone: string): Promise<any[]> {
    try {
      const rows = await sql`
        SELECT * FROM delivery_refusals WHERE customer_phone = ${phone} AND created_at > NOW() - INTERVAL '90 days'
        ORDER BY created_at DESC;
      `;
      return rows || [];
    } catch (error) {
      console.error('❌ neonDb.getRefusalHistory error:', error);
      return [];
    }
  },
async getAllRefusals(limit = 100): Promise<any[]> {
    try {
      const rows = await sql`SELECT * FROM delivery_refusals ORDER BY created_at DESC LIMIT ${limit};`;
      return rows || [];
    } catch (error) {
      console.error('❌ neonDb.getAllRefusals error:', error);
      return [];
    }
  },
async addSupplierQuote(productId: string, supplierName: string, price: number, actor?: { id: string }): Promise<boolean> {
    try {
      await sql`
        INSERT INTO supplier_quotes (id, product_id, supplier_name, quoted_price, created_by)
        VALUES (${`quote-${Date.now()}`}, ${productId}, ${supplierName}, ${price}, ${actor?.id || null});
      `;
      return true;
    } catch (error) {
      console.error('❌ neonDb.addSupplierQuote error:', error);
      return false;
    }
  },
async getSupplierQuotes(productId: string): Promise<any[]> {
    try {
      const rows = await sql`SELECT * FROM supplier_quotes WHERE product_id = ${productId} ORDER BY quoted_price ASC;`;
      return rows || [];
    } catch (error) {
      console.error('❌ neonDb.getSupplierQuotes error:', error);
      return [];
    }
  },
async addCoverEntry(
    data: { brand: string; model: string; style?: string; color?: string; location?: string; notes?: string },
    actor?: { id: string }
  ): Promise<{ success: boolean; entry?: any; error?: string }> {
    try {
      const id = `cover-new-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const rows = await sql`
        INSERT INTO cover_catalog_additions (id, brand, model, style, color, location, notes, created_by)
        VALUES (${id}, ${data.brand}, ${data.model}, ${data.style || ''}, ${data.color || ''}, ${data.location || ''}, ${data.notes || ''}, ${actor?.id || null})
        RETURNING *;
      `;
      return { success: true, entry: rows[0] };
    } catch (error) {
      console.error('❌ neonDb.addCoverEntry error:', error);
      return { success: false, error: 'تعذر حفظ الكفر الجديد. حاول مرة أخرى.' };
    }
  },
async getCoverAdditions(): Promise<any[]> {
    try {
      const rows = await sql`SELECT * FROM cover_catalog_additions ORDER BY created_at DESC;`;
      return rows || [];
    } catch (error) {
      console.error('❌ neonDb.getCoverAdditions error:', error);
      return [];
    }
  },
async addScreenEntry(
    data: { boxCode: string; screenTitle: string; category?: string; shelfLocation?: string; notes?: string; models: { brand: string; brandAr?: string; name: string }[] },
    actor?: { id: string }
  ): Promise<{ success: boolean; entry?: any; error?: string }> {
    try {
      const id = `screen-new-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const rows = await sql`
        INSERT INTO screen_catalog_additions (id, box_code, screen_title, category, shelf_location, notes, models, created_by)
        VALUES (${id}, ${data.boxCode}, ${data.screenTitle}, ${data.category || 'og_clear'}, ${data.shelfLocation || ''}, ${data.notes || ''}, ${JSON.stringify(data.models)}::jsonb, ${actor?.id || null})
        RETURNING *;
      `;
      return { success: true, entry: rows[0] };
    } catch (error) {
      console.error('❌ neonDb.addScreenEntry error:', error);
      return { success: false, error: 'تعذر حفظ الباكتة الجديدة. حاول مرة أخرى.' };
    }
  },
async getScreenAdditions(): Promise<any[]> {
    try {
      const rows = await sql`SELECT * FROM screen_catalog_additions ORDER BY created_at DESC;`;
      return rows || [];
    } catch (error) {
      console.error('❌ neonDb.getScreenAdditions error:', error);
      return [];
    }
  },
async findOrCreateSupportTicket(phone: string, name?: string, subject?: string, orderId?: string): Promise<any> {
    const existing = await sql`
      SELECT * FROM support_tickets WHERE customer_phone = ${phone} AND status IN ('open', 'pending', 'escalated')
      ORDER BY created_at DESC LIMIT 1;
    `;
    if (existing.length) return existing[0];
    const id = `ticket-${Date.now()}`;
    const rows = await sql`
      INSERT INTO support_tickets (id, customer_phone, customer_name, order_id, subject)
      VALUES (${id}, ${phone}, ${name || null}, ${orderId || null}, ${subject || 'استفسار عميل'})
      RETURNING *;
    `;
    return rows[0];
  },
async createSupportTicket(phone: string, message: string, name?: string, subject?: string, orderId?: string): Promise<{ success: boolean; ticket?: any; error?: string }> {
    try {
      const ticket = await this.findOrCreateSupportTicket(phone, name, subject, orderId);
      if (message.trim()) {
        await sql`INSERT INTO support_messages (id, ticket_id, sender_type, sender_id, body) VALUES (${`msg-${Date.now()}`}, ${ticket.id}, 'customer', null, ${message.trim()});`;
        await sql`UPDATE support_tickets SET status = CASE WHEN status = 'escalated' THEN status ELSE 'pending' END, updated_at = NOW() WHERE id = ${ticket.id};`;
      }
      return { success: true, ticket };
    } catch (err: any) {
      console.error('❌ neonDb.createSupportTicket error:', err);
      return { success: false, error: err.message || 'تعذر فتح المحادثة.' };
    }
  },
async listSupportTickets(status?: string): Promise<any[]> {
    try {
      const rows = status
        ? await sql`SELECT * FROM support_tickets WHERE status = ${status} ORDER BY updated_at DESC LIMIT 100;`
        : await sql`SELECT * FROM support_tickets ORDER BY updated_at DESC LIMIT 100;`;
      return rows || [];
    } catch (error) {
      console.error('❌ neonDb.listSupportTickets error:', error);
      return [];
    }
  },
async getSupportTicket(ticketId: string): Promise<{ ticket: any; messages: any[] } | null> {
    try {
      const tickets = await sql`SELECT * FROM support_tickets WHERE id = ${ticketId};`;
      if (!tickets.length) return null;
      const messages = await sql`SELECT * FROM support_messages WHERE ticket_id = ${ticketId} ORDER BY created_at;`;
      return { ticket: tickets[0], messages };
    } catch (error) {
      console.error('❌ neonDb.getSupportTicket error:', error);
      return null;
    }
  },
async replySupportTicket(ticketId: string, senderType: 'staff' | 'customer', body: string, actor?: { id: string; name: string }): Promise<{ success: boolean; error?: string }> {
    try {
      if (!body.trim()) return { success: false, error: 'نص الرسالة مطلوب.' };
      await sql`INSERT INTO support_messages (id, ticket_id, sender_type, sender_id, body) VALUES (${`msg-${Date.now()}`}, ${ticketId}, ${senderType}, ${actor?.id || null}, ${body.trim()});`;
      if (senderType === 'staff') {
        const current = (await sql`SELECT assigned_to FROM support_tickets WHERE id = ${ticketId};`)[0];
        await sql`
          UPDATE support_tickets SET assigned_to = COALESCE(assigned_to, ${actor?.name || actor?.id || null}),
            status = CASE WHEN status = 'pending' THEN 'open' ELSE status END, updated_at = NOW()
          WHERE id = ${ticketId};
        `;
        if (!current?.assigned_to) await logAudit({ actorId: actor?.id, actorName: actor?.name, action: 'TICKET_CLAIMED', entity: 'support_ticket', entityId: ticketId });
      } else {
        await sql`UPDATE support_tickets SET status = 'pending', updated_at = NOW() WHERE id = ${ticketId};`;
      }
      return { success: true };
    } catch (err: any) {
      console.error('❌ neonDb.replySupportTicket error:', err);
      return { success: false, error: err.message || 'تعذر إرسال الرد.' };
    }
  },
async escalateSupportTicket(ticketId: string, reason: string, actor?: { id: string; name: string }): Promise<{ success: boolean; error?: string }> {
    if (!reason.trim()) return { success: false, error: 'سبب التصعيد مطلوب.' };
    try {
      await sql`UPDATE support_tickets SET status = 'escalated', escalation_reason = ${reason}, updated_at = NOW() WHERE id = ${ticketId};`;
      await logAudit({ actorId: actor?.id, actorName: actor?.name, action: 'TICKET_ESCALATED', entity: 'support_ticket', entityId: ticketId, reason });
      return { success: true };
    } catch (err: any) {
      console.error('❌ neonDb.escalateSupportTicket error:', err);
      return { success: false, error: err.message };
    }
  },
async closeSupportTicket(ticketId: string, actor?: { id: string; name: string }): Promise<{ success: boolean; error?: string }> {
    try {
      await sql`UPDATE support_tickets SET status = 'closed', closed_at = NOW(), updated_at = NOW() WHERE id = ${ticketId};`;
      await logAudit({ actorId: actor?.id, actorName: actor?.name, action: 'TICKET_CLOSED', entity: 'support_ticket', entityId: ticketId });
      return { success: true };
    } catch (err: any) {
      console.error('❌ neonDb.closeSupportTicket error:', err);
      return { success: false, error: err.message };
    }
  },
async rateSupportTicket(ticketId: string, rating: number, comment?: string): Promise<{ success: boolean; error?: string }> {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { success: false, error: 'التقييم يجب أن يكون من 1 إلى 5.' };
    try {
      const rows = await sql`
        UPDATE support_tickets SET csat_rating = ${rating}, csat_comment = ${comment || null}
        WHERE id = ${ticketId} AND status = 'closed' AND csat_rating IS NULL RETURNING id;
      `;
      if (!rows.length) return { success: false, error: 'لا يمكن تقييم هذه المحادثة الآن.' };
      return { success: true };
    } catch (err: any) {
      console.error('❌ neonDb.rateSupportTicket error:', err);
      return { success: false, error: err.message };
    }
  },
async logWishlistEvent(customerId: string, productId: string): Promise<void> {
    try {
      await sql`INSERT INTO wishlist_events (id, customer_id, product_id) VALUES (${`wish-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`}, ${customerId}, ${productId});`;
    } catch (error) {
      console.warn('⚠️ Could not log wishlist event:', error);
    }
  },
async getWishlistGap(limit = 5): Promise<{ product_id: string; name_ar: string; interest_count: number }[]> {
    try {
      const rows = await sql`
        SELECT w.product_id, p.name_ar, COUNT(*)::int AS interest_count
        FROM wishlist_events w JOIN products p ON p.id = w.product_id
        WHERE p.stock_quantity <= 0 AND w.created_at > NOW() - INTERVAL '60 days'
        GROUP BY w.product_id, p.name_ar
        ORDER BY interest_count DESC LIMIT ${limit};
      `;
      return rows as any[];
    } catch (error) {
      console.error('❌ neonDb.getWishlistGap error:', error);
      return [];
    }
  }
};
