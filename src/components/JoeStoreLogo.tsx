import React from 'react';
import { useLanguage } from '../context/LanguageContext';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  variant?: 'full' | 'icon-only' | 'horizontal';
}

export const JoeStoreLogo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
  variant = 'horizontal'
}) => {
  const { language } = useLanguage();

  const iconDimensions = {
    sm: 'w-8 h-9',
    md: 'w-10 h-12',
    lg: 'w-14 h-16',
    xl: 'w-20 h-22'
  }[size];

  const titleSize = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl'
  }[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* 3D Golden Phone Silhouette Icon (Physical Wall Sign Emblem) */}
      <div className={`relative flex-shrink-0 ${iconDimensions} transition-transform duration-300 hover:scale-105 group`}>
        {/* Ambient Backlight Glow */}
        <div className="absolute inset-0 bg-amber-500/25 blur-md rounded-2xl -z-10 group-hover:bg-amber-400/40 transition-all scale-110" />
        
        <picture>
          <source srcSet="/logo.webp" type="image/webp" />
          <img 
            src="/logo.png" 
            alt="JOE Store Logo" 
            className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(245,158,11,0.35)] filter transition-all duration-300 select-none pointer-events-none"
            loading="eager"
            decoding="async"
          />
        </picture>
      </div>

      {/* Typography side strictly in LTR: JOE first on left, Store next on right */}
      {variant !== 'icon-only' && (
        <div className="flex flex-col text-left" dir="ltr" style={{ direction: 'ltr', textAlign: 'left' }}>
          <div className="flex items-center gap-1.5 font-outfit font-extrabold tracking-wider leading-none" dir="ltr" style={{ direction: 'ltr' }}>
            <span className={`bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent ${titleSize} drop-shadow-[0_2px_4px_rgba(245,158,11,0.3)]`}>
              JOE
            </span>
            <span className={`text-slate-900 dark:text-white font-light italic font-serif ${titleSize}`}>
              Store
            </span>
            <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 font-cairo">
              {language === 'ar' ? 'جو ستور' : 'Mansoura'}
            </span>
          </div>

          {showSubtitle && (
            <p className="hidden sm:flex text-[10px] text-slate-500 dark:text-slate-400 font-cairo font-medium tracking-wide mt-1 items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
              <span>
                {language === 'ar' 
                  ? 'موبايلات وإكسسوارات أصلية | المنصورة' 
                  : 'Certified Phones & Genuine Accessories | Mansoura'}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};
