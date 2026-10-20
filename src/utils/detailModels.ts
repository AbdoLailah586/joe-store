import type { Order, Product } from "../types";
import type { DetailRow, DetailSpec } from "../components/DetailsDialog";
import { formatDeliveryAddress } from "./deliveryAddress";
import { priceLabel, productNotice, publicSpecs } from "./amazonEnricher";
import {
  recordedStock,
  hasCostPrice,
  hasSellingPrice,
  hasImage,
  needsReview,
} from "./inventoryReports";

export const orderStatusNames: Record<string, string> = {
  pending: "قيد المراجعة",
  confirmed: "مؤكد",
  processing: "قيد التجهيز",
  shipped: "تم الشحن",
  out_for_delivery: "خرج للتوصيل",
  delivered: "تم التسليم",
  cancelled: "ملغى",
};
export const paymentStatusNames: Record<string, string> = {
  unpaid: "غير مدفوع",
  paid: "مسجل كمدفوع",
  verified: "مؤكد من المحل",
};
export const paymentMethodNames: Record<string, string> = {
  cod: "عند الاستلام",
  instapay: "إنستاباي",
  vodafone_cash: "فودافون كاش",
  credit_card: "بطاقة",
};
type FormatPrice = (value: number) => string;

export function inventoryMetricProducts(
  rows: Product[],
  index: number,
): Product[] {
  return rows.filter((p) =>
    index === 1
      ? (recordedStock(p) ?? 0) > 0
      : index === 2
        ? recordedStock(p) === 0
        : index === 3
          ? needsReview(p)
          : index === 4
            ? (recordedStock(p) ?? 0) > 0 && hasCostPrice(p)
            : index === 5
              ? (recordedStock(p) ?? 0) > 0 && hasSellingPrice(p)
              : index === 6
                ? !hasSellingPrice(p)
                : index === 7
                  ? !hasImage(p)
                  : true,
  );
}

export function analyticsMetricOrders(rows: Order[], index: number): Order[] {
  return rows.filter((o) =>
    index === 1 || index >= 4
      ? o.order_status === "delivered"
      : index === 2
        ? o.order_status === "cancelled"
        : index === 3
          ? !["delivered", "cancelled"].includes(o.order_status)
          : true,
  );
}

export function orderDetail(
  order: Order,
  formatPrice: FormatPrice,
  onProduct?: (product: Product) => void,
): DetailSpec {
  return {
    title: `الطلب #${order.order_number}`,
    description:
      "تفاصيل هذا الطلب كما هي مسجلة. عرض البيانات لا يغيّر حالة الطلب أو الدفع.",
    facts: [
      {
        label: "حالة الطلب",
        value: orderStatusNames[order.order_status] || order.order_status,
      },
      {
        label: "حالة الدفع",
        value: paymentStatusNames[order.payment_status] || order.payment_status,
      },
      {
        label: "طريقة الدفع",
        value: paymentMethodNames[order.payment_method] || order.payment_method,
      },
      {
        label: "تاريخ الطلب",
        value: new Date(order.created_at).toLocaleString("ar-EG"),
      },
      { label: "العميل", value: order.customer_name },
      {
        label: "عنوان التوصيل",
        value:
          formatDeliveryAddress(order) ||
          [order.governorate, order.city].filter(Boolean).join(" - "),
      },
      { label: "قيمة المنتجات", value: formatPrice(order.subtotal) },
      { label: "الشحن", value: formatPrice(order.shipping_fee) },
      { label: "الخصم المسجل", value: formatPrice(order.discount || 0) },
      { label: "الإجمالي المسجل", value: formatPrice(order.total) },
      ...(order.courier_name
        ? [{ label: "المندوب / شركة الشحن", value: order.courier_name }]
        : []),
      ...(order.tracking_number
        ? [{ label: "رقم التتبع", value: order.tracking_number }]
        : []),
      ...(order.cancellation_reason
        ? [{ label: "سبب الإلغاء", value: order.cancellation_reason }]
        : []),
    ],
    rows: order.items.map((item, i) => ({
      id: `${item.product.id}-${i}`,
      label: item.product.name_ar,
      subtitle: [item.selected_storage, item.selected_color]
        .filter(Boolean)
        .join(" / "),
      value: formatPrice(item.product.price * item.quantity),
      facts: [
        { label: "الكمية", value: item.quantity },
        {
          label: "سعر القطعة المسجل في الطلب",
          value: formatPrice(item.product.price),
        },
      ],
      ...(onProduct ? { onOpen: () => onProduct(item.product) } : {}),
    })),
  };
}

export function orderRows(
  orders: Order[],
  formatPrice: FormatPrice,
  onOrder: (order: Order) => void,
): DetailRow[] {
  return orders.map((order) => ({
    id: order.id,
    label: `#${order.order_number} — ${order.customer_name}`,
    subtitle: `${orderStatusNames[order.order_status] || order.order_status} • ${paymentStatusNames[order.payment_status] || order.payment_status}`,
    value: formatPrice(order.total),
    onOpen: () => onOrder(order),
  }));
}

export function productDetail(
  product: Product,
  language: string,
  formatPrice: FormatPrice,
  admin = false,
): DetailSpec {
  const ar = language === "ar";
  return {
    title: (ar ? product.name_ar : product.name_en) || product.name_ar,
    description:
      [
        ar ? product.description_ar : product.description_en,
        productNotice(product, language),
      ]
        .filter(Boolean)
        .join("\n\n") ||
      (ar
        ? "لا يوجد وصف إضافي مسجل لهذا المنتج."
        : "No further product description is recorded."),
    facts: [
      { label: ar ? "الماركة" : "Brand", value: product.brand || "—" },
      { label: ar ? "الموديل" : "Model", value: product.model_name || "—" },
      {
        label: ar ? "السعر" : "Price",
        value: priceLabel(product, language, formatPrice),
      },
      {
        label: ar ? "التوافر" : "Availability",
        value:
          product.in_stock !== false && product.stock > 0
            ? ar
              ? "متوفر"
              : "In stock"
            : ar
              ? "غير متوفر"
              : "Unavailable",
      },
      {
        label: ar ? "الضمان المسجل" : "Recorded warranty",
        value:
          product.warranty_months > 0
            ? `${product.warranty_months} ${ar ? "شهر" : "months"}`
            : ar
              ? "غير محدد؛ اسأل المحل"
              : "Not specified; ask the store",
      },
      { label: "SKU", value: product.sku || product.id },
      ...(admin
        ? [
            {
              label: "الكمية المسجلة",
              value: recordedStock(product) ?? "غير محددة",
            },
            {
              label: "حالة الظهور",
              value: product.is_active === false ? "مخفي" : "معروض",
            },
            {
              label: "تكلفة القطعة",
              value:
                product.cost_price > 0
                  ? formatPrice(product.cost_price)
                  : "غير محددة",
            },
          ]
        : []),
      ...Object.entries(publicSpecs(product.specs)).map(([label, value]) => ({
        label,
        value,
      })),
    ],
  };
}

export function productRows(
  products: Product[],
  formatPrice: FormatPrice,
  onProduct: (product: Product) => void,
  admin = false,
): DetailRow[] {
  return products.map((product) => ({
    id: product.id,
    label: product.name_ar,
    subtitle: `${product.sku || product.id} • ${product.brand || "—"}`,
    value: product.price > 0 ? formatPrice(product.price) : "السعر غير محدد",
    ...(admin
      ? {
          facts: [
            {
              label: "الكمية المسجلة",
              value: recordedStock(product) ?? "غير محددة",
            },
          ],
        }
      : {}),
    onOpen: () => onProduct(product),
  }));
}
