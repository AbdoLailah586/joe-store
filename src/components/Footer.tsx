import React, { useState } from 'react';
import { 
  MapPin, 
  Phone, 
  Clock, 
  ShieldCheck, 
  Truck, 
  CheckCircle, 
  MessageCircle, 
  Heart,
  ExternalLink,
  Lock,
  FileText
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { JoeStoreLogo } from './JoeStoreLogo';
import { PolicyModal, PolicyType } from './PolicyModal';
import { generateWhatsAppWebLink } from '../utils/whatsappService';

export const Footer: React.FC = () => {
  const { navigate, settings, setSelectedCategory } = useStore();
  const { t, language, isRTL } = useLanguage();

  const [activePolicy, setActivePolicy] = useState<PolicyType>(null);

  const whatsappInquiryUrl = generateWhatsAppWebLink(
    settings.store_whatsapp, 
    language === 'ar' 
      ? 'مرحباً جو ستور، أود الاستفسار عن الأجهزة والعروض المتوفرة اليوم.'
      : 'Hello JOE Store, I would like to inquire about devices and today offers.'
  );

  return (
    <>
      <footer className="bg-[#05080E] border-t border-amber-500/20 text-slate-400 font-cairo text-xs mt-16 pb-20 md:pb-6">
        {/* 1. Value Props Banner */}
        <div className="border-b border-white/5 py-8 px-4 bg-slate-900/40">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {/* Warranty */}
            <div 
              onClick={() => setActivePolicy('warranty')}
              className="flex flex-col items-center space-y-2 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-white text-sm group-hover:text-amber-400 transition-colors">
                {t('warrantyPolicy')}
              </h4>
              <p className="text-[11px] text-slate-400 max-w-xs">
                {t('testedCertifiedDesc')}
              </p>
            </div>

            {/* Fast Delivery */}
            <div 
              onClick={() => setActivePolicy('shipping')}
              className="flex flex-col items-center space-y-2 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                <Truck className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">
                {t('shippingPolicy')}
              </h4>
              <p className="text-[11px] text-slate-400 max-w-xs">
                {t('fastDeliveryDesc')}
              </p>
            </div>

            {/* Inspect Before Pay */}
            <div 
              onClick={() => setActivePolicy('terms')}
              className="flex flex-col items-center space-y-2 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors">
                {t('inspectBeforePayNotice')}
              </h4>
              <p className="text-[11px] text-slate-400 max-w-xs">
                {t('inspectBeforePayDesc')}
              </p>
            </div>

            {/* WhatsApp Notifications */}
            <div 
              onClick={() => setActivePolicy('privacy')}
              className="flex flex-col items-center space-y-2 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-white text-sm group-hover:text-purple-400 transition-colors">
                {t('whatsappTrackingTitle')}
              </h4>
              <p className="text-[11px] text-slate-400 max-w-xs">
                {t('whatsappTrackingDesc')}
              </p>
            </div>
          </div>
        </div>

        {/* 2. Main Footer Content */}
        <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="space-y-4">
            <JoeStoreLogo size="md" />
            <p className="text-xs text-slate-400 leading-relaxed">
              {language === 'ar' 
                ? `${settings.store_name_ar} - وجهتكم الموثوقة الأولى في المنصورة والدلتا للحصول على أحدث هواتف الآيفون الأصلية، أجهزة كسر زيرو مضمونة، وإكسسوارات الموبايل الأصلية.`
                : `${settings.store_name_en} - Your premier destination in Mansoura for certified pre-owned iPhones, genuine accessories, smartwatches, and fast charging.`}
            </p>

            {/* Social links */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <a
                href={whatsappInquiryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition-all flex items-center gap-2 text-xs font-bold"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{language === 'ar' ? 'واتساب مباشر' : 'WhatsApp'}</span>
              </a>

              {(() => {
                const tiktokHref = (settings.tiktok_url && (!settings.tiktok_url.includes('@joestore') || settings.tiktok_url.includes('2026')))
                  ? settings.tiktok_url
                  : 'https://www.tiktok.com/@joestore2026';
                return (
                  <a
                    href={tiktokHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-amber-400 border border-white/10 transition-all text-xs font-bold flex items-center gap-1.5"
                    title="حساب جو ستور الرسمي على TikTok"
                  >
                    <span>TikTok: @joestore2026</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                );
              })()}
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-white font-cairo">
              {language === 'ar' ? 'الأقسام والمنتجات' : 'Products & Catalog'}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => { setSelectedCategory('smartphones'); navigate('catalog'); }}
                  className="hover:text-amber-400 transition-colors"
                >
                  {language === 'ar' ? 'آيفون كسر زيرو (بطاريات 85% - 97%)' : 'Certified Pre-Owned iPhones (85%-97%)'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setSelectedCategory('smartphones'); navigate('catalog'); }}
                  className="hover:text-amber-400 transition-colors"
                >
                  {t('smartphones')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setSelectedCategory('smartwatches'); navigate('catalog'); }}
                  className="hover:text-amber-400 transition-colors"
                >
                  {t('smartwatches')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setSelectedCategory('audio'); navigate('catalog'); }}
                  className="hover:text-amber-400 transition-colors"
                >
                  {t('audio')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setSelectedCategory('chargers_cables'); navigate('catalog'); }}
                  className="hover:text-amber-400 transition-colors"
                >
                  {t('chargers_cables')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setSelectedCategory('cases_protection'); navigate('catalog'); }}
                  className="hover:text-amber-400 transition-colors"
                >
                  {t('cases_protection')}
                </button>
              </li>
            </ul>
          </div>

          {/* Policies & Official Terms */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-white font-cairo">
              {language === 'ar' ? 'السياسات والضمان' : 'Policies & Warranty'}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => setActivePolicy('warranty')}
                  className={`hover:text-amber-400 transition-colors flex items-center gap-1.5 ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('warrantyPolicy')}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActivePolicy('shipping')}
                  className={`hover:text-amber-400 transition-colors flex items-center gap-1.5 ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  <Truck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('shippingPolicy')}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActivePolicy('privacy')}
                  className={`hover:text-amber-400 transition-colors flex items-center gap-1.5 ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  <Lock className="w-3.5 h-3.5 text-blue-400" />
                  <span>{t('privacyPolicy')}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActivePolicy('terms')}
                  className={`hover:text-amber-400 transition-colors flex items-center gap-1.5 ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  <span>{t('termsConditions')}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('track-order')}
                  className={`hover:text-amber-400 transition-colors flex items-center gap-1.5 font-bold text-amber-300 ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  <span>{t('trackOrder')} {isRTL ? '←' : '→'}</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Store Info & Mansoura Location */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-white font-cairo">
              {language === 'ar' ? 'زيارة المحل والتواصل' : 'Store Location & Hours'}
            </h4>
            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>{language === 'ar' ? settings.store_address_ar : settings.store_address_en}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="font-outfit text-white font-bold">{settings.store_phone}</span>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>{language === 'ar' ? settings.working_hours_ar : settings.working_hours_en}</span>
              </div>
            </div>

            {/* Quick action button */}
            <div className="pt-2">
              <button
                onClick={() => navigate('track-order')}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 text-xs font-bold border border-white/10 transition-all text-center block"
              >
                {t('trackOrder')} ←
              </button>
            </div>
          </div>
        </div>

        {/* 3. Bottom Credits */}
        <div className="border-t border-white/5 py-4 px-4 text-center text-[11px] text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>© {new Date().getFullYear()} {language === 'ar' ? settings.store_name_ar : settings.store_name_en}. {t('allRightsReserved')}.</p>
            <p className="flex items-center gap-1">
              <span>{language === 'ar' ? 'صنع بأعلى معايير الجودة لمتجر' : 'Crafted with premium excellence for'}</span>
              <span className="font-bold text-amber-400 font-outfit">JOE Store</span>
            </p>
          </div>
        </div>
      </footer>

      {/* Policy Modal Viewer */}
      <PolicyModal
        policy={activePolicy}
        onClose={() => setActivePolicy(null)}
      />
    </>
  );
};
