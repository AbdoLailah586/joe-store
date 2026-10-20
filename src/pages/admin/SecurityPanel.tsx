import React, { useEffect, useState } from 'react';
import { ShieldCheck, KeyRound, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { neonDb } from '../../services/neonDb';
import { InfoButton } from '../../components/DetailsDialog';

const field = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900';
const button = 'rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40';
const box = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';

export const SecurityPanel: React.FC = () => {
  const { user } = useAuth();
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [auditRows, setAuditRows] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);

  useEffect(() => {
    neonDb.getAuditLog().then(setAuditRows).catch(() => {}).finally(() => setAuditLoading(false));
  }, []);

  const beginSetup = async () => {
    if (!user) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await neonDb.setupTotp(user.id);
      if (!result.success || !result.secret) { setError(result.error || 'تعذر تجهيز المصادقة الثنائية.'); return; }
      setSetup({ secret: result.secret, otpauthUrl: result.otpauthUrl || '' });
    } finally { setBusy(false); }
  };

  const confirmSetup = async () => {
    if (!user) return;
    setBusy(true); setError('');
    try {
      const result = await neonDb.confirmTotp(user.id, code);
      if (!result.success) { setError(result.error || 'كود التفعيل غير صحيح.'); return; }
      setSetup(null); setCode(''); setMessage('تم تفعيل المصادقة الثنائية بنجاح لحسابك.');
    } finally { setBusy(false); }
  };

  const disable = async () => {
    if (!user) return;
    if (!confirm('هل تريدين تعطيل المصادقة الثنائية لحسابك؟')) return;
    setBusy(true); setError('');
    try {
      const result = await neonDb.disableTotp(user.id, password);
      if (!result.success) { setError(result.error || 'تعذر تعطيل المصادقة الثنائية.'); return; }
      setPassword(''); setMessage('تم تعطيل المصادقة الثنائية لحسابك.');
    } finally { setBusy(false); }
  };

  return <div className="space-y-6 font-cairo">
    <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 leading-relaxed">
      المصادقة الثنائية وسجل المراجعة هنا يضيفان حماية إضافية ضد اختراق جلسة أو كلمة مرور متسربة، بنفس مستوى الثقة
      المستخدم في بقية لوحة الإدارة الحالية — وليسا حماية مضمونة ضد من يملك وصولًا مباشرًا لقاعدة البيانات.
    </p>

    <div className={box}>
      <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-1"><KeyRound className="w-4 h-4 text-amber-700" /> المصادقة الثنائية (2FA) لحسابك</h3>
      <p className="text-xs text-slate-600 mb-4">تُطلب بعد تأكيد الدخول بكلمة المرور أو Google أو كود البريد.</p>
      {message && <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-3 flex items-center gap-2"><CheckCircle className="w-4 h-4" />{message}</p>}
      {error && <p role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3 mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</p>}
      {!setup ? <div className="flex flex-wrap items-center gap-3">
        <button className={button} disabled={busy} onClick={beginSetup}>تفعيل / إعادة تجهيز 2FA</button>
        <input type="text" inputMode="numeric" maxLength={6} className={`${field} max-w-xs`} placeholder="كود تطبيق المصادقة لإلغاء التفعيل" value={password} onChange={e => setPassword(e.target.value)} />
        <button className={button} disabled={busy || !password} onClick={disable}>تعطيل 2FA</button>
      </div> : <div className="space-y-3">
        <p className="text-xs text-slate-700">افتحي تطبيق المصادقة (Google Authenticator أو ما شابه) وأدخلي هذا المفتاح يدويًا:</p>
        <code className="block text-xs bg-slate-100 p-2 rounded-lg break-all">{setup.secret}</code>
        <input className={`${field} max-w-[10rem] text-center tracking-[0.3em]`} inputMode="numeric" maxLength={6} placeholder="123456" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
        <div className="flex gap-2">
          <button className={button} disabled={busy || code.length !== 6} onClick={confirmSetup}>تأكيد التفعيل</button>
          <button className={button} onClick={() => setSetup(null)}>إلغاء</button>
        </div>
      </div>}
    </div>

    <div className={box}>
      <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-1"><ShieldCheck className="w-4 h-4 text-amber-700" /> سجل المراجعة</h3>
      <p className="text-xs text-slate-600 mb-4">آخر العمليات الحساسة: تغيير الرتب، حذف الحسابات، تعديل الأسعار والتكلفة، إلغاء الطلبات.</p>
      {auditLoading ? <p className="text-xs text-slate-500">جاري التحميل…</p> : !auditRows.length ? <p className="text-xs text-slate-500">لا توجد عمليات مسجلة بعد.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="text-slate-500 border-b border-slate-200"><tr><th className="p-2">الوقت</th><th className="p-2">الموظف</th><th className="p-2">العملية</th><th className="p-2">العنصر</th><th className="p-2">السبب</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{auditRows.map(row => <tr key={row.id}>
              <td className="p-2 text-slate-500 whitespace-nowrap">{new Date(row.created_at).toLocaleString('ar-EG')}</td>
              <td className="p-2">{row.actor_name || row.actor_id || '-'}</td>
              <td className="p-2 font-mono"><InfoButton details={{ title: 'تفاصيل عملية في سجل المراجعة', description: 'السجل يوثق عملية سابقة. عرض التفاصيل لا يعيد تنفيذها ولا يتراجع عنها.', facts: [{ label: 'العملية', value: row.action }, { label: 'المنفذ', value: row.actor_name || row.actor_id || '—' }, { label: 'العنصر', value: `${row.entity} ${row.entity_id || ''}` }, { label: 'التاريخ', value: new Date(row.created_at).toLocaleString('ar-EG') }, { label: 'السبب المسجل', value: row.reason || 'غير مسجل' }] }}>{row.action}</InfoButton></td>
              <td className="p-2">{row.entity}{row.entity_id ? ` #${String(row.entity_id).slice(0, 8)}` : ''}</td>
              <td className="p-2 text-slate-500">{row.reason || '-'}</td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  </div>;
};
