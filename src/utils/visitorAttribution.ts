export interface VisitorAttribution {
  source_channel: string;
  source_label: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  referrer: string;
  device_type: string;
  landing_path: string;
  last_path: string;
}

const STORAGE_KEY = 'joe_visitor_attribution';

export function detectDeviceType(userAgent?: string): string {
  const ua = String(
    userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '')
  ).toLowerCase();
  if (!ua) return 'غير معروف';
  if (/ipad|tablet|playbook|silk|(android(?!.*mobi))/i.test(ua)) return 'تابلت (Tablet)';
  if (/mobi|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) return 'موبايل (Mobile)';
  return 'كمبيوتر / لابتوب (Desktop)';
}

function getHostname(rawUrl: string): string {
  try {
    if (!rawUrl) return '';
    return new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export function detectVisitorAttribution(input: {
  search?: string;
  referrer?: string;
  userAgent?: string;
  pathname?: string;
  currentHost?: string;
}): VisitorAttribution {
  const sp = new URLSearchParams(input.search || '');
  const utmSource = (sp.get('utm_source') || '').trim().toLowerCase();
  const utmMedium = (sp.get('utm_medium') || '').trim().toLowerCase();
  const utmCampaign = (sp.get('utm_campaign') || '').trim();
  const fbclid = sp.get('fbclid');
  const ttclid = sp.get('ttclid');
  const igshid = sp.get('igshid');
  const gclid = sp.get('gclid') || sp.get('gad_source') || sp.get('wbraid') || sp.get('gbraid');

  const rawReferrer = String(input.referrer || '').trim();
  const refHost = getHostname(rawReferrer);
  const currentHost = (input.currentHost || '').toLowerCase();
  const isExternalRef = Boolean(refHost && (!currentHost || refHost !== currentHost));
  const isPaidMedium = /(cpc|ppc|paid|ad|ads|sponsored|cpm)/i.test(utmMedium);

  let source_channel = 'direct';
  let source_label = 'دخول مباشر / تطبيق المتجر';

  if (gclid || ((utmSource === 'google' || utmSource.includes('adwords')) && isPaidMedium)) {
    source_channel = 'google_ads';
    source_label = 'إعلان جوجل (Google Ads)';
  } else if (ttclid || utmSource.includes('tiktok') || utmSource === 'tt' || refHost.includes('tiktok.com')) {
    const paid = Boolean(ttclid || isPaidMedium);
    source_channel = paid ? 'tiktok_ads' : 'tiktok';
    source_label = paid ? 'إعلان تيك توك (TikTok Ads)' : 'تيك توك (TikTok)';
  } else if (igshid || utmSource === 'ig' || utmSource.includes('instagram') || refHost.includes('instagram.com')) {
    const paid = Boolean(fbclid || isPaidMedium);
    source_channel = paid ? 'instagram_ads' : 'instagram';
    source_label = paid ? 'إعلان إنستجرام (Instagram Ads)' : 'إنستجرام (Instagram)';
  } else if (
    fbclid ||
    utmSource === 'fb' ||
    utmSource.includes('facebook') ||
    utmSource.includes('meta') ||
    refHost.includes('facebook.com') ||
    refHost.includes('fb.com')
  ) {
    const paid = Boolean(fbclid || isPaidMedium);
    source_channel = paid ? 'facebook_ads' : 'facebook';
    source_label = paid ? 'إعلان فيسبوك (Facebook Ads)' : 'فيسبوك (Facebook)';
  } else if (utmSource === 'google' || refHost.includes('google.')) {
    source_channel = 'google_search';
    source_label = 'بحث جوجل (Google Search)';
  } else if (
    utmSource.includes('whatsapp') ||
    utmSource === 'wa' ||
    refHost.includes('whatsapp.com') ||
    refHost === 'wa.me'
  ) {
    source_channel = 'whatsapp';
    source_label = 'واتساب (WhatsApp)';
  } else if (utmSource) {
    source_channel = isPaidMedium ? 'paid_campaign' : 'campaign';
    source_label = `حملة: ${utmSource}`;
  } else if (isExternalRef) {
    source_channel = 'referral';
    source_label = `إحالة من ${refHost}`;
  }

  const landingPath = input.pathname || '/';
  return {
    source_channel,
    source_label,
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    referrer: isExternalRef ? rawReferrer.slice(0, 300) : '',
    device_type: detectDeviceType(input.userAgent),
    landing_path: landingPath.slice(0, 300),
    last_path: landingPath.slice(0, 300)
  };
}

export function getOrCaptureVisitorAttribution(): VisitorAttribution {
  const detected = detectVisitorAttribution(
    typeof window !== 'undefined'
      ? {
          search: window.location.search,
          referrer: typeof document !== 'undefined' ? document.referrer : '',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          pathname: `${window.location.pathname}${window.location.search}`,
          currentHost: window.location.hostname
        }
      : {}
  );

  if (typeof window === 'undefined') return detected;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as VisitorAttribution;
      if (detected.source_channel === 'direct' && saved?.source_channel && saved.source_channel !== 'direct') {
        const merged: VisitorAttribution = {
          ...saved,
          device_type: detected.device_type || saved.device_type,
          last_path: detected.last_path || saved.last_path
        };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(detected));
  } catch {}
  return detected;
}
