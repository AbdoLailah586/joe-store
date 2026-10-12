import React, { useId } from 'react';
import type { DeliveryAddressFields } from '../types';

export function DetailedAddressFields({ value, onChange, language = 'ar', requiredStreet = true, showMap = false }: {
  value: DeliveryAddressFields;
  onChange: (value: DeliveryAddressFields) => void;
  language?: string;
  requiredStreet?: boolean;
  showMap?: boolean;
}) {
  const id = useId();
  const ar = language === 'ar';
  const inputClass = 'w-full min-w-0 bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:border-amber-600';
  const inputs: { key: keyof DeliveryAddressFields; ar: string; en: string; hint: string; complete?: string; required?: boolean }[] = [
    { key: 'district', ar: 'الحي / المنطقة', en: 'District / area', hint: 'مثال: حي الجامعة', complete: 'address-level3', required: requiredStreet },
    { key: 'street', ar: 'اسم الشارع', en: 'Street name', hint: 'مثال: شارع الإمام محمد عبده', complete: 'street-address', required: requiredStreet },
    { key: 'building_no', ar: 'رقم أو اسم المبنى', en: 'Building number / name', hint: 'مثال: 12 أو برج الصفوة' },
    { key: 'floor_no', ar: 'الدور', en: 'Floor', hint: 'مثال: أرضي أو 3' },
    { key: 'apartment_no', ar: 'الشقة / الوحدة', en: 'Apartment / unit', hint: 'مثال: 7 أو مكتب 2' },
    { key: 'postal_code', ar: 'الرمز البريدي (اختياري)', en: 'Postal code (optional)', hint: '35511', complete: 'postal-code' },
    { key: 'landmark', ar: 'أقرب علامة مميزة', en: 'Nearby landmark', hint: 'مثال: بجوار مسجد أو أمام صيدلية' }
  ];
  return <fieldset className="space-y-4">
    <legend className="font-bold text-slate-900 mb-3">{ar ? 'تفاصيل عنوان التوصيل' : 'Delivery address details'}</legend>
    <div>
      <label htmlFor={`${id}-type`} className="block text-slate-700 mb-1">{ar ? 'نوع العنوان' : 'Address type'}</label>
      <select id={`${id}-type`} className={inputClass} value={value.address_type || 'home'} onChange={e => onChange({ ...value, address_type: e.target.value as DeliveryAddressFields['address_type'] })}>
        <option value="home">{ar ? 'منزل' : 'Home'}</option><option value="work">{ar ? 'عمل' : 'Work'}</option><option value="other">{ar ? 'عنوان آخر' : 'Other'}</option>
      </select>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {inputs.map(field => <div key={field.key}>
        <label htmlFor={`${id}-${field.key}`} className="block text-slate-700 font-semibold mb-1">{ar ? field.ar : field.en}{field.required ? ' *' : ''}</label>
        <input id={`${id}-${field.key}`} name={field.key} className={inputClass} value={value[field.key] || ''}
          onChange={e => onChange({ ...value, [field.key]: e.target.value })} required={field.required}
          autoComplete={field.complete || 'off'} placeholder={ar ? field.hint : field.en}
          maxLength={field.key === 'postal_code' ? 5 : 200} inputMode={field.key === 'postal_code' ? 'numeric' : 'text'} pattern={field.key === 'postal_code' ? '[0-9٠-٩۰-۹]{5}' : undefined} />
      </div>)}
    </div>
    <div>
      <label htmlFor={`${id}-instructions`} className="block text-slate-700 font-semibold mb-1">{ar ? 'تعليمات الوصول والتسليم (اختياري)' : 'Delivery instructions (optional)'}</label>
      <textarea id={`${id}-instructions`} rows={2} maxLength={500} className={inputClass} value={value.delivery_instructions || ''}
        placeholder={ar ? 'مثال: مدخل جانبي، يوجد أسانسير، يرجى الاتصال قبل الوصول' : 'Entrance, lift access, call before arrival…'}
        onChange={e => onChange({ ...value, delivery_instructions: e.target.value })} />
    </div>
    {showMap && <div>
      <label htmlFor={`${id}-map`} className="block text-slate-700 mb-1">{ar ? 'رابط موقعك على Google Maps (اختياري)' : 'Google Maps link (optional)'}</label>
      <input id={`${id}-map`} type="url" maxLength={2000} dir="ltr" className={inputClass} value={value.google_maps_url || ''} placeholder="https://maps.app.goo.gl/…" onChange={e => onChange({ ...value, google_maps_url: e.target.value })} />
    </div>}
  </fieldset>;
}
