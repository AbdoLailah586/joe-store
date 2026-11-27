import React, { useEffect, useState } from 'react';
import { CreditCard, CheckCircle2, AlertCircle, ShieldCheck, Copy, Check, PlugZap } from 'lucide-react';
import { neonDb } from '../../services/neonDb';
import type { PaymentGatewayMode, PaymentGatewayProvider } from '../../types';

export const PaymentGatewaySettingsCard: React.FC = () => {
  const [provider, setProvider] = useState<PaymentGatewayProvider>('none');
  const [mode, setMode] = useState<PaymentGatewayMode>('test');
  const [merchantId, setMerchantId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [hmacSecret, setHmacSecret] = useState('');
  const [cardIntegrationId, setCardIntegrationId] = useState('');
  const [walletIntegrationId, setWalletIntegrationId] = useState('');
  const [instapayIntegrationId, setInstapayIntegrationId] = useState('');
  const [enableCard, setEnableCard] = useState(true);
  const [enableWallet, setEnableWallet] = useState(false);
  const [enableInstapay, setEnableInstapay] = useState(false);

  const [hasApiKey, setHasApiKey] = useState(false);
  const [hasSecretKey, setHasSecretKey] = useState(false);
  const [hasHmacSecret, setHasHmacSecret] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const loadConfig = async () => {
    try {
      const cfg = await neonDb.getPaymentGatewayAdminConfig();
      if (!cfg) return;
      setProvider(cfg.provider || 'none');
      setMode(cfg.mode || 'test');
      setMerchantId(cfg.merchant_id || '');
      setPublicKey(cfg.public_key || '');
      setCardIntegrationId(cfg.card_integration_id || '');
      setWalletIntegrationId(cfg.wallet_integration_id || '');
      setInstapayIntegrationId(cfg.instapay_integration_id || '');
      setEnableCard(cfg.enable_card !== false);
      setEnableWallet(Boolean(cfg.enable_wallet));
      setEnableInstapay(Boolean(cfg.enable_instapay));
      setHasApiKey(Boolean(cfg.has_api_key));
      setHasSecretKey(Boolean(cfg.has_secret_key));
      setHasHmacSecret(Boolean(cfg.has_hmac_secret));
      setConfigured(Boolean(cfg.configured));
    } catch {}
  };

  useEffect(() => {
    void loadConfig();
  }, []);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://joe-store-2026.vercel.app';
  const webhookUrl = `${origin}/api/payment-callback?provider=${provider === 'paymob' ? 'paymob' : 'kashier'}`;

  const saveConfig = async () => {
    setBusy(true);
    setBanner(null);
    try {
      const res = await neonDb.savePaymentGatewayConfig({
        payment_gateway_provider: provider,
        payment_gateway_mode: mode,
        payment_gateway_merchant_id: merchantId.trim(),
        payment_gateway_api_key: apiKey.trim() || undefined,
        payment_gateway_secret_key: secretKey.trim() || undefined,
        payment_gateway_public_key: publicKey.trim(),
        payment_gateway_hmac_secret: hmacSecret.trim() || undefined,
        payment_gateway_card_integration_id: cardIntegrationId.trim(),
        payment_gateway_wallet_integration_id: walletIntegrationId.trim(),
        payment_gateway_instapay_integration_id: instapayIntegrationId.trim(),
        payment_gateway_enable_card: enableCard,
        payment_gateway_enable_wallet: enableWallet,
        payment_gateway_enable_instapay: enableInstapay
      });
      if (res?.success) {
        setApiKey('');
        setSecretKey('');
        setHmacSecret('');
        setBanner({ ok: true, text: 'تم حفظ إعدادات بوابة الدفع وتحديث حالة طرق الدفع بالمتجر بنجاح.' });
        await loadConfig();
      } else {
        setBanner({ ok: false, text: res?.error || 'تعذر حفظ إعدادات بوابة الدفع.' });
      }
    } finally {
      setBusy(false);
    }
  };

  const runReadinessCheck = async () => {
    setBusy(true);
    setBanner(null);
    try {
      const res = await neonDb.testPaymentGatewayConfig();
      setBanner({
        ok: Boolean(res?.success),
        text: res?.message || res?.error || 'تعذر التحقق من جاهزية البوابة.'
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-4 text-xs font-cairo">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-700" />
            <span>بوابة الدفع الإلكتروني الموحدة (Kashier / Paymob — بطاقات بنكية + محافظ + إنستاباي)</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            أدخل Merchant ID ومفاتيح API الخاصة بكاشير أو باي موب لتفعيل الدفع بالبطاقة البنكية وتحصيل فودافون كاش وإنستاباي تلقائياً.
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full font-bold text-[11px] ${
            configured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}
        >
          {configured ? `مفعّلة (${provider.toUpperCase()} • ${mode === 'live' ? 'فعلي' : 'تجريبي'})` : 'بانتظار مفاتيح التاجر'}
        </span>
      </div>

      {banner && (
        <div
          className={`p-3 rounded-xl font-bold flex items-center gap-2 border ${
            banner.ok ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
        >
          {banner.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{banner.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="space-y-1 font-bold text-slate-700">
          <span>شركة الدفع المتعاقد معها</span>
          <select
            value={provider}
            onChange={e => setProvider(e.target.value as PaymentGatewayProvider)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
          >
            <option value="none">التحويلات اليدوية + الاستلام فقط</option>
            <option value="kashier">كاشير (Kashier.io — البطاقات / المحافظ / إنستاباي)</option>
            <option value="paymob">باي موب (Paymob Accept — Unified Checkout)</option>
          </select>
        </label>

        <label className="space-y-1 font-bold text-slate-700">
          <span>بيئة التشغيل</span>
          <select
            value={mode}
            onChange={e => setMode(e.target.value as PaymentGatewayMode)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
          >
            <option value="test">وضع الاختبار (Test / Sandbox)</option>
            <option value="live">التشغيل الفعلي للعملاء (Live)</option>
          </select>
        </label>

        <label className="space-y-1 font-bold text-slate-700">
          <span>رقم التاجر (Merchant ID)</span>
          <input
            type="text"
            dir="ltr"
            value={merchantId}
            onChange={e => setMerchantId(e.target.value)}
            placeholder="MID-xxxxx"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-mono"
          />
        </label>
      </div>

      {provider === 'kashier' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <label className="space-y-1 font-bold text-slate-700">
            <span>Kashier Payment API Key {hasApiKey ? '(محفوظ ✓)' : ''}</span>
            <input
              type="password"
              dir="ltr"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono"
            />
          </label>
          <label className="space-y-1 font-bold text-slate-700">
            <span>Kashier Secret Key (اختياري) {hasSecretKey ? '(محفوظ ✓)' : ''}</span>
            <input
              type="password"
              dir="ltr"
              value={secretKey}
              onChange={e => setSecretKey(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono"
            />
          </label>
        </div>
      )}

      {provider === 'paymob' && (
        <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="space-y-1 font-bold text-slate-700">
              <span>Paymob Public Key</span>
              <input
                type="text"
                dir="ltr"
                value={publicKey}
                onChange={e => setPublicKey(e.target.value)}
                placeholder="egy_pk_..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono"
              />
            </label>
            <label className="space-y-1 font-bold text-slate-700">
              <span>Secret Key (Token) {hasSecretKey ? '(محفوظ ✓)' : ''}</span>
              <input
                type="password"
                dir="ltr"
                value={secretKey}
                onChange={e => setSecretKey(e.target.value)}
                placeholder="egy_sk_..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono"
              />
            </label>
            <label className="space-y-1 font-bold text-slate-700">
              <span>HMAC Secret {hasHmacSecret ? '(محفوظ ✓)' : ''}</span>
              <input
                type="password"
                dir="ltr"
                value={hmacSecret}
                onChange={e => setHmacSecret(e.target.value)}
                placeholder="HMAC Secret"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono"
              />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="space-y-1 font-bold text-slate-700">
              <span>Card Integration ID (فيزا / ميزة)</span>
              <input
                type="text"
                dir="ltr"
                value={cardIntegrationId}
                onChange={e => setCardIntegrationId(e.target.value)}
                placeholder="4851234"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono"
              />
            </label>
            <label className="space-y-1 font-bold text-slate-700">
              <span>Wallet Integration ID (فودافون كاش)</span>
              <input
                type="text"
                dir="ltr"
                value={walletIntegrationId}
                onChange={e => setWalletIntegrationId(e.target.value)}
                placeholder="4851235"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono"
              />
            </label>
            <label className="space-y-1 font-bold text-slate-700">
              <span>InstaPay Integration ID (اختياري)</span>
              <input
                type="text"
                dir="ltr"
                value={instapayIntegrationId}
                onChange={e => setInstapayIntegrationId(e.target.value)}
                placeholder="4851236"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono"
              />
            </label>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold cursor-pointer">
          <input type="checkbox" checked={enableCard} onChange={e => setEnableCard(e.target.checked)} className="accent-amber-600" />
          <span>تفعيل البطاقات البنكية أونلاين</span>
        </label>
        <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold cursor-pointer">
          <input type="checkbox" checked={enableWallet} onChange={e => setEnableWallet(e.target.checked)} className="accent-amber-600" />
          <span>تحصيل فودافون كاش عبر البوابة</span>
        </label>
        <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold cursor-pointer">
          <input type="checkbox" checked={enableInstapay} onChange={e => setEnableInstapay(e.target.checked)} className="accent-amber-600" />
          <span>تحصيل إنستاباي عبر البوابة</span>
        </label>
      </div>

      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
            <span>رابط Webhook / Callback لإضافته في لوحة {provider === 'paymob' ? 'Paymob' : 'Kashier'}:</span>
          </p>
          <p dir="ltr" className="font-mono text-[11px] text-slate-700 truncate">{webhookUrl}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(webhookUrl).catch(() => {});
            setCopiedWebhook(true);
            window.setTimeout(() => setCopiedWebhook(false), 2000);
          }}
          className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold flex items-center gap-1 shrink-0"
        >
          {copiedWebhook ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedWebhook ? 'تم النسخ' : 'نسخ الرابط'}</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={saveConfig}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold disabled:opacity-50"
        >
          حفظ إعدادات بوابة الدفع
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={runReadinessCheck}
          className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          <PlugZap className="w-3.5 h-3.5 text-amber-700" />
          <span>فحص جاهزية البوابة</span>
        </button>
      </div>
    </div>
  );
};
