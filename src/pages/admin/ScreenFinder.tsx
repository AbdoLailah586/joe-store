import React, { useMemo, useRef, useEffect, useState } from 'react';
import { X, Camera, Star, Download, Mic } from 'lucide-react';
import data from '../../data/screenFinder.json';
import { matchesFinder, downloadCsv, pageSlice } from '../../utils/storeExpansion';
import { readStoredArray, readStoredJson, writeStoredJson } from '../../utils/browserStorage';
import { Pagination } from '../../components/Pagination';
const field = 'border border-slate-300 rounded-xl px-3 py-2.5 bg-white text-sm text-slate-900 w-full';
export function ScreenFinder() {
  const [query, setQuery] = useState(''), [brand, setBrand] = useState('all'), [type, setType] = useState('all');
  const [mode, setMode] = useState<'models' | 'boxes'>('models'), [page, setPage] = useState(1), [onlyStarred, setOnlyStarred] = useState(false);
  const [selected, setSelected] = useState<typeof data.boxes[number] | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const recognition = useRef<any>(null);
  const [listening, setListening] = useState(false);
  useEffect(() => () => recognition.current?.abort(), []);
  const voiceSearch = () => {
    if (listening) { recognition.current?.stop(); return; }
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) { setNotice('البحث الصوتي غير مدعوم في هذا المتصفح. استخدم البحث بالكتابة.'); return; }
    const r = new Recognition(); recognition.current = r; r.lang = 'ar-EG'; r.continuous = false; r.interimResults = false;
    r.onresult = (e: any) => { setQuery(e.results?.[0]?.[0]?.transcript || ''); setMode('models'); };
    r.onend = () => setListening(false);
    r.onerror = () => { setListening(false); setNotice('تعذر البحث الصوتي. راجع إذن الميكروفون أو اكتب اسم الموديل.'); };
    try { r.start(); setListening(true); } catch { setListening(false); setNotice('تعذر تشغيل البحث الصوتي.'); }
  };
  const [starred, setStarred] = useState(() => readStoredArray('joe_screen_starred', (v): v is string => typeof v === 'string'));
  const [locations, setLocations] = useState<Record<string, string>>(() => readStoredJson('joe_screen_locations', {}, (v): v is Record<string, string> => !!v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every(x => typeof x === 'string')));
  const [locationDraft, setLocationDraft] = useState(''), [notice, setNotice] = useState('');
  useEffect(() => { setPage(1); }, [query, brand, type, mode, onlyStarred]);
  useEffect(() => { if (selected) { setLocationDraft(locations[selected.id] ?? selected.shelf_location); dialog.current?.showModal(); } }, [selected]);
  const boxMatches = (b: typeof data.boxes[number]) => (type === 'all' || b.category === type) && (!onlyStarred || starred.includes(b.id))
    && (brand === 'all' || b.models.some(m => m.brand === brand));
  const boxes = useMemo(() => data.boxes.filter(b => boxMatches(b) && matchesFinder([b.box_code, b.screen_title, locations[b.id] ?? b.shelf_location, ...b.models.map(m => m.name)].join(' '), query)), [query, brand, type, onlyStarred, starred, locations]);
  const models = useMemo(() => data.models.filter(m => (brand === 'all' || m.brand === brand) && matchesFinder([m.name, m.brand_ar, ...m.search_tokens, ...m.boxes.map(b => `${b.box_code} ${locations[b.box_id] ?? b.shelf_location}`)].join(' '), query)
    && m.boxes.some(b => (type === 'all' || b.category === type) && (!onlyStarred || starred.includes(b.box_id)))), [query, brand, type, onlyStarred, starred, locations]);
  const slice = pageSlice(mode === 'models' ? models : boxes as any[], page, 24);
  const openBox = (id: string) => setSelected(data.boxes.find(b => b.id === id) || null);
  const star = (id: string) => { const next = starred.includes(id) ? starred.filter(x => x !== id) : [...starred, id]; setStarred(next); if (!writeStoredJson('joe_screen_starred', next)) setNotice('المفضلة تعمل الآن لكن تعذّر حفظها في المتصفح.'); };
  const exportRows = () => {
    const filteredIds = new Set(models.map(m => m.name));
    const rows = mode === 'boxes' ? boxes : data.boxes.filter(b => boxMatches(b) && b.models.some(m => filteredIds.has(m.name)));
    downloadCsv('JOE_Screen_Finder', ['كود الباكتة', 'نوع الحماية', 'مكان الرف', 'الموديلات المتوافقة', 'ملاحظات المصدر'], rows.map(b => [b.box_code, b.category_ar, locations[b.id] ?? b.shelf_location, b.models.map(m => m.name).join(' / '), b.notes]));
  };
  return <div className="space-y-5">
    <div className="bg-white border border-slate-200 rounded-2xl p-5"><h2 className="text-lg font-black">فاحص الاسكرينات والتوافق</h2><p className="text-sm text-slate-600 mt-2">{data.total_boxes} باكتة بالصور • {data.total_models} موديل. دليل المطابقة من مشروعك الأصلي؛ التوافق ومكان الرف من البيانات المستوردة، والكمية الفعلية تُراجع في المحل.</p></div>
    <div className="flex gap-2 flex-wrap">{[['models', 'بحث بالموديل'], ['boxes', 'استعراض الباكتات']].map(([key, name]) => <button key={key} onClick={() => setMode(key as any)} className={`rounded-xl px-4 py-2 font-bold text-sm ${mode === key ? 'bg-amber-500 text-black' : 'bg-white border border-slate-200 text-slate-700'}`}>{name}</button>)}</div>
    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
      <label className="block text-sm font-bold">اسم الموبايل أو كود الباكتة أو مكان الرف<input className={`${field} mt-2`} value={query} onChange={e => setQuery(e.target.value)} placeholder="مثال: Oppo A5، سامسونج A15، K173" /></label>
      <button onClick={voiceSearch} className="flex items-center gap-2 border border-slate-300 rounded-xl px-3 py-2 text-sm"><Mic className="w-4 h-4" />{listening ? 'إيقاف الاستماع' : 'البحث بالصوت'}</button>
      <div className="grid sm:grid-cols-3 gap-3"><label className="text-xs font-bold text-slate-600">الماركة<select className={`${field} mt-1`} value={brand} onChange={e => setBrand(e.target.value)}><option value="all">كل الماركات</option>{data.brands.map(b => <option key={b}>{b}</option>)}</select></label>
        <label className="text-xs font-bold text-slate-600">نوع الاسكرينة<select className={`${field} mt-1`} value={type} onChange={e => setType(e.target.value)}>{data.categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyStarred} onChange={e => setOnlyStarred(e.target.checked)} />الباكتات المفضلة فقط</label></div>
      <div className="flex flex-wrap gap-2">{['Oppo A5', 'Realme C55', 'Samsung Galaxy A15', 'Redmi Note 12', 'Honor 400'].map(q => <button key={q} onClick={() => { setMode('models'); setQuery(q); }} className="text-xs border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50">{q}</button>)}</div>
    </div>
    <div className="flex justify-between items-center gap-3"><p className="text-sm text-slate-600">{slice.from}–{slice.to} من {mode === 'models' ? models.length : boxes.length} نتيجة</p><button onClick={exportRows} className="flex gap-2 items-center text-sm font-bold border border-slate-300 px-3 py-2 rounded-xl bg-white"><Download className="w-4 h-4" />تصدير نتائج المطابقة</button></div>
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{mode === 'models' ? (slice.rows as typeof models).map(m => <article key={m.name} className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3"><div><span className="text-xs text-slate-500">{m.brand_ar}</span><h3 className="font-bold" dir="ltr">{m.name}</h3></div><div className="space-y-2">{m.boxes.filter(b => (type === 'all' || b.category === type) && (!onlyStarred || starred.includes(b.box_id))).map(b => <button key={b.box_id} onClick={() => openBox(b.box_id)} className="w-full text-start rounded-xl border border-slate-200 px-3 py-2 text-xs hover:border-amber-400"><strong className="text-amber-800">{b.category_ar}</strong><span className="block mt-1 text-slate-600">{b.box_code} • {locations[b.box_id] ?? b.shelf_location}</span><span className="block mt-1 text-slate-500">عرض صورة الباكتة والتوافق</span></button>)}</div></article>)
      : (slice.rows as typeof boxes).map(b => <article key={b.id} className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3"><div className="flex justify-between gap-2"><h3 className="font-bold text-sm">{b.screen_title}</h3><button aria-label={`تفضيل ${b.box_code}`} onClick={() => star(b.id)}><Star className={`w-5 h-5 ${starred.includes(b.id) ? 'fill-amber-400 text-amber-600' : 'text-slate-400'}`} /></button></div><p className="text-xs text-slate-500">{b.box_code} • {b.models.length} موديل</p><p className="text-sm">{locations[b.id] ?? b.shelf_location}</p><button onClick={() => setSelected(b)} className="flex items-center gap-2 text-amber-800 text-sm font-bold"><Camera className="w-4 h-4" />عرض الصورة والتوافق</button></article>)}</div>
    {!slice.rows.length && <p className="p-10 text-center bg-white rounded-2xl border border-slate-200 text-slate-600">لا توجد مطابقة بالشروط الحالية. جرّب اسم الموديل بالإنجليزية أو امسح الفلاتر.<button className="block mx-auto mt-4 text-amber-800 underline" onClick={() => { setQuery(''); setType('all'); setBrand('all'); setOnlyStarred(false); }}>مسح البحث والفلاتر</button></p>}
    <Pagination page={slice.page} pages={slice.pages} onChange={setPage} />
    {notice && !selected && <p role="status" className="text-sm text-slate-700">{notice}</p>}
    <dialog ref={dialog} onClose={() => setSelected(null)} className="rounded-2xl p-0 w-[min(920px,94vw)] max-h-[90vh] bg-white text-slate-900 backdrop:bg-black/60">
      {selected && <div className="p-5 space-y-4"><div className="flex items-start justify-between gap-3"><h2 className="font-bold">{selected.screen_title} • {selected.box_code}</h2><button onClick={() => dialog.current?.close()} aria-label="إغلاق تفاصيل الباكتة" className="p-2 bg-slate-100 rounded-xl"><X className="w-5 h-5" /></button></div><img src={`/screen-finder-images/${encodeURIComponent(selected.filename)}`} alt={`صورة الباكتة ${selected.box_code}`} className="w-full max-h-[55vh] object-contain bg-slate-50 rounded-xl" />
        <p className="text-sm text-slate-600">{selected.notes}</p><div className="flex flex-wrap gap-2">{selected.models.map(m => <span key={m.name} className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-xs" dir="ltr">{m.name}</span>)}</div>
        <label className="block text-xs font-bold">مكان الرف في نسختك<input className={`${field} mt-1`} value={locationDraft} onChange={e => setLocationDraft(e.target.value)} /></label><div className="flex gap-3 flex-wrap"><button onClick={() => { const next = { ...locations, [selected.id]: locationDraft.trim() }; setLocations(next); setNotice(writeStoredJson('joe_screen_locations', next) ? 'تم حفظ مكان الرف في هذا المتصفح.' : 'تغير المكان الآن وتعذّر حفظه في المتصفح.'); }} className="px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-sm">حفظ مكان الرف محليًا</button><button onClick={() => star(selected.id)} className="px-4 py-2 border border-slate-300 rounded-xl text-sm">{starred.includes(selected.id) ? 'إزالة من المفضلة' : 'تفضيل الباكتة'}</button></div>{notice && <p role="status" className="text-sm text-slate-700">{notice}</p>}<p className="text-xs text-slate-500">صور المصدر الأصلية تُحمّل عند فتح الباكتة فقط. تعديل مكان الرف والمفضلة محفوظان في هذا المتصفح.</p></div>}
    </dialog>
  </div>;
}
