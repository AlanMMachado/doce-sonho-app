import Header from '@/components/Header';
import ModernModal from '@/components/ModernModal';
import SaleCard from '@/components/SaleCard';
import SkeletonCard from '@/components/SkeletonCard';
import { COLORS } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useScreenData } from '@/hooks/useScreenData';
import { SaleService } from '@/service/saleService';
import { ShipmentService } from '@/service/shipmentService';
import { Sale } from '@/types/Sale';
import { Shipment } from '@/types/Shipment';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Edit, Trash2, XCircle } from 'lucide-react-native';
import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

export default function ShipmentDetailsScreen() {
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteSaleModalVisible, setDeleteSaleModalVisible] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [itemsShown, setItemsShown] = useState(10);

  const loadDetails = async () => {
    try {
      const shipmentData = await ShipmentService.getById(user!.id, id);
      setShipment(shipmentData);

      if (shipmentData?.products) {
        const salesMap = new Map<string, Sale>();
        for (const product of shipmentData.products) {
          const productSales = await SaleService.getByProduct(user!.id, product.id);
          for (const sale of productSales) {
            salesMap.set(sale.id, sale);
          }
        }
        const allSales = Array.from(salesMap.values());
        setSales(allSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
    }
  };

  const { loading, refreshing, onRefresh } = useScreenData(loadDetails, [id]);

  const handleDelete = async () => {
    try {
      await ShipmentService.delete(user!.id, id);
      router.back();
    } catch (error) {
      console.error('Erro ao excluir remessa:', error);
    } finally {
      setDeleteModalVisible(false);
    }
  };

  const handleDeleteSale = async () => {
    if (!saleToDelete) return;

    try {
      await SaleService.delete(user!.id, saleToDelete.id);
      await loadDetails();
    } catch (error) {
      console.error('Erro ao excluir venda:', error);
      alert('Erro ao excluir venda. Tente novamente.');
    } finally {
      setDeleteSaleModalVisible(false);
      setSaleToDelete(null);
    }
  };


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

  const getTotalSold = () => {
    if (!shipment.products) return 0;
    return shipment.products.reduce((total, product) => total + product.sold_quantity, 0);
  };

  const getTotalInitial = () => {
    if (!shipment.products) return 0;
    return shipment.products.reduce((total, product) => total + product.initial_quantity, 0);
  };

  const getTotalValue = () => {
    return sales
      .filter(sale => sale.status === 'OK')
      .reduce((total, sale) => total + sale.total_price, 0);
  };

  const getPendingValue = () => {
    return sales
      .filter(sale => sale.status === 'PENDENTE')
      .reduce((total, sale) => total + sale.total_price, 0);
  };

  const getProductById = (productId: string | null) => {
    if (!productId) return undefined;
    return shipment?.products?.find(p => p.id === productId);
  };

  const getProductName = (productId: string | null, item?: { product_type?: string; product_flavor?: string }) => {
    const product = getProductById(productId);
    if (product) return `${product.type} ${product.flavor}`;
    if (item?.product_type && item?.product_flavor) return `${item.product_type} ${item.product_flavor}`;
    return 'Produto removido';
  };

  return (
    <View style={styles.container}>
      <Header
        title="Detalhes da Remessa"
        subtitle={loading ? 'Carregando...' : !shipment ? 'Não encontrada' : formatDate(shipment.date)}
        actions={
          !loading && shipment ? (
            <>
              <TouchableOpacity style={styles.editCardButton} onPress={() => router.push(`/shipments/edit?id=${id}`)}>
                <Edit size={20} color="#2563eb" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteCardButton} onPress={() => setDeleteModalVisible(true)}>
                <Trash2 size={20} color="#dc2626" />
              </TouchableOpacity>
            </>
          ) : undefined
        }
      />

      {loading ? (
        <ScrollView style={styles.content} scrollEnabled={false}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
            <SkeletonCard style={{ width: '48%' }} lines={2} />
            <SkeletonCard style={{ width: '48%' }} lines={2} />
            <SkeletonCard style={{ width: '48%' }} lines={2} />
            <SkeletonCard style={{ width: '48%' }} lines={2} />
          </View>
          <SkeletonCard lines={3} hasProgressBar />
          <SkeletonCard lines={3} hasProgressBar />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </ScrollView>
      ) : !shipment ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Remessa não encontrada</Text>
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
            <Text style={styles.kpiValue}>{getTotalInitial()}</Text>
            <Text style={styles.kpiSubtext}>unidades</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Vendido</Text>
            <Text style={styles.kpiValue}>{getTotalSold()}</Text>
            <Text style={styles.kpiSubtext}>unidades</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Disponível</Text>
            <Text style={styles.kpiValue}>{getTotalInitial() - getTotalSold()}</Text>
            <Text style={styles.kpiSubtext}>unidades</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Faturamento</Text>
            <Text style={styles.kpiValue}>R$ {getTotalValue().toFixed(0)}</Text>
            <Text style={styles.kpiSubtext}>recebido</Text>
          </View>
        </View>

        {/* Valor Pendente (se houver) */}
        {getPendingValue() > 0 && (
          <View style={styles.dividaCard}>
            <View style={styles.dividaHeader}>
              <XCircle size={20} color="#dc2626" />
              <Text style={styles.dividaTitle}>Valor Pendente</Text>
            </View>
            <Text style={styles.dividaValor}>R$ {getPendingValue().toFixed(2)}</Text>
            <Text style={styles.dividaSubtext}>
              {sales.filter(v => v.status === 'PENDENTE').length} venda{sales.filter(v => v.status === 'PENDENTE').length !== 1 ? 's' : ''} pendente{sales.filter(v => v.status === 'PENDENTE').length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Produtos */}
        <View style={styles.produtosSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Produtos</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{shipment.products?.length || 0}</Text>
            </View>
          </View>

          {shipment.products?.map((product) => (
            <View key={product.id} style={styles.produtoItem}>
              <View style={styles.produtoHeader}>
                <View style={styles.produtoInfo}>
                  <Text style={styles.produtoNome}>
                    {product.type} - {product.flavor}
                  </Text>
                  <Text style={styles.produtoCusto}>
                    Custo: R$ {product.production_cost.toFixed(2)}
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  product.initial_quantity === product.sold_quantity
                    ? styles.statusBadgeEsgotado
                    : styles.statusBadgeDisponivel
                ]}>
                  <Text style={[
                    styles.statusText,
                    product.initial_quantity === product.sold_quantity
                      ? styles.statusTextEsgotado
                      : styles.statusTextDisponivel
                  ]}>
                    {product.initial_quantity === product.sold_quantity
                      ? 'Esgotado'
                      : `${product.initial_quantity - product.sold_quantity} disponíveis`
                    }
                  </Text>
                </View>
              </View>

              <View style={styles.produtoProgress}>
                <View style={styles.progressInfo}>
                  <Text style={styles.progressText}>
                    {product.sold_quantity}/{product.initial_quantity}
                  </Text>
                  <Text style={styles.progressPercentage}>
                    {((product.sold_quantity / product.initial_quantity) * 100).toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.progressContainer}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${(product.sold_quantity / product.initial_quantity) * 100}%` }
                    ]}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Vendas */}
        {sales.length > 0 && (
          <View style={styles.vendasSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Vendas</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{sales.length}</Text>
              </View>
            </View>

            {/* Lista de Vendas */}
            {sales.slice(0, itemsShown).map((sale) => (
              <SaleCard
                key={sale.id}
                sale={sale}
                getProductName={getProductName}
                showDate={true}
                showActions={true}
                onEdit={(v) => router.push(`/sales/edit?id=${v.id}`)}
                onDelete={(v) => {
                  setSaleToDelete(v);
                  setDeleteSaleModalVisible(true);
                }}
              />
            ))}

            {itemsShown < sales.length && (
              <TouchableOpacity
                style={styles.carregarMaisButton}
                onPress={() => setItemsShown(itemsShown + 10)}
              >
                <Text style={styles.carregarMaisText}>
                  Carregar + ({itemsShown} de {sales.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Botão Nova Venda */}
                <TouchableOpacity
          style={styles.novaVendaButton}
                  onPress={() => router.push('/sales/new')}
        >
          <Text style={styles.novaVendaText}>+ Registrar Nova Venda</Text>
        </TouchableOpacity>
        </View>
      </ScrollView>
      )}

      <ModernModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        title="Excluir Remessa"
        primaryAction={{ label: 'Excluir', onPress: handleDelete, destructive: true }}
        secondaryAction={{ label: 'Cancelar', onPress: () => setDeleteModalVisible(false) }}>
        <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 }}>
          Tem certeza que deseja excluir esta remessa? Os produtos serão removidos, mas o histórico de vendas será preservado.
        </Text>
      </ModernModal>

      <ModernModal
        visible={deleteSaleModalVisible}
        onClose={() => { setDeleteSaleModalVisible(false); setSaleToDelete(null); }}
        title="Excluir Venda"
        primaryAction={{ label: 'Excluir', onPress: handleDeleteSale, destructive: true }}
        secondaryAction={{ label: 'Cancelar', onPress: () => { setDeleteSaleModalVisible(false); setSaleToDelete(null); } }}>
        <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 }}>
          Tem certeza que deseja excluir a venda de {saleToDelete?.customer_name}? Esta ação não pode ser desfeita.
        </Text>
      </ModernModal>
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
    borderRadius: 8,
    backgroundColor: COLORS.softGray,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.mediumBlue,
  },
  deleteCardButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
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
