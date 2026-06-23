import { supabase } from '@/lib/supabase';
import { Produto, ProdutoCreateParams } from '../types/Produto';

export const ProdutoService = {
    async create(userId: string, produto: ProdutoCreateParams): Promise<Produto> {
        const { data, error } = await supabase
            .from('produtos')
            .insert({
                user_id: userId,
                remessa_id: produto.remessa_id,
                produto_config_id: produto.produto_config_id ?? null,
                tipo: produto.tipo,
                sabor: produto.sabor,
                quantidade_inicial: produto.quantidade_inicial,
                quantidade_vendida: 0,
                custo_producao: produto.custo_producao ?? (produto.tipo === 'trufa' ? 2.50 : 5.00),
                preco_base: produto.preco_base,
                preco_promocao: produto.preco_promocao ?? null,
                quantidade_promocao: produto.quantidade_promocao ?? null,
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async getByRemessa(userId: string, remessaId: string): Promise<Produto[]> {
        const { data, error } = await supabase
            .from('produtos')
            .select('*')
            .eq('user_id', userId)
            .eq('remessa_id', remessaId);
        if (error) throw error;
        return data ?? [];
    },

    async getById(userId: string, id: string): Promise<Produto | null> {
        const { data, error } = await supabase
            .from('produtos')
            .select('*')
            .eq('user_id', userId)
            .eq('id', id)
            .single();
        if (error) return null;
        return data;
    },

    async update(userId: string, id: string, produto: Partial<Produto>): Promise<void> {
        const { error } = await supabase
            .from('produtos')
            .update({
                tipo: produto.tipo,
                sabor: produto.sabor,
                quantidade_inicial: produto.quantidade_inicial,
            })
            .eq('user_id', userId)
            .eq('id', id);
        if (error) throw error;
    },

    async delete(userId: string, id: string): Promise<void> {
        const { error } = await supabase
            .from('produtos')
            .delete()
            .eq('user_id', userId)
            .eq('id', id);
        if (error) throw error;
    },
};
