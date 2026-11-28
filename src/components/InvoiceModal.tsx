import React, { useEffect, useMemo } from 'react';
import { X, Printer, FileText, ShieldCheck } from 'lucide-react';
import type { Order, StoreSettings } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { buildElectronicInvoiceData, printElectronicInvoice } from '../utils/invoiceGenerator';

interface InvoiceModalProps {
  order: Order | null;
  settings: Partial<StoreSettings>;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, settings, onClose }) => {
  const { formatPrice } = useLanguage();

  useEffect(() => {
    if (!order) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [order, onClose]);

  const invoice = useMemo(() => {
    if (!order) return null;
    return buildElectronicInvoiceData(order, settings);
  }, [order, settings]);

  if (!order || !invoice) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto p-4 flex items-center justify-center font-cairo"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`فاتورة إلكترونية ${invoice.invoiceNumber}`}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100"
      >
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-sm sm:text-base">فاتورة إلكترونية معتمدة</h2>
              <p className="text-[11px] text-slate-500 font-mono" dir="ltr">
                {invoice.invoiceNumber} • #{invoice.orderNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => printElectronicInvoice(invoice)}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs inline-flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة / حفظ PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق الفاتورة"
              className="p-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:text-slate-900"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto text-xs">
          <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
            <div className="space-y-1 text-slate-600 dark:text-slate-300">
              <p className="text-sm font-black text-slate-900 dark:text-white">{invoice.sellerName}</p>
              <p>تاريخ الإصدار: {invoice.issuedAt}</p>
              <p>
                السجل التجاري: <strong className="font-mono text-slate-900 dark:text-white">{invoice.commercialRegister}</strong>
                {' • '}
                الرقم الضريبي: <strong className="font-mono text-slate-900 dark:text-white">{invoice.taxId}</strong>
              </p>
              <p>{invoice.sellerAddress} — هاتف: {invoice.sellerPhone}</p>
            </div>
            {invoice.qrDataUri && (
              <div className="shrink-0 flex flex-col items-center gap-1">
                <img
                  src={invoice.qrDataUri}
                  alt="رمز التحقق السريع QR"
                  className="w-24 h-24 rounded-xl border border-slate-200 bg-white p-1"
                />
                <span className="text-[10px] text-slate-500">QR تحقق رقمي</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">بيانات العميل</p>
              <p>{invoice.buyerName}</p>
              <p dir="ltr" className="text-end font-mono">{invoice.buyerPhone}</p>
              <p className="text-slate-600 dark:text-slate-300">{invoice.buyerAddress}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">حالة السداد</p>
              <p>{invoice.paymentMethodLabel}</p>
              <p className="font-bold text-emerald-700 dark:text-emerald-400">{invoice.paymentStatusLabel}</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-right">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                <tr>
                  <th className="p-2.5">#</th>
                  <th className="p-2.5">المنتج</th>
                  <th className="p-2.5">الكمية</th>
                  <th className="p-2.5">سعر الوحدة</th>
                  <th className="p-2.5">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {invoice.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-2.5 font-mono">{idx + 1}</td>
                    <td className="p-2.5">
                      <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                      {item.variant && <p className="text-[11px] text-slate-500">{item.variant}</p>}
                    </td>
                    <td className="p-2.5 font-mono">{item.quantity}</td>
                    <td className="p-2.5 font-outfit">{formatPrice(item.unitPrice)}</td>
                    <td className="p-2.5 font-outfit font-bold">{formatPrice(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sm:w-72 sm:mr-auto p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-300">المجموع الفرعي:</span>
              <span className="font-outfit font-semibold">{formatPrice(invoice.subtotal)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
                <span>الخصم {invoice.couponCode ? `(${invoice.couponCode})` : ''}:</span>
                <span className="font-outfit">-{formatPrice(invoice.discount)}</span>
              </div>
            )}
            {invoice.vatRate > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-300">الصافي قبل الضريبة:</span>
                  <span className="font-outfit">{formatPrice(invoice.preVatSubtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-300">ضريبة القيمة المضافة ({invoice.vatRate}%):</span>
                  <span className="font-outfit">{formatPrice(invoice.vatAmount)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-300">الشحن والتوصيل:</span>
              <span className="font-outfit">{invoice.shippingFee === 0 ? 'مجاني' : formatPrice(invoice.shippingFee)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-sm font-black">
              <span>الإجمالي النهائي:</span>
              <span className="font-outfit text-amber-700 dark:text-amber-400">{formatPrice(invoice.total)}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>هذه الفاتورة الإلكترونية موثقة رقمياً وتُستخدم لمراجعة الضمان أو الاستبدال.</span>
          </p>
        </div>
      </div>
    </div>
  );
};
