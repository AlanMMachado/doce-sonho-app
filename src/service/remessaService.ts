import { supabase } from '@/lib/supabase';
import { Produto, ProdutoParaRemessa } from '../types/Produto';
import { Remessa, RemessaCreateParams } from '../types/Remessa';
import { ProdutoConfigService } from './produtoConfigService';

async function resolverPrecosProduto(
    userId: string,
    produto: ProdutoParaRemessa
): Promise<{
    preco_base: number;
    preco_promocao: number | null;
    quantidade_promocao: number | null;
    produto_config_id: string | null;
    custo_producao: number;
}> {
    const custoPadrao = produto.custo_producao ?? (produto.tipo === 'trufa' ? 2.50 : 5.00);

    if (produto.preco_base && produto.preco_base > 0) {
        return {
            preco_base: produto.preco_base,
            preco_promocao: produto.preco_promocao ?? null,
            quantidade_promocao: produto.quantidade_promocao ?? null,
            produto_config_id: produto.produto_config_id ?? null,
            custo_producao: custoPadrao,
        };
    }

    const config = await ProdutoConfigService.getByTipo(userId, produto.tipo);
    if (config) {
        return {
            preco_base: config.preco_base,
            preco_promocao: config.preco_promocao ?? null,
            quantidade_promocao: config.quantidade_promocao ?? null,
            produto_config_id: config.id,
            custo_producao: custoPadrao,
        };
    }

    return { preco_base: 0, preco_promocao: null, quantidade_promocao: null, produto_config_id: null, custo_producao: custoPadrao };
}

export const RemessaService = {
    async create(userId: string, params: RemessaCreateParams): Promise<Remessa> {
        const { data: remessa, error } = await supabase
            .from('remessas')
            .insert({ user_id: userId, data: params.data, observacao: params.observacao ?? null })
            .select()
            .single();
        if (error) throw error;

        const produtosParaInserir = await Promise.all(
            params.produtos.map(async (p) => {
                const precos = await resolverPrecosProduto(userId, p);
                return {
                    user_id: userId,
                    remessa_id: remessa.id,
                    produto_config_id: precos.produto_config_id,
                    tipo: p.tipo,
                    sabor: p.sabor,
                    quantidade_inicial: p.quantidade_inicial,
                    quantidade_vendida: 0,
                    custo_producao: precos.custo_producao,
                    preco_base: precos.preco_base,
                    preco_promocao: precos.preco_promocao,
                    quantidade_promocao: precos.quantidade_promocao,
                };
            })
        );

        const { data: produtos, error: erroP } = await supabase
            .from('produtos')
            .insert(produtosParaInserir)
            .select();
        if (erroP) throw erroP;

        return { ...remessa, produtos: produtos ?? [] };
    },

    async getAll(userId: string): Promise<Remessa[]> {
        const { data, error } = await supabase
            .from('remessas')
            .select('*, produtos(*)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data ?? [];
    },

    async getAtivas(userId: string): Promise<Remessa[]> {
        const { data, error } = await supabase
            .from('remessas')
            .select('*, produtos(*)')
            .eq('user_id', userId)
            .eq('ativa', true)
            .order('created_at', { ascending: false });
        if (error) throw error;

        return (data ?? []).filter(r =>
            (r.produtos as Produto[]).some(p => p.quantidade_inicial - p.quantidade_vendida > 0)
        );
    },

    async getById(userId: string, id: string): Promise<Remessa | null> {
        const { data, error } = await supabase
            .from('remessas')
            .select('*, produtos(*)')
            .eq('user_id', userId)
            .eq('id', id)
            .single();
        if (error) return null;
        return data;
    },

    async getProdutosByRemessaId(userId: string, remessaId: string): Promise<Produto[]> {
        const { data, error } = await supabase
            .from('produtos')
            .select('*')
            .eq('user_id', userId)
            .eq('remessa_id', remessaId)
            .order('tipo')
            .order('sabor');
        if (error) throw error;
        return data ?? [];
    },

    async update(userId: string, id: string, updates: Partial<Pick<Remessa, 'data' | 'observacao' | 'ativa'>>): Promise<void> {
        const { error } = await supabase
            .from('remessas')
            .update(updates)
            .eq('user_id', userId)
            .eq('id', id);
        if (error) throw error;
    },

    async toggleAtiva(userId: string, id: string): Promise<boolean> {
        const remessa = await this.getById(userId, id);
        if (!remessa) throw new Error('Remessa não encontrada');

        const novoStatus = !remessa.ativa;
        await this.update(userId, id, { ativa: novoStatus });
        return novoStatus;
    },

    async updateProduto(userId: string, id: string, updates: Partial<Produto>): Promise<void> {
        const { error } = await supabase
            .from('produtos')
            .update({
                tipo: updates.tipo,
                sabor: updates.sabor,
                quantidade_inicial: updates.quantidade_inicial,
                custo_producao: updates.custo_producao,
                preco_base: updates.preco_base,
                preco_promocao: updates.preco_promocao ?? null,
                quantidade_promocao: updates.quantidade_promocao ?? null,
            })
            .eq('user_id', userId)
            .eq('id', id);
        if (error) throw error;
    },

    async addProduto(userId: string, remessaId: string, produto: ProdutoParaRemessa): Promise<void> {
        const precos = await resolverPrecosProduto(userId, produto);
        const { error } = await supabase.from('produtos').insert({
            user_id: userId,
            remessa_id: remessaId,
            produto_config_id: precos.produto_config_id,
            tipo: produto.tipo,
            sabor: produto.sabor,
            quantidade_inicial: produto.quantidade_inicial,
            quantidade_vendida: 0,
            custo_producao: precos.custo_producao,
            preco_base: precos.preco_base,
            preco_promocao: precos.preco_promocao,
            quantidade_promocao: precos.quantidade_promocao,
        });
        if (error) throw error;
    },

    async deleteProduto(userId: string, id: string): Promise<void> {
        const { data: vendas } = await supabase
            .from('itens_venda')
            .select('id')
            .eq('produto_id', id)
            .limit(1);

        if (vendas && vendas.length > 0) {
            throw new Error('Não é possível excluir produto com vendas associadas');
        }

        const { error } = await supabase
            .from('produtos')
            .delete()
            .eq('user_id', userId)
            .eq('id', id);
        if (error) throw error;
    },

    async delete(userId: string, id: string): Promise<void> {
        const { error } = await supabase
            .from('remessas')
            .delete()
            .eq('user_id', userId)
            .eq('id', id);
        if (error) throw error;
    },
};
