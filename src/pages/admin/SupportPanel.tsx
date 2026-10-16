import React, { useEffect, useState } from 'react';
import { Headset } from 'lucide-react';
import { neonDb } from '../../services/neonDb';
import { useAuth } from '../../context/AuthContext';

const field = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900';
const button = 'rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40';
const statusLabel: Record<string, string> = { open: 'مفتوحة', pending: 'بانتظار الرد', escalated: 'مصعّدة', closed: 'مغلقة' };

export const SupportPanel: React.FC = () => {
  const { user } = useAuth();
  const actor = user ? { id: user.id, name: user.name } : undefined;
  const [status, setStatus] = useState('');
  const [tickets, setTickets] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ ticket: any; messages: any[] } | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [newPhone, setNewPhone] = useState(''), [newName, setNewName] = useState(''), [newSubject, setNewSubject] = useState(''), [creating, setCreating] = useState(false);

  const refresh = async () => setTickets(await neonDb.listSupportTickets(status || undefined));
  useEffect(() => { refresh(); }, [status]);

  const openTicket = async (id: string) => {
    setActiveId(id); setError('');
    const result = await neonDb.getSupportTicket(id);
    setDetail(result);
  };

  const reply = async () => {
    if (!message.trim() || !activeId) return;
    const result = await neonDb.replySupportTicket(activeId, 'staff', message, actor);
    if (!result.success) { setError(result.error || 'تعذر إرسال الرد.'); return; }
    setMessage(''); await openTicket(activeId); await refresh();
  };

  const escalate = async () => {
    if (!activeId) return;
    const reason = prompt('سبب التصعيد:');
    if (!reason) return;
    const result = await neonDb.escalateSupportTicket(activeId, reason, actor);
    if (!result.success) { setError(result.error || 'تعذر التصعيد.'); return; }
    await openTicket(activeId); await refresh();
  };

  const close = async () => {
    if (!activeId) return;
    if (!confirm('هل تريدين إغلاق هذه المحادثة؟')) return;
    await neonDb.closeSupportTicket(activeId, actor);
    await openTicket(activeId); await refresh();
  };

  const createTicket = async () => {
    if (!newPhone.trim()) { setError('رقم هاتف العميل مطلوب.'); return; }
    setCreating(true); setError('');
    try {
      const result = await neonDb.createSupportTicket(newPhone.trim(), '', newName.trim() || undefined, newSubject.trim() || undefined);
      if (!result.success || !result.ticket) { setError(result.error || 'تعذر فتح المحادثة.'); return; }
      setNewPhone(''); setNewName(''); setNewSubject('');
      await refresh(); await openTicket(result.ticket.id);
    } finally { setCreating(false); }
  };

  return <div className="space-y-4 font-cairo">
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
      <div className="space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2">
          <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Headset className="w-3.5 h-3.5 text-amber-700" />بدء محادثة جديدة</h3>
          <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="هاتف العميل" className={`${field} text-xs`} />
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="اسم العميل (اختياري)" className={`${field} text-xs`} />
          <input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="الموضوع" className={`${field} text-xs`} />
          <button disabled={creating} onClick={createTicket} className="w-full bg-amber-500 hover:bg-amber-400 text-black rounded-lg p-2 text-xs font-bold disabled:opacity-50">إنشاء / فتح المحادثة</button>
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} className={`${field} text-xs`}>
          <option value="">كل الحالات</option><option value="open">مفتوحة</option><option value="pending">بانتظار الرد</option>
          <option value="escalated">مصعّدة</option><option value="closed">مغلقة</option>
        </select>
        <div className="space-y-2 max-h-[60vh] overflow-auto">
          {!tickets.length && <p className="text-slate-500 text-xs">لا توجد محادثات.</p>}
          {tickets.map(ticket => <button key={ticket.id} onClick={() => openTicket(ticket.id)}
            className={`w-full text-right rounded-xl border p-3 text-xs ${activeId === ticket.id ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white'}`}>
            <div className="flex justify-between"><strong>{ticket.customer_name || ticket.customer_phone}</strong><span className="text-slate-500">{statusLabel[ticket.status] || ticket.status}</span></div>
            <p className="text-slate-500 mt-1 line-clamp-1">{ticket.subject}</p>
            {!ticket.assigned_to && ticket.status !== 'closed' && <span className="text-amber-700 text-[10px]">غير مسندة بعد</span>}
          </button>)}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        {error && <p role="alert" className="text-rose-700 text-sm mb-2">{error}</p>}
        {!detail ? <p className="text-slate-500 text-sm">اختاري محادثة لعرض الرسائل.</p> : <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><h3 className="font-bold">{detail.ticket.customer_name || detail.ticket.customer_phone}</h3>
              <p className="text-xs text-slate-500">{detail.ticket.subject} · {statusLabel[detail.ticket.status]}</p></div>
            {detail.ticket.status !== 'closed' && <div className="flex gap-2">
              <button onClick={escalate} className="text-xs rounded-lg bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5">تصعيد</button>
              <button onClick={close} className="text-xs rounded-lg bg-slate-100 px-3 py-1.5">إغلاق المحادثة</button>
            </div>}
          </div>
          {detail.ticket.escalation_reason && <p className="text-xs text-rose-700 bg-rose-50 rounded-lg p-2">سبب التصعيد: {detail.ticket.escalation_reason}</p>}
          {detail.ticket.csat_rating && <p className="text-xs text-emerald-700">تقييم العميل: {'⭐'.repeat(detail.ticket.csat_rating)} {detail.ticket.csat_comment}</p>}
          <div className="space-y-2 max-h-[40vh] overflow-auto border-y border-slate-100 py-2">
            {detail.messages.map(entry => <div key={entry.id} className={`text-xs rounded-xl p-2.5 max-w-[80%] ${entry.sender_type === 'staff' ? 'bg-amber-50 mr-auto text-right' : 'bg-slate-100 ml-auto'}`}>
              <p>{entry.body}</p><span className="text-[10px] text-slate-500 block mt-1">{new Date(entry.created_at).toLocaleString('ar-EG')}</span>
            </div>)}
          </div>
          {detail.ticket.status !== 'closed' && <div className="flex gap-2">
            <input value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && reply()}
              placeholder="اكتبي ردًا…" className={`${field} text-xs flex-1`} />
            <button onClick={reply} className="rounded-lg bg-amber-500 hover:bg-amber-400 text-black px-4 text-xs font-bold">إرسال</button>
          </div>}
        </div>}
      </div>
    </div>
  </div>;
};
