import ConfigMenuButton from '@/components/ConfigMenuButton';
import Header from '@/components/Header';
import SaleCard from '@/components/SaleCard';
import SkeletonCard, { SkeletonBlock } from '@/components/SkeletonCard';
import { COLORS } from '@/constants/Colors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useScreenData } from '@/hooks/useScreenData';
import { ProductService } from '@/service/productService';
import { ReportService } from '@/service/reportService';
import { SaleService } from '@/service/saleService';
import { Product } from '@/types/Product';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { state, dispatch, reloadProfile } = useApp();
  const router = useRouter();
  const [products, setProducts] = useState<{ [key: string]: Product }>({});
  const [kpis, setKpis] = useState({
    totalSold: 0,
    totalPending: 0,
    progressPaid: 0,
    progressTotal: 0,
  });
  const [dailyGoal, setDailyGoal] = useState(200);

  const loadData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const recentSales = await SaleService.getRecent(user!.id, 10);
      dispatch({ type: 'SET_SALES', payload: recentSales });

      const productIds = [
        ...new Set(
          recentSales
            .flatMap(s => s.items.map(item => item.product_id))
            .filter((id): id is string => id !== null)
        ),
      ];
      const productsMap: { [key: string]: Product } = {};
      for (const id of productIds) {
        const product = await ProductService.getById(user!.id, id);
        if (product) productsMap[id] = product;
      }
      setProducts(productsMap);

      const freshProfile = await reloadProfile();

      const report = await ReportService.generate(user!.id, {
        period: 'day',
        startDate: today,
        endDate: today,
      });

      const goal = freshProfile?.daily_goal ?? 200;
      setDailyGoal(goal);
      const totalGeneral = report.totalSold + report.totalPending;

      setKpis({
        totalSold: report.totalSold,
        totalPending: report.totalPending,
        progressPaid: Math.min((report.totalSold / goal) * 100, 100),
        progressTotal: Math.min((totalGeneral / goal) * 100, 100),
      });
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    }
  };

  const { loading, refreshing, onRefresh } = useScreenData(loadData);

  const getProductName = (productId: string | null, item?: { product_type?: string; product_flavor?: string }) => {
    const product = productId ? products[productId] : undefined;
    if (product) return `${product.type} ${product.flavor}`;
    if (item?.product_type && item?.product_flavor) return `${item.product_type} ${item.product_flavor}`;
    return 'Produto removido';
  };

  return (
    <View style={styles.container}>
      <Header
        title="Dashboard"
        subtitle={format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
        actions={<ConfigMenuButton />}
      />
      {loading ? (
        <ScrollView scrollEnabled={false} style={styles.content}>
          <View style={styles.kpiContainer}>
            {[1, 2].map(i => (
              <View key={i} style={styles.kpiCard}>
                <SkeletonBlock width={40} height={40} style={{ borderRadius: 10, marginBottom: 12 }} />
                <SkeletonBlock width="60%" height={12} style={{ marginBottom: 4 }} />
                <SkeletonBlock width="80%" height={20} style={{ marginBottom: 4 }} />
                <SkeletonBlock width="50%" height={11} />
              </View>
            ))}
          </View>
          <View style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <SkeletonBlock width="40%" height={16} />
              <SkeletonBlock width={48} height={24} />
            </View>
            <SkeletonBlock width="100%" height={12} style={{ borderRadius: 6, marginBottom: 12 }} />
            <SkeletonBlock width="55%" height={12} style={{ marginBottom: 4 }} />
            <SkeletonBlock width="65%" height={12} style={{ marginBottom: 4 }} />
            <SkeletonBlock width="75%" height={12} />
          </View>
          <View style={styles.salesSection}>
            <View style={styles.sectionHeader}>
              <SkeletonBlock width="45%" height={16} />
              <SkeletonBlock width={30} height={22} style={{ borderRadius: 12 }} />
            </View>
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} style={{ marginTop: 12 }} />
          </View>
        </ScrollView>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <View style={styles.content}>
            <View style={styles.kpiContainer}>
              <View style={styles.kpiCard}>
                <View style={styles.kpiIconContainer}>
                  <Text style={styles.kpiIcon}>💰</Text>
                </View>
                <Text style={styles.kpiLabel}>Total Vendido</Text>
                <Text style={styles.kpiValue}>R$ {kpis.totalSold.toFixed(2)}</Text>
                <Text style={styles.kpiSubtext}>
                  {state.sales.filter(s => s.status === 'OK').length} vendas
                </Text>
              </View>
              <View style={styles.kpiCard}>
                <View style={styles.kpiIconContainer}>
                  <Text style={styles.kpiIcon}>⏱️</Text>
                </View>
                <Text style={styles.kpiLabel}>Pendente</Text>
                <Text style={styles.kpiValue}>R$ {kpis.totalPending.toFixed(2)}</Text>
                <Text style={styles.kpiSubtext}>
                  {state.sales.filter(s => s.status === 'PENDENTE').length} vendas
                </Text>
              </View>
            </View>

            <View style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <Text style={styles.goalTitle}>Meta Diária</Text>
                <Text style={styles.goalPercentage}>{kpis.progressTotal.toFixed(0)}%</Text>
              </View>
              <View style={styles.progressContainer}>
                <View style={[styles.progressFillPending, { width: `${kpis.progressTotal}%` }]} />
                <View style={[styles.progressFillPaid, { width: `${kpis.progressPaid}%` }]} />
              </View>
              <View style={styles.goalFooter}>
                <Text style={[styles.goalText, styles.goalTextPaid]}>Pago: R$ {kpis.totalSold.toFixed(2)}</Text>
                <Text style={[styles.goalText, styles.goalTextPending]}>Pendente: R$ {kpis.totalPending.toFixed(2)}</Text>
                <Text style={styles.goalText}>
                  Total: R$ {(kpis.totalSold + kpis.totalPending).toFixed(2)} de R$ {dailyGoal.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.salesSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Vendas Recentes</Text>
                {state.sales.length > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{state.sales.length}</Text>
                  </View>
                )}
              </View>

              {state.sales.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>📝</Text>
                  <Text style={styles.emptyText}>Nenhuma venda hoje</Text>
                  <Text style={styles.emptySubtext}>Registre sua primeira venda</Text>
                </View>
              ) : (
                <View style={styles.salesList}>
                  {state.sales.map((sale) => (
                    <SaleCard
                      key={sale.id}
                      sale={sale}
                      getProductName={getProductName}
                      showDate={true}
                    />
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      )}

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/sales/new')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.softGray },
  content: { padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
  kpiContainer: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  kpiCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderGray, padding: 16 },
  kpiIconContainer: { width: 40, height: 40, backgroundColor: COLORS.softGray, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  kpiIcon: { fontSize: 20 },
  kpiLabel: { fontSize: 12, color: COLORS.textMedium, fontWeight: '600', marginBottom: 4 },
  kpiValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 4 },
  kpiSubtext: { fontSize: 11, color: COLORS.textMedium },
  goalCard: { backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderGray, padding: 20, marginBottom: 16 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  goalTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark },
  goalPercentage: { fontSize: 24, fontWeight: 'bold', color: COLORS.mediumBlue },
  progressContainer: { height: 12, backgroundColor: COLORS.borderGray, borderRadius: 6, overflow: 'hidden', marginBottom: 12 },
  progressFillPaid: { height: '100%', backgroundColor: COLORS.mediumBlue, borderRadius: 6, position: 'absolute', top: 0, left: 0 },
  progressFillPending: { height: '100%', backgroundColor: COLORS.warning, borderRadius: 6, position: 'absolute', top: 0, left: 0 },
  goalFooter: { flexDirection: 'column', gap: 4 },
  goalText: { fontSize: 12, color: COLORS.textMedium, fontWeight: '500' },
  goalTextPaid: { color: COLORS.mediumBlue, fontWeight: '600' },
  goalTextPending: { color: COLORS.warning, fontWeight: '600' },
  fab: { position: 'absolute', bottom: 16, right: 16, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.mediumBlue, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  fabText: { fontSize: 32, color: COLORS.white, fontWeight: '300' },
  salesSection: { backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderGray, padding: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark },
  badge: { backgroundColor: COLORS.softGray, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderGray },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: COLORS.mediumBlue },
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, fontWeight: '600', color: COLORS.textDark, marginBottom: 4 },
  emptySubtext: { fontSize: 13, color: COLORS.textMedium },
  salesList: { gap: 12 },
});
