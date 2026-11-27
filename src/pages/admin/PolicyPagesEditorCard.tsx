import React, { useEffect, useState } from 'react';
import { FileText, RotateCcw, Save, CheckCircle2, ShieldCheck, Truck } from 'lucide-react';
import type { PolicyPagesConfig, StoreSettings } from '../../types';
import { POLICY_META, getDefaultPolicyDoc, type PolicyKey } from '../../utils/policyDefaults';

interface PolicyPagesEditorCardProps {
  settings: StoreSettings;
  updateSettings: (partial: Partial<StoreSettings>) => Promise<void> | void;
}

const POLICY_TABS: Array<{ key: PolicyKey; icon: typeof FileText }> = [
  { key: 'terms', icon: FileText },
  { key: 'privacy', icon: ShieldCheck },
  { key: 'refund', icon: RotateCcw },
  { key: 'shipping', icon: Truck },
];

export const PolicyPagesEditorCard: React.FC<PolicyPagesEditorCardProps> = ({
  settings,
  updateSettings,
}) => {
  const [selectedKey, setSelectedKey] = useState<PolicyKey>('terms');
  const [heading, setHeading] = useState('');
  const [intro, setIntro] = useState('');
  const [body, setBody] = useState('');
  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const freeThreshold = `${Number(settings.free_shipping_threshold ?? 2500).toLocaleString()} ج.م`;
  const storeName = settings.store_name_ar || 'جو ستور - JOE Store';

  const loadTabContent = (key: PolicyKey) => {
    const def = getDefaultPolicyDoc(key, { storeName, freeThreshold });
    const custom = settings.policy_pages?.[key];
    setHeading(custom?.heading ?? def.heading);
    setIntro(custom?.intro ?? def.intro);
    setBody(custom?.body ?? def.body);
  };

  useEffect(() => {
    loadTabContent(selectedKey);
  }, [selectedKey, settings.policy_pages, settings.store_name_ar, settings.free_shipping_threshold]);

  const handleSaveCurrent = async () => {
    setSaving(true);
    setSavedBanner(null);
    try {
      const nextPolicyPages: PolicyPagesConfig = {
        ...(settings.policy_pages || {}),
        [selectedKey]: {
          heading: heading.trim(),
          intro: intro.trim(),
          body: body.trim(),
        },
      };
      await updateSettings({ policy_pages: nextPolicyPages });
      setSavedBanner(`تم حفظ محتوى صفحة «${POLICY_META[selectedKey].tabLabel}» وتحديثه على المتجر فوراً.`);
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    setSaving(true);
    setSavedBanner(null);
    try {
      const def = getDefaultPolicyDoc(selectedKey, { storeName, freeThreshold });
      setHeading(def.heading);
      setIntro(def.intro);
      setBody(def.body);
      const nextPolicyPages: PolicyPagesConfig = { ...(settings.policy_pages || {}) };
      delete nextPolicyPages[selectedKey];
      await updateSettings({ policy_pages: nextPolicyPages });
      setSavedBanner(`تمت استعادة النص الافتراضي لصفحة «${POLICY_META[selectedKey].tabLabel}».`);
    } finally {
      setSaving(false);
    }
  };

  const hasCustomOverride = Boolean(
    settings.policy_pages?.[selectedKey]?.heading ||
    settings.policy_pages?.[selectedKey]?.intro ||
    settings.policy_pages?.[selectedKey]?.body
  );

  return (
    <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-5 font-cairo">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-700" />
            <span>تعديل محتوى صفحات السياسات والشروط والأحكام</span>
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            عدّل النصوص الظاهرة للعملاء في صفحات شروط الاستخدام، الخصوصية، الضمان والاستبدال، والشحن والتوصيل مباشرة من هنا.
          </p>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-[11px] font-bold border ${
            hasCustomOverride
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-50 text-slate-600 border-slate-200'
          }`}
        >
          {hasCustomOverride ? 'نص مخصص محفوظ' : 'يستخدم النص الافتراضي'}
        </span>
      </div>

      {/* Policy Tabs */}
      <div className="flex flex-wrap gap-2">
        {POLICY_TABS.map(({ key, icon: Icon }) => {
          const active = key === selectedKey;
          const customized = Boolean(settings.policy_pages?.[key]?.body || settings.policy_pages?.[key]?.heading);
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setSavedBanner(null);
                setSelectedKey(key);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition ${
                active
                  ? 'bg-amber-500 text-black border-amber-500 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-amber-400'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{POLICY_META[key].tabLabel}</span>
              {customized && (
                <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-black' : 'bg-emerald-500'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Editor Fields */}
      <div className="space-y-4 text-xs">
        <div>
          <label className="block font-bold text-slate-700 mb-1">عنوان الصفحة الرئيسي:</label>
          <input
            type="text"
            value={heading}
            onChange={e => setHeading(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 font-bold focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">المقدمة التعريفية:</label>
          <textarea
            rows={2}
            value={intro}
            onChange={e => setIntro(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 leading-relaxed focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <label className="font-bold text-slate-700">محتوى الصفحة والبنود:</label>
            <span className="text-[11px] text-slate-500">
              استخدم <code className="bg-slate-100 px-1 rounded">### عنوان القسم</code> للعناوين الفرعية و <code className="bg-slate-100 px-1 rounded">- بند</code> للنقاط
            </span>
          </div>
          <textarea
            rows={10}
            value={body}
            onChange={e => setBody(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-slate-900 leading-7 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {savedBanner && (
        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{savedBanner}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          disabled={saving}
          onClick={handleSaveCurrent}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs flex items-center gap-1.5 shadow-sm"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'جاري الحفظ...' : `حفظ تعديلات «${POLICY_META[selectedKey].tabLabel}»`}</span>
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={handleResetToDefault}
          className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>استعادة النص الافتراضي لهذه الصفحة</span>
        </button>
      </div>
    </div>
  );
};
