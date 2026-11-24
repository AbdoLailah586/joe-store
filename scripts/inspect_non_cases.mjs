import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/DATABASE_URL=([^\r\n]+)/);
const sql = neon(match[1]);

async function run() {
  const rows = await sql`
    SELECT id, name_ar, images, category 
    FROM products 
    WHERE category != 'cases_protection'
    ORDER BY created_at DESC;
  `;
  console.log(`Found ${rows.length} non-case products:`);
  for (const r of rows) {
    console.log(`[${r.id}] images type: ${typeof r.images}, value:`, r.images);
  }
}

run().catch(console.error);
