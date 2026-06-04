import { db } from '@/database/db';
import { Produto, ProdutoParaRemessa } from '../types/Produto';
import { Remessa, RemessaCreateParams } from '../types/Remessa';
import { ProdutoConfigService } from './produtoConfigService';

export const RemessaService = {
    async create(remessa: RemessaCreateParams): Promise<Remessa> {
        const result = await db.runAsync(
            `INSERT INTO remessas (data, observacao) VALUES (?, ?)`,
            [remessa.data, remessa.observacao || null]
        );
        
        const remessaId = result.lastInsertRowId as number;
        
        // Criar produtos da remessa
        for (const produto of remessa.produtos) {
            const custoPadrao = produto.tipo === 'trufa' ? 2.50 : 5.00;
            let precoBase = produto.preco_base || 0;
            let precoPromocao: number | null = produto.preco_promocao || null;
            let quantidadePromocao: number | null = produto.quantidade_promocao || null;
            let produtoConfigId: number | null = null;

            // Se não foi definido preço base, buscar da configuração
            if (!produto.preco_base || produto.preco_base <= 0) {
                try {
                    const config = await ProdutoConfigService.getByTipo(produto.tipo);
                    if (config) {
                        precoBase = config.preco_base;
                        precoPromocao = config.preco_promocao || null;
                        quantidadePromocao = config.quantidade_promocao || null;
                        produtoConfigId = config.id;
                    } else {
                        // Usar valores padrão como fallback
                        if (produto.tipo === 'trufa') {
                            precoBase = 5.00;
                            precoPromocao = 4.50;
                            quantidadePromocao = 3;
                        } else if (produto.tipo === 'surpresa') {
                            precoBase = 12.00;
                        } else if (produto.tipo === 'torta') {
                            precoBase = 12.00;
                            precoPromocao = 10.00;
                            quantidadePromocao = 2;
                        }
                    }
                } catch (error) {
                    console.error('Erro ao buscar configuração de produto:', error);
                    // Usar valores padrão como fallback
                    if (produto.tipo === 'trufa') {
                        precoBase = 5.00;
                        precoPromocao = 4.50;
                        quantidadePromocao = 3;
                    } else if (produto.tipo === 'surpresa') {
                        precoBase = 12.00;
                    } else if (produto.tipo === 'torta') {
                        precoBase = 12.00;
                        precoPromocao = 10.00;
                        quantidadePromocao = 2;
                    }
                }
            }

            await db.runAsync(
                `INSERT INTO produtos (remessa_id, produto_config_id, tipo, sabor, quantidade_inicial, custo_producao, preco_base, preco_promocao, quantidade_promocao) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [remessaId, produtoConfigId, produto.tipo, produto.sabor, produto.quantidade_inicial, custoPadrao, precoBase, precoPromocao, quantidadePromocao]
            );
        }
        
        return {
            id: remessaId,
            data: remessa.data,
            observacao: remessa.observacao,
            ativa: 1,
            created_at: new Date().toISOString()
        };
    },

    async getAll(): Promise<Remessa[]> {
        const remessas = await db.getAllAsync<Remessa>(`SELECT * FROM remessas ORDER BY id DESC`);
        
        for (const remessa of remessas) {
            const produtos = await db.getAllAsync<Produto>(
                `SELECT * FROM produtos WHERE remessa_id = ?`,
                [remessa.id]
            );
            remessa.produtos = produtos;
        }
        
        return remessas;
    },

    async getAtivas(): Promise<Remessa[]> {
        return await db.getAllAsync<Remessa>(
            `SELECT DISTINCT r.* FROM remessas r
             INNER JOIN produtos p ON r.id = p.remessa_id
             WHERE r.ativa = 1 AND (p.quantidade_inicial - p.quantidade_vendida) > 0
             ORDER BY r.id DESC`
        );
    },

    async getById(id: number): Promise<Remessa | null> {
        const remessa = await db.getFirstAsync<Remessa>(
            `SELECT * FROM remessas WHERE id = ?`,
            [id]
        );
        
        if (remessa) {
            const produtos = await db.getAllAsync<Produto>(
                `SELECT * FROM produtos WHERE remessa_id = ?`,
                [id]
            );
            remessa.produtos = produtos;
        }
        
        return remessa;
    },

    async getProdutosByRemessaId(remessaId: number): Promise<Produto[]> {
        return await db.getAllAsync<Produto>(
            `SELECT * FROM produtos WHERE remessa_id = ? ORDER BY tipo, sabor`,
            [remessaId]
        );
    },

    async update(id: number, remessa: Partial<Remessa>): Promise<void> {
        const updates: string[] = [];
        const values: any[] = [];

        if (remessa.data !== undefined) {
            updates.push('data = ?');
            values.push(remessa.data);
        }
        if (remessa.observacao !== undefined) {
            updates.push('observacao = ?');
            values.push(remessa.observacao);
        }
        if (remessa.ativa !== undefined) {
            updates.push('ativa = ?');
            values.push(remessa.ativa);
        }

        if (updates.length === 0) return;

        const query = `UPDATE remessas SET ${updates.join(', ')} WHERE id = ?`;
        values.push(id);

        await db.runAsync(query, values);
    },

    async toggleAtiva(id: number): Promise<boolean> {
        const remessa = await this.getById(id);
        if (!remessa) throw new Error('Remessa não encontrada');
        
        const novoStatus = remessa.ativa === 1 ? 0 : 1;
        await db.runAsync(`UPDATE remessas SET ativa = ? WHERE id = ?`, [novoStatus, id]);
        return novoStatus === 1;
    },

    async updateProduto(id: number, updates: Partial<Produto>): Promise<void> {
        await db.runAsync(
            `UPDATE produtos SET tipo = ?, sabor = ?, quantidade_inicial = ?, custo_producao = ?, preco_base = ?, preco_promocao = ?, quantidade_promocao = ? WHERE id = ?`,
            [updates.tipo || '', updates.sabor || '', updates.quantidade_inicial || 0, updates.custo_producao || 0, updates.preco_base || 0, updates.preco_promocao || null, updates.quantidade_promocao || null, id]
        );
    },

    async addProduto(remessaId: number, produto: ProdutoParaRemessa): Promise<void> {
        const custoPadrao = produto.tipo === 'trufa' ? 2.50 : 5.00;
        let precoBase = produto.preco_base || 0;
        let precoPromocao = produto.preco_promocao || null;
        let quantidadePromocao = produto.quantidade_promocao || null;
        let produtoConfigId: number | null = produto.produto_config_id || null;

        if (!produto.preco_base) {
            try {
                const config = await ProdutoConfigService.getByTipo(produto.tipo);
                if (config) {
                    precoBase = config.preco_base;
                    precoPromocao = config.preco_promocao || null;
                    quantidadePromocao = config.quantidade_promocao || null;
                    produtoConfigId = config.id;
                } else {
                    // Usar valores padrão como fallback
                    if (produto.tipo === 'trufa') {
                        precoBase = 5.00;
                        precoPromocao = 4.50;
                        quantidadePromocao = 3;
                    } else if (produto.tipo === 'surpresa') {
                        precoBase = 12.00;
                    } else if (produto.tipo === 'torta') {
                        precoBase = 12.00;
                        precoPromocao = 10.00;
                        quantidadePromocao = 2;
                    }
                }
            } catch (error) {
                console.error('Erro ao buscar configuração de produto:', error);
                // Usar valores padrão como fallback
                if (produto.tipo === 'trufa') {
                    precoBase = 5.00;
                    precoPromocao = 4.50;
                    quantidadePromocao = 3;
                } else if (produto.tipo === 'surpresa') {
                    precoBase = 12.00;
                } else if (produto.tipo === 'torta') {
                    precoBase = 12.00;
                    precoPromocao = 10.00;
                    quantidadePromocao = 2;
                }
            }
        }

        await db.runAsync(
            `INSERT INTO produtos (remessa_id, produto_config_id, tipo, sabor, quantidade_inicial, custo_producao, preco_base, preco_promocao, quantidade_promocao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [remessaId, produtoConfigId, produto.tipo, produto.sabor, produto.quantidade_inicial, custoPadrao, precoBase, precoPromocao, quantidadePromocao]
        );
    },

    async deleteProduto(id: number): Promise<void> {
        const vendas = await db.getAllAsync(`SELECT v.id FROM vendas v INNER JOIN itens_venda iv ON v.id = iv.venda_id WHERE iv.produto_id = ?`, [id]);
        if (vendas.length > 0) {
            throw new Error('Não é possível excluir produto com vendas associadas');
        }
        await db.runAsync(`DELETE FROM produtos WHERE id = ?`, [id]);
    },

    async delete(id: number): Promise<void> {
        // Deletar produtos da remessa (itens_venda.produto_id será setado para NULL via ON DELETE SET NULL)
        await db.runAsync(`DELETE FROM produtos WHERE remessa_id = ?`, [id]);

        // Deletar a remessa
        await db.runAsync(`DELETE FROM remessas WHERE id = ?`, [id]);
    }
};
