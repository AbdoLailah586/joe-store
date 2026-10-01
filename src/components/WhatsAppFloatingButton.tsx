import React, { useState } from 'react';
import { MessageCircle, X, Send, Sparkles, Smartphone, HelpCircle, Truck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { generateWhatsAppWebLink } from '../utils/whatsappService';

export const WhatsAppFloatingButton: React.FC = () => {
  const { settings, currentTab } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [customMsg, setCustomMsg] = useState('');

  // If in admin dashboard, we can keep it subtle or hidden
  const quickQuestions = [
    { text: 'السلام عليكم، أريد الاستفسار عن الآيفون كسر زيرو المتوفر وأسعاره اليوم.', icon: '📱' },
    { text: 'مرحباً، أود السؤال عن مواعيد العمل وعنوان المحل في المنصورة.', icon: '📍' },
    { text: 'أريد معرفة تفاصيل الضمان وإمكانية فحص الجهاز قبل الاستلام.', icon: '🛡️' },
    { text: 'أود تتبع شحنتي والتأكد من موعد وصول المندوب.', icon: '🚚' },
  ];

  const handleSend = (text: string) => {
    const url = generateWhatsAppWebLink(settings.store_whatsapp, text);
    window.open(url, '_blank');
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 right-5 z-40 flex flex-col items-end">
      {/* Interactive Chat Popup */}
      {isOpen && (
        <div className="mb-3 w-80 sm:w-96 bg-[#0F1626] border border-emerald-500/40 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-700 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">
                  📱
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-emerald-700" />
              </div>
              <div>
                <h3 className="font-bold text-sm font-cairo">خدمة عملاء جو ستور</h3>
                <p className="text-[11px] text-emerald-100 flex items-center gap-1 font-cairo">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  <span>متصل الآن | رد فوري خلال دقائق</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full hover:bg-white/20 text-white/80 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3 bg-[#0A0E1A]/90">
            <div className="p-3 rounded-2xl bg-slate-900 border border-white/5 text-xs text-slate-200 leading-relaxed font-cairo">
              👋 أهلاً بك في متجر <strong>جو ستور (JOE Store)</strong>! كيف يمكننا مساعدتك اليوم بخصوص الهواتف، الإكسسوارات، أو طلباتك؟
            </div>

            {/* Quick Chips */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-cairo">
                استفسارات سريعة شائعة:
              </p>
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q.text)}
                  className="w-full text-right p-2 rounded-xl bg-slate-900/80 hover:bg-emerald-500/15 border border-white/5 hover:border-emerald-500/30 text-xs text-slate-300 transition-all flex items-center gap-2 group"
                >
                  <span>{q.icon}</span>
                  <span className="flex-1 line-clamp-1 group-hover:text-emerald-300">{q.text}</span>
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <div className="pt-2 flex items-center gap-2">
              <input
                type="text"
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && customMsg.trim() && handleSend(customMsg)}
                placeholder="اكتب رسالتك مباشرة..."
                className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => customMsg.trim() && handleSend(customMsg)}
                className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Trigger Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 border border-emerald-300/40"
      >
        <span className="relative flex items-center justify-center">
          <MessageCircle className="w-5 h-5 fill-slate-950" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-white animate-ping" />
        </span>
        <span className="font-cairo hidden sm:inline-block">تواصل عبر واتساب</span>
      </button>
    </div>
  );
};
