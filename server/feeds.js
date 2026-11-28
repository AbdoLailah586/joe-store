import { neon } from '@neondatabase/serverless';

function toFullUrl(baseUrl, pathOrUrl) {
  const s = String(pathOrUrl || '').trim();
  if (!s) return '';
  return s.startsWith('http') ? s : `${baseUrl}${s.startsWith('/') ? '' : '/'}${s}`;
}

function escCsv(val) {
  const raw = String(val ?? '').replace(/\r?\n+/g, ' ').trim();
  const guarded = /^[=+\-@\t]/.test(raw) ? `'${raw}` : raw;
  return `"${guarded.replace(/"/g, '""')}"`;
}

function escXml(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function handleSitemap(req, res, deps) {
  const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'joe-store-2026.vercel.app';
  const proto = req.headers['x-forwarded-proto'] || (/^(localhost|127\.0\.0\.1)(:|$)/i.test(host) ? 'http' : 'https');
  const baseUrl = `${proto}://${host}`;

  let products = deps?.products || [];
  if (!deps?.products && (process.env.DATABASE_URL || process.env.VITE_DATABASE_URL)) {
    try {
      const sql = neon(process.env.DATABASE_URL || process.env.VITE_DATABASE_URL);
      products =
        (await sql`SELECT id, name_ar, images, updated_at FROM products WHERE is_active = true ORDER BY is_featured DESC, created_at DESC LIMIT 1000`) ||
        [];
    } catch {
      products = [];
    }
  }

  const staticPaths = [
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/catalog', priority: '0.9', changefreq: 'daily' },
    { path: '/deals', priority: '0.8', changefreq: 'daily' },
    { path: '/brands', priority: '0.7', changefreq: 'weekly' },
    { path: '/contact', priority: '0.6', changefreq: 'monthly' },
    { path: '/terms', priority: '0.4', changefreq: 'monthly' },
    { path: '/privacy-policy', priority: '0.4', changefreq: 'monthly' },
    { path: '/return-policy', priority: '0.4', changefreq: 'monthly' },
    { path: '/shipping-policy', priority: '0.4', changefreq: 'monthly' }
  ];

  const urls = [
    ...staticPaths.map(
      p => `  <url>
    <loc>${escXml(`${baseUrl}${p.path}`)}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
    ),
    ...products.map(p => {
      const imgs = (Array.isArray(p.images) ? p.images : []).slice(0, 3).map(src => toFullUrl(baseUrl, src)).filter(Boolean);
      const lastmod = p.updated_at ? new Date(p.updated_at).toISOString().split('T')[0] : undefined;
      return `  <url>
    <loc>${escXml(`${baseUrl}/product/${encodeURIComponent(p.id)}`)}</loc>${
      lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''
    }
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>${imgs
      .map(
        img => `
    <image:image>
      <image:loc>${escXml(img)}</image:loc>
      <image:title>${escXml(p.name_ar)}</image:title>
    </image:image>`
      )
      .join('')}
  </url>`;
    })
  ];

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>`);
}

export async function handleMetaFeed(req, res, deps) {
  const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'joe-store-2026.vercel.app';
  const proto = req.headers['x-forwarded-proto'] || (/^(localhost|127\.0\.0\.1)(:|$)/i.test(host) ? 'http' : 'https');
  const baseUrl = `${proto}://${host}`;

  const urlObj = new URL(req.url || '/meta-feed', 'http://localhost');
  const format = String(urlObj.searchParams.get('format') || req.query?.format || 'csv').toLowerCase();

  let products = deps?.products || [];
  if (!deps?.products && (process.env.DATABASE_URL || process.env.VITE_DATABASE_URL)) {
    try {
      const sql = neon(process.env.DATABASE_URL || process.env.VITE_DATABASE_URL);
      products = await sql`
        SELECT id, name_ar, name_en, brand, category, price, stock_quantity, is_preowned, images, specs
        FROM products
        WHERE is_active = true AND price > 0
        ORDER BY is_featured DESC, created_at DESC
        LIMIT 1000;
      `;
    } catch {
      products = [];
    }
  }

  const normalized = (products || []).map(p => {
    const specsObj = p.specs && typeof p.specs === 'object' ? p.specs : {};
    const details = specsObj.__product_data && typeof specsObj.__product_data === 'object' ? specsObj.__product_data : {};
    const rawDesc = details.description_ar || specsObj.description_ar || `${p.name_ar} متوفر بضمان رسمي في متجر جو ستور بالمنصورة`;
    const imgs = (Array.isArray(p.images) && p.images.length ? p.images : ['/logo-og.jpg'])
      .map(src => toFullUrl(baseUrl, src))
      .filter(Boolean);
    const inStock = Number(p.stock_quantity ?? p.stock ?? 1) > 0;
    const isPreowned = Boolean(p.is_preowned || details.condition === 'mint' || details.condition === 'used_good');
    const feedCondition = isPreowned ? 'used' : 'new';
    const mpn = String(specsObj.model || specsObj.mpn || details.sku || p.sku || p.id || '').trim().slice(0, 70);
    const gtin = String(specsObj.gtin || specsObj.barcode || specsObj.ean || '').replace(/\D/g, '').slice(0, 14);
    return {
      id: p.id,
      title: String(p.name_ar || p.name_en || p.id).slice(0, 150),
      description: String(rawDesc).slice(0, 1000),
      availability: inStock ? 'in stock' : 'out of stock',
      condition: feedCondition,
      mpn,
      gtin,
      price: `${Number(p.price || 0).toFixed(2)} EGP`,
      link: `${baseUrl}/product/${encodeURIComponent(p.id)}`,
      image_link: imgs[0] || `${baseUrl}/logo-og.jpg`,
      additional_images: imgs.slice(1, 5),
      brand: String(p.brand || 'JOE Store').slice(0, 100),
      google_product_category: 'Electronics > Communications > Telephony > Mobile Phones & Accessories'
    };
  });

  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

  if (format === 'xml') {
    const itemsXml = normalized
      .map(
        item => `    <item>
      <g:id>${escXml(item.id)}</g:id>
      <g:title>${escXml(item.title)}</g:title>
      <g:description>${escXml(item.description)}</g:description>
      <g:link>${escXml(item.link)}</g:link>
      <g:image_link>${escXml(item.image_link)}</g:image_link>${item.additional_images
          .map(img => `\n      <g:additional_image_link>${escXml(img)}</g:additional_image_link>`)
          .join('')}
      <g:brand>${escXml(item.brand)}</g:brand>
      <g:condition>${item.condition}</g:condition>
      <g:availability>${item.availability === 'in stock' ? 'in_stock' : 'out_of_stock'}</g:availability>
      <g:price>${escXml(item.price)}</g:price>${item.mpn ? `\n      <g:mpn>${escXml(item.mpn)}</g:mpn>` : ''}${item.gtin ? `\n      <g:gtin>${escXml(item.gtin)}</g:gtin>` : '\n      <g:identifier_exists>false</g:identifier_exists>'}
      <g:google_product_category>${escXml(item.google_product_category)}</g:google_product_category>
    </item>`
      )
      .join('\n');

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>جو ستور | JOE Store Catalog</title>
    <link>${escXml(baseUrl)}</link>
    <description>كتالوج منتجات جو ستور لإعلانات Meta وجوجل شوبينج</description>
${itemsXml}
  </channel>
</rss>`);
  }

  const headerRow = 'id,title,description,availability,condition,price,link,image_link,additional_image_link,brand,google_product_category';
  const csvRows = normalized.map(item =>
    [
      item.id,
      item.title,
      item.description,
      item.availability,
      item.condition,
      item.price,
      item.link,
      item.image_link,
      item.additional_images.join(','),
      item.brand,
      item.google_product_category
    ]
      .map(escCsv)
      .join(',')
  );

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  return res.status(200).send(`\uFEFF${[headerRow, ...csvRows].join('\n')}`);
}
