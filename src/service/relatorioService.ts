import { db } from '@/database/db';
import { RelatorioParams, RelatorioResponse } from '@/types/Relatorio';

export const RelatorioService = {
    async gerarRelatorio(params: RelatorioParams): Promise<RelatorioResponse> {
        const { periodo, data_inicio, data_fim } = params;
        
        let dataInicio: string;
        let dataFim: string;
        
        if (data_inicio && data_fim) {
            dataInicio = data_inicio;
            dataFim = data_fim;
        } else {
            const hoje = new Date();
            const hojeStr = hoje.toISOString().split('T')[0];
            
            switch (periodo) {
                case 'dia':
                    dataInicio = hojeStr;
                    dataFim = hojeStr;
                    break;
                case 'semana':
                    const inicioSemana = new Date(hoje);
                    inicioSemana.setDate(hoje.getDate() - 7);
                    dataInicio = inicioSemana.toISOString().split('T')[0];
                    dataFim = hojeStr;
                    break;
                case 'mes':
                    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
                    dataInicio = inicioMes.toISOString().split('T')[0];
                    dataFim = hojeStr;
                    break;
                default:
                    dataInicio = hojeStr;
                    dataFim = hojeStr;
            }
        }
        
        // Total vendido (status OK)
        const totalVendidoResult = await db.getFirstAsync<{ total: number }>(
            `SELECT SUM(v.total_preco) as total 
             FROM vendas v
             WHERE DATE(v.data) BETWEEN ? AND ? AND v.status = 'OK'`,
            [dataInicio, dataFim]
        );
        
        // Total pendente
        const totalPendenteResult = await db.getFirstAsync<{ total: number }>(
            `SELECT SUM(v.total_preco) as total 
             FROM vendas v
             WHERE DATE(v.data) BETWEEN ? AND ? AND v.status = 'PENDENTE'`,
            [dataInicio, dataFim]
        );
        
        // Quantidade vendida
        const quantidadeVendidaResult = await db.getFirstAsync<{ total: number }>(
            `SELECT SUM(iv.quantidade) as total 
             FROM vendas v
             INNER JOIN itens_venda iv ON v.id = iv.venda_id
             WHERE DATE(v.data) BETWEEN ? AND ?`,
            [dataInicio, dataFim]
        );
        
        // Custo total dos produtos vendidos
        const custoTotalResult = await db.getFirstAsync<{ total: number }>(
            `SELECT SUM(p.custo_producao * iv.quantidade) as total 
             FROM vendas v
             INNER JOIN itens_venda iv ON v.id = iv.venda_id
             INNER JOIN produtos p ON iv.produto_id = p.id
             WHERE DATE(v.data) BETWEEN ? AND ?`,
            [dataInicio, dataFim]
        );
        
        // Produtos mais vendidos
        const produtosMaisVendidos = await db.getAllAsync<{
            produto: string;
            quantidade: number;
            valor_total: number;
        }>(
            `SELECT p.tipo || ' - ' || p.sabor as produto,
                    SUM(iv.quantidade) as quantidade,
                    SUM(iv.subtotal) as valor_total
             FROM vendas v
             INNER JOIN itens_venda iv ON v.id = iv.venda_id
             INNER JOIN produtos p ON iv.produto_id = p.id
             WHERE DATE(v.data) BETWEEN ? AND ?
             GROUP BY p.tipo, p.sabor
             ORDER BY quantidade DESC
             LIMIT 5`,
            [dataInicio, dataFim]
        );
        
        const totalVendido = totalVendidoResult?.total || 0;
        const totalPendente = totalPendenteResult?.total || 0;
        const quantidadeVendida = quantidadeVendidaResult?.total || 0;
        const custoTotal = custoTotalResult?.total || 0;
        const totalLucro = totalVendido - custoTotal;
        
        return {
            total_vendido: totalVendido,
            total_pendente: totalPendente,
            total_lucro: totalLucro,
            quantidade_vendida: quantidadeVendida,
            produtos_mais_vendidos: produtosMaisVendidos
        };
    }
};