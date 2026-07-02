import Header from '@/components/Header';
import MetricCard, { MetricCardSkeleton } from '@/components/MetricCard';
import ModernModal from '@/components/ModernModal';
import SaleCard from '@/components/SaleCard';
import SkeletonCard, { SkeletonBlock } from '@/components/SkeletonCard';
import { COLORS } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useScreenData } from '@/hooks/useScreenData';
import { CustomerService } from '@/service/customerService';
import { SaleService } from '@/service/saleService';
import { Customer } from '@/types/Customer';
import { Sale } from '@/types/Sale';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Clock, DollarSign, Edit, ShoppingCart, Trash2, XCircle } from 'lucide-react-native';
import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';

type CustomerWithSales = Customer & {
  sales: Sale[];
  paidSales: Sale[];
  pendingSales: Sale[];
  firstPurchase: string;
};

export default function CustomerDetailsScreen() {
  const { user } = useAuth();
  const { name } = useLocalSearchParams<{ name: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerWithSales | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [saleToMark, setSaleToMark] = useState<Sale | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadCustomer = async () => {
    try {
      const customerName = decodeURIComponent(name);

      const customerData = await CustomerService.getByName(user!.id, customerName);

      if (!customerData) {
        router.back();
        return;
      }

      const customerSales = await SaleService.getByCustomerId(user!.id, customerData.id);

      const paidSales = customerSales.filter(v => v.status === 'PAGO');
      const pendingSales = customerSales.filter(v => v.status === 'PENDENTE');

      const firstPurchase = customerSales.length > 0 ?
        customerSales.reduce((oldest, current) =>
          new Date(current.date) < new Date(oldest.date) ? current : oldest
        ).date : customerData.registered_at;

      setCustomer({
        ...customerData,
        sales: customerSales,
        paidSales,
        pendingSales,
        firstPurchase
      });

    } catch (error) {
      console.error('Erro ao carregar cliente:', error);
      router.back();
    }
  };

  const { loading, refreshing, onRefresh } = useScreenData(loadCustomer, [name]);

  const markAsPaid = async (sale: Sale) => {
    try {
      await SaleService.updateStatus(user!.id, sale.id, 'PAGO');
      await loadCustomer();
      setPaymentModalVisible(false);
      setSaleToMark(null);
    } catch (error) {
      console.error('Erro ao marcar venda como paga:', error);
      alert('Erro ao registrar pagamento. Tente novamente.');
    }
  };

  const getProductName = (productId: string | null, item?: { product_type?: string; product_flavor?: string }) => {
    if (item?.product_type && item?.product_flavor) return `${item.product_type} ${item.product_flavor}`;
    return 'Produto removido';
  };

  const handleRename = async () => {
    const trimmed = editName.trim();
    if (!trimmed) { setEditError('Nome obrigatório'); return; }
    if (trimmed === customer?.name) { setEditModalVisible(false); return; }
    try {
      setActionLoading(true);
      await CustomerService.update(user!.id, customer!.id, { name: trimmed });
      setEditModalVisible(false);
      router.replace(`/customers/${encodeURIComponent(trimmed)}` as any);
    } catch (e: any) {
      setEditError(e.message ?? 'Erro ao renomear');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setActionLoading(true);
      await CustomerService.delete(user!.id, customer!.id);
      router.back();
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      alert('Erro ao excluir cliente. Tente novamente.');
    } finally {
      setActionLoading(false);
      setDeleteModalVisible(false);
    }
  };

  const calculateDaysSinceLastPurchase = () => {
    if (!customer?.last_purchase) return 0;
    const today = new Date();
    const last = new Date(customer.last_purchase);
    return Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  };


  return (
    <View style={styles.container}>
      <Header
        title="Histórico de compras"
        actions={
          !loading && customer ? (
            <>
              <TouchableOpacity
                style={styles.headerEditButton}
                onPress={() => { setEditName(customer.name); setEditError(''); setEditModalVisible(true); }}
              >
                <Edit size={20} color={COLORS.mediumBlue} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerDeleteButton}
                onPress={() => setDeleteModalVisible(true)}
              >
                <Trash2 size={20} color={COLORS.error} />
              </TouchableOpacity>
            </>
          ) : undefined
        }
      />

      {loading ? (
        <ScrollView style={styles.content} scrollEnabled={false}>
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={{ flex: 1 }}>
                <SkeletonBlock width="55%" height={20} style={{ marginBottom: 8 }} />
                <SkeletonBlock width="75%" height={13} />
              </View>
              <SkeletonBlock width={64} height={30} style={{ borderRadius: 16 }} />
            </View>
          </View>
          <View style={styles.metricsGrid}>
            {[0, 1].map(row => (
              <View key={row} style={styles.metricsRow}>
                <MetricCardSkeleton style={{ flex: 1 }} />
                <MetricCardSkeleton style={{ flex: 1 }} />
              </View>
            ))}
          </View>
          <View style={styles.historicoSection}>
            <SkeletonBlock width="50%" height={16} style={{ marginBottom: 16 }} />
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
          </View>
        </ScrollView>
      ) : !customer ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Cliente não encontrado</Text>
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
                  <Text style={styles.clienteNome}>{customer.name}</Text>
                  <Text style={styles.statusSubtitle}>
                    {customer.status === 'devedor' ? 'Possui pagamentos pendentes' :
                     'Pagamentos em dia'}
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  customer.status === 'devedor' && styles.statusDevedor,
                  customer.status === 'em_dia' && styles.statusEmDia
                ]}>
                  <Text style={[
                    styles.statusBadgeText,
                    customer.status === 'devedor' && styles.statusTextDevedor,
                    customer.status === 'em_dia' && styles.statusTextEmDia
                  ]}>
                    {customer.status === 'devedor' ? 'DEVEDOR' :
                     customer.status === 'em_dia' ? 'EM DIA' : 'EM DIA'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Métricas Principais — grid 2×2 */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricsRow}>
                <MetricCard
                  icon={<ShoppingCart size={16} color={COLORS.mediumBlue} />}
                  label="Total de Compras"
                  value={`${customer.purchase_count}`}
                  color={COLORS.mediumBlue}
                  style={{ flex: 1 }}
                />
                <MetricCard
                  icon={<Clock size={16} color="#ea580c" />}
                  label="Última compra"
                  value={`${calculateDaysSinceLastPurchase()} dias`}
                  color="#ea580c"
                  style={{ flex: 1 }}
                />
              </View>
              <View style={styles.metricsRow}>
                <MetricCard
                  icon={<DollarSign size={16} color="#059669" />}
                  label="Total Comprado"
                  value={`R$ ${(customer.total_purchased || 0).toFixed(2)}`}
                  color="#059669"
                  style={{ flex: 1 }}
                />
                <MetricCard
                  icon={<XCircle size={16} color={COLORS.error} />}
                  label="Valor em Aberto"
                  value={`R$ ${(customer.total_owed || 0).toFixed(2)}`}
                  color={COLORS.error}
                  subtitle={customer.pendingSales.length > 0 ? `${customer.pendingSales.length} pendente${customer.pendingSales.length !== 1 ? 's' : ''}` : undefined}
                  style={{ flex: 1 }}
                />
              </View>
            </View>

            {/* Histórico de Compras */}
            <View style={styles.historicoSection}>
              <Text style={styles.sectionTitle}>Histórico de Compras</Text>

              {customer.sales.map((sale) => (
                <SaleCard
                  key={sale.id}
                  sale={sale}
                  getProductName={getProductName}
                  showDate={true}
                  onMarkAsPaid={(v) => {
                    setSaleToMark(v);
                    setPaymentModalVisible(true);
                  }}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      )}

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

      <ModernModal
        centered
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        title="Editar Nome"
        primaryAction={{ label: actionLoading ? 'Salvando...' : 'Salvar', onPress: handleRename }}
        secondaryAction={{ label: 'Cancelar', onPress: () => setEditModalVisible(false) }}>
        <TextInput
          value={editName}
          onChangeText={(t) => { setEditName(t); setEditError(''); }}
          mode="outlined"
          placeholder="Nome do cliente"
          outlineColor={editError ? COLORS.error : COLORS.borderGray}
          activeOutlineColor={editError ? COLORS.error : COLORS.mediumBlue}
          style={{ backgroundColor: COLORS.white, marginBottom: 4 }}
          autoFocus
        />
        {!!editError && (
          <Text style={{ fontSize: 12, color: COLORS.error, marginTop: 4 }}>{editError}</Text>
        )}
      </ModernModal>

      <ModernModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        title="Excluir Cliente"
        primaryAction={{ label: 'Excluir', onPress: handleDelete, destructive: true }}
        secondaryAction={{ label: 'Cancelar', onPress: () => setDeleteModalVisible(false) }}>
        <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 }}>
          O perfil de {customer?.name} será removido permanentemente.{'\n\n'}As vendas anteriores continuarão acessíveis no histórico de cada remessa.
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
  headerEditButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.softGray,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.mediumBlue,
  },
  headerDeleteButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.softGray,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  metricsGrid: {
    gap: 12,
    marginBottom: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  accentCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    borderLeftWidth: 4,
    padding: 16,
  },
  accentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  accentCardLabel: {
    fontSize: 12,
    color: COLORS.textMedium,
    fontWeight: '600',
    flex: 1,
  },
  accentCardValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  accentCardSubtitle: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 4,
  },
  historicoSection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 16,
  },
});
