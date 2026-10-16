import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, ShieldCheck, X, Trash2 } from 'lucide-react';
import { neonDb } from '../../services/neonDb';
import { useAuth, User } from '../../context/AuthContext';
import { adminSections } from './AdminShell';
const field='w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900';
const owner='abdolailah586@gmail.com';
type Mode='customer'|'limited'|'admin';
const accessMode=(u:User):Mode=>u.role==='admin'?'admin':u.admin_permissions?.length?'limited':'customer';
export function UsersTab() {
  const { user: current, isAdmin }=useAuth();
  const [users,setUsers]=useState<User[]>([]),[loading,setLoading]=useState(true),[search,setSearch]=useState(''),[filter,setFilter]=useState('all');
  const [notice,setNotice]=useState(''),[error,setError]=useState(''),[editing,setEditing]=useState<User|null>(null),[mode,setMode]=useState<Mode>('customer'),[permissions,setPermissions]=useState<string[]>([]),[saving,setSaving]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);
  const load=async()=>{setLoading(true);setError('');try{setUsers(await neonDb.getAllUsers())}catch(e:any){setError(e.message||'تعذر تحميل المستخدمين.')}finally{setLoading(false)}};
  useEffect(()=>{void load()},[]);
  useEffect(()=>{if(editing)dialog.current?.showModal()},[editing]);
  const open=(u:User)=>{setEditing(u);setMode(accessMode(u));setPermissions(u.admin_permissions||[]);setError('');setNotice('')};
  const save=async()=>{
    if(!editing||!isAdmin||saving)return;
    if(mode==='limited'&&!permissions.length){setError('اختر قسمًا واحدًا على الأقل للدخول المحدد.');return}
    setSaving(true);setError('');
    try{
      const result=await neonDb.updateUserAccess(editing.id,{role:mode==='admin'?'admin':'customer',permissions:mode==='limited'?permissions:[]});
      if(!result.success||!result.user)throw new Error(result.error||'تعذر حفظ الصلاحيات.');
      setUsers(prev=>prev.map(u=>u.id===editing.id?result.user:u));setNotice(`تم حفظ صلاحيات ${editing.name}. تتحدث عند رجوعه للموقع أو خلال دقيقة وهو فاتحه.`);dialog.current?.close();
      setEditing(null);
    }catch(e:any){setError(e.message||'تعذر حفظ الصلاحيات.')}finally{setSaving(false)}
  };
  const remove=async(u:User)=>{
    if(!isAdmin||u.id===current?.id||u.email.toLowerCase()===owner)return;
    if(!confirm(`هل تريد حذف حساب ${u.name} نهائيًا؟ لا يمكن التراجع عن الحذف.`))return;
    try{const result=await neonDb.deleteUser(u.id);if(!result.success)throw new Error(result.error);setUsers(prev=>prev.filter(x=>x.id!==u.id));setNotice('تم حذف الحساب.')}catch(e:any){setError(e.message||'تعذر حذف الحساب.')}
  };
  const titles={customer:'عميل عادي',limited:'أقسام محددة',admin:'مدير كامل'};
  const rows=users.filter(u=>(filter==='all'||accessMode(u)===filter)&&[u.name,u.email,u.phone].join(' ').toLowerCase().includes(search.trim().toLowerCase()));
  return <div className="space-y-5">
    <p className="p-4 bg-white border border-slate-200 rounded-2xl text-sm text-slate-600">المدير الكامل يحدد أقسام الإدارة لكل حساب. الدخول المحدد لا يمنح المستخدم إدارة الصلاحيات، حتى لو سُمح له بعرض صفحة المستخدمين. تعديل المنتجات يحتاج صلاحية «المنتجات»؛ تقارير المخزون متاحة بصلاحيتها المستقلة.</p>
    {!isAdmin&&<p className="p-4 rounded-xl bg-amber-50 text-amber-900 text-sm">لديك صلاحية عرض المستخدمين فقط. حفظ الصلاحيات وحذف الحسابات متاحان للمدير الكامل.</p>}
    {notice&&<p role="status" className="p-4 bg-emerald-50 text-emerald-800 rounded-xl">{notice}</p>}{error&&!editing&&<p role="alert" className="p-4 bg-rose-50 text-rose-800 rounded-xl">{error}</p>}
    <div className="grid sm:grid-cols-3 gap-3">{(['admin','limited','customer'] as const).map(key=><div key={key} className="bg-white rounded-2xl border border-slate-200 p-5"><p className="text-sm text-slate-500">{titles[key]}</p><strong className="text-2xl font-black block mt-2">{users.filter(u=>accessMode(u)===key).length}</strong></div>)}</div>
    <div className="flex flex-wrap gap-3 items-center bg-white rounded-2xl border border-slate-200 p-4"><label className="flex-1 min-w-48 text-xs text-slate-500">بحث عن مستخدم<input className={`${field} mt-2`} value={search} onChange={e=>setSearch(e.target.value)} placeholder="الاسم أو البريد أو الهاتف"/></label><label className="text-xs text-slate-500">نوع الصلاحية<select className={`${field} mt-2`} value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">كل الحسابات</option>{Object.entries(titles).map(([key,title])=><option key={key} value={key}>{title}</option>)}</select></label><button onClick={load} disabled={loading} className="px-4 py-3 border border-slate-300 rounded-xl text-sm flex gap-2"><RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/>تحديث القائمة</button></div>
    {loading?<p role="status" className="p-8 text-center">جارٍ تحميل المستخدمين…</p>:<div className="space-y-3">{rows.map(u=><article key={u.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap justify-between gap-4 items-center"><div className="min-w-0"><h2 className="font-bold">{u.name}{u.id===current?.id?' • أنت':''}{u.email.toLowerCase()===owner?' • المالك':''}</h2><p className="text-sm text-slate-600 break-all mt-1">{u.email}</p><p className="text-xs text-slate-500 mt-1">{u.provider==='google'?'Google':'البريد'} • {u.created_at?new Date(u.created_at).toLocaleDateString('ar-EG'):''}</p><span className="inline-flex gap-1 items-center px-3 py-1 bg-amber-50 text-amber-900 text-xs rounded-full mt-2"><ShieldCheck className="w-3 h-3"/>{titles[accessMode(u)]}{accessMode(u)==='limited'?` • ${u.admin_permissions?.length} أقسام`:''}</span>{accessMode(u)==='limited'&&<p className="text-xs text-slate-600 mt-2">{adminSections.filter(s=>u.admin_permissions?.includes(s[0])).map(s=>s[1]).join('، ')}</p>}</div>{isAdmin&&<div className="flex items-center gap-2"><button disabled={u.email.toLowerCase()===owner||u.id===current?.id} onClick={()=>open(u)} className="border border-amber-300 rounded-xl px-4 py-2.5 bg-amber-50 text-amber-900 font-bold text-sm disabled:opacity-40">تحديد الصلاحيات</button><button aria-label={`حذف حساب ${u.name}`} disabled={u.email.toLowerCase()===owner||u.id===current?.id} onClick={()=>remove(u)} className="p-2.5 text-rose-700 disabled:opacity-30"><Trash2 className="w-4 h-4"/></button></div>}</article>)}{!rows.length&&<p className="text-center p-8 text-slate-600">لا توجد حسابات تطابق البحث.</p>}</div>}
    <dialog ref={dialog} onCancel={e=>{if(saving)e.preventDefault()}} onClose={()=>{if(!saving)setEditing(null)}} className="w-[min(800px,95vw)] max-h-[90vh] p-0 rounded-2xl bg-white text-slate-900 backdrop:bg-black/50">
      {editing&&<div className="p-5 sm:p-7 space-y-5"><div className="flex justify-between gap-3"><div><h2 className="font-black text-xl">صلاحيات {editing.name}</h2><p className="text-sm text-slate-500 break-all mt-1">{editing.email}</p></div><button disabled={saving} onClick={()=>dialog.current?.close()} aria-label="إغلاق الصلاحيات"><X className="w-5 h-5"/></button></div><label className="block text-sm font-bold">نوع الوصول<select className={`${field} mt-2`} value={mode} onChange={e=>setMode(e.target.value as Mode)} disabled={saving}>{Object.entries(titles).map(([key,title])=><option key={key} value={key}>{title}</option>)}</select></label>
      {mode==='admin'&&<p className="bg-amber-50 p-4 rounded-xl text-sm text-amber-900">المدير الكامل يمكنه فتح كل الأقسام وتعديل صلاحيات بقية المستخدمين.</p>}{mode==='customer'&&<p className="text-sm text-slate-600">حساب تسوق بدون دخول لوحة الإدارة.</p>}
      {mode==='limited'&&<div className="space-y-4"><p className="text-sm text-slate-600">حدد الصفحات المسموحة. فتح مركز الأدوات وحده لا يفتح الأدوات الأخرى، وصفحة المستخدمين تكون للعرض فقط.</p><div className="flex gap-3"><button disabled={saving} onClick={()=>setPermissions(adminSections.map(s=>s[0]))} className="underline text-sm text-amber-800">تحديد كل الصفحات</button><button disabled={saving} onClick={()=>setPermissions([])} className="underline text-sm text-slate-600">مسح التحديد</button></div>{[...new Set(adminSections.map(s=>s[3]))].map(group=><fieldset key={group} className="border border-slate-200 rounded-xl p-4"><legend className="px-2 font-bold text-sm">{group}</legend><div className="grid sm:grid-cols-2 gap-3">{adminSections.filter(s=>s[3]===group).map(([key,title])=><label key={key} className="flex items-center gap-3 text-sm cursor-pointer"><input type="checkbox" disabled={saving} checked={permissions.includes(key)} onChange={e=>setPermissions(prev=>e.target.checked?[...prev,key]:prev.filter(k=>k!==key))}/>{title}</label>)}</div></fieldset>)}</div>}
      {error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}<div className="flex justify-between items-center border-t border-slate-200 pt-4 gap-3"><p className="text-xs text-slate-500">{mode==='limited'?`${permissions.length} قسم محدد`:titles[mode]}</p><button disabled={saving} onClick={save} className="px-5 py-3 bg-amber-500 rounded-xl font-bold disabled:opacity-50">{saving?'جارٍ الحفظ…':'حفظ الصلاحيات'}</button></div></div>}
    </dialog>
  </div>;
}
