export interface Customer {
  id: string;
  name: string;
  total_purchased: number;
  total_owed: number;
  purchase_count: number;
  last_purchase: string;
  status: 'devedor' | 'em_dia';
  registered_at: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerCreateParams {
  name: string;
  registered_at?: string;
}

export interface CustomerUpdateParams {
  name?: string;
}
