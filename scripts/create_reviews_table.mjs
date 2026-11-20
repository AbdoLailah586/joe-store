import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const envText = fs.readFileSync('.env', 'utf-8');
const match = envText.match(/DATABASE_URL=([^\r\n]+)/);
const dbUrl = match ? match[1].trim() : '';

const sql = neon(dbUrl);
async function run() {
  console.log('Creating product_reviews table if not exists...');
  await sql`
    CREATE TABLE IF NOT EXISTS product_reviews (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      product_name_ar TEXT,
      author_name TEXT NOT NULL,
      author_phone TEXT,
      user_id TEXT,
      session_id TEXT,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT NOT NULL,
      images JSONB DEFAULT '[]'::jsonb,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews(product_id, status);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_product_reviews_status ON product_reviews(status, created_at DESC);`;
  console.log('Table product_reviews created or verified successfully!');
}
run().catch(console.error);
