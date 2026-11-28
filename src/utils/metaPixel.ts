declare global {
  interface Window {
    fbq?: ((...args: any[]) => void) & {
      callMethod?: (...args: any[]) => void;
      queue?: any[];
      loaded?: boolean;
      version?: string;
      push?: (...args: any[]) => void;
    };
    _fbq?: any;
  }
}

let initializedPixelId = '';

export function normalizeMetaPixelId(raw?: string | null): string {
  const digits = String(raw || '').trim();
  return /^\d{10,20}$/.test(digits) ? digits : '';
}

export function initMetaPixel(rawPixelId?: string | null): boolean {
  const pixelId = normalizeMetaPixelId(rawPixelId);
  if (!pixelId || typeof window === 'undefined' || typeof document === 'undefined') return false;

  if (!window.fbq) {
    const n: any = function (...args: any[]) {
      if (n.callMethod) n.callMethod.apply(n, args);
      else n.queue.push(args);
    };
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    window.fbq = n;
    if (!window._fbq) window._fbq = n;

    if (!document.getElementById('joe-meta-pixel-script')) {
      const script = document.createElement('script');
      script.id = 'joe-meta-pixel-script';
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(script);
    }
  }

  if (initializedPixelId !== pixelId) {
    window.fbq('init', pixelId);
    initializedPixelId = pixelId;
  }
  return true;
}

export function disableMetaPixel(): void {
  initializedPixelId = '';
}

export function getMetaBrowserCookies(): { fbp?: string; fbc?: string } {
  if (typeof document === 'undefined' || !document.cookie) return {};
  const out: { fbp?: string; fbc?: string } = {};
  for (const part of document.cookie.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if ((key === '_fbp' || key === '_fbc') && /^fb\.\d+\.\d+\.[A-Za-z0-9_.-]{4,160}$/.test(val)) {
      if (key === '_fbp') out.fbp = val;
      if (key === '_fbc') out.fbc = val;
    }
  }
  return out;
}

export function trackMetaEvent(
  eventName: 'PageView' | 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase' | 'Search',
  params?: Record<string, any>,
  eventId?: string
) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function' || !initializedPixelId) return;
  try {
    if (eventId) {
      window.fbq('track', eventName, params || {}, { eventID: eventId });
    } else if (params && Object.keys(params).length > 0) {
      window.fbq('track', eventName, params);
    } else {
      window.fbq('track', eventName);
    }
  } catch {}
}
