import { egyptianGovernorates, findAddressGovernorate } from '../src/data/governorates.js';
import { normalizePhone } from '../src/utils/deliveryAddress.js';

export interface ServerOrderCalculation {
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  couponCode?: string;
}

/**
 * Validates uploaded data-URLs or external HTTPS URLs for payment receipts / review images.
 * Rejects SVG/HTML data URLs to prevent stored XSS and enforces explicit size ceilings.
 */
export function sanitizeUploadedImage(raw: unknown, maxBytes = 1_500_000): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith('data:')) {
    const match = /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=\s]+)$/i.exec(trimmed);
    if (!match) return undefined;
    const base64Length = match[2].replace(/\s+/g, '').length;
    const approxBytes = Math.floor((base64Length * 3) / 4);
    if (approxBytes <= 0 || approxBytes > maxBytes) return undefined;
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' && trimmed.length <= 1000) return parsed.toString();
  } catch {}
  return undefined;
}

/**
 * Computes expected shipping fee server-side from settings + Egypt governorate table.
 */
export function calculateServerShippingFee(params: {
  subtotal: number;
  governorate?: string;
  city?: string;
  settings?: any;
}): number {
  const s = params.settings && typeof params.settings === 'object' ? params.settings : {};
  const threshold = Number.isFinite(Number(s.free_shipping_threshold))
    ? Number(s.free_shipping_threshold)
    : 2500;
  if (threshold > 0 && params.subtotal >= threshold) return 0;

  const baseDefault = Number.isFinite(Number(s.shipping_fee_default))
    ? Number(s.shipping_fee_default)
    : 35;

  const govInput = String(params.governorate || '').trim();
  const cityInput = String(params.city || '').trim();
  if (!govInput && !cityInput) {
    return Math.max(0, baseDefault);
  }

  const matchedGov =
    egyptianGovernorates.find(
      g => g.id === govInput || g.name_ar === govInput || g.name_en.toLowerCase() === govInput.toLowerCase()
    ) || findAddressGovernorate(govInput, cityInput);

  const rates = Array.isArray(s.custom_shipping_rates) ? s.custom_shipping_rates : [];
  if (rates.length > 0 && matchedGov) {
    if (cityInput) {
      const cityRate = rates.find(
        (r: any) => r.governorate_id === matchedGov.id && r.city_name === cityInput && r.is_active !== false
      );
      if (cityRate && Number.isFinite(Number(cityRate.shipping_fee))) {
        return Math.max(0, Number(cityRate.shipping_fee));
      }
    }
    const govRate = rates.find(
      (r: any) => r.governorate_id === matchedGov.id && (!r.city_name || r.city_name === '*') && r.is_active !== false
    );
    if (govRate && Number.isFinite(Number(govRate.shipping_fee))) {
      return Math.max(0, Number(govRate.shipping_fee));
    }
  }

  const tariff = matchedGov?.shipping_fee ?? baseDefault;
  return Math.max(0, Number(tariff));
}

/**
 * Validates and calculates coupon discount server-side so client payloads cannot spoof discount amounts.
 */
export function validateAndComputeCouponDiscount(params: {
  subtotal: number;
  couponCode?: string;
  clientDiscount?: number;
  settings?: any;
  userId?: string;
  userEmail?: string;
  phone?: string;
}): { discount: number; couponCode?: string; error?: string } {
  const rawCode = String(params.couponCode || '').trim().toUpperCase();
  const clientDiscount = Number(params.clientDiscount || 0);

  if (!rawCode) {
    if (clientDiscount > 0.01) {
      return { discount: 0, error: 'لا يمكن تطبيق خصم بدون كود خصم صالح ومعتمد.' };
    }
    return { discount: 0 };
  }

  const coupons = Array.isArray(params.settings?.coupons) ? params.settings.coupons : [];
  const coupon = coupons.find((c: any) => String(c?.code || '').trim().toUpperCase() === rawCode && c?.is_active !== false);
  if (!coupon) {
    return { discount: 0, error: 'كود الخصم غير صحيح أو منتهي الصلاحية.' };
  }

  if (coupon.expires_at) {
    const expMs = Date.parse(coupon.expires_at);
    if (Number.isFinite(expMs) && Date.now() > expMs) {
      return { discount: 0, error: 'انتهت صلاحية كود الخصم.' };
    }
  }

  if (coupon.min_order_amount && params.subtotal < Number(coupon.min_order_amount)) {
    return { discount: 0, error: `الحد الأدنى لاستخدام الكود هو ${coupon.min_order_amount} ج.م.` };
  }

  const cleanPhone = normalizePhone(String(params.phone || ''));
  const usedBy: string[] = Array.isArray(coupon.used_by) ? coupon.used_by : [];
  const alreadyUsed = usedBy.some(entry => {
    const val = String(entry || '').trim();
    if (!val) return false;
    return Boolean(
      (params.userId && val === params.userId) ||
        (params.userEmail && val.toLowerCase() === params.userEmail.toLowerCase()) ||
        (cleanPhone && val === cleanPhone)
    );
  });
  if (alreadyUsed) {
    return { discount: 0, error: 'لقد استخدمت كود الخصم هذا مسبقاً.' };
  }

  let disc = 0;
  if (coupon.discount_type === 'percentage') {
    disc = (params.subtotal * Number(coupon.discount_value || 0)) / 100;
    if (coupon.max_discount_amount && Number(coupon.max_discount_amount) > 0) {
      disc = Math.min(disc, Number(coupon.max_discount_amount));
    }
  } else {
    disc = Math.min(params.subtotal, Number(coupon.discount_value || 0));
  }
  const rounded = Math.max(0, Math.min(params.subtotal, Math.round(disc)));
  return { discount: rounded, couponCode: coupon.code };
}
