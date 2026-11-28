import writeXlsxFile from 'write-excel-file/browser';
import type { Sheet, SheetData, CellObject } from 'write-excel-file/browser';
import type { Product } from '../types';
import {
  InventoryFilters,
  reportColumns,
  inventorySummary,
  inventoryCategorySummary,
  inventoryFilterDescription,
  validateInventoryFilters
} from './inventoryReports';

function toCellObject(val: string | number | null | undefined, colKey?: string): CellObject {
  if (typeof val === 'number' && Number.isFinite(val)) {
    const isMoney = colKey && ['price', 'cost', 'costValue', 'sellingValue'].includes(colKey);
    return isMoney
      ? { type: Number, value: val, format: '#,##0.00' }
      : { type: Number, value: val };
  }
  const str = val == null ? '' : String(val);
  // Force String type on every text cell so values starting with '=' are never evaluated as formulas
  return { type: String, value: str };
}

export function reportSheetData(rows: Product[], selected: string[]) {
  const columns = reportColumns.filter(c => selected.includes(c.key));
  if (!columns.length) throw new Error('اختر عمودًا واحدًا على الأقل.');
  return { columns, values: [columns.map(c => c.label), ...rows.map(p => columns.map(c => c.value(p)))] };
}

export function buildInventorySheets(
  rows: Product[],
  filters: InventoryFilters,
  selected: string[],
  title: string,
  now = new Date()
): Sheet<any>[] {
  const errors = validateInventoryFilters(filters);
  if (errors.length) throw new Error(errors.join(' '));
  const { columns, values } = reportSheetData(rows, selected);
  const summary = inventorySummary(rows);

  const summaryRows: (string | number)[][] = [
    ['جو ستور — تقرير المخزون', title],
    ['وقت استخراج التقرير (القاهرة)', now.toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })],
    ['نطاق التقرير', 'كل النتائج المطابقة للفلاتر؛ من بيانات المخزون المحملة في لوحة الإدارة وقت التصدير'],
    ['عدد الأصناف', summary.count],
    ['إجمالي القطع الموجبة', summary.units],
    ['صافي المخزون المسجل (يشمل السالب)', summary.recordedUnits],
    ['أصناف مخزونها صفر', summary.zero],
    ['أصناف بمخزون سالب', summary.negative],
    ['أصناف بلا كمية مسجلة', summary.unknownStock],
    ['تحتاج مراجعة بيانات أو صور', summary.review],
    ['صور توضيحية', summary.illustrative],
    ['بدون رابط صورة', summary.missingImage],
    ['بدون سعر بيع صالح', summary.missingPrice],
    ['بدون تكلفة موجبة مسجلة', summary.missingCost],
    ['قيمة الكميات الموجبة بالتكلفة (ج.م)', summary.costCents / 100],
    ['قيمة الكميات الموجبة بسعر البيع (ج.م)', summary.sellingCents / 100],
    ['قطع لم تدخل في قيمة التكلفة لغياب تكلفة موجبة', summary.unvaluedUnits],
    ['قطع لم تدخل في قيمة البيع لغياب سعر موجب', summary.unpricedUnits],
    ['طريقة الحساب', 'القيمة = الكمية الموجبة × السعر المسجل. الأرصدة السالبة محفوظة في التفاصيل ولا تُقيّم كمخزون متاح. قيمة البيع ليست مبيعات أو أرباحًا محققة.'],
    ['ملاحظة الصور', 'نوع الصورة حسب العلامة المسجلة؛ وجود الرابط لا يؤكد عمله أو مطابقته للمنتج.'],
    [],
    ['شروط التقرير'],
    ...inventoryFilterDescription(filters),
    [],
    ['ملخص النتائج حسب القسم'],
    ['القسم', 'الأصناف', 'القطع الموجبة', 'أصناف صفر', 'أصناف سالبة', 'قيمة التكلفة (ج.م)', 'قيمة البيع (ج.م)'],
    ...inventoryCategorySummary(rows).map(s => [
      s.category,
      s.count,
      s.units,
      s.zero,
      s.negative,
      s.costCents / 100,
      s.sellingCents / 100
    ])
  ];

  const overviewData: SheetData = summaryRows.map(r => r.map(v => toCellObject(v)));
  const detailData: SheetData = values.map((r, rIdx) =>
    r.map((v, cIdx) => toCellObject(v, rIdx === 0 ? undefined : columns[cIdx]?.key))
  );

  return [
    {
      sheet: 'ملخص التقرير',
      rightToLeft: true,
      columns: [{ width: 55 }, { width: 95 }, ...Array.from({ length: 5 }, () => ({ width: 23 }))],
      data: overviewData
    },
    {
      sheet: 'الأصناف',
      rightToLeft: true,
      stickyRowsCount: 1,
      columns: columns.map(c => ({ width: c.width })),
      data: detailData
    }
  ];
}

export function inventoryCsv(rows: Product[], columns: string[]) {
  const { values } = reportSheetData(rows, columns);
  const escape = (value: string | number) => {
    let text = String(value);
    if (typeof value === 'string' && /^[\s\uFEFF]*[=+\-@]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  return '\uFEFF' + values.map(row => row.map(escape).join(',')).join('\r\n');
}

export async function downloadInventoryReport(
  rows: Product[],
  filters: InventoryFilters,
  columns: string[],
  title: string,
  format: 'xlsx' | 'csv'
) {
  const now = new Date();
  const stamp = now.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }).replace(/[^0-9-]/g, '-') + '_' + now.getTime();
  const name = `JOE_Inventory_${stamp}`;
  if (format === 'xlsx') {
    const sheets = buildInventorySheets(rows, filters, columns, title, now);
    await writeXlsxFile(sheets).toFile(`${name}.xlsx`);
  } else {
    const blob = new Blob([inventoryCsv(rows, columns)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
