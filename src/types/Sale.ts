export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_type?: string;
  product_flavor?: string;
  quantity: number;
  base_price: number;
  promo_price?: number;
  subtotal: number;
}

export interface SaleItemForm {
  product_id: string;
  quantity: string;
  base_price: string;
  promo_price?: string;
  subtotal: string;
  qty_with_discount?: string;
  qty_without_discount?: string;
}

export interface Sale {
  id: string;
  customer_id: string;
  customer_name: string;
  date: string;
  status: 'OK' | 'PENDENTE';
  payment_method?: string;
  total_price: number;
  items: SaleItem[];
  created_at?: string;
}

export interface SaleCreateParams {
  customer_name: string;
  date: string;
  status: 'OK' | 'PENDENTE';
  payment_method?: string;
  items: Omit<SaleItem, 'id' | 'sale_id'>[];
}

export interface SaleUpdateParams {
  customer_name?: string;
  date?: string;
  status?: 'OK' | 'PENDENTE';
  payment_method?: string;
  items?: Omit<SaleItem, 'id' | 'sale_id'>[];
}
