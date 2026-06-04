import { db } from '@/database/db';
import { ProdutoConfig, ProdutoConfigCreateParams } from '@/types/ProdutoConfig';

export class ProdutoConfigService {
    static async create(produtoConfig: ProdutoConfigCreateParams): Promise<number> {
        const result = await db.runAsync(
            `INSERT INTO produto_config (tipo, tipo_customizado, preco_base, preco_promocao, quantidade_promocao, ativo, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
            [
                produtoConfig.tipo,
                produtoConfig.tipo_customizado || null,
                produtoConfig.preco_base,
                produtoConfig.preco_promocao || null,
                produtoConfig.quantidade_promocao || null
            ]
        );
        return result.lastInsertRowId as number;
    }

    static async getAll(): Promise<ProdutoConfig[]> {
        const result = await db.getAllAsync<ProdutoConfig>(
            `SELECT * FROM produto_config WHERE ativo = 1 ORDER BY tipo, tipo_customizado`
        );
        return result;
    }

    static async getById(id: number): Promise<ProdutoConfig | null> {
        const result = await db.getFirstAsync<ProdutoConfig>(
            `SELECT * FROM produto_config WHERE id = ? AND ativo = 1`,
            [id]
        );
        return result || null;
    }

    static async update(id: number, produtoConfig: Partial<ProdutoConfigCreateParams>): Promise<void> {
        const fields = [];
        const values = [];

        if (produtoConfig.tipo !== undefined) {
            fields.push('tipo = ?');
            values.push(produtoConfig.tipo);
        }
        if (produtoConfig.tipo_customizado !== undefined) {
            fields.push('tipo_customizado = ?');
            values.push(produtoConfig.tipo_customizado);
        }
        if (produtoConfig.preco_base !== undefined) {
            fields.push('preco_base = ?');
            values.push(produtoConfig.preco_base);
        }
        if (produtoConfig.preco_promocao !== undefined) {
            fields.push('preco_promocao = ?');
            values.push(produtoConfig.preco_promocao);
        }
        if (produtoConfig.quantidade_promocao !== undefined) {
            fields.push('quantidade_promocao = ?');
            values.push(produtoConfig.quantidade_promocao);
        }

        if (fields.length > 0) {
            fields.push('updated_at = datetime(\'now\')');
            values.push(id);

            await db.runAsync(
                `UPDATE produto_config SET ${fields.join(', ')} WHERE id = ?`,
                values
            );
        }
    }

    static async delete(id: number): Promise<void> {
        await db.runAsync(
            `UPDATE produto_config SET ativo = 0, updated_at = datetime('now') WHERE id = ?`,
            [id]
        );
    }

    static async getByTipo(tipo: string, tipoCustomizado?: string): Promise<ProdutoConfig | null> {
        const result = await db.getFirstAsync<ProdutoConfig>(
            `SELECT * FROM produto_config
             WHERE tipo = ? AND (tipo_customizado = ? OR (tipo_customizado IS NULL AND ? IS NULL)) AND ativo = 1`,
            [tipo, tipoCustomizado || null, tipoCustomizado || null]
        );
        return result || null;
    }
}