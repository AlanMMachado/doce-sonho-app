import ConfigMenuButton from '@/components/ConfigMenuButton';
import Header from '@/components/Header';
import { SkeletonBlock } from '@/components/SkeletonCard';
import { COLORS } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useScreenData } from '@/hooks/useScreenData';
import { ReportService } from '@/service/reportService';
import { ReportResponse } from '@/types/Report';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Line, Polyline } from 'react-native-svg';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function SalesChart({ report }: { report: ReportResponse }) {
  const width = 340;
  const height = 180;
  const padding = { top: 12, right: 12, bottom: 28, left: 12 };
  const maxValue = Math.max(...report.series.map(point => point.value), 1);
  const points = report.series.map((point, index) => {
    const x = padding.left + (index / Math.max(report.series.length - 1, 1)) * (width - padding.left - padding.right);
    const y = padding.top + (1 - point.value / maxValue) * (height - padding.top - padding.bottom);
    return `${x},${y}`;
  }).join(' ');
  const labels = report.series.length <= 12 ? report.series : report.series.filter((_, index) => index % 5 === 0 || index === report.series.length - 1);

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke={COLORS.borderGray} />
        <Line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke={COLORS.borderGray} strokeDasharray="4 4" />
        <Polyline points={points} fill="none" stroke={COLORS.mediumBlue} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
      <View style={styles.chartLabels}>
        {labels.map(point => <Text key={point.label} style={styles.chartLabel}>{point.label}</Text>)}
      </View>
    </View>
  );
}

export default function ReportsScreen() {
  const { user } = useAuth();
  const now = new Date();
  const [view, setView] = useState<'month' | 'year'>('month');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [report, setReport] = useState<ReportResponse | null>(null);

  const loadReport = async () => {
    try {
      const data = await ReportService.generate(user!.id, { view, year, month });
      setReport(data);
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
    }
  };

  const { loading, refreshing, onRefresh } = useScreenData(loadReport, [view, year, month]);
  const periodLabel = view === 'year' ? String(year) : `${MONTHS[month - 1]} ${year}`;
  const canGoForward = view === 'year' ? year < now.getFullYear() : year < now.getFullYear() || month < now.getMonth() + 1;

  const changePeriod = (direction: -1 | 1) => {
    if (view === 'year') {
      setYear(current => current + direction);
      return;
    }
    const nextMonth = month + direction;
    if (nextMonth < 1) {
      setMonth(12);
      setYear(current => current - 1);
    } else if (nextMonth > 12) {
      setMonth(1);
      setYear(current => current + 1);
    } else {
      setMonth(nextMonth);
    }
  };

  const totalChart = useMemo(() => report?.series.reduce((sum, point) => sum + point.value, 0) ?? 0, [report]);

  return (
    <View style={styles.container}>
      <Header title="Relatórios" actions={<ConfigMenuButton />} />
      <View style={styles.periodWrapper}>
        <View style={styles.periodContainer}>
          {(['month', 'year'] as const).map(option => (
            <TouchableOpacity key={option} onPress={() => setView(option)} style={[styles.periodButton, view === option && styles.periodButtonActive]}>
              <Text style={[styles.periodText, view === option && styles.periodTextActive]}>{option === 'month' ? 'Mês' : 'Ano'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.dateSelector}>
          <TouchableOpacity onPress={() => changePeriod(-1)} accessibilityLabel="Período anterior">
            <ChevronLeft color={COLORS.mediumBlue} size={22} />
          </TouchableOpacity>
          <Text style={styles.dateLabel}>{periodLabel}</Text>
          <TouchableOpacity onPress={() => changePeriod(1)} disabled={!canGoForward} accessibilityLabel="Próximo período">
            <ChevronRight color={canGoForward ? COLORS.mediumBlue : COLORS.borderGray} size={22} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ScrollView scrollEnabled={false} style={styles.content}>
          <View style={styles.summaryGrid}>{[1, 2, 3].map(i => <View key={i} style={styles.summaryCard}><SkeletonBlock width={40} height={40} style={styles.skeletonIcon} /><SkeletonBlock width="60%" height={12} style={styles.skeletonSpacing} /><SkeletonBlock width="80%" height={20} style={styles.skeletonSpacing} /><SkeletonBlock width="50%" height={11} /></View>)}</View>
          <View style={styles.sectionCard}><SkeletonBlock width="55%" height={16} style={styles.skeletonSpacing} /><SkeletonBlock width="100%" height={160} /></View>
        </ScrollView>
      ) : !report ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Erro ao carregar relatório</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadReport}><Text style={styles.retryButtonText}>Tentar Novamente</Text></TouchableOpacity>
        </View>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <View style={styles.content}>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}><Text style={styles.summaryIcon}>💰</Text><Text style={styles.summaryLabel}>Total Vendido</Text><Text style={styles.summaryValue}>R$ {report.totalSold.toFixed(2)}</Text><Text style={styles.summarySubtext}>{report.quantitySold} unidades</Text></View>
              <View style={styles.summaryCard}><Text style={styles.summaryIcon}>⏱️</Text><Text style={styles.summaryLabel}>Pendente</Text><Text style={styles.summaryValue}>R$ {report.totalPending.toFixed(2)}</Text><Text style={styles.summarySubtext}>A receber</Text></View>
              <View style={styles.summaryCard}><Text style={styles.summaryIcon}>📦</Text><Text style={styles.summaryLabel}>Quantidade</Text><Text style={styles.summaryValue}>{report.quantitySold}</Text><Text style={styles.summarySubtext}>unidades</Text></View>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Vendas no período</Text><Text style={styles.sectionSubtitle}>R$ {totalChart.toFixed(2)} em vendas</Text></View><Text style={styles.chartUnit}>{view === 'year' ? 'por mês' : 'por dia'}</Text></View>
              <SalesChart report={report} />
            </View>

            {report.topCustomers.length > 0 && <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Melhores Clientes</Text><View style={styles.badge}><Text style={styles.badgeText}>Top 3</Text></View></View>
              {report.topCustomers.map((customer, index) => <View key={customer.customerId} style={styles.customerItem}><View style={styles.productRank}><Text style={styles.productRankText}>#{index + 1}</Text></View><View style={styles.productInfo}><Text style={styles.productName} numberOfLines={1}>{customer.customerName}</Text><Text style={styles.productQuantity}>{customer.purchaseCount} {customer.purchaseCount === 1 ? 'compra' : 'compras'}</Text></View><Text style={styles.productValue}>R$ {customer.totalSpent.toFixed(2)}</Text></View>)}
            </View>}

            {report.topProducts.length > 0 && <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Produtos Mais Vendidos</Text><View style={styles.badge}><Text style={styles.badgeText}>{report.topProducts.length}</Text></View></View>
              {report.topProducts.map((item, index) => <View key={item.product} style={styles.customerItem}><View style={styles.productRank}><Text style={styles.productRankText}>#{index + 1}</Text></View><View style={styles.productInfo}><Text style={styles.productName}>{item.product}</Text><Text style={styles.productQuantity}>{item.quantity} unidades</Text></View><Text style={styles.productValue}>R$ {item.totalValue.toFixed(2)}</Text></View>)}
            </View>}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.softGray },
  content: { padding: 16 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { fontSize: 16, color: COLORS.textMedium, marginBottom: 16 },
  retryButton: { backgroundColor: COLORS.mediumBlue, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryButtonText: { color: COLORS.white, fontWeight: 'bold' },
  periodWrapper: { paddingHorizontal: 16, paddingTop: 16 },
  periodContainer: { flexDirection: 'row', gap: 8, backgroundColor: COLORS.white, padding: 4, borderRadius: 10, borderWidth: 1, borderColor: COLORS.borderGray },
  periodButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  periodButtonActive: { backgroundColor: COLORS.mediumBlue },
  periodText: { fontSize: 14, fontWeight: '600', color: COLORS.textMedium },
  periodTextActive: { color: COLORS.white },
  dateSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.white, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginTop: 10, marginBottom: 5, borderWidth: 1, borderColor: COLORS.borderGray },
  dateLabel: { color: COLORS.textDark, fontWeight: '700', fontSize: 15 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  summaryCard: { width: '48%', backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderGray, padding: 14 },
  summaryIcon: { fontSize: 25, marginBottom: 8 },
  summaryLabel: { fontSize: 12, color: COLORS.textMedium },
  summaryValue: { fontSize: 17, fontWeight: '700', color: COLORS.textDark, marginTop: 4 },
  summarySubtext: { fontSize: 11, color: COLORS.textLight, marginTop: 3 },
  sectionCard: { backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderGray, padding: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textDark },
  sectionSubtitle: { fontSize: 12, color: COLORS.textMedium, marginTop: 3 },
  chartUnit: { fontSize: 11, color: COLORS.textMedium },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12 },
  chartLabel: { fontSize: 10, color: COLORS.textLight },
  badge: { backgroundColor: COLORS.softGray, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: COLORS.mediumBlue, fontSize: 11, fontWeight: '700' },
  customerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.softGray },
  productRank: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.softGray, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  productRankText: { color: COLORS.mediumBlue, fontSize: 12, fontWeight: '700' },
  productInfo: { flex: 1, minWidth: 0 },
  productName: { color: COLORS.textDark, fontSize: 14, fontWeight: '600' },
  productQuantity: { color: COLORS.textMedium, fontSize: 12, marginTop: 2 },
  productValue: { color: COLORS.textDark, fontSize: 13, fontWeight: '700', marginLeft: 8 },
  skeletonIcon: { borderRadius: 10, marginBottom: 12 },
  skeletonSpacing: { marginBottom: 6 },
});
