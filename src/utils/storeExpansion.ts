import type { Product, Order } from '../types';
import { normalizePhone } from './deliveryAddress';

export function orderBelongsToAccount(order: Pick<Order, 'customer_email' | 'customer_phone'>, account: { email?: string; phone?: string }) {
  const email = order.customer_email?.trim().toLowerCase();
  if (email) return !!account.email && email === account.email.trim().toLowerCase();
  const phone = normalizePhone(account.phone || '');
  return phone.length === 11 && phone === normalizePhone(order.customer_phone || '');
}

export function pageWindow(page: number, total: number): (number | '…')[] {
  if (total < 1) return [];
  const current = Math.max(1, Math.min(total, Math.floor(page) || 1));
  const pages = new Set([1, total, current - 1, current, current + 1]);
  if (current <= 3) [2, 3, 4].forEach(p => pages.add(p));
  if (current >= total - 2) [total - 1, total - 2, total - 3].forEach(p => pages.add(p));
  const result: (number | '…')[] = [];
  [...pages].filter(p => p > 0 && p <= total).sort((a, b) => a - b).forEach(p => {
    const last = result[result.length - 1];
    if (typeof last === 'number' && p - last === 2) result.push(last + 1);
    else if (typeof last === 'number' && p - last > 2) result.push('…');
    result.push(p);
  });
  return result;
}
export function pageSlice<T>(rows: T[], requested: number, size: number) {
  const pageSize = Math.max(1, Math.min(100, Math.floor(size) || 36));
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.max(1, Math.min(pages, Math.floor(requested) || 1));
  return { page, pages, from: rows.length ? (page - 1) * pageSize + 1 : 0, to: Math.min(page * pageSize, rows.length), rows: rows.slice((page - 1) * pageSize, page * pageSize) };
}
export const normalizeFinderText = (text: string) => text.normalize('NFKC').toLowerCase().replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
  .replace(/([\u0600-\u06ff])([a-z0-9])/g, '$1 $2').replace(/([a-z0-9])([\u0600-\u06ff])/g, '$1 $2')
  .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ').trim();
export function matchesFinder(text: string, query: string) {
  const haystack = normalizeFinderText(text);
  return normalizeFinderText(query).split(/\s+/).filter(Boolean).every(term => haystack.includes(term));
}
export function pricingEstimate(cost: number, fixedFees: number, paymentPercent: number, targetMargin: number) {
  if (![cost, fixedFees, paymentPercent, targetMargin].every(Number.isFinite) || cost < 0 || fixedFees < 0 || paymentPercent < 0 || targetMargin < 0 || paymentPercent + targetMargin >= 100) return null;
  const sale = (cost + fixedFees) / (1 - (paymentPercent + targetMargin) / 100);
  return { sale, paymentFee: sale * paymentPercent / 100, profit: sale - cost - fixedFees - sale * paymentPercent / 100 };
}
export function deliveredAnalytics(orders: Order[], from = '', to = '') {
  const rows = orders.filter(o => {
    const day = new Date(o.created_at).toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
    return (!from || day >= from) && (!to || day <= to);
  });
  const delivered = rows.filter(o => o.order_status === 'delivered');
  return { rows, delivered, cancelled: rows.filter(o => o.order_status === 'cancelled').length,
    revenue: delivered.reduce((n, o) => n + Math.round(o.total * 100), 0) / 100, shipping: delivered.reduce((n, o) => n + Math.round(o.shipping_fee * 100), 0) / 100,
    pending: rows.filter(o => !['delivered', 'cancelled'].includes(o.order_status)).length };
}
export function downloadableCsv(headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => { let s = String(v ?? ''); if (typeof v === 'string' && /^[\s\uFEFF]*[=+@-]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
  return '\uFEFF' + [headers, ...rows].map(row => row.map(escape).join(',')).join('\r\n');
}
export function downloadCsv(name: string, headers: string[], rows: (string | number)[][]) {
  const url = URL.createObjectURL(new Blob([downloadableCsv(headers, rows)], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = `${name}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export function priceLabelDocument(products: Product[], storeName: string) {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>بطاقات أسعار جو ستور</title><style>@page{size:A4;margin:12mm}body{font:14px Arial;color:#111}main{display:grid;grid-template-columns:repeat(3,1fr);gap:8mm}article{border:1px dashed #888;padding:8mm 4mm;text-align:center;break-inside:avoid}h2{font-size:15px;min-height:40px}strong{font-size:25px}small{display:block;margin-top:10px}button{padding:12px;margin:15px}@media print{button{display:none}}</style></head><body><button onclick="window.print()">طباعة البطاقات</button><main>${products.map(p => `<article><small>${escapeHtml(storeName)}</small><h2>${escapeHtml(p.name_ar)}</h2><strong>${p.price > 0 ? escapeHtml(p.price.toLocaleString('ar-EG')) + ' ج.م' : 'اسأل عن السعر'}</strong><small>${escapeHtml(p.sku || p.id)}</small></article>`).join('')}</main></body></html>`;
}
