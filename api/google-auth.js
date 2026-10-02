import { neon } from '@neondatabase/serverless';

const DB_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || '';

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
    const { name, email, avatar, googleId, phone } = body || {};

    if (!email) {
      return res.status(400).json({ success: false, error: 'البريد الإلكتروني لحساب Google مطلوب.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const userId = googleId ? `usr-google-${googleId}` : `usr-${Date.now()}`;

    const sql = neon(DB_URL);
    const userRows = await sql`
      INSERT INTO users (id, name, email, avatar, phone, role, provider, email_verified)
      VALUES (
        ${userId}, 
        ${name || 'عميل Google'}, 
        ${cleanEmail}, 
        ${avatar || ''}, 
        ${phone || ''}, 
        'customer', 
        'google', 
        true
      )
      ON CONFLICT (email) DO UPDATE SET
        name = COALESCE(EXCLUDED.name, users.name),
        avatar = COALESCE(EXCLUDED.avatar, users.avatar),
        email_verified = true,
        updated_at = NOW()
      RETURNING id, name, email, phone, avatar, role, provider, email_verified, addresses, created_at;
    `;

    const user = userRows[0];

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        provider: user.provider,
        email_verified: user.email_verified,
        addresses: Array.isArray(user.addresses) ? user.addresses : [],
        created_at: user.created_at
      }
    });

  } catch (err) {
    console.error('[google-auth Error]', err);
    return res.status(500).json({ success: false, error: 'حدث خطأ في الخادم أثناء تسجيل الدخول بحساب Google.' });
  }
}
