import { neon } from '@neondatabase/serverless';

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
    const { userId, password } = body || {};
    if (!userId || !password) {
      return res.status(400).json({ success: false, error: 'رقم الحساب وكلمة المرور مطلوبان.' });
    }

    const sql = neon(process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || '');
    const rows = await sql`SELECT password_hash FROM users WHERE id = ${userId} LIMIT 1;`;
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'الحساب غير موجود.' });
    }
    if (rows[0].password_hash && rows[0].password_hash !== password) {
      return res.status(401).json({ success: false, error: 'كلمة المرور غير صحيحة.' });
    }

    await sql`UPDATE users SET totp_enabled = false, totp_secret = NULL, updated_at = NOW() WHERE id = ${userId};`;
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[totp-disable Error]', err);
    return res.status(500).json({ success: false, error: 'حدث خطأ في الخادم أثناء تعطيل المصادقة الثنائية.' });
  }
}
