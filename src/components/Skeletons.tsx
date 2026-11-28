import React from 'react';

export const ProductCardSkeleton: React.FC = () => (
  <article
    aria-hidden="true"
    className="joe-product-card joe-skeleton-card overflow-hidden"
  >
    <div className="joe-product-media aspect-square w-full joe-skeleton-block" />
    <div className="joe-product-content space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="h-3 w-16 rounded-full joe-skeleton-block" />
        <span className="h-3 w-10 rounded-full joe-skeleton-block" />
      </div>
      <div className="space-y-1.5">
        <span className="block h-3.5 w-full rounded-md joe-skeleton-block" />
        <span className="block h-3.5 w-3/4 rounded-md joe-skeleton-block" />
      </div>
      <div className="flex items-center justify-between pt-1">
        <span className="h-5 w-20 rounded-md joe-skeleton-block" />
        <span className="h-4 w-14 rounded-full joe-skeleton-block" />
      </div>
      <div className="flex gap-2 pt-1">
        <span className="h-9 flex-1 rounded-xl joe-skeleton-block" />
        <span className="h-9 w-9 rounded-xl joe-skeleton-block" />
      </div>
    </div>
  </article>
);

export const ProductGridSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => (
  <div
    role="status"
    aria-label="جاري تحميل المنتجات"
    className="joe-product-grid"
  >
    {Array.from({ length: count }).map((_, idx) => (
      <ProductCardSkeleton key={idx} />
    ))}
  </div>
);

export const ProductDetailsSkeleton: React.FC = () => (
  <div role="status" aria-label="جاري تحميل بيانات المنتج..." className="max-w-7xl mx-auto px-4 py-8 space-y-6">
    <span className="sr-only">جاري تحميل بيانات المنتج...</span>
    <div className="h-5 w-48 rounded-lg joe-skeleton-block" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-4">
        <div className="aspect-square w-full rounded-3xl joe-skeleton-block" />
        <div className="flex gap-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="w-16 h-16 rounded-xl joe-skeleton-block" />
          ))}
        </div>
      </div>
      <div className="space-y-5">
        <div className="h-6 w-28 rounded-full joe-skeleton-block" />
        <div className="h-8 w-4/5 rounded-xl joe-skeleton-block" />
        <div className="h-5 w-36 rounded-lg joe-skeleton-block" />
        <div className="h-28 w-full rounded-2xl joe-skeleton-block" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-12 rounded-2xl joe-skeleton-block" />
          <div className="h-12 rounded-2xl joe-skeleton-block" />
        </div>
        <div className="h-36 w-full rounded-2xl joe-skeleton-block" />
      </div>
    </div>
  </div>
);

export const PageShellSkeleton: React.FC = () => (
  <div role="status" aria-label="جاري تحميل الصفحة" className="max-w-7xl mx-auto px-4 py-10 space-y-6">
    <div className="h-9 w-56 rounded-xl joe-skeleton-block" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map(i => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  </div>
);
