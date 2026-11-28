import qrcode from 'qrcode-generator';
import type { Order, StoreSettings } from '../types';
import { formatDeliveryAddress } from './deliveryAddress';

export interface ElectronicInvoiceData {
  invoiceNumber: string;
  orderNumber: string;
  issuedAt: string;
  issuedIso: string;
  sellerName: string;
  sellerAddress: string;
  sellerPhone: string;
  commercialRegister: string;
  taxId: string;
  buyerName: string;
  buyerPhone: string;
  buyerAddress: string;
  paymentMethodLabel: string;
  paymentStatusLabel: string;
  items: {
    name: string;
    variant: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  shippingFee: number;
  vatRate: number;
  vatAmount: number;
  preVatSubtotal: number;
  total: number;
  qrPayload: string;
  qrDataUri: string;
}

function escapeHtml(raw: unknown): string {
  return String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generateQrDataUri(payload: string): string {
  try {
    const factory: any = (qrcode as any)?.default || qrcode;
    const qr = factory(0, 'M');
    qr.addData(payload);
    qr.make();
    const svgTag: string = qr.createSvgTag({ cellSize: 4, margin: 1 });
    return `data:image/svg+xml;utf8,${encodeURIComponent(svgTag)}`;
  } catch {
    return '';
  }
}

export function buildElectronicInvoiceData(
  order: Order,
  settings: Partial<StoreSettings>
): ElectronicInvoiceData {
  const invoiceNumber = order.invoice_number || `INV-${order.order_number}`;
  const issuedIso = order.created_at || new Date().toISOString();
  const issuedAt = new Date(issuedIso).toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const sellerName = settings.store_name_ar || 'جو ستور - JOE Store';
  const sellerAddress = settings.store_address_ar || 'المنصورة، الدقهلية، مصر';
  const sellerPhone = settings.store_phone || '01554826209';
  const commercialRegister = String(settings.commercial_register || '').trim() || 'قيد التحديث';
  const taxId = String(settings.tax_id || '').trim() || 'قيد التحديث';

  const vatRateRaw = Number(settings.vat_rate || 0);
  const vatRate = Number.isFinite(vatRateRaw) && vatRateRaw > 0 && vatRateRaw <= 25 ? vatRateRaw : 0;

  const subtotal = Number(order.subtotal || 0);
  const discount = Number(order.discount || 0);
  const shippingFee = Number(order.shipping_fee || 0);
  const total = Number(order.total || Math.max(0, subtotal - discount + shippingFee));

  // Egyptian simplified e-invoice breakdown: net prices include VAT when store registers VAT rate > 0
  const taxableBase = Math.max(0, subtotal - discount);
  const vatAmount = vatRate > 0 ? Math.round((taxableBase * vatRate) / (100 + vatRate)) : 0;
  const preVatSubtotal = Math.max(0, taxableBase - vatAmount);

  const paymentMethodLabel =
    order.payment_method === 'cod'
      ? 'الدفع عند الاستلام (COD)'
      : order.payment_method === 'instapay'
        ? 'إنستاباي (InstaPay)'
        : order.payment_method === 'vodafone_cash'
          ? 'فودافون كاش'
          : 'بطاقة بنكية أونلاين';

  const paymentStatusLabel =
    order.payment_status === 'paid' || order.payment_status === 'verified'
      ? 'مدفوعة / موثقة'
      : 'مستحقة عند الاستلام';

  const qrPayload = [
    `STORE:${sellerName}`,
    `INV:${invoiceNumber}`,
    `ORD:${order.order_number}`,
    `CR:${commercialRegister}`,
    `TAX:${taxId}`,
    `TOTAL:${total.toFixed(2)} EGP`,
    `VAT:${vatAmount.toFixed(2)}`,
    `DATE:${issuedIso}`,
  ].join('|');

  return {
    invoiceNumber,
    orderNumber: order.order_number,
    issuedAt,
    issuedIso,
    sellerName,
    sellerAddress,
    sellerPhone,
    commercialRegister,
    taxId,
    buyerName: order.customer_name || 'عميل جو ستور',
    buyerPhone: order.customer_phone || '',
    buyerAddress:
      formatDeliveryAddress(order) || [order.governorate, order.city].filter(Boolean).join(' - '),
    paymentMethodLabel,
    paymentStatusLabel,
    items: (order.items || []).map((item) => {
      const unitPrice = Number(item.product?.price || 0);
      const quantity = Math.max(1, Number(item.quantity || 1));
      const variant = [
        item.selected_storage || item.product?.storage,
        item.selected_color || item.product?.color_ar,
      ]
        .filter(Boolean)
        .join(' • ');
      return {
        name: item.product?.name_ar || item.product?.name_en || 'منتج',
        variant,
        quantity,
        unitPrice,
        lineTotal: unitPrice * quantity,
      };
    }),
    subtotal,
    discount,
    couponCode: order.coupon_code,
    shippingFee,
    vatRate,
    vatAmount,
    preVatSubtotal,
    total,
    qrPayload,
    qrDataUri: generateQrDataUri(qrPayload),
  };
}

export function printElectronicInvoice(inv: ElectronicInvoiceData): boolean {
  if (typeof window === 'undefined') return false;
  const printWin = window.open('', '_blank', 'width=860,height=920');
  if (!printWin) return false;

  const rowsHtml = inv.items
    .map(
      (item, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${escapeHtml(item.name)}</strong>${
          item.variant ? `<div class="sub">${escapeHtml(item.variant)}</div>` : ''
        }</td>
        <td>${item.quantity}</td>
        <td>${item.unitPrice.toLocaleString('en-US')} ج.م</td>
        <td><strong>${item.lineTotal.toLocaleString('en-US')} ج.م</strong></td>
      </tr>`
    )
    .join('');

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>فاتورة إلكترونية ${escapeHtml(inv.invoiceNumber)}</title>
<style>
  * { box-sizing: border-box; font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; }
  body { margin: 0; padding: 24px; color: #0f172a; background: #fff; }
  .sheet { max-width: 780px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 14px; padding: 24px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 2px solid #f59e0b; padding-bottom: 16px; }
  h1 { margin: 0 0 6px; font-size: 22px; }
  .meta { font-size: 12px; color: #475569; line-height: 1.7; }
  .qr { width: 112px; height: 112px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 4px; background: #fff; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; }
  .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; font-size: 12px; line-height: 1.7; }
  table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 12px; }
  th, td { border-bottom: 1px solid #e2e8f0; padding: 9px 8px; text-align: right; }
  th { background: #f1f5f9; font-weight: 800; }
  .sub { font-size: 11px; color: #64748b; }
  .totals { width: 320px; margin-right: auto; font-size: 13px; }
  .totals div { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dashed #e2e8f0; }
  .totals .grand { font-size: 16px; font-weight: 900; border-top: 2px solid #0f172a; border-bottom: none; padding-top: 8px; }
  .foot { margin-top: 18px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; display: flex; justify-content: space-between; }
  @media print { body { padding: 0; } .sheet { border: none; } }
</style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div>
        <h1>فاتورة إلكترونية — ${escapeHtml(inv.sellerName)}</h1>
        <div class="meta">
          <div>رقم الفاتورة: <strong>${escapeHtml(inv.invoiceNumber)}</strong> | رقم الطلب: <strong>#${escapeHtml(inv.orderNumber)}</strong></div>
          <div>تاريخ الإصدار: ${escapeHtml(inv.issuedAt)}</div>
          <div>السجل التجاري: <strong>${escapeHtml(inv.commercialRegister)}</strong> | الرقم الضريبي: <strong>${escapeHtml(inv.taxId)}</strong></div>
          <div>العنوان: ${escapeHtml(inv.sellerAddress)} | هاتف: ${escapeHtml(inv.sellerPhone)}</div>
        </div>
      </div>
      ${inv.qrDataUri ? `<img class="qr" src="${escapeHtml(inv.qrDataUri)}" alt="QR الفاتورة" />` : ''}
    </div>

    <div class="grid">
      <div class="box">
        <strong>بيانات العميل:</strong><br/>
        الاسم: ${escapeHtml(inv.buyerName)}<br/>
        الهاتف: ${escapeHtml(inv.buyerPhone)}<br/>
        العنوان: ${escapeHtml(inv.buyerAddress)}
      </div>
      <div class="box">
        <strong>بيانات الدفع:</strong><br/>
        الطريقة: ${escapeHtml(inv.paymentMethodLabel)}<br/>
        الحالة: ${escapeHtml(inv.paymentStatusLabel)}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>المنتج والمواصفات</th>
          <th>الكمية</th>
          <th>سعر الوحدة</th>
          <th>الإجمالي</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    <div class="totals">
      <div><span>المجموع الفرعي:</span><span>${inv.subtotal.toLocaleString('en-US')} ج.م</span></div>
      ${inv.discount > 0 ? `<div><span>الخصم ${inv.couponCode ? `(${escapeHtml(inv.couponCode)})` : ''}:</span><span>-${inv.discount.toLocaleString('en-US')} ج.م</span></div>` : ''}
      ${inv.vatRate > 0 ? `<div><span>الصافي قبل الضريبة:</span><span>${inv.preVatSubtotal.toLocaleString('en-US')} ج.م</span></div><div><span>ضريبة القيمة المضافة (${inv.vatRate}%):</span><span>${inv.vatAmount.toLocaleString('en-US')} ج.م</span></div>` : ''}
      <div><span>رسوم الشحن:</span><span>${inv.shippingFee === 0 ? 'مجاني' : `${inv.shippingFee.toLocaleString('en-US')} ج.م`}</span></div>
      <div class="grand"><span>الإجمالي النهائي:</span><span>${inv.total.toLocaleString('en-US')} ج.م</span></div>
    </div>

    <div class="foot">
      <span>فاتورة إلكترونية صادرة آلياً عبر نظام JOE Store</span>
      <span>صالحة للمراجعة والضمان عند تقديمها</span>
    </div>
  </div>
  <script>window.onload = function () { setTimeout(function () { window.print(); }, 180); };</script>
</body>
</html>`;

  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();
  return true;
}
