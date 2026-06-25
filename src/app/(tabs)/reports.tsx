import ConfigMenuButton from '@/components/ConfigMenuButton';
import Header from '@/components/Header';
import { SkeletonBlock } from '@/components/SkeletonCard';
import { COLORS } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useScreenData } from '@/hooks/useScreenData';
import { ReportService } from '@/service/reportService';
import { ReportResponse } from '@/types/Report';
import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

export default function ReportsScreen() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [report, setReport] = useState<ReportResponse | null>(null);

  const loadReport = async () => {
    try {
      const data = await ReportService.generate(user!.id, { period });
      setReport(data);
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
    }
  };

  const { loading, refreshing, onRefresh } = useScreenData(loadReport, [period]);

  return (
    <View style={styles.container}>
      <Header title="Relatórios" subtitle="Análise de desempenho" actions={<ConfigMenuButton />} />
      <View style={styles.periodWrapper}>
        <View style={styles.periodContainer}>
          {([
            { value: 'day', label: 'Hoje' },
            { value: 'week', label: 'Semana' },
            { value: 'month', label: 'Mês' },
          ] as const).map(({ value, label }) => (
            <TouchableOpacity
              key={value}
              onPress={() => setPeriod(value)}
              style={[styles.periodButton, period === value && styles.periodButtonActive]}
            >
              <Text style={[styles.periodText, period === value && styles.periodTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <ScrollView scrollEnabled={false} style={styles.content}>
          <View style={styles.summaryGrid}>
            {[1, 2, 3].map(i => (
              <View key={i} style={styles.summaryCard}>
                <SkeletonBlock width={40} height={40} style={{ borderRadius: 10, marginBottom: 12 }} />
                <SkeletonBlock width="60%" height={12} style={{ marginBottom: 4 }} />
                <SkeletonBlock width="80%" height={20} style={{ marginBottom: 4 }} />
                <SkeletonBlock width="50%" height={11} />
              </View>
            ))}
          </View>
          <View style={styles.topProductsSection}>
            <View style={styles.sectionHeader}>
              <SkeletonBlock width="55%" height={16} />
              <SkeletonBlock width={30} height={22} style={{ borderRadius: 12 }} />
            </View>
            <View style={styles.productsList}>
              {[1, 2, 3].map(i => (
                <View key={i} style={styles.productItem}>
                  <SkeletonBlock width={32} height={32} style={{ borderRadius: 16 }} />
                  <View style={styles.productInfo}>
                    <SkeletonBlock width="65%" height={14} style={{ marginBottom: 2 }} />
                    <SkeletonBlock width="40%" height={12} />
                  </View>
                  <SkeletonBlock width={60} height={15} />
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : !report ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Erro ao carregar relatório</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadReport}>
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <View style={styles.content}>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <View style={styles.summaryIconContainer}>
                  <Text style={styles.summaryIcon}>💰</Text>
                </View>
                <Text style={styles.summaryLabel}>Total Vendido</Text>
                <Text style={styles.summaryValue}>R$ {report.totalSold.toFixed(2)}</Text>
                <Text style={styles.summarySubtext}>{report.quantitySold} unidades</Text>
              </View>
              <View style={styles.summaryCard}>
                <View style={styles.summaryIconContainer}>
                  <Text style={styles.summaryIcon}>⏱️</Text>
                </View>
                <Text style={styles.summaryLabel}>Pendente</Text>
                <Text style={styles.summaryValue}>R$ {report.totalPending.toFixed(2)}</Text>
                <Text style={styles.summarySubtext}>A receber</Text>
              </View>
              <View style={styles.summaryCard}>
                <View style={styles.summaryIconContainer}>
                  <Text style={styles.summaryIcon}>📦</Text>
                </View>
                <Text style={styles.summaryLabel}>Quantidade</Text>
                <Text style={styles.summaryValue}>{report.quantitySold}</Text>
                <Text style={styles.summarySubtext}>unidades</Text>
              </View>
            </View>

            {report.topProducts.length > 0 && (
              <View style={styles.topProductsSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Produtos Mais Vendidos</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{report.topProducts.length}</Text>
                  </View>
                </View>
                <View style={styles.productsList}>
                  {report.topProducts.map((item, index) => (
                    <View key={index} style={styles.productItem}>
                      <View style={styles.productRank}>
                        <Text style={styles.productRankText}>#{index + 1}</Text>
                      </View>
                      <View style={styles.productInfo}>
                        <Text style={styles.productName}>{item.product}</Text>
                        <Text style={styles.productQuantity}>{item.quantity} unidades</Text>
                      </View>
                      <Text style={styles.productValue}>R$ {item.totalValue.toFixed(2)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
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
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { fontSize: 16, color: COLORS.textMedium, marginBottom: 16 },
  retryButton: { backgroundColor: COLORS.mediumBlue, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryButtonText: { color: COLORS.white, fontWeight: 'bold' },
  periodWrapper: { paddingHorizontal: 16, paddingTop: 16 },
  periodContainer: { flexDirection: 'row', gap: 8, marginBottom: 16, backgroundColor: COLORS.white, padding: 4, borderRadius: 10, borderWidth: 1, borderColor: COLORS.borderGray },
  periodButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  periodButtonActive: { backgroundColor: COLORS.mediumBlue },
  periodText: { fontSize: 14, fontWeight: '600', color: COLORS.textMedium },
  periodTextActive: { color: COLORS.white },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  summaryCard: { width: '48%', backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderGray, padding: 16 },
  summaryIconContainer: { width: 40, height: 40, backgroundColor: COLORS.softGray, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  summaryIcon: { fontSize: 20 },
  summaryLabel: { fontSize: 12, color: COLORS.textMedium, fontWeight: '600', marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 4 },
  summarySubtext: { fontSize: 11, color: COLORS.textMedium },
  topProductsSection: { backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderGray, padding: 20, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark },
  badge: { backgroundColor: COLORS.softGray, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderGray },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: COLORS.mediumBlue },
  productsList: { gap: 12 },
  productItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: COLORS.softGray, borderRadius: 8, borderWidth: 1, borderColor: COLORS.borderGray, gap: 12 },
  productRank: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.mediumBlue, justifyContent: 'center', alignItems: 'center' },
  productRankText: { fontSize: 12, fontWeight: 'bold', color: COLORS.white },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '600', color: COLORS.textDark, marginBottom: 2 },
  productQuantity: { fontSize: 12, color: COLORS.textMedium },
  productValue: { fontSize: 15, fontWeight: 'bold', color: COLORS.textDark },
});
