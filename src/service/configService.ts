import { db } from '@/database/db';
import { Configuracao } from '@/types/Configuracao';

export class ConfigService {
    static async create(config: Omit<Configuracao, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
        const result = await db.runAsync(
            `INSERT INTO configuracoes (chave, valor, tipo, created_at, updated_at)
             VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
            [config.chave, config.valor, config.tipo]
        );
        return result.lastInsertRowId as number;
    }

    static async getByChave(chave: string): Promise<Configuracao | null> {
        const result = await db.getFirstAsync<Configuracao>(
            `SELECT * FROM configuracoes WHERE chave = ?`,
            [chave]
        );
        return result || null;
    }

    static async getAll(): Promise<Configuracao[]> {
        const result = await db.getAllAsync<Configuracao>(
            `SELECT * FROM configuracoes ORDER BY chave`
        );
        return result;
    }

    static async update(chave: string, valor: string): Promise<void> {
        await db.runAsync(
            `UPDATE configuracoes SET valor = ?, updated_at = datetime('now') WHERE chave = ?`,
            [valor, chave]
        );
    }

    static async delete(chave: string): Promise<void> {
        await db.runAsync(
            `DELETE FROM configuracoes WHERE chave = ?`,
            [chave]
        );
    }

    static async getValor(chave: string, valorPadrao: any = null): Promise<any> {
        const config = await this.getByChave(chave);
        if (!config) return valorPadrao;

        switch (config.tipo) {
            case 'integer':
                return parseInt(config.valor);
            case 'float':
                return parseFloat(config.valor);
            case 'string':
            default:
                return config.valor;
        }
    }

    static async setValor(chave: string, valor: any, tipo: 'string' | 'float' | 'integer' = 'string'): Promise<void> {
        const valorString = valor.toString();
        const configExistente = await this.getByChave(chave);

        if (configExistente) {
            await this.update(chave, valorString);
        } else {
            await this.create({
                chave,
                valor: valorString,
                tipo
            });
        }
    }

    static async getAllAsRecord(): Promise<Record<string, any>> {
        const configs = await this.getAll();
        const result: Record<string, any> = {};

        for (const config of configs) {
            switch (config.tipo) {
                case 'integer':
                    result[config.chave] = parseInt(config.valor);
                    break;
                case 'float':
                    result[config.chave] = parseFloat(config.valor);
                    break;
                case 'string':
                default:
                    result[config.chave] = config.valor;
                    break;
            }
        }

        return result;
    }

    static async inicializarConfiguracoesPadrao(): Promise<void> {
        const configuracoesPadrao = [
            { chave: 'meta_diaria_valor', valor: '200.00', tipo: 'float' as const },
            { chave: 'custo_padrao_trufa', valor: '2.50', tipo: 'float' as const },
            { chave: 'custo_padrao_sobremesa', valor: '5.00', tipo: 'float' as const },
        ];

        for (const config of configuracoesPadrao) {
            const existente = await this.getByChave(config.chave);
            if (!existente) {
                await this.create(config);
            }
        }
    }
}