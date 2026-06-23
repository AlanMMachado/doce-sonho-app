export interface Configuracao {
    id: string;
    chave: string;
    valor: string;
    tipo: 'string' | 'float' | 'integer';
    created_at?: string;
}

export interface ConfiguracaoResponse {
    chave: string;
    valor: any;
    tipo: 'string' | 'float' | 'integer';
}
