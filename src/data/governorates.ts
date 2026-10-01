export interface Governorate {
  id: string;
  name_ar: string;
  name_en: string;
  shipping_fee: number;
  delivery_time_ar: string;
  delivery_time_en: string;
  cities: { name_ar: string; name_en: string }[];
}

export const egyptianGovernorates: Governorate[] = [
  {
    id: 'daqahlia',
    name_ar: 'الدقهلية (المنصورة وما حولها)',
    name_en: 'Dakahlia (Mansoura)',
    shipping_fee: 35,
    delivery_time_ar: 'توصيل فوري خلال 3-6 ساعات في نفس اليوم',
    delivery_time_en: 'Same-day instant delivery (3-6 hours)',
    cities: [
      { name_ar: 'المنصورة (حي الجامعة، المشاية، توريل، الجلاء، قناة السويس)', name_en: 'Mansoura' },
      { name_ar: 'طلخا', name_en: 'Talkha' },
      { name_ar: 'ميت غمر', name_en: 'Mit Ghamr' },
      { name_ar: 'السنبلاوين', name_en: 'El Senbelawein' },
      { name_ar: 'دكرنس', name_en: 'Dikirnis' },
      { name_ar: 'بلقاس', name_en: 'Belqas' },
      { name_ar: 'شربين', name_en: 'Sherbin' },
      { name_ar: 'أجا', name_en: 'Aga' },
      { name_ar: 'جمصة', name_en: 'Gamasa' }
    ]
  },
  {
    id: 'cairo',
    name_ar: 'القاهرة',
    name_en: 'Cairo',
    shipping_fee: 55,
    delivery_time_ar: 'توصيل خلال 24 - 48 ساعة',
    delivery_time_en: 'Delivered in 24 - 48 hours',
    cities: [
      { name_ar: 'مدينة نصر', name_en: 'Nasr City' },
      { name_ar: 'مصر الجديدة', name_en: 'Heliopolis' },
      { name_ar: 'التجمع الخامس والقاهرة الجديدة', name_en: 'New Cairo / 5th Settlement' },
      { name_ar: 'المعادي', name_en: 'Maadi' },
      { name_ar: 'الزمالك والمهندسين', name_en: 'Zamalek & Mohandessin' },
      { name_ar: 'شبرا', name_en: 'Shubra' },
      { name_ar: 'حلوان', name_en: 'Helwan' },
      { name_ar: 'الشروق ومدينتي', name_en: 'El Shorouk & Madinaty' }
    ]
  },
  {
    id: 'giza',
    name_ar: 'الجيزة',
    name_en: 'Giza',
    shipping_fee: 55,
    delivery_time_ar: 'توصيل خلال 24 - 48 ساعة',
    delivery_time_en: 'Delivered in 24 - 48 hours',
    cities: [
      { name_ar: 'الدقي والعجوزة', name_en: 'Dokki & Agouza' },
      { name_ar: 'الشيخ زايد', name_en: 'Sheikh Zayed' },
      { name_ar: 'مدينة 6 أكتوبر', name_en: '6th of October' },
      { name_ar: 'الهرم وفيصل', name_en: 'Haram & Faisal' }
    ]
  },
  {
    id: 'alexandria',
    name_ar: 'الإسكندرية',
    name_en: 'Alexandria',
    shipping_fee: 60,
    delivery_time_ar: 'توصيل خلال 24 - 48 ساعة',
    delivery_time_en: 'Delivered in 24 - 48 hours',
    cities: [
      { name_ar: 'سموحة وسيدي جابر', name_en: 'Smouha & Sidi Gaber' },
      { name_ar: 'ميامي ولوران وجليم', name_en: 'Miami & Loran' },
      { name_ar: 'محطة الرمل والمنشية', name_en: 'Raml Station' },
      { name_ar: 'العجمي والساحل', name_en: 'Agami' }
    ]
  },
  {
    id: 'gharbia',
    name_ar: 'الغربية (طنطا والمحلة)',
    name_en: 'Gharbia (Tanta & Mehalla)',
    shipping_fee: 45,
    delivery_time_ar: 'توصيل خلال 24 ساعة',
    delivery_time_en: 'Delivered in 24 hours',
    cities: [
      { name_ar: 'طنطا', name_en: 'Tanta' },
      { name_ar: 'المحلة الكبرى', name_en: 'El Mehalla' },
      { name_ar: 'زفتى وكفر الزيات', name_en: 'Zefta' }
    ]
  },
  {
    id: 'sharqia',
    name_ar: 'الشرقية (الزقازيق والعاشر)',
    name_en: 'Sharqia (Zagazig & 10th of Ramadan)',
    shipping_fee: 50,
    delivery_time_ar: 'توصيل خلال 24 - 48 ساعة',
    delivery_time_en: 'Delivered in 24 - 48 hours',
    cities: [
      { name_ar: 'الزقازيق', name_en: 'Zagazig' },
      { name_ar: 'العاشر من رمضان', name_en: '10th of Ramadan' },
      { name_ar: 'بلبيس', name_en: 'Belbeis' },
      { name_ar: 'فاقوس', name_en: 'Faqous' }
    ]
  },
  {
    id: 'damietta',
    name_ar: 'دمياط ودمياط الجديدة',
    name_en: 'Damietta & New Damietta',
    shipping_fee: 45,
    delivery_time_ar: 'توصيل خلال 24 ساعة',
    delivery_time_en: 'Delivered in 24 hours',
    cities: [
      { name_ar: 'دمياط', name_en: 'Damietta' },
      { name_ar: 'دمياط الجديدة', name_en: 'New Damietta' },
      { name_ar: 'رأس البر', name_en: 'Ras El Bar' }
    ]
  },
  {
    id: 'port_said',
    name_ar: 'بورسعيد والإسماعيلية والسويس',
    name_en: 'Canal Zone (Port Said, Ismailia, Suez)',
    shipping_fee: 55,
    delivery_time_ar: 'توصيل خلال 24 - 48 ساعة',
    delivery_time_en: 'Delivered in 24 - 48 hours',
    cities: [
      { name_ar: 'بورسعيد', name_en: 'Port Said' },
      { name_ar: 'الإسماعيلية', name_en: 'Ismailia' },
      { name_ar: 'السويس', name_en: 'Suez' }
    ]
  },
  {
    id: 'upper_egypt',
    name_ar: 'محافظات الصعيد (أسيوط، سوهاج، قنا، الأقصر، أسوان)',
    name_en: 'Upper Egypt',
    shipping_fee: 80,
    delivery_time_ar: 'توصيل خلال 48 - 72 ساعة',
    delivery_time_en: 'Delivered in 48 - 72 hours',
    cities: [
      { name_ar: 'أسيوط', name_en: 'Assiut' },
      { name_ar: 'سوهاج', name_en: 'Sohag' },
      { name_ar: 'قنا والأقصر', name_en: 'Qena & Luxor' },
      { name_ar: 'أسوان', name_en: 'Aswan' },
      { name_ar: 'بني سويف والمنيا', name_en: 'Beni Suef & Minya' }
    ]
  }
];
