export interface ProductConfig {
  id: string;
  type: string;
  custom_type?: string;
  base_price: number;
  promo_price?: number;
  promo_quantity?: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProductConfigCreateParams {
  type: string;
  custom_type?: string;
  base_price: number;
  promo_price?: number;
  promo_quantity?: number;
}

export interface ProductConfigForm {
  type: string;
  customType: string;
  base_price: string;
  promo_price: string;
  promo_quantity: string;
}
