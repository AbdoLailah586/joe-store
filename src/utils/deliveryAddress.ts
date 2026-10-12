import type { DeliveryAddressFields, Order } from '../types';

const fields = ['address_type', 'district', 'street', 'building_no', 'floor_no', 'apartment_no', 'landmark', 'postal_code', 'delivery_instructions', 'extra_details', 'google_maps_url'] as const;
export function pickDeliveryFields(value: unknown): DeliveryAddressFields {
  if (!value || typeof value !== 'object') return {};
  const result: Record<string, string> = {};
  for (const key of fields) {
    const text = (value as Record<string, unknown>)[key];
    if (typeof text === 'string' && text.trim()) result[key] = text.trim();
  }
  return result as DeliveryAddressFields;
}
export function normalizeDigits(value: string) {
  return value.replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
}
export function normalizePhone(value: string) {
  const phone = normalizeDigits(value).replace(/[\s()-]/g, '');
  if (phone.startsWith('+20')) return '0' + phone.slice(3);
  if (phone.startsWith('0020')) return '0' + phone.slice(4);
  if (/^20\d{10}$/.test(phone)) return '0' + phone.slice(2);
  return phone;
}
export function isEgyptianPhone(value: string) {
  return /^0(?:1[0125]\d{8}|[2-9]\d{7,9})$/.test(normalizePhone(value));
}
export function isGoogleMapsUrl(value: string) {
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    if (url.hostname === 'maps.app.goo.gl' || url.hostname === 'maps.google.com') return true;
    if (url.hostname === 'goo.gl') return url.pathname.startsWith('/maps');
    return ['google.com', 'www.google.com'].includes(url.hostname) && url.pathname.startsWith('/maps');
  } catch { return false; }
}
export function buildAddressDetails(value: DeliveryAddressFields, extra = '') {
  return [value.district, value.street, extra].map(part => part?.trim()).filter(Boolean).join('، ');
}
export function formatDeliveryAddress(value: DeliveryAddressFields & { governorate?: string; city?: string; address_details?: string; details?: string }, language = 'ar') {
  const ar = language === 'ar';
  return [value.governorate, value.city, value.address_details || value.details || buildAddressDetails(value),
    value.building_no && `${ar ? 'مبنى' : 'Building'}: ${value.building_no}`,
    value.floor_no && `${ar ? 'دور' : 'Floor'}: ${value.floor_no}`,
    value.apartment_no && `${ar ? 'شقة' : 'Apartment'}: ${value.apartment_no}`,
    value.landmark && `${ar ? 'علامة مميزة' : 'Landmark'}: ${value.landmark}`,
    value.postal_code && `${ar ? 'رمز بريدي' : 'Postal code'}: ${value.postal_code}`,
    value.delivery_instructions && `${ar ? 'تعليمات التوصيل' : 'Delivery instructions'}: ${value.delivery_instructions}`
  ].filter(Boolean).join(' • ');
}

// Preserve structured delivery information in the existing notes column. Old
// rows remain plain text; no schema migration or rewriting old orders is needed.
export function encodeDeliveryNotes(order: Order) {
  return JSON.stringify({ __joeDelivery: 1, delivery: {
    ...pickDeliveryFields(order), city: order.city, address_details: order.address_details,
    customer_whatsapp: order.customer_whatsapp, customer_secondary_phone: order.customer_secondary_phone
  }, notes: order.notes || '' });
}
export function decodeDeliveryNotes(raw: unknown): Partial<Order> {
  const original = typeof raw === 'string' ? raw : '';
  try {
    const data = JSON.parse(original);
    if (data?.__joeDelivery !== 1 || !data.delivery || typeof data.delivery !== 'object') return { notes: original || undefined };
    const result: Partial<Order> = pickDeliveryFields(data.delivery);
    for (const key of ['city', 'address_details', 'customer_whatsapp', 'customer_secondary_phone'] as const) {
      if (typeof data.delivery[key] === 'string') result[key] = data.delivery[key];
    }
    result.notes = typeof data.notes === 'string' ? data.notes || undefined : undefined;
    return result;
  } catch { return { notes: original || undefined }; }
}
