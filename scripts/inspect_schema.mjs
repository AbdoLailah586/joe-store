import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/DATABASE_URL=([^\r\n]+)/);
const sql = neon(match[1]);

async function check() {
  const cols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'products'
    ORDER BY ordinal_position;
  `;
  console.log(cols);
}
check().catch(console.error);
