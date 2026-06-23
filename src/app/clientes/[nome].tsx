import ConfirmationModal from '@/components/ConfirmationModal';
import Header from '@/components/Header';
import VendaCard from '@/components/VendaCard';
import { COLORS } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useScreenData } from '@/hooks/useScreenData';
import { ClienteService } from '@/service/clienteService';
import { VendaService } from '@/service/vendaService';
import { Cliente } from '@/types/Cliente';
import { Venda } from '@/types/Venda';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Clock, DollarSign, ShoppingCart, XCircle } from 'lucide-react-native';
import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

type ClienteComVendas = Cliente & {
  vendas: Venda[];
  vendasPagas: Venda[];
  vendasPendentes: Venda[];
  primeiraCompra: string;
};

export default function ClienteDetalhesScreen() {
  const { user } = useAuth();
  const { nome } = useLocalSearchParams<{ nome: string }>();
  const router = useRouter();
  const [cliente, setCliente] = useState<ClienteComVendas | null>(null);
  const [modalPagamentoVisible, setModalPagamentoVisible] = useState(false);
  const [vendaParaMarcar, setVendaParaMarcar] = useState<Venda | null>(null);

  const carregarCliente = async () => {
    try {
      const nomeCliente = decodeURIComponent(nome);

      const clienteData = await ClienteService.getByNome(user!.id, nomeCliente);

      if (!clienteData) {
        router.back();
        return;
      }

      const vendasCliente = await VendaService.getByClienteId(user!.id, clienteData.id);

      const vendasPagas = vendasCliente.filter(v => v.status === 'OK');
      const vendasPendentes = vendasCliente.filter(v => v.status === 'PENDENTE');

      const primeiraCompra = vendasCliente.length > 0 ?
        vendasCliente.reduce((maisAntiga, atual) =>
          new Date(atual.data) < new Date(maisAntiga.data) ? atual : maisAntiga
        ).data : clienteData.data_cadastro;

      setCliente({
        ...clienteData,
        vendas: vendasCliente,
        vendasPagas,
        vendasPendentes,
        primeiraCompra
      });

    } catch (error) {
      console.error('Erro ao carregar cliente:', error);
      router.back();
    }
  };

  const { loading, refreshing, onRefresh } = useScreenData(carregarCliente, [nome]);

  const marcarComoPago = async (venda: Venda) => {
    try {
      await VendaService.updateStatus(user!.id, venda.id, 'OK');
      await carregarCliente();
      setModalPagamentoVisible(false);
      setVendaParaMarcar(null);
    } catch (error) {
      console.error('Erro ao marcar venda como paga:', error);
      alert('Erro ao registrar pagamento. Tente novamente.');
    }
  };

  const getProdutoNome = (produtoId: string | null, item?: { produto_tipo?: string; produto_sabor?: string }) => {
    if (item?.produto_tipo && item?.produto_sabor) return `${item.produto_tipo} ${item.produto_sabor}`;
    return 'Produto removido';
  };

  const calcularDiasDesdeUltimaCompra = () => {
    if (!cliente?.ultima_compra) return 0;
    const hoje = new Date();
    const ultima = new Date(cliente.ultima_compra);
    return Math.floor((hoje.getTime() - ultima.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (!cliente) {
    return (
      <View style={styles.container}>
        <Header title="Cliente" subtitle="Carregando..." />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Cliente não encontrado</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Histórico de compras"
        subtitle={`${cliente.numero_compras} compra${cliente.numero_compras !== 1 ? 's' : ''}`}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.mediumBlue} />
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.content}>

            {/* Status do Cliente */}
            <View style={styles.statusCard}>
              <View style={styles.statusHeader}>
                <View>
                  <Text style={styles.clienteNome}>{cliente.nome}</Text>
                  <Text style={styles.statusSubtitle}>
                    {cliente.status === 'devedor' ? 'Possui pendências de pagamento' :
                     'Cliente em dia com pagamentos'}
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  cliente.status === 'devedor' && styles.statusDevedor,
                  cliente.status === 'em_dia' && styles.statusEmDia
                ]}>
                  <Text style={[
                    styles.statusBadgeText,
                    cliente.status === 'devedor' && styles.statusTextDevedor,
                    cliente.status === 'em_dia' && styles.statusTextEmDia
                  ]}>
                    {cliente.status === 'devedor' ? 'DEVEDOR' :
                     cliente.status === 'em_dia' ? 'EM DIA' : 'EM DIA'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Métricas Principais */}
            <View style={styles.metricasContainer}>
              <View style={styles.metricasRow}>
                <View style={styles.metricaCard}>
                  <ShoppingCart size={20} color="#059669" />
                  <Text style={styles.metricaValor}>{cliente.numero_compras}</Text>
                  <Text style={styles.metricaLabel}>Total de Compras</Text>
                </View>

                <View style={styles.metricaCard}>
                  <Clock size={20} color="#ea580c" />
                  <Text style={styles.metricaValor}>{calcularDiasDesdeUltimaCompra()}</Text>
                  <Text style={styles.metricaLabel}>Dias Última Compra</Text>
                </View>
              </View>

              <View style={styles.metricaCardFull}>
                <DollarSign size={20} color="#2563eb" />
                <Text style={styles.metricaValor}>R$ {(cliente.total_comprado || 0).toFixed(2)}</Text>
                <Text style={styles.metricaLabel}>Total Comprado</Text>
              </View>
            </View>

            {/* Valor Devido (se houver) */}
            {cliente.total_devido > 0 && (
              <View style={styles.dividaCard}>
                <View style={styles.dividaHeader}>
                  <XCircle size={20} color="#dc2626" />
                  <Text style={styles.dividaTitle}>Valor em Aberto</Text>
                </View>
                <Text style={styles.dividaValor}>R$ {(cliente.total_devido || 0).toFixed(2)}</Text>
                <Text style={styles.dividaSubtext}>
                  {cliente.vendasPendentes.length} venda{cliente.vendasPendentes.length !== 1 ? 's' : ''} pendente{cliente.vendasPendentes.length !== 1 ? 's' : ''}
                </Text>
              </View>
            )}

            {/* Histórico de Compras */}
            <View style={styles.historicoSection}>
              <Text style={styles.sectionTitle}>Histórico de Compras</Text>

              {cliente.vendas.map((venda) => (
                <VendaCard
                  key={venda.id}
                  venda={venda}
                  getProdutoNome={getProdutoNome}
                  showDate={true}
                  onMarcarPago={(v) => {
                    setVendaParaMarcar(v);
                    setModalPagamentoVisible(true);
                  }}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* Modal de Confirmação de Pagamento */}
      <ConfirmationModal
        visible={modalPagamentoVisible}
        title="Confirmar Pagamento"
        message={`Marcar a venda de R$ ${(vendaParaMarcar?.total_preco || 0).toFixed(2)} como paga?`}
        onConfirm={() => vendaParaMarcar && marcarComoPago(vendaParaMarcar)}
        onCancel={() => {
          setModalPagamentoVisible(false);
          setVendaParaMarcar(null);
        }}
        confirmText="Confirmar"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.softGray,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textMedium,
  },
  statusCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    padding: 20,
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  clienteNome: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  statusSubtitle: {
    fontSize: 13,
    color: COLORS.textMedium,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusDevedor: {
    backgroundColor: COLORS.error,
  },
  statusEmDia: {
    backgroundColor: COLORS.green,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  statusTextDevedor: {},
  statusTextEmDia: {},
  metricasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricasContainer: {
    marginBottom: 16,
  },
  metricasRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metricaCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    padding: 16,
    alignItems: 'center',
  },
  metricaCardFull: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    padding: 16,
    alignItems: 'center',
  },
  metricaValor: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginTop: 8,
    marginBottom: 4,
  },
  metricaLabel: {
    fontSize: 12,
    color: COLORS.textMedium,
    fontWeight: '600',
    textAlign: 'center',
  },
  dividaCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.error,
    padding: 10,
    marginBottom: 16,
  },
  dividaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dividaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.error,
    marginLeft: 8,
  },
  dividaValor: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.error,
    marginBottom: 4,
  },
  dividaSubtext: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  historicoSection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    padding: 20,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 16,
  },
});
