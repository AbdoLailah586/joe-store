import React from 'react';
import { useStore } from '../context/StoreContext';
import { generateWhatsAppWebLink } from '../utils/whatsappService';

type SocialKey = 'facebook' | 'instagram' | 'whatsapp' | 'tiktok';

export function BrandGlyph({ kind, className = 'w-4 h-4' }: { kind: SocialKey; className?: string }) {
  if (kind === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
        <path d="M15.12 5.32H17V2.14A26.11 26.11 0 0 0 14.26 2c-2.72 0-4.58 1.66-4.58 4.7v2.62H6.61v3.56h3.07V22h3.68v-9.12h3.06l.46-3.56h-3.52V7.05c0-1.05.29-1.73 1.76-1.73Z" />
      </svg>
    );
  }
  if (kind === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5.2" stroke="currentColor" strokeWidth="2.2" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2.2" />
        <circle cx="17.3" cy="6.7" r="1.25" fill="currentColor" />
      </svg>
    );
  }
  if (kind === 'whatsapp') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
        <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.48-1.76-1.66-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35Zm-5.42 7.4h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37A9.86 9.86 0 0 1 2.2 11.9c0-5.45 4.44-9.88 9.9-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.9 7c0 5.45-4.44 9.88-9.9 9.88Zm8.42-18.3A11.82 11.82 0 0 0 12.1 0C5.5 0 .14 5.36.14 11.95c0 2.1.55 4.16 1.6 5.97L0 24l6.23-1.63a11.93 11.93 0 0 0 5.87 1.5h.01c6.59 0 11.95-5.36 11.95-11.95 0-3.19-1.24-6.19-3.6-8.44Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.87a8.16 8.16 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.3Z" />
    </svg>
  );
}

export const SocialIconLinks: React.FC = () => {
  const { settings } = useStore();
  const waHref = generateWhatsAppWebLink(settings.store_whatsapp || '201554826209', 'مرحباً جو ستور!');
  const items: { key: SocialKey; label: string; href: string }[] = [
    { key: 'whatsapp', label: 'WhatsApp', href: waHref },
    {
      key: 'tiktok',
      label: 'TikTok',
      href: settings.tiktok_url?.includes('tiktok.com') ? settings.tiktok_url : 'https://www.tiktok.com/@joestore2026'
    },
    {
      key: 'instagram',
      label: 'Instagram',
      href: settings.instagram_url?.startsWith('http') ? settings.instagram_url : 'https://www.instagram.com/joestore'
    },
    {
      key: 'facebook',
      label: 'Facebook',
      href: settings.facebook_url?.startsWith('http') ? settings.facebook_url : 'https://www.facebook.com/joestore'
    }
  ];

  return (
    <div className="flex items-center gap-2 pt-2">
      {items.map(({ key, label, href }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
          className="w-9 h-9 rounded-full bg-slate-900 hover:bg-amber-600 text-white flex items-center justify-center transition-all hover:scale-110"
        >
          <BrandGlyph kind={key} className="w-4 h-4" />
        </a>
      ))}
    </div>
  );
};
