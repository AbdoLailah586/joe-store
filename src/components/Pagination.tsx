import React from 'react';
import { pageWindow } from '../utils/storeExpansion';
export function Pagination({ page, pages, onChange, language = 'ar' }: { page: number; pages: number; onChange: (p: number) => void; language?: string }) {
  if (pages <= 1) return null;
  const ar = language === 'ar';
  const button = 'min-w-10 h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:border-amber-500 disabled:opacity-40 disabled:cursor-not-allowed';
  return <nav aria-label={ar ? 'ترقيم الصفحات' : 'Pagination'} className="flex flex-wrap items-center justify-center gap-2 py-5" dir={ar ? 'rtl' : 'ltr'}>
    <button className={button} disabled={page <= 1} onClick={() => onChange(page - 1)}>{ar ? 'السابق' : 'Previous'}</button>
    {pageWindow(page, pages).map((p, i) => p === '…' ? <span key={`gap-${i}`} className="px-1 text-slate-500">…</span> : <button key={p} aria-label={`${ar ? 'صفحة' : 'Page'} ${p}`} aria-current={p === page ? 'page' : undefined} onClick={() => onChange(p)} className={p === page ? `${button} !bg-amber-500 !text-black !border-amber-500` : button}>{p}</button>)}
    <button className={button} disabled={page >= pages} onClick={() => onChange(page + 1)}>{ar ? 'التالي' : 'Next'}</button>
  </nav>;
}
