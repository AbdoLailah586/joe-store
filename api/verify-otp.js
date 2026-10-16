import { neon } from '@neondatabase/serverless';
import { issueSession, sameOrigin, passwordHash } from '../lib/session.js';
import { publicUser } from '../lib/access.js';

const DB_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || '';

export default async function handler(req, res) {
  // Enable CORS
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
    if (!sameOrigin(req)) return res.status(403).json({success:false,error:'مصدر الطلب غير مسموح.'});
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { email, code, name, phone, password } = body || {};

    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'البريد الإلكتروني وكود التأكيد مطلوبان.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    const sql = neon(DB_URL);

    // 1. Look up verification code in Neon PostgreSQL
    const rows = await sql`
      UPDATE email_verifications SET attempts=attempts+1
      WHERE id=(SELECT id FROM email_verifications WHERE email=${cleanEmail} AND verified=false AND expires_at>NOW() ORDER BY id DESC LIMIT 1)
        AND attempts<8
      RETURNING id,code,expires_at,verified
    `;

    if (!rows || rows.length === 0 || rows[0].code !== cleanCode) {
      return res.status(400).json({
        success: false,
        error: 'كود التأكيد غير صحيح أو انتهت صلاحيته (صلاحية الكود 10 دقائق).'
      });
    }

    const verificationRecord = rows[0];

    // 2. Mark verification code as used
    const consumed = await sql`
      UPDATE email_verifications
      SET verified = true
      WHERE id = ${verificationRecord.id} AND verified=false
      RETURNING id
    `;
    if (!consumed[0]) return res.status(400).json({success:false,error:'تم استخدام الكود بالفعل. اطلب كودًا جديدًا.'});

    // 3. Upsert user in Neon PostgreSQL users table
    const userId = `usr-${Date.now()}`;
    const defaultRole = cleanEmail === 'abdolailah586@gmail.com' ? 'admin' : 'customer';

    const userRows = await sql`
      INSERT INTO users (id, name, email, phone, password_hash, role, provider, email_verified)
      VALUES (
        ${userId}, 
        ${name || 'عميل جو ستور'}, 
        ${cleanEmail}, 
        ${phone || ''}, 
        ${password ? passwordHash(password) : ''},
        ${defaultRole}, 
        'email', 
        true
      )
      ON CONFLICT (email) DO UPDATE SET
        name = COALESCE(EXCLUDED.name, users.name),
        phone = COALESCE(NULLIF(EXCLUDED.phone, ''), users.phone),
        password_hash = COALESCE(NULLIF(EXCLUDED.password_hash, ''), users.password_hash),
        email_verified = true,
        updated_at = NOW()
      RETURNING id, name, email, phone, role, provider, email_verified, addresses, created_at, admin_permissions, totp_enabled;
    `;

    const user = userRows[0];
    await issueSession(req,res,user.id,sql,!user.totp_enabled);
    if(user.totp_enabled) return res.status(200).json({success:false,requiresTotp:true,code:'TOTP_REQUIRED',error:'أدخل كود تطبيق المصادقة لإكمال الدخول.'});

    return res.status(200).json({
      success: true,
      message: 'تم التحقق من البريد الإلكتروني وتفعيل الحساب بنجاح!',
      user: { ...publicUser(user),
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        provider: user.provider,
        email_verified: user.email_verified,
        addresses: Array.isArray(user.addresses) ? user.addresses : [],
        created_at: user.created_at
      }
    });

  } catch (err) {
    console.error('[verify-otp Error]', err);
    return res.status(500).json({ success: false, error: 'حدث خطأ في الخادم أثناء التحقق من الكود.' });
  }
}
