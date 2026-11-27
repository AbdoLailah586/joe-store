import { neon } from '@neondatabase/serverless';

function escXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toFullUrl(baseUrl, pathOrUrl) {
  const s = String(pathOrUrl || '').trim();
  if (!s) return '';
  return s.startsWith('http') ? s : `${baseUrl}${s.startsWith('/') ? '' : '/'}${s}`;
}

export default async function handler(req, res, deps) {
  const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'joe-store-2026.vercel.app';
  const proto = req.headers['x-forwarded-proto'] || (/^(localhost|127\.0\.0\.1)(:|$)/i.test(host) ? 'http' : 'https');
  const baseUrl = `${proto}://${host}`;

  let products = deps?.products || [];
  if (!deps?.products && (process.env.DATABASE_URL || process.env.VITE_DATABASE_URL)) {
    try {
      const sql = neon(process.env.DATABASE_URL || process.env.VITE_DATABASE_URL);
      products =
        (await sql`SELECT id, sku, name_ar, images, updated_at FROM products WHERE is_active = true ORDER BY is_featured DESC, created_at DESC LIMIT 1000`) ||
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
