import type { CartItem, Order, Product, StoreSettings, WhatsAppNotification } from '../types';

// Browser storage can be unavailable, full, or contain data from an older build.
// Persistence is optional; a failed read or write must never prevent rendering.
export const readStorage = (key: string): string | null => {
  try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; }
};

export const writeStorage = (key: string, value: string): boolean => {
  try {
    if (!globalThis.localStorage) return false;
    globalThis.localStorage.setItem(key, value);
    return true;
  } catch { return false; }
};

export const removeStorage = (key: string): boolean => {
  try {
    if (!globalThis.localStorage) return false;
    globalThis.localStorage.removeItem(key);
    return true;
  } catch { return false; }
};

export const writeStoredJson = (key: string, value: unknown): boolean => {
  try { return writeStorage(key, JSON.stringify(value)); } catch { return false; }
};

export const isRecord = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const readStoredJson = <T>(key: string, fallback: T, valid: (value: unknown) => value is T): T => {
  try {
    const saved = readStorage(key);
    if (saved === null) return fallback;
    const value: unknown = JSON.parse(saved);
    return valid(value) ? value : fallback;
  } catch { return fallback; }
};

export const readStoredArray = <T>(key: string, validItem: (value: unknown) => value is T): T[] => {
  const value = readStoredJson<unknown[]>(key, [], Array.isArray);
  // Keep valid entries even if just one old or damaged entry is unusable.
  return value.filter(validItem);
};

const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(item => typeof item === 'string');
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export const isStoredProduct = (value: unknown): value is Product => {
  if (!isRecord(value)) return false;
  return ['id', 'name_ar', 'name_en', 'brand', 'category', 'condition', 'description_ar', 'description_en']
    .every(key => typeof value[key] === 'string')
    && finite(value.price) && finite(value.stock) && strings(value.images)
    && isRecord(value.specs)
    && (value.available_storages === undefined || strings(value.available_storages))
    && (value.about_item === undefined || strings(value.about_item))
    && (value.available_colors === undefined || (Array.isArray(value.available_colors)
      && value.available_colors.every(color => isRecord(color)
        && ['name_ar', 'name_en', 'hex'].every(key => typeof color[key] === 'string'))));
};

export const isStoredCartItem = (value: unknown): value is CartItem =>
  isRecord(value) && isStoredProduct(value.product) && finite(value.quantity) && value.quantity > 0;

export const isStoredOrder = (value: unknown): value is Order =>
  isRecord(value) && ['id', 'order_number', 'customer_name', 'customer_phone', 'order_status', 'created_at']
    .every(key => typeof value[key] === 'string')
  && Array.isArray(value.items) && value.items.every(isStoredCartItem)
  && finite(value.total) && finite(value.subtotal);

export const isStoredNotification = (value: unknown): value is WhatsAppNotification =>
  isRecord(value) && ['id', 'order_id', 'phone', 'type', 'text', 'sent_at', 'status']
    .every(key => typeof value[key] === 'string');

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin';
  provider: 'google' | 'email';
  addresses: any[];
  created_at: string;
  [key: string]: any;
}

export const isStoredUser = (value: unknown): value is StoredUser =>
  isRecord(value) && ['id', 'name', 'email', 'phone', 'created_at'].every(key => typeof value[key] === 'string')
  && (value.role === 'customer' || value.role === 'admin')
  && (value.provider === 'google' || value.provider === 'email')
  && Array.isArray(value.addresses) && value.addresses.every(address => isRecord(address)
    && ['id', 'title', 'governorate', 'city', 'details'].every(key => typeof address[key] === 'string'));

export const readStoredSettings = (defaults: StoreSettings): StoreSettings => {
  const saved = readStoredJson<Record<string, any>>('joe_store_settings', {}, isRecord);
  const merged = { ...defaults };
  for (const [key, value] of Object.entries(saved)) {
    if (key === 'hero_slides') {
      if (Array.isArray(value) && value.every(slide => isRecord(slide)
        && ['id', 'title_ar', 'title_en', 'image', 'cat'].every(field => typeof slide[field] === 'string')
        && Object.values(slide).every(field => typeof field === 'string'))) {
        merged.hero_slides = value;
      }
    } else if (key in defaults ? typeof value === typeof defaults[key] : typeof value === 'string') {
      // Match known default types; optional settings (theme/email fields) are strings.
      (merged as any)[key] = value;
    }
  }
  return merged;
};
