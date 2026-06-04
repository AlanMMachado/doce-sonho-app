import { Produto, ProdutoParaRemessa } from './Produto';

export interface ProdutoRemessaForm {
    id?: number;
    produtoConfigId: number;
    tipo: string;
    tipo_customizado?: string;
    sabor: string;
    quantidade_inicial: string;
    preco_base: number;
    preco_promocao?: number;
    quantidade_promocao?: number;
}

export interface Remessa {
    id: number;
    data: string;
    observacao?: string;
    ativa: number; // 1 = ativa, 0 = inativa
    created_at?: string;
    produtos?: Produto[];
}

export interface RemessaCreateParams {
    data: string;
    observacao?: string;
    produtos: ProdutoParaRemessa[];
}
