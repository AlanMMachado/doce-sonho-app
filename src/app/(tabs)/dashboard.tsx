import Header from '@/components/Header';
import VendaCard from '@/components/VendaCard';
import { COLORS } from '@/constants/Colors';
import { useApp } from '@/contexts/AppContext';
import { ProdutoService } from '@/service/produtoService';
import { RelatorioService } from '@/service/relatorioService';
import { VendaService } from '@/service/vendaService';
import { Produto } from '@/types/Produto';
import { useScreenData } from '@/hooks/useScreenData';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

export default function DashboardScreen() {
  const { state, dispatch, recarregarConfiguracoes } = useApp();
  const router = useRouter();
  const [produtos, setProdutos] = useState<{[key: number]: Produto}>({});
  const [kpis, setKpis] = useState({
    totalVendido: 0,
    totalPendente: 0,
    progressoPago: 0,
    progressoTotal: 0
  });
  const [metaDiariaValor, setMetaDiariaValor] = useState(200);

  const carregarDados = async () => {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      
      const vendasRecentes = await VendaService.getVendasRecentes(10);
      dispatch({ type: 'SET_VENDAS', payload: vendasRecentes });
      
      // Buscar produtos para exibir nomes nas vendas
      const produtoIds = [...new Set(vendasRecentes.flatMap(v => v.itens.map(item => item.produto_id)))];
      const produtosMap: {[key: number]: Produto} = {};
      for (const id of produtoIds) {
        const produto = await ProdutoService.getById(id);
        if (produto) {
          produtosMap[id] = produto;
        }
      }
      setProdutos(produtosMap);
      
      // Recarregar configurações mais recentes do banco
      await recarregarConfiguracoes();
      
      const relatorio = await RelatorioService.gerarRelatorio({ 
        periodo: 'dia',
        data_inicio: hoje,
        data_fim: hoje
      });
      
      const metaValor = state.configuracoes.meta_diaria_valor || 200;
      setMetaDiariaValor(metaValor);
      const totalGeral = relatorio.total_vendido + relatorio.total_pendente;
      
      setKpis({
        totalVendido: relatorio.total_vendido,
        totalPendente: relatorio.total_pendente,
        progressoPago: Math.min((relatorio.total_vendido / metaValor) * 100, 100),
        progressoTotal: Math.min((totalGeral / metaValor) * 100, 100)
      });
      
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    }
  };

  const { loading, refreshing, onRefresh } = useScreenData(carregarDados);

  // Garantir que o estado produtos seja usado
  const getProdutoNome = (produtoId: number, item?: { produto_tipo?: string; produto_sabor?: string }) => {
    const produto = produtos[produtoId];
    if (produto) return `${produto.tipo} ${produto.sabor}`;
    if (item?.produto_tipo && item?.produto_sabor) return `${item.produto_tipo} ${item.produto_sabor}`;
    return 'Produto removido';
  };

  return (
    <View style={styles.container}>
      <Header 
        title="Dashboard" 
        subtitle={format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
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
        {/* KPIs */}
        <View style={styles.kpiContainer}>
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconContainer}>
              <Text style={styles.kpiIcon}>💰</Text>
            </View>
            <Text style={styles.kpiLabel}>Total Vendido</Text>
            <Text style={styles.kpiValue}>R$ {kpis.totalVendido.toFixed(2)}</Text>
            <Text style={styles.kpiSubtext}>
              {state.vendas.filter(v => v.status === 'OK').length} vendas
            </Text>
          </View>
          
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconContainer}>
              <Text style={styles.kpiIcon}>⏱️</Text>
            </View>
            <Text style={styles.kpiLabel}>Pendente</Text>
            <Text style={styles.kpiValue}>R$ {kpis.totalPendente.toFixed(2)}</Text>
            <Text style={styles.kpiSubtext}>
              {state.vendas.filter(v => v.status === 'PENDENTE').length} vendas
            </Text>
          </View>
        </View>

        {/* Meta Diária */}
        <View style={styles.metaCard}>
          <View style={styles.metaHeader}>
            <Text style={styles.metaTitle}>Meta Diária</Text>
            <Text style={styles.metaPercentage}>{kpis.progressoTotal.toFixed(0)}%</Text>
          </View>
          
          <View style={styles.progressContainer}>
            {/* Barra de vendas pendentes (atrás) */}
            <View style={[styles.progressFillPendente, { width: `${kpis.progressoTotal}%` }]} />
            {/* Barra de vendas pagas (frente) */}
            <View style={[styles.progressFillPago, { width: `${kpis.progressoPago}%` }]} />
          </View>
          
          <View style={styles.metaFooter}>
            <Text style={[styles.metaText, styles.metaTextPago]}>Pago: R$ {kpis.totalVendido.toFixed(2)}</Text>
            <Text style={[styles.metaText, styles.metaTextPendente]}>Pendente: R$ {kpis.totalPendente.toFixed(2)}</Text>
            <Text style={styles.metaText}>Total: R$ {(kpis.totalVendido + kpis.totalPendente).toFixed(2)} de R$ {metaDiariaValor.toFixed(2)}</Text>
          </View>
        </View>

        {/* Vendas Recentes */}
        <View style={styles.vendasSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Vendas Recentes</Text>
            {state.vendas.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{state.vendas.length}</Text>
              </View>
            )}
          </View>

          {state.vendas.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📝</Text>
              <Text style={styles.emptyText}>Nenhuma venda hoje</Text>
              <Text style={styles.emptySubtext}>Registre sua primeira venda</Text>
            </View>
          ) : (
            <View style={styles.vendasList}>
              {state.vendas.map((venda) => (
                <VendaCard
                  key={venda.id}
                  venda={venda}
                  getProdutoNome={getProdutoNome}
                  showDate={true}
                />
              ))}
            </View>
          )}
        </View>
        </View>
      </ScrollView>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/vendas/nova')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
  kpiContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    padding: 16,
  },
  kpiIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.softGray,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiIcon: {
    fontSize: 20,
  },
  kpiLabel: {
    fontSize: 12,
    color: COLORS.textMedium,
    fontWeight: '600',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  kpiSubtext: {
    fontSize: 11,
    color: COLORS.textMedium,
  },
  metaCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    padding: 20,
    marginBottom: 16,
  },
  metaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  metaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  metaPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.mediumBlue,
  },
  progressContainer: {
    height: 12,
    backgroundColor: COLORS.borderGray,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFillPago: {
    height: '100%',
    backgroundColor: COLORS.mediumBlue,
    borderRadius: 6,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  progressFillPendente: {
    height: '100%',
    backgroundColor: COLORS.warning,
    borderRadius: 6,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  metaFooter: {
    flexDirection: 'column',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textMedium,
    fontWeight: '500',
  },
  metaTextPago: {
    color: COLORS.mediumBlue,
    fontWeight: '600',
  },
  metaTextPendente: {
    color: COLORS.warning,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.mediumBlue,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 32,
    color: COLORS.white,
    fontWeight: '300',
  },
  vendasSection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  badge: {
    backgroundColor: COLORS.softGray,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.mediumBlue,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textMedium,
  },
  vendasList: {
    gap: 12,
  },
});