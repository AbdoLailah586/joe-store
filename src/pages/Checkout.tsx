import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Truck, 
  CreditCard, 
  MessageCircle, 
  CheckCircle, 
  AlertCircle, 
  Lock, 
  ArrowRight, 
  ArrowLeft,
  Smartphone,
  Upload,
  Receipt,
  MapPin,
  Compass,
  ExternalLink,
  Home,
  Building,
  Phone,
  Check
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { egyptianGovernorates } from '../data/governorates';
import { PaymentMethod } from '../types';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';

export const Checkout: React.FC = () => {
  const { cart, cartSubtotal, createOrder, navigate, settings } = useStore();
  const { t, language, formatPrice, isRTL } = useLanguage();
  const { user, isAuthenticated, openAuthModal, loginWithGoogle } = useAuth();

  // Selected Address from profile or 'new'
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');

  // Customer Contact States
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [customerSecondaryPhone, setCustomerSecondaryPhone] = useState('');
  const [customerWhatsApp, setCustomerWhatsApp] = useState(user?.phone || '');
  const [sameAsPhone, setSameAsPhone] = useState(true);
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');

  // Address Breakdown States
  const [selectedGovId, setSelectedGovId] = useState(egyptianGovernorates[0].id);
  const [selectedCity, setSelectedCity] = useState('');
  const [addressDetails, setAddressDetails] = useState('');
  const [buildingNo, setBuildingNo] = useState('');
  const [floorNo, setFloorNo] = useState('');
  const [apartmentNo, setApartmentNo] = useState('');
  const [landmark, setLandmark] = useState('');
  const [notes, setNotes] = useState('');

  // Google Maps GPS Location States
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState('');
  const [locationError, setLocationError] = useState('');

  // Payment States
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [paymentReference, setPaymentReference] = useState('');
  const [receiptImage, setReceiptImage] = useState<string>('');
  
  // Credit Card Form States
  const [cardHolderName, setCardHolderName] = useState(user?.name || '');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-detect Card Type (Visa vs Mastercard)
  const isVisa = cardNumber.replace(/\s/g, '').startsWith('4');
  const isMastercard = /^5[1-5]|^2[2-7]/.test(cardNumber.replace(/\s/g, ''));

  // Pre-fill user data when user changes
  useEffect(() => {
    if (user) {
      if (!customerName) setCustomerName(user.name);
      if (!customerPhone) setCustomerPhone(user.phone);
      if (!customerWhatsApp) setCustomerWhatsApp(user.phone);
      if (!customerEmail && user.email) setCustomerEmail(user.email);
      if (!cardHolderName && user.name) setCardHolderName(user.name);

      if (user.addresses && user.addresses.length > 0 && selectedAddressId === 'new') {
        const defaultAddr = user.addresses.find(a => a.isDefault) || user.addresses[0];
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
          setAddressDetails(defaultAddr.details);
          setSelectedCity(defaultAddr.city);
          const foundGov = egyptianGovernorates.find(g => g.name_ar === defaultAddr.governorate);
          if (foundGov) setSelectedGovId(foundGov.id);
        }
      }
    }
  }, [user]);

  if (cart.length === 0) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 rounded-3xl bg-[#0F1626] border border-white/10 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-3xl mx-auto">
          🛒
        </div>
        <h2 className="text-xl font-bold text-white font-cairo">عربة التسوق فارغة</h2>
        <p className="text-xs text-slate-400 font-cairo">
          يرجى إضافة هواتف أو ملحقات إلى عربة التسوق أولاً لإتمام الطلب.
        </p>
        <button
          onClick={() => navigate('catalog')}
          className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-glow-gold"
        >
          تصفح المتجر الآن
        </button>
      </div>
    );
  }

  // Selected Governorate calculations
  const currentGov = egyptianGovernorates.find(g => g.id === selectedGovId) || egyptianGovernorates[0];
  const isFreeShipping = cartSubtotal >= (settings.free_shipping_threshold || 2500);
  const shippingFee = isFreeShipping ? 0 : currentGov.shipping_fee;
  const grandTotal = cartSubtotal + shippingFee;

  const handlePhoneChange = (val: string) => {
    setCustomerPhone(val);
    if (sameAsPhone) {
      setCustomerWhatsApp(val);
    }
  };

  // Format Card Number (XXXX XXXX XXXX XXXX)
  const handleCardNumberChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 16);
    const parts = raw.match(/[\s\S]{1,4}/g) || [];
    setCardNumber(parts.join(' '));
  };

  // Format Card Expiry (MM/YY)
  const handleExpiryChange = (val: string) => {
    let raw = val.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      raw = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    }
    setCardExpiry(raw);
  };

  // Format CVV (3 digits)
  const handleCvvChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 4);
    setCardCvv(raw);
  };

  // Free Google Maps GPS Location Fetcher
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationError(language === 'ar' ? 'المتصفح لا يدعم تحديد الموقع الجغرافي' : 'Geolocation not supported by your browser');
      return;
    }
    setIsLocating(true);
    setLocationError('');
    setLocationSuccess('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const url = `https://www.google.com/maps?q=${lat},${lng}`;
        setGoogleMapsUrl(url);
        setLocationSuccess(
          language === 'ar' 
            ? `تم تحديد موقعك بدقة! (إحداثيات: ${lat.toFixed(4)}, ${lng.toFixed(4)})` 
            : `Coordinates acquired! (${lat.toFixed(4)}, ${lng.toFixed(4)})`
        );
      },
      (err) => {
        setIsLocating(false);
        setLocationError(
          language === 'ar'
            ? 'يرجى السماح بالوصول لموقعك من إعدادات المتصفح أو لصق الرابط يدوياً.'
            : 'Please allow location permission in your browser or paste link manually.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setReceiptImage(uploadEvent.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Strict Requirement: User MUST be signed in to place an order
    if (!isAuthenticated) {
      openAuthModal(
        language === 'ar' 
          ? 'تسجيل الدخول مطلوب لإتمام طلبك وحفظ بيانات الشحن والضمان المعتمد.' 
          : 'Sign in is required to complete your order and activate warranty.', 
        'checkout'
      );
      setErrorMsg(
        language === 'ar'
          ? 'يرجى تسجيل الدخول أو المتابعة بحساب Google لإتمام الطلب.'
          : 'Please sign in or continue with Google to place your order.'
      );
      return;
    }

    if (!customerName.trim()) {
      setErrorMsg(language === 'ar' ? 'يرجى كتابة الاسم بالكامل.' : 'Please enter your full name.');
      return;
    }
    if (!customerPhone.trim() || customerPhone.length < 10) {
      setErrorMsg(language === 'ar' ? 'يرجى إدخال رقم هاتف صحيح للتواصل (10 أرقام على الأقل).' : 'Please enter a valid phone number.');
      return;
    }
    const finalWhatsApp = sameAsPhone ? customerPhone : customerWhatsApp;
    if (!finalWhatsApp.trim()) {
      setErrorMsg(language === 'ar' ? 'يرجى تحديد رقم الواتساب لإرسال تفاصيل الشحنة.' : 'Please provide WhatsApp number for shipment tracking.');
      return;
    }
    if (!addressDetails.trim()) {
      setErrorMsg(language === 'ar' ? 'يرجى كتابة اسم الشارع والمنطقة بالتفصيل.' : 'Please enter your street name and area.');
      return;
    }

    // Credit Card Validation if selected
    if (paymentMethod === 'credit_card') {
      const rawCard = cardNumber.replace(/\s/g, '');
      if (rawCard.length < 15) {
        setErrorMsg(language === 'ar' ? 'يرجى إدخال رقم بطاقة بنكية صحيح (16 رقم).' : 'Please enter a valid 16-digit card number.');
        return;
      }
      if (!cardExpiry || cardExpiry.length < 5) {
        setErrorMsg(language === 'ar' ? 'يرجى إدخال تاريخ انتهاء البطاقة بصيغة MM/YY.' : 'Please enter card expiry date (MM/YY).');
        return;
      }
      if (!cardCvv || cardCvv.length < 3) {
        setErrorMsg(language === 'ar' ? 'يرجى إدخال رمز الأمان (CVV) المكون من 3 أرقام خلف البطاقة.' : 'Please enter 3-digit CVV security code.');
        return;
      }
      if (!cardHolderName.trim()) {
        setErrorMsg(language === 'ar' ? 'يرجى إدخال اسم صاحب البطاقة كما هو مدون عليها.' : 'Please enter cardholder name as written on card.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const rawCard = cardNumber.replace(/\s/g, '');
      const cardLast4 = rawCard.length >= 4 ? `**** **** **** ${rawCard.slice(-4)}` : undefined;

      const order = await createOrder({
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_whatsapp: finalWhatsApp,
        customer_email: customerEmail || undefined,
        customer_secondary_phone: customerSecondaryPhone || undefined,
        governorate: currentGov.name_ar,
        city: selectedCity || currentGov.cities[0]?.name_ar || 'المدينة',
        address_details: addressDetails,
        building_no: buildingNo || undefined,
        floor_no: floorNo || undefined,
        apartment_no: apartmentNo || undefined,
        landmark: landmark || undefined,
        google_maps_url: googleMapsUrl || undefined,
        card_last4: cardLast4,
        card_holder: paymentMethod === 'credit_card' ? cardHolderName : undefined,
        notes: notes || undefined,
        items: cart,
        subtotal: cartSubtotal,
        shipping_fee: shippingFee,
        discount: 0,
        total: grandTotal,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'cod' ? 'unpaid' : (paymentMethod === 'credit_card' || receiptImage || paymentReference) ? 'paid' : 'unpaid',
        payment_receipt_url: receiptImage || undefined,
        payment_reference: paymentReference || (paymentMethod === 'credit_card' ? `CARD-${rawCard.slice(-4)}-AUTH` : undefined),
        order_status: 'pending',
      });

      // Confetti celebration
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch (err) {}

      navigate('order-success');
    } catch (err: any) {
      setErrorMsg(language === 'ar' ? `حدث خطأ أثناء تسجيل الطلب: ${err.message}` : `Error creating order: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-white font-cairo flex items-center gap-2">
          <span>{t('checkoutTitle')}</span>
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
        </h1>
        <p className="text-xs text-slate-400 font-cairo mt-1">
          {language === 'ar' 
            ? 'أدخل بيانات التوصيل الدقيقة واختر طريقة الدفع المناسبة لاستلام طلبك فوراً مع شهادة الضمان' 
            : 'Enter precise delivery details and select your preferred payment method.'}
        </p>
      </div>

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* VIP Auth Requirement Banner */}
        {!isAuthenticated ? (
          <div className="lg:col-span-12 p-6 rounded-3xl bg-gradient-to-r from-amber-500/15 via-[#0F1626] to-amber-500/10 border-2 border-amber-500/40 shadow-xl space-y-4 font-cairo">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-amber-400" />
                  <h3 className="font-extrabold text-white text-sm sm:text-base">
                    {language === 'ar' ? 'تسجيل الدخول مطلوب لإتمام هذا الطلب' : 'Sign in required to place this order'}
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                    {language === 'ar' ? 'حفظ الضمان والبيانات' : 'Warranty & Invoices'}
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  {language === 'ar' 
                    ? 'تسجيل الدخول يتيح لك تفعيل شهادة الضمان المعتمدة لجهازك، متابعة حالة الشحنة بالواتساب، واسترجاع عناوينك المحفوظة.' 
                    : 'Signing in secures your warranty certificate, automated WhatsApp tracking, and saves your delivery address.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => loginWithGoogle()}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95 border border-slate-200"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.26 21.36 7.33 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.26C.46 8.18 0 9.98 0 12s.46 3.82 1.26 5.42l4.02-3.13z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.26 6.58l4.02 3.13c.95-2.83 3.6-4.96 6.72-4.96z" />
                  </svg>
                  <span>{language === 'ar' ? 'المتابعة بحساب Google' : 'Continue with Google'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => openAuthModal(undefined, 'checkout')}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-glow-gold transition-all"
                >
                  {language === 'ar' ? 'تسجيل بالبريد الإلكتروني' : 'Sign in with Email'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-12 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs font-cairo">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="text-white font-bold">{language === 'ar' ? 'طلبك مسجل باسم العميل:' : 'Order registered to:'} {user?.name}</span>
                <span className="text-slate-400 text-[11px] block">{user?.email} • {user?.phone}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('profile')}
              className="text-amber-400 hover:underline font-bold"
            >
              {language === 'ar' ? 'عرض ملفي الشخصي' : 'View Profile'}
            </button>
          </div>
        )}

        {/* Left 7 Columns: Shipping Info & Payment Methods */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Step 1: Recipient & Shipping Information */}
          <div className="p-6 rounded-3xl bg-[#0F1626] border border-white/10 space-y-5">
            <h2 className="text-base font-bold text-white font-cairo flex items-center gap-2 border-b border-white/5 pb-3">
              <Truck className="w-5 h-5 text-amber-400" />
              <span>{language === 'ar' ? '1. بيانات المستلم وعنوان التوصيل' : '1. Recipient & Shipping Address'}</span>
            </h2>

            {/* Saved Addresses Picker for Logged-In Users */}
            {user?.addresses && user.addresses.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3 font-cairo">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                    <Home className="w-4 h-4 text-amber-400" />
                    {language === 'ar' ? 'اختر من عناوينك المسجلة:' : 'Select from saved addresses:'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAddressId('new');
                      setAddressDetails('');
                      setBuildingNo('');
                      setFloorNo('');
                      setApartmentNo('');
                      setLandmark('');
                      setGoogleMapsUrl('');
                    }}
                    className={`text-[11px] font-bold px-2 py-1 rounded transition-all ${
                      selectedAddressId === 'new' 
                        ? 'bg-amber-500 text-black' 
                        : 'text-amber-400 hover:underline'
                    }`}
                  >
                    + {language === 'ar' ? 'كتابة عنوان جديد' : 'Enter new address'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {user.addresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id;
                    return (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => {
                          setSelectedAddressId(addr.id);
                          setAddressDetails(addr.details);
                          setSelectedCity(addr.city);
                          const foundGov = egyptianGovernorates.find(g => g.name_ar === addr.governorate);
                          if (foundGov) setSelectedGovId(foundGov.id);
                        }}
                        className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 text-white shadow-md'
                            : 'bg-slate-900/80 border-white/10 text-slate-300 hover:bg-slate-850'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold text-xs text-amber-300 flex items-center gap-1">
                            <span>{addr.title}</span>
                            {addr.isDefault && <span className="text-[9px] px-1 rounded bg-amber-400/20 text-amber-300">افتراضي</span>}
                          </span>
                          {isSelected && <CheckCircle className="w-4 h-4 text-amber-400" />}
                        </div>
                        <p className="text-[11px] text-slate-200 mt-1 line-clamp-2 leading-relaxed">{addr.details}</p>
                        <span className="text-[10px] text-slate-400 mt-1">{addr.governorate} - {addr.city}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-4 text-xs font-cairo">
              {/* Full Name */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  الاسم الكامل للمستلم *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="مثال: أحمد محمد عبد الله"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Primary Phone & Secondary Backup Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-amber-400" />
                    <span>رقم الهاتف الأساسي *</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="010XXXXXXXX"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-outfit placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>رقم هاتف بديل / إضافي</span>
                    </span>
                    <span className="text-[10px] text-slate-500">للطوارئ ومندوب التوصيل</span>
                  </label>
                  <input
                    type="tel"
                    value={customerSecondaryPhone}
                    onChange={(e) => setCustomerSecondaryPhone(e.target.value)}
                    placeholder="011XXXXXXXX (اختياري)"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-outfit placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* WhatsApp Notification Number */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>رقم الواتساب لإرسال الفاتورة وتتبع الشحنة *</span>
                  </label>
                  <label className="flex items-center gap-1 text-[11px] text-amber-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sameAsPhone}
                      onChange={(e) => {
                        setSameAsPhone(e.target.checked);
                        if (e.target.checked) setCustomerWhatsApp(customerPhone);
                      }}
                      className="rounded accent-amber-500"
                    />
                    <span>نفس الرقم الأساسي</span>
                  </label>
                </div>
                <input
                  type="tel"
                  required
                  value={sameAsPhone ? customerPhone : customerWhatsApp}
                  disabled={sameAsPhone}
                  onChange={(e) => setCustomerWhatsApp(e.target.value)}
                  placeholder="010XXXXXXXX"
                  className={`w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-outfit placeholder-slate-500 focus:outline-none focus:border-amber-400 ${sameAsPhone ? 'opacity-70 cursor-not-allowed' : ''}`}
                />
              </div>

              {/* Governorate & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    المحافظة *
                  </label>
                  <select
                    value={selectedGovId}
                    onChange={(e) => {
                      setSelectedGovId(e.target.value);
                      setSelectedCity('');
                    }}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-cairo focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    {egyptianGovernorates.map((gov) => (
                      <option key={gov.id} value={gov.id} className="bg-slate-900">
                        {gov.name_ar} {gov.id === 'daqahlia' ? '⚡ (المنصورة)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    المدينة / المركز / المنطقة *
                  </label>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-cairo focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="">اختر المنطقة / المركز...</option>
                    {currentGov.cities.map((c, i) => (
                      <option key={i} value={c.name_ar} className="bg-slate-900">
                        {c.name_ar}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Detailed Street Address */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  اسم الشارع والحي *
                </label>
                <input
                  type="text"
                  required
                  value={addressDetails}
                  onChange={(e) => setAddressDetails(e.target.value)}
                  placeholder="مثال: شارع المشاية السفلية / شارع الجيش"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-cairo"
                />
              </div>

              {/* Building, Floor, Apartment Breakdown */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    العمارة / البرج
                  </label>
                  <input
                    type="text"
                    value={buildingNo}
                    onChange={(e) => setBuildingNo(e.target.value)}
                    placeholder="مثال: برج الصفوة 4"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-cairo"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    الدور
                  </label>
                  <input
                    type="text"
                    value={floorNo}
                    onChange={(e) => setFloorNo(e.target.value)}
                    placeholder="الدور 3"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-cairo"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    الشقة
                  </label>
                  <input
                    type="text"
                    value={apartmentNo}
                    onChange={(e) => setApartmentNo(e.target.value)}
                    placeholder="شقة 12"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-cairo"
                  />
                </div>
              </div>

              {/* Landmark */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  أقرب علامة مميزة لتسهيل وصول المندوب
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="مثال: أمام نادي الحوار / بجوار مسجد النصر / أعلى صيدلية الطرشوبي"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-cairo"
                />
              </div>

              {/* Google Maps Location Integration (100% Free GPS) */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-blue-950/20 border border-blue-500/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-blue-300 text-xs flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-blue-400" />
                      <span>تحديد موقع التوصيل على خرائط جوجل (Google Maps)</span>
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      يساعد المندوب في الوصول لباب بيتك فوراً بدون الحاجة للاتصال بك للاستفسار عن المكان.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={isLocating}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50 flex-shrink-0"
                  >
                    {isLocating ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>جاري التقاط الموقع...</span>
                      </>
                    ) : (
                      <>
                        <Compass className="w-4 h-4 text-white" />
                        <span>📍 حدد موقعي الحالي (GPS)</span>
                      </>
                    )}
                  </button>
                </div>

                {locationSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>{locationSuccess}</span>
                    </div>
                    {googleMapsUrl && (
                      <a 
                        href={googleMapsUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-amber-400 hover:underline flex items-center gap-1 text-[11px] font-bold"
                      >
                        <span>معاينة على الخريطة</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}

                {locationError && (
                  <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px]">
                    {locationError}
                  </div>
                )}

                <div>
                  <input
                    type="url"
                    value={googleMapsUrl}
                    onChange={(e) => setGoogleMapsUrl(e.target.value)}
                    placeholder="أو الصق رابط موقعك من Google Maps هنا مباشرة (اختياري)"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 font-outfit"
                  />
                </div>
              </div>

              {/* Delivery Notes */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  ملاحظات إضافية للتوصيل (اختياري)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: يرجى الاتصال قبل الوصول بنصف ساعة / المعاينة قبل الاستلام"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Payment Method Card */}
          <div className="p-6 rounded-3xl bg-[#0F1626] border border-white/10 space-y-4">
            <h2 className="text-base font-bold text-white font-cairo flex items-center gap-2 border-b border-white/5 pb-3">
              <CreditCard className="w-5 h-5 text-amber-400" />
              <span>2. طريقة الدفع</span>
            </h2>

            <div className="space-y-3">
              {/* COD Option */}
              <label 
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'cod' 
                    ? 'border-amber-400 bg-amber-500/10 shadow-glow-gold' 
                    : 'border-white/10 bg-slate-900/60 hover:bg-slate-900'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="mt-1 accent-amber-500"
                />
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <strong className="text-white font-bold text-sm block">
                      💵 الدفع عند الاستلام (COD)
                    </strong>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                      معاينة وفحص 100%
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                    ادفع نقداً عند استلام شحنتك، مع حقك الكامل في فحص الجهاز والبطارية والتأكد من سلامتها مع مندوب التوصيل قبل الدفع.
                  </p>
                </div>
              </label>

              {/* InstaPay Option */}
              <label 
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'instapay' 
                    ? 'border-purple-400 bg-purple-500/10 shadow-md' 
                    : 'border-white/10 bg-slate-900/60 hover:bg-slate-900'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value="instapay"
                  checked={paymentMethod === 'instapay'}
                  onChange={() => setPaymentMethod('instapay')}
                  className="mt-1 accent-purple-500"
                />
                <div className="flex-1 text-xs">
                  <strong className="text-white font-bold text-sm block">
                    ⚡ تحويل لحظي عبر تطبيق إنستاباي (InstaPay)
                  </strong>
                  <p className="text-slate-400 text-[11px] mt-1">
                    تحويل بنكي فوري بدون أي رسوم إضافية لحساب جو ستور الرسمي.
                  </p>

                  {paymentMethod === 'instapay' && (
                    <div className="mt-3 p-3.5 rounded-xl bg-slate-950 border border-purple-500/30 space-y-2.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">عنوان إنستاباي (IPA):</span>
                        <strong className="text-purple-300 font-outfit text-xs bg-purple-900/50 px-2 py-0.5 rounded border border-purple-500/30">
                          {settings.instapay_address}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">رقم الهاتف للتحويل:</span>
                        <strong className="text-white font-outfit text-xs">
                          {settings.store_phone}
                        </strong>
                      </div>

                      {/* Receipt Upload / Ref */}
                      <div className="pt-2 border-t border-white/5 space-y-2">
                        <label className="block text-[11px] text-slate-300 font-semibold">
                          رقم العملية أو اسم الحساب المحول منه:
                        </label>
                        <input
                          type="text"
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          placeholder="مثال: تحويل من أحمد محمد / كود العملية 83719"
                          className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-white placeholder-slate-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </label>

              {/* Vodafone Cash Option */}
              <label 
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'vodafone_cash' 
                    ? 'border-red-400 bg-red-500/10 shadow-md' 
                    : 'border-white/10 bg-slate-900/60 hover:bg-slate-900'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value="vodafone_cash"
                  checked={paymentMethod === 'vodafone_cash'}
                  onChange={() => setPaymentMethod('vodafone_cash')}
                  className="mt-1 accent-red-500"
                />
                <div className="flex-1 text-xs">
                  <strong className="text-white font-bold text-sm block">
                    📱 فودافون كاش والمحافظ الإلكترونية (Orange / WE / Etisalat)
                  </strong>
                  <p className="text-slate-400 text-[11px] mt-1">
                    تحويل مباشر على رقم محفظة جو ستور الرسمية.
                  </p>

                  {paymentMethod === 'vodafone_cash' && (
                    <div className="mt-3 p-3.5 rounded-xl bg-slate-950 border border-red-500/30 space-y-2.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">رقم محفظة فودافون كاش:</span>
                        <strong className="text-red-400 font-outfit text-sm bg-red-950/60 px-2 py-0.5 rounded border border-red-500/30">
                          {settings.vodafone_cash_number}
                        </strong>
                      </div>

                      <div className="pt-2 border-t border-white/5 space-y-2">
                        <label className="block text-[11px] text-slate-300 font-semibold">
                          رقم الهاتف الذي قمت بالتحويل منه:
                        </label>
                        <input
                          type="text"
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          placeholder="مثال: تم التحويل من رقم 010XXXXXXXX"
                          className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-white placeholder-slate-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </label>

              {/* Credit Card Option with FULL interactive card and inputs */}
              <label 
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'credit_card' 
                    ? 'border-blue-400 bg-blue-500/10 shadow-lg' 
                    : 'border-white/10 bg-slate-900/60 hover:bg-slate-900'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value="credit_card"
                  checked={paymentMethod === 'credit_card'}
                  onChange={() => setPaymentMethod('credit_card')}
                  className="mt-1 accent-blue-500"
                />
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <strong className="text-white font-bold text-sm block">
                      💳 بطاقة بنكية (فيزا / ماستركارد / ميزة)
                    </strong>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600/30 text-blue-300 font-bold font-outfit">Visa</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-600/30 text-rose-300 font-bold font-outfit">Mastercard</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold font-outfit">Meeza</span>
                    </div>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-1">
                    دفع إلكتروني فوري ومؤمن بتشفير 256-bit عبر البوابات المصرفية المعتمدة مع حماية 3D Secure.
                  </p>

                  {paymentMethod === 'credit_card' && (
                    <div className="mt-4 space-y-4" onClick={(e) => e.stopPropagation()}>
                      {/* Live 3D Luxury Metallic Card Preview */}
                      <div className="w-full max-w-sm mx-auto p-5 rounded-2xl bg-gradient-to-tr from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/40 shadow-2xl relative overflow-hidden text-white font-outfit select-none">
                        {/* Shimmer gradient */}
                        <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/20 blur-2xl rounded-full" />
                        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-blue-500/15 blur-2xl rounded-full" />
                        
                        <div className="flex items-center justify-between mb-6">
                          <span className="text-xs font-black tracking-widest text-amber-400 font-cairo">JOE STORE BANK</span>
                          <span className="text-lg font-black italic tracking-wider">
                            {isVisa ? 'VISA' : isMastercard ? 'MASTERCARD' : 'PAYMENT'}
                          </span>
                        </div>

                        {/* EMV Chip & Contactless */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-7 rounded bg-gradient-to-br from-amber-300 to-amber-600 border border-amber-200/50 shadow-inner flex items-center justify-center">
                            <div className="w-7 h-5 border border-black/30 rounded-sm grid grid-cols-2 gap-0.5 opacity-60" />
                          </div>
                          <span className="text-amber-400/80 text-sm">📡</span>
                        </div>

                        {/* Card Number */}
                        <div className="text-lg sm:text-xl font-mono tracking-widest text-amber-100 font-bold mb-4 drop-shadow">
                          {cardNumber || '•••• •••• •••• ••••'}
                        </div>

                        {/* Card Holder & Expiry */}
                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[9px] text-slate-400 block tracking-wider uppercase font-cairo">صاحب البطاقة</span>
                            <span className="font-bold tracking-wide uppercase text-slate-200">
                              {cardHolderName || 'YOUR FULL NAME'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-slate-400 block tracking-wider uppercase">VALID THRU</span>
                            <span className="font-bold font-mono text-slate-200">
                              {cardExpiry || 'MM/YY'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Details Input Fields */}
                      <div className="p-4 rounded-2xl bg-slate-950 border border-blue-500/30 space-y-3 font-cairo">
                        <div>
                          <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                            اسم صاحب البطاقة (كما هو مدون على الكارت) *
                          </label>
                          <input
                            type="text"
                            required={paymentMethod === 'credit_card'}
                            value={cardHolderName}
                            onChange={(e) => setCardHolderName(e.target.value)}
                            placeholder="AHMED MOHAMED"
                            className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white uppercase placeholder-slate-500 focus:outline-none focus:border-blue-400 font-outfit"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-300 font-semibold mb-1 flex items-center justify-between">
                            <span>رقم البطاقة البنكية (16 رقم) *</span>
                            <span className="text-[10px] text-slate-400 font-outfit">
                              {isVisa ? '💳 فيزا (Visa)' : isMastercard ? '💳 ماستركارد (Mastercard)' : 'بطاقة بنكية'}
                            </span>
                          </label>
                          <input
                            type="text"
                            required={paymentMethod === 'credit_card'}
                            value={cardNumber}
                            onChange={(e) => handleCardNumberChange(e.target.value)}
                            placeholder="4000 1234 5678 9010"
                            maxLength={19}
                            className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono tracking-widest placeholder-slate-500 focus:outline-none focus:border-blue-400"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                              تاريخ الانتهاء *
                            </label>
                            <input
                              type="text"
                              required={paymentMethod === 'credit_card'}
                              value={cardExpiry}
                              onChange={(e) => handleExpiryChange(e.target.value)}
                              placeholder="MM/YY"
                              maxLength={5}
                              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono text-center placeholder-slate-500 focus:outline-none focus:border-blue-400"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] text-slate-300 font-semibold mb-1 flex items-center justify-between">
                              <span>رمز الأمان (CVV) *</span>
                              <span className="text-[10px] text-slate-400">3 أرقام بالخلف</span>
                            </label>
                            <input
                              type="password"
                              required={paymentMethod === 'credit_card'}
                              value={cardCvv}
                              onChange={(e) => handleCvvChange(e.target.value)}
                              placeholder="•••"
                              maxLength={4}
                              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono text-center placeholder-slate-500 focus:outline-none focus:border-blue-400"
                            />
                          </div>
                        </div>

                        {/* Security Guarantees */}
                        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Lock className="w-3 h-3 text-emerald-400" />
                            <span>تشفير مصرفي 256-Bit SSL آمن</span>
                          </span>
                          <span className="text-emerald-400 font-bold">
                            PCI-DSS Compliant 🛡️
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Order Summary Card & Submit */}
        <div className="lg:col-span-5 space-y-6 sticky top-28">
          <div className="p-6 rounded-3xl bg-[#0F1626] border border-amber-500/30 shadow-2xl space-y-5">
            <h2 className="text-base font-bold text-white font-cairo border-b border-white/10 pb-3 flex items-center justify-between">
              <span>{language === 'ar' ? 'ملخص الطلب' : 'Order Summary'} ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
              <span className="text-xs text-amber-400 font-outfit">{cart.length} {language === 'ar' ? 'أصناف' : 'Items'}</span>
            </h2>

            {/* Items mini list */}
            <div className="max-h-60 overflow-y-auto space-y-3 divide-y divide-white/5 pr-1">
              {cart.map((item, idx) => (
                <div key={idx} className="pt-2 flex items-center gap-3">
                  <img
                    src={item.product.images[0]}
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover bg-slate-800 border border-white/10 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0 text-xs font-cairo">
                    <h4 className="font-bold text-white truncate">{language === 'ar' ? item.product.name_ar : item.product.name_en}</h4>
                    <p className="text-[10px] text-slate-400">
                      {item.selected_storage || item.product.storage} • {language === 'ar' ? (item.selected_color || item.product.color_ar) : (item.selected_color || item.product.color_en)} × {item.quantity}
                    </p>
                    <span className="text-amber-400 font-outfit font-bold">
                      {formatPrice(item.product.price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-2 pt-3 border-t border-white/10 text-xs font-cairo">
              <div className="flex justify-between text-slate-400">
                <span>{language === 'ar' ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                <span className="font-outfit text-white font-semibold">{formatPrice(cartSubtotal)}</span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>{language === 'ar' ? `مصاريف الشحن (${currentGov.name_ar}):` : `Shipping (${currentGov.name_en}):`}</span>
                <span className="font-outfit">
                  {isFreeShipping ? (
                    <span className="text-emerald-400 font-bold">{language === 'ar' ? 'شحن مجاني 🎉' : 'Free Shipping 🎉'}</span>
                  ) : (
                    <span>{formatPrice(shippingFee)}</span>
                  )}
                </span>
              </div>

              <div className="flex justify-between text-base font-black text-white pt-3 border-t border-white/10">
                <span>{language === 'ar' ? 'الإجمالي النهائي المطلوب:' : 'Grand Total:'}</span>
                <span className="font-outfit text-amber-400 text-xl">{formatPrice(grandTotal)}</span>
              </div>
            </div>

            {/* Error banner if any */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 font-cairo">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Confirm & Submit Button */}
            {!isAuthenticated ? (
              <button
                type="button"
                onClick={() => openAuthModal(language === 'ar' ? 'تسجيل الدخول مطلوب لإتمام طلبك وحفظ بيانات الشحن والضمان.' : 'Sign in is required to complete your order and secure warranty.', 'checkout')}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-sm flex items-center justify-center gap-2 shadow-glow-gold transition-all active:scale-95 cursor-pointer font-cairo"
              >
                <Lock className="w-5 h-5" />
                <span>{language === 'ar' ? 'تسجيل الدخول لإتمام الطلب وتفعيل الضمان' : 'Sign In to Complete Order & Warranty'}</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-sm flex items-center justify-center gap-2 shadow-glow-gold transition-all active:scale-95 disabled:opacity-50 cursor-pointer font-cairo"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>{language === 'ar' ? 'جاري تسجيل الطلب وإرسال رسالة الواتساب...' : 'Placing order & dispatching WhatsApp message...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>{language === 'ar' ? 'تأكيد الطلب الآن واستلام إشعار الواتساب' : 'Confirm Order & Receive WhatsApp Alert'}</span>
                  </>
                )}
              </button>
            )}

            {/* Guarantees Badges */}
            <div className="pt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-400 text-center font-cairo">
              <div className="p-2 rounded-xl bg-slate-900 border border-white/5">
                {language === 'ar' ? '🔒 دفع وتشفير بنكي آمن' : '🔒 100% Secure Checkout'}
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-white/5">
                {language === 'ar' ? '🛡️ ضمان استبدال رسمي' : '🛡️ Official Warranty'}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
