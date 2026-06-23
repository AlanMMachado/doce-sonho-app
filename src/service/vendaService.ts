import { supabase } from '@/lib/supabase';
import { Produto } from '../types/Produto';
import { ItemVenda, ItemVendaForm, Venda, VendaCreateParams, VendaUpdateParams } from '../types/Venda';
import { ClienteService } from './clienteService';

export const calcularSubtotalComLotes = (
    quantidade: number,
    preco_base: number,
    preco_promocao: number | null | undefined,
    quantidade_promocao: number | null | undefined
): number => {
    if (!preco_promocao || !quantidade_promocao || quantidade < quantidade_promocao) {
        return quantidade * preco_base;
    }

    const numLotesPromocao = Math.floor(quantidade / quantidade_promocao);
    const itensComPrecoPromocao = numLotesPromocao * quantidade_promocao;
    const unidadesRestantes = quantidade % quantidade_promocao;

    return itensComPrecoPromocao * preco_promocao + unidadesRestantes * preco_base;
};

export const verificarPromocaoAplicada = (
    item: ItemVendaForm,
    todosItens: ItemVendaForm[],
    produtos: Produto[]
): boolean => {
    if (!item.produto_id) return false;
    const produto = produtos.find(p => p.id === item.produto_id);
    if (!produto || !produto.preco_promocao || !produto.quantidade_promocao) return false;

    const quantidadeTotalTipo = todosItens.reduce((total, itemAtual) => {
        if (itemAtual.produto_id && itemAtual.quantidade) {
            const itemProduto = produtos.find(p => p.id === itemAtual.produto_id);
            if (itemProduto && itemProduto.tipo === produto.tipo) {
                return total + parseInt(itemAtual.quantidade);
            }
        }
        return total;
    }, 0);

    return quantidadeTotalTipo >= produto.quantidade_promocao;
};

export const recalcularTodosPrecos = (itensParaRecalcular: ItemVendaForm[], produtos: Produto[]): ItemVendaForm[] => {
    const itensComProduto = itensParaRecalcular.map((item, index) => {
        const produto = produtos.find(p => p.id === item.produto_id);
        return { item, index, produto };
    });

    const porTipo: { [tipo: string]: typeof itensComProduto } = {};
    for (const entry of itensComProduto) {
        if (!entry.produto) continue;
        const tipo = entry.produto.tipo;
        if (!porTipo[tipo]) porTipo[tipo] = [];
        porTipo[tipo].push(entry);
    }

    const resultado = [...itensParaRecalcular];

    for (const tipo in porTipo) {
        const grupo = porTipo[tipo];
        const exemploProduto = grupo[0].produto!;

        const quantidadeTotal = grupo.reduce((sum, entry) => sum + (parseInt(entry.item.quantidade) || 0), 0);

        if (!exemploProduto.preco_promocao || !exemploProduto.quantidade_promocao) {
            for (const entry of grupo) {
                const quantidade = parseInt(entry.item.quantidade) || 0;
                resultado[entry.index] = {
                    ...resultado[entry.index],
                    preco_base: exemploProduto.preco_base.toString(),
                    preco_promocao: undefined,
                    subtotal: (quantidade * exemploProduto.preco_base).toFixed(2),
                    quantidade_com_desconto: '0',
                    quantidade_sem_desconto: quantidade.toString(),
                };
            }
            continue;
        }

        const numLotes = Math.floor(quantidadeTotal / exemploProduto.quantidade_promocao);
        const unidadesComDesconto = numLotes * exemploProduto.quantidade_promocao;
        let remainingDesconto = unidadesComDesconto;

        for (const entry of grupo) {
            const quantidade = parseInt(entry.item.quantidade) || 0;
            const qtdComDesconto = Math.min(quantidade, remainingDesconto);
            const qtdSemDesconto = quantidade - qtdComDesconto;

            resultado[entry.index] = {
                ...resultado[entry.index],
                preco_base: exemploProduto.preco_base.toString(),
                preco_promocao: exemploProduto.preco_promocao.toString(),
                subtotal: (qtdComDesconto * exemploProduto.preco_promocao + qtdSemDesconto * exemploProduto.preco_base).toFixed(2),
                quantidade_com_desconto: qtdComDesconto.toString(),
                quantidade_sem_desconto: qtdSemDesconto.toString(),
            };

            remainingDesconto -= qtdComDesconto;
        }
    }

    return resultado;
};

export const VendaService = {
    async create(userId: string, venda: VendaCreateParams): Promise<Venda> {
        // Garantir que o cliente existe (upsert por nome)
        const cliente = await ClienteService.upsertByNome(userId, venda.cliente_nome);

        const total_preco = venda.itens.reduce((sum, item) => sum + item.subtotal, 0);

        const { data: novaVenda, error } = await supabase
            .from('vendas')
            .insert({
                user_id: userId,
                cliente_id: cliente.id,
                cliente_nome: venda.cliente_nome,
                data: venda.data,
                status: venda.status,
                metodo_pagamento: venda.metodo_pagamento ?? null,
                total_preco,
            })
            .select()
            .single();
        if (error) throw error;

        const itensParaInserir = venda.itens.map(item => ({
            user_id: userId,
            venda_id: novaVenda.id,
            produto_id: item.produto_id ?? null,
            produto_tipo: item.produto_tipo ?? null,
            produto_sabor: item.produto_sabor ?? null,
            quantidade: item.quantidade,
            preco_base: item.preco_base,
            preco_promocao: item.preco_promocao ?? null,
            subtotal: item.subtotal,
        }));

        const { data: itens, error: erroItens } = await supabase
            .from('itens_venda')
            .insert(itensParaInserir)
            .select();
        if (erroItens) throw erroItens;

        return { ...novaVenda, itens: itens ?? [] };
    },

    async getById(userId: string, id: string): Promise<Venda | null> {
        const { data, error } = await supabase
            .from('vendas')
            .select('*, itens:itens_venda(*)')
            .eq('user_id', userId)
            .eq('id', id)
            .single();
        if (error) return null;
        return data ? { ...data, itens: data.itens as ItemVenda[] } : null;
    },

    async updateStatus(userId: string, id: string, status: 'OK' | 'PENDENTE'): Promise<void> {
        const { error } = await supabase
            .from('vendas')
            .update({ status })
            .eq('user_id', userId)
            .eq('id', id);
        if (error) throw error;
    },

    async update(userId: string, id: string, venda: VendaUpdateParams): Promise<void> {
        const camposVenda: Record<string, any> = {};
        if (venda.cliente_nome !== undefined) camposVenda.cliente_nome = venda.cliente_nome;
        if (venda.data !== undefined) camposVenda.data = venda.data;
        if (venda.status !== undefined) camposVenda.status = venda.status;
        if (venda.metodo_pagamento !== undefined) camposVenda.metodo_pagamento = venda.metodo_pagamento;

        if (venda.itens !== undefined) {
            const total_preco = venda.itens.reduce((sum, item) => sum + item.subtotal, 0);
            camposVenda.total_preco = total_preco;

            // Substituir itens
            const { error: erroDelete } = await supabase
                .from('itens_venda')
                .delete()
                .eq('venda_id', id);
            if (erroDelete) throw erroDelete;

            const itensParaInserir = venda.itens.map(item => ({
                user_id: userId,
                venda_id: id,
                produto_id: item.produto_id ?? null,
                produto_tipo: item.produto_tipo ?? null,
                produto_sabor: item.produto_sabor ?? null,
                quantidade: item.quantidade,
                preco_base: item.preco_base,
                preco_promocao: item.preco_promocao ?? null,
                subtotal: item.subtotal,
            }));

            const { error: erroInsert } = await supabase.from('itens_venda').insert(itensParaInserir);
            if (erroInsert) throw erroInsert;
        }

        if (Object.keys(camposVenda).length > 0) {
            const { error } = await supabase
                .from('vendas')
                .update(camposVenda)
                .eq('user_id', userId)
                .eq('id', id);
            if (error) throw error;
        }
    },

    async getByPeriodo(userId: string, inicio: string, fim: string): Promise<Venda[]> {
        const { data, error } = await supabase
            .from('vendas')
            .select('*, itens:itens_venda(*)')
            .eq('user_id', userId)
            .gte('data', inicio)
            .lte('data', fim)
            .order('data', { ascending: false });
        if (error) throw error;
        return (data ?? []).map(v => ({ ...v, itens: v.itens as ItemVenda[] }));
    },

    async getVendasRecentes(userId: string, limit: number = 10): Promise<Venda[]> {
        const { data, error } = await supabase
            .from('vendas')
            .select('*, itens:itens_venda(*)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return (data ?? []).map(v => ({ ...v, itens: v.itens as ItemVenda[] }));
    },

    async getTotalVendidoPorPeriodo(userId: string, inicio: string, fim: string): Promise<number> {
        const { data } = await supabase
            .from('vendas')
            .select('total_preco')
            .eq('user_id', userId)
            .eq('status', 'OK')
            .gte('data', inicio)
            .lte('data', fim);
        return (data ?? []).reduce((s, v) => s + (v.total_preco ?? 0), 0);
    },

    async getTotalPendentePorPeriodo(userId: string, inicio: string, fim: string): Promise<number> {
        const { data } = await supabase
            .from('vendas')
            .select('total_preco')
            .eq('user_id', userId)
            .eq('status', 'PENDENTE')
            .gte('data', inicio)
            .lte('data', fim);
        return (data ?? []).reduce((s, v) => s + (v.total_preco ?? 0), 0);
    },

    async delete(userId: string, id: string): Promise<void> {
        const { error } = await supabase
            .from('vendas')
            .delete()
            .eq('user_id', userId)
            .eq('id', id);
        if (error) throw error;
    },

    async getByClienteId(userId: string, clienteId: string): Promise<Venda[]> {
        const { data, error } = await supabase
            .from('vendas')
            .select('*, itens:itens_venda(*)')
            .eq('user_id', userId)
            .eq('cliente_id', clienteId)
            .order('data', { ascending: false });
        if (error) throw error;
        return (data ?? []).map(v => ({ ...v, itens: v.itens as ItemVenda[] }));
    },

    async getByProduto(userId: string, produtoId: string): Promise<Venda[]> {
        const { data } = await supabase
            .from('itens_venda')
            .select('venda_id')
            .eq('produto_id', produtoId);

        if (!data || data.length === 0) return [];

        const vendaIds = [...new Set(data.map(r => r.venda_id))];
        const { data: vendas, error } = await supabase
            .from('vendas')
            .select('*, itens:itens_venda(*)')
            .eq('user_id', userId)
            .in('id', vendaIds)
            .order('data', { ascending: false });
        if (error) throw error;
        return (vendas ?? []).map(v => ({ ...v, itens: v.itens as ItemVenda[] }));
    },
};
