import * as XLSX from 'xlsx';
import type { Product } from '../types';
import { InventoryFilters, reportColumns, inventorySummary, inventoryCategorySummary, inventoryFilterDescription, validateInventoryFilters } from './inventoryReports';

export function reportSheetData(rows: Product[], selected: string[]) {
  const columns = reportColumns.filter(c => selected.includes(c.key));
  if (!columns.length) throw new Error('اختر عمودًا واحدًا على الأقل.');
  return { columns, values: [columns.map(c => c.label), ...rows.map(p => columns.map(c => c.value(p)))] };
}
export function createInventoryWorkbook(rows: Product[], filters: InventoryFilters, selected: string[], title: string, now = new Date()) {
  const errors = validateInventoryFilters(filters);
  if (errors.length) throw new Error(errors.join(' '));
  const { columns, values } = reportSheetData(rows, selected);
  const summary = inventorySummary(rows);
  const workbook = XLSX.utils.book_new();
  workbook.Workbook = { Views: [{ RTL: true }] };
  const summaryData: (string | number)[][] = [
    ['جو ستور — تقرير المخزون', title],
    ['وقت استخراج التقرير (القاهرة)', now.toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })],
    ['نطاق التقرير', 'كل النتائج المطابقة للفلاتر؛ من بيانات المخزون المحملة في لوحة الإدارة وقت التصدير'],
    ['عدد الأصناف', summary.count], ['إجمالي القطع الموجبة', summary.units], ['صافي المخزون المسجل (يشمل السالب)', summary.recordedUnits],
    ['أصناف مخزونها صفر', summary.zero], ['أصناف بمخزون سالب', summary.negative], ['أصناف بلا كمية مسجلة', summary.unknownStock],
    ['تحتاج مراجعة بيانات أو صور', summary.review], ['صور توضيحية', summary.illustrative], ['بدون رابط صورة', summary.missingImage],
    ['بدون سعر بيع صالح', summary.missingPrice], ['بدون تكلفة موجبة مسجلة', summary.missingCost],
    ['قيمة الكميات الموجبة بالتكلفة (ج.م)', summary.costCents / 100], ['قيمة الكميات الموجبة بسعر البيع (ج.م)', summary.sellingCents / 100],
    ['قطع لم تدخل في قيمة التكلفة لغياب تكلفة موجبة', summary.unvaluedUnits], ['قطع لم تدخل في قيمة البيع لغياب سعر موجب', summary.unpricedUnits],
    ['طريقة الحساب', 'القيمة = الكمية الموجبة × السعر المسجل. الأرصدة السالبة محفوظة في التفاصيل ولا تُقيّم كمخزون متاح. قيمة البيع ليست مبيعات أو أرباحًا محققة.'],
    ['ملاحظة الصور', 'نوع الصورة حسب العلامة المسجلة؛ وجود الرابط لا يؤكد عمله أو مطابقته للمنتج.'],
    [], ['شروط التقرير'], ...inventoryFilterDescription(filters), [],
    ['ملخص النتائج حسب القسم'], ['القسم', 'الأصناف', 'القطع الموجبة', 'أصناف صفر', 'أصناف سالبة', 'قيمة التكلفة (ج.م)', 'قيمة البيع (ج.م)'],
    ...inventoryCategorySummary(rows).map(s => [s.category, s.count, s.units, s.zero, s.negative, s.costCents / 100, s.sellingCents / 100]),
  ];
  const overview = XLSX.utils.aoa_to_sheet(summaryData);
  overview['!cols'] = [{ wch: 55 }, { wch: 95 }, ...Array.from({ length: 5 }, () => ({ wch: 23 }))];
  const detail = XLSX.utils.aoa_to_sheet(values);
  detail['!cols'] = columns.map(c => ({ wch: c.width }));
  detail['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: columns.length - 1 } }) };
  // XLSX string cells stay text (including SKUs and names beginning with '=').
  for (let r = 1; r < values.length; r++) columns.forEach((c, col) => {
    const cell = detail[XLSX.utils.encode_cell({ r, c: col })];
    if (cell?.t === 'n' && ['price', 'cost', 'costValue', 'sellingValue'].includes(c.key)) cell.z = '#,##0.00';
  });
  XLSX.utils.book_append_sheet(workbook, overview, 'ملخص التقرير');
  XLSX.utils.book_append_sheet(workbook, detail, 'الأصناف');
  return workbook;
}
export function inventoryCsv(rows: Product[], columns: string[]) {
  const { values } = reportSheetData(rows, columns);
  const escape = (value: string | number) => {
    // Preserve numeric quantities, but never let spreadsheet software execute text as a formula.
    let text = String(value);
    if (typeof value === 'string' && /^[\s\uFEFF]*[=+\-@]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  return '\uFEFF' + values.map(row => row.map(escape).join(',')).join('\r\n');
}
export function downloadInventoryReport(rows: Product[], filters: InventoryFilters, columns: string[], title: string, format: 'xlsx' | 'csv') {
  const now = new Date();
  const stamp = now.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }).replace(/[^0-9-]/g, '-') + '_' + now.getTime();
  const name = `JOE_Inventory_${stamp}`;
  if (format === 'xlsx') XLSX.writeFile(createInventoryWorkbook(rows, filters, columns, title, now), `${name}.xlsx`);
  else {
    const blob = new Blob([inventoryCsv(rows, columns)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = `${name}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
