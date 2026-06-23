import { supabase } from '@/lib/supabase';
import { RelatorioParams, RelatorioResponse } from '@/types/Relatorio';

function calcularIntervalo(params: RelatorioParams): { dataInicio: string; dataFim: string } {
    if (params.data_inicio && params.data_fim) {
        return { dataInicio: params.data_inicio, dataFim: params.data_fim };
    }

    const hoje = new Date();
    const hojeStr = hoje.toISOString().split('T')[0];

    switch (params.periodo) {
        case 'dia':
            return { dataInicio: hojeStr, dataFim: hojeStr };
        case 'semana': {
            const inicio = new Date(hoje);
            inicio.setDate(hoje.getDate() - 7);
            return { dataInicio: inicio.toISOString().split('T')[0], dataFim: hojeStr };
        }
        case 'mes': {
            const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
            return { dataInicio: inicio.toISOString().split('T')[0], dataFim: hojeStr };
        }
        default:
            return { dataInicio: hojeStr, dataFim: hojeStr };
    }
}

export const RelatorioService = {
    async gerarRelatorio(userId: string, params: RelatorioParams): Promise<RelatorioResponse> {
        const { dataInicio, dataFim } = calcularIntervalo(params);

        // Buscar todas as vendas do período com itens e produto
        const { data: vendas, error } = await supabase
            .from('vendas')
            .select('total_preco, status, itens:itens_venda(quantidade, subtotal, produto_tipo, produto_sabor, produto_id, produto:produtos(custo_producao))')
            .eq('user_id', userId)
            .gte('data', dataInicio)
            .lte('data', dataFim);

        if (error) throw error;

        let total_vendido = 0;
        let total_pendente = 0;
        let quantidade_vendida = 0;
        let custo_total = 0;
        const produtoMap: Record<string, { quantidade: number; valor_total: number }> = {};

        for (const venda of vendas ?? []) {
            if (venda.status === 'OK') total_vendido += venda.total_preco ?? 0;
            if (venda.status === 'PENDENTE') total_pendente += venda.total_preco ?? 0;

            for (const item of (venda.itens as any[]) ?? []) {
                quantidade_vendida += item.quantidade ?? 0;
                custo_total += ((item.produto as any)?.custo_producao ?? 0) * (item.quantidade ?? 0);

                const nomeProduto = `${item.produto_tipo ?? '?'} - ${item.produto_sabor ?? '?'}`;
                if (!produtoMap[nomeProduto]) produtoMap[nomeProduto] = { quantidade: 0, valor_total: 0 };
                produtoMap[nomeProduto].quantidade += item.quantidade ?? 0;
                produtoMap[nomeProduto].valor_total += item.subtotal ?? 0;
            }
        }

        const produtos_mais_vendidos = Object.entries(produtoMap)
            .map(([produto, v]) => ({ produto, ...v }))
            .sort((a, b) => b.quantidade - a.quantidade)
            .slice(0, 5);

        return {
            total_vendido,
            total_pendente,
            total_lucro: total_vendido - custo_total,
            quantidade_vendida,
            produtos_mais_vendidos,
        };
    },
};
