import { supabase } from '@/lib/supabase';
import { formatLocalDate } from '@/lib/utils/dateUtils';
import { Customer, CustomerCreateParams, CustomerListItem, CustomerUpdateParams } from '../types/Customer';

const CUSTOMER_LIST_FIELDS = 'id, name, total_purchased, total_owed, purchase_count, last_purchase, status';

interface CustomerPageOptions {
  limit?: number;
  offset?: number;
  search?: string;
  status?: 'devedor' | 'em_dia';
}

export interface CustomerPage {
  items: CustomerListItem[];
  hasMore: boolean;
}

export const CustomerService = {
  async upsertByName(userId: string, name: string): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .upsert(
        { user_id: userId, name, registered_at: formatLocalDate() },
        { onConflict: 'user_id,name', ignoreDuplicates: true }
      )
      .select()
      .single();

    if (error || !data) {
      const existing = await this.getByName(userId, name);
      if (!existing) throw error ?? new Error('Erro ao criar cliente');
      return existing;
    }
    return data;
  },

  async create(userId: string, customer: CustomerCreateParams): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .insert({
        user_id: userId,
        name: customer.name,
        registered_at: customer.registered_at ?? formatLocalDate(),
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getById(userId: string, id: string): Promise<Customer | null> {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', userId)
      .eq('id', id)
      .single();
    return data ?? null;
  },

  async getByName(userId: string, name: string): Promise<Customer | null> {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', userId)
      .eq('name', name)
      .single();
    return data ?? null;
  },

  async getAll(userId: string): Promise<CustomerListItem[]> {
    const { data, error } = await supabase
      .from('customers')
      .select(CUSTOMER_LIST_FIELDS)
      .eq('user_id', userId)
      .order('name');
    if (error) throw error;
    return data ?? [];
  },

  async getPage(userId: string, options: CustomerPageOptions = {}): Promise<CustomerPage> {
    const limit = Math.min(Math.max(options.limit ?? 25, 1), 100);
    const offset = Math.max(options.offset ?? 0, 0);
    let query = supabase
      .from('customers')
      .select(CUSTOMER_LIST_FIELDS)
      .eq('user_id', userId)
      .order('name')
      .order('id')
      .range(offset, offset + limit);

    const search = options.search?.trim();
    if (search) query = query.ilike('name', `%${search}%`);
    if (options.status) query = query.eq('status', options.status);

    const { data, error } = await query;
    if (error) throw error;

    const rows = data ?? [];
    return {
      items: rows.slice(0, limit),
      hasMore: rows.length > limit,
    };
  },

  async update(userId: string, id: string, params: CustomerUpdateParams): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .update({ name: params.name })
      .eq('user_id', userId)
      .eq('id', id);
    if (error) {
      if (error.code === '23505') throw new Error('Já existe um cliente com esse nome');
      throw error;
    }
    if (params.name) {
      await supabase
        .from('sales')
        .update({ customer_name: params.name })
        .eq('user_id', userId)
        .eq('customer_id', id);
    }
  },

  async delete(userId: string, id: string): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('user_id', userId)
      .eq('id', id);
    if (error) throw error;
  },

  async getDebtors(userId: string): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'devedor')
      .order('total_owed', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getStats(userId: string): Promise<{
    totalCustomers: number;
    totalDebtors: number;
    totalAmountOwed: number;
    totalAmountPurchased: number;
    totalPaid: number;
  }> {
    const { data, error } = await supabase
      .from('customers')
      .select('status, total_owed, total_purchased')
      .eq('user_id', userId);
    if (error) throw error;

    const rows = data ?? [];
    return {
      totalCustomers: rows.length,
      totalDebtors: rows.filter(r => r.status === 'devedor').length,
      totalAmountOwed: rows.reduce((s, r) => s + (r.total_owed ?? 0), 0),
      totalAmountPurchased: rows.reduce((s, r) => s + (r.total_purchased ?? 0), 0),
      totalPaid: rows.reduce((s, r) => s + (r.total_purchased ?? 0) - (r.total_owed ?? 0), 0),
    };
  },
};
