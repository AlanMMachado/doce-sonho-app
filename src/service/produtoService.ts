import { db } from '@/database/db';
import { Produto, ProdutoCreateParams } from '../types/Produto';

export const ProdutoService = {
    async create(produto: ProdutoCreateParams): Promise<Produto> {
        const custoPadrao = produto.tipo === 'trufa' ? 2.50 : 5.00;

        const res = await db.runAsync(
            `INSERT INTO produtos 
             (remessa_id, tipo, sabor, quantidade_inicial, quantidade_vendida, custo_producao)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                produto.remessa_id,
                produto.tipo,
                produto.sabor,
                produto.quantidade_inicial,
                0,
                custoPadrao 
            ]
        );

        return {
            id: res.lastInsertRowId,
            quantidade_vendida: 0,
            custo_producao: custoPadrao,
            ...produto
        };
    },

    async getByRemessa(remessaId: number) {
        return await db.getAllAsync<Produto>(
            `SELECT * FROM produtos WHERE remessa_id = ?`,
            [remessaId]
        );
    },

    async getById(id: number) {
        return await db.getFirstAsync<Produto>(
            `SELECT * FROM produtos WHERE id = ?`,
            [id]
        );
    },

    async update(id: number, produto: Partial<Produto>) {
        await db.runAsync(
            `UPDATE produtos
             SET tipo = ?, sabor = ?, quantidade_inicial = ?
             WHERE id = ?`,
            [
                produto.tipo ?? '',
                produto.sabor ?? '',
                produto.quantidade_inicial ?? 0,
                id
            ]
        );
    },

    async delete(id: number) {
        await db.runAsync(`DELETE FROM produtos WHERE id = ?`, [id]);
    }
};
