export type CategoryKey = 
  | 'all'
  | 'smartphones'
  | 'smartwatches'
  | 'audio'
  | 'chargers_cables'
  | 'powerbanks'
  | 'cases_protection'
  | 'accessories';

export type ProductCondition = 'brand_new' | 'mint' | 'used_good';

export interface Product {
  id: string;
  sku?: string;
  name_ar: string;
  name_en: string;
  brand: string;
  category: CategoryKey;
  condition: ProductCondition;
  battery_health?: number | null; // e.g. 85, 92, 97, 100 or null
  storage?: string; // '128GB', '256GB', '512GB', '1TB'
  color_ar?: string; // 'أبيض', 'أزرق', 'زيتي', 'بينك'
  color_en?: string;
  color_hex?: string;
  available_colors?: { name_ar: string; name_en: string; hex: string }[];
  available_storages?: string[];
  price: number;
  original_price?: number;
  discount_percentage?: number;
  stock: number;
  in_stock: boolean;
  images: string[];
  description_ar: string;
  description_en: string;
  specs: { [key: string]: string };
  warranty_months: number;
  rating: number;
  reviews_count: number;
  is_featured?: boolean;
  is_flash_sale?: boolean;
  is_best_seller?: boolean;
  is_active?: boolean;
  cost_price?: number;
  created_at?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selected_storage?: string;
  selected_color?: string;
}

export type PaymentMethod = 'cod' | 'instapay' | 'vodafone_cash' | 'credit_card';
export type PaymentStatus = 'unpaid' | 'paid' | 'verified';
export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_whatsapp: string;
  customer_email?: string;
  governorate: string;
  city: string;
  address_details: string;
  customer_secondary_phone?: string;
  building_no?: string;
  floor_no?: string;
  apartment_no?: string;
  landmark?: string;
  google_maps_url?: string;
  card_last4?: string;
  card_holder?: string;
  notes?: string;
  items: CartItem[];
  subtotal: number;
  shipping_fee: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_receipt_url?: string;
  payment_reference?: string;
  order_status: OrderStatus;
  courier_name?: string;
  tracking_number?: string;
  whatsapp_notification_sent: boolean;
  cancellation_reason?: string;
  cancelled_by?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppNotification {
  id: string;
  order_id: string;
  phone: string;
  type: 'order_confirmed' | 'payment_verified' | 'shipped' | 'out_for_delivery' | 'delivered' | 'review_request' | 'custom';
  text: string;
  sent_at: string;
  status: 'sent' | 'simulated' | 'failed';
  error_message?: string;
}

export interface HeroSlide {
  id: string;
  badge: string;
  title_ar: string;
  title_en: string;
  subtitle_ar: string;
  subtitle_en: string;
  price: string;
  oldPrice: string;
  tag: string;
  image: string;
  cat: CategoryKey;
}

export interface StoreSettings {
  store_name_ar: string;
  store_name_en: string;
  store_phone: string;
  store_whatsapp: string;
  store_address_ar: string;
  store_address_en: string;
  working_hours_ar: string;
  working_hours_en: string;
  instapay_address: string;
  vodafone_cash_number: string;
  whatsapp_automation_url: string;
  whatsapp_automation_email: string;
  whatsapp_automation_pass: string;
  whatsapp_automation_token: string;
  auto_send_on_order: boolean;
  auto_send_on_status_change: boolean;
  shipping_fee_default: number;
  free_shipping_threshold: number;
  tiktok_url?: string;
  instagram_url?: string;
  facebook_url?: string;
  active_theme?: 'royal_gold' | 'titanium_blue' | 'emerald_tech';
  theme_mode?: 'dark' | 'light';
  hero_slides?: HeroSlide[];
  // Email Template Customization
  email_subject_template?: string;
  email_header_title?: string;
  email_header_subtitle?: string;
  email_welcome_msg?: string;
  email_support_phone?: string;
  email_store_address?: string;
  email_security_note?: string;
  email_accent_color?: string;
}

