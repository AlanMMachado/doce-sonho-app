export interface Produto {
    id: string;
    remessa_id: string;
    produto_config_id?: string;
    tipo: string;
    sabor: string;
    quantidade_inicial: number;
    quantidade_vendida: number;
    custo_producao: number;
    preco_base: number;
    preco_promocao?: number;
    quantidade_promocao?: number;
    created_at?: string;
}

export interface ProdutoCreateParams {
    remessa_id: string;
    tipo: string;
    sabor: string;
    quantidade_inicial: number;
    custo_producao?: number;
    preco_base: number;
    preco_promocao?: number;
    quantidade_promocao?: number;
    produto_config_id?: string;
}

export interface ProdutoParaRemessa {
    tipo: string;
    sabor: string;
    quantidade_inicial: number;
    custo_producao?: number;
    preco_base: number;
    preco_promocao?: number;
    quantidade_promocao?: number;
    produto_config_id?: string;
}
