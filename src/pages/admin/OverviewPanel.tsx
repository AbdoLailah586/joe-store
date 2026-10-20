import React from "react";
import { useStore } from "../../context/StoreContext";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { MetricCard, useDetails } from "../../components/DetailsDialog";
import {
  orderDetail,
  orderRows,
  productDetail,
  productRows,
} from "../../utils/detailModels";
import { recordedStock } from "../../utils/inventoryReports";
import type { Order, Product } from "../../types";
import type { AdminSection } from "./AdminShell";

export function OverviewPanel({
  onSection,
  onEdit,
  wishlistGap,
}: {
  onSection: (section: AdminSection) => void;
  onEdit: (product: Product) => void;
  wishlistGap: {
    product_id: string;
    name_ar: string;
    interest_count: number;
  }[];
}) {
  const {
    products,
    orders,
    whatsappLogs,
    settings,
    activeCarts,
    isCatalogReadyForReports,
  } = useStore();
  const { formatPrice, language } = useLanguage();
  const { canAccessSection } = useAuth();
  const { openDetails, closeDetails } = useDetails();
  const delivered = orders.filter((o) => o.order_status === "delivered");
  const total = delivered.reduce((n, o) => n + Number(o.total || 0), 0);
  const late = orders.filter(
    (o) =>
      ["confirmed", "processing"].includes(o.order_status) &&
      Date.now() - new Date(o.created_at).getTime() > 86400000,
  );
  const unpaid = orders.filter(
    (o) =>
      o.payment_method !== "cod" &&
      o.payment_status === "unpaid" &&
      !["cancelled", "delivered"].includes(o.order_status),
  );
  const zero = products.filter(
    (p) => recordedStock(p) !== null && recordedStock(p)! <= 0,
  );
  const low = products.filter(
    (p) => recordedStock(p) !== null && recordedStock(p)! < 3,
  );
  const canEdit = canAccessSection("products");
  const showProduct = (p: Product) =>
    openDetails({
      ...productDetail(
        p,
        language,
        formatPrice,
        canEdit || canAccessSection("inventory"),
      ),
      actions: canEdit
        ? [{ label: "فتح محرر هذا المنتج", run: () => onEdit(p) }]
        : [],
    });
  const showOrder = (o: Order) =>
    openDetails(orderDetail(o, formatPrice, showProduct));
  const action = (section: AdminSection, label: string) =>
    canAccessSection(section) ? [{ label, run: () => onSection(section) }] : [];
  const showOrders = (title: string, description: string, rows: Order[]) =>
    openDetails({
      title,
      description,
      facts: [
        { label: "عدد الطلبات", value: rows.length },
        {
          label: "الإجمالي المسجل لهذه الطلبات",
          value: formatPrice(
            rows.reduce((n, o) => n + Number(o.total || 0), 0),
          ),
        },
      ],
      rows: orderRows(rows, formatPrice, showOrder),
      actions: action("orders", "فتح إدارة الطلبات"),
    });
  const showProducts = (title: string, description: string, rows: Product[]) =>
    openDetails({
      title,
      description,
      rows: productRows(rows, formatPrice, showProduct, true),
      actions: action("inventory", "فتح تقارير المخزون"),
    });
  const showCarts = () =>
    openDetails({
      title: "السلات المتروكة",
      description:
        "السلات المعلّمة كمتروكة في البيانات الحالية. قيمتها فرصة بيع محتملة وليست مبيعات محققة.",
      rows: activeCarts
        .filter((c) => c.is_abandoned)
        .map((c, i) => ({
          id: String(i),
          label: c.customer_name || "جلسة عميل",
          value: formatPrice(Number(c.subtotal || 0)),
          facts: [{ label: "الأصناف", value: c.items?.length || 0 }],
        })),
      actions: action("crm", "فتح العملاء والسلات"),
    });
  return (
    <div className="space-y-7">
      <p className="text-sm text-slate-600">
        اضغط على أي إحصائية لعرض معناها والسجلات الداخلة في حسابها، ثم افتح
        الطلب أو المنتج المطلوب.
      </p>
      <section aria-label="مهام المتجر">
        <h2 className="font-bold text-sm mb-3">المهام القابلة للمتابعة</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <MetricCard
            title="طلبات متأخرة عن الشحن (+24 ساعة)"
            value={late.length}
            note="طلبات مؤكدة أو قيد التجهيز مر عليها أكثر من يوم"
            onClick={() =>
              showOrders(
                "طلبات متأخرة عن الشحن",
                "طلبات حالتها مؤكد أو قيد التجهيز، ومر على تاريخ إنشائها أكثر من 24 ساعة. لا تشمل الطلبات الملغاة أو المشحونة.",
                late,
              )
            }
          />
          <MetricCard
            title="طلبات دفع مسبق بانتظار الاعتماد المالي"
            value={unpaid.length}
            note="الدفع المسجل: غير مدفوع"
            onClick={() =>
              showOrders(
                "طلبات الدفع المسبق غير المدفوعة",
                "طريقة الدفع ليست عند الاستلام، وحالة الدفع المسجلة غير مدفوع، والطلب لم يُسلّم أو يُلغَ. فتح التفاصيل لا يعتمد الدفع تلقائيًا.",
                unpaid,
              )
            }
          />
          <MetricCard
            title="متوسط قيمة الطلب (AOV)"
            value={formatPrice(delivered.length ? total / delivered.length : 0)}
            note="إجمالي المسلّم ÷ عدد الطلبات المسلّمة"
            onClick={() =>
              showOrders(
                "حساب متوسط قيمة الطلب",
                `${formatPrice(total)} ÷ ${delivered.length} طلب مسلّم. الإجمالي يشمل الشحن المسجل؛ لا يمثل صافي الربح.`,
                delivered,
              )
            }
          />
        </div>
      </section>
      <section aria-label="إحصائيات المتجر">
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            title="قيمة الطلبات المسلّمة"
            value={formatPrice(total)}
            note="يشمل الشحن؛ لا يشمل الملغى"
            onClick={() =>
              showOrders(
                "قيمة الطلبات المسلّمة",
                "مجموع إجماليات الطلبات المسلّمة فقط، شاملًا الشحن المسجل. لا يمثل الربح أو كشف التحويلات البنكية.",
                delivered,
              )
            }
          />
          <MetricCard
            title="إجمالي الطلبات"
            value={orders.length}
            note={`${orders.filter((o) => o.order_status === "pending").length} طلبات قيد المراجعة`}
            onClick={() =>
              showOrders(
                "كل الطلبات المسجلة",
                "الطلبات المتاحة لحسابك، بما فيها الطلبات الملغاة. اضغط على رقم الطلب لعرض أصنافه وحالته والدفع والتوصيل.",
                orders,
              )
            }
          />
          <MetricCard
            title="المنتجات بالمخزن"
            value={products.length}
            disabled={!isCatalogReadyForReports}
            note="عدد الأصناف، وليس مجموع القطع"
            onClick={() =>
              showProducts(
                "أصناف المخزون",
                "كل الأصناف الموجودة في بيانات المخزون المتاحة لحسابك. اضغط على اسم الصنف لعرض بياناته المسجلة.",
                products,
              )
            }
          />
          <MetricCard
            title="ربط واتساب برو"
            value={
              settings.whatsapp_automation_url
                ? "رابط الإرسال مضاف"
                : "يحتاج إعدادًا"
            }
            note={`${whatsappLogs.length} سجل إشعار`}
            onClick={() =>
              openDetails({
                title: "حالة إعداد واتساب",
                description:
                  "وجود رابط إرسال لا يعني أن الخدمة متصلة أو أن كل الرسائل وصلت. راجع نتيجة كل إشعار في السجل.",
                rows: whatsappLogs.map((log: any, i) => ({
                  id: log.id || String(i),
                  label: log.order_number
                    ? `طلب #${log.order_number}`
                    : log.type || log.message_type || "إشعار",
                  subtitle: String(log.status || "غير محدد"),
                  value:
                    log.sent_at || log.created_at
                      ? new Date(log.sent_at || log.created_at).toLocaleString(
                          "ar-EG",
                        )
                      : "",
                })),
                actions: action("whatsapp", "فتح إعدادات وسجل واتساب"),
              })
            }
          />
          <MetricCard
            title="المخزون النافد"
            value={zero.length}
            disabled={!isCatalogReadyForReports}
            note="الكمية المسجلة صفر أو أقل"
            onClick={() =>
              showProducts(
                "الأصناف النافدة",
                "الأصناف ذات الكمية المسجلة صفر أو أقل. الأرصدة السالبة تظهر هنا للمراجعة؛ الأصناف بلا كمية مسجلة لا تُعتبر صفرًا.",
                zero,
              )
            }
          />
          <MetricCard
            title="المخزون أقل من 3"
            value={low.length}
            disabled={!isCatalogReadyForReports}
            note="يشمل الصفر والأرصدة السالبة"
            onClick={() =>
              showProducts(
                "أصناف مخزونها أقل من 3",
                "الشرط: الكمية المسجلة أقل من 3. يتضمن الصفر والأرصدة السالبة، ويستبعد الكميات غير المحددة.",
                low,
              )
            }
          />
          <MetricCard
            title="السلات المتروكة"
            value={activeCarts.filter((c) => c.is_abandoned).length}
            note="فرص متابعة، وليست طلبات مؤكدة"
            onClick={showCarts}
          />
          <MetricCard
            title="طلبات قيد المراجعة"
            value={orders.filter((o) => o.order_status === "pending").length}
            note="حالة الطلب: قيد المراجعة"
            onClick={() =>
              showOrders(
                "طلبات قيد المراجعة",
                "الطلبات التي ما زالت حالتها قيد المراجعة فقط.",
                orders.filter((o) => o.order_status === "pending"),
              )
            }
          />
        </div>
      </section>
      {!!wishlistGap.length && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <h2 className="font-bold text-sm">الأكثر رغبة وغير متوفر بالمخزون</h2>
          {wishlistGap.map((row) => (
            <button
              type="button"
              key={row.product_id}
              className="w-full text-start flex justify-between gap-4 rounded-lg p-3 hover:bg-amber-50 text-sm"
              onClick={() => {
                const p = products.find((item) => item.id === row.product_id);
                if (p) showProduct(p);
                else
                  openDetails({
                    title: row.name_ar,
                    description:
                      "هذا الصنف وارد في تقرير رغبات العملاء، وبياناته التفصيلية غير متاحة في الكتالوج الحالي.",
                    facts: [
                      {
                        label: "عدد مرات الإضافة للمفضلة",
                        value: row.interest_count,
                      },
                    ],
                  });
              }}
            >
              <span>{row.name_ar}</span>
              <strong>{row.interest_count} ←</strong>
            </button>
          ))}
        </section>
      )}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <div className="flex justify-between">
          <h2 className="font-bold text-sm">أحدث الطلبات</h2>
          <button
            type="button"
            className="text-xs text-amber-800"
            onClick={() =>
              showOrders(
                "كل الطلبات المسجلة",
                "الطلبات المتاحة في البيانات الحالية لحسابك.",
                orders,
              )
            }
          >
            عرض الكل ←
          </button>
        </div>
        {orders.slice(0, 5).map((o) => (
          <button
            type="button"
            key={o.id}
            onClick={() => showOrder(o)}
            className="w-full text-start flex flex-wrap justify-between gap-3 p-3 border border-slate-100 rounded-lg hover:bg-amber-50 text-sm"
          >
            <span>
              #{o.order_number} · {o.customer_name}
            </span>
            <strong>{formatPrice(o.total)} ←</strong>
          </button>
        ))}
        {!orders.length && (
          <p className="text-sm text-slate-500">
            لا توجد طلبات مسجلة متاحة لحسابك حاليًا.
          </p>
        )}
      </section>
    </div>
  );
}
