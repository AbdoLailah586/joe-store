import React, { useState, useEffect } from 'react';
import {
  Star,
  CheckCircle,
  XCircle,
  Trash2,
  Search,
  RefreshCw,
  ExternalLink,
  MessageCircle,
  Phone,
  Image as ImageIcon,
  Check,
  X,
  Clock,
  Eye,
  EyeOff,
  Filter
} from 'lucide-react';
import { neonDb } from '../../services/neonDb';

interface ReviewItem {
  id: string;
  product_id: string;
  product_name_ar?: string;
  author_name: string;
  author_phone?: string;
  user_id?: string;
  session_id?: string;
  rating: number;
  comment: string;
  images: string[];
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at?: string;
}

export const ReviewsModerationPanel: React.FC<{ onNavigateToProduct?: (productId: string) => void }> = ({
  onNavigateToProduct
}) => {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, all: 0 });
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadReviews = async () => {
    setIsLoading(true);
    try {
      const data = await neonDb.getAllProductReviews({
        status: activeFilter === 'all' ? undefined : activeFilter,
        limit: 200
      });
      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      if (data.counts) {
        setCounts(data.counts);
      }
    } catch (err) {
      console.error('Failed to load reviews:', err);
      showToast('تعذر تحميل التعليقات والتقييمات من قاعدة البيانات.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [activeFilter]);

  const handleUpdateStatus = async (reviewId: string, status: 'approved' | 'rejected') => {
    setActionLoadingId(reviewId);
    try {
      const res = await neonDb.updateProductReviewStatus(reviewId, status);
      if (res.success) {
        showToast(status === 'approved' ? 'تمت الموافقة على التقييم ونشره في المتجر بنجاح' : 'تم رفض وإخفاء التقييم من المتجر');
        await loadReviews();
      } else {
        showToast(res.error || 'حدث خطأ أثناء تحديث حالة التقييم');
      }
    } catch (err: any) {
      showToast(err.message || 'تعذر تحديث الحالة');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا التقييم نهائياً من قاعدة البيانات؟')) return;
    setActionLoadingId(reviewId);
    try {
      const res = await neonDb.deleteProductReview(reviewId);
      if (res.success) {
        showToast('تم حذف التقييم نهائياً');
        await loadReviews();
      } else {
        showToast(res.error || 'حدث خطأ أثناء حذف التقييم');
      }
    } catch (err: any) {
      showToast(err.message || 'تعذر حذف التقييم');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter reviews by search query
  const filteredReviews = reviews.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = (r.author_name || '').toLowerCase().includes(q);
    const phoneMatch = (r.author_phone || '').includes(q);
    const prodMatch = (r.product_name_ar || '').toLowerCase().includes(q) || (r.product_id || '').toLowerCase().includes(q);
    const commentMatch = (r.comment || '').toLowerCase().includes(q);
    return nameMatch || phoneMatch || prodMatch || commentMatch;
  });

  return (
    <div className="space-y-6 font-cairo">
      {/* Top Header Card & Quick Stats */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Star className="w-6 h-6 text-amber-500 fill-amber-400" />
              <span>مراجعة تقييمات وتعليقات العملاء (Reviews Moderation)</span>
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              التحكم الكامل في كافة التقييمات والصور المرفوعة من العملاء قبل ظهورها لكافة الزوار في المتجر.
            </p>
          </div>

          <button
            onClick={loadReviews}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>تحديث القائمة</span>
          </button>
        </div>

        {/* Quick Stat Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            onClick={() => setActiveFilter('all')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-800'
            }`}
          >
            <span className="text-xs block opacity-80 mb-1">إجمالي التقييمات</span>
            <span className="text-2xl font-black font-outfit">{counts.all}</span>
          </div>

          <div
            onClick={() => setActiveFilter('pending')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              activeFilter === 'pending'
                ? 'bg-amber-500 text-black border-amber-500 shadow-md'
                : 'bg-amber-50 border-amber-200 hover:border-amber-300 text-amber-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs block font-bold mb-1">بانتظار المراجعة</span>
              {counts.pending > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
              )}
            </div>
            <span className="text-2xl font-black font-outfit">{counts.pending}</span>
          </div>

          <div
            onClick={() => setActiveFilter('approved')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              activeFilter === 'approved'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                : 'bg-emerald-50 border-emerald-200 hover:border-emerald-300 text-emerald-900'
            }`}
          >
            <span className="text-xs block opacity-80 mb-1">معروضة بالمتجر</span>
            <span className="text-2xl font-black font-outfit">{counts.approved}</span>
          </div>

          <div
            onClick={() => setActiveFilter('rejected')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              activeFilter === 'rejected'
                ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                : 'bg-rose-50 border-rose-200 hover:border-rose-300 text-rose-900'
            }`}
          >
            <span className="text-xs block opacity-80 mb-1">مرفوضة ومخفية</span>
            <span className="text-2xl font-black font-outfit">{counts.rejected}</span>
          </div>
        </div>
      </div>

      {/* Filter Ribbon & Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم العميل، الهاتف، المنتج، أو نص التعليق..."
            className="w-full bg-slate-100 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 text-xs flex-wrap">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-amber-500 text-black'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            الكل ({counts.all})
          </button>
          <button
            onClick={() => setActiveFilter('pending')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'pending'
                ? 'bg-amber-500 text-black'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>بانتظار المراجعة ({counts.pending})</span>
          </button>
          <button
            onClick={() => setActiveFilter('approved')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'approved'
                ? 'bg-amber-500 text-black'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>معروضة ({counts.approved})</span>
          </button>
          <button
            onClick={() => setActiveFilter('rejected')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'rejected'
                ? 'bg-amber-500 text-black'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>مرفوضة ({counts.rejected})</span>
          </button>
        </div>
      </div>

      {/* Reviews Cards List */}
      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-600 font-bold">جاري تحميل بيانات التقييمات...</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <Star className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">لا توجد تقييمات مطابقة لهذا الفلتر</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {activeFilter === 'pending'
              ? 'ممتاز! لا توجد تعليقات جديدة معلقة بانتظار المراجعة حالياً.'
              : 'لم يتم العثور على أي مراجعات تطابق خيارات البحث الحالية.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((rev) => {
            const isActing = actionLoadingId === rev.id;

            return (
              <div
                key={rev.id}
                className={`p-6 rounded-3xl bg-white border transition-all space-y-4 shadow-xs ${
                  rev.status === 'pending'
                    ? 'border-amber-300 ring-2 ring-amber-400/20'
                    : rev.status === 'approved'
                    ? 'border-slate-200 hover:border-emerald-300'
                    : 'border-slate-200 bg-slate-50/50 opacity-80'
                }`}
              >
                {/* Header: Product Title, Status, Author */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">
                        {rev.product_name_ar || `منتج #${rev.product_id}`}
                      </span>
                      {onNavigateToProduct && (
                        <button
                          type="button"
                          onClick={() => onNavigateToProduct(rev.product_id)}
                          className="text-xs text-amber-700 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                          title="عرض صفحة المنتج"
                        >
                          <span>عرض المنتج</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <span className="font-semibold text-slate-700">العميل: {rev.author_name}</span>
                      {rev.author_phone && (
                        <span className="font-mono text-slate-600 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span>{rev.author_phone}</span>
                        </span>
                      )}
                      <span className="font-outfit text-slate-400">
                        {rev.created_at ? new Date(rev.created_at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : 'تاريخ غير محدد'}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {rev.status === 'pending' && (
                      <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>بانتظار موافقة الإدارة</span>
                      </span>
                    )}
                    {rev.status === 'approved' && (
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>معروضة في المتجر</span>
                      </span>
                    )}
                    {rev.status === 'rejected' && (
                      <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold border border-rose-300 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>مرفوضة ومخفية</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Rating & Comment Body */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < rev.rating ? 'fill-amber-400 text-amber-500' : 'text-slate-200'}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-slate-800 font-outfit">
                      {rev.rating} من 5 نجوم
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 whitespace-pre-line">
                    {rev.comment}
                  </p>
                </div>

                {/* Attached Images (Up to 3) */}
                {Array.isArray(rev.images) && rev.images.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-600 block">
                      الصور المرفوعة من العميل ({rev.images.length} صور):
                    </span>
                    <div className="flex items-center gap-3 flex-wrap">
                      {rev.images.map((imgUrl, imgIdx) => (
                        <button
                          key={imgIdx}
                          type="button"
                          onClick={() => setPreviewImage(imgUrl)}
                          className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-slate-200 hover:border-amber-500 transition-all p-0.5 bg-slate-100 cursor-pointer shadow-xs hover:scale-105"
                          title="انقر لتكبير وفحص الصورة"
                        >
                          <img
                            src={imgUrl}
                            alt={`مرفق ${imgIdx + 1}`}
                            className="w-full h-full object-cover rounded-xl"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions Toolbar */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {rev.status !== 'approved' && (
                      <button
                        type="button"
                        disabled={isActing}
                        onClick={() => handleUpdateStatus(rev.id, 'approved')}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>قبول ونشر في المتجر</span>
                      </button>
                    )}

                    {rev.status !== 'rejected' && (
                      <button
                        type="button"
                        disabled={isActing}
                        onClick={() => handleUpdateStatus(rev.id, 'rejected')}
                        className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <EyeOff className="w-4 h-4" />
                        <span>رفض / إخفاء من المتجر</span>
                      </button>
                    )}

                    {rev.author_phone && (
                      <a
                        href={`https://wa.me/2${rev.author_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`أهلاً بك عميلنا العزيز ${rev.author_name}، شكراً لك لتسوقك من متجر JOE Store ومشاركتك تقييمك لمنتج ${rev.product_name_ar || ''}.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                        <span>تواصل واتساب</span>
                      </a>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isActing}
                    onClick={() => handleDelete(rev.id)}
                    className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="حذف هذا التقييم نهائياً"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف نهائي</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Resolution Image Lightbox */}
      {previewImage && (
        <div
          className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-transparent" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 left-0 text-white bg-slate-800/80 hover:bg-slate-700 p-2 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="صورة التقييم مكبرة"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/20"
            />
          </div>
        </div>
      )}

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 p-4 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-2xl flex items-center gap-2 animate-fadeIn border border-slate-700">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};