import { db } from '@/database/db';
import { Venda } from '../types/Venda';
import { ClienteService } from './clienteService';
import { VendaService } from './vendaService';

export const SyncService = {
    async syncClienteFromVenda(venda: Venda): Promise<void> {
        if (!venda.cliente) return;

        // Buscar todas as vendas do cliente
        const vendasCliente = await db.getAllAsync<{ id: number; total_preco: number; status: string; data: string }>(
            `SELECT id, total_preco, status, data FROM vendas WHERE cliente = ? ORDER BY data DESC`,
            [venda.cliente]
        );

        if (vendasCliente.length === 0) return;

        // Calcular métricas
        const totalComprado = vendasCliente.reduce((sum, v) => sum + v.total_preco, 0);
        const totalDevido = vendasCliente
            .filter(v => v.status === 'PENDENTE')
            .reduce((sum, v) => sum + v.total_preco, 0);

        const numeroCompras = vendasCliente.length;
        const ultimaCompra = vendasCliente[0].data; // Já ordenado por data DESC
        const primeiraCompra = vendasCliente[vendasCliente.length - 1].data;

        // Determinar status
        let status: 'devedor' | 'em_dia' = 'em_dia';
        if (totalDevido > 0) {
            status = 'devedor';
        }

        // Buscar ou criar cliente
        let cliente = await ClienteService.getByNome(venda.cliente);
        if (!cliente) {
            cliente = await ClienteService.create({
                nome: venda.cliente,
                dataCadastro: primeiraCompra
            });
        }

        // Atualizar cliente
        await ClienteService.update(cliente.id, {
            totalComprado,
            totalDevido,
            numeroCompras,
            ultimaCompra,
            status
        });

        // Atualizar lista de vendas
        const vendasIds = vendasCliente.map(v => v.id);
        await db.runAsync(
            `UPDATE clientes SET vendas = ? WHERE id = ?`,
            [JSON.stringify(vendasIds), cliente.id]
        );
    },

    async syncAllClientes(): Promise<void> {
        // Buscar todos os clientes únicos das vendas
        const vendas = await VendaService.getVendasRecentes(10000);
        const nomesClientes = [...new Set(vendas.map(v => v.cliente).filter(Boolean))];

        for (const nomeCliente of nomesClientes) {
            if (nomeCliente) {
                // Simular uma venda para acionar a sincronização
                const vendasCliente = vendas.filter(v => v.cliente === nomeCliente);
                if (vendasCliente.length > 0) {
                    await this.syncClienteFromVenda(vendasCliente[0]);
                }
            }
        }
    }
};