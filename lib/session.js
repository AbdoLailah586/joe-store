import { randomBytes, createHash, timingSafeEqual, scryptSync } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { publicUser } from './access.js';
export const database = () => neon(process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || '');
const hash = token => createHash('sha256').update(token).digest('hex');
export function sessionToken(req) {
  const cookies = req.headers?.cookie || '';
  return cookies.split(';').map(x=>x.trim()).find(x=>x.startsWith('joe_session='))?.slice(12) || '';
}
export async function issueSession(req,res,userId,sql=database(),verified=true) {
  const token = randomBytes(32).toString('hex');
  await sql`INSERT INTO app_sessions (token_hash,user_id,expires_at,two_factor_verified) VALUES (${hash(token)},${userId},NOW()+INTERVAL '30 days',${verified})`;
  const secure = process.env.NODE_ENV === 'production' || req.headers?.['x-forwarded-proto'] === 'https';
  res.setHeader('Set-Cookie', `joe_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${secure ? '; Secure':''}`);
}
export async function currentUser(req,sql=database()) {
  const token=sessionToken(req);
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const rows=await sql`SELECT u.* FROM app_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=${hash(token)} AND s.expires_at>NOW() AND s.two_factor_verified=true LIMIT 1`;
  return publicUser(rows[0]);
}
export async function pendingSecondFactor(req,sql=database()) {
  const token=sessionToken(req);
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const rows=await sql`UPDATE app_sessions s SET two_factor_attempts=two_factor_attempts+1 FROM users u WHERE s.token_hash=${hash(token)} AND u.id=s.user_id AND s.two_factor_verified=false AND s.two_factor_attempts<8 AND s.created_at>NOW()-INTERVAL '10 minutes' AND s.expires_at>NOW() RETURNING u.*,s.token_hash`;
  return rows[0] || null;
}
export async function endSession(req,res,sql=database()) {
  const token=sessionToken(req);
  if (/^[a-f0-9]{64}$/.test(token)) await sql`DELETE FROM app_sessions WHERE token_hash=${hash(token)}`;
  res.setHeader('Set-Cookie','joe_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
}
export function sameOrigin(req) {
  const origin=req.headers?.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers?.host; } catch { return false; }
}
export function passwordHash(value) {
  const salt=randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(value,salt,64).toString('hex')}`;
}
export function passwordMatches(password,saved) {
  if (typeof password!=='string' || !password || typeof saved!=='string' || !saved) return false;
  if (!saved.startsWith('scrypt$')) {
    const a=Buffer.from(password), b=Buffer.from(saved); return a.length===b.length && timingSafeEqual(a,b);
  }
  const [,salt,digest]=saved.split('$');
  if (!salt || !/^[a-f0-9]{128}$/.test(digest || '')) return false;
  const a=scryptSync(password,salt,64), b=Buffer.from(digest,'hex'); return timingSafeEqual(a,b);
}
