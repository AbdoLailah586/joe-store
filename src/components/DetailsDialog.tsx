import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { ArrowUpLeft, ChevronRight, Info, Search, X } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";

export type DetailFact = { label: string; value: string | number };
export type DetailRow = {
  id: string;
  label: string;
  subtitle?: string;
  value?: string;
  facts?: DetailFact[];
  onOpen?: () => void;
};
export type DetailSpec = {
  title: string;
  description: string;
  facts?: DetailFact[];
  rows?: DetailRow[];
  emptyMessage?: string;
  actions?: { label: string; run: () => void }[];
};
const DetailsContext = createContext<{
  openDetails: (spec: DetailSpec) => void;
  closeDetails: () => void;
} | null>(null);
export function useDetails() {
  const context = useContext(DetailsContext);
  if (!context) throw new Error("DetailsProvider is missing");
  return context;
}

export function DetailsProvider({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const ar = language === "ar";
  const [stack, setStack] = useState<DetailSpec[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const spec = stack[stack.length - 1];
  const closeDetails = () => setStack([]);
  const openDetails = (value: DetailSpec) => {
    if (!dialog.current?.open)
      opener.current = document.activeElement as HTMLElement;
    setStack((previous) => [...previous, value]);
  };
  useEffect(() => {
    setQuery("");
    setPage(1);
    if (spec) {
      if (!dialog.current?.open) dialog.current?.showModal();
      heading.current?.focus();
    } else {
      dialog.current?.close();
      if (opener.current?.isConnected) opener.current.focus();
    }
  }, [spec]);
  useEffect(() => {
    if (!spec) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [!!spec]);
  useEffect(() => {
    window.addEventListener("joe:navigate", closeDetails);
    return () => window.removeEventListener("joe:navigate", closeDetails);
  }, []);
  // An open drill-down must not outlive a changed identity or access grant.
  useEffect(closeDetails, [
    user?.id,
    user?.role,
    user?.admin_permissions?.join(","),
  ]);
  const rows = (spec?.rows || []).filter((row) =>
    `${row.label} ${row.subtitle || ""} ${row.value || ""} ${row.facts?.map((f) => `${f.label} ${f.value}`).join(" ") || ""}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(rows.length / 30));
  const currentPage = Math.min(page, pages);
  return (
    <DetailsContext.Provider value={{ openDetails, closeDetails }}>
      {children}
      <dialog
        ref={dialog}
        aria-labelledby="detail-title"
        aria-describedby="detail-description"
        onCancel={closeDetails}
        onClose={() => {
          if (!dialog.current?.open) closeDetails();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDetails();
        }}
        className="joe-detail-dialog"
      >
        {spec && (
          <div className="p-5 sm:p-7 space-y-5" dir={ar ? "rtl" : "ltr"}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <span className="text-xs text-amber-800 flex items-center gap-1 mb-2">
                  <Info size={14} />
                  {ar
                    ? "التفاصيل المرتبطة باختيارك"
                    : "Details for your selection"}
                </span>
                <h2
                  id="detail-title"
                  ref={heading}
                  tabIndex={-1}
                  className="text-xl font-black leading-relaxed outline-none"
                >
                  {spec.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeDetails}
                aria-label={ar ? "إغلاق التفاصيل" : "Close details"}
                className="p-2 rounded-lg hover:bg-slate-100 shrink-0"
              >
                <X size={20} />
              </button>
            </div>
            {stack.length > 1 && (
              <button
                type="button"
                onClick={() => setStack((previous) => previous.slice(0, -1))}
                className="text-sm text-amber-800 flex items-center gap-1"
              >
                <ChevronRight size={16} />
                {ar ? "الرجوع للتفاصيل السابقة" : "Back to previous details"}
              </button>
            )}
            <p
              id="detail-description"
              className="text-sm text-slate-600 whitespace-pre-line leading-loose"
            >
              {spec.description}
            </p>
            {!!spec.facts?.length && (
              <dl className="grid sm:grid-cols-2 gap-2">
                {spec.facts.map((fact, i) => (
                  <div
                    key={i}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-3"
                  >
                    <dt className="text-xs text-slate-500">{fact.label}</dt>
                    <dd className="font-bold text-sm mt-1 whitespace-pre-line break-words">
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            {spec.rows !== undefined && (
              <section
                aria-label={ar ? "السجلات المرتبطة" : "Related records"}
                className="space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p role="status" className="font-bold text-sm">
                    {rows.length} {ar ? "نتيجة" : "results"}
                    {query.trim() && ` / ${spec.rows.length}`}
                  </p>
                  {spec.rows.length > 6 && (
                    <label className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2">
                      <Search size={15} />
                      <input
                        type="search"
                        aria-label={ar ? "بحث داخل التفاصيل" : "Search details"}
                        placeholder={
                          ar ? "ابحث في هذه النتائج…" : "Search these results…"
                        }
                        className="bg-transparent text-sm min-w-0 w-44 outline-none"
                        value={query}
                        onChange={(event) => {
                          setQuery(event.target.value);
                          setPage(1);
                        }}
                      />
                    </label>
                  )}
                </div>
                {rows
                  .slice((currentPage - 1) * 30, currentPage * 30)
                  .map((row) => (
                    <article
                      key={row.id}
                      className="rounded-xl border border-slate-200 p-3 text-sm"
                    >
                      {row.onOpen ? (
                        <button
                          type="button"
                          onClick={row.onOpen}
                          className="w-full flex justify-between items-start gap-3 text-start font-bold hover:text-amber-800"
                        >
                          <span>{row.label}</span>
                          <ArrowUpLeft size={16} className="shrink-0" />
                        </button>
                      ) : (
                        <h3 className="font-bold">{row.label}</h3>
                      )}
                      {row.subtitle && (
                        <p className="text-xs text-slate-500 mt-1 break-words">
                          {row.subtitle}
                        </p>
                      )}
                      {row.value && (
                        <p className="font-bold text-amber-800 mt-2">
                          {row.value}
                        </p>
                      )}
                      {!!row.facts?.length && (
                        <dl className="flex flex-wrap gap-x-5 gap-y-2 mt-2 text-xs text-slate-600">
                          {row.facts.map((fact, i) => (
                            <div key={i}>
                              <dt className="inline">{fact.label}: </dt>
                              <dd className="inline font-semibold">
                                {fact.value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </article>
                  ))}
                {!rows.length && (
                  <p className="text-sm text-slate-500 bg-slate-50 rounded-xl p-5">
                    {query
                      ? ar
                        ? "لا توجد نتائج مطابقة لهذا البحث."
                        : "No matching results."
                      : spec.emptyMessage ||
                        (ar
                          ? "لا توجد سجلات مطابقة حاليًا."
                          : "No records currently match.")}
                  </p>
                )}
                {pages > 1 && (
                  <div className="flex justify-center items-center gap-4 text-sm">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setPage(currentPage - 1)}
                      className="detail-page-button"
                    >
                      {ar ? "السابق" : "Previous"}
                    </button>
                    <span>
                      {currentPage} / {pages}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage === pages}
                      onClick={() => setPage(currentPage + 1)}
                      className="detail-page-button"
                    >
                      {ar ? "التالي" : "Next"}
                    </button>
                  </div>
                )}
              </section>
            )}
            {!!spec.actions?.length && (
              <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                {spec.actions.map((action, i) => (
                  <button
                    key={i}
                    type="button"
                    className="rounded-lg bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2.5 font-bold text-sm"
                    onClick={() => {
                      closeDetails();
                      action.run();
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </dialog>
    </DetailsContext.Provider>
  );
}

export function InfoButton({
  details,
  children,
  className = "",
  label,
}: {
  details: DetailSpec;
  children: React.ReactNode;
  className?: string;
  label?: string;
}) {
  const { openDetails } = useDetails();
  return (
    <button
      type="button"
      aria-label={label}
      className={`detail-info-button ${className}`}
      onClick={() => openDetails(details)}
    >
      {children}
    </button>
  );
}

export function MetricCard({
  title,
  value,
  note,
  onClick,
  disabled,
}: {
  title: string;
  value: React.ReactNode;
  note?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="detail-metric text-start rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 min-w-0"
    >
      <span className="flex justify-between gap-3 items-start text-xs text-slate-600 font-bold">
        {title}
        <ArrowUpLeft size={16} className="text-amber-700 shrink-0" />
      </span>
      <strong className="block text-xl sm:text-2xl font-black mt-2 break-words">
        {value}
      </strong>
      {note && (
        <span className="block text-xs text-slate-500 mt-2 leading-relaxed">
          {note}
        </span>
      )}
      <span className="block text-[10px] text-amber-800 mt-3">
        عرض التفاصيل ←
      </span>
    </button>
  );
}
