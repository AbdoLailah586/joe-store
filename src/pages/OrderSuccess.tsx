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
import { generateWhatsAppWebLink, buildOrderConfirmationMessage } from '../utils/whatsappService';

export const OrderSuccess: React.FC = () => {
  const { currentOrder, navigate, settings } = useStore();
  const { t, language, formatPrice, isRTL } = useLanguage();
  const [copied, setCopied] = React.useState(false);

  if (!currentOrder) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 rounded-3xl bg-[#0F1626] border border-white/10 text-center space-y-4">
        <h2 className="text-xl font-bold text-white font-cairo">لا يوجد طلب حالي</h2>
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
    navigator.clipboard.writeText(currentOrder.order_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappText = buildOrderConfirmationMessage(currentOrder, settings);
  const whatsappUrl = generateWhatsAppWebLink(currentOrder.customer_whatsapp || currentOrder.customer_phone, whatsappText);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8 text-center font-cairo">
      {/* 1. Celebratory Success Icon & Title */}
      <div className="space-y-3">
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-black flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30 animate-bounce">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-white">
          {t('orderPlacedSuccess')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
          شكراً لاختيارك متجر <strong>جو ستور (JOE Store)</strong>! تم تسجيل طلبك بنجاح وجاري تجهيزه وتسليمه لشركة التوصيل.
        </p>

        {/* Order Number Badge */}
        <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-[#0F1626] border border-amber-500/40 text-amber-300 shadow-md">
          <span className="text-xs text-slate-400 font-semibold">{t('orderNumber')}:</span>
          <span className="text-base font-black font-outfit text-white">#{currentOrder.order_number}</span>
          <button
            onClick={handleCopyOrderNumber}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
            title="نسخ رقم الطلب"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. WhatsApp Notification Callout Box */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border border-emerald-500/40 text-right space-y-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-emerald-300">
              إشعار واتساب فوري لطلبك (WhatsApp Automated Receipt)
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              تم إرسال رسالة آلية عبر نظام <strong>واتساب برو</strong> إلى هاتفك (<strong>{currentOrder.customer_whatsapp}</strong>) تحتوي على الفاتورة وتفاصيل المنتجات ومتابعة حالة التوصيل.
            </p>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 items-center justify-between border-t border-emerald-500/20">
          <span className="text-[11px] text-emerald-400/90">
            هل ترغب في فتح محادثة الواتساب مع متجر جو ستور الآن للتواصل مع الدعم الفني؟
          </span>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
          >
            <MessageCircle className="w-4 h-4" />
            <span>فتح المحادثة على واتساب</span>
          </a>
        </div>
      </div>

      {/* 3. Order Details Summary Card */}
      <div className="p-6 rounded-3xl bg-[#0F1626] border border-white/10 text-right space-y-5">
        <h3 className="font-bold text-sm text-white border-b border-white/5 pb-3 flex items-center justify-between">
          <span>تفاصيل الطلب والمنتجات</span>
          <span className="text-xs text-amber-400 font-outfit">{currentOrder.items.length} أصناف</span>
        </h3>

        <div className="space-y-3 divide-y divide-white/5">
          {currentOrder.items.map((item, idx) => (
            <div key={idx} className="pt-2 flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <img
                  src={item.product.images[0]}
                  alt=""
                  className="w-12 h-12 rounded-xl object-cover bg-slate-800 border border-white/10"
                />
                <div>
                  <h4 className="font-bold text-white">{item.product.name_ar}</h4>
                  <p className="text-[11px] text-slate-400">
                    {item.selected_storage || item.product.storage} • {item.selected_color || item.product.color_ar} × {item.quantity}
                  </p>
                </div>
              </div>
              <span className="font-bold text-amber-400 font-outfit">
                {formatPrice(item.product.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        {/* Pricing Summary */}
        <div className="space-y-1.5 pt-4 border-t border-white/10 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>المجموع الفرعي:</span>
            <span className="font-outfit text-white">{formatPrice(currentOrder.subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>الشحن والتوصيل ({currentOrder.governorate}):</span>
            <span className="font-outfit text-white">
              {currentOrder.shipping_fee === 0 ? 'مجاني' : formatPrice(currentOrder.shipping_fee)}
            </span>
          </div>
          <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-white/5">
            <span>المبلغ الإجمالي المطلوب:</span>
            <span className="font-outfit text-amber-400 text-lg">{formatPrice(currentOrder.total)}</span>
          </div>
        </div>

        {/* Delivery Address & Payment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-white/10 text-xs">
          <div className="p-3 rounded-xl bg-slate-900 border border-white/5 space-y-1">
            <span className="text-slate-400 block text-[11px]">📍 عنوان التوصيل:</span>
            <strong className="text-white block">
              {currentOrder.governorate} - {currentOrder.city}
            </strong>
            <p className="text-[11px] text-slate-400">{currentOrder.address_details}</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-white/5 space-y-1">
            <span className="text-slate-400 block text-[11px]">💳 طريقة الدفع المحددة:</span>
            <strong className="text-white block">
              {currentOrder.payment_method === 'cod' ? 'الدفع عند الاستلام (COD)' : currentOrder.payment_method === 'instapay' ? 'إنستاباي (InstaPay)' : currentOrder.payment_method === 'vodafone_cash' ? 'فودافون كاش' : 'بطاقة بنكية'}
            </strong>
            <span className="text-[10px] text-emerald-400">
              {currentOrder.payment_method === 'cod' ? '✓ يحق لك المعاينة قبل الدفع' : '✓ تم تسجيل بيانات العملية'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
        <button
          onClick={() => navigate('track-order')}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs shadow-glow-gold transition-all"
        >
          {t('trackLive')}
        </button>

        <button
          onClick={() => navigate('home')}
          className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 text-xs font-bold"
        >
          {t('backToHome')}
        </button>
      </div>
    </div>
  );
};
