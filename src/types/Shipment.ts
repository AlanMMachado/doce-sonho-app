import { Product, ShipmentProduct } from './Product';

export interface ShipmentProductForm {
  id?: string;
  product_config_id: string;
  type: string;
  custom_type?: string;
  flavor: string;
  initial_quantity: string;
  base_price: number;
  promo_price?: number;
  promo_quantity?: number;
}

export interface Shipment {
  id: string;
  date: string;
  notes?: string;
  active: boolean;
  created_at?: string;
  products?: Product[];
}

export interface ShipmentCreateParams {
  date: string;
  notes?: string;
  products: ShipmentProduct[];
}
