export interface Governorate {
  id: string;
  name_ar: string;
  name_en: string;
  shipping_fee: number | null;
  delivery_time_ar: string;
  delivery_time_en: string;
  cities: { name_ar: string; name_en: string }[];
}
// Governorate names: Egypt State Information Service. Existing store tariffs
// are retained; null uses the merchant's configured default shipping fee.
export const egyptianGovernorates: Governorate[] = [
  {
    "id": "daqahlia",
    "name_ar": "الدقهلية",
    "name_en": "Dakahlia",
    "shipping_fee": 35,
    "delivery_time_ar": "موعد التوصيل يؤكد عند تجهيز الطلب",
    "delivery_time_en": "Delivery timing is confirmed when preparing your order",
    "cities": [
      {
        "name_ar": "المنصورة",
        "name_en": "المنصورة"
      },
      {
        "name_ar": "طلخا",
        "name_en": "طلخا"
      },
      {
        "name_ar": "ميت غمر",
        "name_en": "ميت غمر"
      },
      {
        "name_ar": "السنبلاوين",
        "name_en": "السنبلاوين"
      },
      {
        "name_ar": "دكرنس",
        "name_en": "دكرنس"
      },
      {
        "name_ar": "بلقاس",
        "name_en": "بلقاس"
      },
      {
        "name_ar": "شربين",
        "name_en": "شربين"
      },
      {
        "name_ar": "أجا",
        "name_en": "أجا"
      },
      {
        "name_ar": "جمصة",
        "name_en": "جمصة"
      }
    ]
  },
  {
    "id": "cairo",
    "name_ar": "القاهرة",
    "name_en": "Cairo",
    "shipping_fee": 55,
    "delivery_time_ar": "موعد التوصيل يؤكد عند تجهيز الطلب",
    "delivery_time_en": "Delivery timing is confirmed when preparing your order",
    "cities": [
      {
        "name_ar": "القاهرة",
        "name_en": "القاهرة"
      },
      {
        "name_ar": "القاهرة الجديدة",
        "name_en": "القاهرة الجديدة"
      },
      {
        "name_ar": "حلوان",
        "name_en": "حلوان"
      },
      {
        "name_ar": "الشروق",
        "name_en": "الشروق"
      },
      {
        "name_ar": "بدر",
        "name_en": "بدر"
      }
    ]
  },
  {
    "id": "giza",
    "name_ar": "الجيزة",
    "name_en": "Giza",
    "shipping_fee": 55,
    "delivery_time_ar": "موعد التوصيل يؤكد عند تجهيز الطلب",
    "delivery_time_en": "Delivery timing is confirmed when preparing your order",
    "cities": [
      {
        "name_ar": "الجيزة",
        "name_en": "الجيزة"
      },
      {
        "name_ar": "6 أكتوبر",
        "name_en": "6 أكتوبر"
      },
      {
        "name_ar": "الشيخ زايد",
        "name_en": "الشيخ زايد"
      },
      {
        "name_ar": "العياط",
        "name_en": "العياط"
      },
      {
        "name_ar": "البدرشين",
        "name_en": "البدرشين"
      },
      {
        "name_ar": "الصف",
        "name_en": "الصف"
      },
      {
        "name_ar": "أطفيح",
        "name_en": "أطفيح"
      },
      {
        "name_ar": "الحوامدية",
        "name_en": "الحوامدية"
      }
    ]
  },
  {
    "id": "alexandria",
    "name_ar": "الإسكندرية",
    "name_en": "Alexandria",
    "shipping_fee": 60,
    "delivery_time_ar": "موعد التوصيل يؤكد عند تجهيز الطلب",
    "delivery_time_en": "Delivery timing is confirmed when preparing your order",
    "cities": [
      {
        "name_ar": "الإسكندرية",
        "name_en": "الإسكندرية"
      },
      {
        "name_ar": "برج العرب",
        "name_en": "برج العرب"
      },
      {
        "name_ar": "برج العرب الجديدة",
        "name_en": "برج العرب الجديدة"
      }
    ]
  },
  {
    "id": "gharbia",
    "name_ar": "الغربية",
    "name_en": "Gharbia",
    "shipping_fee": 45,
    "delivery_time_ar": "موعد التوصيل يؤكد عند تجهيز الطلب",
    "delivery_time_en": "Delivery timing is confirmed when preparing your order",
    "cities": [
      {
        "name_ar": "طنطا",
        "name_en": "طنطا"
      },
      {
        "name_ar": "المحلة الكبرى",
        "name_en": "المحلة الكبرى"
      },
      {
        "name_ar": "زفتى",
        "name_en": "زفتى"
      },
      {
        "name_ar": "كفر الزيات",
        "name_en": "كفر الزيات"
      },
      {
        "name_ar": "السنطة",
        "name_en": "السنطة"
      },
      {
        "name_ar": "بسيون",
        "name_en": "بسيون"
      }
    ]
  },
  {
    "id": "sharqia",
    "name_ar": "الشرقية",
    "name_en": "Sharqia",
    "shipping_fee": 50,
    "delivery_time_ar": "موعد التوصيل يؤكد عند تجهيز الطلب",
    "delivery_time_en": "Delivery timing is confirmed when preparing your order",
    "cities": [
      {
        "name_ar": "الزقازيق",
        "name_en": "الزقازيق"
      },
      {
        "name_ar": "العاشر من رمضان",
        "name_en": "العاشر من رمضان"
      },
      {
        "name_ar": "بلبيس",
        "name_en": "بلبيس"
      },
      {
        "name_ar": "فاقوس",
        "name_en": "فاقوس"
      },
      {
        "name_ar": "أبو حماد",
        "name_en": "أبو حماد"
      },
      {
        "name_ar": "منيا القمح",
        "name_en": "منيا القمح"
      }
    ]
  },
  {
    "id": "damietta",
    "name_ar": "دمياط",
    "name_en": "Damietta",
    "shipping_fee": 45,
    "delivery_time_ar": "موعد التوصيل يؤكد عند تجهيز الطلب",
    "delivery_time_en": "Delivery timing is confirmed when preparing your order",
    "cities": [
      {
        "name_ar": "دمياط",
        "name_en": "دمياط"
      },
      {
        "name_ar": "دمياط الجديدة",
        "name_en": "دمياط الجديدة"
      },
      {
        "name_ar": "رأس البر",
        "name_en": "رأس البر"
      },
      {
        "name_ar": "فارسكور",
        "name_en": "فارسكور"
      },
      {
        "name_ar": "الزرقا",
        "name_en": "الزرقا"
      },
      {
        "name_ar": "كفر سعد",
        "name_en": "كفر سعد"
      }
    ]
  },
  {
    "id": "port_said",
    "name_ar": "بورسعيد",
    "name_en": "Port Said",
    "shipping_fee": 55,
    "delivery_time_ar": "موعد التوصيل يؤكد عند تجهيز الطلب",
    "delivery_time_en": "Delivery timing is confirmed when preparing your order",
    "cities": [
      {
        "name_ar": "بورسعيد",
        "name_en": "بورسعيد"
      },
      {
        "name_ar": "بورفؤاد",
        "name_en": "بورفؤاد"
      }
    ]
  },
  {
    "id": "ismailia",
    "name_ar": "الإسماعيلية",
    "name_en": "Ismailia",
    "shipping_fee": 55,
    "delivery_time_ar": "موعد التوصيل يؤكد عند تجهيز الطلب",
    "delivery_time_en": "Delivery timing is confirmed when preparing your order",
    "cities": [
      {
        "name_ar": "الإسماعيلية",
        "name_en": "الإسماعيلية"
      },
      {
        "name_ar": "القنطرة",
        "name_en": "القنطرة"
      },
      {
        "name_ar": "فايد",
        "name_en": "فايد"
      },
      {
        "name_ar": "التل الكبير",
        "name_en": "التل الكبير"
      }
    ]
  },
  {
    "id": "suez",
    "name_ar": "السويس",
    "name_en": "Suez",
    "shipping_fee": 55,
    "delivery_time_ar": "موعد التوصيل يؤكد عند تجهيز الطلب",
    "delivery_time_en": "Delivery timing is confirmed when preparing your order",
    "cities": [
      {
        "name_ar": "السويس",
        "name_en": "السويس"
      }
    ]
  },
  {
    "id": "qalyubia",
    "name_ar": "القليوبية",
    "name_en": "Qalyubia",
    "shipping_fee": null,
    "delivery_time_ar": "موعد التوصيل يؤكد عند تجهيز الطلب",
    "delivery_time_en": "Delivery timing is confirmed when preparing your order",
    "cities": [
      {
        "name_ar": "بنها",
        "name_en": "بنها"
      },
      {
        "name_ar": "شبرا الخيمة",
        "name_en": "شبرا الخيمة"
      },
      {
        "name_ar": "قليوب",
        "name_en": "قليوب"
      },
      {
        "name_ar": "طوخ",
        "name_en": "طوخ"
      },
      {
        "name_ar": "الخانكة",
        "name_en": "الخانكة"
      },
      {
        "name_ar": "كفر شكر",
        "name_en": "كفر شكر"
      },
      {
        "name_ar": "القناطر الخيرية",
        "name_en": "القناطر الخيرية"
      }
    ]
  },
  {
    "id": "kafr_el_sheikh",
    "name_ar": "كفر الشيخ",
    "name_en": "Kafr El Sheikh",
    "shipping_fee": null,
    "delivery_time_ar": "موعد التوصيل يؤكد عند تجهيز الطلب",
    "delivery_time_en": "Delivery timing is confirmed when preparing your order",
    "cities": [
      {
        "name_ar": "كفر الشيخ",
        "name_en": "كفر الشيخ"
      },
      {
        "name_ar": "دسوق",
        "name_en": "دسوق"
      },
      {
        "name_ar": "فوه",
        "name_en": "فوه"
      },
      {
        "name_ar": "مطوبس",
        "name_en": "مطوبس"
      },
      {
        "name_ar": "بلطيم",
        "name_en": "بلطيم"
      },
      {
        "name_ar": "سيدي سالم",
        "name_en": "سيدي سالم"
      }
    ]
  },
  {
    "id": "monufia",
    "name_ar": "المنوفية",
    "name_en": "Monufia",
    "shipping_fee": null,
    "delivery_time_ar": "موعد التوصيل يؤكد عند تجهيز الطلب",
    "delivery_time_en": "Delivery timing is confirmed when preparing your order",
    "cities": [
      {
        "name_ar": "شبين الكوم",
        "name_en": "شبين الكوم"
      },
      {
        "name_ar": "قويسنا",
        "name_en": "قويسنا"
      },
      {
        "name_ar": "منوف",
        "name_en": "منوف"
      },
      {
        "name_ar": "أشمون",
        "name_en": "أشمون"
      },
      {
        "name_ar": "السادات",
        "name_en": "السادات"
      },
      {
        "name_ar": "الباجور",
        "name_en": "الباجور"
      },
      {
        "name_ar": "الشهداء",
        "name_en": "الشهداء"
      }
    ]
  },
  {
    "id": "beheira",
    "name_ar": "البحيرة",
    "name_en": "Beheira",
    "shipping_fee": null,
    "delivery_time_ar": "موعد التوصيل يؤكد عند تجهيز الطلب",
    "delivery_time_en": "Delivery timing is confirmed when preparing your order",
    "cities": [
      {
        "name_ar": "دمنهور",
        "name_en": "دمنهور"
      },
      {
        "name_ar": "كفر الدوار",
        "name_en": "كفر الدوار"
      },
      {
        "name_ar": "رشيد",
        "name_en": "رشيد"
      },
      {
        "name_ar": "إدكو",
        "name_en": "إدكو"
      },
      {
        "name_ar": "إيتاي البارود",
        "name_en": "إيتاي البارود"
      },
      {
        "name_ar": "أبو حمص",
        "name_en": "أبو حمص"
      },
      {
        "name_ar": "كوم حمادة",
        "name_en": "كوم حمادة"
      },
      {
        "name_ar": "النوبارية",
        "name_en": "النوبارية"
      }
    ]
  },
  {
    "id": "beni_suef",
    "name_ar": "بني سويف",
    "name_en": "Beni Suef",
    "shipping_fee": 80,
    "delivery_time_ar": "موعد التوصيل يؤكد عند تجهيز الطلب",
    "delivery_time_en": "Delivery timing is confirmed when preparing your order",
    "cities": [
      {
        "name_ar": "بني سويف",
        "name_en": "بني سويف"
      },
      {
        "name_ar": "الواسطى",
        "name_en": "الواسطى"
      },
      {
        "name_ar": "ناصر",
        "name_en": "ناصر"
      },
      {
        "name_ar": "ببا",
        "name_en": "ببا"
      },
      {
        "name_ar": "الفشن",
        "name_en": "الفشن"
      },
      {
        "name_ar": "إهناسيا",
        "name_en": "إهناسيا"
      }
    ]
  },
  {
    "id": "fayoum",
    "name_ar": "الفيوم",
    "name_en": "Fayoum",
    "shipping_fee": null,
    "delivery_time_ar": "موعد التوصيل يؤكد عند تجهيز الطلب",
    "delivery_time_en": "Delivery timing is confirmed when preparing your order",
    "cities": [
      {
        "name_ar": "الفيوم",
        "name_en": "الفيوم"
      },
      {
        "name_ar": "سنورس",
        "name_en": "سنورس"
      },
      {
        "name_ar": "طامية",
        "name_en": "طامية"
      },
      {
        "name_ar": "إبشواي",
        "name_en": "إبشواي"
      },
      {
        "name_ar": "يوسف الصديق",
        "name_en": "يوسف الصديق"
      },
      {
        "name_ar": "إطسا",
        "name_en": "إطسا"
      }
    ]
  },
  {
    "id": "minya",
    "name_ar": "المنيا",
    "name_en": "Minya",
    "shipping_fee": 80,
    "delivery_time_ar": "موعد التوصيل يؤكد عند تجهيز الطلب",
    "delivery_time_en": "Delivery timing is confirmed when preparing your order",
    "cities": [
      {
        "name_ar": "المنيا",
        "name_en": "المنيا"
      },
      {
        "name_ar": "ملوي",
        "name_en": "ملوي"
      },
      {
        "name_ar": "سمالوط",
        "name_en": "سمالوط"
      },
      {
        "name_ar": "مغاغة",
        "name_en": "مغاغة"
      },
      {
        "name_ar": "بني مزار",
        "name_en": "بني مزار"
      },
      {
        "name_ar": "أبو قرقاص",
        "name_en": "أبو قرقاص"
      },
      {
        "name_ar": "دير مواس",
        "name_en": "دير مواس"
      }
    ]
  },
  {
    "id": "assiut",
    "name_ar": "أسيوط",
    "name_en": "Assiut",
    "shipping_fee": 80,
    "delivery_time_ar": "موعد التوصيل يؤكد عند تجهيز الطلب",
    "delivery_time_en": "Delivery timing is confirmed when preparing your order",
    "cities": [
      {
        "name_ar": "أسيوط",
        "name_en": "أسيوط"
      },
      {
        "name_ar": "ديروط",
        "name_en": "ديروط"
      },
      {
        "name_ar": "القوصية",
        "name_en": "القوصية"
      },
      {
        "name_ar": "أبو تيج",
        "name_en": "أبو تيج"
      },
      {
        "name_ar": "منفلوط",
        "name_en": "منفلوط"
      }
    ]
  },
  {
    "id": "sohag",
    "name_ar": "سوهاج",
    "name_en": "Sohag",
    "shipping_fee": 80,
    "delivery_time_ar": "موعد التوصيل يؤكد عند تجهيز الطلب",
    "delivery_time_en": "Delivery timing is confirmed when preparing your order",
    "cities": [
      {
        "name_ar": "سوهاج",
        "name_en": "سوهاج"
      },
      {
        "name_ar": "أخميم",
        "name_en": "أخميم"
      },
      {
        "name_ar": "جرجا",
        "name_en": "جرجا"
      },
      {
        "name_ar": "طهطا",
        "name_en": "طهطا"
      },
      {
        "name_ar": "البلينا",
        "name_en": "البلينا"
      },
      {
        "name_ar": "المراغة",
        "name_en": "المراغة"
      }
    ]
  },
  {
    "id": "qena",
    "name_ar": "قنا",
    "name_en": "Qena",
    "shipping_fee": 80,
    "delivery_time_ar": "موعد التوصيل يؤكد عند تجهيز الطلب",
    "delivery_time_en": "Delivery timing is confirmed when preparing your order",
    "cities": [
      {
        "name_ar": "قنا",
        "name_en": "قنا"
      },
      {
        "name_ar": "نجع حمادي",
        "name_en": "نجع حمادي"
      },
      {
        "name_ar": "قوص",
        "name_en": "قوص"
      },
      {
        "name_ar": "دشنا",
        "name_en": "دشنا"
      }
    ]
  },
  {
    "id": "luxor",
    "name_ar": "الأقصر",
    "name_en": "Luxor",
    "shipping_fee": 80,
    "delivery_time_ar": "موعد التوصيل يؤكد عند تجهيز الطلب",
    "delivery_time_en": "Delivery timing is confirmed when preparing your order",
    "cities": [
      {
        "name_ar": "الأقصر",
        "name_en": "الأقصر"
      },
      {
        "name_ar": "إسنا",
        "name_en": "إسنا"
      },
      {
        "name_ar": "أرمنت",
        "name_en": "أرمنت"
      }
    ]
  },
  {
    "id": "aswan",
    "name_ar": "أسوان",
    "name_en": "Aswan",
    "shipping_fee": 80,
    "delivery_time_ar": "موعد التوصيل يؤكد عند تجهيز الطلب",
    "delivery_time_en": "Delivery timing is confirmed when preparing your order",
    "cities": [
      {
        "name_ar": "أسوان",
        "name_en": "أسوان"
      },
      {
        "name_ar": "كوم أمبو",
        "name_en": "كوم أمبو"
      },
      {
        "name_ar": "إدفو",
        "name_en": "إدفو"
      },
      {
        "name_ar": "دراو",
        "name_en": "دراو"
      }
    ]
  },
  {
    "id": "red_sea",
    "name_ar": "البحر الأحمر",
    "name_en": "Red Sea",
    "shipping_fee": null,
    "delivery_time_ar": "موعد التوصيل يؤكد عند تجهيز الطلب",
    "delivery_time_en": "Delivery timing is confirmed when preparing your order",
    "cities": [
      {
        "name_ar": "الغردقة",
        "name_en": "الغردقة"
      },
      {
        "name_ar": "سفاجا",
        "name_en": "سفاجا"
      },
      {
        "name_ar": "القصير",
        "name_en": "القصير"
      },
      {
        "name_ar": "مرسى علم",
        "name_en": "مرسى علم"
      },
      {
        "name_ar": "رأس غارب",
        "name_en": "رأس غارب"
      }
    ]
  },
  {
    "id": "new_valley",
    "name_ar": "الوادي الجديد",
    "name_en": "New Valley",
    "shipping_fee": null,
    "delivery_time_ar": "موعد التوصيل يؤكد عند تجهيز الطلب",
    "delivery_time_en": "Delivery timing is confirmed when preparing your order",
    "cities": [
      {
        "name_ar": "الخارجة",
        "name_en": "الخارجة"
      },
      {
        "name_ar": "الداخلة",
        "name_en": "الداخلة"
      },
      {
        "name_ar": "الفرافرة",
        "name_en": "الفرافرة"
      },
      {
        "name_ar": "باريس",
        "name_en": "باريس"
      }
    ]
  },
  {
    "id": "matrouh",
    "name_ar": "مطروح",
    "name_en": "Matrouh",
    "shipping_fee": null,
    "delivery_time_ar": "موعد التوصيل يؤكد عند تجهيز الطلب",
    "delivery_time_en": "Delivery timing is confirmed when preparing your order",
    "cities": [
      {
        "name_ar": "مرسى مطروح",
        "name_en": "مرسى مطروح"
      },
      {
        "name_ar": "العلمين",
        "name_en": "العلمين"
      },
      {
        "name_ar": "سيوة",
        "name_en": "سيوة"
      },
      {
        "name_ar": "الضبعة",
        "name_en": "الضبعة"
      },
      {
        "name_ar": "السلوم",
        "name_en": "السلوم"
      }
    ]
  },
  {
    "id": "north_sinai",
    "name_ar": "شمال سيناء",
    "name_en": "North Sinai",
    "shipping_fee": null,
    "delivery_time_ar": "موعد التوصيل يؤكد عند تجهيز الطلب",
    "delivery_time_en": "Delivery timing is confirmed when preparing your order",
    "cities": [
      {
        "name_ar": "العريش",
        "name_en": "العريش"
      },
      {
        "name_ar": "الشيخ زويد",
        "name_en": "الشيخ زويد"
      },
      {
        "name_ar": "بئر العبد",
        "name_en": "بئر العبد"
      }
    ]
  },
  {
    "id": "south_sinai",
    "name_ar": "جنوب سيناء",
    "name_en": "South Sinai",
    "shipping_fee": null,
    "delivery_time_ar": "موعد التوصيل يؤكد عند تجهيز الطلب",
    "delivery_time_en": "Delivery timing is confirmed when preparing your order",
    "cities": [
      {
        "name_ar": "الطور",
        "name_en": "الطور"
      },
      {
        "name_ar": "شرم الشيخ",
        "name_en": "شرم الشيخ"
      },
      {
        "name_ar": "دهب",
        "name_en": "دهب"
      },
      {
        "name_ar": "نويبع",
        "name_en": "نويبع"
      },
      {
        "name_ar": "رأس سدر",
        "name_en": "رأس سدر"
      },
      {
        "name_ar": "طابا",
        "name_en": "طابا"
      },
      {
        "name_ar": "سانت كاترين",
        "name_en": "سانت كاترين"
      }
    ]
  }
];

export function findAddressGovernorate(name: string, city = '') {
  if (name.includes('والإسماعيلية') || name.includes('محافظات الصعيد')) {
    const match = egyptianGovernorates.find(g => g.cities.some(c => city.startsWith(c.name_ar)));
    if (match) return match;
  }
  return egyptianGovernorates.find(g => name === g.name_ar || name.startsWith(g.name_ar + ' ') || name.startsWith(g.name_ar + ' و'));
}
