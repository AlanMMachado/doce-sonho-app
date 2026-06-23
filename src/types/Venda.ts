export interface ItemVenda {
    id: string;
    venda_id: string;
    produto_id: string | null;
    produto_tipo?: string;
    produto_sabor?: string;
    quantidade: number;
    preco_base: number;
    preco_promocao?: number;
    subtotal: number;
}

export interface ItemVendaForm {
    produto_id: string;
    quantidade: string;
    preco_base: string;
    preco_promocao?: string;
    subtotal: string;
    quantidade_com_desconto?: string;
    quantidade_sem_desconto?: string;
}

export interface Venda {
    id: string;
    cliente_id: string;
    cliente_nome: string;
    data: string; // ISO string
    status: 'OK' | 'PENDENTE';
    metodo_pagamento?: string;
    total_preco: number;
    itens: ItemVenda[];
    created_at?: string;
}

export interface VendaCreateParams {
    cliente_nome: string;
    data: string;
    status: 'OK' | 'PENDENTE';
    metodo_pagamento?: string;
    itens: Omit<ItemVenda, 'id' | 'venda_id'>[];
}

export interface VendaUpdateParams {
    cliente_nome?: string;
    data?: string;
    status?: 'OK' | 'PENDENTE';
    metodo_pagamento?: string;
    itens?: Omit<ItemVenda, 'id' | 'venda_id'>[];
}
