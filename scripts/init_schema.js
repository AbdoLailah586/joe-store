import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || '';
if (!databaseUrl) {
  console.error('❌ Missing DATABASE_URL environment variable');
  process.exit(1);
}

async function initSchema() {
  const sql = neon(databaseUrl);
  console.log('🚀 Initializing Enterprise Database Schema on Neon PostgreSQL...');

  try {
    // 1. Extensions for high performance search across 12,000+ items
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`;
    await sql`CREATE EXTENSION IF NOT EXISTS "pg_trgm";`;
    console.log('✅ Extensions created (uuid-ossp, pg_trgm)');

    // 2. Categories Table
    await sql`
      CREATE TABLE IF NOT EXISTS categories (
        key VARCHAR(50) PRIMARY KEY,
        name_ar VARCHAR(100) NOT NULL,
        name_en VARCHAR(100) NOT NULL,
        icon VARCHAR(50) DEFAULT '📱',
        sort_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    console.log('✅ Categories table ready');

    // 3. Products Table (Engineered for 12,000+ items)
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(100) PRIMARY KEY,
        name_ar VARCHAR(255) NOT NULL,
        name_en VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL,
        brand VARCHAR(100) NOT NULL,
        price NUMERIC(12, 2) NOT NULL,
        old_price NUMERIC(12, 2),
        cost_price NUMERIC(12, 2),
        stock_quantity INT DEFAULT 10,
        is_active BOOLEAN DEFAULT true,
        is_featured BOOLEAN DEFAULT false,
        is_preowned BOOLEAN DEFAULT false,
        battery_health VARCHAR(50),
        warranty VARCHAR(100),
        colors JSONB DEFAULT '[]'::jsonb,
        storage_options JSONB DEFAULT '[]'::jsonb,
        images JSONB DEFAULT '[]'::jsonb,
        specs JSONB DEFAULT '{}'::jsonb,
        discount_label VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // Indexes for ultra-fast filtering and searching among 12,000+ items
    await sql`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_products_preowned ON products(is_preowned);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name_ar gin_trgm_ops, name_en gin_trgm_ops);`;
    console.log('✅ Products table & GIN Trigram Search Indexes ready');

    // 4. Customers Table
    await sql`
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(150),
        avatar VARCHAR(500),
        addresses JSONB DEFAULT '[]'::jsonb,
        total_orders INT DEFAULT 0,
        total_spent NUMERIC(12, 2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_active_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);`;
    console.log('✅ Customers table ready');

    // 5. Customer Behavioral Activity & Signals (For Personalization Engine)
    await sql`
      CREATE TABLE IF NOT EXISTS customer_activity (
        id BIGSERIAL PRIMARY KEY,
        session_id VARCHAR(100) NOT NULL,
        customer_id VARCHAR(100),
        action_type VARCHAR(50) NOT NULL,
        target_id VARCHAR(100),
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_activity_session ON customer_activity(session_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_activity_action ON customer_activity(action_type);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_activity_created ON customer_activity(created_at DESC);`;
    console.log('✅ Customer Activity & Signals table ready');

    // 6. Active Carts / Abandoned Carts
    await sql`
      CREATE TABLE IF NOT EXISTS active_carts (
        session_id VARCHAR(100) PRIMARY KEY,
        customer_name VARCHAR(150),
        customer_phone VARCHAR(50),
        items JSONB DEFAULT '[]'::jsonb,
        subtotal NUMERIC(12, 2) DEFAULT 0,
        is_abandoned BOOLEAN DEFAULT false,
        recovered BOOLEAN DEFAULT false,
        last_updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_active_carts_updated ON active_carts(last_updated_at DESC);`;
    console.log('✅ Active & Abandoned Carts table ready');

    // 7. Orders Table (With Full Status & Cancellation Tracking)
    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(100) PRIMARY KEY,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        customer_id VARCHAR(100),
        customer_name VARCHAR(150) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        customer_email VARCHAR(150),
        governorate VARCHAR(100) NOT NULL,
        address TEXT NOT NULL,
        notes TEXT,
        items JSONB NOT NULL DEFAULT '[]'::jsonb,
        subtotal NUMERIC(12, 2) NOT NULL,
        shipping_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
        total NUMERIC(12, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        payment_status VARCHAR(50) DEFAULT 'pending',
        payment_reference VARCHAR(100),
        status VARCHAR(50) DEFAULT 'pending',
        cancellation_reason TEXT,
        cancelled_by VARCHAR(50),
        cancelled_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(customer_phone);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);`;
    console.log('✅ Orders table ready with cancellation schema');

    // 8. Store Settings Table
    await sql`
      CREATE TABLE IF NOT EXISTS store_settings (
        id VARCHAR(50) PRIMARY KEY DEFAULT 'main',
        settings JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    console.log('✅ Store Settings table ready');

    console.log('\n🎉 ALL TABLES AND INDEXES SUCCESSFULLY CREATED ON NEON POSTGRESQL!');
  } catch (error) {
    console.error('❌ Schema initialization error:', error);
    process.exit(1);
  }
}

initSchema();
