export type CategoryKey = 
  | 'all'
  | 'smartphones'
  | 'smartwatches'
  | 'audio'
  | 'chargers_cables'
  | 'powerbanks'
  | 'cases_protection'
  | 'accessories'
  | (string & {});

export interface CustomCategory {
  key: string;
  name_ar: string;
  name_en: string;
  image: string;
}

export interface DiscountCoupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number; // e.g. 10 for 10% or 50 for 50 EGP
  min_order_amount?: number;
  max_discount_amount?: number;
  is_active: boolean;
  used_by?: string[]; // IDs, phone numbers, or emails of accounts who placed an order with this coupon
  created_at: string;
}

export type ProductCondition = 'brand_new' | 'mint' | 'used_good' | 'unknown';

export interface ProductFeatureBanner {
  title: string;
  subtitle?: string;
  description: string;
  image_url: string;
  tag?: string;
}

export interface CustomerReviewItem {
  id: string;
  author: string;
  location?: string;
  rating: number;
  date: string;
  title: string;
  comment: string;
  verified_purchase: boolean;
  helpful_count: number;
  avatar?: string;
  images?: string[];
}

export interface ProductReview {
  id: string;
  product_id: string;
  product_name_ar?: string;
  author_name: string;
  author_phone?: string;
  user_id?: string;
  session_id?: string;
  rating: number;
  comment: string;
  images: string[];
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at?: string;
}

export interface RatingBreakdown {
  five_star: number;
  four_star: number;
  three_star: number;
  two_star: number;
  one_star: number;
}

export interface Product {
  id: string;
  sku?: string;
  asin?: string;
  model_name?: string;
  catalog_status?: 'verified' | 'estimated';
  image_is_illustrative?: boolean;
  data_sources?: { url: string; title?: string }[];
  source_row?: number;
  source_item_code?: string;
  source_name?: string;
  raw_source_stock?: number;
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
  recorded_stock?: number;
  recorded_images?: string[];
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
  bought_past_month?: number;
  about_item?: string[];
  quick_specs?: { [key: string]: string };
  feature_banners?: ProductFeatureBanner[];
  frequently_bought_together?: string[];
  rating_breakdown?: RatingBreakdown;
  customer_reviews?: CustomerReviewItem[];
  model_variants?: { name: string; id?: string; price?: number }[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  selected_storage?: string;
  selected_color?: string;
}

export type PaymentMethod = 'cod' | 'instapay' | 'vodafone_cash' | 'credit_card' | 'card';
export type PaymentStatus = 'unpaid' | 'paid' | 'verified';
export type PaymentGatewayProvider = 'none' | 'kashier' | 'paymob';
export type PaymentGatewayMode = 'test' | 'live';

export interface PaymentGatewayPublicState {
  provider: PaymentGatewayProvider;
  mode: PaymentGatewayMode;
  configured: boolean;
  methods: {
    card: boolean;
    wallet: boolean;
    instapay: boolean;
  };
}
export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface DeliveryAddressFields {
  address_type?: 'home' | 'work' | 'other';
  district?: string;
  street?: string;
  building_no?: string;
  floor_no?: string;
  apartment_no?: string;
  landmark?: string;
  postal_code?: string;
  delivery_instructions?: string;
  extra_details?: string;
  google_maps_url?: string;
  latitude?: number;
  longitude?: number;
}

export interface Order extends DeliveryAddressFields {
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
  coupon_code?: string;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_receipt_url?: string;
  payment_reference?: string;
  checkout_url?: string;
  session_id?: string;
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

export type WhatsAppNotificationType =
  | 'order_confirmed'
  | 'admin_new_order'
  | 'payment_verified'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'review_request'
  | 'custom';

export interface WhatsAppTemplates {
  order_confirmed?: string;
  admin_new_order?: string;
  payment_verified?: string;
  shipped?: string;
  out_for_delivery?: string;
  delivered?: string;
  cancelled?: string;
  review_request?: string;
}

export interface WhatsAppNotification {
  id: string;
  order_id: string;
  order_number?: string;
  phone: string;
  type: WhatsAppNotificationType;
  text: string;
  sent_at: string;
  status: 'sent' | 'simulated' | 'failed';
  error_message?: string;
}

export interface CustomShippingRate {
  governorate_id: string;
  city_name?: string; // specific city, or omitted / '*' for entire governorate
  shipping_fee: number;
  delivery_time_ar?: string;
  delivery_time_en?: string;
  is_active?: boolean;
}

export interface CustomCity {
  governorate_id: string;
  name_ar: string;
  name_en?: string;
}

export interface HeroSlide {
  id: string;
  slide_type?: 'product' | 'banner';
  badge: string;
  title_ar: string;
  title_en: string;
  subtitle_ar: string;
  subtitle_en: string;
  price?: string;
  oldPrice?: string;
  tag?: string;
  image: string;
  cat?: CategoryKey;
  linked_product_id?: string;
  product_id?: string;
  link_type?: 'brand' | 'category' | 'search' | 'product' | 'url';
  link_target?: string;
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
  auto_alert_admin_on_order?: boolean;
  admin_alert_whatsapp_number?: string;
  whatsapp_templates?: WhatsAppTemplates;
  meta_pixel_id?: string;
  meta_pixel_enabled?: boolean;
  payment_gateway_provider?: PaymentGatewayProvider;
  payment_gateway_mode?: PaymentGatewayMode;
  payment_gateway_public?: PaymentGatewayPublicState;
  shipping_fee_default: number;
  free_shipping_threshold: number;
  tiktok_url?: string;
  instagram_url?: string;
  facebook_url?: string;
  active_theme?: 'royal_gold' | 'titanium_blue' | 'emerald_tech';
  theme_mode?: 'dark' | 'light';
  hero_slides?: HeroSlide[];
  custom_categories?: CustomCategory[];
  coupons?: DiscountCoupon[];
  homepage_featured_ids?: string[];
  custom_shipping_rates?: CustomShippingRate[];
  custom_cities?: CustomCity[];
  disabled_cities?: string[];
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
