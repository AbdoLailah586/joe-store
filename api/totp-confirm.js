import { neon } from '@neondatabase/serverless';
import { verifyTotpCode } from '../lib/totp.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { userId, code } = body || {};
    if (!userId || !code) {
      return res.status(400).json({ success: false, error: 'رقم الحساب وكود التفعيل مطلوبان.' });
    }

    const sql = neon(process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || '');
    const rows = await sql`SELECT totp_secret FROM users WHERE id = ${userId} LIMIT 1;`;
    if (!rows.length || !rows[0].totp_secret) {
      return res.status(400).json({ success: false, error: 'ابدئي تجهيز المصادقة الثنائية أولًا.' });
    }
    if (!verifyTotpCode(rows[0].totp_secret, String(code).trim())) {
      return res.status(400).json({ success: false, error: 'كود التفعيل غير صحيح.' });
    }

    await sql`UPDATE users SET totp_enabled = true, updated_at = NOW() WHERE id = ${userId};`;
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[totp-confirm Error]', err);
    return res.status(500).json({ success: false, error: 'حدث خطأ في الخادم أثناء تفعيل المصادقة الثنائية.' });
  }
}
