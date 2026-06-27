import { supabase } from '@/lib/supabase';
import { Product } from '../types/Product';
import { Sale, SaleCreateParams, SaleItem, SaleItemForm, SaleUpdateParams } from '../types/Sale';
import { CustomerService } from './customerService';

export const calculateSubtotalWithBatches = (
  quantity: number,
  base_price: number,
  promo_price: number | null | undefined,
  promo_quantity: number | null | undefined
): number => {
  if (!promo_price || !promo_quantity || quantity < promo_quantity) {
    return quantity * base_price;
  }

  const numBatches = Math.floor(quantity / promo_quantity);
  const itemsWithPromo = numBatches * promo_quantity;
  const remaining = quantity % promo_quantity;

  return itemsWithPromo * promo_price + remaining * base_price;
};

export const checkPromotionApplied = (
  item: SaleItemForm,
  allItems: SaleItemForm[],
  products: Product[]
): boolean => {
  if (!item.product_id) return false;
  const product = products.find(p => p.id === item.product_id);
  if (!product || !product.promo_price || !product.promo_quantity) return false;

  const totalQtyForType = allItems.reduce((total, current) => {
    if (current.product_id && current.quantity) {
      const currentProduct = products.find(p => p.id === current.product_id);
      if (currentProduct && currentProduct.type === product.type) {
        return total + parseInt(current.quantity);
      }
    }
    return total;
  }, 0);

  return totalQtyForType >= product.promo_quantity;
};

export const recalculateAllPrices = (items: SaleItemForm[], products: Product[]): SaleItemForm[] => {
  const itemsWithProduct = items.map((item, index) => {
    const product = products.find(p => p.id === item.product_id);
    return { item, index, product };
  });

  const byType: { [type: string]: typeof itemsWithProduct } = {};
  for (const entry of itemsWithProduct) {
    if (!entry.product) continue;
    const type = entry.product.type;
    if (!byType[type]) byType[type] = [];
    byType[type].push(entry);
  }

  const result = [...items];

  for (const type in byType) {
    const group = byType[type];
    const sample = group[0].product!;

    const totalQty = group.reduce((sum, entry) => sum + (parseInt(entry.item.quantity) || 0), 0);

    if (!sample.promo_price || !sample.promo_quantity) {
      for (const entry of group) {
        const qty = parseInt(entry.item.quantity) || 0;
        result[entry.index] = {
          ...result[entry.index],
          base_price: sample.base_price.toString(),
          promo_price: undefined,
          subtotal: (qty * sample.base_price).toFixed(2),
          qty_with_discount: '0',
          qty_without_discount: qty.toString(),
        };
      }
      continue;
    }

    const numBatches = Math.floor(totalQty / sample.promo_quantity);
    const qtyWithDiscount = numBatches * sample.promo_quantity;
    let remainingDiscount = qtyWithDiscount;

    for (const entry of group) {
      const qty = parseInt(entry.item.quantity) || 0;
      const discountedQty = Math.min(qty, remainingDiscount);
      const regularQty = qty - discountedQty;

      result[entry.index] = {
        ...result[entry.index],
        base_price: sample.base_price.toString(),
        promo_price: sample.promo_price.toString(),
        subtotal: (discountedQty * sample.promo_price + regularQty * sample.base_price).toFixed(2),
        qty_with_discount: discountedQty.toString(),
        qty_without_discount: regularQty.toString(),
      };

      remainingDiscount -= discountedQty;
    }
  }

  return result;
};

export const SaleService = {
  async create(userId: string, sale: SaleCreateParams): Promise<Sale> {
    const customer = await CustomerService.upsertByName(userId, sale.customer_name);

    const total_price = sale.items.reduce((sum, item) => sum + item.subtotal, 0);

    const { data: newSale, error } = await supabase
      .from('sales')
      .insert({
        user_id: userId,
        customer_id: customer.id,
        customer_name: sale.customer_name,
        date: sale.date,
        status: sale.status,
        payment_method: sale.payment_method ?? null,
        total_price,
      })
      .select()
      .single();
    if (error) throw error;

    const itemsToInsert = sale.items.map(item => ({
      user_id: userId,
      sale_id: newSale.id,
      product_id: item.product_id ?? null,
      product_type: item.product_type ?? null,
      product_flavor: item.product_flavor ?? null,
      quantity: item.quantity,
      base_price: item.base_price,
      promo_price: item.promo_price ?? null,
      subtotal: item.subtotal,
    }));

    const { data: items, error: itemsError } = await supabase
      .from('sale_items')
      .insert(itemsToInsert)
      .select();
    if (itemsError) throw itemsError;

    return { ...newSale, items: items ?? [] };
  },

  async getById(userId: string, id: string): Promise<Sale | null> {
    const { data, error } = await supabase
      .from('sales')
      .select('*, items:sale_items(*)')
      .eq('user_id', userId)
      .eq('id', id)
      .single();
    if (error) return null;
    return data ? { ...data, items: data.items as SaleItem[] } : null;
  },

  async updateStatus(userId: string, id: string, status: 'PAGO' | 'PENDENTE'): Promise<void> {
    const { error } = await supabase
      .from('sales')
      .update({ status })
      .eq('user_id', userId)
      .eq('id', id);
    if (error) throw error;
  },

  async update(userId: string, id: string, sale: SaleUpdateParams): Promise<void> {
    const fields: Record<string, any> = {};
    if (sale.customer_name !== undefined) fields.customer_name = sale.customer_name;
    if (sale.date !== undefined) fields.date = sale.date;
    if (sale.status !== undefined) fields.status = sale.status;
    if (sale.payment_method !== undefined) fields.payment_method = sale.payment_method;

    if (sale.items !== undefined) {
      const total_price = sale.items.reduce((sum, item) => sum + item.subtotal, 0);
      fields.total_price = total_price;

      const { error: deleteError } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', id);
      if (deleteError) throw deleteError;

      const itemsToInsert = sale.items.map(item => ({
        user_id: userId,
        sale_id: id,
        product_id: item.product_id ?? null,
        product_type: item.product_type ?? null,
        product_flavor: item.product_flavor ?? null,
        quantity: item.quantity,
        base_price: item.base_price,
        promo_price: item.promo_price ?? null,
        subtotal: item.subtotal,
      }));

      const { error: insertError } = await supabase.from('sale_items').insert(itemsToInsert);
      if (insertError) throw insertError;
    }

    if (Object.keys(fields).length > 0) {
      const { error } = await supabase
        .from('sales')
        .update(fields)
        .eq('user_id', userId)
        .eq('id', id);
      if (error) throw error;
    }
  },

  async getByPeriod(userId: string, start: string, end: string): Promise<Sale[]> {
    const { data, error } = await supabase
      .from('sales')
      .select('*, items:sale_items(*)')
      .eq('user_id', userId)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(s => ({ ...s, items: s.items as SaleItem[] }));
  },

  async getRecent(userId: string, limit: number = 10): Promise<Sale[]> {
    const { data, error } = await supabase
      .from('sales')
      .select('*, items:sale_items(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(s => ({ ...s, items: s.items as SaleItem[] }));
  },

  async getTotalSoldByPeriod(userId: string, start: string, end: string): Promise<number> {
    const { data } = await supabase
      .from('sales')
      .select('total_price')
      .eq('user_id', userId)
      .eq('status', 'PAGO')
      .gte('date', start)
      .lte('date', end);
    return (data ?? []).reduce((s, v) => s + (v.total_price ?? 0), 0);
  },

  async getTotalPendingByPeriod(userId: string, start: string, end: string): Promise<number> {
    const { data } = await supabase
      .from('sales')
      .select('total_price')
      .eq('user_id', userId)
      .eq('status', 'PENDENTE')
      .gte('date', start)
      .lte('date', end);
    return (data ?? []).reduce((s, v) => s + (v.total_price ?? 0), 0);
  },

  async delete(userId: string, id: string): Promise<void> {
    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('user_id', userId)
      .eq('id', id);
    if (error) throw error;
  },

  async getByCustomerId(userId: string, customerId: string): Promise<Sale[]> {
    const { data, error } = await supabase
      .from('sales')
      .select('*, items:sale_items(*)')
      .eq('user_id', userId)
      .eq('customer_id', customerId)
      .order('date', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(s => ({ ...s, items: s.items as SaleItem[] }));
  },

  async getByProduct(userId: string, productId: string): Promise<Sale[]> {
    const { data } = await supabase
      .from('sale_items')
      .select('sale_id')
      .eq('product_id', productId);

    if (!data || data.length === 0) return [];

    const saleIds = [...new Set(data.map(r => r.sale_id))];
    const { data: sales, error } = await supabase
      .from('sales')
      .select('*, items:sale_items(*)')
      .eq('user_id', userId)
      .in('id', saleIds)
      .order('date', { ascending: false });
    if (error) throw error;
    return (sales ?? []).map(s => ({ ...s, items: s.items as SaleItem[] }));
  },
};
