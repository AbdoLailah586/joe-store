import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || '';
if (!databaseUrl) {
  console.error('❌ Missing DATABASE_URL environment variable');
  process.exit(1);
}

// Additive-only: every statement is IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
// Nothing here drops, renames or alters an existing column, and no row is touched.
async function initDashboardGuideSchema() {
  const sql = neon(databaseUrl);
  console.log('🚀 Adding admin-dashboard-guide tables/columns to the existing Neon schema...');

  try {
    // 1. Real courier/packing fields on orders (the Order type already declares
    //    courier_name/tracking_number; the column itself never existed).
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_name VARCHAR(150);`;
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS packed_at TIMESTAMPTZ;`;
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS packed_by VARCHAR(150);`;
    console.log('✅ orders: courier_name/packed_at/packed_by ready');

    // 2. Staff 2FA (TOTP)
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(64);`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false;`;
    console.log('✅ users: totp_secret/totp_enabled ready');

    // 3. Delivery refusal log (Loss & Refusal Prevention)
    await sql`
      CREATE TABLE IF NOT EXISTS delivery_refusals (
        id VARCHAR(100) PRIMARY KEY,
        order_id VARCHAR(100) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        reason VARCHAR(50) NOT NULL,
        courier_name VARCHAR(150),
        created_by VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_delivery_refusals_phone ON delivery_refusals(customer_phone, created_at DESC);`;
    console.log('✅ delivery_refusals table ready');

    // 4. Customer support tickets (one running thread per phone number)
    await sql`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id VARCHAR(100) PRIMARY KEY,
        customer_phone VARCHAR(50) NOT NULL,
        customer_name VARCHAR(150),
        order_id VARCHAR(100),
        subject VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'open',
        assigned_to VARCHAR(100),
        escalation_reason TEXT,
        csat_rating SMALLINT,
        csat_comment TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        closed_at TIMESTAMPTZ
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_support_tickets_phone ON support_tickets(customer_phone, status);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status, updated_at DESC);`;
    await sql`
      CREATE TABLE IF NOT EXISTS support_messages (
        id VARCHAR(100) PRIMARY KEY,
        ticket_id VARCHAR(100) NOT NULL,
        sender_type VARCHAR(20) NOT NULL,
        sender_id VARCHAR(100),
        body TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id, created_at);`;
    console.log('✅ support_tickets/support_messages tables ready');

    // 5. Append-only admin audit log
    await sql`
      CREATE TABLE IF NOT EXISTS audit_log (
        id VARCHAR(100) PRIMARY KEY,
        actor_id VARCHAR(100),
        actor_name VARCHAR(150),
        action VARCHAR(100) NOT NULL,
        entity VARCHAR(50) NOT NULL,
        entity_id VARCHAR(100),
        before_data JSONB,
        after_data JSONB,
        reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);`;
    console.log('✅ audit_log table ready');

    // 6. Manual supplier price quotes (no supplier/purchase concept exists yet)
    await sql`
      CREATE TABLE IF NOT EXISTS supplier_quotes (
        id VARCHAR(100) PRIMARY KEY,
        product_id VARCHAR(100) NOT NULL,
        supplier_name VARCHAR(150) NOT NULL,
        quoted_price NUMERIC(12, 2) NOT NULL,
        quoted_at TIMESTAMPTZ DEFAULT NOW(),
        created_by VARCHAR(100)
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_supplier_quotes_product ON supplier_quotes(product_id, quoted_price);`;
    console.log('✅ supplier_quotes table ready');

    // 7. Wishlist interest events (write-only signal, NOT a synced wishlist state —
    //    the browser-local wishlist itself is untouched by this).
    await sql`
      CREATE TABLE IF NOT EXISTS wishlist_events (
        id VARCHAR(100) PRIMARY KEY,
        customer_id VARCHAR(100) NOT NULL,
        product_id VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_wishlist_events_product ON wishlist_events(product_id, created_at DESC);`;
    console.log('✅ wishlist_events table ready');

    console.log('\n🎉 Admin-dashboard-guide schema is ready. No existing table, column or row was altered or dropped.');
  } catch (error) {
    console.error('❌ Schema initialization error:', error);
    process.exit(1);
  }
}

initDashboardGuideSchema();
