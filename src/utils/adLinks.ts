import type { ProductSocialLinks } from '../types';

export type AdPlatformSource = 'facebook' | 'instagram' | 'tiktok' | 'google';
export type SocialPostPlatform = 'facebook' | 'tiktok' | 'instagram';

const SOCIAL_PLATFORMS: SocialPostPlatform[] = ['facebook', 'tiktok', 'instagram'];

/**
 * Validates and normalizes an external social post URL to safe http/https URLs.
 */
export function sanitizeSocialUrl(raw?: string | null): string | undefined {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return undefined;
  const withScheme = /^(https?:)?\/\//i.test(trimmed)
    ? (trimmed.startsWith('//') ? `https:${trimmed}` : trimmed)
    : /^(?:www\.)?(?:facebook\.com|fb\.watch|m\.facebook\.com|tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com|instagram\.com|instagr\.am)\//i.test(trimmed)
      ? `https://${trimmed}`
      : trimmed;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

/**
 * Normalizes a product's social_links map, keeping only valid http/https links.
 */
export function normalizeProductSocialLinks(input?: ProductSocialLinks | Record<string, unknown> | null): ProductSocialLinks | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
  const out: ProductSocialLinks = {};
  for (const key of SOCIAL_PLATFORMS) {
    const clean = sanitizeSocialUrl((input as Record<string, unknown>)[key] as string | undefined);
    if (clean) out[key] = clean;
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Returns ordered list of valid social post link entries for rendering.
 */
export function getProductSocialLinkEntries(
  product?: { social_links?: ProductSocialLinks | null } | null
): { platform: SocialPostPlatform; url: string }[] {
  const clean = normalizeProductSocialLinks(product?.social_links);
  if (!clean) return [];
  return SOCIAL_PLATFORMS
    .filter((platform) => Boolean(clean[platform]))
    .map((platform) => ({ platform, url: clean[platform]! }));
}

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
