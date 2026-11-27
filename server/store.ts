import { cancelOrder as cancelStoredOrder } from './orderWrites.js';
/// <reference types="vite/client" />
import { neon } from '@neondatabase/serverless';
import { decodeDeliveryNotes, encodeDeliveryNotes, formatDeliveryAddress } from '../src/utils/deliveryAddress.js';
import type { Product, Order, CategoryKey, OrderStatus, PaymentMethod, PaymentStatus } from '../src/types/index.js';
import {
    DEFAULT_WHATSAPP_TEMPLATES,
    buildServerOrderWhatsAppMessage,
    dispatchWhatsAppViaCrm,
    ensureWhatsAppNotificationsTable,
    resolveCrmConfig,
    resolveWhatsAppAutoTriggers,
    testWhatsAppCrmConnection
} from './whatsappCrm.js';
import { toAdminPaymentGatewayState, resolvePaymentGatewayConfig } from './paymentGateway.js';

// Read connection string strictly from environment variables
// Dev configuration loads .env after imports. Resolve the server connection when
// a query runs, so localhost and deployed functions use the same private setting.
const queryClient = () => neon(process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || '');
const sql: any = Object.assign((strings: any, ...values: any[]) => queryClient()(strings, ...values), {
    query: (...args: any[]) => (queryClient().query as any)(...args)
});

let crmSchemaReady: Promise<void> | null = null;
export async function ensureUserCrmColumns(): Promise<void> {
    if (!crmSchemaReady) {
        crmSchemaReady = (async () => {
            await sql.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;`);
            await sql.query(`
              ALTER TABLE active_carts
                ADD COLUMN IF NOT EXISTS source_channel VARCHAR(80),
                ADD COLUMN IF NOT EXISTS source_label VARCHAR(160),
                ADD COLUMN IF NOT EXISTS referrer TEXT,
                ADD COLUMN IF NOT EXISTS landing_path TEXT,
                ADD COLUMN IF NOT EXISTS utm_source VARCHAR(120),
                ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(120),
                ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(160),
                ADD COLUMN IF NOT EXISTS utm_content VARCHAR(160),
                ADD COLUMN IF NOT EXISTS utm_term VARCHAR(160),
                ADD COLUMN IF NOT EXISTS click_id VARCHAR(200),
                ADD COLUMN IF NOT EXISTS device_type VARCHAR(40);
            `);
            await sql.query(`
              CREATE TABLE IF NOT EXISTS visitor_sessions (
                session_id TEXT PRIMARY KEY,
                customer_id TEXT,
                customer_name TEXT,
                customer_phone TEXT,
                customer_email TEXT,
                source_channel TEXT,
                source_label TEXT,
                referrer TEXT,
                landing_path TEXT,
                last_path TEXT,
                utm_source TEXT,
                utm_medium TEXT,
                utm_campaign TEXT,
                utm_content TEXT,
                utm_term TEXT,
                click_id TEXT,
                device_type TEXT,
                user_agent TEXT,
                metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
                first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                visit_count INTEGER NOT NULL DEFAULT 1
              );
            `);
            await sql.query(`
              ALTER TABLE visitor_sessions
                ADD COLUMN IF NOT EXISTS customer_email TEXT,
                ADD COLUMN IF NOT EXISTS utm_content TEXT,
                ADD COLUMN IF NOT EXISTS utm_term TEXT,
                ADD COLUMN IF NOT EXISTS click_id TEXT,
                ADD COLUMN IF NOT EXISTS user_agent TEXT,
                ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
                ADD COLUMN IF NOT EXISTS visit_count INTEGER NOT NULL DEFAULT 1;
            `);
        })().catch(err => {
            crmSchemaReady = null;
            throw err;
        });
    }
    return crmSchemaReady;
}
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
          const sanitizedImages = (Array.isArray(product.images) ? product.images : [])
            .filter((url: any) => typeof url === 'string' && url.trim())
            .map((url: string) => {
              let u = url.trim().replace(/\/+$/, '');
              if (!/^(https?:|data:|blob:)/i.test(u) && !u.startsWith('/')) {
                u = '/' + u;
              }
              return u;
            });
          setParts.push(`images = $${pIdx++}::jsonb`);
          params.push(JSON.stringify(sanitizedImages));
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
        actionType: 'search' | 'view_product' | 'view_category' | 'add_to_cart' | 'visit' | 'wishlist';
        targetId?: string;
        metadata?: Record<string, any>;
    }): Promise<void> {
        try {
            await ensureUserCrmColumns().catch(() => {});
            const meta = activity.metadata && typeof activity.metadata === 'object' ? activity.metadata : {};
            const sessionId = String(activity.sessionId || '').trim();
            const sessionMeta: Record<string, any> = {};
            for (const key of [
                'ip_address', 'geo_country', 'geo_region', 'geo_city',
                'screen_size', 'viewport', 'browser_lang', 'timezone',
                'cookie_consent', 'app_language', 'governorate', 'city'
            ]) {
                if (meta[key] !== undefined && meta[key] !== null && meta[key] !== '') {
                    sessionMeta[key] = String(meta[key]).slice(0, 200);
                }
            }
            if (sessionId) {
                await sql`
                  INSERT INTO visitor_sessions (
                    session_id, customer_id, source_channel, source_label, referrer,
                    landing_path, last_path, utm_source, utm_medium, utm_campaign,
                    utm_content, utm_term, click_id, device_type, user_agent, metadata,
                    first_seen_at, last_seen_at, visit_count
                  )
                  VALUES (
                    ${sessionId},
                    ${activity.customerId || null},
                    ${meta.source_channel || null},
                    ${meta.source_label || null},
                    ${meta.referrer || null},
                    ${meta.landing_path || meta.path || null},
                    ${meta.path || meta.landing_path || null},
                    ${meta.utm_source || null},
                    ${meta.utm_medium || null},
                    ${meta.utm_campaign || null},
                    ${meta.utm_content || null},
                    ${meta.utm_term || null},
                    ${meta.click_id || null},
                    ${meta.device_type || null},
                    ${meta.user_agent || meta.server_user_agent || null},
                    ${JSON.stringify(sessionMeta)}::jsonb,
                    NOW(), NOW(), 1
                  )
                  ON CONFLICT (session_id) DO UPDATE SET
                    customer_id = COALESCE(EXCLUDED.customer_id, visitor_sessions.customer_id),
                    source_channel = COALESCE(visitor_sessions.source_channel, EXCLUDED.source_channel),
                    source_label = COALESCE(visitor_sessions.source_label, EXCLUDED.source_label),
                    referrer = COALESCE(visitor_sessions.referrer, EXCLUDED.referrer),
                    landing_path = COALESCE(visitor_sessions.landing_path, EXCLUDED.landing_path),
                    last_path = COALESCE(EXCLUDED.last_path, visitor_sessions.last_path),
                    utm_source = COALESCE(visitor_sessions.utm_source, EXCLUDED.utm_source),
                    utm_medium = COALESCE(visitor_sessions.utm_medium, EXCLUDED.utm_medium),
                    utm_campaign = COALESCE(visitor_sessions.utm_campaign, EXCLUDED.utm_campaign),
                    utm_content = COALESCE(visitor_sessions.utm_content, EXCLUDED.utm_content),
                    utm_term = COALESCE(visitor_sessions.utm_term, EXCLUDED.utm_term),
                    click_id = COALESCE(visitor_sessions.click_id, EXCLUDED.click_id),
                    device_type = COALESCE(EXCLUDED.device_type, visitor_sessions.device_type),
                    user_agent = COALESCE(EXCLUDED.user_agent, visitor_sessions.user_agent),
                    metadata = COALESCE(visitor_sessions.metadata, '{}'::jsonb) || EXCLUDED.metadata,
                    last_seen_at = NOW(),
                    visit_count = visitor_sessions.visit_count + CASE WHEN ${activity.actionType} = 'visit' THEN 1 ELSE 0 END;
                `.catch(() => {});
            }
            if (activity.customerId) {
                await sql`UPDATE users SET last_seen_at = NOW() WHERE id = ${activity.customerId}`.catch(() => {});
            }
            if (activity.actionType !== 'visit') {
                await sql`
                  INSERT INTO customer_activity (session_id, customer_id, action_type, target_id, metadata)
                  VALUES (
                    ${sessionId},
                    ${activity.customerId || null},
                    ${activity.actionType},
                    ${activity.targetId || null},
                    ${JSON.stringify(meta)}::jsonb
                  );
                `;
            }
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
        customerId?: string;
        customerName?: string;
        customerPhone?: string;
        customerEmail?: string;
        items: any[];
        subtotal: number;
        attribution?: Record<string, any>;
    }): Promise<void> {
        try {
            await ensureUserCrmColumns().catch(() => {});
            const attr = cart.attribution && typeof cart.attribution === 'object' ? cart.attribution : {};
            const cleanName = cart.customerName?.trim() || null;
            const cleanPhone = cart.customerPhone?.trim() || null;
            const cleanEmail = cart.customerEmail?.trim().toLowerCase() || null;
            const sessionMeta: Record<string, any> = {};
            for (const key of ['ip_address', 'geo_country', 'geo_region', 'geo_city', 'governorate', 'city']) {
                if (attr[key] !== undefined && attr[key] !== null && attr[key] !== '') {
                    sessionMeta[key] = String(attr[key]).slice(0, 200);
                }
            }
            if (cart.sessionId && (cleanName || cleanPhone || cleanEmail || cart.customerId || attr.source_channel || attr.landing_path)) {
                await sql`
                  INSERT INTO visitor_sessions (
                    session_id, customer_id, customer_name, customer_phone, customer_email,
                    source_channel, source_label, referrer, landing_path, last_path,
                    utm_source, utm_medium, utm_campaign, utm_content, utm_term, click_id, device_type, user_agent, metadata,
                    first_seen_at, last_seen_at, visit_count
                  )
                  VALUES (
                    ${cart.sessionId}, ${cart.customerId || null}, ${cleanName}, ${cleanPhone}, ${cleanEmail},
                    ${attr.source_channel || null}, ${attr.source_label || null}, ${attr.referrer || null},
                    ${attr.landing_path || null}, ${attr.last_path || attr.landing_path || null},
                    ${attr.utm_source || null}, ${attr.utm_medium || null}, ${attr.utm_campaign || null},
                    ${attr.utm_content || null}, ${attr.utm_term || null}, ${attr.click_id || null},
                    ${attr.device_type || null}, ${attr.server_user_agent || null}, ${JSON.stringify(sessionMeta)}::jsonb,
                    NOW(), NOW(), 1
                  )
                  ON CONFLICT (session_id) DO UPDATE SET
                    customer_id = COALESCE(EXCLUDED.customer_id, visitor_sessions.customer_id),
                    customer_name = COALESCE(EXCLUDED.customer_name, visitor_sessions.customer_name),
                    customer_phone = COALESCE(EXCLUDED.customer_phone, visitor_sessions.customer_phone),
                    customer_email = COALESCE(EXCLUDED.customer_email, visitor_sessions.customer_email),
                    source_channel = COALESCE(visitor_sessions.source_channel, EXCLUDED.source_channel),
                    source_label = COALESCE(visitor_sessions.source_label, EXCLUDED.source_label),
                    referrer = COALESCE(visitor_sessions.referrer, EXCLUDED.referrer),
                    landing_path = COALESCE(visitor_sessions.landing_path, EXCLUDED.landing_path),
                    last_path = COALESCE(EXCLUDED.last_path, visitor_sessions.last_path),
                    utm_source = COALESCE(visitor_sessions.utm_source, EXCLUDED.utm_source),
                    utm_medium = COALESCE(visitor_sessions.utm_medium, EXCLUDED.utm_medium),
                    utm_campaign = COALESCE(visitor_sessions.utm_campaign, EXCLUDED.utm_campaign),
                    utm_content = COALESCE(visitor_sessions.utm_content, EXCLUDED.utm_content),
                    utm_term = COALESCE(visitor_sessions.utm_term, EXCLUDED.utm_term),
                    click_id = COALESCE(visitor_sessions.click_id, EXCLUDED.click_id),
                    device_type = COALESCE(EXCLUDED.device_type, visitor_sessions.device_type),
                    user_agent = COALESCE(visitor_sessions.user_agent, EXCLUDED.user_agent),
                    metadata = COALESCE(visitor_sessions.metadata, '{}'::jsonb) || EXCLUDED.metadata,
                    last_seen_at = NOW();
                `.catch(() => {});
            }
            if (!cart.items || cart.items.length === 0) {
                await sql`DELETE FROM active_carts WHERE session_id = ${cart.sessionId};`;
                return;
            }
            await sql`
        INSERT INTO active_carts (
          session_id, customer_name, customer_phone, items, subtotal, is_abandoned, last_updated_at,
          source_channel, source_label, referrer, landing_path, utm_source, utm_medium, utm_campaign, utm_content, utm_term, click_id, device_type
        )
        VALUES (
          ${cart.sessionId},
          ${cleanName},
          ${cleanPhone},
          ${JSON.stringify(cart.items)}::jsonb,
          ${cart.subtotal},
          false,
          NOW(),
          ${attr.source_channel || null}, ${attr.source_label || null}, ${attr.referrer || null},
          ${attr.landing_path || null}, ${attr.utm_source || null}, ${attr.utm_medium || null},
          ${attr.utm_campaign || null}, ${attr.utm_content || null}, ${attr.utm_term || null},
          ${attr.click_id || null}, ${attr.device_type || null}
        )
        ON CONFLICT (session_id) DO UPDATE SET
          customer_name = COALESCE(EXCLUDED.customer_name, active_carts.customer_name),
          customer_phone = COALESCE(EXCLUDED.customer_phone, active_carts.customer_phone),
          items = EXCLUDED.items,
          subtotal = EXCLUDED.subtotal,
          is_abandoned = false,
          last_updated_at = NOW(),
          source_channel = COALESCE(active_carts.source_channel, EXCLUDED.source_channel),
          source_label = COALESCE(active_carts.source_label, EXCLUDED.source_label),
          referrer = COALESCE(active_carts.referrer, EXCLUDED.referrer),
          landing_path = COALESCE(active_carts.landing_path, EXCLUDED.landing_path),
          utm_source = COALESCE(active_carts.utm_source, EXCLUDED.utm_source),
          utm_medium = COALESCE(active_carts.utm_medium, EXCLUDED.utm_medium),
          utm_campaign = COALESCE(active_carts.utm_campaign, EXCLUDED.utm_campaign),
          utm_content = COALESCE(active_carts.utm_content, EXCLUDED.utm_content),
          utm_term = COALESCE(active_carts.utm_term, EXCLUDED.utm_term),
          click_id = COALESCE(active_carts.click_id, EXCLUDED.click_id),
          device_type = COALESCE(EXCLUDED.device_type, active_carts.device_type);
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
            recQuery += ` ORDER BY (CASE WHEN COALESCE(stock_quantity, 0) > 0 THEN 1 ELSE 0 END) DESC, is_featured DESC, created_at DESC LIMIT 6;`;
            let recommendedRows = await sql.query(recQuery, params);
            if (!recommendedRows || recommendedRows.length < 4) {
                const fillRows = await sql `
          SELECT * FROM products 
          WHERE is_active = true 
          ORDER BY (CASE WHEN COALESCE(stock_quantity, 0) > 0 THEN 1 ELSE 0 END) DESC, is_featured DESC, created_at DESC 
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
            await ensureUserCrmColumns().catch(() => {});
            const rows = await sql`
        SELECT
          u.id, u.name, u.email, u.phone, u.avatar, u.role, u.provider,
          u.email_verified, u.addresses, u.created_at, u.last_seen_at, u.admin_permissions,
          COALESCE(ord.orders_count, 0)::int AS orders_count,
          COALESCE(ord.completed_orders_count, 0)::int AS completed_orders_count,
          COALESCE(ord.total_spent, 0)::numeric AS total_spent,
          COALESCE(act.views_count, 0)::int AS views_count,
          COALESCE(act.searches_count, 0)::int AS searches_count,
          GREATEST(u.last_seen_at, vs.last_seen_at, act.last_activity_at, ord.last_order_at) AS last_activity_at,
          vs.source_channel, vs.source_label, vs.utm_source, vs.utm_medium, vs.utm_campaign,
          vs.landing_path, vs.last_path, vs.device_type,
          COALESCE(cart.cart_items_count, 0)::int AS cart_items_count,
          COALESCE(cart.cart_subtotal, 0)::numeric AS cart_subtotal
        FROM users u
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*)::int AS orders_count,
            COUNT(*) FILTER (WHERE o.status != 'cancelled')::int AS completed_orders_count,
            COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total ELSE 0 END), 0) AS total_spent,
            MAX(o.created_at) AS last_order_at
          FROM orders o
          WHERE (u.email IS NOT NULL AND LOWER(COALESCE(o.customer_email, '')) = LOWER(u.email))
             OR (NULLIF(REGEXP_REPLACE(COALESCE(u.phone, ''), '\\D', '', 'g'), '') IS NOT NULL
                 AND REGEXP_REPLACE(COALESCE(o.customer_phone, ''), '\\D', '', 'g') = REGEXP_REPLACE(COALESCE(u.phone, ''), '\\D', '', 'g'))
        ) ord ON true
        LEFT JOIN LATERAL (
          SELECT source_channel, source_label, utm_source, utm_medium, utm_campaign, landing_path, last_path, device_type, last_seen_at, session_id
          FROM visitor_sessions vs0
          WHERE vs0.customer_id = u.id
             OR (NULLIF(REGEXP_REPLACE(COALESCE(u.phone, ''), '\\D', '', 'g'), '') IS NOT NULL
                 AND REGEXP_REPLACE(COALESCE(vs0.customer_phone, ''), '\\D', '', 'g') = REGEXP_REPLACE(COALESCE(u.phone, ''), '\\D', '', 'g'))
          ORDER BY vs0.last_seen_at DESC
          LIMIT 1
        ) vs ON true
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*) FILTER (WHERE ca.action_type = 'view_product')::int AS views_count,
            COUNT(*) FILTER (WHERE ca.action_type = 'search')::int AS searches_count,
            MAX(ca.created_at) AS last_activity_at
          FROM customer_activity ca
          WHERE ca.customer_id = u.id OR (vs.session_id IS NOT NULL AND ca.session_id = vs.session_id)
        ) act ON true
        LEFT JOIN LATERAL (
          SELECT
            COALESCE(SUM(COALESCE((elem->>'quantity')::int, 1)), 0)::int AS cart_items_count,
            MAX(ac.subtotal) AS cart_subtotal
          FROM active_carts ac
          CROSS JOIN LATERAL jsonb_array_elements(COALESCE(ac.items, '[]'::jsonb)) elem
          WHERE (vs.session_id IS NOT NULL AND ac.session_id = vs.session_id)
             OR (NULLIF(REGEXP_REPLACE(COALESCE(u.phone, ''), '\\D', '', 'g'), '') IS NOT NULL
                 AND REGEXP_REPLACE(COALESCE(ac.customer_phone, ''), '\\D', '', 'g') = REGEXP_REPLACE(COALESCE(u.phone, ''), '\\D', '', 'g'))
        ) cart ON true
        ORDER BY u.created_at DESC;
      `;
            return rows || [];
        }
        catch (err) {
            console.error('❌ neonDb.getAllUsers error:', err);
            try {
                const fallback = await sql`
                  SELECT id, name, email, phone, avatar, role, provider, email_verified, addresses, created_at, admin_permissions
                  FROM users ORDER BY created_at DESC;
                `;
                return fallback || [];
            } catch {
                return [];
            }
        }
    },
    async getUserInsights(userId: string): Promise<any> {
        try {
            await ensureUserCrmColumns().catch(() => {});
            const uRows = await sql`
              SELECT id, name, email, phone, avatar, role, provider, email_verified, addresses, created_at, last_seen_at
              FROM users WHERE id = ${userId} LIMIT 1;
            `;
            const userRow = uRows[0];
            if (!userRow) return null;

            const normPhone = String(userRow.phone || '').replace(/\D/g, '');
            const sessionRows = await sql`
              SELECT session_id, source_channel, source_label, referrer, landing_path, last_path,
                     utm_source, utm_medium, utm_campaign, device_type, first_seen_at, last_seen_at, visit_count
              FROM visitor_sessions
              WHERE customer_id = ${userId}
                 OR (${normPhone || null}::text IS NOT NULL AND REGEXP_REPLACE(COALESCE(customer_phone, ''), '\\D', '', 'g') = ${normPhone || null})
              ORDER BY last_seen_at DESC
              LIMIT 10;
            `;
            const sessionIds = sessionRows.map((s: any) => s.session_id).filter(Boolean);

            const viewedRows = await sql`
              SELECT DISTINCT ON (ca.target_id)
                ca.target_id AS product_id,
                ca.created_at AS viewed_at,
                p.name_ar, p.name_en, p.brand, p.category, p.price, p.images
              FROM customer_activity ca
              LEFT JOIN products p ON p.id = ca.target_id
              WHERE ca.action_type = 'view_product'
                AND ca.target_id IS NOT NULL
                AND (ca.customer_id = ${userId} OR ca.session_id = ANY(${sessionIds}::text[]))
              ORDER BY ca.target_id, ca.created_at DESC
              LIMIT 50;
            `.catch(() => []);
            const recentViews = [...viewedRows]
              .sort((a: any, b: any) => new Date(b.viewed_at).getTime() - new Date(a.viewed_at).getTime())
              .slice(0, 15);

            const cartRows = await sql`
              SELECT session_id, items, subtotal, is_abandoned, last_updated_at
              FROM active_carts
              WHERE session_id = ANY(${sessionIds}::text[])
                 OR (${normPhone || null}::text IS NOT NULL AND REGEXP_REPLACE(COALESCE(customer_phone, ''), '\\D', '', 'g') = ${normPhone || null})
              ORDER BY last_updated_at DESC
              LIMIT 1;
            `.catch(() => []);

            const orderRows = await sql`
              SELECT * FROM orders
              WHERE (LOWER(COALESCE(customer_email, '')) = LOWER(${userRow.email || ''}) AND ${userRow.email || null} IS NOT NULL)
                 OR (${normPhone || null}::text IS NOT NULL AND REGEXP_REPLACE(COALESCE(customer_phone, ''), '\\D', '', 'g') = ${normPhone || null})
              ORDER BY created_at DESC
              LIMIT 100;
            `.catch(() => []);
            const orders = (orderRows || []).map(mapRowToOrder);
            const activeOrders = orders.filter((o: any) => o.order_status !== 'cancelled');
            const totalSpent = activeOrders.reduce((s: number, o: any) => s + Number(o.total || 0), 0);

            const searches = await sql`
              SELECT COALESCE(NULLIF(target_id, ''), metadata->>'query') AS query,
                     metadata->>'category' AS category,
                     created_at
              FROM customer_activity
              WHERE action_type = 'search'
                AND COALESCE(NULLIF(target_id, ''), metadata->>'query') IS NOT NULL
                AND (customer_id = ${userId} OR session_id = ANY(${sessionIds}::text[]))
              ORDER BY created_at DESC
              LIMIT 20;
            `.catch(() => []);

            return {
                user: userRow,
                sessions: sessionRows || [],
                recent_views: recentViews,
                searches: searches || [],
                active_cart: cartRows[0] || null,
                orders,
                stats: {
                    total_orders: orders.length,
                    completed_orders: activeOrders.length,
                    cancelled_orders: orders.length - activeOrders.length,
                    total_spent: totalSpent,
                    distinct_products_viewed: recentViews.length,
                    searches_count: (searches || []).length
                }
            };
        } catch (err) {
            console.error('❌ neonDb.getUserInsights error:', err);
            return null;
        }
    },
    async getGuestVisitors(limit = 300): Promise<any[]> {
        try {
            await ensureUserCrmColumns().catch(() => {});
            const rows = await sql`
              SELECT
                vs.session_id,
                vs.customer_id,
                COALESCE(vs.customer_name, ac.customer_name) AS customer_name,
                COALESCE(vs.customer_phone, ac.customer_phone) AS customer_phone,
                vs.customer_email,
                vs.source_channel, vs.source_label, vs.referrer, vs.landing_path, vs.last_path,
                vs.utm_source, vs.utm_medium, vs.utm_campaign, vs.utm_content, vs.utm_term, vs.click_id,
                vs.device_type, vs.user_agent, vs.metadata,
                vs.first_seen_at, vs.last_seen_at, COALESCE(vs.visit_count, 1)::int AS visit_count,
                ac.items AS cart_items,
                COALESCE(
                  (SELECT SUM(COALESCE((elem->>'quantity')::int, 1))
                   FROM jsonb_array_elements(COALESCE(ac.items, '[]'::jsonb)) elem),
                  0
                )::int AS cart_items_count,
                COALESCE(ac.subtotal, 0)::numeric AS cart_subtotal,
                COALESCE(ac.is_abandoned, false) AS cart_abandoned,
                ac.last_updated_at AS cart_updated_at,
                COALESCE(act.views_count, 0)::int AS views_count,
                COALESCE(act.searches_count, 0)::int AS searches_count,
                COALESCE(act.add_to_cart_count, 0)::int AS add_to_cart_count,
                COALESCE(act.category_views_count, 0)::int AS category_views_count,
                COALESCE(act.wishlist_count, 0)::int AS wishlist_count,
                COALESCE(act.total_events_count, 0)::int AS total_events_count,
                act.last_search_query,
                act.last_viewed_product_name,
                COALESCE(ord.orders_count, 0)::int AS orders_count,
                COALESCE(ord.completed_orders_count, 0)::int AS completed_orders_count,
                COALESCE(ord.total_spent, 0)::numeric AS total_spent,
                COALESCE(rev.reviews_count, 0)::int AS reviews_count,
                COALESCE(tkt.tickets_count, 0)::int AS tickets_count,
                (vs.customer_id IS NOT NULL) AS has_account
              FROM visitor_sessions vs
              LEFT JOIN active_carts ac ON ac.session_id = vs.session_id
              LEFT JOIN LATERAL (
                SELECT
                  COUNT(*) FILTER (WHERE ca.action_type = 'view_product')::int AS views_count,
                  COUNT(*) FILTER (WHERE ca.action_type = 'search')::int AS searches_count,
                  COUNT(*) FILTER (WHERE ca.action_type = 'add_to_cart')::int AS add_to_cart_count,
                  COUNT(*) FILTER (WHERE ca.action_type = 'view_category')::int AS category_views_count,
                  COUNT(*) FILTER (WHERE ca.action_type = 'wishlist')::int AS wishlist_count,
                  COUNT(*)::int AS total_events_count,
                  (SELECT COALESCE(NULLIF(ca2.target_id, ''), ca2.metadata->>'query')
                   FROM customer_activity ca2
                   WHERE ca2.session_id = vs.session_id
                     AND ca2.action_type = 'search'
                     AND COALESCE(NULLIF(ca2.target_id, ''), ca2.metadata->>'query') IS NOT NULL
                   ORDER BY ca2.created_at DESC
                   LIMIT 1) AS last_search_query,
                  (SELECT COALESCE(p2.name_ar, ca3.metadata->>'product_name', ca3.target_id)
                   FROM customer_activity ca3
                   LEFT JOIN products p2 ON p2.id = ca3.target_id
                   WHERE ca3.session_id = vs.session_id
                     AND ca3.action_type = 'view_product'
                   ORDER BY ca3.created_at DESC
                   LIMIT 1) AS last_viewed_product_name
                FROM customer_activity ca
                WHERE ca.session_id = vs.session_id
              ) act ON true
              LEFT JOIN LATERAL (
                SELECT
                  COUNT(*)::int AS orders_count,
                  COUNT(*) FILTER (WHERE o.status != 'cancelled')::int AS completed_orders_count,
                  COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total ELSE 0 END), 0) AS total_spent
                FROM orders o
                WHERE (
                  NULLIF(REGEXP_REPLACE(COALESCE(vs.customer_phone, ac.customer_phone, ''), '\\D', '', 'g'), '') IS NOT NULL
                  AND REGEXP_REPLACE(COALESCE(o.customer_phone, ''), '\\D', '', 'g') = REGEXP_REPLACE(COALESCE(vs.customer_phone, ac.customer_phone, ''), '\\D', '', 'g')
                ) OR (
                  vs.customer_email IS NOT NULL AND vs.customer_email <> ''
                  AND LOWER(COALESCE(o.customer_email, '')) = LOWER(vs.customer_email)
                )
              ) ord ON true
              LEFT JOIN LATERAL (
                SELECT COUNT(*)::int AS reviews_count
                FROM product_reviews pr
                WHERE pr.session_id = vs.session_id
              ) rev ON true
              LEFT JOIN LATERAL (
                SELECT COUNT(*)::int AS tickets_count
                FROM support_tickets st
                WHERE NULLIF(REGEXP_REPLACE(COALESCE(vs.customer_phone, ac.customer_phone, ''), '\\D', '', 'g'), '') IS NOT NULL
                  AND REGEXP_REPLACE(COALESCE(st.customer_phone, ''), '\\D', '', 'g') = REGEXP_REPLACE(COALESCE(vs.customer_phone, ac.customer_phone, ''), '\\D', '', 'g')
              ) tkt ON true
              WHERE vs.customer_id IS NULL
              ORDER BY vs.last_seen_at DESC
              LIMIT ${Math.min(500, Math.max(10, Number(limit) || 300))};
            `;
            return rows || [];
        } catch (err) {
            console.error('❌ neonDb.getGuestVisitors error:', err);
            return [];
        }
    },
    async getGuestInsights(sessionId: string): Promise<any> {
        try {
            await ensureUserCrmColumns().catch(() => {});
            const sRows = await sql`SELECT * FROM visitor_sessions WHERE session_id = ${sessionId} LIMIT 1;`;
            const session = sRows[0];
            if (!session) return null;

            const viewedRows = await sql`
              SELECT DISTINCT ON (ca.target_id)
                ca.target_id AS product_id, ca.created_at AS viewed_at,
                COALESCE(p.name_ar, ca.metadata->>'product_name') AS name_ar,
                p.name_en,
                COALESCE(p.brand, ca.metadata->>'brand') AS brand,
                COALESCE(p.category, ca.metadata->>'category') AS category,
                p.price, p.images
              FROM customer_activity ca
              LEFT JOIN products p ON p.id = ca.target_id
              WHERE ca.session_id = ${sessionId} AND ca.action_type = 'view_product' AND ca.target_id IS NOT NULL
              ORDER BY ca.target_id, ca.created_at DESC
              LIMIT 60;
            `.catch(() => []);
            const recentViews = [...viewedRows]
              .sort((a: any, b: any) => new Date(b.viewed_at).getTime() - new Date(a.viewed_at).getTime())
              .slice(0, 30);

            const searches = await sql`
              SELECT COALESCE(NULLIF(target_id, ''), metadata->>'query') AS query,
                     metadata->>'category' AS category,
                     created_at
              FROM customer_activity
              WHERE session_id = ${sessionId}
                AND action_type = 'search'
                AND COALESCE(NULLIF(target_id, ''), metadata->>'query') IS NOT NULL
              ORDER BY created_at DESC LIMIT 30;
            `.catch(() => []);

            const categoryViews = await sql`
              SELECT COALESCE(NULLIF(target_id, ''), metadata->>'category') AS category,
                     COUNT(*)::int AS count,
                     MAX(created_at) AS last_viewed_at
              FROM customer_activity
              WHERE session_id = ${sessionId}
                AND action_type = 'view_category'
                AND COALESCE(NULLIF(target_id, ''), metadata->>'category') IS NOT NULL
              GROUP BY 1
              ORDER BY last_viewed_at DESC LIMIT 20;
            `.catch(() => []);

            const cartEvents = await sql`
              SELECT ca.target_id AS product_id,
                     COALESCE(p.name_ar, ca.metadata->>'product_name', ca.target_id) AS name_ar,
                     p.price, p.brand,
                     COALESCE((ca.metadata->>'quantity')::int, 1) AS quantity,
                     ca.created_at
              FROM customer_activity ca
              LEFT JOIN products p ON p.id = ca.target_id
              WHERE ca.session_id = ${sessionId} AND ca.action_type = 'add_to_cart'
              ORDER BY ca.created_at DESC LIMIT 30;
            `.catch(() => []);

            const wishlistEvents = await sql`
              SELECT DISTINCT ON (ca.target_id)
                ca.target_id AS product_id,
                COALESCE(p.name_ar, ca.metadata->>'product_name', ca.target_id) AS name_ar,
                p.price, p.brand, p.images,
                ca.created_at
              FROM customer_activity ca
              LEFT JOIN products p ON p.id = ca.target_id
              WHERE ca.session_id = ${sessionId} AND ca.action_type = 'wishlist' AND ca.target_id IS NOT NULL
              ORDER BY ca.target_id, ca.created_at DESC LIMIT 30;
            `.catch(() => []);

            const timeline = await sql`
              SELECT ca.id, ca.action_type, ca.target_id, ca.metadata, ca.created_at,
                     p.name_ar AS product_name_ar, p.price AS product_price
              FROM customer_activity ca
              LEFT JOIN products p ON p.id = ca.target_id AND ca.action_type IN ('view_product', 'add_to_cart', 'wishlist')
              WHERE ca.session_id = ${sessionId}
              ORDER BY ca.created_at DESC
              LIMIT 60;
            `.catch(() => []);

            const cartRows = await sql`SELECT * FROM active_carts WHERE session_id = ${sessionId} LIMIT 1;`.catch(() => []);
            const normPhone = String(session.customer_phone || cartRows[0]?.customer_phone || '').replace(/\D/g, '');
            const cleanEmail = String(session.customer_email || '').trim().toLowerCase();
            const orderRows = (normPhone || cleanEmail)
              ? await sql`
                  SELECT * FROM orders
                  WHERE (${normPhone || null}::text IS NOT NULL AND REGEXP_REPLACE(COALESCE(customer_phone, ''), '\\D', '', 'g') = ${normPhone || null})
                     OR (${cleanEmail || null}::text IS NOT NULL AND LOWER(COALESCE(customer_email, '')) = ${cleanEmail || null})
                  ORDER BY created_at DESC LIMIT 30;
                `.catch(() => [])
              : [];

            const reviewRows = await sql`
              SELECT id, product_id, product_name_ar, author_name, author_phone, rating, comment, status, created_at
              FROM product_reviews
              WHERE session_id = ${sessionId}
              ORDER BY created_at DESC LIMIT 20;
            `.catch(() => []);

            const ticketRows = normPhone
              ? await sql`
                  SELECT id, customer_phone, customer_name, subject, status, order_id, created_at, updated_at
                  FROM support_tickets
                  WHERE REGEXP_REPLACE(COALESCE(customer_phone, ''), '\\D', '', 'g') = ${normPhone}
                  ORDER BY updated_at DESC LIMIT 20;
                `.catch(() => [])
              : [];

            const mappedOrders = (orderRows || []).map(mapRowToOrder);
            const activeOrders = mappedOrders.filter((o: any) => o.order_status !== 'cancelled');
            const totalSpent = activeOrders.reduce((s: number, o: any) => s + Number(o.total || 0), 0);

            return {
                visitor: session,
                recent_views: recentViews,
                searches: searches || [],
                category_views: categoryViews || [],
                cart_events: cartEvents || [],
                wishlist_events: wishlistEvents || [],
                timeline: timeline || [],
                active_cart: cartRows[0] || null,
                orders: mappedOrders,
                reviews: reviewRows || [],
                support_tickets: ticketRows || [],
                stats: {
                    views_count: recentViews.length,
                    searches_count: (searches || []).length,
                    categories_count: (categoryViews || []).length,
                    add_to_cart_count: (cartEvents || []).length,
                    wishlist_count: (wishlistEvents || []).length,
                    total_orders: mappedOrders.length,
                    completed_orders: activeOrders.length,
                    total_spent: totalSpent,
                    reviews_count: (reviewRows || []).length,
                    tickets_count: (ticketRows || []).length
                }
            };
        } catch (err) {
            console.error('❌ neonDb.getGuestInsights error:', err);
            return null;
        }
    },
    async deleteGuestVisitor(sessionId: string): Promise<{ success: boolean }> {
        try {
            await ensureUserCrmColumns().catch(() => {});
            await sql`DELETE FROM active_carts WHERE session_id = ${sessionId};`.catch(() => {});
            await sql`DELETE FROM customer_activity WHERE session_id = ${sessionId};`.catch(() => {});
            await sql`DELETE FROM visitor_sessions WHERE session_id = ${sessionId};`;
            return { success: true };
        } catch {
            return { success: false };
        }
    },
    async getRecentlyViewedProductIds(sessionId: string, customerId?: string | null, limit = 12): Promise<string[]> {
        try {
            const sid = String(sessionId || '').trim();
            const uid = customerId ? String(customerId).trim() : null;
            if (!sid && !uid) return [];
            const rows = await sql`
              SELECT target_id, MAX(created_at) AS last_viewed
              FROM customer_activity
              WHERE action_type = 'view_product'
                AND target_id IS NOT NULL
                AND ((${sid || null}::text IS NOT NULL AND session_id = ${sid || null})
                  OR (${uid}::text IS NOT NULL AND customer_id = ${uid}))
              GROUP BY target_id
              ORDER BY last_viewed DESC
              LIMIT ${Math.min(24, Math.max(1, Number(limit) || 12))};
            `;
            return (rows || []).map((r: any) => String(r.target_id)).filter(Boolean);
        } catch {
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
      try {
        const settings = await this.getStoreSettings();
        const crm = resolveCrmConfig(settings);
        const triggerKey = status === 'confirmed' ? 'order_confirmed' : status;
        if (crm.shouldAutoSend(triggerKey as any) && ['confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'].includes(status)) {
          const orderRows = await sql`SELECT * FROM orders WHERE id = ${orderId} OR order_number = ${orderId} LIMIT 1;`;
          if (orderRows[0]) {
            const mappedOrder = mapRowToOrder(orderRows[0]);
            const recipient = mappedOrder.customer_whatsapp || mappedOrder.customer_phone;
            const msgType = status === 'confirmed' ? 'order_confirmed' : status;
            const msgText = buildServerOrderWhatsAppMessage(msgType as any, mappedOrder, settings);
            await dispatchWhatsAppViaCrm(sql, {
              recipient,
              text: msgText,
              type: msgType as any,
              orderId: mappedOrder.id,
              orderNumber: mappedOrder.order_number,
              settings
            });
          }
        }
      } catch (waErr) {
        console.warn('⚠️ WhatsApp status dispatch skipped:', waErr);
      }
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
  },
  async getStoreSettings(): Promise<any> {
    try {
      const rows = await sql`SELECT settings FROM store_settings WHERE id = 'main' LIMIT 1;`;
      return rows[0]?.settings || null;
    } catch (error) {
      console.warn('⚠️ Could not load store_settings:', error);
      return null;
    }
  },
  async updateStoreSettings(newSettings: any): Promise<{ success: boolean; error?: string }> {
    try {
      if (!newSettings || typeof newSettings !== 'object') return { success: false, error: 'بيانات غير صالحة' };
      await sql`
        INSERT INTO store_settings (id, settings, updated_at)
        VALUES ('main', ${JSON.stringify(newSettings)}::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET
          settings = EXCLUDED.settings,
          updated_at = NOW();
      `;
      return { success: true };
    } catch (error: any) {
      console.error('❌ neonDb.updateStoreSettings error:', error);
      return { success: false, error: error.message };
    }
  },
  async submitProductReview(review: {
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
    try {
      if (!review.product_id) return { success: false, error: 'معرف المنتج مطلوب.' };
      const author = String(review.author_name || '').trim();
      if (!author) return { success: false, error: 'اسم كاتب التقييم مطلوب.' };
      const rating = Math.max(1, Math.min(5, Math.round(Number(review.rating) || 5)));
      const comment = String(review.comment || '').trim();
      if (!comment) return { success: false, error: 'نص التقييم مطلوب.' };
      if (comment.length > 600) return { success: false, error: 'الحد الأقصى للتعليق هو 600 حرف.' };

      const images = Array.isArray(review.images)
        ? review.images.filter(img => typeof img === 'string' && img.trim()).slice(0, 3)
        : [];

      const id = `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const rows = await sql`
        INSERT INTO product_reviews (
          id, product_id, product_name_ar, author_name, author_phone,
          user_id, session_id, rating, comment, images, status, created_at, updated_at
        ) VALUES (
          ${id},
          ${review.product_id},
          ${review.product_name_ar || null},
          ${author.slice(0, 100)},
          ${review.author_phone ? String(review.author_phone).trim().slice(0, 30) : null},
          ${review.user_id || null},
          ${review.session_id || null},
          ${rating},
          ${comment},
          ${JSON.stringify(images)}::jsonb,
          'pending',
          NOW(),
          NOW()
        )
        RETURNING *;
      `;
      const created = rows[0] ? { ...rows[0], images: Array.isArray(rows[0].images) ? rows[0].images : [] } : undefined;
      if (review.session_id) {
        await ensureUserCrmColumns().catch(() => {});
        await sql`
          UPDATE visitor_sessions
          SET customer_name = COALESCE(${author.slice(0, 100)}, customer_name),
              customer_phone = COALESCE(${review.author_phone ? String(review.author_phone).trim().slice(0, 30) : null}, customer_phone),
              last_seen_at = NOW()
          WHERE session_id = ${review.session_id};
        `.catch(() => {});
      }
      return { success: true, review: created };
    } catch (error: any) {
      console.error('❌ neonDb.submitProductReview error:', error);
      return { success: false, error: error.message || 'تعذر إرسال التقييم' };
    }
  },

  async getProductReviews(productId: string, sessionId?: string, userId?: string): Promise<any[]> {
    try {
      if (!productId) return [];
      let rows;
      if (sessionId || userId) {
        rows = await sql`
          SELECT * FROM product_reviews
          WHERE product_id = ${productId}
            AND (
              status = 'approved'
              OR (status = 'pending' AND (
                (${sessionId || null}::text IS NOT NULL AND session_id = ${sessionId || null})
                OR (${userId || null}::text IS NOT NULL AND user_id = ${userId || null})
              ))
            )
          ORDER BY created_at DESC;
        `;
      } else {
        rows = await sql`
          SELECT * FROM product_reviews
          WHERE product_id = ${productId} AND status = 'approved'
          ORDER BY created_at DESC;
        `;
      }
      return rows.map((r: any) => ({
        ...r,
        images: Array.isArray(r.images) ? r.images : []
      }));
    } catch (error) {
      console.error('❌ neonDb.getProductReviews error:', error);
      return [];
    }
  },

  async getAllProductReviews(params?: { status?: string; productId?: string; limit?: number }): Promise<{
    reviews: any[];
    counts: { pending: number; approved: number; rejected: number; all: number };
  }> {
    try {
      const limit = Math.min(300, Math.max(1, Number(params?.limit) || 100));
      const status = params?.status && ['pending', 'approved', 'rejected'].includes(params.status) ? params.status : null;
      const productId = params?.productId ? String(params.productId).trim() : null;

      let reviews;
      if (status && productId) {
        reviews = await sql`
          SELECT * FROM product_reviews
          WHERE status = ${status} AND product_id = ${productId}
          ORDER BY created_at DESC
          LIMIT ${limit};
        `;
      } else if (status) {
        reviews = await sql`
          SELECT * FROM product_reviews
          WHERE status = ${status}
          ORDER BY created_at DESC
          LIMIT ${limit};
        `;
      } else if (productId) {
        reviews = await sql`
          SELECT * FROM product_reviews
          WHERE product_id = ${productId}
          ORDER BY created_at DESC
          LIMIT ${limit};
        `;
      } else {
        reviews = await sql`
          SELECT * FROM product_reviews
          ORDER BY created_at DESC
          LIMIT ${limit};
        `;
      }

      const countsRows = await sql`
        SELECT
          COUNT(*)::int AS all,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
          COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
          COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected
        FROM product_reviews;
      `;

      const counts = countsRows[0] || { pending: 0, approved: 0, rejected: 0, all: 0 };
      return {
        reviews: reviews.map((r: any) => ({
          ...r,
          images: Array.isArray(r.images) ? r.images : []
        })),
        counts
      };
    } catch (error) {
      console.error('❌ neonDb.getAllProductReviews error:', error);
      return { reviews: [], counts: { pending: 0, approved: 0, rejected: 0, all: 0 } };
    }
  },

  async updateProductReviewStatus(reviewId: string, status: 'approved' | 'rejected', actor?: { id: string; name: string }): Promise<{ success: boolean; error?: string }> {
    try {
      if (!['approved', 'rejected'].includes(status)) {
        return { success: false, error: 'حالة المراجعة غير صالحة.' };
      }
      const rows = await sql`
        UPDATE product_reviews
        SET status = ${status}, updated_at = NOW()
        WHERE id = ${reviewId}
        RETURNING *;
      `;
      if (!rows.length) return { success: false, error: 'المراجعة غير موجودة.' };
      if (actor) {
        await logAudit({
          actorId: actor.id,
          actorName: actor.name,
          action: status === 'approved' ? 'REVIEW_APPROVED' : 'REVIEW_REJECTED',
          entity: 'product_review',
          entityId: reviewId,
          after: { status }
        });
      }
      return { success: true };
    } catch (error: any) {
      console.error('❌ neonDb.updateProductReviewStatus error:', error);
      return { success: false, error: error.message };
    }
  },

  async deleteProductReview(reviewId: string, actor?: { id: string; name: string }): Promise<{ success: boolean; error?: string }> {
    try {
      const rows = await sql`
        DELETE FROM product_reviews
        WHERE id = ${reviewId}
        RETURNING id;
      `;
      if (!rows.length) return { success: false, error: 'المراجعة غير موجودة.' };
      if (actor) {
        await logAudit({
          actorId: actor.id,
          actorName: actor.name,
          action: 'REVIEW_DELETED',
          entity: 'product_review',
          entityId: reviewId
        });
      }
      return { success: true };
    } catch (error: any) {
      console.error('❌ neonDb.deleteProductReview error:', error);
      return { success: false, error: error.message };
    }
  },

  async getWhatsAppAdminConfig(): Promise<any> {
    const settings = (await this.getStoreSettings()) || {};
    const crm = resolveCrmConfig(settings);
    return {
      whatsapp_automation_url: settings.whatsapp_automation_url || '',
      whatsapp_automation_email: settings.whatsapp_automation_email || '',
      has_password: Boolean(settings.whatsapp_automation_pass || process.env.WHATSAPP_CRM_PASSWORD),
      env_configured: Boolean(process.env.WHATSAPP_CRM_URL && process.env.WHATSAPP_CRM_EMAIL && process.env.WHATSAPP_CRM_PASSWORD),
      configured: crm.configured,
      auto_send_on_order: crm.autoSendOnOrder,
      auto_send_on_status_change: crm.autoSendOnStatusChange,
      auto_alert_admin_on_order: crm.autoAlertAdminOnOrder,
      whatsapp_auto_triggers: crm.triggers,
      admin_alert_whatsapp_number: settings.admin_alert_whatsapp_number || '',
      admin_alert_recipients: crm.adminAlertRecipients,
      whatsapp_templates: {
        ...DEFAULT_WHATSAPP_TEMPLATES,
        ...(settings.whatsapp_templates || {})
      }
    };
  },

  async saveWhatsAppAdminConfig(config: any): Promise<{ success: boolean; error?: string }> {
    try {
      const current = (await this.getStoreSettings()) || {};
      const next: any = { ...current };
      if (config.whatsapp_automation_url !== undefined) {
        next.whatsapp_automation_url = String(config.whatsapp_automation_url || '').trim().replace(/\/+$/, '');
      }
      if (config.whatsapp_automation_email !== undefined) {
        next.whatsapp_automation_email = String(config.whatsapp_automation_email || '').trim();
      }
      if (typeof config.whatsapp_automation_pass === 'string' && config.whatsapp_automation_pass.trim()) {
        next.whatsapp_automation_pass = config.whatsapp_automation_pass;
      }
      if (config.whatsapp_auto_triggers && typeof config.whatsapp_auto_triggers === 'object') {
        const sanitizedTriggers = resolveWhatsAppAutoTriggers({
          whatsapp_auto_triggers: {
            ...resolveWhatsAppAutoTriggers(current),
            ...config.whatsapp_auto_triggers
          }
        });
        next.whatsapp_auto_triggers = sanitizedTriggers;
        next.auto_alert_admin_on_order = sanitizedTriggers.admin_new_order;
        next.auto_send_on_order = sanitizedTriggers.order_confirmed;
        next.auto_send_on_status_change = Boolean(
          sanitizedTriggers.payment_verified ||
          sanitizedTriggers.processing ||
          sanitizedTriggers.shipped ||
          sanitizedTriggers.out_for_delivery ||
          sanitizedTriggers.delivered ||
          sanitizedTriggers.cancelled
        );
      } else {
        if (config.auto_send_on_order !== undefined) {
          next.auto_send_on_order = Boolean(config.auto_send_on_order);
        }
        if (config.auto_send_on_status_change !== undefined) {
          next.auto_send_on_status_change = Boolean(config.auto_send_on_status_change);
        }
        if (config.auto_alert_admin_on_order !== undefined) {
          next.auto_alert_admin_on_order = Boolean(config.auto_alert_admin_on_order);
        }
      }
      if (config.admin_alert_whatsapp_number !== undefined) {
        next.admin_alert_whatsapp_number = String(config.admin_alert_whatsapp_number || '').trim();
      }
      if (config.whatsapp_templates && typeof config.whatsapp_templates === 'object') {
        next.whatsapp_templates = {
          ...(current.whatsapp_templates || {}),
          ...config.whatsapp_templates
        };
      }
      return this.updateStoreSettings(next);
    } catch (err: any) {
      return { success: false, error: err?.message || 'تعذر حفظ إعدادات واتساب' };
    }
  },

  async testWhatsAppConnection(): Promise<any> {
    const settings = (await this.getStoreSettings()) || {};
    return testWhatsAppCrmConnection(settings);
  },

  async getWhatsAppNotifications(limit = 60): Promise<any[]> {
    try {
      await ensureWhatsAppNotificationsTable(sql);
      const rows = await sql`
        SELECT id, order_id, order_number, phone, notification_type, message_text, status, error_message, created_at
        FROM whatsapp_notifications
        ORDER BY created_at DESC
        LIMIT ${Math.min(200, Math.max(10, Number(limit) || 60))};
      `;
      return rows || [];
    } catch {
      return [];
    }
  },

  async sendOrderWhatsApp(params: {
    orderId: string;
    type?: string;
    customText?: string;
    recipient?: string;
  }): Promise<any> {
    const settings = (await this.getStoreSettings()) || {};
    const rows = await sql`SELECT * FROM orders WHERE id = ${params.orderId} OR order_number = ${params.orderId} LIMIT 1;`;
    if (!rows[0]) return { success: false, status: 'failed', error: 'الطلب غير موجود.' };
    const order = mapRowToOrder(rows[0]);
    const notifType = (params.type || 'order_confirmed') as any;
    const text = buildServerOrderWhatsAppMessage(notifType, order, settings, params.customText);
    const recipient = params.recipient || order.customer_whatsapp || order.customer_phone;
    return dispatchWhatsAppViaCrm(sql, {
      recipient,
      text,
      type: notifType,
      orderId: order.id,
      orderNumber: order.order_number,
      settings
    });
  },

  async sendTestWhatsApp(params: { phone: string; text: string }): Promise<any> {
    const settings = (await this.getStoreSettings()) || {};
    return dispatchWhatsAppViaCrm(sql, {
      recipient: params.phone,
      text: params.text || 'رسالة تجربة من متجر جو ستور (JOE Store) عبر WhatsApp Pro CRM ✅',
      type: 'custom',
      settings
    });
  },

  async getPaymentGatewayAdminConfig(): Promise<any> {
    const settings = (await this.getStoreSettings()) || {};
    return toAdminPaymentGatewayState(settings);
  },

  async savePaymentGatewayConfig(config: any, actor?: { id?: string; name?: string }): Promise<{ success: boolean; error?: string; state?: any }> {
    try {
      const current = (await this.getStoreSettings()) || {};
      const next: any = { ...current };
      const cleanStr = (v: any, max = 300) => String(v ?? '').trim().slice(0, max);

      if (config.provider !== undefined) {
        const p = cleanStr(config.provider, 40).toLowerCase();
        next.payment_gateway_provider = p === 'kashier' || p === 'paymob' ? p : 'none';
      }
      if (config.mode !== undefined) {
        next.payment_gateway_mode = cleanStr(config.mode, 20).toLowerCase() === 'live' ? 'live' : 'test';
      }
      if (config.merchant_id !== undefined) {
        next.payment_gateway_merchant_id = cleanStr(config.merchant_id, 160);
      }
      if (config.public_key !== undefined) {
        next.payment_gateway_public_key = cleanStr(config.public_key, 400);
      }
      if (typeof config.api_key === 'string' && config.api_key.trim()) {
        next.payment_gateway_api_key = config.api_key.trim();
      }
      if (typeof config.secret_key === 'string' && config.secret_key.trim()) {
        next.payment_gateway_secret_key = config.secret_key.trim();
      }
      if (typeof config.hmac_secret === 'string' && config.hmac_secret.trim()) {
        next.payment_gateway_hmac_secret = config.hmac_secret.trim();
      }
      if (config.card_integration_id !== undefined) {
        next.payment_gateway_card_integration_id = cleanStr(config.card_integration_id, 120);
      }
      if (config.wallet_integration_id !== undefined) {
        next.payment_gateway_wallet_integration_id = cleanStr(config.wallet_integration_id, 120);
      }
      if (config.instapay_integration_id !== undefined) {
        next.payment_gateway_instapay_integration_id = cleanStr(config.instapay_integration_id, 120);
      }
      if (config.enable_card !== undefined) {
        next.payment_gateway_enable_card = Boolean(config.enable_card);
      }
      if (config.enable_wallet !== undefined) {
        next.payment_gateway_enable_wallet = Boolean(config.enable_wallet);
      }
      if (config.enable_instapay !== undefined) {
        next.payment_gateway_enable_instapay = Boolean(config.enable_instapay);
      }

      const saved = await this.updateStoreSettings(next);
      if (!saved.success) return saved;
      if (actor) {
        await logAudit({
          actorId: actor.id,
          actorName: actor.name,
          action: 'PAYMENT_GATEWAY_CONFIG_UPDATED',
          entity: 'store_settings',
          entityId: 'main',
          after: {
            provider: next.payment_gateway_provider,
            mode: next.payment_gateway_mode,
            merchant_id: next.payment_gateway_merchant_id,
            enable_card: next.payment_gateway_enable_card,
            enable_wallet: next.payment_gateway_enable_wallet,
            enable_instapay: next.payment_gateway_enable_instapay
          }
        });
      }
      return { success: true, state: toAdminPaymentGatewayState(next) };
    } catch (err: any) {
      return { success: false, error: err?.message || 'تعذر حفظ إعدادات بوابة الدفع.' };
    }
  },

  async testPaymentGatewayConfig(): Promise<{ success: boolean; message?: string; error?: string; state?: any }> {
    const settings = (await this.getStoreSettings()) || {};
    const cfg = resolvePaymentGatewayConfig(settings);
    const state = toAdminPaymentGatewayState(settings);
    if (cfg.provider === 'none') {
      return { success: false, error: 'اختر مزود الدفع (Kashier أو Paymob) أولاً.', state };
    }
    if (!cfg.configured) {
      return {
        success: false,
        error:
          cfg.provider === 'kashier'
            ? 'أكمل إدخال Merchant ID و API Key الخاصين بـ Kashier.'
            : 'أكمل إدخال Secret Key و Public Key ومعرف تكامل واحد على الأقل لـ Paymob.',
        state
      };
    }
    if (cfg.provider === 'paymob') {
      try {
        const probeRes = await fetch('https://accept.paymob.com/api/auth/tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: cfg.apiKey || cfg.secretKey })
        });
        if (!probeRes.ok && !cfg.publicKey.startsWith('egy_pk_')) {
          return { success: false, error: `تعذر التحقق من Paymob (HTTP ${probeRes.status}). تأكد من المفاتيح.`, state };
        }
      } catch {
        // Fallback to configuration validation when network/API Key-only Intention mode is used
      }
    }
    return {
      success: true,
      message: `تم التحقق من جاهزية ربط ${cfg.provider === 'kashier' ? 'Kashier' : 'Paymob'} (${cfg.mode === 'live' ? 'تشغيل فعلي Live' : 'وضع تجريبي Test'}).`,
      state
    };
  }
};
