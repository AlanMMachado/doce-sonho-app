import { supabase } from '@/lib/supabase';
import { ProductConfig, ProductConfigCreateParams } from '@/types/ProductConfig';

export class ProductConfigService {
  static async create(userId: string, params: ProductConfigCreateParams): Promise<ProductConfig> {
    const { data, error } = await supabase
      .from('product_configs')
      .insert({
        user_id: userId,
        type: params.type,
        custom_type: params.custom_type ?? null,
        base_price: params.base_price,
        promo_price: params.promo_price ?? null,
        promo_quantity: params.promo_quantity ?? null,
        active: true,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async getAll(userId: string): Promise<ProductConfig[]> {
    const { data, error } = await supabase
      .from('product_configs')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .order('type')
      .order('custom_type');
    if (error) throw error;
    return data ?? [];
  }

  static async getById(userId: string, id: string): Promise<ProductConfig | null> {
    const { data, error } = await supabase
      .from('product_configs')
      .select('*')
      .eq('user_id', userId)
      .eq('id', id)
      .eq('active', true)
      .single();
    if (error) return null;
    return data;
  }

  static async update(userId: string, id: string, params: Partial<ProductConfigCreateParams>): Promise<void> {
    const { error } = await supabase
      .from('product_configs')
      .update(params)
      .eq('user_id', userId)
      .eq('id', id);
    if (error) throw error;
  }

  static async delete(userId: string, id: string): Promise<void> {
    const { error } = await supabase
      .from('product_configs')
      .update({ active: false })
      .eq('user_id', userId)
      .eq('id', id);
    if (error) throw error;
  }

  static async getByType(userId: string, type: string, customType?: string): Promise<ProductConfig | null> {
    let query = supabase
      .from('product_configs')
      .select('*')
      .eq('user_id', userId)
      .eq('type', type)
      .eq('active', true);

    if (customType) {
      query = query.eq('custom_type', customType);
    } else {
      query = query.is('custom_type', null);
    }

    const { data } = await query.single();
    return data ?? null;
  }
}
