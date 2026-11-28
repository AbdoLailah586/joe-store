import React, { useState, useMemo } from 'react';
import { Megaphone, Copy, Check, Link2 } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { buildProductAdUrl, buildStoreAdUrl, type AdPlatformSource } from '../../utils/adLinks';
import { normalizeMetaPixelId } from '../../utils/metaPixel';
import type { StoreSettings } from '../../types';

export const MarketingAdToolsCard: React.FC<{
  settings: StoreSettings;
  updateSettings: (partial: Partial<StoreSettings>) => void;
}> = ({ settings, updateSettings }) => {
  const { products } = useStore();
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://joe-store-2026.vercel.app';

  const [copiedKey, setCopiedKey] = useState('');
  const [adSource, setAdSource] = useState<AdPlatformSource>('facebook');
  const [adCampaign, setAdCampaign] = useState('');
  const [targetType, setTargetType] = useState<'home' | 'catalog' | 'product'>('product');
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');

  const copyText = (key: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(''), 2000);
  };

  const matchingProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    const active = products.filter(p => p.is_active !== false);
    const list = q ? active.filter(p => `${p.name_ar} ${p.name_en} ${p.brand} ${p.id}`.toLowerCase().includes(q)) : active;
    return list.slice(0, 60);
  }, [products, productSearch]);

  const activeId = selectedProductId || matchingProducts[0]?.id || '';
  const generatedAdUrl = useMemo(() => {
    if (targetType === 'product' && activeId) {
      return buildProductAdUrl({ origin, productId: activeId, source: adSource, medium: 'cpc', campaign: adCampaign });
    }
    if (targetType === 'catalog') {
      return buildStoreAdUrl({ origin, path: '/catalog', source: adSource, medium: 'cpc', campaign: adCampaign });
    }
    return buildStoreAdUrl({ origin, path: '/', source: adSource, medium: 'cpc', campaign: adCampaign });
  }, [origin, targetType, activeId, adSource, adCampaign]);

  const csvFeedUrl = `${origin}/meta-feed.csv`;
  const xmlFeedUrl = `${origin}/meta-feed.xml`;
  const pixelRaw = String(settings.meta_pixel_id || '');
  const pixelValid = !pixelRaw.trim() || Boolean(normalizeMetaPixelId(pixelRaw));

  return (
    <div className="space-y-4">
      <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-4 text-xs font-cairo">
        <div className="border-b border-slate-200 pb-3">
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-amber-700" />
            <span>إعدادات Meta Pixel وكتالوج الإعلانات التلقائي (بدون Access Token)</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            أضف رقم Pixel ID (10-20 رقماً) لتفعيل تتبع أحداث المشتريات والسلة، واستخدم روابط الكتالوج لربط منتجات جو ستور بإعلانات Carousel وفيسبوك.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <label className="space-y-1 font-bold text-slate-700">
            <span>رقم Meta Pixel ID</span>
            <input
              type="text"
              dir="ltr"
              data-testid="input-meta-pixel-id"
              value={settings.meta_pixel_id || ''}
              onChange={e => updateSettings({ meta_pixel_id: e.target.value })}
              placeholder="123456789012345"
              className={`w-full px-3 py-2 border rounded-xl bg-slate-50 font-mono ${!pixelValid ? 'border-rose-400' : 'border-slate-200'}`}
            />
            {!pixelValid && <span className="text-[11px] text-rose-600 block">أدخل رقم Pixel صحيح مكون من 10 إلى 20 رقم.</span>}
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer font-bold">
            <input
              type="checkbox"
              checked={settings.meta_pixel_enabled !== false}
              onChange={e => updateSettings({ meta_pixel_enabled: e.target.checked })}
              className="accent-amber-600 w-4 h-4"
            />
            <span>تفعيل أحداث Pixel (PageView · ViewContent · AddToCart · InitiateCheckout · Purchase)</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <label className="space-y-1 font-bold text-slate-700">
            <span>معرّف Google Analytics 4 (Measurement ID)</span>
            <input
              type="text"
              dir="ltr"
              value={settings.ga4_measurement_id || ''}
              onChange={e => updateSettings({ ga4_measurement_id: e.target.value })}
              placeholder="G-XXXXXXXXXX"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-mono"
            />
            <span className="text-[11px] font-normal text-slate-500 block">يفعّل تتبع الزيارات وأحداث التجارة الإلكترونية تلقائياً بعد موافقة العميل على الكوكيز.</span>
          </label>

          <label className="space-y-1 font-bold text-slate-700">
            <span>رمز التحقق من Google Search Console</span>
            <input
              type="text"
              dir="ltr"
              value={settings.gsc_verification_token || ''}
              onChange={e => updateSettings({ gsc_verification_token: e.target.value })}
              placeholder="google-site-verification token or <meta ...>"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-mono"
            />
            <span className="text-[11px] font-normal text-slate-500 block">
              يُحقن تلقائياً داخل الترويسة — رابط خريطة الموقع: <span dir="ltr" className="font-mono text-amber-700">{`${origin}/sitemap.xml`}</span>
            </span>
          </label>

          <label className="sm:col-span-2 space-y-1 font-bold text-slate-700">
            <span>رمز توثيق النطاق في Meta Business (facebook-domain-verification)</span>
            <input
              type="text"
              dir="ltr"
              value={settings.meta_domain_verification_token || ''}
              onChange={e => updateSettings({ meta_domain_verification_token: e.target.value })}
              placeholder="domain verification meta tag content token"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-mono"
            />
            <span className="text-[11px] font-normal text-slate-500 block">يُستخدم عند طلب Meta توثيق ملكية الدومين داخل Business Manager.</span>
          </label>

          <label className="sm:col-span-2 flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 cursor-pointer font-bold text-emerald-950">
            <input
              type="checkbox"
              checked={settings.meta_capi_enabled !== false}
              onChange={e => updateSettings({ meta_capi_enabled: e.target.checked })}
              className="accent-emerald-600 w-4 h-4"
            />
            <span>تفعيل Meta Conversions API (Server-Side Purchase Tracking) — يتطلب ضبط META_CAPI_ACCESS_TOKEN في Vercel Env</span>
          </label>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2.5">
          <p className="font-bold text-slate-900">روابط كتالوج المنتجات التلقائي (CSV / XML):</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-500">Meta Catalog CSV Feed</p>
                <p dir="ltr" className="font-mono text-[11px] text-slate-900 truncate">{csvFeedUrl}</p>
              </div>
              <button
                type="button"
                onClick={() => copyText('csv', csvFeedUrl)}
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-black font-bold shrink-0 flex items-center gap-1"
              >
                {copiedKey === 'csv' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'csv' ? 'تم النسخ' : 'نسخ'}</span>
              </button>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-500">Meta / Google Shopping XML Feed</p>
                <p dir="ltr" className="font-mono text-[11px] text-slate-900 truncate">{xmlFeedUrl}</p>
              </div>
              <button
                type="button"
                onClick={() => copyText('xml', xmlFeedUrl)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold shrink-0 flex items-center gap-1"
              >
                {copiedKey === 'xml' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'xml' ? 'تم النسخ' : 'نسخ'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <p className="font-bold text-slate-900 flex items-center gap-1.5">
            <Link2 className="w-4 h-4 text-amber-700" />
            <span>مولد روابط إعلانات الكاروسيل والسوشيال (UTM + URL Safe)</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <select value={adSource} onChange={e => setAdSource(e.target.value as AdPlatformSource)} className="px-3 py-2 border border-slate-200 rounded-xl bg-white">
              <option value="facebook">Facebook Ads</option>
              <option value="instagram">Instagram Ads</option>
              <option value="tiktok">TikTok Ads</option>
              <option value="google">Google Ads</option>
            </select>
            <select value={targetType} onChange={e => setTargetType(e.target.value as any)} className="px-3 py-2 border border-slate-200 rounded-xl bg-white">
              <option value="product">منتج محدد (Carousel)</option>
              <option value="catalog">صفحة الكتالوج</option>
              <option value="home">الصفحة الرئيسية</option>
            </select>
            <input type="text" value={adCampaign} onChange={e => setAdCampaign(e.target.value)} placeholder="اسم الحملة (اختياري)" className="px-3 py-2 border border-slate-200 rounded-xl bg-white" />
          </div>
          {targetType === 'product' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="ابحث عن منتج بالاسم أو الماركة..." className="px-3 py-2 border border-slate-200 rounded-xl bg-white" />
              <select value={activeId} onChange={e => setSelectedProductId(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl bg-white">
                {matchingProducts.map(p => (
                  <option key={p.id} value={p.id}>{p.name_ar} — {p.price} ج.م</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl p-2.5">
            <p dir="ltr" className="font-mono text-[11px] text-slate-800 truncate">{generatedAdUrl}</p>
            <button type="button" onClick={() => copyText('ad', generatedAdUrl)} className="px-3 py-1.5 rounded-lg bg-amber-500 text-black font-bold shrink-0">
              {copiedKey === 'ad' ? 'تم النسخ ✓' : 'نسخ رابط الإعلان'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
