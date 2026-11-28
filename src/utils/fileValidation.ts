export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_SPREADSHEET_UPLOAD_BYTES = 20 * 1024 * 1024;

export function validateImageFile(
  file: File,
  maxBytes = MAX_IMAGE_UPLOAD_BYTES
): { valid: boolean; error?: string } {
  const mime = String(file.type || '').toLowerCase();
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mime as any)) {
    return {
      valid: false,
      error: 'نوع الصورة غير مسموح. يرجى رفع صورة بصيغة JPG أو PNG أو WebP فقط (ملفات SVG غير مسموحة لأسباب أمنية).'
    };
  }
  if (file.size <= 0 || file.size > maxBytes) {
    const mb = (maxBytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '');
    return {
      valid: false,
      error: `حجم الصورة يتجاوز الحد الأقصى المسموح (${mb} ميجابايت).`
    };
  }
  return { valid: true };
}

export function validateSpreadsheetFile(
  file: File,
  maxBytes = MAX_SPREADSHEET_UPLOAD_BYTES
): { valid: boolean; error?: string } {
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
    return {
      valid: false,
      error: 'يرجى اختيار ملف إكسل بصيغة .xlsx أو .xls أو .csv'
    };
  }
  if (file.size <= 0 || file.size > maxBytes) {
    return {
      valid: false,
      error: 'حجم الملف يتجاوز الحد الأقصى المسموح (20 ميجابايت).'
    };
  }
  return { valid: true };
}
