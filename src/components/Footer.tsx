import React, { useState } from "react";
import {
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  MapPin,
  Phone,
  MessageCircle,
  Clock,
  Download,
  ShieldCheck,
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import { useLanguage } from "../context/LanguageContext";
import { JoeStoreLogo } from "./JoeStoreLogo";
import { PolicyModal, PolicyType } from "./PolicyModal";
import { generateWhatsAppWebLink } from "../utils/whatsappService";
import { InstallAppButton, OfflineReadyLabel } from "./PwaControls";
import { CategoryKey } from "../types";

export const Footer: React.FC = () => {
  const { navigate, settings } = useStore();
  const { language, isRTL } = useLanguage();
  const ar = language === "ar";
  const [policy, setPolicy] = useState<PolicyType>(null);
  const Arrow = isRTL ? ArrowUpLeft : ArrowUpRight;
  const whatsapp = generateWhatsAppWebLink(
    settings.store_whatsapp,
    ar
      ? "مرحباً جو ستور، أود الاستفسار عن المنتجات."
      : "Hello JOE Store, I have a product question.",
  );
  const categories: [CategoryKey, string, string][] = [
    ["audio", "سماعات وصوتيات", "Audio & earbuds"],
    ["smartwatches", "ساعات ذكية", "Smartwatches"],
    ["chargers_cables", "شواحن وكابلات", "Chargers & cables"],
    ["powerbanks", "باور بانك", "Power banks"],
    ["cases_protection", "كفرات وحماية", "Cases & protection"],
    ["smartphones", "موبايلات", "Phones"],
  ];
  const policies: [PolicyType, string, string][] = [
    ["warranty", "الضمان والاستبدال", "Warranty & returns"],
    ["shipping", "الشحن والتوصيل", "Shipping & delivery"],
    ["privacy", "سياسة الخصوصية", "Privacy policy"],
    ["terms", "الشروط والأحكام", "Terms & conditions"],
  ];
  return (
    <>
      <footer className="joe-footer">
        <div className="joe-container joe-footer-install">
          <div>
            <span className="joe-eyebrow">
              <Download size={15} />
              {ar ? "جو ستور معاك في كل وقت" : "TAKE JOE STORE WITH YOU"}
            </span>
            <p>
              {ar
                ? "ثبّت المتجر. واكتشف آخر كتالوج محفوظ حتى من غير نت."
                : "Install the store. Browse your saved catalog, even offline."}
            </p>
            <OfflineReadyLabel />
          </div>
          <InstallAppButton />
        </div>
        <div className="joe-container joe-footer-main">
          <div className="joe-footer-about">
            <JoeStoreLogo size="lg" showSubtitle={false} />
            <p>
              {ar
                ? "تفاصيل صغيرة بتعمل فرق كبير في يومك. موبايلات، صوتيات، وإكسسوارات… اختار اللي يناسبك من جو ستور."
                : "Little things that make a big difference. Phones, audio and everyday accessories, picked your way at JOE Store."}
            </p>
            <div>
              <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={17} />
                WhatsApp
                <Arrow size={14} />
              </a>
              <a
                href={
                  settings.tiktok_url?.includes("2026")
                    ? settings.tiktok_url
                    : "https://www.tiktok.com/@joestore2026"
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                TikTok
                <Arrow size={14} />
              </a>
            </div>
          </div>
          <div className="joe-footer-links">
            <h2>{ar ? "اكتشف التشكيلة" : "Explore the collection"}</h2>
            {categories.map(([category, a, en]) => (
              <button
                key={category}
                onClick={() =>
                  navigate("catalog", undefined, { category, search: "" })
                }
              >
                {ar ? a : en}
              </button>
            ))}
          </div>
          <div className="joe-footer-links">
            <h2>{ar ? "معاك في كل خطوة" : "Here to help"}</h2>
            {policies.map(([key, a, en]) => (
              <button key={key} onClick={() => setPolicy(key)}>
                {ar ? a : en}
              </button>
            ))}
            <button onClick={() => navigate("track-order")}>
              {ar ? "تتبع طلبك" : "Track your order"}
            </button>
            <button onClick={() => navigate("help")}>
              {ar ? "المساعدة والأسئلة" : "Help & questions"}
            </button>
          </div>
          <div className="joe-footer-contact">
            <h2>{ar ? "نوّرنا في المنصورة" : "Visit us in Mansoura"}</h2>
            <p>
              <MapPin size={16} />
              {ar ? settings.store_address_ar : settings.store_address_en}
            </p>
            <a href={`tel:${settings.store_phone}`}>
              <Phone size={16} />
              <span dir="ltr">{settings.store_phone}</span>
            </a>
            <p>
              <Clock size={16} />
              {ar ? settings.working_hours_ar : settings.working_hours_en}
            </p>
            <span className="joe-footer-payment">
              <ShieldCheck size={15} />
              {ar
                ? "كاش / فودافون كاش / إنستاباي"
                : "Cash / Vodafone Cash / InstaPay"}
            </span>
          </div>
        </div>
        <div className="joe-container joe-footer-bottom">
          <span>
            © {new Date().getFullYear()} JOE Store.{" "}
            {ar ? "كل الحقوق محفوظة." : "All rights reserved."}
          </span>
          <span className="joe-footer-signature" dir="ltr">
            GOOD TECH. GOOD MOOD.
          </span>
          <button
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                  .matches
                  ? "auto"
                  : "smooth",
              })
            }
          >
            {ar ? "لفوق تاني" : "Back to top"}
            <ArrowUp size={15} />
          </button>
        </div>
      </footer>
      <PolicyModal policy={policy} onClose={() => setPolicy(null)} />
    </>
  );
};
