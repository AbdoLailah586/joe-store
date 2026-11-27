export type AdPlatformSource = 'facebook' | 'instagram' | 'tiktok' | 'google';

function appendUtms(
  baseUrl: string,
  options?: { source?: AdPlatformSource | ''; medium?: string; campaign?: string }
): string {
  const src = (options?.source || '').trim();
  if (!src) return baseUrl;
  const sp = new URLSearchParams();
  sp.set('utm_source', src);
  sp.set('utm_medium', (options?.medium || 'cpc').trim());
  const camp = (options?.campaign || '').trim();
  if (camp) sp.set('utm_campaign', camp);
  const sep = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${sep}${sp.toString()}`;
}

export function buildProductAdUrl(params: {
  origin?: string;
  productId: string;
  source?: AdPlatformSource | '';
  medium?: string;
  campaign?: string;
}): string {
  const origin = String(
    params.origin ?? (typeof window !== 'undefined' ? window.location.origin : 'https://joe-store-2026.vercel.app')
  ).replace(/\/+$/, '');
  const base = `${origin}/product/${encodeURIComponent(String(params.productId || '').trim())}`;
  return appendUtms(base, params);
}

export function buildStoreAdUrl(params: {
  origin?: string;
  path?: string;
  source?: AdPlatformSource | '';
  medium?: string;
  campaign?: string;
}): string {
  const origin = String(
    params.origin ?? (typeof window !== 'undefined' ? window.location.origin : 'https://joe-store-2026.vercel.app')
  ).replace(/\/+$/, '');
  const rawPath = String(params.path || '/').trim();
  const safePath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  return appendUtms(`${origin}${safePath}`, params);
}
