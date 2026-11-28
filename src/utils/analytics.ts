import type { CartItem, Order, Product } from '../types';

const COOKIE_CONSENT_STORAGE_KEY = 'joe_cookie_consent_v1';

export function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.choice === 'accepted';
  } catch {
    return false;
  }
}

export function normalizeGa4MeasurementId(rawId?: string): string {
  const cleaned = String(rawId || '').trim().toUpperCase();
  if (!/^G-[A-Z0-9]{6,16}$/.test(cleaned)) return '';
  return cleaned;
}

const injectedGa4Ids = new Set<string>();

export function revokeAnalyticsIfDeclined(measurementId?: string): void {
  if (typeof window === 'undefined') return;
  const id = normalizeGa4MeasurementId(measurementId);
  if (id) {
    (window as any)[`ga-disable-${id}`] = true;
  }
  if (typeof (window as any).gtag === 'function') {
    try {
      (window as any).gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
    } catch {
      // Ignore gtag errors
    }
  }
}

export function initGa4(measurementId?: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const id = normalizeGa4MeasurementId(measurementId);
  if (!id || !hasAnalyticsConsent()) {
    revokeAnalyticsIfDeclined(id);
    return;
  }

  (window as any)[`ga-disable-${id}`] = false;
  (window as any).dataLayer = (window as any).dataLayer || [];
  if (typeof (window as any).gtag !== 'function') {
    (window as any).gtag = function gtag(...args: any[]) {
      (window as any).dataLayer.push(args);
    };
  }

  const gtag = (window as any).gtag;
  if (!injectedGa4Ids.has(id)) {
    injectedGa4Ids.add(id);
    if (!document.querySelector(`script[data-ga4-id="${id}"]`)) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      script.dataset.ga4Id = id;
      document.head.appendChild(script);
    }
    gtag('js', new Date());
  }

  gtag('consent', 'update', {
    analytics_storage: 'granted',
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
  });
  gtag('config', id, { anonymize_ip: true, send_page_view: false });
}

export function trackGa4Event(eventName: string, params: Record<string, any> = {}): void {
  if (typeof window === 'undefined' || !hasAnalyticsConsent()) return;
  if (typeof (window as any).gtag !== 'function') return;
  try {
    (window as any).gtag('event', eventName, params);
  } catch {
    // Non-blocking telemetry
  }
}

export function trackGa4PageView(pagePath: string, title?: string): void {
  trackGa4Event('page_view', {
    page_path: pagePath,
    page_title: title || (typeof document !== 'undefined' ? document.title : ''),
  });
}

export function trackGa4ViewItem(product: Product): void {
  if (!product?.id) return;
  trackGa4Event('view_item', {
    currency: 'EGP',
    value: Number(product.price || 0),
    items: [
      {
        item_id: product.id,
        item_name: product.name_ar || product.name_en,
        item_brand: product.brand,
        item_category: product.category,
        price: Number(product.price || 0),
        quantity: 1,
      },
    ],
  });
}

export function trackGa4AddToCart(product: Product, quantity = 1): void {
  if (!product?.id) return;
  const qty = Math.max(1, Number(quantity || 1));
  const price = Number(product.price || 0);
  trackGa4Event('add_to_cart', {
    currency: 'EGP',
    value: price * qty,
    items: [
      {
        item_id: product.id,
        item_name: product.name_ar || product.name_en,
        item_brand: product.brand,
        item_category: product.category,
        price,
        quantity: qty,
      },
    ],
  });
}

export function trackGa4BeginCheckout(items: CartItem[], total: number, coupon?: string): void {
  trackGa4Event('begin_checkout', {
    currency: 'EGP',
    value: Number(total || 0),
    coupon: coupon || undefined,
    items: items.map((item) => ({
      item_id: item.product.id,
      item_name: item.product.name_ar || item.product.name_en,
      item_brand: item.product.brand,
      item_category: item.product.category,
      price: Number(item.product.price || 0),
      quantity: Math.max(1, Number(item.quantity || 1)),
    })),
  });
}

export function trackGa4Purchase(order: Order): void {
  if (!order?.order_number) return;
  trackGa4Event('purchase', {
    transaction_id: order.order_number,
    currency: 'EGP',
    value: Number(order.total || 0),
    shipping: Number(order.shipping_fee || 0),
    coupon: order.coupon_code || undefined,
    items: (order.items || []).map((item) => ({
      item_id: item.product.id,
      item_name: item.product.name_ar || item.product.name_en,
      item_brand: item.product.brand,
      item_category: item.product.category,
      price: Number(item.product.price || 0),
      quantity: Math.max(1, Number(item.quantity || 1)),
    })),
  });
}

export function trackGa4Search(searchTerm: string): void {
  const cleaned = String(searchTerm || '').trim();
  if (!cleaned) return;
  trackGa4Event('search', { search_term: cleaned.slice(0, 120) });
}
