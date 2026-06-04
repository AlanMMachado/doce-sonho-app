import { db } from '@/database/db';
import { Produto } from '../types/Produto';
import { ItemVenda, ItemVendaForm, Venda, VendaCreateParams, VendaUpdateParams } from '../types/Venda';

export const calcularSubtotalComLotes = (
    quantidade: number,
    preco_base: number,
    preco_promocao: number | null | undefined,
    quantidade_promocao: number | null | undefined
): number => {
    if (!preco_promocao || !quantidade_promocao || quantidade < quantidade_promocao) {
        return quantidade * preco_base;
    }

    const numLotesPromocao = Math.floor(quantidade / quantidade_promocao);
    const itensComPrecoPromocao = numLotesPromocao * quantidade_promocao;
    const unidadesRestantes = quantidade % quantidade_promocao;
    const subtotalPromocional = itensComPrecoPromocao * preco_promocao;
    const subtotalNormal = unidadesRestantes * preco_base;

    return subtotalPromocional + subtotalNormal;
};

export const verificarPromocaoAplicada = (
    item: ItemVendaForm,
    todosItens: ItemVendaForm[],
    produtos: Produto[]
): boolean => {
    if (!item.produto_id) return false;
    const produto = produtos.find(p => p.id.toString() === item.produto_id);
    if (!produto || !produto.preco_promocao || !produto.quantidade_promocao) return false;

    // Calcular quantidade total do tipo
    const quantidadeTotalTipo = todosItens.reduce((total, itemAtual) => {
        if (itemAtual.produto_id && itemAtual.quantidade) {
            const itemProduto = produtos.find(p => p.id.toString() === itemAtual.produto_id);
            if (itemProduto && itemProduto.tipo === produto.tipo) {
                return total + parseInt(itemAtual.quantidade);
            }
        }
        return total;
    }, 0);

    // Verifica se há pelo menos um lote completo
    return quantidadeTotalTipo >= produto.quantidade_promocao;
};

export const recalcularTodosPrecos = (itensParaRecalcular: ItemVendaForm[], produtos: Produto[]): ItemVendaForm[] => {
    // Criar mapa de items com índice e produto
    const itensComProduto = itensParaRecalcular.map((item, index) => {
        const produto = produtos.find(p => p.id.toString() === item.produto_id);
        return { item, index, produto };
    });

    // Agrupar por tipo de produto para calcular promoção globalmente
    const porTipo: { [tipo: string]: typeof itensComProduto } = {};
    
    for (const entry of itensComProduto) {
        if (!entry.produto) continue;
        const tipo = entry.produto.tipo;
        if (!porTipo[tipo]) {
            porTipo[tipo] = [];
        }
        porTipo[tipo].push(entry);
    }

    // Recalcular preços considerando quantidade total por tipo
    const resultado = [...itensParaRecalcular];

    for (const tipo in porTipo) {
        const grupo = porTipo[tipo];
        const exemploProduto = grupo[0].produto!;

        // Calcular quantidade total do tipo
        const quantidadeTotal = grupo.reduce((sum, entry) => {
            return sum + (parseInt(entry.item.quantidade) || 0);
        }, 0);

        if (!exemploProduto.preco_promocao || !exemploProduto.quantidade_promocao) {
            // Sem promoção, aplica preço base normalmente
            for (const entry of grupo) {
                const quantidade = parseInt(entry.item.quantidade) || 0;
                const subtotal = quantidade * exemploProduto.preco_base;

                resultado[entry.index] = {
                    ...resultado[entry.index],
                    preco_base: exemploProduto.preco_base.toString(),
                    preco_desconto: undefined,
                    subtotal: subtotal.toFixed(2),
                    quantidade_com_desconto: '0',
                    quantidade_sem_desconto: quantidade.toString()
                };
            }
            continue;
        }

        // Calcular quantas unidades podem ter desconto (lotes completos)
        const numLotes = Math.floor(quantidadeTotal / exemploProduto.quantidade_promocao);
        const unidadesComDesconto = numLotes * exemploProduto.quantidade_promocao;
        const unidadesSemDesconto = quantidadeTotal - unidadesComDesconto;

        // Distribuir unidades com desconto sequencialmente entre os items
        let remainingDesconto = unidadesComDesconto;

        for (const entry of grupo) {
            const quantidade = parseInt(entry.item.quantidade) || 0;
            const qtdComDesconto = Math.min(quantidade, remainingDesconto);
            const qtdSemDesconto = quantidade - qtdComDesconto;

            const subtotal = (qtdComDesconto * exemploProduto.preco_promocao) + 
                            (qtdSemDesconto * exemploProduto.preco_base);

            resultado[entry.index] = {
                ...resultado[entry.index],
                preco_base: exemploProduto.preco_base.toString(),
                preco_desconto: exemploProduto.preco_promocao.toString(),
                subtotal: subtotal.toFixed(2),
                quantidade_com_desconto: qtdComDesconto.toString(),
                quantidade_sem_desconto: qtdSemDesconto.toString()
            };

            remainingDesconto -= qtdComDesconto;
        }
    }

    return resultado;
};

export const VendaService = {
    async create(venda: VendaCreateParams): Promise<Venda> {
        // Calcula total_preco
        const total_preco = venda.itens.reduce((sum, item) => sum + item.subtotal, 0);

        const result = await db.runAsync(
            `INSERT INTO vendas (cliente, data, status, metodo_pagamento, total_preco)
             VALUES (?, ?, ?, ?, ?)`,
            [
                venda.cliente,
                venda.data,
                venda.status,
                venda.metodo_pagamento || null,
                total_preco
            ]
        );

        const vendaId = result.lastInsertRowId as number;

        // Insere itens
        const itens: ItemVenda[] = [];
        for (const item of venda.itens) {
            const itemResult = await db.runAsync(
                `INSERT INTO itens_venda (venda_id, produto_id, produto_tipo, produto_sabor, quantidade, preco_base, preco_desconto, subtotal)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [vendaId, item.produto_id, item.produto_tipo || null, item.produto_sabor || null, item.quantidade, item.preco_base, item.preco_desconto || null, item.subtotal]
            );
            itens.push({
                id: itemResult.lastInsertRowId as number,
                venda_id: vendaId,
                ...item
            });

            // Atualiza quantidade vendida do produto
            await db.runAsync(
                `UPDATE produtos
                 SET quantidade_vendida = quantidade_vendida + ?
                 WHERE id = ?`,
                [item.quantidade, item.produto_id]
            );
        }

        const novaVenda: Venda = {
            id: vendaId,
            cliente: venda.cliente,
            data: venda.data,
            status: venda.status,
            metodo_pagamento: venda.metodo_pagamento,
            total_preco,
            itens,
            created_at: new Date().toISOString()
        };

        return novaVenda;
    },

    async getById(id: number): Promise<Venda | null> {
        const venda = await db.getFirstAsync<Omit<Venda, 'itens'>>(
            `SELECT * FROM vendas WHERE id = ?`,
            [id]
        );
        if (!venda) return null;

        const itens = await db.getAllAsync<ItemVenda>(
            `SELECT * FROM itens_venda WHERE venda_id = ?`,
            [id]
        );

        return { ...venda, itens };
    },

    async updateStatus(id: number, status: 'OK' | 'PENDENTE'): Promise<void> {
        await db.runAsync(
            `UPDATE vendas SET status = ? WHERE id = ?`,
            [status, id]
        );
    },

    async update(id: number, venda: VendaUpdateParams): Promise<void> {
        const fields = [];
        const values = [];

        if (venda.cliente !== undefined) {
            fields.push('cliente = ?');
            values.push(venda.cliente);
        }
        if (venda.data !== undefined) {
            fields.push('data = ?');
            values.push(venda.data);
        }
        if (venda.status !== undefined) {
            fields.push('status = ?');
            values.push(venda.status);
        }
        if (venda.metodo_pagamento !== undefined) {
            fields.push('metodo_pagamento = ?');
            values.push(venda.metodo_pagamento);
        }

        if (fields.length > 0) {
            values.push(id);
            await db.runAsync(
                `UPDATE vendas SET ${fields.join(', ')} WHERE id = ?`,
                values
            );
        }

        // Se itens foram fornecidos, substituir todos os itens
        if (venda.itens !== undefined) {
            // Primeiro, reverter quantidades vendidas dos itens antigos
            const itensAntigos = await db.getAllAsync<ItemVenda>(
                `SELECT * FROM itens_venda WHERE venda_id = ?`,
                [id]
            );
            for (const item of itensAntigos) {
                await db.runAsync(
                    `UPDATE produtos SET quantidade_vendida = quantidade_vendida - ? WHERE id = ?`,
                    [item.quantidade, item.produto_id]
                );
            }

            // Deletar itens antigos
            await db.runAsync(`DELETE FROM itens_venda WHERE venda_id = ?`, [id]);

            // Inserir novos itens
            const total_preco = venda.itens.reduce((sum, item) => sum + item.subtotal, 0);
            for (const item of venda.itens) {
                await db.runAsync(
                    `INSERT INTO itens_venda (venda_id, produto_id, produto_tipo, produto_sabor, quantidade, preco_base, preco_desconto, subtotal)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [id, item.produto_id, item.produto_tipo || null, item.produto_sabor || null, item.quantidade, item.preco_base, item.preco_desconto || null, item.subtotal]
                );
                await db.runAsync(
                    `UPDATE produtos SET quantidade_vendida = quantidade_vendida + ? WHERE id = ?`,
                    [item.quantidade, item.produto_id]
                );
            }

            // Atualizar total_preco
            await db.runAsync(
                `UPDATE vendas SET total_preco = ? WHERE id = ?`,
                [total_preco, id]
            );
        }
    },

    async getByPeriodo(inicio: string, fim: string): Promise<Venda[]> {
        const vendas = await db.getAllAsync<Omit<Venda, 'itens'>>(
            `SELECT * FROM vendas WHERE DATE(data) BETWEEN ? AND ? ORDER BY data DESC`,
            [inicio, fim]
        );

        const vendasComItens: Venda[] = [];
        for (const venda of vendas) {
            const itens = await db.getAllAsync<ItemVenda>(
                `SELECT * FROM itens_venda WHERE venda_id = ?`,
                [venda.id]
            );
            vendasComItens.push({ ...venda, itens });
        }
        return vendasComItens;
    },

    async getVendasRecentes(limit: number = 10): Promise<Venda[]> {
        const vendas = await db.getAllAsync<Omit<Venda, 'itens'>>(
            `SELECT * FROM vendas ORDER BY created_at DESC LIMIT ?`,
            [limit]
        );

        const vendasComItens: Venda[] = [];
        for (const venda of vendas) {
            const itens = await db.getAllAsync<ItemVenda>(
                `SELECT * FROM itens_venda WHERE venda_id = ?`,
                [venda.id]
            );
            vendasComItens.push({ ...venda, itens });
        }
        return vendasComItens;
    },

    async getTotalVendidoPorPeriodo(inicio: string, fim: string): Promise<number> {
        const result = await db.getFirstAsync<{ total: number }>(
            `SELECT SUM(total_preco) as total FROM vendas WHERE DATE(data) BETWEEN ? AND ? AND status = 'OK'`,
            [inicio, fim]
        );
        return result?.total || 0;
    },

    async getTotalPendentePorPeriodo(inicio: string, fim: string): Promise<number> {
        const result = await db.getFirstAsync<{ total: number }>(
            `SELECT SUM(total_preco) as total FROM vendas WHERE DATE(data) BETWEEN ? AND ? AND status = 'PENDENTE'`,
            [inicio, fim]
        );
        return result?.total || 0;
    },

    async delete(id: number): Promise<void> {
        // Reverter quantidades vendidas
        const itens = await db.getAllAsync<ItemVenda>(
            `SELECT * FROM itens_venda WHERE venda_id = ?`,
            [id]
        );
        for (const item of itens) {
            await db.runAsync(
                `UPDATE produtos SET quantidade_vendida = quantidade_vendida - ? WHERE id = ?`,
                [item.quantidade, item.produto_id]
            );
        }

        // Deletar itens e venda
        await db.runAsync(`DELETE FROM itens_venda WHERE venda_id = ?`, [id]);
        await db.runAsync(`DELETE FROM vendas WHERE id = ?`, [id]);
    },

    // Novo método para buscar vendas por produto (através de itens)
    async getByProduto(produtoId: number): Promise<Venda[]> {
        const vendasIds = await db.getAllAsync<{ venda_id: number }>(
            `SELECT DISTINCT venda_id FROM itens_venda WHERE produto_id = ?`,
            [produtoId]
        );

        const vendas: Venda[] = [];
        for (const { venda_id } of vendasIds) {
            const venda = await this.getById(venda_id);
            if (venda) vendas.push(venda);
        }
        return vendas.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    }
};