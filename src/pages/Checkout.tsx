import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Check,
  Tag,
  X,
  Gift,
  ShoppingCart,
  Map as MapIcon,
  Navigation,
  Wallet
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { egyptianGovernorates, findAddressGovernorate } from '../data/governorates';
import { DeliveryAddressFields, PaymentMethod, DiscountCoupon } from '../types';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';
import { DetailedAddressFields } from '../components/DetailedAddressFields';
import { InfoButton, useDetails } from '../components/DetailsDialog';
import { productDetail } from '../utils/detailModels';
import { normalizeProductImage } from '../utils/imageUrl';
import { buildAddressDetails, formatDeliveryAddress, pickDeliveryFields, normalizeDigits, normalizePhone, isEgyptianPhone, isGoogleMapsUrl, coordsToGoogleMapsUrl } from '../utils/deliveryAddress';
import { reverseGeocodeCoords } from '../utils/egyptLocation';
import { trackMetaEvent } from '../utils/metaPixel';
import { getOrCaptureVisitorAttribution } from '../utils/visitorAttribution';
import { neonDb } from '../services/neonDb';

const LocationPickerMap = React.lazy(() =>
  import('../components/LocationPickerMap').then(m => ({ default: m.LocationPickerMap }))
);

export const Checkout: React.FC = () => {
  const { cart, cartSubtotal, createOrder, navigate, settings, updateSettings, isOfflineCatalog, sessionId } = useStore();
  const { t, language, formatPrice, isRTL } = useLanguage();
  const { openDetails } = useDetails();
  const { user, isAuthenticated, openAuthModal, addAddress } = useAuth();
  const gateway = settings.payment_gateway_public;

  // Selected Address from profile or 'new'
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');

  // Customer Contact States
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [customerSecondaryPhone, setCustomerSecondaryPhone] = useState('');
  const [customerWhatsApp, setCustomerWhatsApp] = useState(user?.phone || '');
  const [sameAsPhone, setSameAsPhone] = useState(true);
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');

  // Discount Coupon States
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<DiscountCoupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  // Address Breakdown States
  const [selectedGovId, setSelectedGovId] = useState(egyptianGovernorates[0].id);
  const [customCity, setCustomCity] = useState(false);
  const [selectedCity, setSelectedCity] = useState('');
  const [addressDetails, setAddressDetails] = useState('');
  const [delivery, setDelivery] = useState<DeliveryAddressFields>({ address_type: 'home' });
  const { district = '', street = '', building_no: buildingNo = '', floor_no: floorNo = '', apartment_no: apartmentNo = '', landmark = '' } = delivery;
  const [saveAddress, setSaveAddress] = useState(false);
  const loadedAddressFor = useRef<string | null>(null);
  const [notes, setNotes] = useState('');

  // Google Maps GPS & Interactive Map Picker States
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState('');
  const [locationError, setLocationError] = useState('');

  // Payment States
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [paymentReference, setPaymentReference] = useState('');
  const [receiptImage, setReceiptImage] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [policyError, setPolicyError] = useState(false);

  // Pre-fill user data when user changes
  useEffect(() => {
    if (user) {
      if (!customerName) setCustomerName(user.name);
      if (!customerPhone) setCustomerPhone(user.phone);
      if (!customerWhatsApp) setCustomerWhatsApp(user.phone);
      if (!customerEmail && user.email) setCustomerEmail(user.email);

      if (user.addresses?.length && loadedAddressFor.current !== user.id) {
        loadedAddressFor.current = user.id;
        const defaultAddr = user.addresses.find(a => a.isDefault) || user.addresses[0];
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
          setDelivery(pickDeliveryFields(defaultAddr));
          setGoogleMapsUrl(defaultAddr.google_maps_url || '');
          setAddressDetails(defaultAddr.extra_details || (defaultAddr.street ? '' : defaultAddr.details));
          setSelectedCity(defaultAddr.city);
          const foundGov = findAddressGovernorate(defaultAddr.governorate, defaultAddr.city);
          setSelectedGovId(foundGov?.id || '');
          setCustomCity(false);
        }
      }
    }
  }, [user]);

  if (cart.length === 0) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mx-auto">
          <ShoppingCart className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 font-cairo">عربة التسوق فارغة</h2>
        <p className="text-xs text-slate-600 font-cairo">
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

  // Dynamic Cities list (defaults from currentGov + custom_cities - disabled_cities)
  const availableCities = useMemo(() => {
    if (!currentGov) return [];
    let list = [...currentGov.cities];
    if (settings.custom_cities && settings.custom_cities.length > 0) {
      const added = settings.custom_cities
        .filter(c => c.governorate_id === currentGov.id)
        .map(c => ({ name_ar: c.name_ar, name_en: c.name_en || c.name_ar }));
      list = [...list, ...added];
    }
    if (settings.disabled_cities && settings.disabled_cities.length > 0) {
      list = list.filter(c => !settings.disabled_cities!.includes(c.name_ar));
    }
    return list;
  }, [currentGov, settings.custom_cities, settings.disabled_cities]);

  // Dynamic Shipping Fee calculation (City-specific > Governorate-specific > Base Default)
  const isFreeShipping = cartSubtotal >= (settings.free_shipping_threshold ?? 2500);
  const shippingFee = useMemo(() => {
    if (isFreeShipping) return 0;
    if (settings.custom_shipping_rates && settings.custom_shipping_rates.length > 0) {
      if (selectedCity) {
        const cityRate = settings.custom_shipping_rates.find(
          r => r.governorate_id === selectedGovId && r.city_name === selectedCity && r.is_active !== false
        );
        if (cityRate) return cityRate.shipping_fee;
      }
      const govRate = settings.custom_shipping_rates.find(
        r => r.governorate_id === selectedGovId && (!r.city_name || r.city_name === '*') && r.is_active !== false
      );
      if (govRate) return govRate.shipping_fee;
    }
    return currentGov.shipping_fee ?? settings.shipping_fee_default ?? 35;
  }, [isFreeShipping, settings.custom_shipping_rates, settings.shipping_fee_default, selectedGovId, selectedCity, currentGov]);

  // Discount Calculation based on applied coupon
  const couponDiscount = useMemo(() => {
    if (!appliedCoupon) return 0;
    let disc = 0;
    if (appliedCoupon.discount_type === 'percentage') {
      disc = (cartSubtotal * appliedCoupon.discount_value) / 100;
      if (appliedCoupon.max_discount_amount) {
        disc = Math.min(disc, appliedCoupon.max_discount_amount);
      }
    } else {
      disc = Math.min(cartSubtotal, appliedCoupon.discount_value);
    }
    return Math.round(disc);
  }, [appliedCoupon, cartSubtotal]);

  const grandTotal = Math.max(0, cartSubtotal - couponDiscount + shippingFee);

  // Coupon Handlers
  const handleApplyCoupon = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCouponError('');
    setCouponSuccess('');
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponError(language === 'ar' ? 'يرجى كتابة كود الخصم.' : 'Please enter coupon code.');
      return;
    }
    const found = (settings.coupons || []).find(
      (c) => c.code.trim().toUpperCase() === code && c.is_active !== false
    );
    if (!found) {
      setCouponError(language === 'ar' ? 'كود الخصم غير صحيح أو غير متاح حالياً.' : 'Invalid or inactive coupon code.');
      return;
    }
    if (found.min_order_amount && cartSubtotal < found.min_order_amount) {
      setCouponError(
        language === 'ar'
          ? `الحد الأدنى لقيمة المنتجات لتفعيل هذا الكود هو ${formatPrice(found.min_order_amount)}.`
          : `Minimum order amount for this coupon is ${formatPrice(found.min_order_amount)}.`
      );
      return;
    }
    // Check if user already used this coupon
    const userIdentifier = user?.id || user?.email || normalizePhone(customerPhone) || '';
    const alreadyUsed = (found.used_by || []).some((id) =>
      (user?.id && id === user.id) ||
      (user?.email && id.toLowerCase() === user.email.toLowerCase()) ||
      (customerPhone && id === normalizePhone(customerPhone))
    );
    if (alreadyUsed) {
      setCouponError(
        language === 'ar'
          ? 'عذراً، لقد تم استخدام كود الخصم هذا مسبقاً بواسطة هذا الحساب.'
          : 'This coupon has already been redeemed by your account.'
      );
      return;
    }
    setAppliedCoupon(found);
    setCouponSuccess(
      language === 'ar'
        ? `تم تطبيق الخصم بنجاح! كود (${found.code})`
        : `Coupon (${found.code}) applied successfully!`
    );
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponSuccess('');
    setCouponError('');
  };

  const handlePhoneChange = (val: string) => {
    setCustomerPhone(val);
    if (sameAsPhone) {
      setCustomerWhatsApp(val);
    }
  };

  // Early guest/customer capture + InitiateCheckout Pixel
  useEffect(() => {
    if (cart.length > 0) {
      trackMetaEvent('InitiateCheckout', {
        value: cartSubtotal,
        currency: 'EGP',
        num_items: cart.reduce((s, i) => s + i.quantity, 0),
        content_ids: cart.map(i => i.product.id)
      });
    }
  }, []);

  useEffect(() => {
    if (!customerPhone.trim() && !customerName.trim()) return;
    const timer = window.setTimeout(() => {
      neonDb.syncActiveCart({
        sessionId,
        customerId: user?.id,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        items: cart,
        subtotal: cartSubtotal,
        attribution: getOrCaptureVisitorAttribution()
      }).catch(() => {});
    }, 900);
    return () => window.clearTimeout(timer);
  }, [customerName, customerPhone, sessionId, user?.id, cart, cartSubtotal]);

  const applySelectedCoordinates = async (lat: number, lng: number, source: 'gps' | 'map') => {
    const url = coordsToGoogleMapsUrl(lat, lng);
    setLatitude(lat);
    setLongitude(lng);
    setGoogleMapsUrl(url);
    setLocationError('');
    setLocationSuccess(
      language === 'ar'
        ? `${source === 'gps' ? 'تم التقاط موقعك تلقائياً' : 'تم تثبيت الدبوس على الخريطة'} (${lat.toFixed(4)}, ${lng.toFixed(4)})`
        : `${source === 'gps' ? 'Location acquired automatically' : 'Map pin set'} (${lat.toFixed(4)}, ${lng.toFixed(4)})`
    );

    const rev = await reverseGeocodeCoords(lat, lng);
    if (rev.governorate) {
      setSelectedGovId(rev.governorate.id);
      if (rev.city) {
        const govCities = rev.governorate.cities || [];
        const revCityLower = rev.city.toLowerCase();
        const matchedCity = govCities.find(
          c =>
            c.name_ar.includes(rev.city!) ||
            rev.city!.includes(c.name_ar) ||
            (c.name_en && (c.name_en.toLowerCase().includes(revCityLower) || revCityLower.includes(c.name_en.toLowerCase())))
        );
        if (matchedCity) {
          setSelectedCity(matchedCity.name_ar);
          setCustomCity(false);
        } else {
          setSelectedCity(rev.city);
          setCustomCity(true);
        }
      }
    }
    setDelivery(prev => ({
      ...prev,
      district: prev.district?.trim() ? prev.district : (rev.district || prev.district),
      street: prev.street?.trim() ? prev.street : (rev.street || prev.street)
    }));
  };

  // Free Google Maps GPS Location Fetcher (Auto GPS + Open Interactive Map Fallback)
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setShowMapPicker(true);
      setLocationError(
        language === 'ar'
          ? 'المتصفح لا يدعم GPS التلقائي — يمكنك تحديد موقعك يدوياً من الخريطة التفاعلية بالأسفل.'
          : 'Geolocation unavailable — pin your location manually on the map below.'
      );
      return;
    }
    setIsLocating(true);
    setLocationError('');
    setLocationSuccess('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        void applySelectedCoordinates(pos.coords.latitude, pos.coords.longitude, 'gps');
      },
      () => {
        setIsLocating(false);
        setShowMapPicker(true);
        setLocationError(
          language === 'ar'
            ? 'تعذر التقاط GPS تلقائياً — يمكنك الضغط مباشرة على الخريطة لتحديد مكان التوصيل بدقة.'
            : 'Could not read GPS automatically — click directly on the map below to pin your location.'
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

    if (isOfflineCatalog || navigator.onLine === false) {
      setErrorMsg(language==='ar'?'اتصل بالإنترنت وحدّث الكتالوج قبل تأكيد الطلب. سلتك محفوظة.':'Reconnect and refresh the catalog before confirming. Your cart is saved.');return;
    }

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
    if (!isEgyptianPhone(customerPhone)) {
      setErrorMsg(language === 'ar' ? 'يرجى إدخال رقم هاتف مصري صحيح للتواصل.' : 'Please enter a valid phone number.');
      return;
    }
    const finalWhatsApp = sameAsPhone ? customerPhone : customerWhatsApp;
    if (!isEgyptianPhone(finalWhatsApp)) {
      setErrorMsg(language === 'ar' ? 'يرجى تحديد رقم الواتساب لإرسال تفاصيل الشحنة.' : 'Please provide WhatsApp number for shipment tracking.');
      return;
    }
    if (!selectedGovId || !selectedCity.trim() || (!street.trim() && !addressDetails.trim()) || (selectedAddressId === 'new' && !district.trim())) {
      setErrorMsg(language === 'ar' ? 'يرجى اختيار المدينة وكتابة الحي واسم الشارع بالتفصيل.' : 'Please enter your street name and area.');
      return;
    }

    if (customerSecondaryPhone.trim() && !isEgyptianPhone(customerSecondaryPhone)) {
      setErrorMsg(language === 'ar' ? 'رقم الهاتف البديل غير صحيح.' : 'The alternative phone number is invalid.'); return;
    }
    if (delivery.postal_code && !/^\d{5}$/.test(normalizeDigits(delivery.postal_code))) {
      setErrorMsg(language === 'ar' ? 'الرمز البريدي يتكون من 5 أرقام.' : 'Postal code must contain five digits.'); return;
    }
    if (!isGoogleMapsUrl(googleMapsUrl)) {
      setErrorMsg(language === 'ar' ? 'يرجى إدخال رابط صحيح من Google Maps.' : 'Please enter a valid Google Maps link.'); return;
    }
    if (!acceptedPolicies) {
      setPolicyError(true);
      setErrorMsg(
        language === 'ar'
          ? 'يجب الموافقة على جميع الشروط والسياسات وملفات تعريف الارتباط (Cookies) أولاً قبل تأكيد الطلب.'
          : 'You must accept the terms, privacy, return/shipping policies, and cookies notice before placing your order.'
      );
      return;
    }
    if (paymentMethod === 'credit_card' && !gateway?.methods?.card) {
      setErrorMsg(language === 'ar' ? 'الدفع بالبطاقة البنكية أونلاين غير مفعل حالياً.' : 'Online card payment is currently unavailable.');
      return;
    }
    setIsSubmitting(true);

    try {
      if (saveAddress && selectedAddressId === 'new') {
        const saved = await addAddress({ ...delivery, extra_details: addressDetails, google_maps_url: googleMapsUrl || undefined,
          latitude, longitude,
          title: delivery.address_type === 'work' ? 'العمل' : delivery.address_type === 'other' ? 'عنوان آخر' : 'المنزل',
          governorate: currentGov.name_ar, city: selectedCity, details: buildAddressDetails(delivery, addressDetails),
          isDefault: !user?.addresses?.length });
        if (!saved.success) throw new Error(saved.error || 'تعذّر حفظ العنوان.');
      }

      const order = await createOrder({
        ...pickDeliveryFields(delivery),
        extra_details: addressDetails || undefined,
        postal_code: delivery.postal_code ? normalizeDigits(delivery.postal_code) : undefined,
        customer_name: customerName.trim(),
        customer_phone: normalizePhone(customerPhone),
        customer_whatsapp: normalizePhone(finalWhatsApp),
        customer_email: customerEmail || undefined,
        customer_secondary_phone: customerSecondaryPhone ? normalizePhone(customerSecondaryPhone) : undefined,
        governorate: currentGov.name_ar,
        city: selectedCity.trim(),
        address_details: buildAddressDetails(delivery, addressDetails),
        building_no: buildingNo || undefined,
        floor_no: floorNo || undefined,
        apartment_no: apartmentNo || undefined,
        landmark: landmark || undefined,
        google_maps_url: googleMapsUrl || undefined,
        latitude,
        longitude,
        session_id: sessionId,
        notes: notes || undefined,
        items: cart,
        subtotal: cartSubtotal,
        shipping_fee: shippingFee,
        discount: couponDiscount,
        coupon_code: appliedCoupon ? appliedCoupon.code : undefined,
        total: grandTotal,
        payment_method: paymentMethod,
        payment_status: 'unpaid',
        payment_receipt_url: receiptImage || undefined,
        payment_reference: paymentReference || undefined,
        order_status: 'pending',
      });

      // Mark the coupon as redeemed by this user so it expires for their account
      if (appliedCoupon) {
        const userIdentifier = user?.id || user?.email || normalizePhone(customerPhone) || 'customer';
        const currentCoupons = settings.coupons || [];
        const updatedCoupons = currentCoupons.map((cp) => {
          if (cp.code.toUpperCase() === appliedCoupon.code.toUpperCase()) {
            return {
              ...cp,
              used_by: Array.from(new Set([...(cp.used_by || []), userIdentifier]))
            };
          }
          return cp;
        });
        updateSettings({ coupons: updatedCoupons });
      }

      if (order.checkout_url && typeof window !== 'undefined') {
        window.location.assign(order.checkout_url);
        return;
      }

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
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-cairo flex items-center gap-2">
          <span>{t('checkoutTitle')}</span>
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
        </h1>
        <p className="text-xs text-slate-600 font-cairo mt-1">
          {language === 'ar'
            ? 'أدخل بيانات التوصيل الدقيقة واختر طريقة الدفع المناسبة لاستلام طلبك فوراً مع شهادة الضمان'
            : 'Enter precise delivery details and select your preferred payment method.'}
        </p>
      </div>

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* VIP Auth Requirement Banner */}
        {!isAuthenticated ? (
          <div className="lg:col-span-12 p-6 rounded-3xl bg-gradient-to-r from-amber-500/15 via-white to-amber-500/10 border-2 border-amber-500/40 shadow-xl space-y-4 font-cairo">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-amber-700" />
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    {language === 'ar' ? 'تسجيل الدخول مطلوب لإتمام هذا الطلب' : 'Sign in required to place this order'}
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 text-[10px] font-bold">
                    {language === 'ar' ? 'حفظ الضمان والبيانات' : 'Warranty & Invoices'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {language === 'ar'
                    ? 'تسجيل الدخول يتيح لك تفعيل شهادة الضمان المعتمدة لجهازك، متابعة حالة الشحنة بالواتساب، واسترجاع عناوينك المحفوظة.'
                    : 'Signing in secures your warranty certificate, automated WhatsApp tracking, and saves your delivery address.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => openAuthModal(undefined, 'checkout')}
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
              <CheckCircle className="w-5 h-5 text-emerald-700" />
              <div>
                <span className="text-slate-900 font-bold">{language === 'ar' ? 'طلبك مسجل باسم العميل:' : 'Order registered to:'} {user?.name}</span>
                <span className="text-slate-600 text-[11px] block">{user?.email} • {user?.phone}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('profile')}
              className="text-amber-700 hover:underline font-bold"
            >
              {language === 'ar' ? 'عرض ملفي الشخصي' : 'View Profile'}
            </button>
          </div>
        )}

        {/* Left 7 Columns: Shipping Info & Payment Methods */}
        <div className="lg:col-span-7 space-y-6">

          {/* Step 1: Recipient & Shipping Information */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-5">
            <h2 className="text-base font-bold text-slate-900 font-cairo flex items-center gap-2 border-b border-slate-200 pb-3">
              <Truck className="w-5 h-5 text-amber-700" />
              <span>{language === 'ar' ? '1. بيانات المستلم وعنوان التوصيل' : '1. Recipient & Shipping Address'}</span>
            </h2>

            {/* Saved Addresses Picker for Logged-In Users */}
            {user?.addresses && user.addresses.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3 font-cairo">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-700 text-xs flex items-center gap-1.5">
                    <Home className="w-4 h-4 text-amber-700" />
                    {language === 'ar' ? 'اختر من عناوينك المسجلة:' : 'Select from saved addresses:'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAddressId('new');
                      setAddressDetails('');
                      setDelivery({ address_type: 'home' });
                      setSelectedCity('');
                      setCustomCity(false);
                      setGoogleMapsUrl('');
                    }}
                    className={`text-[11px] font-bold px-2 py-1 rounded transition-all ${
                      selectedAddressId === 'new'
                        ? 'bg-amber-500 text-black'
                        : 'text-amber-700 hover:underline'
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
                          setDelivery(pickDeliveryFields(addr));
                          setGoogleMapsUrl(addr.google_maps_url || '');
                          setAddressDetails(addr.extra_details || (addr.street ? '' : addr.details));
                          setSelectedCity(addr.city);
                          const foundGov = findAddressGovernorate(addr.governorate, addr.city);
                          setSelectedGovId(foundGov?.id || '');
          setCustomCity(false);
                        }}
                        className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 text-slate-900 shadow-md'
                            : 'bg-slate-100/80 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold text-xs text-amber-700 flex items-center gap-1">
                            <span>{addr.title}</span>
                            {addr.isDefault && <span className="text-[9px] px-1 rounded bg-amber-400/20 text-amber-700">افتراضي</span>}
                          </span>
                          {isSelected && <CheckCircle className="w-4 h-4 text-amber-700" />}
                        </div>
                        <p className="text-[11px] text-slate-800 mt-1 line-clamp-2 leading-relaxed">{addr.details}</p>
                        <span className="text-[10px] text-slate-600 mt-1">{addr.governorate} - {addr.city}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-4 text-xs font-cairo">
              {/* Full Name */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  الاسم الكامل للمستلم *
                </label>
                <input
                  type="text"
                  required
                  autoComplete="name" aria-label="الاسم الكامل للمستلم" value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="مثال: أحمد محمد عبد الله"
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Primary Phone & Secondary Backup Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-amber-700" />
                    <span>رقم الهاتف الأساسي *</span>
                  </label>
                  <input
                    type="tel"
                    required
                    autoComplete="tel" dir="ltr" aria-label="رقم الهاتف الأساسي" value={customerPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="010XXXXXXXX"
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-outfit placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-600" />
                      <span>رقم هاتف بديل / إضافي</span>
                    </span>
                    <span className="text-[10px] text-slate-500">للطوارئ ومندوب التوصيل</span>
                  </label>
                  <input
                    type="tel"
                    dir="ltr" aria-label="رقم الهاتف البديل" value={customerSecondaryPhone}
                    onChange={(e) => setCustomerSecondaryPhone(e.target.value)}
                    placeholder="011XXXXXXXX (اختياري)"
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-outfit placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* WhatsApp Notification Number */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-600 font-semibold flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                    <span>رقم الواتساب لإرسال الفاتورة وتتبع الشحنة *</span>
                  </label>
                  <label className="flex items-center gap-1 text-[11px] text-amber-700 cursor-pointer">
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
                  dir="ltr" aria-label="رقم الواتساب" value={sameAsPhone ? customerPhone : customerWhatsApp}
                  disabled={sameAsPhone}
                  onChange={(e) => setCustomerWhatsApp(e.target.value)}
                  placeholder="010XXXXXXXX"
                  className={`w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-outfit placeholder-slate-500 focus:outline-none focus:border-amber-400 ${sameAsPhone ? 'opacity-70 cursor-not-allowed' : ''}`}
                />
              </div>

              {/* Governorate & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    المحافظة *
                  </label>
                  <select
                    required
                    aria-label={language === 'ar' ? 'المحافظة' : 'Governorate'}
                    value={selectedGovId}
                    onChange={(e) => {
                      setSelectedGovId(e.target.value);
                      setSelectedCity('');
                      setCustomCity(false);
                    }}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-cairo focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="">اختر المحافظة...</option>
                    {egyptianGovernorates.map((gov) => (
                      <option key={gov.id} value={gov.id} className="bg-slate-100">
                        {gov.name_ar} {gov.id === 'daqahlia' ? '(المنصورة ومراكزها)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    المدينة / المركز / المنطقة *
                  </label>
                  <select
                    aria-label={language === 'ar' ? 'المدينة / المركز' : 'City'}
                    required
                    value={customCity ? '__other__' : selectedCity}
                    onChange={(e) => { if (e.target.value === '__other__') { setCustomCity(true); setSelectedCity(''); } else { setSelectedCity(e.target.value); } }}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-cairo focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="">اختر المنطقة / المركز...</option>
                    {selectedCity && !availableCities.some(c => c.name_ar === selectedCity) && <option value={selectedCity}>{selectedCity}</option>}
                    <option value="__other__">اكتب مدينة / قرية أخرى</option>
                    {availableCities.map((c, i) => (
                      <option key={i} value={c.name_ar} className="bg-slate-100">
                        {c.name_ar}
                      </option>
                    ))}
                  </select>
                  {customCity && <input required aria-label="اسم المدينة أو القرية" value={selectedCity} maxLength={100} onChange={e => setSelectedCity(e.target.value)} placeholder="اكتب اسم المدينة / القرية" className="w-full mt-2 bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900" />}
                </div>
              </div>

              <DetailedAddressFields value={delivery} onChange={setDelivery} language={language} requiredStreet={selectedAddressId === 'new' || !!street} />
              <div>
                <label htmlFor="address-extra" className="block text-slate-700 mb-1">{language === 'ar' ? 'تفاصيل إضافية للعنوان (اختياري)' : 'Additional address details (optional)'}</label>
                <textarea id="address-extra" rows={2} maxLength={500} value={addressDetails} onChange={e => setAddressDetails(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900" />
              </div>
              {selectedAddressId === 'new' && user && <label className="flex items-center gap-2 text-slate-700">
                <input type="checkbox" className="accent-amber-600" checked={saveAddress} onChange={e => setSaveAddress(e.target.checked)} />
                {language === 'ar' ? 'احفظ هذا العنوان في حسابي للطلبات القادمة' : 'Save this address for future orders'}
              </label>}

              {/* Google Maps Location Integration (Auto GPS + Interactive Leaflet Map) */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/40 via-slate-100 to-blue-50/20 border border-blue-500/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-blue-700 text-xs flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-blue-700" />
                      <span>تحديد موقع التوصيل بدقة (GPS تلقائي أو اختيار من الخريطة)</span>
                    </span>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      حدّد مكان منزلك تلقائياً أو اضغط «تحديد من الخريطة يدوياً» لتحريك الدبوس إلى موقعك بالضبط.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={isLocating}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isLocating ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>جاري الالتقاط...</span>
                        </>
                      ) : (
                        <>
                          <Navigation className="w-3.5 h-3.5" />
                          <span>تحديد تلقائي (GPS)</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowMapPicker(prev => !prev)}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-blue-300 text-blue-800 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                    >
                      <MapIcon className="w-3.5 h-3.5" />
                      <span>{showMapPicker ? 'إخفاء الخريطة' : 'تحديد من الخريطة يدوياً'}</span>
                    </button>
                  </div>
                </div>

                {showMapPicker && (
                  <React.Suspense
                    fallback={
                      <div className="h-[260px] rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-xs text-slate-500">
                        جاري تحميل الخريطة التفاعلية...
                      </div>
                    }
                  >
                    <LocationPickerMap
                      governorate={currentGov.name_ar}
                      latitude={latitude}
                      longitude={longitude}
                      onSelectCoords={(lat, lng) => void applySelectedCoordinates(lat, lng, 'map')}
                    />
                  </React.Suspense>
                )}

                {locationSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                      <span>{locationSuccess}</span>
                    </div>
                    {googleMapsUrl && (
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-700 hover:underline flex items-center gap-1 text-[11px] font-bold"
                      >
                        <span>معاينة على الخريطة</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}

                {locationError && (
                  <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 text-[11px]">
                    {locationError}
                  </div>
                )}

                <div>
                  <input
                    type="url"
                    aria-label="رابط Google Maps" maxLength={2000} value={googleMapsUrl}
                    onChange={(e) => setGoogleMapsUrl(e.target.value)}
                    placeholder="أو الصق رابط موقعك من Google Maps هنا مباشرة (اختياري)"
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-400 font-outfit"
                  />
                </div>
              </div>

              {/* Delivery Notes */}
              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  ملاحظات إضافية للتوصيل (اختياري)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: يرجى الاتصال قبل الوصول بنصف ساعة / المعاينة قبل الاستلام"
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Payment Method Card */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-4">
            <h2 className="text-base font-bold text-slate-900 font-cairo flex items-center gap-2 border-b border-slate-200 pb-3">
              <CreditCard className="w-5 h-5 text-amber-700" />
              <span>2. طريقة الدفع</span>
            </h2>

            <div className="space-y-3">
              {/* COD Option */}
              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'cod'
                    ? 'border-amber-400 bg-amber-500/10 shadow-glow-gold'
                    : 'border-slate-200 bg-slate-100/60 hover:bg-slate-100'
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
                    <strong className="text-slate-900 font-bold text-sm block">
                      الدفع عند الاستلام (COD)
                    </strong>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 font-bold">
                      معاينة وفحص 100%
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] mt-1 leading-relaxed">
                    ادفع نقداً عند استلام شحنتك، مع حقك الكامل في فحص الجهاز والبطارية والتأكد من سلامتها مع مندوب التوصيل قبل الدفع.
                  </p>
                </div>
              </label>

              {/* Online Card Option (Kashier / Paymob) */}
              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border transition-all ${
                  !gateway?.methods?.card
                    ? 'border-slate-200 bg-slate-50 opacity-75 cursor-not-allowed'
                    : paymentMethod === 'credit_card'
                      ? 'border-indigo-400 bg-indigo-500/10 shadow-md cursor-pointer'
                      : 'border-slate-200 bg-slate-100/60 hover:bg-slate-100 cursor-pointer'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value="credit_card"
                  disabled={!gateway?.methods?.card}
                  checked={paymentMethod === 'credit_card'}
                  onChange={() => gateway?.methods?.card && setPaymentMethod('credit_card')}
                  className="mt-1 accent-indigo-600"
                />
                <div className="flex-1 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-slate-900 font-bold text-sm flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-indigo-700" />
                      <span>الدفع بالبطاقة البنكية (Visa / Mastercard / Meeza)</span>
                    </strong>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        gateway?.methods?.card
                          ? 'bg-emerald-500/20 text-emerald-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {gateway?.methods?.card
                        ? `متاح أونلاين (${gateway.provider === 'paymob' ? 'Paymob' : 'Kashier'})`
                        : 'قريباً — جاهز للتفعيل من لوحة الإدارة'}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] mt-1">
                    {gateway?.methods?.card
                      ? 'سيتم تحويلك إلى صفحة الدفع المشفرة لإدخال بيانات البطاقة وتأكيد العملية فوراً.'
                      : 'بمجرد إضافة مفاتيح Kashier أو Paymob من الإعدادات، سيعمل الدفع بالبطاقات تلقائياً.'}
                  </p>
                </div>
              </label>

              {/* InstaPay Option */}
              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'instapay'
                    ? 'border-purple-400 bg-purple-500/10 shadow-md'
                    : 'border-slate-200 bg-slate-100/60 hover:bg-slate-100'
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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-slate-900 font-bold text-sm block">
                      تحويل لحظي عبر تطبيق إنستاباي (InstaPay)
                    </strong>
                    {gateway?.methods?.instapay && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 font-bold">
                        متصل ببوابة الدفع
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 text-[11px] mt-1">
                    {gateway?.methods?.instapay
                      ? 'تحويل مباشر وآلي عبر بوابة الدفع الإلكتروني بدون إدخال رقم مرجع يدوياً.'
                      : 'تحويل بنكي فوري بدون أي رسوم إضافية لحساب جو ستور الرسمي.'}
                  </p>

                  {paymentMethod === 'instapay' && !gateway?.methods?.instapay && (
                    <div className="mt-3 p-3.5 rounded-xl bg-slate-100 border border-purple-500/30 space-y-2.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-600">عنوان إنستاباي (IPA):</span>
                        <strong className="text-purple-700 font-outfit text-xs bg-purple-100 px-2 py-0.5 rounded border border-purple-300">
                          {settings.instapay_address}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-600">رقم الهاتف للتحويل:</span>
                        <strong className="text-slate-900 font-outfit text-xs">
                          {settings.store_phone}
                        </strong>
                      </div>

                      <div className="pt-2 border-t border-slate-200 space-y-2">
                        <label className="block text-[11px] text-slate-600 font-semibold">
                          رقم العملية أو اسم الحساب المحول منه:
                        </label>
                        <input
                          type="text"
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          placeholder="مثال: تحويل من أحمد محمد / كود العملية 83719"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 placeholder-slate-500"
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
                    : 'border-slate-200 bg-slate-100/60 hover:bg-slate-100'
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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-slate-900 font-bold text-sm block">
                      فودافون كاش والمحافظ الإلكترونية (Orange / WE / Etisalat)
                    </strong>
                    {gateway?.methods?.wallet && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 font-bold">
                        متصل ببوابة الدفع
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 text-[11px] mt-1">
                    {gateway?.methods?.wallet
                      ? 'سيتم فتح بوابة المحفظة الإلكترونية لتأكيد الدفع تلقائياً.'
                      : 'تحويل مباشر على رقم محفظة جو ستور الرسمية.'}
                  </p>

                  {paymentMethod === 'vodafone_cash' && !gateway?.methods?.wallet && (
                    <div className="mt-3 p-3.5 rounded-xl bg-slate-100 border border-red-500/30 space-y-2.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-600">رقم محفظة فودافون كاش:</span>
                        <strong className="text-red-700 font-outfit text-sm bg-red-100 px-2 py-0.5 rounded border border-red-300">
                          {settings.vodafone_cash_number}
                        </strong>
                      </div>

                      <div className="pt-2 border-t border-slate-200 space-y-2">
                        <label className="block text-[11px] text-slate-600 font-semibold">
                          رقم الهاتف الذي قمت بالتحويل منه:
                        </label>
                        <input
                          type="text"
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          placeholder="مثال: تم التحويل من رقم 010XXXXXXXX"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 placeholder-slate-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Order Summary Card & Submit */}
        <div className="lg:col-span-5 space-y-6 lg:sticky self-start" style={{ top: 'calc(var(--store-header-height, 150px) + 16px)' }}>
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
            <h3 className="font-bold text-slate-900">{language === 'ar' ? 'راجع عنوان التسليم' : 'Check your delivery address'}</h3>
            <p className="text-sm text-slate-700 leading-7">{formatDeliveryAddress({ ...delivery, governorate: currentGov.name_ar, city: selectedCity, address_details: buildAddressDetails(delivery, addressDetails) }, language)}</p>
          </div>
          <div className="p-6 rounded-3xl bg-white border border-amber-500/30 shadow-2xl space-y-5">
            <h2 className="text-base font-bold text-slate-900 font-cairo border-b border-slate-200 pb-3 flex items-center justify-between">
              <span>{language === 'ar' ? 'ملخص الطلب' : 'Order Summary'} ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
              <span className="text-xs text-amber-700 font-outfit">{cart.length} {language === 'ar' ? 'أصناف' : 'Items'}</span>
            </h2>

            {/* Items mini list */}
            <div className="max-h-60 overflow-y-auto space-y-3 divide-y divide-slate-200 pr-1">
              {cart.map((item, idx) => (
                <div key={idx} className="pt-2 flex items-center gap-3">
                  <img
                    src={normalizeProductImage(item.product.images[0])}
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover bg-slate-100 border border-slate-200 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0 text-xs font-cairo">
                    <h4 className="font-bold text-slate-900 truncate"><InfoButton details={productDetail(item.product, language, formatPrice)}>{language === 'ar' ? item.product.name_ar : item.product.name_en}</InfoButton></h4>
                    <p className="text-[10px] text-slate-600">
                      {item.selected_storage || item.product.storage} • {language === 'ar' ? (item.selected_color || item.product.color_ar) : (item.selected_color || item.product.color_en)} × {item.quantity}
                    </p>
                    <span className="text-amber-700 font-outfit font-bold">
                      {formatPrice(item.product.price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Coupon Code Section */}
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                <span>{language === 'ar' ? 'هل لديك كود خصم؟' : 'Have a promo code?'}</span>
              </label>

              {appliedCoupon ? (
                <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-800 font-bold font-outfit uppercase">
                      {appliedCoupon.code}
                    </span>
                    <span className="text-emerald-800 font-semibold">
                      {language === 'ar'
                        ? `خصم ${appliedCoupon.discount_type === 'percentage' ? `${appliedCoupon.discount_value}%` : `${appliedCoupon.discount_value} ج.م`} (-${formatPrice(couponDiscount)})`
                        : `Discount (-${formatPrice(couponDiscount)})`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="p-1 rounded-lg hover:bg-emerald-500/20 text-rose-600 transition-colors"
                    title={language === 'ar' ? 'إلغاء كود الخصم' : 'Remove coupon'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder={language === 'ar' ? 'أدخل كود الخصم (مثال: JOE2026)' : 'Enter promo code (e.g. JOE2026)'}
                    className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 uppercase font-outfit font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyCoupon()}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    {language === 'ar' ? 'تطبيق' : 'Apply'}
                  </button>
                </div>
              )}

              {couponError && (
                <p className="text-[11px] text-rose-600 font-semibold">{couponError}</p>
              )}
              {couponSuccess && (
                <p className="text-[11px] text-emerald-700 font-semibold">{couponSuccess}</p>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-2 pt-3 border-t border-slate-200 text-xs font-cairo">
              <div className="flex justify-between text-slate-600">
                <span>{language === 'ar' ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                <InfoButton className="font-outfit text-slate-900 font-semibold" details={{ title: language === 'ar' ? 'تفاصيل قيمة المنتجات' : 'Basket subtotal', description: language === 'ar' ? 'مجموع سعر كل قطعة مضروبًا في كميتها، قبل رسوم الشحن.' : 'The sum of each item price multiplied by its quantity, before shipping.', rows: cart.map((item, i) => ({ id: String(i), label: item.product.name_ar, value: formatPrice(item.product.price * item.quantity), facts: [{ label: language === 'ar' ? 'الكمية' : 'Quantity', value: item.quantity }] })) }}>{formatPrice(cartSubtotal)}</InfoButton>
              </div>

              {couponDiscount > 0 && appliedCoupon && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>{language === 'ar' ? `خصم الكوبون (${appliedCoupon.code}):` : `Coupon Discount (${appliedCoupon.code}):`}</span>
                  <span className="font-outfit">-{formatPrice(couponDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>{language === 'ar' ? `مصاريف الشحن (${currentGov.name_ar}):` : `Shipping (${currentGov.name_en}):`}</span>
                <button type="button" className="font-outfit detail-info-button" onClick={() => openDetails({ title: language === 'ar' ? 'حساب رسوم الشحن' : 'Shipping calculation', description: language === 'ar' ? 'تُحسب الرسوم حسب المحافظة المحددة وقيمة المنتجات في السلة. هذا عرض للتكلفة الحالية ولا يغيّر العنوان أو الطلب.' : 'Fees depend on your selected governorate and basket subtotal. Viewing this does not change your address or order.', facts: [{ label: language === 'ar' ? 'المحافظة' : 'Governorate', value: currentGov.name_ar }, { label: language === 'ar' ? 'حد الشحن المجاني' : 'Free-delivery threshold', value: formatPrice(settings.free_shipping_threshold ?? 2500) }, { label: language === 'ar' ? 'الشحن الحالي' : 'Current shipping fee', value: formatPrice(shippingFee) }] })}>
                  {isFreeShipping ? (
                    <span className="text-emerald-700 font-bold">{language === 'ar' ? 'شحن مجاني' : 'Free Shipping'}</span>
                  ) : (
                    <span>{formatPrice(shippingFee)}</span>
                  )}
                </button>
              </div>

              <div className="flex justify-between text-base font-black text-slate-900 pt-3 border-t border-slate-200">
                <span>{language === 'ar' ? 'الإجمالي النهائي المطلوب:' : 'Grand Total:'}</span>
                <InfoButton className="font-outfit text-amber-700 text-xl" details={{ title: language === 'ar' ? 'تفاصيل الإجمالي' : 'Total breakdown', description: language === 'ar' ? 'الإجمالي = قيمة المنتجات + رسوم الشحن الحالية. فتح التفاصيل لا يرسل طلبًا.' : 'Total = basket subtotal + current shipping fee. Opening details does not place an order.', facts: [{ label: language === 'ar' ? 'المنتجات' : 'Products', value: formatPrice(cartSubtotal) }, { label: language === 'ar' ? 'الشحن' : 'Shipping', value: formatPrice(shippingFee) }, { label: language === 'ar' ? 'الإجمالي' : 'Total', value: formatPrice(grandTotal) }] }}>{formatPrice(grandTotal)}</InfoButton>
              </div>
            </div>

            {/* Policies, Terms & Cookies Consent */}
            <div
              data-testid="checkout-policy-consent"
              className={`p-3.5 rounded-2xl border text-xs leading-relaxed font-cairo transition-colors ${
                policyError && !acceptedPolicies
                  ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-300/60 text-slate-900'
                  : acceptedPolicies
                    ? 'bg-emerald-50/70 border-emerald-300 text-slate-900'
                    : 'bg-amber-50/70 border-amber-300 text-slate-900'
              }`}
            >
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  data-testid="checkout-policy-checkbox"
                  checked={acceptedPolicies}
                  onChange={(e) => {
                    setAcceptedPolicies(e.target.checked);
                    if (e.target.checked) {
                      setPolicyError(false);
                      if (errorMsg.includes('الموافقة') || errorMsg.includes('accept the terms')) setErrorMsg('');
                    }
                  }}
                  className="mt-0.5 w-4 h-4 accent-amber-600 shrink-0"
                />
                <span>
                  {language === 'ar' ? (
                    <>
                      أوافق على جميع{' '}
                      <button type="button" onClick={() => navigate('terms')} className="text-amber-700 font-bold underline">
                        شروط الاستخدام
                      </button>
                      ، و{' '}
                      <button type="button" onClick={() => navigate('privacy')} className="text-amber-700 font-bold underline">
                        سياسة الخصوصية
                      </button>
                      ، و{' '}
                      <button type="button" onClick={() => navigate('refund')} className="text-amber-700 font-bold underline">
                        الضمان والاسترجاع
                      </button>
                      ، و{' '}
                      <button type="button" onClick={() => navigate('shipping')} className="text-amber-700 font-bold underline">
                        سياسة الشحن والتوصيل
                      </button>
                      ، وجمع واستخدام ملفات تعريف الارتباط (<strong className="font-bold">Cookies</strong>) لإتمام الطلب.
                    </>
                  ) : (
                    <>
                      I agree to the{' '}
                      <button type="button" onClick={() => navigate('terms')} className="text-amber-700 font-bold underline">Terms</button>
                      ,{' '}
                      <button type="button" onClick={() => navigate('privacy')} className="text-amber-700 font-bold underline">Privacy Policy</button>
                      ,{' '}
                      <button type="button" onClick={() => navigate('refund')} className="text-amber-700 font-bold underline">Warranty &amp; Returns</button>
                      ,{' '}
                      <button type="button" onClick={() => navigate('shipping')} className="text-amber-700 font-bold underline">Shipping Policy</button>
                      , and Cookies collection for placing this order.
                    </>
                  )}
                </span>
              </label>
            </div>

            {/* Error banner if any */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-700 text-xs flex items-center gap-2 font-cairo">
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
                disabled={isSubmitting || isOfflineCatalog}
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
            <div className="pt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-600 text-center font-cairo">
              <div className="p-2 rounded-xl bg-slate-100 border border-slate-200">
                {language === 'ar' ? 'راجع تفاصيل الطلب قبل التأكيد' : 'Review your order before confirming'}
              </div>
              <div className="p-2 rounded-xl bg-slate-100 border border-slate-200">
                {language === 'ar' ? 'ضمان استبدال رسمي' : 'Official Warranty'}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
