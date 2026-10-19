import React,{useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {Download,WifiOff,X,RefreshCw,Smartphone} from 'lucide-react';
import {useLanguage} from '../context/LanguageContext';
import {useStore} from '../context/StoreContext';
import {pwaSnapshot,subscribePwa,promptInstall,applyPwaUpdate} from '../services/pwa';
import {deviceIsOnline} from '../services/offlineCatalog';
import {readStorage,writeStorage} from '../utils/browserStorage';
const usePwa=()=>useSyncExternalStore(subscribePwa,pwaSnapshot,pwaSnapshot);
const button='rounded-xl bg-amber-500 text-slate-950 px-4 py-2.5 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50';
function InstallButton({children}:{children?:React.ReactNode}){
  const state=usePwa(),{language}=useLanguage(),ar=language==='ar';
  const [instructions,setInstructions]=useState(false),[busy,setBusy]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{if(instructions)dialog.current?.showModal()},[instructions]);
  if(state.installed)return <span className="text-sm text-slate-600">{ar?'جو ستور مثبت على جهازك':'JOE Store is installed'}</span>;
  const install=async()=>{setBusy(true);try{if(await promptInstall()==='unavailable')setInstructions(true)}finally{setBusy(false)}};
  const ios=typeof navigator!=='undefined'&&(/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1));
  return <><button type="button" className={button} onClick={install} disabled={busy}><Download className="w-4 h-4"/>{children||(ar?'تثبيت جو ستور':'Install JOE Store')}</button>
    {instructions&&<dialog ref={dialog} aria-labelledby="install-instructions-title" onClose={()=>setInstructions(false)} className="backdrop:bg-black/60 max-w-md w-[calc(100%_-_2rem)] rounded-3xl bg-white text-slate-900 p-0 shadow-xl"><section className="relative p-6 sm:p-8"><button type="button" autoFocus aria-label={ar?'إغلاق تعليمات التثبيت':'Close install instructions'} className="absolute top-4 end-4 p-2" onClick={()=>dialog.current?.close()}><X className="w-5 h-5"/></button><Smartphone className="w-9 h-9 text-amber-700 mb-4"/><h2 id="install-instructions-title" className="font-black text-xl mb-3">{ar?'جو ستور على جهازك':'JOE Store on your device'}</h2><p className="text-sm leading-7 text-slate-600">{ios?(ar?'افتح الموقع في Safari، ثم اضغط مشاركة واختر «إضافة إلى الشاشة الرئيسية».':'Open this site in Safari, tap Share, then Add to Home Screen.'):(ar?'افتح الموقع في Chrome أو Edge. اضغط علامة التثبيت في شريط العنوان، أو افتح قائمة ⋮ واختر تثبيت التطبيق / إضافة إلى الشاشة الرئيسية. لو الاختيار لم يظهر بعد، تصفّح الموقع قليلًا وأعد المحاولة.':'Open this site in Chrome or Edge. Use the install icon in the address bar, or the browser menu: Install app / Add to Home screen. If unavailable, browse the site for a little while and try again.')}</p><p className="mt-4 text-xs leading-6 text-slate-500">{ar?'الأوفلاين يعرض آخر كتالوج محفوظ والصور التي فتحتها. تسجيل الدخول والطلبات والدفع وتحديث المخزون تحتاج اتصالًا بالإنترنت.':'Offline mode shows the saved public catalog and previously loaded pictures. Sign-in, orders, payments and stock updates require an internet connection.'}</p><button type="button" onClick={()=>dialog.current?.close()} className={`${button} mt-5 w-full`}>{ar?'فهمت':'Got it'}</button></section></dialog>}
  </>;
}
export const InstallAppButton=InstallButton;
export function OfflineReadyLabel(){
  const state=usePwa(),{catalogSavedAt}=useStore(),{language}=useLanguage();
  return state.offlineReady&&catalogSavedAt?<p className="text-xs text-emerald-800 mt-2" role="status">{language==='ar'?'الكتالوج محفوظ والتصفح بدون اتصال جاهز على هذا الجهاز.':'Catalog saved. Offline browsing is ready on this device.'}</p>:null;
}
export function PwaStatus(){
  const state=usePwa(),{language}=useLanguage(),{isOfflineCatalog,catalogSavedAt,currentTab,refreshCatalog,isCatalogLoading}=useStore(),ar=language==='ar';
  const [online,setOnline]=useState(deviceIsOnline),[dismissed,setDismissed]=useState(()=>Number(readStorage('joe_pwa_prompt_until')||0)>Date.now());
  useEffect(()=>{const update=()=>setOnline(deviceIsOnline());window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update)}},[]);
  const offline=!online||isOfflineCatalog;
  const lastSaved=catalogSavedAt?new Date(catalogSavedAt).toLocaleString(ar?'ar-EG':'en-GB'):null;
  return <div className="relative z-20 text-sm">
    {offline&&<div role="status" className="bg-amber-50 border-b border-amber-200 text-amber-950 px-4 py-3"><div className="max-w-7xl mx-auto flex flex-wrap items-start gap-3"><WifiOff className="w-5 h-5 shrink-0 mt-0.5"/><div className="flex-1 min-w-48"><p className="font-bold">{ar?'أنت تتصفح نسخة محفوظة؛ أحدث البيانات غير متاحة الآن.':'You are browsing saved data; live updates are unavailable.'}</p><p className="text-xs leading-6 mt-1">{ar?(lastSaved?`آخر حفظ: ${lastSaved}. الأسعار والتوافر قد يتغيران.`:'افتح المتجر وأنت متصل لحفظ الكتالوج على هذا الجهاز.'):(lastSaved?`Saved: ${lastSaved}. Prices and availability may change.`:'Connect once to save the catalog on this device.')} {ar?'الطلبات والدفع وتسجيل الدخول ولوحة الإدارة تحتاج إنترنت.':'Orders, payments, sign-in and administration require internet.'}</p></div>{online&&<button type="button" onClick={refreshCatalog} disabled={isCatalogLoading} className="rounded-xl border border-amber-300 px-3 py-2 text-xs font-bold disabled:opacity-50">{ar?'إعادة المحاولة':'Retry connection'}</button>}</div></div>}
    {state.updateReady&&<div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex flex-wrap gap-3 justify-center items-center"><span>{ar?'إصدار جديد من جو ستور جاهز. احفظ ما تعمل عليه قبل التحديث.':'A JOE Store update is ready. Save your work before reloading.'}</span><button type="button" className={button} onClick={applyPwaUpdate}><RefreshCw className="w-4 h-4"/>{ar?'تحديث التطبيق':'Update app'}</button></div>}
    {currentTab!=='admin'&&state.installable&&!state.installed&&!dismissed&&<div className="bg-white border-b border-amber-200 px-4 py-3"><div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3"><img src="/pwa/icon-192.png" alt="" className="w-11 h-11 rounded-xl"/><div className="flex-1 min-w-40"><p className="font-bold text-slate-900">{ar?'خلي جو ستور معاك على جهازك':'Keep JOE Store on your device'}</p><p className="text-xs text-slate-600 mt-1">{ar?'افتحه بسرعة، وتصفح الكتالوج المحفوظ حتى بدون إنترنت.':'Open quickly and browse your saved catalog offline.'}</p></div><InstallButton/><button type="button" aria-label={ar?'تذكيري لاحقًا بتثبيت التطبيق':'Remind me later'} className="p-2 text-slate-500" onClick={()=>{writeStorage('joe_pwa_prompt_until',String(Date.now()+7*86400000));setDismissed(true)}}><X className="w-5 h-5"/></button></div></div>}
  </div>;
}
