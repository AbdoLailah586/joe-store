import { egyptianGovernorates, findAddressGovernorate, type Governorate } from '../data/governorates';

const COORDS_BY_KEY: Record<string, [number, number]> = {
  daqahlia: [31.0409, 31.3785],
  cairo: [30.0444, 31.2357],
  giza: [30.0131, 31.2089],
  alexandria: [31.2001, 29.9187],
  sharqia: [30.5877, 31.502],
  gharbia: [30.7865, 31.0004],
  monufia: [30.5972, 30.9876],
  menofia: [30.5972, 30.9876],
  qalyubia: [30.466, 31.1848],
  kafr: [31.1107, 30.9388],
  damietta: [31.4175, 31.8144],
  port: [31.2653, 32.3019],
  ismailia: [30.5965, 32.2715],
  suez: [29.9668, 32.5498],
  beheira: [31.0409, 30.4699],
  fayoum: [29.3084, 30.8428],
  faiyum: [29.3084, 30.8428],
  beni: [29.0661, 31.0994],
  minya: [28.1099, 30.7503],
  asyut: [27.1783, 31.1859],
  sohag: [26.559, 31.6957],
  qena: [26.1551, 32.716],
  luxor: [25.6872, 32.6396],
  aswan: [24.0889, 32.8998],
  red: [27.2579, 33.8116],
  matrouh: [31.3543, 27.2373],
  south: [27.9158, 34.3299],
  north: [31.1321, 33.8033],
  new: [25.4474, 30.546]
};

export function coordsForGovernorate(govNameOrId?: string): [number, number] {
  const normalized = String(govNameOrId || '').toLowerCase();
  for (const [k, coords] of Object.entries(COORDS_BY_KEY)) {
    if (normalized.includes(k)) return coords;
  }
  const matched = findAddressGovernorate(govNameOrId || '');
  if (matched) {
    const idLower = matched.id.toLowerCase();
    for (const [k, coords] of Object.entries(COORDS_BY_KEY)) {
      if (idLower.includes(k)) return coords;
    }
  }
  return [31.0409, 31.3785];
}

const KEYWORD_MATCHERS: Array<{ keys: string[]; arContains: string }> = [
  { keys: ['دقهلية', 'منصور', 'dakahlia', 'mansoura', 'talkha'], arContains: 'الدقهلية' },
  { keys: ['قاهرة', 'cairo'], arContains: 'القاهرة' },
  { keys: ['جيزة', 'giza'], arContains: 'الجيزة' },
  { keys: ['إسكندرية', 'اسكندرية', 'alexandria'], arContains: 'الإسكندرية' },
  { keys: ['شرقية', 'زقازيق', 'sharqia', 'zagazig'], arContains: 'الشرقية' },
  { keys: ['غربية', 'طنطا', 'gharbia', 'tanta'], arContains: 'الغربية' },
  { keys: ['منوفية', 'شبين الكوم', 'monufia', 'menofia'], arContains: 'المنوفية' },
  { keys: ['قليوبية', 'بنها', 'qalyubia'], arContains: 'القليوبية' },
  { keys: ['كفر الشيخ', 'kafr el-sheikh', 'kafr el sheikh'], arContains: 'كفر الشيخ' },
  { keys: ['دمياط', 'damietta'], arContains: 'دمياط' },
  { keys: ['بورسعيد', 'port said'], arContains: 'بورسعيد' },
  { keys: ['إسماعيلية', 'اسماعيلية', 'ismailia'], arContains: 'الإسماعيلية' },
  { keys: ['سويس', 'suez'], arContains: 'السويس' },
  { keys: ['بحيرة', 'دمنهور', 'beheira'], arContains: 'البحيرة' },
  { keys: ['فيوم', 'faiyum', 'fayoum'], arContains: 'الفيوم' },
  { keys: ['بني سويف', 'beni suef'], arContains: 'بني سويف' },
  { keys: ['منيا', 'minya'], arContains: 'المنيا' },
  { keys: ['أسيوط', 'اسيوط', 'asyut', 'assiut'], arContains: 'أسيوط' },
  { keys: ['سوهاج', 'sohag'], arContains: 'سوهاج' },
  { keys: ['قنا', 'qena'], arContains: 'قنا' },
  { keys: ['أقصر', 'اقصر', 'luxor'], arContains: 'الأقصر' },
  { keys: ['أسوان', 'اسوان', 'aswan'], arContains: 'أسوان' },
  { keys: ['بحر الأحمر', 'بحر احمر', 'غردقة', 'red sea', 'hurghada'], arContains: 'البحر الأحمر' },
  { keys: ['مطروح', 'matrouh', 'matruh'], arContains: 'مطروح' },
  { keys: ['جنوب سيناء', 'شرم الشيخ', 'south sinai'], arContains: 'جنوب سيناء' },
  { keys: ['شمال سيناء', 'العريش', 'north sinai'], arContains: 'شمال سيناء' },
  { keys: ['وادي الجديد', 'new valley'], arContains: 'الوادي الجديد' }
];

export interface ReverseGeocodeResult {
  governorate?: Governorate;
  city?: string;
  street?: string;
  district?: string;
  address_details?: string;
}

export function matchGovernorateFromText(rawText: string): Governorate | undefined {
  const normalized = String(rawText || '').toLowerCase();
  const hit = KEYWORD_MATCHERS.find(entry => entry.keys.some(k => normalized.includes(k)));
  if (!hit) return undefined;
  return egyptianGovernorates.find(g => g.name_ar.includes(hit.arContains));
}

export async function reverseGeocodeCoords(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=ar&addressdetails=1`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return {};
    const data = await res.json();
    const addr = data?.address || {};
    const govCandidate = [addr.state, addr.region, addr.county, addr.city, data?.display_name].filter(Boolean).join(' ');
    const governorate = matchGovernorateFromText(govCandidate);
    const city = String(addr.city || addr.town || addr.village || '');
    const district = String(addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district || '');
    const street = String(addr.road || addr.pedestrian || addr.residential || '');
    const address_details = [street, addr.house_number, district].filter(Boolean).join(' — ') ||
      (typeof data?.display_name === 'string' ? data.display_name.split('،').slice(0, 3).join(' - ').trim() : '');
    return { governorate, city, district, street, address_details };
  } catch {
    return {};
  }
}
