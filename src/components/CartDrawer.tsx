import React from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, ArrowLeft, Plus, Minus, Truck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';

export const CartDrawer: React.FC = () => {
  const { 
    cart, 
    isCartOpen, 
    setIsCartOpen, 
    removeFromCart, 
    updateCartQuantity, 
    cartSubtotal,
    clearCart,
    navigate,
    settings 
  } = useStore();

  const { t, language, formatPrice, isRTL } = useLanguage();

  if (!isCartOpen) return null;

  const freeShippingThreshold = settings.free_shipping_threshold || 2500;
  const progressPercent = Math.min(100, Math.round((cartSubtotal / freeShippingThreshold) * 100));
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - cartSubtotal);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        onClick={() => setIsCartOpen(false)}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity" 
      />

      <div className={`fixed inset-y-0 ${isRTL ? 'left-0' : 'right-0'} max-w-full flex pl-0`}>
        <div className="w-screen max-w-md bg-[#0F1626] border-r border-amber-500/20 shadow-2xl flex flex-col justify-between text-slate-100">
          
          {/* Header */}
          <div className="p-4 bg-[#0A0E1A] border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-400" />
              <h2 className="font-bold text-base font-cairo text-white">
                {t('cart')} ({cart.reduce((s, i) => s + i.quantity, 0)})
              </h2>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress Indicator */}
          <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/20 text-xs">
            <div className="flex items-center justify-between font-cairo mb-1.5">
              <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
                <Truck className="w-4 h-4 text-amber-400" />
                {remainingForFreeShipping === 0 ? (
                  <span className="text-emerald-400 font-bold">
                    {language === 'ar' ? '🎉 مبروك! حصلت على شحن مجاني لطلبك' : '🎉 Congrats! Free shipping unlocked'}
                  </span>
                ) : (
                  <span>
                    {language === 'ar' ? (
                      <>تبقّى <strong className="text-white font-outfit">{formatPrice(remainingForFreeShipping)}</strong> للحصول على شحن مجاني</>
                    ) : (
                      <>Add <strong className="text-white font-outfit">{formatPrice(remainingForFreeShipping)}</strong> for free shipping</>
                    )}
                  </span>
                )}
              </span>
              <span className="text-slate-400 font-outfit">{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-white/5">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-20 h-20 rounded-full bg-slate-800/80 flex items-center justify-center text-3xl border border-white/5 shadow-inner">
                  🛒
                </div>
                <h3 className="font-bold text-base text-slate-200 font-cairo">{t('emptyCart')}</h3>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed font-cairo">
                  {t('emptyCartSub')}
                </p>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    navigate('catalog');
                  }}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-glow-gold transition-all"
                >
                  {language === 'ar' ? 'استكشف المنتجات الآن' : 'Explore Products Now'}
                </button>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={`${item.product.id}-${idx}`} className="pt-3 flex gap-3 items-center">
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name_ar}
                    className="w-16 h-16 object-cover rounded-xl bg-slate-800 flex-shrink-0 border border-white/10"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-100 line-clamp-1">
                      {language === 'ar' ? item.product.name_ar : item.product.name_en}
                    </h4>
                    
                    {/* Selected Options (Storage & Color) */}
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      {item.selected_storage && (
                        <span className="font-outfit font-semibold text-amber-300">
                          {item.selected_storage}
                        </span>
                      )}
                      {item.selected_color && (
                        <span>• {item.selected_color}</span>
                      )}
                      {item.product.battery_health && (
                        <span className="text-emerald-400">🔋 {item.product.battery_health}%</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs font-bold text-amber-400 font-outfit">
                        {formatPrice(item.product.price)}
                      </span>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5 bg-slate-900 border border-white/10 rounded-lg p-0.5">
                        <button
                          onClick={() => updateCartQuantity(item.product.id, item.quantity - 1, item.selected_storage, item.selected_color)}
                          className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold px-1.5 font-outfit text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.product.id, item.quantity + 1, item.selected_storage, item.selected_color)}
                          className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeFromCart(item.product.id, item.selected_storage, item.selected_color)}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                        title={language === 'ar' ? 'حذف من السلة' : 'Remove from cart'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout Action */}
          {cart.length > 0 && (
            <div className="p-4 bg-[#0A0E1A] border-t border-white/10 space-y-3">
              <div className="space-y-1.5 text-xs font-cairo">
                <div className="flex justify-between text-slate-400">
                  <span>{t('subtotal')}</span>
                  <span className="font-outfit font-semibold text-white">{formatPrice(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>{t('shippingFee')}</span>
                  <span className="font-outfit">
                    {remainingForFreeShipping === 0 ? (
                      <span className="text-emerald-400 font-bold">{t('freeShipping')}</span>
                    ) : (
                      <span>{formatPrice(settings.shipping_fee_default || 35)}</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/10">
                  <span>{t('total')}</span>
                  <span className="font-outfit text-amber-400 text-base">
                    {formatPrice(cartSubtotal + (remainingForFreeShipping === 0 ? 0 : (settings.shipping_fee_default || 35)))}
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={() => {
                  setIsCartOpen(false);
                  navigate('checkout');
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-glow-gold active:scale-95 transition-all"
              >
                <span>{t('proceedToCheckout')}</span>
                {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
