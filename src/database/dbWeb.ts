type Row = Record<string, any>;

let remessas: Row[] = [];
let produtos: Row[] = [];
let vendas: Row[] = [];
let itens_venda: Row[] = [];

let nextId = 1;

export const db = {
  // simula runAsync (INSERT, UPDATE, DELETE)
  async runAsync(query: string, params: any[] = []): Promise<{ lastInsertRowId: number }> {
    if (query.startsWith('INSERT INTO remessas')) {
      const [data, observacao] = params;
      const remessa = { id: nextId++, data, observacao, created_at: new Date().toISOString() };
      remessas.push(remessa);
      return { lastInsertRowId: remessa.id };
    }

    if (query.startsWith('INSERT INTO produtos')) {
      const [remessa_id, tipo, sabor, quantidade_inicial, quantidade_vendida = 0, custo_producao = 0] = params;
      const produto = { id: nextId++, remessa_id, tipo, sabor, quantidade_inicial, quantidade_vendida, custo_producao, created_at: new Date().toISOString() };
      produtos.push(produto);
      return { lastInsertRowId: produto.id };
    }

    if (query.startsWith('INSERT INTO vendas')) {
      const [cliente, data, status, metodo_pagamento, total_preco] = params;
      const venda = { id: nextId++, cliente, data, status, metodo_pagamento, total_preco, created_at: new Date().toISOString() };
      vendas.push(venda);
      return { lastInsertRowId: venda.id };
    }

    if (query.startsWith('INSERT INTO itens_venda')) {
      const [venda_id, produto_id, quantidade, preco_unitario] = params;
      const item = { id: nextId++, venda_id, produto_id, quantidade, preco_unitario, created_at: new Date().toISOString() };
      itens_venda.push(item);

      // atualiza quantidade vendida do produto
      const produto = produtos.find(p => p.id === produto_id);
      if (produto) produto.quantidade_vendida += quantidade;

      return { lastInsertRowId: item.id };
    }

    // UPDATE produtos
    if (query.startsWith('UPDATE produtos SET quantidade_vendida')) {
      const [quantidade_vendida, produto_id] = params;
      const produto = produtos.find(p => p.id === produto_id);
      if (produto) produto.quantidade_vendida = quantidade_vendida;
      return { lastInsertRowId: 0 };
    }

    // DELETE queries
    if (query.startsWith('DELETE FROM vendas')) {
      const [id] = params;
      vendas = vendas.filter(v => v.id !== id);
      return { lastInsertRowId: 0 };
    }

    if (query.startsWith('DELETE FROM produtos WHERE remessa_id')) {
      const [remessa_id] = params;
      produtos = produtos.filter(p => p.remessa_id !== remessa_id);
      return { lastInsertRowId: 0 };
    }

    if (query.startsWith('DELETE FROM remessas')) {
      const [id] = params;
      remessas = remessas.filter(r => r.id !== id);
      return { lastInsertRowId: 0 };
    }

    return { lastInsertRowId: 0 };
  },

  // simula getAllAsync (SELECT *)
  async getAllAsync<T = any>(query: string, params: any[] = []): Promise<T[]> {
    if (query.includes('FROM remessas')) return remessas as any;
    if (query.includes('FROM produtos')) return produtos as any;
    if (query.includes('FROM vendas')) return vendas as any;
    if (query.includes('FROM itens_venda')) return itens_venda as any;

    return [];
  },

  // simula getFirstAsync (SELECT ... LIMIT 1)
  async getFirstAsync<T = any>(query: string, params: any[] = []): Promise<T | null> {
    const all = await db.getAllAsync<T>(query, params);
    return all[0] || null;
  },

  // simula criação de tabela
  async execAsync(query?: string) {
    console.log('dbWeb: execAsync chamado');
  }
};

// Inicializa o banco
export function initDatabase() {
  console.log('dbWeb: banco em memória inicializado');
  remessas = [];
  produtos = [];
  vendas = [];
  itens_venda = [];
  nextId = 1;
}
