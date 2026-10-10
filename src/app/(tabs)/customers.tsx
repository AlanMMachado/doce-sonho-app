import ConfigMenuButton from '@/components/ConfigMenuButton';
import Header from '@/components/Header';
import { SkeletonBlock } from '@/components/SkeletonCard';
import { COLORS } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useScreenData } from '@/hooks/useScreenData';
import { CustomerService } from '@/service/customerService';
import { CustomerListItem } from '@/types/Customer';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { AlertCircle, CircleCheck, Users } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, ListRenderItemInfo, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';

const CUSTOMER_PAGE_SIZE = 25;
type CustomerFilter = 'todos' | 'devedores' | 'em_dia';

interface CustomerSummary {
  totalCustomers: number;
  debtors: number;
  current: number;
  totalOwed: number;
  totalPaid: number;
}

function CustomerListHeader({
  summary,
  filter,
  search,
  queryLoading,
  onSearchChange,
  onFilterChange,
}: {
  summary: CustomerSummary;
  filter: CustomerFilter;
  search: string;
  queryLoading: boolean;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: CustomerFilter) => void;
}) {
  return (
    <View>
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <View style={[styles.summaryIconContainer, styles.summaryIconCustomers]}>
            <Users size={22} color={COLORS.mediumBlue} strokeWidth={2.2} />
          </View>
          <Text style={styles.summaryValue}>{summary.totalCustomers}</Text>
          <Text style={styles.summaryLabel}>Clientes Ativos</Text>
        </View>
        <View style={styles.summaryCard}>
          <View style={[styles.summaryIconContainer, styles.summaryIconDebtors]}>
            <AlertCircle size={22} color={COLORS.error} strokeWidth={2.2} />
          </View>
          <Text style={styles.summaryValue}>{summary.debtors}</Text>
          <Text style={styles.summaryLabel}>Devedores</Text>
          <Text style={styles.summarySubtext}>R$ {summary.totalOwed.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <View style={[styles.summaryIconContainer, styles.summaryIconCurrent]}>
            <CircleCheck size={22} color={COLORS.green} strokeWidth={2.2} />
          </View>
          <Text style={styles.summaryValue}>{summary.current}</Text>
          <Text style={styles.summaryLabel}>Em Dia</Text>
          <Text style={styles.summarySubtext}>R$ {summary.totalPaid.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <TextInput
          value={search}
          onChangeText={onSearchChange}
          style={styles.searchInput}
          mode="outlined"
          placeholder="Buscar cliente..."
          outlineColor="#d1d5db"
          activeOutlineColor="#2563eb"
          left={<TextInput.Icon icon="magnify" />}
        />
        <View style={styles.filterButtons}>
          {[
            { key: 'todos' as const, label: 'Todos', count: summary.totalCustomers },
            { key: 'devedores' as const, label: 'Devedores', count: summary.debtors },
            { key: 'em_dia' as const, label: 'Em Dia', count: summary.current },
          ].map(({ key, label, count }) => (
            <TouchableOpacity
              key={key}
              onPress={() => onFilterChange(key)}
              style={[styles.filterButton, filter === key && styles.filterButtonActive]}
            >
              <Text
                numberOfLines={1}
                style={[styles.filterText, filter === key && styles.filterTextActive]}
              >
                {label} ({count})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.listSectionHeader}>
        <Text numberOfLines={1} style={styles.sectionTitle}>
          {filter === 'todos' ? 'Todos os clientes' :
            filter === 'devedores' ? 'Clientes devedores' : 'Clientes em dia'}
        </Text>
        {queryLoading && (
          <View style={styles.queryLoading}>
            <ActivityIndicator size="small" color={COLORS.mediumBlue} />
            <Text style={styles.queryLoadingText}>Atualizando...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function CustomersScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [filter, setFilter] = useState<CustomerFilter>('todos');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [queryLoading, setQueryLoading] = useState(false);
  const [summary, setSummary] = useState<CustomerSummary>({ totalCustomers: 0, debtors: 0, current: 0, totalOwed: 0, totalPaid: 0 });
  const queryRequestIdRef = useRef(0);
  const queryInitializedRef = useRef(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timeoutId);
  }, [search]);

  const statusFilter = filter === 'todos' ? undefined : filter === 'devedores' ? 'devedor' : 'em_dia';

  const loadData = useCallback(async () => {
    const requestId = ++queryRequestIdRef.current;
    try {
      const [page, stats] = await Promise.all([
        CustomerService.getPage(user!.id, { limit: CUSTOMER_PAGE_SIZE, search: debouncedSearch, status: statusFilter }),
        CustomerService.getStats(user!.id),
      ]);
      if (requestId !== queryRequestIdRef.current) return;
      setCustomers(page.items);
      setHasMore(page.hasMore);
      setSummary({
        totalCustomers: stats.totalCustomers,
        debtors: stats.totalDebtors,
        current: stats.totalCustomers - stats.totalDebtors,
        totalOwed: stats.totalAmountOwed,
        totalPaid: stats.totalPaid,
      });
    } catch (error) {
      console.error('Erro ao carregar dados dos clientes:', error);
    }
  }, [debouncedSearch, statusFilter, user]);

  const { loading, refreshing, onRefresh } = useScreenData(loadData);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleFilterChange = useCallback((nextFilter: CustomerFilter) => {
    if (nextFilter === filter) return;
    setQueryLoading(true);
    setFilter(nextFilter);
  }, [filter]);

  useEffect(() => {
    if (!queryInitializedRef.current) {
      queryInitializedRef.current = true;
      return;
    }

    let active = true;
    const requestId = ++queryRequestIdRef.current;
    setQueryLoading(true);
    CustomerService.getPage(user!.id, { limit: CUSTOMER_PAGE_SIZE, search: debouncedSearch, status: statusFilter })
      .then(page => {
        if (!active || requestId !== queryRequestIdRef.current) return;
        setCustomers(page.items);
        setHasMore(page.hasMore);
      })
      .catch(error => console.error('Erro ao filtrar clientes:', error))
      .finally(() => {
        if (active && requestId === queryRequestIdRef.current) setQueryLoading(false);
      });

    return () => { active = false; };
  }, [debouncedSearch, statusFilter, user]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    const requestId = ++queryRequestIdRef.current;
    setLoadingMore(true);
    try {
      const page = await CustomerService.getPage(user!.id, {
        limit: CUSTOMER_PAGE_SIZE,
        offset: customers.length,
        search: debouncedSearch,
        status: statusFilter,
      });
      if (requestId !== queryRequestIdRef.current) return;
      setCustomers(current => [...current, ...page.items]);
      setHasMore(page.hasMore);
    } catch (error) {
      console.error('Erro ao carregar mais clientes:', error);
    } finally {
      if (requestId === queryRequestIdRef.current) setLoadingMore(false);
    }
  }, [customers.length, debouncedSearch, hasMore, loading, loadingMore, statusFilter, user]);

  const renderCustomer = useCallback(({ item: customer }: ListRenderItemInfo<CustomerListItem>) => (
    <TouchableOpacity style={styles.customerCard} onPress={() => router.push(`/customers/${encodeURIComponent(customer.name)}` as any)}>
      <View style={styles.customerHeader}>
        <View style={styles.customerInfo}>
          <Text numberOfLines={2} ellipsizeMode="tail" style={styles.customerName}>{customer.name}</Text>
          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.customerMeta}>
            {`${customer.purchase_count} compra${customer.purchase_count !== 1 ? 's' : ''}${customer.last_purchase ? ` \u2022 \u00DAltima: ${format(parseISO(customer.last_purchase), 'dd/MM', { locale: ptBR })}` : ''}`}
          </Text>
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, customer.status === 'devedor' && styles.statusDebtor, customer.status === 'em_dia' && styles.statusCurrent]}>
            <Text style={[styles.statusText, customer.status === 'devedor' && styles.statusTextDebtor, customer.status === 'em_dia' && styles.statusTextCurrent]}>
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
  ), [router]);

  return (
    <View style={styles.container}>
      <Header title="Clientes" actions={<ConfigMenuButton />} />
      <View style={styles.contentHost}>
        {loading ? (
          <ScrollView scrollEnabled={false} style={styles.loadingScroll} contentContainerStyle={styles.content}>
          <View style={styles.summaryContainer}>
            {[1, 2, 3].map(i => (
              <View key={i} style={styles.summaryCard}>
                <SkeletonBlock width={40} height={40} style={{ borderRadius: 12, marginBottom: 8 }} />
                <SkeletonBlock width="70%" height={24} style={{ marginBottom: 4 }} />
                <SkeletonBlock width="85%" height={12} style={{ marginBottom: 4 }} />
                <SkeletonBlock width="60%" height={11} />
              </View>
            ))}
          </View>
          <View style={styles.filtersContainer}>
            <SkeletonBlock width="100%" height={56} style={{ borderRadius: 4, marginBottom: 12 }} />
            <View style={styles.filterButtons}>
              {[1, 2, 3].map(i => <View key={i} style={{ flex: 1 }}><SkeletonBlock width="100%" height={42} style={{ borderRadius: 8 }} /></View>)}
            </View>
          </View>
          <View style={styles.listSection}>
            <SkeletonBlock width="50%" height={16} style={{ marginBottom: 16 }} />
            {[1, 2, 3].map(i => (
              <View key={i} style={[styles.customerCard, i < 3 && { marginBottom: 12 }]}>
                <View style={styles.customerHeader}>
                  <View style={styles.customerInfo}><SkeletonBlock width="55%" height={16} style={{ marginBottom: 4 }} /><SkeletonBlock width="75%" height={12} /></View>
                  <View style={styles.statusContainer}><SkeletonBlock width={60} height={22} style={{ borderRadius: 10, marginBottom: 6 }} /><SkeletonBlock width={80} height={14} /></View>
                </View>
              </View>
            ))}
          </View>
          </ScrollView>
        ) : (
          <FlatList
            data={customers}
            keyExtractor={customer => customer.id}
            renderItem={renderCustomer}
            style={styles.listContainer}
            contentContainerStyle={styles.content}
            removeClippedSubviews={false}
            ListHeaderComponent={<CustomerListHeader summary={summary} filter={filter} search={search} queryLoading={queryLoading} onSearchChange={handleSearchChange} onFilterChange={handleFilterChange} />}
            ListEmptyComponent={
              <View style={styles.listSection}>
                <View style={styles.emptyState}>
                  <View style={[styles.emptyIconContainer, styles.summaryIconCustomers]}><Users size={32} color={COLORS.mediumBlue} strokeWidth={2} /></View>
                  <Text style={styles.emptyText}>{search ? 'Nenhum cliente encontrado' : 'Nenhum cliente nesta categoria'}</Text>
                  <Text style={styles.emptySubtext}>{search ? 'Tente outro termo de busca' : 'Clientes aparecer\u00E3o aqui quando houverem vendas'}</Text>
                </View>
              </View>
            }
            ListFooterComponent={loadingMore ? <ActivityIndicator color={COLORS.mediumBlue} style={styles.listFooter} /> : null}
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.softGray },
  contentHost: { flex: 1 },
  content: { padding: 16 },
  loadingScroll: { flex: 1 },
  listContainer: { flex: 1 },
  listFooter: { paddingVertical: 16 },
  summaryContainer: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  summaryCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderGray, padding: 16, alignItems: 'center' },
  summaryIconContainer: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  summaryIconCustomers: { backgroundColor: '#EFF6FF' },
  summaryIconDebtors: { backgroundColor: '#FEF2F2' },
  summaryIconCurrent: { backgroundColor: '#ECFDF5' },
  summaryValue: { fontSize: 24, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 4 },
  summaryLabel: { fontSize: 12, color: COLORS.textMedium, fontWeight: '600', textAlign: 'center' },
  summarySubtext: { fontSize: 11, color: COLORS.textLight, textAlign: 'center' },
  filtersContainer: { marginBottom: 8 },
  searchInput: { backgroundColor: COLORS.white, marginBottom: 12 },
  filterButtons: { flexDirection: 'row', gap: 8 },
  filterButton: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 2, borderColor: COLORS.borderGray, backgroundColor: COLORS.white, alignItems: 'center' },
  filterButtonActive: { borderColor: COLORS.mediumBlue, backgroundColor: COLORS.mediumBlue },
  filterText: { fontSize: 12, fontWeight: '600', color: COLORS.textMedium },
  filterTextActive: { color: COLORS.white },
  listSection: { backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderGray, padding: 20 },
  listSectionHeader: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingVertical: 4, marginBottom: 4 },
  sectionTitle: { flex: 1, fontSize: 16, fontWeight: 'bold', color: COLORS.textDark },
  queryLoading: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 12 },
  queryLoadingText: { fontSize: 12, color: COLORS.textMedium },
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyIconContainer: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  emptyText: { fontSize: 15, fontWeight: '600', color: COLORS.textDark, marginBottom: 4 },
  emptySubtext: { fontSize: 13, color: COLORS.textMedium, textAlign: 'center' },
  customerCard: { backgroundColor: COLORS.white, borderRadius: 10, borderWidth: 1, borderColor: COLORS.borderGray, padding: 14, marginTop: 8 },
  customerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  customerInfo: { flex: 1, minWidth: 0, paddingRight: 12 },
  customerName: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 4, flexShrink: 1 },
  customerMeta: { fontSize: 12, color: COLORS.textMedium, flexShrink: 1 },
  statusContainer: { alignItems: 'flex-end', flexShrink: 0 },
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
