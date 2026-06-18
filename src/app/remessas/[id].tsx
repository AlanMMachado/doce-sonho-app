import ConfirmationModal from '@/components/ConfirmationModal';
import Header from '@/components/Header';
import VendaCard from '@/components/VendaCard';
import { COLORS } from '@/constants/Colors';
import { ClienteService } from '@/service/clienteService';
import { RemessaService } from '@/service/remessaService';
import { VendaService } from '@/service/vendaService';
import { Remessa } from '@/types/Remessa';
import { Venda } from '@/types/Venda';
import { useScreenData } from '@/hooks/useScreenData';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Edit, Trash2, XCircle } from 'lucide-react-native';
import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

export default function DetalhesRemessaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [remessa, setRemessa] = useState<Remessa | null>(null);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteVendaModalVisible, setDeleteVendaModalVisible] = useState(false);
  const [vendaToDelete, setVendaToDelete] = useState<Venda | null>(null);
  const [itemsShown, setItemsShown] = useState(10);

  const carregarDetalhes = async () => {
    try {
      const remessaData = await RemessaService.getById(parseInt(id));
      setRemessa(remessaData);
      
      if (remessaData?.produtos) {
        const vendasMap = new Map<number, Venda>();
        for (const produto of remessaData.produtos) {
          const vendasProduto = await VendaService.getByProduto(produto.id);
          for (const venda of vendasProduto) {
            vendasMap.set(venda.id, venda);
          }
        }
        const todasVendas = Array.from(vendasMap.values());
        setVendas(todasVendas.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()));
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
    }
  };

  const { loading, refreshing, onRefresh } = useScreenData(carregarDetalhes, [id]);

  const handleDelete = async () => {
    try {
      await RemessaService.delete(parseInt(id));
      router.back();
    } catch (error) {
      console.error('Erro ao excluir remessa:', error);
      // You could show an alert here
    } finally {
      setDeleteModalVisible(false);
    }
  };

  const handleDeleteVenda = async () => {
    if (!vendaToDelete) return;

    try {
      const nomeCliente = vendaToDelete.cliente;
      
      await VendaService.delete(vendaToDelete.id);
      
      // Recalcular totais do cliente após deletar venda
      if (nomeCliente) {
        const cliente = await ClienteService.getByNome(nomeCliente);
        if (cliente) {
          await ClienteService.recalcularTotais(cliente.id);
        }
      }
      
      // Recarregar dados
      await carregarDetalhes();
    } catch (error) {
      console.error('Erro ao excluir venda:', error);
      alert('Erro ao excluir venda. Tente novamente.');
    } finally {
      setDeleteVendaModalVisible(false);
      setVendaToDelete(null);
    }
  };

  if (!remessa) {
    return (
      <View style={styles.container}>
        <Header 
          title="Detalhes da Remessa" 
          subtitle="Carregando..."
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Remessa não encontrada</Text>
        </View>
      </View>
    );
  }

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'null' || dateString === '') {
      return 'Data não informada';
    }
    try {
      return format(new Date(dateString), "dd 'de' MMMM, yyyy", { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString || dateString === 'null' || dateString === '') {
      return 'Data não informada';
    }
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  const getTotalVendido = () => {
    if (!remessa.produtos) return 0;
    return remessa.produtos.reduce((total, produto) => total + produto.quantidade_vendida, 0);
  };

  const getTotalInicial = () => {
    if (!remessa.produtos) return 0;
    return remessa.produtos.reduce((total, produto) => total + produto.quantidade_inicial, 0);
  };

  const getValorTotalVendido = () => {
    return vendas
      .filter(venda => venda.status === 'OK')
      .reduce((total, venda) => total + venda.total_preco, 0);
  };

  const getValorPendente = () => {
    return vendas
      .filter(venda => venda.status === 'PENDENTE')
      .reduce((total, venda) => total + venda.total_preco, 0);
  };

  const getProdutoById = (produtoId: number) => {
    return remessa?.produtos?.find(p => p.id === produtoId);
  };

  const getProdutoNome = (produtoId: number, item?: { produto_tipo?: string; produto_sabor?: string }) => {
    const produto = getProdutoById(produtoId);
    if (produto) return `${produto.tipo} ${produto.sabor}`;
    if (item?.produto_tipo && item?.produto_sabor) return `${item.produto_tipo} ${item.produto_sabor}`;
    return 'Produto removido';
  };

  return (
    <View style={styles.container}>
      <Header 
        title="Detalhes da Remessa" 
        subtitle={formatDate(remessa.data)}
        actions={
          <>
            <TouchableOpacity style={styles.editCardButton} onPress={() => router.push(`/remessas/editar?id=${id}`)}>
              <Edit size={20} color="#2563eb" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteCardButton} onPress={() => setDeleteModalVisible(true)}>
              <Trash2 size={20} color="#dc2626" />
            </TouchableOpacity>
          </>
        }
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.mediumBlue} />
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.content}>

        {/* KPIs */}
        <View style={styles.kpisGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Total Inicial</Text>
            <Text style={styles.kpiValue}>{getTotalInicial()}</Text>
            <Text style={styles.kpiSubtext}>unidades</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Vendido</Text>
            <Text style={styles.kpiValue}>{getTotalVendido()}</Text>
            <Text style={styles.kpiSubtext}>unidades</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Disponível</Text>
            <Text style={styles.kpiValue}>{getTotalInicial() - getTotalVendido()}</Text>
            <Text style={styles.kpiSubtext}>unidades</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Faturamento</Text>
            <Text style={styles.kpiValue}>R$ {getValorTotalVendido().toFixed(0)}</Text>
            <Text style={styles.kpiSubtext}>recebido</Text>
          </View>
        </View>

        {/* Valor Pendente (se houver) */}
        {getValorPendente() > 0 && (
          <View style={styles.dividaCard}>
            <View style={styles.dividaHeader}>
              <XCircle size={20} color="#dc2626" />
              <Text style={styles.dividaTitle}>Valor Pendente</Text>
            </View>
            <Text style={styles.dividaValor}>R$ {getValorPendente().toFixed(2)}</Text>
            <Text style={styles.dividaSubtext}>
              {vendas.filter(v => v.status === 'PENDENTE').length} venda{vendas.filter(v => v.status === 'PENDENTE').length !== 1 ? 's' : ''} pendente{vendas.filter(v => v.status === 'PENDENTE').length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Produtos */}
        <View style={styles.produtosSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Produtos</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{remessa.produtos?.length || 0}</Text>
            </View>
          </View>

          {remessa.produtos?.map((produto) => (
            <View key={produto.id} style={styles.produtoItem}>
              <View style={styles.produtoHeader}>
                <View style={styles.produtoInfo}>
                  <Text style={styles.produtoNome}>
                    {produto.tipo} - {produto.sabor}
                  </Text>
                  <Text style={styles.produtoCusto}>
                    Custo: R$ {produto.custo_producao.toFixed(2)}
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  produto.quantidade_inicial === produto.quantidade_vendida
                    ? styles.statusBadgeEsgotado
                    : styles.statusBadgeDisponivel
                ]}>
                  <Text style={[
                    styles.statusText,
                    produto.quantidade_inicial === produto.quantidade_vendida
                      ? styles.statusTextEsgotado
                      : styles.statusTextDisponivel
                  ]}>
                    {produto.quantidade_inicial === produto.quantidade_vendida
                      ? 'Esgotado'
                      : `${produto.quantidade_inicial - produto.quantidade_vendida} disponíveis`
                    }
                  </Text>
                </View>
              </View>

              <View style={styles.produtoProgress}>
                <View style={styles.progressInfo}>
                  <Text style={styles.progressText}>
                    {produto.quantidade_vendida}/{produto.quantidade_inicial}
                  </Text>
                  <Text style={styles.progressPercentage}>
                    {((produto.quantidade_vendida / produto.quantidade_inicial) * 100).toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.progressContainer}>
                  <View 
                    style={[
                      styles.progressFill,
                      { width: `${(produto.quantidade_vendida / produto.quantidade_inicial) * 100}%` }
                    ]}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Vendas */}
        {vendas.length > 0 && (
          <View style={styles.vendasSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Vendas</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{vendas.length}</Text>
              </View>
            </View>

            {/* Lista de Vendas */}
            {vendas.slice(0, itemsShown).map((venda) => (
              <VendaCard
                key={venda.id}
                venda={venda}
                getProdutoNome={getProdutoNome}
                showDate={true}
                showActions={true}
                onEdit={(v) => router.push(`/vendas/editar?id=${v.id}`)}
                onDelete={(v) => {
                  setVendaToDelete(v);
                  setDeleteVendaModalVisible(true);
                }}
              />
            ))}
            
            {itemsShown < vendas.length && (
              <TouchableOpacity 
                style={styles.carregarMaisButton}
                onPress={() => setItemsShown(itemsShown + 10)}
              >
                <Text style={styles.carregarMaisText}>
                  Carregar + ({itemsShown} de {vendas.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Botão Nova Venda */}
                <TouchableOpacity 
          style={styles.novaVendaButton}
                  onPress={() => router.push('/vendas/nova')}
        >
          <Text style={styles.novaVendaText}>+ Registrar Nova Venda</Text>
        </TouchableOpacity>
        </View>
      </ScrollView>
      )}
      
      <ConfirmationModal
        visible={deleteModalVisible}
        title="Excluir Remessa"
        message="Tem certeza que deseja excluir esta remessa? Os produtos serão removidos, mas o histórico de vendas será preservado."
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalVisible(false)}
        confirmText="Excluir"
      />

      <ConfirmationModal
        visible={deleteVendaModalVisible}
        title="Excluir Venda"
        message={`Tem certeza que deseja excluir a venda de ${vendaToDelete?.cliente}? Esta ação não pode ser desfeita.`}
        onConfirm={handleDeleteVenda}
        onCancel={() => {
          setDeleteVendaModalVisible(false);
          setVendaToDelete(null);
        }}
        confirmText="Excluir"
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
  headerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 8,
  },
  headerObservacao: {
    fontSize: 14,
    color: COLORS.textMedium,
    textAlign: 'center',
  },
  kpisGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    padding: 16,
  },
  kpiLabel: {
    fontSize: 12,
    color: COLORS.textMedium,
    fontWeight: '600',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  kpiSubtext: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  produtosSection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    padding: 20,
    marginBottom: 16,
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
    borderColor: COLORS.mediumBlue,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.mediumBlue,
  },
  produtoItem: {
    padding: 16,
    backgroundColor: COLORS.softGray,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    marginBottom: 12,
  },
  produtoHeader: {
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  produtoInfo: {
    flex: 1,
  },
  produtoNome: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  produtoCusto: {
    fontSize: 12,
    color: COLORS.textMedium,
  },
  produtoProgress: {
    marginBottom: 12,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  progressPercentage: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  progressContainer: {
    height: 8,
    backgroundColor: COLORS.borderGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.mediumBlue,
    borderRadius: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    flexShrink: 1,
  },
  statusBadgeDisponivel: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
  },
  statusBadgeEsgotado: {
    backgroundColor: '#fee2e2',
    borderColor: '#dc2626',
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  statusTextDisponivel: {
    color: '#16a34a',
  },
  statusTextEsgotado: {
    color: '#dc2626',
  },
  vendasSection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    padding: 20,
    marginBottom: 16,
    gap: 8,
  },

  maisVendas: {
    textAlign: 'center',
    color: COLORS.textLight,
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  carregarMaisButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.mediumBlue,
    alignItems: 'center',
  },
  carregarMaisText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.mediumBlue,
  },
  novaVendaButton: {
    backgroundColor: COLORS.mediumBlue,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  novaVendaText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  editButton: {
    backgroundColor: COLORS.softGray,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.mediumBlue,
  },
  editButtonText: {
    color: COLORS.mediumBlue,
    fontSize: 14,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: COLORS.softGray,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  deleteButtonText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: 'bold',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editCardButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.softGray,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.mediumBlue,
  },
  deleteCardButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.softGray,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.error,
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
});