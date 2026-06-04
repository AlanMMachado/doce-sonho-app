export interface Configuracao {
    id: number;
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