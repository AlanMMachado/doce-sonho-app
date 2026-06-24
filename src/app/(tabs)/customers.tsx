import ConfigMenuButton from '@/components/ConfigMenuButton';
import Header from '@/components/Header';
import SkeletonCard from '@/components/SkeletonCard';
import { COLORS } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useScreenData } from '@/hooks/useScreenData';
import { CustomerService } from '@/service/customerService';
import { Customer } from '@/types/Customer';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';

export default function CustomersScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filter, setFilter] = useState<'todos' | 'devedores' | 'em_dia'>('todos');
  const [search, setSearch] = useState('');
  const [summary, setSummary] = useState({
    totalCustomers: 0,
    debtors: 0,
    current: 0,
    totalOwed: 0,
    totalPurchased: 0,
  });

  const loadData = async () => {
    try {
      const data = await CustomerService.getAll(user!.id);
      setCustomers(data);

      const stats = await CustomerService.getStats(user!.id);
      setSummary({
        totalCustomers: stats.totalCustomers,
        debtors: stats.totalDebtors,
        current: stats.totalCustomers - stats.totalDebtors,
        totalOwed: stats.totalAmountOwed,
        totalPurchased: stats.totalAmountPurchased,
      });
    } catch (error) {
      console.error('Erro ao carregar dados dos clientes:', error);
    }
  };

  const { loading, refreshing, onRefresh } = useScreenData(loadData);

  const filteredCustomers = customers.filter(customer => {
    const matchSearch = customer.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'todos' ||
      (filter === 'devedores' && customer.status === 'devedor') ||
      (filter === 'em_dia' && customer.status === 'em_dia');
    return matchSearch && matchFilter;
  });

  return (
    <View style={styles.container}>
      <Header
        title="Clientes"
        subtitle={`${summary.totalCustomers} clientes ativos`}
        actions={<ConfigMenuButton />}
      />

      {loading ? (
        <ScrollView scrollEnabled={false} style={styles.content}>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <SkeletonCard style={{ flex: 1 }} lines={5} />
            <SkeletonCard style={{ flex: 1 }} lines={5} />
            <SkeletonCard style={{ flex: 1 }} lines={5} />
          </View>
          <SkeletonCard lines={1} />
          <View style={{ height: 20 }} />
          <SkeletonCard lines={5} />
          <SkeletonCard lines={5} />
        </ScrollView>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <View style={styles.content}>

            <View style={styles.summaryContainer}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryIcon}>👥</Text>
                <Text style={styles.summaryValue}>{summary.totalCustomers}</Text>
                <Text style={styles.summaryLabel}>Clientes Ativos</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryIcon}>🔴</Text>
                <Text style={styles.summaryValue}>{summary.debtors}</Text>
                <Text style={styles.summaryLabel}>Devedores</Text>
                <Text style={styles.summarySubtext}>R$ {(summary.totalOwed || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryIcon}>🟢</Text>
                <Text style={styles.summaryValue}>{summary.current}</Text>
                <Text style={styles.summaryLabel}>Em Dia</Text>
                <Text style={styles.summarySubtext}>R$ {(summary.totalPurchased || 0).toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.filtersContainer}>
              <TextInput
                value={search}
                onChangeText={setSearch}
                style={styles.searchInput}
                mode="outlined"
                placeholder="Buscar cliente..."
                outlineColor="#d1d5db"
                activeOutlineColor="#2563eb"
                left={<TextInput.Icon icon="magnify" />}
              />
              <View style={styles.filterButtons}>
                {[
                  { key: 'todos', label: 'Todos', count: summary.totalCustomers },
                  { key: 'devedores', label: 'Devedores', count: summary.debtors },
                  { key: 'em_dia', label: 'Em Dia', count: summary.current },
                ].map(({ key, label, count }) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setFilter(key as any)}
                    style={[styles.filterButton, filter === key && styles.filterButtonActive]}
                  >
                    <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>
                      {label} ({count})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.listSection}>
              <Text style={styles.sectionTitle}>
                {filter === 'todos' ? 'Todos os Clientes' :
                 filter === 'devedores' ? 'Clientes Devedores' : 'Clientes em Dia'}
              </Text>

              {filteredCustomers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>👥</Text>
                  <Text style={styles.emptyText}>
                    {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente nesta categoria'}
                  </Text>
                  <Text style={styles.emptySubtext}>
                    {search ? 'Tente outro termo de busca' : 'Clientes aparecerão aqui quando houverem vendas'}
                  </Text>
                </View>
              ) : (
                <View style={styles.list}>
                  {filteredCustomers.map((customer) => (
                    <TouchableOpacity
                      key={customer.name}
                      style={styles.customerCard}
                      onPress={() => router.push(`/customers/${encodeURIComponent(customer.name)}` as any)}
                    >
                      <View style={styles.customerHeader}>
                        <View style={styles.customerInfo}>
                          <Text style={styles.customerName}>{customer.name}</Text>
                          <Text style={styles.customerMeta}>
                            {customer.purchase_count} compra{customer.purchase_count !== 1 ? 's' : ''} •
                            {customer.last_purchase ? ` Última: ${format(parseISO(customer.last_purchase), 'dd/MM', { locale: ptBR })}` : ''}
                          </Text>
                        </View>
                        <View style={styles.statusContainer}>
                          <View style={[
                            styles.statusBadge,
                            customer.status === 'devedor' && styles.statusDebtor,
                            customer.status === 'em_dia' && styles.statusCurrent,
                          ]}>
                            <Text style={[
                              styles.statusText,
                              customer.status === 'devedor' && styles.statusTextDebtor,
                              customer.status === 'em_dia' && styles.statusTextCurrent,
                            ]}>
                              {customer.status === 'devedor' ? 'DEVEDOR' : 'EM DIA'}
                            </Text>
                          </View>
                          <View style={styles.totalPurchased}>
                            <Text style={styles.totalPurchasedLabel}>Total Comprado</Text>
                            <Text style={styles.totalPurchasedValue}>R$ {(customer.total_purchased || 0).toFixed(2)}</Text>
                          </View>
                        </View>
                      </View>
                      {customer.total_owed > 0 && (
                        <View style={styles.owedContainer}>
                          <Text style={styles.owedLabel}>Valor Devido</Text>
                          <Text style={styles.owedValue}>R$ {(customer.total_owed || 0).toFixed(2)}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.softGray },
  content: { padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
  summaryContainer: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  summaryCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderGray, padding: 16, alignItems: 'center' },
  summaryIcon: { fontSize: 24, marginBottom: 8 },
  summaryValue: { fontSize: 24, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 4 },
  summaryLabel: { fontSize: 12, color: COLORS.textMedium, fontWeight: '600', textAlign: 'center' },
  summarySubtext: { fontSize: 11, color: COLORS.textLight, textAlign: 'center' },
  filtersContainer: { marginBottom: 20 },
  searchInput: { backgroundColor: COLORS.white, marginBottom: 12 },
  filterButtons: { flexDirection: 'row', gap: 8 },
  filterButton: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 2, borderColor: COLORS.borderGray, backgroundColor: COLORS.white, alignItems: 'center' },
  filterButtonActive: { borderColor: COLORS.mediumBlue, backgroundColor: COLORS.mediumBlue },
  filterText: { fontSize: 12, fontWeight: '600', color: COLORS.textMedium },
  filterTextActive: { color: COLORS.white },
  listSection: { backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderGray, padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, fontWeight: '600', color: COLORS.textDark, marginBottom: 4 },
  emptySubtext: { fontSize: 13, color: COLORS.textMedium, textAlign: 'center' },
  list: { gap: 12 },
  customerCard: { backgroundColor: COLORS.softGray, borderRadius: 8, borderWidth: 1, borderColor: COLORS.borderGray, padding: 12 },
  customerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 4 },
  customerMeta: { fontSize: 12, color: COLORS.textMedium },
  statusContainer: { alignItems: 'flex-end' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginBottom: 6 },
  statusDebtor: { backgroundColor: COLORS.error },
  statusCurrent: { backgroundColor: COLORS.green },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  statusTextDebtor: { color: COLORS.white },
  statusTextCurrent: { color: COLORS.white },
  totalPurchased: { alignItems: 'flex-end' },
  totalPurchasedLabel: { fontSize: 10, color: COLORS.textMedium, fontWeight: '600', marginBottom: 2 },
  totalPurchasedValue: { fontSize: 14, fontWeight: 'bold', color: COLORS.textDark },
  owedContainer: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.borderGray, alignItems: 'flex-end' },
  owedLabel: { fontSize: 10, color: COLORS.textMedium, fontWeight: '600', marginBottom: 2 },
  owedValue: { fontSize: 14, fontWeight: 'bold', color: COLORS.error },
});
