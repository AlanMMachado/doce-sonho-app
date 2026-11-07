import Header from '@/components/Header';
import MetricCard, { MetricCardSkeleton } from '@/components/MetricCard';
import ModernModal from '@/components/ModernModal';
import SaleCard from '@/components/SaleCard';
import SkeletonCard, { SkeletonBlock } from '@/components/SkeletonCard';
import { COLORS } from '@/constants/Colors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useScreenData } from '@/hooks/useScreenData';
import { formatCents, formatPhone } from '@/lib/utils/formatters';
import { getSaleItemName, sortSalesOldestFirst } from '@/lib/utils/saleUtils';
import { isValidPhone } from '@/lib/utils/validators';
import { buildChargeMessage, openWhatsappChat } from '@/lib/utils/whatsapp';
import { CustomerService } from '@/service/customerService';
import { SaleService } from '@/service/saleService';
import { Customer, CustomerUpdateParams } from '@/types/Customer';
import { Sale, SaleItem } from '@/types/Sale';
import { FontAwesome } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircle, Clock, DollarSign, Edit, Info, ShoppingCart, Trash2, XCircle } from 'lucide-react-native';
import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';

type CustomerWithSales = Customer & {
  sales: Sale[];
  paidSales: Sale[];
  pendingSales: Sale[];
  firstPurchase: string;
};

// Simula, no client, a mesma alocação "mais antiga primeiro" que a RPC
// apply_partial_payment faz no banco — só para dar um preview ao usuário antes
// de confirmar. A RPC continua sendo a única fonte de verdade que efetivamente
// aplica o pagamento; se a regra de alocação mudar um dia, atualizar os dois.
function simulatePartialPayment(pendingSales: Sale[], amount: number) {
  const sorted = sortSalesOldestFirst(pendingSales);

  let remaining = amount;
  let fullyPaidCount = 0;
  let partialSale: Sale | null = null;
  let partialNewAmountPaid = 0;

  for (const sale of sorted) {
    if (remaining <= 0) break;
    const owed = sale.total_price - sale.amount_paid;
    if (remaining >= owed) {
      remaining -= owed;
      fullyPaidCount++;
    } else {
      partialSale = sale;
      partialNewAmountPaid = sale.amount_paid + remaining;
      remaining = 0;
    }
  }

  return { fullyPaidCount, partialSale, partialNewAmountPaid };
}

export default function CustomerDetailsScreen() {
  const { user } = useAuth();
  const { state } = useApp();
  const { name } = useLocalSearchParams<{ name: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerWithSales | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [saleToMark, setSaleToMark] = useState<Sale | null>(null);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editError, setEditError] = useState('');
  const [chargeErrorVisible, setChargeErrorVisible] = useState(false);
  const [noPhoneModalVisible, setNoPhoneModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState(false);
  const [partialModalVisible, setPartialModalVisible] = useState(false);
  const [partialAmountCents, setPartialAmountCents] = useState(0);
  const [partialError, setPartialError] = useState('');

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      setMarkingPaid(true);
      await SaleService.updateStatus(user!.id, sale.id, 'PAGO');
      await loadCustomer();
      setPaymentModalVisible(false);
      setSaleToMark(null);
    } catch (error) {
      console.error('Erro ao marcar venda como paga:', error);
      alert('Erro ao registrar pagamento. Tente novamente.');
    } finally {
      setMarkingPaid(false);
    }
  };

  const handlePartialPayment = async () => {
    const amount = partialAmountCents / 100;
    if (!amount || amount <= 0) {
      setPartialError('Informe um valor válido');
      return;
    }
    if (amount > (customer!.total_owed || 0)) {
      setPartialError('Valor inserido excede o total em aberto');
      return;
    }
    try {
      setActionLoading(true);
      await SaleService.applyPartialPayment(user!.id, customer!.id, amount);
      setPartialModalVisible(false);
      setPartialAmountCents(0);
      await loadCustomer();
    } catch (error: any) {
      console.error('Erro ao registrar pagamento parcial:', error);
      setPartialError(error.message ?? 'Erro ao registrar pagamento. Tente novamente.');
    } finally {
      setActionLoading(false);
    }
  };

  const getProductName = (_productId: string | null, item?: SaleItem) => getSaleItemName(item);

  const handleSaveCustomer = async () => {
    const trimmed = editName.trim();
    if (!trimmed) { setEditError('Nome obrigatório'); return; }

    const phone = editPhoneDigits || null;
    const changes: CustomerUpdateParams = {};
    if (trimmed !== customer?.name) changes.name = trimmed;
    if (phone !== (customer?.phone ?? null)) changes.phone = phone;
    if (Object.keys(changes).length === 0) { setEditModalVisible(false); return; }

    try {
      setActionLoading(true);
      await CustomerService.update(user!.id, customer!.id, changes);
      if (changes.name) {
        setEditModalVisible(false);
        router.replace(`/customers/${encodeURIComponent(trimmed)}` as any);
      } else {
        await loadCustomer();
        setEditModalVisible(false);
      }
    } catch (e: any) {
      setEditError(e.message ?? 'Erro ao salvar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCharge = async () => {
    if (!customer) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!customer.phone) {
      setNoPhoneModalVisible(true);
      return;
    }
    if (customer.pendingSales.length === 0) return;

    try {
      const message = buildChargeMessage(
        customer.name,
        customer.pendingSales,
        state.profile?.charge_message_template,
        state.profile?.pix_key
      );
      await openWhatsappChat(customer.phone, message);
    } catch (error) {
      console.error('Erro ao abrir o WhatsApp:', error);
      setChargeErrorVisible(true);
    }
  };

  const handleDelete = async () => {
    if (deletingCustomer || !customer) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      setDeletingCustomer(true);
      await CustomerService.delete(user!.id, customer!.id);
      router.back();
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      alert('Erro ao excluir cliente. Tente novamente.');
    } finally {
      setDeletingCustomer(false);
      setDeleteModalVisible(false);
    }
  };

  const calculateDaysSinceLastPurchase = () => {
    if (!customer?.last_purchase) return 0;
    const today = new Date();
    const last = new Date(customer.last_purchase);
    return Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  };

  const canCharge = !!customer?.phone && customer.pendingSales.length > 0;

  const editPhoneDigits = editPhone.replace(/\D/g, '');
  const editPhoneInvalid = editPhoneDigits.length > 0 && !isValidPhone(editPhoneDigits);

  const partialAmountReais = partialAmountCents / 100;
  const partialDisplayValue = `R$ ${formatCents(partialAmountCents)}`;

  // Card de feedback abaixo do input
  const partialFeedback: { state: 'neutral' | 'preview' | 'error'; text: string } = (() => {
    if (partialError) return { state: 'error', text: partialError };
    if (!customer || partialAmountReais <= 0) {
      return { state: 'neutral', text: 'Informe quanto o cliente pagou' };
    }
    if (partialAmountReais > (customer.total_owed || 0)) {
      return { state: 'error', text: 'Valor excede o total em aberto' };
    }

    const { fullyPaidCount, partialSale, partialNewAmountPaid } = simulatePartialPayment(customer.pendingSales, partialAmountReais);
    if (fullyPaidCount === 0 && !partialSale) {
      return { state: 'neutral', text: 'Informe quanto o cliente pagou' };
    }

    const parts: string[] = [];
    if (fullyPaidCount > 0) {
      parts.push(`${fullyPaidCount} venda${fullyPaidCount > 1 ? 's' : ''} ser${fullyPaidCount > 1 ? 'ão' : 'á'} marcada${fullyPaidCount > 1 ? 's' : ''} como paga${fullyPaidCount > 1 ? 's' : ''}`);
    }
    if (partialSale) {
      const position = fullyPaidCount + 1;
      parts.push(`${position}° venda de R$ ${partialSale.total_price.toFixed(2)} será marcada como parcial (R$ ${partialNewAmountPaid.toFixed(2)}/${partialSale.total_price.toFixed(2)})`);
    }
    return { state: 'preview', text: parts.join(' · ') };
  })();

  return (
    <View style={styles.container}>
      <Header
        title="Histórico"
        showBackButton
        actions={
          !loading && customer ? (
            <>
              <TouchableOpacity
                style={[styles.headerWhatsappButton, !canCharge && styles.headerWhatsappButtonDisabled]}
                disabled={!!customer.phone && !canCharge}
                onPress={handleCharge}
                accessibilityRole="button"
                accessibilityLabel="Cobrar pelo WhatsApp"
                accessibilityHint={customer.phone ? undefined : 'Cliente sem telefone cadastrado'}
                accessibilityState={{ disabled: !!customer.phone && !canCharge }}
              >
                <FontAwesome
                  name="whatsapp"
                  size={20}
                  color={canCharge ? COLORS.green : COLORS.textLight}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerEditButton}
                onPress={() => {
                  setEditName(customer.name);
                  setEditPhone(formatPhone(customer.phone ?? ''));
                  setEditError('');
                  setEditModalVisible(true);
                }}
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
                <MetricCardSkeleton
                  color={row === 0 ? COLORS.mediumBlue : '#059669'}
                  style={{ flex: 1 }}
                />
                <MetricCardSkeleton
                  color={row === 0 ? '#ea580c' : COLORS.error}
                  style={{ flex: 1 }}
                />
              </View>
            ))}
          </View>
          <View style={styles.historicoSection}>
            <SkeletonBlock width="50%" height={16} style={{ marginBottom: 16 }} />
            <SkeletonCard lines={3} style={styles.saleSkeletonCard} />
            <SkeletonCard lines={3} style={styles.saleSkeletonCard} />
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

            <TouchableOpacity
              style={[styles.partialPaymentButton, customer.pendingSales.length === 0 && styles.partialPaymentButtonDisabled]}
              disabled={customer.pendingSales.length === 0}
              onPress={() => { setPartialAmountCents(0); setPartialError(''); setPartialModalVisible(true); }}
              activeOpacity={0.7}
            >
              <Text style={styles.partialPaymentButtonText}>Registrar Pagamento</Text>
            </TouchableOpacity>

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
        onClose={() => { if (!markingPaid) { setPaymentModalVisible(false); setSaleToMark(null); } }}
        title="Confirmar Pagamento"
        primaryAction={{
          label: 'Confirmar',
          onPress: () => { if (saleToMark) markAsPaid(saleToMark); },
          success: true,
          loading: markingPaid,
        }}
        secondaryAction={{
          label: 'Cancelar',
          onPress: () => { setPaymentModalVisible(false); setSaleToMark(null); },
          loading: markingPaid,
        }}>
        <Text style={{ fontSize: 15, color: '#374151', textAlign: 'center', lineHeight: 22 }}>
          Marcar a venda de <Text style={{ fontWeight: '700' }}>{saleToMark?.customer_name}</Text> no valor de{' '}
          <Text style={{ fontWeight: '700', color: COLORS.green }}>R$ {(saleToMark?.total_price || 0).toFixed(2)}</Text> como paga?
        </Text>
      </ModernModal>

      <ModernModal
        centered
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        title="Editar Cliente"
        primaryAction={{
          label: 'Salvar',
          onPress: handleSaveCustomer,
          loading: actionLoading,
          disabled: editPhoneInvalid,
        }}
        secondaryAction={{ label: 'Cancelar', onPress: () => setEditModalVisible(false) }}>
        <TextInput
          value={editName}
          onChangeText={(t) => { setEditName(t); setEditError(''); }}
          mode="outlined"
          label="Nome"
          placeholder="Nome do cliente"
          outlineColor={editError ? COLORS.error : COLORS.borderGray}
          activeOutlineColor={editError ? COLORS.error : COLORS.mediumBlue}
          style={{ backgroundColor: COLORS.white, marginBottom: 12 }}
          autoFocus
        />
        <TextInput
          value={editPhone}
          selection={{ start: editPhone.length, end: editPhone.length }}
          onSelectionChange={() => {}}
          onChangeText={(t) => { setEditPhone(formatPhone(t)); setEditError(''); }}
          mode="outlined"
          label="Telefone (opcional)"
          placeholder="(11) 99999-8888"
          keyboardType="phone-pad"
          outlineColor={editPhoneInvalid ? COLORS.error : COLORS.borderGray}
          activeOutlineColor={editPhoneInvalid ? COLORS.error : COLORS.mediumBlue}
          style={{ backgroundColor: COLORS.white }}
        />
        <Text style={[styles.editHint, !!(editError || editPhoneInvalid) && styles.editHintError]}>
          {editError || (editPhoneInvalid ? 'Número incompleto. Informe o DDD e o telefone.' : 'Com DDD. Deixe em branco para remover.')}
        </Text>
      </ModernModal>

      <ModernModal
        centered
        visible={chargeErrorVisible}
        onClose={() => setChargeErrorVisible(false)}
        title="Não foi possível abrir o WhatsApp"
        primaryAction={{ label: 'Entendi', onPress: () => setChargeErrorVisible(false) }}>
        <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 }}>
          Verifique se o WhatsApp está instalado ou se há um navegador disponível e tente novamente.
        </Text>
      </ModernModal>

      <ModernModal
        centered
        visible={noPhoneModalVisible}
        onClose={() => setNoPhoneModalVisible(false)}
        title="Telefone não cadastrado"
        primaryAction={{ label: 'Entendi', onPress: () => setNoPhoneModalVisible(false) }}>
        <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 }}>
          {customer?.name} não tem número de telefone cadastrado.
        </Text>
      </ModernModal>

      <ModernModal
        centered
        visible={partialModalVisible}
        onClose={() => setPartialModalVisible(false)}
        title="Registrar Pagamento"
        primaryAction={{
          label: actionLoading ? 'Processando...' : 'Confirmar',
          onPress: handlePartialPayment,
          loading: actionLoading,
          disabled: partialAmountReais <= 0 || partialAmountReais > (customer?.total_owed || 0),
        }}
        secondaryAction={{ label: 'Cancelar', onPress: () => setPartialModalVisible(false) }}>
        <View style={styles.partialOwedBlock}>
          <Text style={styles.partialOwedLabel}>Em aberto</Text>
          <Text style={styles.partialOwedValue}>R$ {(customer?.total_owed || 0).toFixed(2)}</Text>
        </View>

        <View style={styles.partialInputRow}>
          <TextInput
            value={partialDisplayValue}
            selection={{ start: partialDisplayValue.length, end: partialDisplayValue.length }}
            onSelectionChange={() => {}}
            onChangeText={(t) => {
              const digits = t.replace(/\D/g, '');
              setPartialAmountCents(digits === '' ? 0 : parseInt(digits, 10));
              setPartialError('');
            }}
            mode="outlined"
            keyboardType="numeric"
            outlineColor={partialFeedback.state === 'error' ? COLORS.error : COLORS.borderGray}
            activeOutlineColor={partialFeedback.state === 'error' ? COLORS.error : COLORS.mediumBlue}
            style={{ backgroundColor: COLORS.white, flex: 1 }}
          />
          <TouchableOpacity
            style={styles.partialFillAllButton}
            onPress={() => {
              setPartialAmountCents(Math.round((customer?.total_owed || 0) * 100));
              setPartialError('');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.partialFillAllButtonText}>Pagar tudo</Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.partialFeedbackCard,
            partialFeedback.state === 'error'
              ? styles.partialFeedbackCardError
              : partialFeedback.state === 'preview'
                ? styles.partialFeedbackCardPreview
                : styles.partialFeedbackCardNeutral,
          ]}
        >
          {partialFeedback.state === 'error' ? (
            <AlertCircle size={15} color={COLORS.error} />
          ) : (
            <Info size={15} color={partialFeedback.state === 'preview' ? COLORS.mediumBlue : COLORS.textLight} />
          )}
          <Text
            style={[
              styles.partialFeedbackText,
              partialFeedback.state === 'error'
                ? styles.partialFeedbackTextError
                : partialFeedback.state === 'preview'
                  ? styles.partialFeedbackTextPreview
                  : styles.partialFeedbackTextNeutral,
            ]}
          >
            {partialFeedback.text}
          </Text>
        </View>
      </ModernModal>

      <ModernModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        title="Excluir Cliente"
        primaryAction={{ label: 'Excluir', onPress: handleDelete, destructive: true, loading: deletingCustomer }}
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
  headerWhatsappButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.softGray,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.green,
  },
  headerWhatsappButtonDisabled: {
    borderColor: COLORS.borderGray,
    opacity: 0.6,
  },
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
  editHint: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textLight,
    marginTop: 8,
  },
  editHintError: {
    color: COLORS.error,
  },
  metricsGrid: {
    gap: 12,
    marginBottom: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  partialPaymentButton: {
    backgroundColor: COLORS.mediumBlue,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  partialPaymentButtonDisabled: {
    backgroundColor: COLORS.borderGray,
  },
  partialPaymentButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  partialOwedBlock: {
    alignItems: 'center',
    marginBottom: 16,
  },
  partialOwedLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  partialOwedValue: {
    fontSize: 22,
    color: COLORS.error,
    fontWeight: '800',
  },
  partialInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  partialFillAllButton: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 12,
    borderRadius: 8,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  partialFillAllButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
  },
  partialFeedbackCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    minHeight: 44,
  },
  partialFeedbackCardNeutral: {
    backgroundColor: COLORS.softGray,
  },
  partialFeedbackCardPreview: {
    backgroundColor: '#e8f0fe',
  },
  partialFeedbackCardError: {
    backgroundColor: '#fdecea',
  },
  partialFeedbackText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  partialFeedbackTextNeutral: {
    color: COLORS.textLight,
  },
  partialFeedbackTextPreview: {
    color: COLORS.mediumBlue,
  },
  partialFeedbackTextError: {
    color: COLORS.error,
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
  saleSkeletonCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.borderGray,
  },
});
