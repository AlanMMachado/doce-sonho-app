export interface RelatorioParams {
    periodo: 'dia' | 'semana' | 'mes';
    data_inicio?: string;
    data_fim?: string;
}

export interface RelatorioResponse {
    total_vendido: number;
    total_pendente: number;
    total_lucro: number;
    quantidade_vendida: number;
    produtos_mais_vendidos: Array<{
        produto: string;
        quantidade: number;
        valor_total: number;
    }>;
}