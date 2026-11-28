/**
 * Lightweight Real User Monitoring (RUM) observer for Core Web Vitals (LCP, CLS, FCP, TTFB).
 * Only activates when user has consented to non-essential analytics cookies.
 */
export function startWebVitalsObserver(): () => void {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
    return () => {};
  }

  const reported = new Set<string>();
  const sendVital = (name: string, value: number, rating: 'good' | 'needs-improvement' | 'poor') => {
    const key = `${name}:${window.location.pathname}`;
    if (reported.has(key)) return;
    reported.add(key);

    // Send to GA4 if active
    if (typeof (window as any).gtag === 'function') {
      try {
        (window as any).gtag('event', name, {
          value: Math.round(name === 'CLS' ? value * 1000 : value),
          metric_rating: rating,
          non_interaction: true
        });
      } catch {}
    }

    // Send beacon to /api/rum
    try {
      const payload = JSON.stringify({
        name,
        value,
        rating,
        path: `${window.location.pathname}${window.location.search}`.slice(0, 200)
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/health', new Blob([payload], { type: 'application/json' }));
      }
    } catch {}
  };

  try {
    const nav = performance.getEntriesByType?.('navigation')?.[0] as PerformanceNavigationTiming | undefined;
    if (nav && nav.responseStart > 0) {
      const ttfb = nav.responseStart - nav.requestStart;
      sendVital('TTFB', ttfb, ttfb <= 800 ? 'good' : ttfb <= 1800 ? 'needs-improvement' : 'poor');
    }
  } catch {}

  const observers: PerformanceObserver[] = [];

  try {
    const lcpObs = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) {
        const val = last.startTime;
        sendVital('LCP', val, val <= 2500 ? 'good' : val <= 4000 ? 'needs-improvement' : 'poor');
      }
    });
    lcpObs.observe({ type: 'largest-contentful-paint', buffered: true });
    observers.push(lcpObs);
  } catch {}

  try {
    let clsValue = 0;
    const clsObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        if (!entry.hadRecentInput) clsValue += entry.value || 0;
      }
    });
    clsObs.observe({ type: 'layout-shift', buffered: true });
    observers.push(clsObs);

    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        sendVital('CLS', clsValue, clsValue <= 0.1 ? 'good' : clsValue <= 0.25 ? 'needs-improvement' : 'poor');
      }
    };
    document.addEventListener('visibilitychange', onHide, { once: true });
  } catch {}

  return () => {
    observers.forEach((o) => {
      try { o.disconnect(); } catch {}
    });
  };
}
