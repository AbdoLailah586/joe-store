import { neon } from '@neondatabase/serverless';

// Instant in-memory fallback for key products to ensure 0ms latency and high reliability
const FALLBACK_PRODUCTS = {
  'prod-onmust-zolo-30w-1006': {
    id: 'prod-onmust-zolo-30w-1006',
    sku: 'ONMUST-ZOLO-30W-BLK',
    name_ar: 'رأس شاحن أون موست ONMUST Zolo السريع بقوة 30 واط منفذ Type-C - موديل 1006',
    name_en: 'ONMUST Zolo 30W Fast Wall Charger (Type-C, PD 3.0, Model 1006)',
    brand: 'ONMUST',
    price: 350,
    original_price: 450,
    images: [
      '/product-images/onmust-zolo-30w-og.jpg',
      '/product-images/onmust-zolo-30w-studio.jpg',
      '/product-images/onmust-zolo-30w-box-clean.png'
    ],
    description_ar: 'شاحن جداري فائق السرعة ONMUST Zolo بقدرة 30 واط مع منفذ Type-C متطور يدعم بروتوكولات الشحن السريع PD 3.0 و PPS ومقاوم لارتفاع الحرارة مع فيشة ثنائية مصرية وضمان 12 شهراً لدى متجر جو ستور.'
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default async function handler(req, res) {
  const { id } = req.query;
  const productId = (id || '').trim();

  // Determine host and protocol
  const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'joe-store-2026.vercel.app';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const baseUrl = `${proto}://${host}`;
  const canonicalUrl = `${baseUrl}/product/${encodeURIComponent(productId)}`;

  // Default product lookup
  let product = FALLBACK_PRODUCTS[productId] || null;

  // Query Neon DB if product not in fallback dictionary and DATABASE_URL is available
  const DB_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || '';
  if (!product && DB_URL && productId) {
    try {
      const sql = neon(DB_URL);
      const rows = await sql`
        SELECT id, sku, name_ar, name_en, brand, price, original_price, discount_percentage, images, description_ar
        FROM products
        WHERE id = ${productId} OR sku = ${productId}
        LIMIT 1;
      `;
      if (rows && rows.length > 0) {
        product = rows[0];
      }
    } catch (err) {
      console.error('Error fetching product for OG:', err.message);
    }
  }

  // Detect whether request is from a social crawler (WhatsApp, Facebook, Twitter, Telegram, etc.)
  const userAgent = req.headers['user-agent'] || '';
  const isCrawler = /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|applebot|bingbot|google-structured-data-testing-tool/i.test(userAgent);

  // If a regular user/browser directly requested /api/og-product?id=..., redirect them to the real product page
  if (!isCrawler && req.url && req.url.startsWith('/api/')) {
    return res.redirect(302, `/product/${encodeURIComponent(productId)}`);
  }

  // If product not found, fallback to store general metadata
  if (!product) {
    const defaultTitle = 'متجر جو ستور | JOE Store - المنصورة';
    const defaultDesc = 'متجر جو ستور بالمنصورة: أحدث الهواتف الذكية والإكسسوارات الأصلية، شواحن وسماعات معتمدة بأفضل سعر وضمان حقيقي.';
    const defaultImage = `${baseUrl}/logo-og.jpg`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(`<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(defaultTitle)}</title>
  <meta name="description" content="${escapeHtml(defaultDesc)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="JOE Store | متجر جو ستور">
  <meta property="og:title" content="${escapeHtml(defaultTitle)}">
  <meta property="og:description" content="${escapeHtml(defaultDesc)}">
  <meta property="og:image" content="${defaultImage}">
  <meta property="og:image:secure_url" content="${defaultImage}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${baseUrl}/">
  <meta name="twitter:card" content="summary_large_image">
  <meta http-equiv="refresh" content="0;url=${baseUrl}/">
</head>
<body>
  <h1>متجر جو ستور</h1>
  <p><a href="${baseUrl}/">اضغط هنا لزيارة متجر جو ستور</a></p>
</body>
</html>`);
  }

  // Format product title and price
  const title = `${product.name_ar} | متجر جو ستور`;
  const formattedPrice = product.price ? `${Number(product.price).toLocaleString('ar-EG')} ج.م` : '';
  const desc = `السعر: ${formattedPrice} - ${product.description_ar || product.name_ar} - متوفر الآن لدى متجر جو ستور بالمنصورة مع ضمان معتمد.`;

  // Select primary image
  let rawImage = '';
  if (productId === 'prod-onmust-zolo-30w-1006') {
    rawImage = '/product-images/onmust-zolo-30w-og.jpg';
  } else if (Array.isArray(product.images) && product.images.length > 0) {
    rawImage = product.images[0];
  } else if (typeof product.images === 'string') {
    try {
      const parsed = JSON.parse(product.images);
      rawImage = Array.isArray(parsed) ? parsed[0] : parsed;
    } catch {
      rawImage = product.images;
    }
  }

  if (!rawImage) {
    rawImage = '/logo-og.jpg';
  }

  const imageUrl = rawImage.startsWith('http')
    ? rawImage
    : `${baseUrl}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`;

  const imageType = imageUrl.endsWith('.png') ? 'image/png' : 'image/jpeg';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Cache response for 1 hour on Vercel CDN Edge nodes
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(desc)}">

  <!-- Open Graph / WhatsApp / Facebook / Telegram -->
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="JOE Store | متجر جو ستور">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(desc)}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:secure_url" content="${imageUrl}">
  <meta property="og:image:type" content="${imageType}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escapeHtml(product.name_ar)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:locale" content="ar_EG">
  ${product.price ? `<meta property="product:price:amount" content="${product.price}">\n  <meta property="product:price:currency" content="EGP">` : ''}

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@joestore">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(desc)}">
  <meta name="twitter:image" content="${imageUrl}">
  <meta name="twitter:image:alt" content="${escapeHtml(product.name_ar)}">

  <!-- Canonical Link -->
  <link rel="canonical" href="${canonicalUrl}">

  <!-- Schema.org Product Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": ${JSON.stringify(product.name_ar)},
    "image": [${JSON.stringify(imageUrl)}],
    "description": ${JSON.stringify(desc)},
    "sku": ${JSON.stringify(product.sku || product.id)},
    "brand": {
      "@type": "Brand",
      "name": ${JSON.stringify(product.brand || 'JOE Store')}
    },
    "offers": {
      "@type": "Offer",
      "url": ${JSON.stringify(canonicalUrl)},
      "priceCurrency": "EGP",
      "price": ${JSON.stringify(String(product.price || 0))},
      "itemCondition": "https://schema.org/NewCondition",
      "availability": "https://schema.org/InStock",
      "seller": {
        "@type": "Organization",
        "name": "JOE Store"
      }
    }
  }
  </script>

  <!-- Redirect regular visitors smoothly to the SPA view -->
  <meta http-equiv="refresh" content="0;url=${canonicalUrl}">
  <script>
    if (!navigator.userAgent.match(/bot|spider|crawl|whatsapp|facebook|twitter|telegram/i)) {
      window.location.replace(${JSON.stringify(canonicalUrl)});
    }
  </script>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 20px; direction: rtl; text-align: center;">
  <div style="max-width: 600px; margin: 40px auto; background: white; padding: 30px; border-radius: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
    <h1 style="font-size: 20px; margin-bottom: 12px; color: #0f172a;">${escapeHtml(product.name_ar)}</h1>
    <p style="font-size: 18px; font-weight: bold; color: #b45309; margin: 8px 0;">${formattedPrice}</p>
    <p style="font-size: 14px; color: #475569; line-height: 1.6;">${escapeHtml(desc)}</p>
    <img src="${imageUrl}" alt="${escapeHtml(product.name_ar)}" style="max-width: 100%; height: auto; border-radius: 16px; margin: 20px 0; border: 1px solid #e2e8f0;" />
    <div style="margin-top: 20px;">
      <a href="${canonicalUrl}" style="display: inline-block; background: #f59e0b; color: #000; font-weight: bold; text-decoration: none; padding: 12px 28px; border-radius: 14px;">فتح المنتج في متجر جو ستور</a>
    </div>
  </div>
</body>
</html>`;

  return res.status(200).send(html);
}
