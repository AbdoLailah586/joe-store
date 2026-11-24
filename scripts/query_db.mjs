import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/DATABASE_URL=([^\r\n]+)/);
const sql = neon(match[1]);

async function main() {
  const prods = await sql`SELECT id, name_ar, images, price, stock_quantity FROM products WHERE id LIKE '%bmw%'`;
  console.log(JSON.stringify(prods, null, 2));
}

main().catch(console.error);
