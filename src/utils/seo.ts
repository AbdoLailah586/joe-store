import type { Product, StoreSettings } from '../types';

export interface PageSeoPayload {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: 'website' | 'product';
  jsonLd?: Record<string, any> | Record<string, any>[];
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  if (typeof document === 'undefined') return;
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function upsertJsonLd(data?: Record<string, any> | Record<string, any>[]) {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById('joe-dynamic-jsonld');
  if (!data) {
    existing?.remove();
    return;
  }
  const script = existing || document.createElement('script');
  script.id = 'joe-dynamic-jsonld';
  script.setAttribute('type', 'application/ld+json');
  script.textContent = JSON.stringify(data);
  if (!existing) document.head.appendChild(script);
}

export function applyPageSeo(payload: PageSeoPayload) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const origin = window.location.origin;
  const canonicalUrl = `${origin}${payload.path || window.location.pathname}`;
  const imageUrl = payload.image
    ? payload.image.startsWith('http')
      ? payload.image
      : `${origin}${payload.image}`
    : `${origin}/logo-og.jpg`;

  document.title = payload.title;
  upsertCanonical(canonicalUrl);
  upsertMeta('name', 'description', payload.description);
  upsertMeta('property', 'og:type', payload.type || 'website');
  upsertMeta('property', 'og:title', payload.title);
  upsertMeta('property', 'og:description', payload.description);
  upsertMeta('property', 'og:url', canonicalUrl);
  upsertMeta('property', 'og:image', imageUrl);
  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', payload.title);
  upsertMeta('name', 'twitter:description', payload.description);
  upsertMeta('name', 'twitter:image', imageUrl);
  upsertJsonLd(payload.jsonLd);
}

export function buildStoreJsonLd(origin: string, settings: Partial<StoreSettings>) {
  const storeName = settings.store_name_ar || 'JOE Store | جو ستور';
  const sameAs = [settings.tiktok_url, settings.instagram_url, settings.facebook_url].filter(
    (l): l is string => typeof l === 'string' && l.startsWith('http')
  );

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'ElectronicsStore',
      name: storeName,
      alternateName: 'JOE Store',
      url: origin,
      image: `${origin}/logo-og.jpg`,
      telephone: settings.store_phone || '+201554826209',
      address: {
        '@type': 'PostalAddress',
        streetAddress: settings.store_address_ar || 'شارع الإمام محمد عبده – ناصية آمون',
        addressLocality: 'المنصورة',
        addressRegion: 'الدقهلية',
        addressCountry: 'EG'
      },
      sameAs
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: storeName,
      url: origin,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${origin}/catalog?q={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    }
  ];
}

export function buildProductJsonLd(origin: string, product: Product, settings: Partial<StoreSettings>) {
  const imgs = (product.images?.length ? product.images : ['/logo-og.jpg']).map(img =>
    img.startsWith('http') ? img : `${origin}${img}`
  );
  const productUrl = `${origin}/product/${encodeURIComponent(product.id)}`;
  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name_ar,
    alternateName: product.name_en || undefined,
    description: product.description_ar || `${product.name_ar} متوفر بضمان رسمي لدى متجر جو ستور بالمنصورة.`,
    sku: product.sku || product.id,
    image: imgs,
    brand: {
      '@type': 'Brand',
      name: product.brand || 'JOE Store'
    },
    category: product.category,
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'EGP',
      price: Number(product.price || 0),
      availability: product.in_stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: settings.store_name_ar || 'جو ستور' }
    }
  };

  if ((product.reviews_count || 0) > 0 && (product.rating || 0) > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(product.rating || 5),
      reviewCount: product.reviews_count
    };
  }

  return [
    schema,
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'الكتالوج', item: `${origin}/catalog` },
        { '@type': 'ListItem', position: 3, name: product.name_ar, item: productUrl }
      ]
    }
  ];
}
