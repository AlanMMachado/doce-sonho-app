export interface Product {
  id: string;
  shipment_id: string;
  product_config_id?: string;
  type: string;
  flavor: string;
  initial_quantity: number;
  sold_quantity: number;
  base_price: number;
  promo_price?: number;
  promo_quantity?: number;
  created_at?: string;
}

export interface ProductCreateParams {
  shipment_id: string;
  type: string;
  flavor: string;
  initial_quantity: number;
  base_price: number;
  promo_price?: number;
  promo_quantity?: number;
  product_config_id?: string;
}

export interface ShipmentProduct {
  type: string;
  flavor: string;
  initial_quantity: number;
  base_price: number;
  promo_price?: number;
  promo_quantity?: number;
  product_config_id?: string;
}
