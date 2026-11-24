import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/DATABASE_URL=([^\r\n]+)/);
const sql = neon(match[1]);

async function main() {
  const ids = [
    'prod-oraimo-freepods-3c',
    'prod-soundcore-r50i-nc',
    'prod-tasbih-beiqi-s7pro-smartring',
    'prod-world-tag-apple-findmy',
    'prod-case-bmw-m-ip17promax'
  ];
  
  const rows = await sql`
    SELECT id, name_ar, images 
    FROM products 
    WHERE id IN ('prod-oraimo-freepods-3c', 'prod-soundcore-r50i-nc', 'prod-tasbih-beiqi-s7pro-smartring', 'prod-world-tag-apple-findmy', 'prod-case-bmw-m-ip17promax')
  `;
  console.log(JSON.stringify(rows, null, 2));
}

main().catch(console.error);
