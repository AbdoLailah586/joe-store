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
    const { email, code } = body || {};
    if (!email) {
      return res.status(400).json({ success: false, error: 'البريد الإلكتروني مطلوب.' });
    }

    const sql = neon(process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || '');
    const rows = await sql`SELECT totp_secret, totp_enabled FROM users WHERE email = ${email.trim().toLowerCase()} LIMIT 1;`;
    if (!rows.length || !rows[0].totp_enabled) {
      // Nothing to verify — a caller that always calls this after password check
      // doesn't need to branch on whether 2FA is enabled for this account.
      return res.status(200).json({ success: true });
    }
    if (!code) {
      return res.status(401).json({ success: false, error: 'أدخلي كود المصادقة الثنائية.', code: 'TOTP_REQUIRED' });
    }
    if (!verifyTotpCode(rows[0].totp_secret, String(code).trim())) {
      return res.status(401).json({ success: false, error: 'كود المصادقة الثنائية غير صحيح.', code: 'TOTP_INVALID' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[totp-verify-login Error]', err);
    return res.status(500).json({ success: false, error: 'حدث خطأ في الخادم أثناء التحقق من كود المصادقة.' });
  }
}
