import { Produto, ProdutoParaRemessa } from './Produto';

export interface ProdutoRemessaForm {
    id?: string;
    produtoConfigId: string;
    tipo: string;
    tipo_customizado?: string;
    sabor: string;
    quantidade_inicial: string;
    preco_base: number;
    preco_promocao?: number;
    quantidade_promocao?: number;
}

export interface Remessa {
    id: string;
    data: string;
    observacao?: string;
    ativa: boolean;
    created_at?: string;
    produtos?: Produto[];
}

export interface RemessaCreateParams {
    data: string;
    observacao?: string;
    produtos: ProdutoParaRemessa[];
}
