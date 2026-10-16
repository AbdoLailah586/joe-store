import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
process.loadEnvFile('.env');
const url=new URL(process.env.DATABASE_URL||process.env.VITE_DATABASE_URL);url.hostname=url.hostname.replace('-pooler.','.');
const sql=neon(url.toString());
const statements=fs.readFileSync('migrations/20261016_admin_permissions.sql','utf8').split(';').map(s=>s.trim()).filter(s=>s&&!['BEGIN','COMMIT'].includes(s));
if(process.argv.includes('--apply')) {
 await sql.transaction(statements.map(s=>sql.query(s)));
 console.log('Applied additive permission/session/cover metadata migration. Existing roles unchanged.');
} else {
 const schema='joe_acl_check_'+randomBytes(5).toString('hex');
 await sql.transaction([
  sql.query(`CREATE SCHEMA ${schema}`),sql.query(`SET LOCAL search_path TO ${schema}`),sql.query('CREATE TABLE users(id VARCHAR(100) PRIMARY KEY)'),
  ...statements.map(s=>sql.query(s)),sql.query(`DROP SCHEMA ${schema} CASCADE`)
 ]);
 console.log('Migration passed against isolated empty tables in one transaction; test schema removed.');
}
