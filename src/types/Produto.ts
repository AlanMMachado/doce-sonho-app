export interface Produto {
    id: number;
    remessa_id: number;
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
    remessa_id: number;
    tipo: string;
    sabor: string;
    quantidade_inicial: number;
    custo_producao?: number;
    preco_base: number;
    preco_promocao?: number;
    quantidade_promocao?: number;
}

// Para produtos criados dentro de uma remessa (sem remessa_id)
export interface ProdutoParaRemessa {
    tipo: string;
    sabor: string;
    quantidade_inicial: number;
    custo_producao?: number;
    preco_base: number;
    preco_promocao?: number;
    quantidade_promocao?: number;
    produto_config_id?: number;
}