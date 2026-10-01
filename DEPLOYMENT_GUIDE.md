# 🚀 دليل النشر الشامل لمتجر جو ستور (JOE Store) ومحرك الواتساب

يقدم هذا الدليل خطة احترافية ومفصلة لنشر النظام بالكامل على الإنترنت بأعلى كفاءة وأقل تكلفة:
1. **واجهة المتجر الإلكتروني (`joe-store`):** تطبيق Single Page Application مبني بـ React + Vite + Tailwind.
2. **محرك الأتمتة والواتساب (`whatsapp-pro-automation`):** خادم خلفي مبني بـ Node.js + Baileys WebSocket + SQLite/PostgreSQL.

---

## 📌 مقارنة سريعة: أين ننشر كل جزء ولماذا؟

| الخدمة | النظام المقترح | البديل | التكلفة التقديرية | السبب التقني والعملي |
| :--- | :--- | :--- | :--- | :--- |
| **واجهة المتجر (`joe-store`)** | **Vercel** | Cloudflare Pages / Netlify | **مجاني 100%** | سيرفرات حافة (Global CDN) سريعة جداً داخل مصر والشرق الأوسط، شهادات SSL تلقائية، ونشر فوري عند كل تحديث Git. |
| **محرك الواتساب (`whatsapp-pro`)** | **Railway.app** | سيرفر VPS (Hetzner / DigitalOcean) | **حوالي 5$ / شهرياً** (أو مجاني عبر أرصدة التجربة) | **لا يمكن نشره على Vercel Serverless** لأن مكتبة Baileys تتطلب اتصال WebSocket مستمر وسواقة تخزين ثابتة (Persistent Volume) لحفظ جلسة QR كود بدون تسجيل خروج. |

---

## 🛠️ أولاً: رفع كود المشروع على GitHub

قبل البدء في النشر، يُفضل إنشاء مستودعين (Repositories) منفصلين على حسابك في GitHub:
1. `joe-store` (كود واجهة المتجر)
2. `whatsapp-pro-automation` (كود السيرفر الخلفي للواتساب)

---

## 🌐 ثانياً: نشر واجهة المتجر (`joe-store`) على Vercel (خطوة بخطوة)

### الخطوة 1: الدخول لـ Vercel
1. توجّه إلى موقع [vercel.com](https://vercel.com) وسجّل الدخول بحساب GitHub الخاص بك.
2. اضغط على زر **"Add New..."** ثم اختر **"Project"**.

### الخطوة 2: استيراد المشروع
1. اختر مستودع `joe-store` من قائمتك واضغط **"Import"**.
2. سيتعرف Vercel تلقائياً على أن المشروع مبني بـ **Vite**.
3. الإعدادات الافتراضية الصحيحة:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

### الخطوة 3: إضافة المتغيرات البيئية (اختياري)
في تبويب **Environment Variables**، يمكنك إضافة:
- `VITE_WHATSAPP_API_URL`: رابط سيرفر الواتساب بعد نشره على Railway (مثال: `https://joe-whatsapp.up.railway.app`).

### الخطوة 4: النشر (Deploy)
- اضغط على **"Deploy"**. سيستغرق البناء دقيقة واحدة فقط.
- ستحصل على رابط رسمي مثل: `https://joe-store-official.vercel.app`.
- لقد قمنا بتضمين ملف `vercel.json` تلقائياً لحل أي مشاكل في إعادة تحميل الصفحات (SPA Routing 404 Prevention).

### الخطوة 5: ربط دومين خاص (Custom Domain)
- من لوحة تحكم Vercel، اذهب إلى **Settings -> Domains**.
- اكتب دومينك الخاص (مثال: `joestore-eg.com`).
- أضف سجلات الـ DNS (سجل `CNAME` أو `A`) في لوحة تحكم مزود الدومين الخاص بك (GoDaddy / Namecheap).

---

## 🤖 ثالثاً: نشر محرك أتمتة الواتساب على Railway.app

> [!IMPORTANT]
> **لماذا يفشل نشر الواتساب على Vercel أو Heroku Free؟**
> تعمل سيرفرات Vercel بنظام **Serverless Functions** (تنطفئ بعد بضع ثوانٍ من عدم الاستخدام وتمسح الملفات المؤقتة). بينما يتطلب محرك الواتساب:
> 1. اتصال Socket دائم 24/7 مع خوادم WhatsApp الرسمية.
> 2. مجلد ثابت `auth_info/` لتخزين مفاتيح التشفير وجلسة الـ QR Code حتى لا تضطر لمسح الكود كل مرة يعيد فيها السيرفر التشغيل.

### الخطوة 1: التسجيل في Railway
1. افتح [railway.com](https://railway.com) وسجّل دخولك بواسطة حساب GitHub.
2. اضغط على **"New Project"** -> واختر **"Deploy from GitHub repo"**.
3. اختر مستودع `whatsapp-pro-automation`.

### الخطوة 2: إعدادات الـ Dockerfile والتخزين الدائم (Volume)
- يكتشف Railway ملف الـ `Dockerfile` الموجود في المشروع ويبدأ بناء صورة النظام تلقائياً.
- **إضافة وحدة تخزين دائمة (Persistent Volume):**
  1. ادخل على الخدمة داخل Railway واذهب إلى تبويب **"Volumes"**.
  2. اضغط **"Add Volume"**.
  3. اضبط مسار التثبيت (Mount Path) إلى: `/app/auth_info` ومسار البيانات `/app/data`.
  4. هذا يضمن بقاء رقم الواتساب متصلاً دائماً حتى عند عمل Redeploy أو تحديث الكود.

### الخطوة 3: المتغيرات البيئية (Variables)
في تبويب **"Variables"** أضف التالي:
- `PORT` = `5000`
- `NODE_ENV` = `production`
- `JWT_SECRET` = `joe_store_super_secret_jwt_key_2026`
- `CORS_ORIGIN` = رابط متجرك على Vercel (مثال: `https://joe-store-official.vercel.app`)

### الخطوة 4: توليد الرابط العام (Public Domain)
- من تبويب **"Settings"** -> انزل لقسم **"Networking"** واضغط **"Generate Domain"**.
- سيعطيك Railway رابطاً آمناً بصيغة:
  `https://whatsapp-pro-production-xxxx.up.railway.app`
- اختبر الرابط في المتصفح وتأكد من فتح شاشة لوحة تحكم الواتساب لمسح رمز الـ QR لأول مرة.

---

## 🔗 رابعاً: ربط المتجر بخادم الواتساب المباشر

بعد الحصول على رابط Railway:
1. ادخل إلى متجر جو ستور (`joe-store`) كمدير وافتح لوحة التحكم: **لوحة الإدارة (Admin Dashboard)**.
2. انتقل إلى تبويب **الإعدادات (Settings)**.
3. في حقل **رابط سيرفر واتساب المباشر (WhatsApp Server URL)**:
   - ضع رابط السيرفر العام (مثال: `https://whatsapp-pro-production-xxxx.up.railway.app`).
4. اضغط **حفظ الإعدادات**.
5. الآن، بمجرد أن يقوم أي عميل بإتمام طلب على الموقع، سيتم إرسال الفاتورة وتفاصيل الجهاز وحالة الضمان تلقائياً إلى واتساب العميل وإلى رقم المتجر!

---

## 💡 بديل اقتصادي: استئجار سيرفر VPS مستقل (Hetzner / Contabo)

إذا كنت تفضل إدارة سيرفر خاص بالكامل بتكلفة ثابتة (حوالي 4 إلى 5 يورو شهرياً):
1. استأجر VPS بنظام **Ubuntu 22.04 LTS** من Hetzner أو Contabo أو DigitalOcean.
2. اتصل بالسيرفر عبر SSH وثبّت Docker و Nginx:
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y docker.io docker-compose git nginx certbot python3-certbot-nginx
   ```
3. اسحب كود المشروع وشغّله عبر Docker:
   ```bash
   git clone https://github.com/your-username/whatsapp-pro-automation.git
   cd whatsapp-pro-automation
   docker build -t joe-whatsapp .
   docker run -d --name joe-whatsapp-app --restart always -p 5000:5000 -v $(pwd)/auth_info:/app/auth_info -v $(pwd)/data:/app/data joe-whatsapp
   ```
4. اربط Nginx مع شهادة Let's Encrypt SSL مجانية لتشغيل السيرفر على دومين فرعي مثل `api.joestore-eg.com`.

---

## 📋 الخلاصة والتوصية النهائية للمدير

- **الواجهة:** انشرها على **Vercel** مجاناً في 5 دقائق مع دومينك الرسمي.
- **خادم الواتساب:** انشره على **Railway** واضبط الـ Volume على `/app/auth_info`.
- **الربط:** اكتب رابط Railway في إعدادات لوحة تحكم المتجر بضغطة زر واحدة.
