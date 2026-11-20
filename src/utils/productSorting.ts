import type { Product } from '../types';

/**
 * Checks whether a product is currently available in stock.
 * Any item with in_stock === false or stock <= 0 is considered out of stock.
 */
export function isProductInStock(product: { in_stock?: boolean; stock?: number }): boolean {
  return product.in_stock !== false && (product.stock ?? 0) > 0;
}

/**
 * Extracts a numeric timestamp or sequence number from product ID if present
 * (e.g., "prod-1795115228271" or "prod-bulk-1795115228-1").
 */
function extractTimestampFromId(id?: string): number {
  if (!id) return 0;
  const match = id.match(/\b(\d{10,13})\b/);
  return match ? Number(match[1]) : 0;
}

/**
 * Compares two products so that:
 * 1. In-stock products always come before out-of-stock products.
 * 2. Newer products (created_at desc) come before older products.
 * 3. Ties broken by ID timestamp or alphanumeric ID desc.
 */
export function sortProductsByStockAndNewest(a: Product, b: Product): number {
  // 1. Availability tier (In-stock first, out-of-stock at the end)
  const aInStock = isProductInStock(a) ? 1 : 0;
  const bInStock = isProductInStock(b) ? 1 : 0;
  if (aInStock !== bInStock) {
    return bInStock - aInStock;
  }

  // 2. Both in the same tier: newest created_at first
  const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
  const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
  const validA = !Number.isNaN(timeA) ? timeA : 0;
  const validB = !Number.isNaN(timeB) ? timeB : 0;

  if (validB !== validA) {
    return validB - validA;
  }

  // 3. Fallback to ID timestamp or alphanumeric descending
  const idTimeA = extractTimestampFromId(a.id);
  const idTimeB = extractTimestampFromId(b.id);
  if (idTimeB !== idTimeA) {
    return idTimeB - idTimeA;
  }

  return (b.id || '').localeCompare(a.id || '');
}

/**
 * Sorts catalog products by a given criterion while STRICTLY guaranteeing that:
 * - Available in-stock products are shown first.
 * - Out-of-stock items (stock <= 0 or in_stock === false) are moved to the bottom of the list.
 * - In the default ('newest') view, the latest added products appear first.
 */
export function sortCatalogProducts(
  products: Product[],
  sortBy: 'newest' | 'featured' | 'price_asc' | 'price_desc' | 'rating' = 'newest'
): Product[] {
  return [...products].sort((a, b) => {
    // 1. Availability tier: In-stock always beats out-of-stock
    const aInStock = isProductInStock(a) ? 1 : 0;
    const bInStock = isProductInStock(b) ? 1 : 0;
    if (aInStock !== bInStock) {
      return bInStock - aInStock;
    }

    // 2. Custom criterion within the same availability group
    if (sortBy === 'price_asc') {
      const priceDiff = (a.price || 0) - (b.price || 0);
      if (priceDiff !== 0) return priceDiff;
    } else if (sortBy === 'price_desc') {
      const priceDiff = (b.price || 0) - (a.price || 0);
      if (priceDiff !== 0) return priceDiff;
    } else if (sortBy === 'rating') {
      const ratingDiff = (b.rating || 0) - (a.rating || 0);
      if (ratingDiff !== 0) return ratingDiff;
    } else if (sortBy === 'featured') {
      const featDiff = (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
      if (featDiff !== 0) return featDiff;
    }

    // Default or tie-breaker: Newest additions first
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    const validA = !Number.isNaN(timeA) ? timeA : 0;
    const validB = !Number.isNaN(timeB) ? timeB : 0;

    if (validB !== validA) {
      return validB - validA;
    }

    const idTimeA = extractTimestampFromId(a.id);
    const idTimeB = extractTimestampFromId(b.id);
    if (idTimeB !== idTimeA) {
      return idTimeB - idTimeA;
    }

    return (b.id || '').localeCompare(a.id || '');
  });
}
