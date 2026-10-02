import { neon } from '@neondatabase/serverless';

const DB_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || '';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.VITE_EMAIL_FROM || 'JOE Store <onboarding@resend.dev>';

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
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { email, name = 'عميلنا العزيز', customTemplate } = body || {};

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال بريد إلكتروني صالح.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Generate secure 6-digit numeric OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Save in Neon PostgreSQL with 10 minutes expiry
    let templateConfig = customTemplate || {};

    if (!DB_URL) {
      return res.status(500).json({
        success: false,
        error: 'إعدادات قاعدة البيانات (DATABASE_URL) غير متوفرة على السيرفر.'
      });
    }

    try {
      const sql = neon(DB_URL);
      await sql`
        INSERT INTO email_verifications (email, code, expires_at)
        VALUES (${cleanEmail}, ${otpCode}, NOW() + INTERVAL '10 minutes')
      `;

      if (!customTemplate) {
        try {
          const settingsRows = await sql`SELECT * FROM store_settings LIMIT 1;`;
          if (settingsRows && settingsRows.length > 0) {
            templateConfig = settingsRows[0] || {};
          }
        } catch (_) {}
      }
    } catch (dbErr) {
      console.error('[send-otp DB Error]', dbErr);
      return res.status(500).json({
        success: false,
        error: 'تعذر الاتصال بقاعدة البيانات لحفظ كود التحقق. يرجى التأكد من ضبط DATABASE_URL في لوحة التحكم.'
      });
    }

    // 3. Resolve dynamic template values
    const headerTitle = templateConfig.email_header_title || 'JOE Store | متجر جو ستور';
    const headerSubtitle = templateConfig.email_header_subtitle || 'وجهتك الموثوقة للهواتف والإكسسوارات الأصلية - المنصورة';
    const welcomeMsg = templateConfig.email_welcome_msg || 'سعداء بانضمامك إلى عائلة جو ستور. لإتمام إنشاء حسابك والتحقق من بريدك الإلكتروني، يرجى استخدام رمز الأمان التالي:';
    const supportPhone = templateConfig.email_support_phone || templateConfig.store_phone || '01012345678';
    const storeAddress = templateConfig.email_store_address || templateConfig.store_address_ar || 'المنصورة - شارع الإمام محمد عبده - ناصية آمون';
    const securityNote = templateConfig.email_security_note || 'هذا الرمز صالح للاستخدام خلال 10 دقائق فقط. حفاظاً على أمانك، لا تشارك هذا الرمز مع أي شخص.';
    const accentColor = templateConfig.email_accent_color || '#F59E0B';
    const subject = (templateConfig.email_subject_template || `رمز تأكيد حسابك في متجر جو ستور ⚡ (كود: {code})`).replace('{code}', otpCode);

    // 4. Prepare Anti-Spam Highly-Trusted HTML Email Template
    const emailHtml = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${headerTitle}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #080C14; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #ffffff;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #080C14; padding: 40px 10px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" style="max-width: 540px; background-color: #0F1626; border-radius: 24px; border: 1px solid rgba(245, 158, 11, 0.35); overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);" cellspacing="0" cellpadding="0">
                <!-- Header -->
                <tr>
                  <td align="center" style="padding: 35px 25px 20px; background: linear-gradient(180deg, rgba(245, 158, 11, 0.12) 0%, rgba(15, 22, 38, 0) 100%);">
                    <h1 style="margin: 0; font-size: 26px; font-weight: 900; color: ${accentColor}; letter-spacing: 0.5px;">${headerTitle}</h1>
                    <p style="margin: 6px 0 0; font-size: 13px; color: #94A3B8;">${headerSubtitle}</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 20px 35px;">
                    <div style="background-color: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 18px; padding: 25px; text-align: center;">
                      <h2 style="margin: 0 0 12px; font-size: 18px; color: #FFFFFF; font-weight: 700;">مرحباً ${name} 👋</h2>
                      <p style="margin: 0 0 20px; font-size: 14px; color: #CBD5E1; line-height: 1.7;">
                        ${welcomeMsg}
                      </p>

                      <!-- OTP Code Box -->
                      <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.05) 100%); border: 2px dashed ${accentColor}; border-radius: 14px; padding: 18px; margin: 25px 0;">
                        <span style="display: block; font-size: 11px; text-transform: uppercase; color: ${accentColor}; font-weight: 700; letter-spacing: 1px; margin-bottom: 6px;">رمز التحقق المعتمد (OTP)</span>
                        <div style="font-size: 38px; font-weight: 900; letter-spacing: 10px; color: ${accentColor}; font-family: 'Courier New', Courier, monospace;">
                          ${otpCode}
                        </div>
                      </div>

                      <p style="margin: 0; font-size: 12px; color: #64748B; line-height: 1.5;">
                        ⏱️ ${securityNote}
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td align="center" style="padding: 20px 30px 30px; border-top: 1px solid rgba(255, 255, 255, 0.05); font-size: 11px; color: #64748B; line-height: 1.6;">
                    <p style="margin: 0 0 4px;">📍 ${storeAddress}</p>
                    <p style="margin: 0 0 4px;">📞 خدمة العملاء والدعم: <strong style="color: ${accentColor};">${supportPhone}</strong></p>
                    <p style="margin: 6px 0 0; color: #475569;">© 2026 ${headerTitle}. جميع الحقوق محفوظة.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const plainText = `مرحباً ${name}، رمز التحقق الخاص بحسابك في ${headerTitle} هو: [ ${otpCode} ]. هذا الرمز صالح لمدة 10 دقائق فقط. الدعم: ${supportPhone} - ${storeAddress}.`;

    // 5. Send strictly via Resend
    const apiKey = process.env.RESEND_API_KEY || RESEND_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'مفتاح Resend API غير مضبوط على السيرفر (RESEND_API_KEY). يرجى إضافته في إعدادات Vercel.'
      });
    }

    let resendResult = null;
    let resendError = null;

    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [cleanEmail],
          subject: subject,
          html: emailHtml,
          text: plainText,
          headers: {
            'X-Entity-Ref-ID': `joe-otp-${Date.now()}`
          }
        })
      });

      const resendData = await resendRes.json();
      if (resendRes.ok && resendData?.id) {
        resendResult = resendData;
      } else {
        resendError = resendData;
        console.error('[Resend API Error]:', resendData);
      }
    } catch (err) {
      resendError = { message: err.message };
      console.error('[Resend Network Error]:', err);
    }

    if (resendResult && resendResult.id) {
      return res.status(200).json({
        success: true,
        message: 'تم إرسال كود التأكيد إلى بريدك الإلكتروني بنجاح (يرجى مراجعة البريد وصندوق الـ Spam).'
      });
    }

    // Handle delivery errors strictly
    const rawErrMsg = resendError?.message || '';
    if (rawErrMsg.includes('only send testing emails to your own email address') || rawErrMsg.includes('resend.com/domains')) {
      return res.status(403).json({
        success: false,
        error: 'حساب Resend التجريبي حالياً يرسل فقط للإيميل المسجل لديهم (abdolailah586@gmail.com). لإرسال الإيميل لأي عنوان آخر، يلزم توثيق دومين المتجر في resend.com/domains.'
      });
    }

    return res.status(400).json({
      success: false,
      error: `فشل إرسال كود التحقق عبر البريد الإلكتروني: ${rawErrMsg || 'خطأ غير معروف في خادم الإرسال.'}`
    });

  } catch (err) {
    console.error('[send-otp Fatal Error]', err);
    return res.status(500).json({ success: false, error: 'حدث خطأ في الخادم أثناء إرسال الكود.' });
  }
}
