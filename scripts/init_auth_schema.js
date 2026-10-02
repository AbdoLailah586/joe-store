import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || '';

async function initAuthSchema() {
  const sql = neon(databaseUrl);
  console.log('🚀 Initializing Users & Email Verifications tables on Neon PostgreSQL...');

  try {
    // 1. Users Table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        phone VARCHAR(50),
        password_hash VARCHAR(255),
        avatar TEXT,
        role VARCHAR(50) DEFAULT 'customer',
        provider VARCHAR(50) DEFAULT 'email',
        email_verified BOOLEAN DEFAULT false,
        addresses JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`;
    console.log('✅ Users table ready');

    // 2. Email Verifications Table
    await sql`
      CREATE TABLE IF NOT EXISTS email_verifications (
        id SERIAL PRIMARY KEY,
        email VARCHAR(150) NOT NULL,
        code VARCHAR(10) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        verified BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_verifications_email ON email_verifications(email);`;
    console.log('✅ Email verifications table ready');

    console.log('🎉 Auth Schema successfully applied!');
  } catch (err) {
    console.error('❌ Failed to initialize auth schema:', err);
  }
}

initAuthSchema();
