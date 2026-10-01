import React, { useState, useRef } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Upload, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  FileCheck, 
  Sparkles,
  ArrowRight,
  Database,
  Trash2
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { downloadSampleExcelTemplate, parseExcelFile, ParsedProductResult } from '../utils/excelParser';
import confetti from 'canvas-confetti';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({ isOpen, onClose }) => {
  const { bulkAddProducts } = useStore();
  const { t, formatPrice } = useLanguage();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParsedProductResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setErrorMsg('يرجى اختيار ملف إكسل بصيغة .xlsx أو .xls أو .csv');
      return;
    }

    setSelectedFile(file);
    setErrorMsg('');
    setIsParsing(true);

    try {
      const result = await parseExcelFile(file);
      setParseResult(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل معالجة ملف الإكسل.');
      setParseResult(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (!parseResult || parseResult.validProducts.length === 0) return;

    bulkAddProducts(parseResult.validProducts);

    // Trigger celebratory confetti!
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}

    onClose();
  };

  const resetSelection = () => {
    setSelectedFile(null);
    setParseResult(null);
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl bg-[#0F1626] border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 bg-[#0A0E1A] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-cairo flex items-center gap-2">
                <span>{t('bulkExcelImport')}</span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-normal">
                  إكسل و CSV
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-cairo">
                أضف مئات المنتجات دفعة واحدة بكل سهولة عبر رفع ملف إكسل معد مسبقاً.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Step 1: Download Template Button */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-amber-300">
                  هل تحتاج إلى نموذج جاهز لتعبئة بيانات منتجاتك؟
                </h4>
                <p className="text-[11px] text-slate-400">
                  قم بتحميل ملف إكسل منسق وجاهز يحتوي على الأعمدة المطلوبة وأمثلة توضيحية.
                </p>
              </div>
            </div>

            <button
              onClick={downloadSampleExcelTemplate}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center justify-center gap-2 shadow-sm font-cairo transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('downloadTemplate')}</span>
            </button>
          </div>

          {/* Step 2: Upload Drag & Drop Area */}
          {!parseResult ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-4 ${
                isDragging 
                  ? 'border-amber-400 bg-amber-500/15 scale-[1.01]' 
                  : 'border-white/15 hover:border-amber-500/40 bg-slate-900/50 hover:bg-slate-900'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                className="hidden"
              />

              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-inner">
                <Upload className="w-8 h-8 animate-bounce" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-white mb-1">
                  اسحب وأفلت ملف الإكسل هنا، أو انقر لاختيار الملف
                </h3>
                <p className="text-xs text-slate-400">
                  يدعم ملفات .xlsx, .xls, .csv بحجم حتى 20 ميجابايت
                </p>
              </div>

              {isParsing && (
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 bg-slate-950 px-4 py-2 rounded-full border border-amber-500/30">
                  <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <span>جاري فحص وقراءة بيانات الملف...</span>
                </div>
              )}
            </div>
          ) : (
            /* Step 3: Parse Result & Preview Grid */
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 border border-white/10">
                <div className="flex items-center gap-3">
                  <FileCheck className="w-6 h-6 text-emerald-400" />
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <span>الملف: {selectedFile?.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-normal">
                        تمت القراءة بنجاح
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      تم استخراج <strong className="text-amber-400">{parseResult.validProducts.length}</strong> منتج صالح للإضافة من أصل {parseResult.totalRows} صف في الملف.
                    </p>
                  </div>
                </div>

                <button
                  onClick={resetSelection}
                  className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>تغيير الملف</span>
                </button>
              </div>

              {/* Error messages if any */}
              {parseResult.errors.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-400">
                    <AlertCircle className="w-4 h-4" />
                    <span>تنبيهات وتجاوزات في بعض الصفوف ({parseResult.errors.length}):</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-300 max-h-24 overflow-y-auto">
                    {parseResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview Table */}
              <div className="border border-white/10 rounded-2xl overflow-hidden bg-slate-900/60 max-h-64 overflow-y-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#0A0E1A] text-slate-400 text-[11px] font-bold sticky top-0">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">اسم المنتج</th>
                      <th className="p-3">القسم</th>
                      <th className="p-3">الماركة</th>
                      <th className="p-3">الحالة</th>
                      <th className="p-3">البطارية</th>
                      <th className="p-3">السعر</th>
                      <th className="p-3">الكمية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {parseResult.validProducts.slice(0, 15).map((prod, idx) => (
                      <tr key={idx} className="hover:bg-white/5">
                        <td className="p-3 text-slate-500">{idx + 1}</td>
                        <td className="p-3 font-bold text-white truncate max-w-xs">{prod.name_ar}</td>
                        <td className="p-3">
                          <span className="px-1.5 py-0.5 rounded bg-white/5 text-[10px]">
                            {prod.category}
                          </span>
                        </td>
                        <td className="p-3">{prod.brand}</td>
                        <td className="p-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                            prod.condition === 'mint' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {prod.condition === 'mint' ? 'كسر زيرو' : 'جديد'}
                          </span>
                        </td>
                        <td className="p-3">
                          {prod.battery_health ? (
                            <span className="text-emerald-400 font-bold">🔋 {prod.battery_health}%</span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="p-3 font-bold text-amber-400 font-outfit">
                          {formatPrice(prod.price || 0)}
                        </td>
                        <td className="p-3">{prod.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parseResult.validProducts.length > 15 && (
                <p className="text-[11px] text-slate-500 text-center">
                  + {parseResult.validProducts.length - 15} منتجات أخرى ستتم إضافتها تلقائياً
                </p>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-[#0A0E1A] border-t border-white/10 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300"
          >
            إلغاء
          </button>

          {parseResult && parseResult.validProducts.length > 0 && (
            <button
              onClick={handleConfirmImport}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs flex items-center gap-2 shadow-glow-gold transition-all active:scale-95"
            >
              <Database className="w-4 h-4" />
              <span>تأكيد استيراد ({parseResult.validProducts.length}) منتج إلى المتجر الآن</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
