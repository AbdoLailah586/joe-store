import { Product, ProductFeatureBanner, CustomerReviewItem, RatingBreakdown } from '../types';

export interface EnrichedProductData {
  detailed_title_ar: string;
  detailed_title_en: string;
  brand_store_name: string;
  asin: string;
  bought_past_month: number;
  about_item: string[];
  quick_specs: { [key: string]: string };
  feature_banners: ProductFeatureBanner[];
  rating_breakdown: RatingBreakdown;
  customer_reviews: CustomerReviewItem[];
  bundle_accessories: Product[];
  comparison_items: Product[];
}

export const canPurchaseProduct = (product: Product): boolean =>
  product.is_active !== false && product.in_stock !== false
  && Number.isFinite(product.price) && product.price > 0
  && Number.isFinite(product.stock) && product.stock > 0;

export const productNotice = (product: Product, language: string): string => {
  if (product.catalog_status === 'estimated') {
    return language === 'ar'
      ? (product.image_is_illustrative ? 'صورة توضيحية ومواصفات تقديرية؛ راجع التفاصيل مع المحل قبل الشراء.' : 'مواصفات تقديرية؛ راجع التفاصيل مع المحل قبل الشراء.')
      : (product.image_is_illustrative ? 'Illustrative image and estimated specifications; confirm details with the store before buying.' : 'Estimated specifications; confirm details with the store before buying.');
  }
  return product.image_is_illustrative
    ? (language === 'ar' ? 'الصورة توضيحية؛ تأكد من شكل المنتج مع المحل.' : 'Illustrative image; confirm the product appearance with the store.') : '';
};

export const priceLabel = (product: Product, language: string, formatPrice: (value: number) => string): string =>
  product.price > 0 ? formatPrice(product.price) : (language === 'ar' ? 'اسأل عن السعر' : 'Ask for price');

export const publicSpecs = (specs: Record<string, string> = {}): Record<string, string> =>
  Object.fromEntries(Object.entries(specs).filter(([key, value]) => !key.startsWith('__') && typeof value === 'string'));

// Present saved catalog content. Specifications, identifiers, warranty, sales and
// reviews are never inferred from a category or invented while rendering a page.
export function enrichProductData(product: Product, allProducts: Product[]): EnrichedProductData {
  const reviews = (product.customer_reviews || []).filter(review =>
    Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5);
  const emptyBreakdown: RatingBreakdown = { five_star: 0, four_star: 0, three_star: 0, two_star: 0, one_star: 0 };
  const breakdown = product.rating_breakdown || (reviews.length ? {
    five_star: Math.round(reviews.filter(review => review.rating === 5).length / reviews.length * 100),
    four_star: Math.round(reviews.filter(review => review.rating === 4).length / reviews.length * 100),
    three_star: Math.round(reviews.filter(review => review.rating === 3).length / reviews.length * 100),
    two_star: Math.round(reviews.filter(review => review.rating === 2).length / reviews.length * 100),
    one_star: Math.round(reviews.filter(review => review.rating === 1).length / reviews.length * 100)
  } : emptyBreakdown);
  const activeProducts = allProducts.filter(item => item.is_active !== false && item.id !== product.id);
  return {
    detailed_title_ar: product.name_ar,
    detailed_title_en: product.name_en || product.name_ar,
    brand_store_name: product.brand || 'JOE Store',
    asin: product.asin || '',
    bought_past_month: product.bought_past_month > 0 ? product.bought_past_month : 0,
    about_item: product.about_item?.length ? [...product.about_item]
      : product.description_ar ? [product.description_ar] : [],
    quick_specs: publicSpecs(product.quick_specs || product.specs),
    feature_banners: product.feature_banners ? [...product.feature_banners] : [],
    rating_breakdown: breakdown,
    customer_reviews: [...reviews],
    bundle_accessories: activeProducts.filter(item =>
      product.frequently_bought_together?.includes(item.id) && canPurchaseProduct(item)).slice(0, 2),
    comparison_items: activeProducts.filter(item => item.category === product.category).slice(0, 3)
  };
}
