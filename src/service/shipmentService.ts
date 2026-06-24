import { supabase } from '@/lib/supabase';
import { Product, ShipmentProduct } from '../types/Product';
import { Shipment, ShipmentCreateParams } from '../types/Shipment';
import { ProductConfigService } from './productConfigService';

async function resolveProductPrices(
  userId: string,
  product: ShipmentProduct
): Promise<{
  base_price: number;
  promo_price: number | null;
  promo_quantity: number | null;
  product_config_id: string | null;
  production_cost: number;
}> {
  const production_cost = product.production_cost ?? (product.type === 'trufa' ? 2.50 : 5.00);

  if (product.base_price && product.base_price > 0) {
    return {
      base_price: product.base_price,
      promo_price: product.promo_price ?? null,
      promo_quantity: product.promo_quantity ?? null,
      product_config_id: product.product_config_id ?? null,
      production_cost,
    };
  }

  const config = await ProductConfigService.getByType(userId, product.type);
  if (config) {
    return {
      base_price: config.base_price,
      promo_price: config.promo_price ?? null,
      promo_quantity: config.promo_quantity ?? null,
      product_config_id: config.id,
      production_cost,
    };
  }

  return { base_price: 0, promo_price: null, promo_quantity: null, product_config_id: null, production_cost };
}

export const ShipmentService = {
  async create(userId: string, params: ShipmentCreateParams): Promise<Shipment> {
    const { data: shipment, error } = await supabase
      .from('shipments')
      .insert({ user_id: userId, date: params.date, notes: params.notes ?? null })
      .select()
      .single();
    if (error) throw error;

    const productsToInsert = await Promise.all(
      params.products.map(async (p) => {
        const prices = await resolveProductPrices(userId, p);
        return {
          user_id: userId,
          shipment_id: shipment.id,
          product_config_id: prices.product_config_id,
          type: p.type,
          flavor: p.flavor,
          initial_quantity: p.initial_quantity,
          sold_quantity: 0,
          production_cost: prices.production_cost,
          base_price: prices.base_price,
          promo_price: prices.promo_price,
          promo_quantity: prices.promo_quantity,
        };
      })
    );

    const { data: products, error: productsError } = await supabase
      .from('products')
      .insert(productsToInsert)
      .select();
    if (productsError) throw productsError;

    return { ...shipment, products: products ?? [] };
  },

  async getAll(userId: string): Promise<Shipment[]> {
    const { data, error } = await supabase
      .from('shipments')
      .select('*, products(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getActive(userId: string): Promise<Shipment[]> {
    const { data, error } = await supabase
      .from('shipments')
      .select('*, products(*)')
      .eq('user_id', userId)
      .eq('active', true)
      .order('created_at', { ascending: false });
    if (error) throw error;

    return (data ?? []).filter(s =>
      (s.products as Product[]).some(p => p.initial_quantity - p.sold_quantity > 0)
    );
  },

  async getById(userId: string, id: string): Promise<Shipment | null> {
    const { data, error } = await supabase
      .from('shipments')
      .select('*, products(*)')
      .eq('user_id', userId)
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  },

  async getProductsByShipmentId(userId: string, shipmentId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .eq('shipment_id', shipmentId)
      .order('type')
      .order('flavor');
    if (error) throw error;
    return data ?? [];
  },

  async update(userId: string, id: string, updates: Partial<Pick<Shipment, 'date' | 'notes' | 'active'>>): Promise<void> {
    const { error } = await supabase
      .from('shipments')
      .update(updates)
      .eq('user_id', userId)
      .eq('id', id);
    if (error) throw error;
  },

  async toggleActive(userId: string, id: string): Promise<boolean> {
    const shipment = await this.getById(userId, id);
    if (!shipment) throw new Error('Remessa não encontrada');

    const newStatus = !shipment.active;
    await this.update(userId, id, { active: newStatus });
    return newStatus;
  },

  async updateProduct(userId: string, id: string, updates: Partial<Product>): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update({
        type: updates.type,
        flavor: updates.flavor,
        initial_quantity: updates.initial_quantity,
        production_cost: updates.production_cost,
        base_price: updates.base_price,
        promo_price: updates.promo_price ?? null,
        promo_quantity: updates.promo_quantity ?? null,
      })
      .eq('user_id', userId)
      .eq('id', id);
    if (error) throw error;
  },

  async addProduct(userId: string, shipmentId: string, product: ShipmentProduct): Promise<void> {
    const prices = await resolveProductPrices(userId, product);
    const { error } = await supabase.from('products').insert({
      user_id: userId,
      shipment_id: shipmentId,
      product_config_id: prices.product_config_id,
      type: product.type,
      flavor: product.flavor,
      initial_quantity: product.initial_quantity,
      sold_quantity: 0,
      production_cost: prices.production_cost,
      base_price: prices.base_price,
      promo_price: prices.promo_price,
      promo_quantity: prices.promo_quantity,
    });
    if (error) throw error;
  },

  async deleteProduct(userId: string, id: string): Promise<void> {
    const { data: sales } = await supabase
      .from('sale_items')
      .select('id')
      .eq('product_id', id)
      .limit(1);

    if (sales && sales.length > 0) {
      throw new Error('Não é possível excluir produto com vendas associadas');
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('user_id', userId)
      .eq('id', id);
    if (error) throw error;
  },

  async delete(userId: string, id: string): Promise<void> {
    const { error } = await supabase
      .from('shipments')
      .delete()
      .eq('user_id', userId)
      .eq('id', id);
    if (error) throw error;
  },
};
