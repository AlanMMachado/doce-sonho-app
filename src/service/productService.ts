import { supabase } from '@/lib/supabase';
import { Product, ProductCreateParams } from '../types/Product';

export const ProductService = {
  async create(userId: string, product: ProductCreateParams): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert({
        user_id: userId,
        shipment_id: product.shipment_id,
        product_config_id: product.product_config_id ?? null,
        type: product.type,
        flavor: product.flavor,
        initial_quantity: product.initial_quantity,
        sold_quantity: 0,
        base_price: product.base_price,
        promo_price: product.promo_price ?? null,
        promo_quantity: product.promo_quantity ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getByShipment(userId: string, shipmentId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .eq('shipment_id', shipmentId);
    if (error) throw error;
    return data ?? [];
  },

  async getById(userId: string, id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  },

  async update(userId: string, id: string, product: Partial<Product>): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update({
        type: product.type,
        flavor: product.flavor,
        initial_quantity: product.initial_quantity,
      })
      .eq('user_id', userId)
      .eq('id', id);
    if (error) throw error;
  },

  async delete(userId: string, id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('user_id', userId)
      .eq('id', id);
    if (error) throw error;
  },
};
