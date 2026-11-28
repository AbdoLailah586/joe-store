import { formatDeliveryAddress } from '../utils/deliveryAddress';
import { normalizeProductImage } from '../utils/imageUrl';
import React from 'react';
import {
  CheckCircle,
  MessageCircle,
  Package,
  Truck,
  ArrowLeft,
  ArrowRight,
  Copy,
  Check,
  Clock,
  MapPin,
  Receipt
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { InfoButton } from '../components/DetailsDialog';
import { orderDetail, productDetail } from '../utils/detailModels';
import { generateWhatsAppWebLink, buildOrderConfirmationMessage } from '../utils/whatsappService';
import { InvoiceModal } from '../components/InvoiceModal';
import { initMetaPixel, trackMetaEvent } from '../utils/metaPixel';
import { hasAnalyticsConsent, initGa4, trackGa4Purchase } from '../utils/analytics';

export const OrderSuccess: React.FC = () => {
  const { currentOrder, navigate, settings } = useStore();
  const { t, formatPrice } = useLanguage();
  const [copied, setCopied] = React.useState(false);
  const [showInvoice, setShowInvoice] = React.useState(false);

  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const gatewayStatus = searchParams?.get('payment') || '';
  const queryOrderNumber = searchParams?.get('order') || '';

  const fallbackOrder = React.useMemo(() => {
    if (currentOrder || typeof window === 'undefined') return null;
    try {
      const raw = window.sessionStorage.getItem('joe_last_order');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (queryOrderNumber && parsed?.order_number && parsed.order_number !== queryOrderNumber) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }, [currentOrder, queryOrderNumber]);

  const activeOrder = currentOrder || fallbackOrder;
  const orderNumber = activeOrder?.order_number || queryOrderNumber;

  React.useEffect(() => {
    if (gatewayStatus !== 'paid' || !orderNumber || typeof window === 'undefined') return;
    if (!hasAnalyticsConsent()) return;
    const metaEnabled = settings.meta_pixel_enabled !== false && Boolean(settings.meta_pixel_id);
    if (!metaEnabled && !settings.ga4_measurement_id) return;
    const guardKey = `joe_purchase_tracked_${orderNumber}`;
    try {
      if (window.sessionStorage.getItem(guardKey) === '1') return;
      window.sessionStorage.setItem(guardKey, '1');
    } catch {}

    if (metaEnabled && initMetaPixel(settings.meta_pixel_id)) {
      const items = Array.isArray(activeOrder?.items) ? activeOrder.items : [];
      trackMetaEvent(
        'Purchase',
        {
          value: Number(activeOrder?.total || 0),
          currency: 'EGP',
          content_ids: items.map((i: any) => i?.product?.id).filter(Boolean),
          content_type: 'product',
          num_items: items.reduce((sum: number, i: any) => sum + Number(i?.quantity || 0), 0)
        },
        orderNumber
      );
    }
    if (activeOrder && settings.ga4_measurement_id) {
      initGa4(settings.ga4_measurement_id);
      trackGa4Purchase(activeOrder);
    }
  }, [gatewayStatus, orderNumber, activeOrder, settings.meta_pixel_id, settings.meta_pixel_enabled, settings.ga4_measurement_id]);

  if (!activeOrder && !queryOrderNumber) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900 font-cairo">لا يوجد طلب حالي</h2>
        <button
          onClick={() => navigate('home')}
          className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs"
        >
          العودة للتسوق
        </button>
      </div>
    );
  }

  const handleCopyOrderNumber = () => {
    navigator.clipboard.writeText(orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappText = activeOrder
    ? buildOrderConfirmationMessage(activeOrder, settings)
    : `مرحباً جو ستور، أتابع حالة طلبي رقم #${orderNumber}`;
  const whatsappUrl = generateWhatsAppWebLink(
    activeOrder?.customer_whatsapp || activeOrder?.customer_phone || settings.store_whatsapp,
    whatsappText
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8 text-center font-cairo">
      {/* 1. Celebratory Success Icon & Title */}
      <div className="space-y-3">
        <div
          className={`w-20 h-20 rounded-full text-white flex items-center justify-center mx-auto shadow-2xl ${
            gatewayStatus === 'failed' || gatewayStatus === 'unverified'
              ? 'bg-gradient-to-tr from-amber-500 to-rose-500 shadow-rose-500/30'
              : 'bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-emerald-500/30 animate-bounce'
          }`}
        >
          <CheckCircle className="w-10 h-10" />
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900">
          {gatewayStatus === 'paid'
            ? 'تم تأكيد الطلب والدفع الإلكتروني بنجاح!'
            : gatewayStatus === 'failed' || gatewayStatus === 'unverified'
              ? 'تم تسجيل الطلب وبانتظار تأكيد الدفع'
              : t('orderPlacedSuccess')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
          {gatewayStatus === 'paid' ? (
            <>شكراً لاختيارك <strong>جو ستور (JOE Store)</strong>! تم توثيق عملية الدفع الإلكتروني وجاري تجهيز شحنتك.</>
          ) : gatewayStatus === 'failed' || gatewayStatus === 'unverified' ? (
            <>تم حفظ طلبك برقم <strong>#{orderNumber}</strong>، ولم يكتمل الدفع الإلكتروني بعد. يمكنك التنسيق عبر الواتساب أو الدفع عند الاستلام.</>
          ) : (
            <>شكراً لاختيارك متجر <strong>جو ستور (JOE Store)</strong>! تم تسجيل طلبك بنجاح وجاري تجهيزه وتسليمه لشركة التوصيل.</>
          )}
        </p>

        {gatewayStatus === 'paid' && (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
            ✓ تم التحقق من الدفع الإلكتروني وحماية المعاملة
          </div>
        )}

        {/* Order Number Badge */}
        <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white border border-amber-500/40 text-amber-700 shadow-md">
          <span className="text-xs text-slate-600 font-semibold">{t('orderNumber')}:</span>
          {activeOrder ? (
            <InfoButton className="text-base font-black font-outfit text-slate-900" details={orderDetail(activeOrder, formatPrice)}>#{orderNumber}</InfoButton>
          ) : (
            <span className="text-base font-black font-outfit text-slate-900">#{orderNumber}</span>
          )}
          <button
            onClick={handleCopyOrderNumber}
            className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900"
            title="نسخ رقم الطلب"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. WhatsApp Notification Callout Box */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border border-emerald-500/30 text-right space-y-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 flex-shrink-0">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-emerald-800">
              إشعار واتساب فوري لطلبك (WhatsApp Receipt)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {activeOrder?.customer_whatsapp || activeOrder?.customer_phone ? (
                <>تم تسجيل إشعار <strong>الواتساب</strong> على هاتفك (<strong>{activeOrder.customer_whatsapp || activeOrder.customer_phone}</strong>) وإبلاغ فريق المبيعات لتأكيد الطلب ومتابعة الشحن.</>
              ) : (
                <>يمكنك فتح محادثة واتساب مباشرة مع فريق جو ستور لمتابعة طلبك رقم <strong>#{orderNumber}</strong>.</>
              )}
            </p>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 items-center justify-between border-t border-emerald-500/20">
          <span className="text-[11px] text-emerald-800">
            هل ترغب في فتح محادثة الواتساب مع متجر جو ستور الآن للتواصل مع الدعم الفني؟
          </span>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
          >
            <MessageCircle className="w-4 h-4" />
            <span>فتح المحادثة على واتساب</span>
          </a>
        </div>
      </div>

      {/* 3. Order Details Summary Card */}
      {activeOrder && (
      <div className="p-6 rounded-3xl bg-white border border-slate-200 text-right space-y-5">
        <h3 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-3 flex items-center justify-between">
          <span>تفاصيل الطلب والمنتجات</span>
          <span className="text-xs text-amber-700 font-outfit">{activeOrder.items.length} أصناف</span>
        </h3>

        <div className="space-y-3 divide-y divide-slate-200">
          {activeOrder.items.map((item: any, idx: number) => (
            <div key={idx} className="pt-2 flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <img
                  src={normalizeProductImage(item.product.images[0])}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="w-12 h-12 rounded-xl object-cover bg-slate-100 border border-slate-200"
                />
                <div>
                  <h4 className="font-bold text-slate-900">{item.product.name_ar}</h4>
                  <p className="text-[11px] text-slate-600">
                    {item.selected_storage || item.product.storage} • {item.selected_color || item.product.color_ar} × {item.quantity}
                  </p>
                </div>
              </div>
              <span className="font-bold text-amber-700 font-outfit">
                {formatPrice(item.product.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        {/* Pricing Summary */}
        <div className="space-y-1.5 pt-4 border-t border-slate-200 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>المجموع الفرعي:</span>
            <span className="font-outfit text-slate-900">{formatPrice(activeOrder.subtotal)}</span>
          </div>
          {Number(activeOrder.discount || 0) > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>الخصم:</span>
              <span className="font-outfit">-{formatPrice(activeOrder.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-600">
            <span>الشحن والتوصيل ({activeOrder.governorate}):</span>
            <span className="font-outfit text-slate-900">
              {activeOrder.shipping_fee === 0 ? 'مجاني' : formatPrice(activeOrder.shipping_fee)}
            </span>
          </div>
          <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
            <span>المبلغ الإجمالي المطلوب:</span>
            <InfoButton className="font-outfit text-amber-700 text-lg" details={orderDetail(activeOrder, formatPrice)}>{formatPrice(activeOrder.total)}</InfoButton>
          </div>
        </div>

        {/* Delivery Address & Payment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200 text-xs">
          <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 space-y-1">
            <span className="text-slate-600 block text-[11px]">عنوان التوصيل:</span>
            <strong className="text-slate-900 block">
              {[activeOrder.governorate, activeOrder.city].filter(Boolean).join(' - ')}
            </strong>
            <p className="text-[11px] text-slate-600">{formatDeliveryAddress({ ...activeOrder, governorate: undefined, city: undefined })}</p>
            {activeOrder.google_maps_url && (
              <a
                href={activeOrder.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-bold hover:underline pt-1"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>عرض الموقع على خرائط جوجل</span>
              </a>
            )}
          </div>

          <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 space-y-1">
            <span className="text-slate-600 block text-[11px]">طريقة الدفع المحددة:</span>
            <strong className="text-slate-900 block">
              {activeOrder.payment_method === 'cod'
                ? 'الدفع عند الاستلام (COD)'
                : activeOrder.payment_method === 'instapay'
                  ? 'إنستاباي (InstaPay)'
                  : activeOrder.payment_method === 'vodafone_cash'
                    ? 'فودافون كاش'
                    : 'بطاقة بنكية أونلاين'}
            </strong>
            <span className="text-[10px] text-emerald-700">
              {gatewayStatus === 'paid' || activeOrder.payment_status === 'paid'
                ? '✓ مدفوع إلكترونياً وموثق'
                : activeOrder.payment_method === 'cod'
                  ? '✓ يحق لك المعاينة قبل الدفع'
                  : '✓ تم تسجيل بيانات العملية'}
            </span>
          </div>
        </div>
      </div>
      )}

      {/* 4. Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
        {activeOrder && (
          <button
            type="button"
            onClick={() => setShowInvoice(true)}
            className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold text-xs inline-flex items-center justify-center gap-2 transition-all"
          >
            <Receipt className="w-4 h-4" />
            <span>عرض الفاتورة الإلكترونية (QR / PDF)</span>
          </button>
        )}

        <button
          onClick={() => navigate('track-order')}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs shadow-glow-gold transition-all"
        >
          {t('trackLive')}
        </button>

        <button
          onClick={() => navigate('home')}
          className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold"
        >
          {t('backToHome')}
        </button>
      </div>

      <InvoiceModal
        order={showInvoice ? activeOrder : null}
        settings={settings}
        onClose={() => setShowInvoice(false)}
      />
    </div>
  );
};
