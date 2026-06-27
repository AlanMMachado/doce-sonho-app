import Header from '@/components/Header';
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
import { Clock, DollarSign, ShoppingCart, XCircle } from 'lucide-react-native';
import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

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
        subtitle={loading ? 'Carregando...' : !customer ? 'Não encontrado' : `${customer.purchase_count} compra${customer.purchase_count !== 1 ? 's' : ''}`}
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
          <View style={styles.metricasContainer}>
            <View style={styles.metricasRow}>
              {[1, 2].map(i => (
                <View key={i} style={styles.metricaCard}>
                  <SkeletonBlock width={20} height={20} style={{ borderRadius: 10 }} />
                  <SkeletonBlock width="55%" height={18} style={{ marginTop: 8, marginBottom: 4 }} />
                  <SkeletonBlock width="75%" height={12} />
                </View>
              ))}
            </View>
            <View style={styles.metricaCardFull}>
              <SkeletonBlock width={20} height={20} style={{ borderRadius: 10 }} />
              <SkeletonBlock width="40%" height={18} style={{ marginTop: 8, marginBottom: 4 }} />
              <SkeletonBlock width="50%" height={12} />
            </View>
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
                    {customer.status === 'devedor' ? 'Possui pendências de pagamento' :
                     'Cliente em dia com pagamentos'}
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

            {/* Métricas Principais */}
            <View style={styles.metricasContainer}>
              <View style={styles.metricasRow}>
                <View style={styles.metricaCard}>
                  <ShoppingCart size={20} color="#059669" />
                  <Text style={styles.metricaValor}>{customer.purchase_count}</Text>
                  <Text style={styles.metricaLabel}>Total de Compras</Text>
                </View>

                <View style={styles.metricaCard}>
                  <Clock size={20} color="#ea580c" />
                  <Text style={styles.metricaValor}>{calculateDaysSinceLastPurchase()}</Text>
                  <Text style={styles.metricaLabel}>Dias Última Compra</Text>
                </View>
              </View>

              <View style={styles.metricaCardFull}>
                <DollarSign size={20} color="#2563eb" />
                <Text style={styles.metricaValor}>R$ {(customer.total_purchased || 0).toFixed(2)}</Text>
                <Text style={styles.metricaLabel}>Total Comprado</Text>
              </View>
            </View>

            {/* Valor Devido (se houver) */}
            {customer.total_owed > 0 && (
              <View style={styles.dividaCard}>
                <View style={styles.dividaHeader}>
                  <XCircle size={20} color="#dc2626" />
                  <Text style={styles.dividaTitle}>Valor em Aberto</Text>
                </View>
                <Text style={styles.dividaValor}>R$ {(customer.total_owed || 0).toFixed(2)}</Text>
                <Text style={styles.dividaSubtext}>
                  {customer.pendingSales.length} venda{customer.pendingSales.length !== 1 ? 's' : ''} pendente{customer.pendingSales.length !== 1 ? 's' : ''}
                </Text>
              </View>
            )}

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
