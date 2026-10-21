import { randomBytes } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { passwordHash } from '../lib/session.js';
process.loadEnvFile('.env');
const url = new URL(process.env.DATABASE_URL || process.env.VITE_DATABASE_URL);
url.hostname = url.hostname.replace('-pooler.', '.');
const sql = neon(url.toString());
const email = 'qa-admin@joestore.internal';
const password = process.argv[2] || randomBytes(9).toString('base64url');
const id = 'admin-qa-' + randomBytes(6).toString('hex');
const existing = await sql`SELECT id FROM users WHERE lower(email) = ${email}`;
if (existing.length) {
  await sql`UPDATE users SET password_hash = ${passwordHash(password)}, role = 'admin', totp_enabled = false, totp_secret = NULL, totp_pending_secret = NULL WHERE id = ${existing[0].id}`;
  console.log('Updated existing disposable QA admin.');
  console.log('id:', existing[0].id);
} else {
  await sql`INSERT INTO users (id, name, email, password_hash, role, provider, email_verified) VALUES (${id}, 'QA Admin (disposable)', ${email}, ${passwordHash(password)}, 'admin', 'email', true)`;
  console.log('Created disposable QA admin.');
  console.log('id:', id);
}
console.log('email:', email);
console.log('password:', password);
