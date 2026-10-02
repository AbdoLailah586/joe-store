import { neon } from '@neondatabase/serverless';
import nodemailer from 'nodemailer';

const DB_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || '';

// Provider Credentials
const SMTP_USER = process.env.SMTP_USER ? process.env.SMTP_USER.trim() : '';
const SMTP_PASS = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : '';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_SECURE = process.env.SMTP_SECURE !== 'false';

const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || SMTP_USER || 'abdolailah586@gmail.com';
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'JOE Store';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.VITE_EMAIL_FROM || process.env.RESEND_FROM || 'JOE Store <onboarding@resend.dev>';

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
          const settingsRows = await sql`SELECT * FROM store_settings WHERE id = 'main' LIMIT 1;`;
          if (settingsRows && settingsRows.length > 0) {
            const raw = settingsRows[0];
            templateConfig = (typeof raw.settings === 'object' && raw.settings !== null)
              ? { ...raw.settings, ...raw }
              : (raw || {});
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
    const headerTitle = templateConfig.email_header_title || templateConfig.store_name_ar || 'JOE Store | متجر جو ستور';
    const headerSubtitle = templateConfig.email_header_subtitle || 'وجهتك الموثوقة للهواتف والإكسسوارات الأصلية - المنصورة';
    const welcomeMsg = templateConfig.email_welcome_msg || 'سعداء بانضمامك إلى عائلة جو ستور. لإتمام إنشاء حسابك والتحقق من بريدك الإلكتروني، يرجى استخدام رمز الأمان التالي:';
    const supportPhone = templateConfig.email_support_phone || templateConfig.store_phone || '01554826209';
    const storeAddress = templateConfig.email_store_address || templateConfig.store_address_ar || 'المنصورة – شارع الإمام محمد عبده – ناصية آمون';
    const securityNote = templateConfig.email_security_note || 'هذا الرمز صالح للاستخدام خلال 10 دقائق فقط. حفاظاً على أمانك، لا تشارك هذا الرمز مع أي شخص.';
    const accentColor = templateConfig.email_accent_color || '#F59E0B';
    const subject = (templateConfig.email_subject_template || `رمز تأكيد حسابك في متجر جو ستور ⚡ (كود: {code})`).replace('{code}', otpCode);

    // 4. Prepare High-Deliverability HTML Email Template
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

    // 5. Multi-Provider Dispatch Engine
    let deliverySuccess = false;
    let providerUsed = '';
    let smtpErrorDetails = null;

    // --- Provider A: SMTP (Gmail / Custom SMTP) ---
    // Sends to ANY recipient without domain verification, 100% free (500 emails/day on Gmail).
    if (SMTP_USER && SMTP_PASS) {
      try {
        const isGmail = SMTP_USER.endsWith('@gmail.com') || SMTP_HOST.includes('gmail');
        const transporterConfig = isGmail
          ? {
              service: 'gmail',
              auth: {
                user: SMTP_USER,
                pass: SMTP_PASS
              },
              connectionTimeout: 10000,
              greetingTimeout: 10000,
              socketTimeout: 15000
            }
          : {
              host: SMTP_HOST,
              port: SMTP_PORT,
              secure: SMTP_SECURE,
              auth: {
                user: SMTP_USER,
                pass: SMTP_PASS
              },
              connectionTimeout: 10000,
              greetingTimeout: 10000,
              socketTimeout: 15000
            };

        const transporter = nodemailer.createTransport(transporterConfig);
        const fromAddress = process.env.SMTP_FROM || `"${headerTitle}" <${SMTP_USER}>`;

        await transporter.sendMail({
          from: fromAddress,
          to: cleanEmail,
          subject: subject,
          html: emailHtml,
          text: plainText
        });

        deliverySuccess = true;
        providerUsed = 'Gmail SMTP';
      } catch (smtpErr) {
        console.error('[SMTP Delivery Error]:', smtpErr);
        smtpErrorDetails = smtpErr?.message || String(smtpErr);
      }
    }

    // --- Provider B: Brevo (Sendinblue) REST API ---
    if (!deliverySuccess && BREVO_API_KEY) {
      try {
        const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': BREVO_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            sender: {
              name: BREVO_SENDER_NAME,
              email: BREVO_SENDER_EMAIL
            },
            to: [{ email: cleanEmail, name: name }],
            subject: subject,
            htmlContent: emailHtml,
            textContent: plainText
          })
        });

        const brevoData = await brevoRes.json();
        if (brevoRes.ok && (brevoData?.messageId || brevoData?.id)) {
          deliverySuccess = true;
          providerUsed = 'Brevo';
        }
      } catch (brevoErr) {
        console.error('[Brevo Network Error]:', brevoErr);
      }
    }

    // --- Provider C: Resend REST API (Only if SMTP was NOT configured) ---
    if (!deliverySuccess && !SMTP_USER && RESEND_API_KEY) {
      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
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
          deliverySuccess = true;
          providerUsed = 'Resend';
        } else {
          const rawErrMsg = resendData?.message || '';
          if (rawErrMsg.includes('only send testing emails to your own email address') || rawErrMsg.includes('resend.com/domains')) {
            return res.status(403).json({
              success: false,
              error: 'حساب Resend التجريبي مقيد بإرسال الإيميلات للعنوان المسجل لديه فقط. لتفعيل إرسال Gmail SMTP، يرجى مراجعة إعدادات SMTP_USER و SMTP_PASS في Vercel.'
            });
          }
        }
      } catch (resendErr) {
        console.error('[Resend Network Error]:', resendErr);
      }
    }

    // 6. Response
    if (deliverySuccess) {
      return res.status(200).json({
        success: true,
        provider: providerUsed,
        message: 'تم إرسال كود التأكيد إلى بريدك الإلكتروني بنجاح (يرجى مراجعة البريد وصندوق الـ Spam).'
      });
    }

    // If SMTP was configured but failed:
    if (SMTP_USER && smtpErrorDetails) {
      let friendlyError = smtpErrorDetails;
      if (smtpErrorDetails.includes('Username and Password not accepted') || smtpErrorDetails.includes('535-5.7.8') || smtpErrorDetails.includes('BadCredentials')) {
        friendlyError = 'كلمة مرور التطبيقات (App Password) لجيميل غير مقبولة. يرجى التأكد من استخراج كلمة مرور التطبيقات من Google (16 حرفاً) وتفعيل التحقق بخطوتين، وليس استخدام كلمة مرور الحساب العادية.';
      }
      return res.status(400).json({
        success: false,
        error: `تعذر إرسال الإيميل عبر Gmail SMTP: ${friendlyError}`
      });
    }

    return res.status(400).json({
      success: false,
      error: 'تعذر إرسال كود التأكيد. يرجى التأكد من ضبط إعدادات SMTP_USER و SMTP_PASS في Vercel.'
    });

  } catch (err) {
    console.error('[send-otp Fatal Error]', err);
    return res.status(500).json({ success: false, error: 'حدث خطأ في الخادم أثناء إرسال الكود.' });
  }
}
