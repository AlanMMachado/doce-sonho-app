import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('trufas.db');

// Criação das tabelas
export async function initDatabase() {
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS produto_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo TEXT NOT NULL,
            tipo_customizado TEXT,
            preco_base REAL NOT NULL,
            preco_promocao REAL DEFAULT NULL,
            quantidade_promocao INTEGER DEFAULT NULL,
            ativo INTEGER NOT NULL DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS remessas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data TEXT NOT NULL,
            observacao TEXT,
            ativa INTEGER NOT NULL DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            remessa_id INTEGER NOT NULL,
            produto_config_id INTEGER,
            tipo TEXT NOT NULL,
            sabor TEXT NOT NULL,
            quantidade_inicial INTEGER NOT NULL,
            quantidade_vendida INTEGER NOT NULL DEFAULT 0,
            custo_producao REAL NOT NULL DEFAULT 0,
            preco_base REAL NOT NULL DEFAULT 0,
            preco_promocao REAL DEFAULT NULL,
            quantidade_promocao INTEGER DEFAULT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(remessa_id) REFERENCES remessas(id) ON DELETE CASCADE,
            FOREIGN KEY(produto_config_id) REFERENCES produto_config(id)
        );

        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL UNIQUE,
            totalComprado REAL NOT NULL DEFAULT 0,
            totalDevido REAL NOT NULL DEFAULT 0,
            numeroCompras INTEGER NOT NULL DEFAULT 0,
            ultimaCompra TEXT,
            status TEXT NOT NULL DEFAULT 'em_dia' CHECK(status IN ('devedor','em_dia')),
            dataCadastro TEXT NOT NULL,
            vendas TEXT NOT NULL DEFAULT '[]', -- JSON array com IDs das vendas
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS vendas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente TEXT NOT NULL,
            data TEXT NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('OK','PENDENTE')),
            metodo_pagamento TEXT,
            total_preco REAL NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS itens_venda (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venda_id INTEGER NOT NULL,
            produto_id INTEGER,
            produto_tipo TEXT,
            produto_sabor TEXT,
            quantidade INTEGER NOT NULL,
            preco_base REAL NOT NULL,
            preco_desconto REAL DEFAULT NULL,
            subtotal REAL NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(venda_id) REFERENCES vendas(id) ON DELETE CASCADE,
            FOREIGN KEY(produto_id) REFERENCES produtos(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS configuracoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chave TEXT UNIQUE NOT NULL,
            valor TEXT NOT NULL,
            tipo TEXT NOT NULL DEFAULT 'string',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Migrations para bancos existentes
    await migrateDatabase();
}

async function migrateDatabase() {
    // Adicionar coluna 'ativa' na tabela remessas (se não existir)
    try {
        const remessaCols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(remessas)`);
        if (!remessaCols.find(c => c.name === 'ativa')) {
            await db.execAsync(`ALTER TABLE remessas ADD COLUMN ativa INTEGER NOT NULL DEFAULT 1`);
        }
    } catch (e) {
        console.error('Migration remessas.ativa:', e);
    }

    // Adicionar colunas de produto nas itens_venda (se não existirem)
    try {
        const itensCols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(itens_venda)`);
        if (!itensCols.find(c => c.name === 'produto_tipo')) {
            await db.execAsync(`ALTER TABLE itens_venda ADD COLUMN produto_tipo TEXT`);
        }
        if (!itensCols.find(c => c.name === 'produto_sabor')) {
            await db.execAsync(`ALTER TABLE itens_venda ADD COLUMN produto_sabor TEXT`);
        }
    } catch (e) {
        console.error('Migration itens_venda produto info:', e);
    }

    // Preencher produto_tipo e produto_sabor para itens existentes
    try {
        await db.execAsync(`
            UPDATE itens_venda SET 
                produto_tipo = (SELECT p.tipo FROM produtos p WHERE p.id = itens_venda.produto_id),
                produto_sabor = (SELECT p.sabor FROM produtos p WHERE p.id = itens_venda.produto_id)
            WHERE produto_tipo IS NULL AND produto_id IS NOT NULL
        `);
    } catch (e) {
        console.error('Migration backfill itens_venda:', e);
    }
}
