import { supabase } from '@/lib/supabase';
import { Cliente, ClienteCreateParams } from '../types/Cliente';

export const ClienteService = {
    async upsertByNome(userId: string, nome: string): Promise<Cliente> {
        const { data, error } = await supabase
            .from('clientes')
            .upsert(
                { user_id: userId, nome, data_cadastro: new Date().toISOString().split('T')[0] },
                { onConflict: 'user_id,nome', ignoreDuplicates: true }
            )
            .select()
            .single();

        if (error || !data) {
            const existing = await this.getByNome(userId, nome);
            if (!existing) throw error ?? new Error('Erro ao criar cliente');
            return existing;
        }
        return data;
    },

    async create(userId: string, cliente: ClienteCreateParams): Promise<Cliente> {
        const { data, error } = await supabase
            .from('clientes')
            .insert({
                user_id: userId,
                nome: cliente.nome,
                data_cadastro: cliente.data_cadastro ?? new Date().toISOString().split('T')[0],
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async getById(userId: string, id: string): Promise<Cliente | null> {
        const { data } = await supabase
            .from('clientes')
            .select('*')
            .eq('user_id', userId)
            .eq('id', id)
            .single();
        return data ?? null;
    },

    async getByNome(userId: string, nome: string): Promise<Cliente | null> {
        const { data } = await supabase
            .from('clientes')
            .select('*')
            .eq('user_id', userId)
            .eq('nome', nome)
            .single();
        return data ?? null;
    },

    async getAll(userId: string): Promise<Cliente[]> {
        const { data, error } = await supabase
            .from('clientes')
            .select('*')
            .eq('user_id', userId)
            .order('nome');
        if (error) throw error;
        return data ?? [];
    },

    async delete(userId: string, id: string): Promise<void> {
        const { error } = await supabase
            .from('clientes')
            .delete()
            .eq('user_id', userId)
            .eq('id', id);
        if (error) throw error;
    },

    async getDevedores(userId: string): Promise<Cliente[]> {
        const { data, error } = await supabase
            .from('clientes')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'devedor')
            .order('total_devido', { ascending: false });
        if (error) throw error;
        return data ?? [];
    },

    async getEstatisticas(userId: string): Promise<{
        totalClientes: number;
        totalDevedores: number;
        totalValorDevido: number;
        totalValorComprado: number;
    }> {
        const { data, error } = await supabase
            .from('clientes')
            .select('status, total_devido, total_comprado')
            .eq('user_id', userId);
        if (error) throw error;

        const rows = data ?? [];
        return {
            totalClientes: rows.length,
            totalDevedores: rows.filter(r => r.status === 'devedor').length,
            totalValorDevido: rows.reduce((s, r) => s + (r.total_devido ?? 0), 0),
            totalValorComprado: rows.reduce((s, r) => s + (r.total_comprado ?? 0), 0),
        };
    },
};
