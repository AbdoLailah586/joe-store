/**
 * Utility functions for normalizing, sanitizing, and optimizing product image URLs.
 */

export function normalizeProductImage(raw: string | undefined | null): string {
  if (!raw || typeof raw !== 'string') return '/product-placeholder.svg';
  let url = raw.trim();
  if (!url) return '/product-placeholder.svg';

  // Strip trailing slashes (e.g., 'image.png/' -> 'image.png')
  url = url.replace(/\/+$/, '');

  // Keep absolute web URLs, data URIs, and object URLs as-is
  if (/^(https?:|data:|blob:)/i.test(url)) {
    return url;
  }

  // Ensure single leading slash for relative asset paths
  url = '/' + url.replace(/^\/+/, '');

  return url;
}

export function normalizeProductImages(images: (string | undefined | null)[] | undefined | null): string[] {
  if (!images || !Array.isArray(images)) return [];
  return images
    .map(normalizeProductImage)
    .filter(url => url && url !== '/product-placeholder.svg');
}

/**
 * Optimizes an uploaded image file on the client side:
 * Resizes large photos to maxDimension (default 1200px) and compresses to lightweight WebP/JPEG Data URL.
 */
export async function compressImageFile(file: File, maxDimension = 1200, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    // If not in a browser environment or FileReader unavailable, fallback
    if (typeof window === 'undefined' || typeof FileReader === 'undefined') {
      reject(new Error('Browser environment required for image processing'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('فشل قراءة ملف الصورة'));
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        reject(new Error('لم يتم قراءة بيانات الصورة'));
        return;
      }

      // Check if image constructor is available (browser)
      if (typeof Image === 'undefined') {
        resolve(dataUrl);
        return;
      }

      const img = new Image();
      img.onerror = () => resolve(dataUrl); // fallback to raw data URL
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width <= maxDimension && height <= maxDimension && file.size < 300 * 1024) {
            // Already small enough, keep as-is
            resolve(dataUrl);
            return;
          }

          // Calculate scaled dimensions
          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);

          // Try webp first, fallback to jpeg if unsupported
          const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const compressed = canvas.toDataURL(mimeType, quality);
          resolve(compressed);
        } catch {
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  });
}
