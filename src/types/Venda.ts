export interface ItemVenda {
    id: number;
    venda_id: number;
    produto_id: number;
    produto_tipo?: string;
    produto_sabor?: string;
    quantidade: number;
    preco_base: number;
    preco_desconto?: number;
    subtotal: number;
}

export interface ItemVendaForm {
    produto_id: string;
    quantidade: string;
    preco_base: string;
    preco_desconto?: string;
    subtotal: string;
    quantidade_com_desconto?: string;
    quantidade_sem_desconto?: string;
}

export interface Venda {
    id: number;
    cliente: string;
    data: string; // ISO string
    status: 'OK' | 'PENDENTE';
    metodo_pagamento?: string;
    total_preco: number;
    itens: ItemVenda[];
    created_at?: string;
}

export interface VendaCreateParams {
    cliente: string;
    data: string;
    status: 'OK' | 'PENDENTE';
    metodo_pagamento?: string;
    itens: Omit<ItemVenda, 'id' | 'venda_id'>[];
}

export interface VendaUpdateParams {
    cliente?: string;
    data?: string;
    status?: 'OK' | 'PENDENTE';
    metodo_pagamento?: string;
    itens?: Omit<ItemVenda, 'id' | 'venda_id'>[];
}