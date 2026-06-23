export interface Cliente {
    id: string;
    nome: string;
    total_comprado: number;
    total_devido: number;
    numero_compras: number;
    ultima_compra: string;
    status: 'devedor' | 'em_dia';
    data_cadastro: string;
    created_at: string;
    updated_at: string;
}

export interface ClienteCreateParams {
    nome: string;
    data_cadastro?: string;
}

export interface ClienteUpdateParams {
    nome?: string;
}
