import Header from '@/components/Header';
import ModernModal from '@/components/ModernModal';
import SaleCard from '@/components/SaleCard';
import SkeletonCard, { SkeletonBlock } from '@/components/SkeletonCard';
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
import { Text } from 'react-native-paper';

export default function ShipmentDetailsScreen() {
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteSaleModalVisible, setDeleteSaleModalVisible] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [saleToMark, setSaleToMark] = useState<Sale | null>(null);
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

  const markAsPaid = async (sale: Sale) => {
    try {
      await SaleService.updateStatus(user!.id, sale.id, 'OK');
      await loadDetails();
      setPaymentModalVisible(false);
      setSaleToMark(null);
    } catch (error) {
      console.error('Erro ao marcar venda como paga:', error);
      alert('Erro ao registrar pagamento. Tente novamente.');
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

  const getTotalSold = () =>
    shipment?.products?.reduce((total, product) => total + product.sold_quantity, 0) ?? 0;

  const getTotalInitial = () =>
    shipment?.products?.reduce((total, product) => total + product.initial_quantity, 0) ?? 0;

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
          <View style={styles.kpisGrid}>
            {[1, 2, 3, 4].map(i => (
              <View key={i} style={styles.kpiCard}>
                <SkeletonBlock width="60%" height={12} style={{ marginBottom: 4 }} />
                <SkeletonBlock width="70%" height={24} style={{ marginBottom: 4 }} />
                <SkeletonBlock width="40%" height={11} />
              </View>
            ))}
          </View>
          <View style={styles.produtosSection}>
            <View style={styles.sectionHeader}>
              <SkeletonBlock width="35%" height={16} />
              <SkeletonBlock width={30} height={22} style={{ borderRadius: 12 }} />
            </View>
            {[1, 2].map(i => (
              <View key={i} style={[styles.produtoItem, i < 2 && { marginBottom: 12 }]}>
                <View style={styles.produtoHeader}>
                  <View style={styles.produtoLeft}>
                    <SkeletonBlock width="50%" height={14} style={{ marginBottom: 6 }} />
                    <SkeletonBlock width="30%" height={12} />
                  </View>
                  <SkeletonBlock width={100} height={36} style={{ borderRadius: 20 }} />
                </View>
                <SkeletonBlock width="100%" height={8} style={{ borderRadius: 4, marginTop: 12 }} />
              </View>
            ))}
          </View>
          <View style={styles.vendasSection}>
            <View style={styles.sectionHeader}>
              <SkeletonBlock width="25%" height={16} />
              <SkeletonBlock width={30} height={22} style={{ borderRadius: 12 }} />
            </View>
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
          </View>
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

          {[...(shipment.products ?? [])].sort((a, b) => (b.initial_quantity - b.sold_quantity) - (a.initial_quantity - a.sold_quantity)).map((product) => {
            const available = product.initial_quantity - product.sold_quantity;
            const isEsgotado = available <= 0;
            const soldPercent = Math.round((product.sold_quantity / product.initial_quantity) * 100);
            return (
              <View key={product.id} style={[styles.produtoItem, isEsgotado ? styles.produtoItemEsgotado : styles.produtoItemDisponivel]}>
                <View style={styles.produtoHeader}>
                  <View style={styles.produtoLeft}>
                    <Text style={styles.produtoNome}>{product.flavor}</Text>
                    <Text style={styles.produtoTipo}>{product.type}</Text>
                  </View>
                  <View style={[styles.statusBadge, isEsgotado ? styles.statusBadgeEsgotado : styles.statusBadgeDisponivel]}>
                    <Text style={[styles.statusText, isEsgotado ? styles.statusTextEsgotado : styles.statusTextDisponivel]}>
                      {isEsgotado ? 'Esgotado' : `${available} disponíveis`}
                    </Text>
                  </View>
                </View>
                <View style={styles.progressContainer}>
                  <View style={[styles.progressFill, { width: `${soldPercent}%` as any }]} />
                  <View style={styles.progressOverlay}>
                    <Text style={styles.progressLabelText}>{product.sold_quantity}/{product.initial_quantity}</Text>
                    <Text style={styles.progressLabelText}>{soldPercent}%</Text>
                  </View>
                </View>
              </View>
            );
          })}
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
                onMarkAsPaid={(v) => { setSaleToMark(v); setPaymentModalVisible(true); }}
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

      <ModernModal
        visible={paymentModalVisible}
        onClose={() => { setPaymentModalVisible(false); setSaleToMark(null); }}
        title="Confirmar Pagamento"
        primaryAction={{ label: 'Confirmar', onPress: () => { if (saleToMark) markAsPaid(saleToMark); } }}
        secondaryAction={{ label: 'Cancelar', onPress: () => { setPaymentModalVisible(false); setSaleToMark(null); } }}>
        <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 }}>
          Marcar a venda de R$ {(saleToMark?.total_price || 0).toFixed(2)} como paga?
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
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    borderLeftWidth: 4,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  produtoItemDisponivel: {
    borderLeftColor: COLORS.green,
  },
  produtoItemEsgotado: {
    borderLeftColor: COLORS.error,
  },
  produtoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  produtoLeft: {
    flex: 1,
    marginRight: 12,
  },
  produtoNome: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  produtoTipo: {
    fontSize: 12,
    color: COLORS.textMedium,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
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
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusTextDisponivel: {
    color: '#16a34a',
  },
  statusTextEsgotado: {
    color: '#dc2626',
  },
  progressContainer: {
    height: 26,
    backgroundColor: COLORS.borderGray,
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 12,
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: COLORS.mediumBlue,
    borderRadius: 6,
  },
  progressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  progressLabelText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.white,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
