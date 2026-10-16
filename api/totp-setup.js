import { neon } from '@neondatabase/serverless';
import { generateTotpSecret, totpAuthUrl } from '../lib/totp.js';

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
    const { userId } = body || {};
    if (!userId) {
      return res.status(400).json({ success: false, error: 'رقم الحساب مطلوب.' });
    }

    const sql = neon(process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || '');
    const userRows = await sql`SELECT id, email, role FROM users WHERE id = ${userId} LIMIT 1;`;
    if (!userRows.length) {
      return res.status(404).json({ success: false, error: 'الحساب غير موجود.' });
    }
    if (userRows[0].role !== 'admin') {
      return res.status(403).json({ success: false, error: 'المصادقة الثنائية متاحة لحسابات الإدارة فقط.' });
    }

    const secret = generateTotpSecret();
    await sql`UPDATE users SET totp_secret = ${secret}, totp_enabled = false, updated_at = NOW() WHERE id = ${userId};`;

    return res.status(200).json({
      success: true,
      secret,
      otpauthUrl: totpAuthUrl(secret, userRows[0].email)
    });
  } catch (err) {
    console.error('[totp-setup Error]', err);
    return res.status(500).json({ success: false, error: 'حدث خطأ في الخادم أثناء تجهيز المصادقة الثنائية.' });
  }
}
