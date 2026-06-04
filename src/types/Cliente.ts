export interface Cliente {
  id: number;
  nome: string;
  totalComprado: number;
  totalDevido: number;
  numeroCompras: number;
  ultimaCompra: string;
  status: 'devedor' | 'em_dia';
  dataCadastro: string;
  vendas: number[]; // IDs das vendas
  created_at: string;
  updated_at: string;
}

export interface ClienteCreateParams {
  nome: string;
  dataCadastro?: string;
}

export interface ClienteUpdateParams {
  nome?: string;
  totalComprado?: number;
  totalDevido?: number;
  numeroCompras?: number;
  ultimaCompra?: string;
  status?: 'devedor' | 'em_dia';
}