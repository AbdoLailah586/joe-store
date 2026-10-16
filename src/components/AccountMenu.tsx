import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
export function AccountMenu() {
  const { user, isAdmin, logout, openAuthModal } = useAuth();
  const { navigate } = useStore();
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', key); };
  }, [open]);
  if (!user) return <button onClick={() => openAuthModal()} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 p-2 sm:px-3 text-xs font-bold"><User className="w-4 h-4" /><span className="hidden sm:inline">{ar ? 'تسجيل الدخول' : 'Sign in'}</span></button>;
  const go = (tab: Parameters<typeof navigate>[0], section?: string) => { setOpen(false); navigate(tab, undefined, section ? { section } : { category: 'all', search: '' }); };
  return <div className="relative" ref={root}>
    <button ref={trigger} onClick={() => setOpen(v => !v)} aria-expanded={open} aria-controls="account-options" aria-label={ar ? 'قائمة حسابي' : 'My account menu'} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 sm:px-3 text-sm"><span className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center">{user.name?.slice(0, 1) || 'J'}</span><span className="hidden md:block max-w-24 truncate">{user.name?.split(' ')[0]}</span><ChevronDown className="w-3 h-3" /></button>
    {open && <nav id="account-options" aria-label={ar ? 'خيارات الحساب' : 'Account options'} className="absolute end-0 mt-2 w-64 max-w-[90vw] bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50">
      <p className="px-3 py-2 text-xs text-slate-500 truncate border-b border-slate-100 mb-1">{user.email}</p>
      {([['personal', 'الملف الشخصي', 'Profile'], ['orders', 'سجل المشتريات', 'Purchase history'], ['addresses', 'عناويني', 'Addresses'], ['payments', 'مدفوعاتي', 'My payments'], ['preferences', 'اللغة والتفضيلات', 'Language & preferences'], ['security', 'الأمان', 'Security']] as const).map(([key, a, en]) => <button key={key} onClick={() => go('profile', key)} className="block w-full text-start rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50">{ar ? a : en}</button>)}
      <button onClick={() => go('finder')} className="block w-full text-start px-3 py-2.5 text-sm hover:bg-slate-50 rounded-xl">{ar ? 'اختياراتي ومساعد الشراء' : 'My picks & buying assistant'}</button>
      <button onClick={() => go('wishlist')} className="block w-full text-start px-3 py-2.5 text-sm hover:bg-slate-50 rounded-xl">{ar ? 'المفضلة' : 'Wishlist'}</button>
      {isAdmin && <button onClick={() => go('admin')} className="block w-full text-start px-3 py-2.5 text-sm font-bold text-amber-800 hover:bg-amber-50 rounded-xl">{ar ? 'لوحة إدارة المحل' : 'Store administration'}</button>}
      <button onClick={() => { setOpen(false); logout(); }} className="flex items-center gap-2 w-full text-start px-3 py-2.5 text-sm text-rose-700 hover:bg-rose-50 rounded-xl"><LogOut className="w-4 h-4" />{ar ? 'تسجيل الخروج' : 'Sign out'}</button>
    </nav>}
  </div>;
}
