import { useDetails } from "./DetailsDialog";
import { useLanguage } from "../context/LanguageContext";
import { useStore } from "../context/StoreContext";
import type { Product } from "../types";
import { productDetail } from "../utils/detailModels";

export function useProductInfo(product: Product) {
  const { openDetails } = useDetails();
  const { language, formatPrice } = useLanguage();
  const { navigate } = useStore();
  const ar = language === "ar";
  const showProductInfo = () =>
    openDetails({
      ...productDetail(product, language, formatPrice),
      actions: [
        {
          label: ar ? "فتح صفحة المنتج" : "Open product page",
          run: () => navigate("product", product.id),
        },
      ],
    });
  const showPrice = () =>
    openDetails({
      title: ar ? "تفاصيل السعر والخصم" : "Price & discount details",
      description: ar
        ? "سعر البيع المسجل لهذا المنتج. مصاريف الشحن تظهر عند اختيار عنوان التوصيل؛ السعر الأصلي والخصم يظهران فقط إذا كانا مسجلين."
        : "The recorded selling price. Delivery charges appear at checkout after choosing a destination. Original prices and discounts are shown only when recorded.",
      facts: [
        {
          label: ar ? "المنتج" : "Product",
          value: ar ? product.name_ar : product.name_en,
        },
        {
          label: ar ? "سعر البيع" : "Price",
          value:
            product.price > 0
              ? formatPrice(product.price)
              : ar
                ? "اسأل المحل عن السعر"
                : "Ask the store for a price",
        },
        ...(product.original_price > product.price && product.price > 0
          ? [
              {
                label: ar ? "السعر الأصلي المسجل" : "Recorded original price",
                value: formatPrice(product.original_price),
              },
              {
                label: ar ? "التوفير" : "Savings",
                value: formatPrice(product.original_price - product.price),
              },
            ]
          : []),
      ],
    });
  const showStock = () =>
    openDetails({
      title: ar ? "توافر المنتج" : "Product availability",
      description:
        product.stock > 0 && product.in_stock !== false
          ? ar
            ? "المنتج متوفر حسب آخر بيانات الكتالوج. تُراجع الكمية والسعر عند تأكيد الطلب. وجود المخزون لا يؤكد المقاس أو اللون؛ راجع الخيارات المسجلة."
            : "Available in the latest catalog. Price and availability are checked when the order is confirmed. Confirm the required color or size."
          : ar
            ? "هذا المنتج غير متاح للشراء حاليًا. يمكنك الاستفسار من المحل عن موعد توافره من زر واتساب."
            : "Currently unavailable to buy. Ask the store about availability using WhatsApp.",
      facts: [
        {
          label: ar ? "المنتج" : "Product",
          value: ar ? product.name_ar : product.name_en,
        },
        { label: "SKU", value: product.sku || product.id },
      ],
    });
  const showWarranty = () =>
    openDetails({
      title: ar ? "تفاصيل ضمان المنتج" : "Product warranty",
      description: ar
        ? "مدة الضمان أدناه هي المدة المسجلة لهذا المنتج. شروط التغطية والاستبدال وطريقة تقديم طلب صيانة تُراجع مع المحل والفاتورة؛ لا نفترض أن كل المنتجات لها نفس الضمان."
        : "This is the warranty duration recorded for this product. Confirm coverage, returns and service procedures with the store and your receipt.",
      facts: [
        {
          label: ar ? "المنتج" : "Product",
          value: ar ? product.name_ar : product.name_en,
        },
        {
          label: ar ? "المدة المسجلة" : "Recorded duration",
          value:
            product.warranty_months > 0
              ? `${product.warranty_months} ${ar ? "شهر" : "months"}`
              : ar
                ? "غير محددة"
                : "Not specified",
        },
      ],
    });
  const showReviews = () =>
    openDetails({
      title: ar ? "تقييمات المنتج" : "Product reviews",
      description: ar
        ? `التقييم المسجل ${product.rating || 0} من 5، وعدد التقييمات المسجل ${product.reviews_count || 0}. تظهر أدناه التعليقات المسجلة المتاحة فقط.`
        : `Recorded rating: ${product.rating || 0}/5 from ${product.reviews_count || 0} ratings. Only available saved reviews appear below.`,
      rows: (product.customer_reviews || []).map((r, i) => ({
        id: r.id || String(i),
        label: r.title || r.author,
        subtitle: r.comment,
        value: `${r.rating} / 5`,
      })),
    });
  return { showProductInfo, showPrice, showStock, showWarranty, showReviews };
}
