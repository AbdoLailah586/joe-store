import React, { useState } from 'react';
import { LayoutDashboard, Package, Layers, ShoppingBag, Users, Mail, Settings, Smartphone, Calculator, ClipboardList, TrendingUp, Tags, ShieldCheck, Wrench, ArrowUpRight, MessageCircle, Truck, Headset, Lock, Moon, Sun, Boxes } from 'lucide-react';
export const adminSections = [
  ['overview', 'نظرة عامة', LayoutDashboard, 'الإدارة'], ['analytics', 'تحليلات المبيعات', TrendingUp, 'الإدارة'],
  ['products', 'المنتجات', Package, 'الكتالوج والمخزون'], ['inventory', 'المخزون والتقارير', Layers, 'الكتالوج والمخزون'],
  ['quality', 'مراجعة البيانات والصور', ShieldCheck, 'الكتالوج والمخزون'], ['stocktake', 'الجرد ومطابقة الكميات', ClipboardList, 'الكتالوج والمخزون'],
  ['reorder', 'خطة إعادة الطلب', TrendingUp, 'الكتالوج والمخزون'], ['suppliers', 'عروض الموردين', Boxes, 'الكتالوج والمخزون'],
  ['orders', 'الطلبات والمبيعات', ShoppingBag, 'العملاء والتواصل'],
  ['fulfillment', 'التجهيز والشحن', Truck, 'العملاء والتواصل'], ['support', 'الدعم الفني', Headset, 'العملاء والتواصل'],
  ['crm', 'العملاء والسلات', Users, 'العملاء والتواصل'], ['users', 'المستخدمون والصلاحيات', ShieldCheck, 'العملاء والتواصل'],
  ['emails', 'رسائل البريد', Mail, 'العملاء والتواصل'], ['whatsapp', 'إعدادات واتساب', MessageCircle, 'العملاء والتواصل'],
  ['screens', 'فاحص الاسكرينات', Smartphone, 'أدوات المحل'], ['pricing', 'حاسبة التسعير والربح', Calculator, 'أدوات المحل'],
  ['labels', 'بطاقات الأسعار والطباعة', Tags, 'أدوات المحل'], ['tools', 'مركز الأدوات', Wrench, 'أدوات المحل'],
  ['security', 'الأمان وسجل المراجعة', Lock, 'الإعدادات'], ['settings', 'المظهر وإعدادات المتجر', Settings, 'الإعدادات'],
] as const;
export type AdminSection = typeof adminSections[number][0];
export function initialAdminSection(): AdminSection {
  const value = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('section') : '';
  return adminSections.some(([key]) => key === value) ? value as AdminSection : 'overview';
}
const DARK_KEY = 'joe_admin_dark_v1';
export function AdminShell({ active, onChange, onVisit, name, children }: { active: string; onChange: (key: AdminSection) => void; onVisit: () => void; name?: string; children: React.ReactNode }) {
  const [search, setSearch] = useState('');
  const [dark, setDark] = useState(() => { try { return localStorage.getItem(DARK_KEY) === '1'; } catch { return false; } });
  const toggleDark = () => {
    setDark(previous => {
      const next = !previous;
      try { localStorage.setItem(DARK_KEY, next ? '1' : '0'); } catch { /* storage unavailable */ }
      return next;
    });
  };
  const sections = adminSections.filter(s => `${s[1]} ${s[3]}`.includes(search.trim()));
  // Admin-only "dark mode" for long shifts: a scoped filter-invert, not a storewide
  // theme — the customer storefront's own light-mode fix (StoreContext.tsx) is
  // untouched. Icons/photos are counter-inverted so they still read naturally.
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-7 py-4 flex flex-wrap items-center justify-between gap-3">
      <div><span className="font-black text-lg">JOE <span className="text-amber-700">Store</span></span><span className="text-sm text-slate-500 ms-3">مساحة إدارة المحل</span></div>
      <div className="flex items-center gap-4 text-sm">
        <span className="hidden sm:inline text-slate-600">أهلًا، {name}</span>
        <button onClick={toggleDark} title="وضع العين المريحة للورديات الطويلة" className="flex items-center gap-2 border border-slate-200 bg-white rounded-xl px-3 py-2 font-bold hover:bg-slate-50">
          {dark ? <Sun className="w-4 h-4 text-amber-600" /> : <Moon className="w-4 h-4" />}
        </button>
        <button onClick={onVisit} className="flex items-center gap-2 border border-slate-200 bg-white rounded-xl px-3 py-2 font-bold hover:bg-slate-50">زيارة المتجر<ArrowUpRight className="w-4 h-4" /></button>
      </div>
    </header>
    <div style={dark ? { filter: 'invert(0.93) hue-rotate(180deg)', background: '#fff' } : undefined}>
      {dark && <style>{'.admin-dark-scope img, .admin-dark-scope svg { filter: invert(1) hue-rotate(180deg); }'}</style>}
      <div className={dark ? 'admin-dark-scope' : ''}>
        <div className="max-w-[1700px] mx-auto lg:grid lg:grid-cols-[230px_minmax(0,1fr)] items-start">
          <aside className="lg:sticky lg:top-[82px] lg:max-h-[calc(100vh-82px)] lg:overflow-y-auto bg-white border-b lg:border-b-0 lg:border-e border-slate-200 p-4">
            <label className="lg:hidden text-sm font-bold block">أقسام لوحة الإدارة<select className="mt-2 w-full border border-slate-300 p-3 rounded-xl bg-white" value={active} onChange={e => onChange(e.target.value as AdminSection)}>{adminSections.map(([key, title]) => <option value={key} key={key}>{title}</option>)}</select></label>
            <input aria-label="بحث في أدوات الإدارة" placeholder="ابحث عن أداة…" className="hidden lg:block w-full rounded-xl border border-slate-200 p-2.5 text-sm mb-5 bg-slate-50" value={search} onChange={e=>setSearch(e.target.value)} />
            <nav aria-label="أقسام لوحة الإدارة" className="hidden lg:block space-y-5">{[...new Set(sections.map(s => s[3]))].map(group => <section key={group}><h2 className="text-[11px] font-bold text-slate-500 mb-2 px-3">{group}</h2><div className="space-y-1">{sections.filter(s => s[3] === group).map(([key, title, Icon]) => <button key={key} aria-current={active === key ? 'page' : undefined} onClick={() => onChange(key)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-start ${active === key ? 'bg-amber-100 text-amber-900 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><Icon className="w-4 h-4 shrink-0" />{title}</button>)}</div></section>)}</nav>
          </aside>
          <div className="min-w-0 p-4 sm:p-7"><div className="mb-6"><p className="text-xs text-slate-500 mb-1">لوحة الإدارة / {adminSections.find(s => s[0] === active)?.[3]}</p><h1 className="text-2xl font-black">{adminSections.find(s => s[0] === active)?.[1]}</h1></div>{children}</div>
        </div>
      </div>
    </div>
  </div>;
}
