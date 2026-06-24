import ConfigMenuButton from '@/components/ConfigMenuButton';
import Header from '@/components/Header';
import ModernModal from '@/components/ModernModal';
import SkeletonCard from '@/components/SkeletonCard';
import { COLORS } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useScreenData } from '@/hooks/useScreenData';
import { ShipmentService } from '@/service/shipmentService';
import { Shipment } from '@/types/Shipment';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { Edit, Power, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

export default function ShipmentsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);

  const loadShipments = async () => {
    try {
      const data = await ShipmentService.getAll(user!.id);
      setShipments(data);
    } catch (error) {
      console.error('Erro ao carregar remessas:', error);
    }
  };

  const { loading, refreshing, onRefresh } = useScreenData(loadShipments);

  const handleDelete = async () => {
    if (selectedShipmentId) {
      try {
        await ShipmentService.delete(user!.id, selectedShipmentId);
        await loadShipments();
      } catch (error) {
        console.error('Erro ao excluir remessa:', error);
      } finally {
        setDeleteModalVisible(false);
        setSelectedShipmentId(null);
      }
    }
  };

  const handleToggleActive = async (shipmentId: string) => {
    try {
      await ShipmentService.toggleActive(user!.id, shipmentId);
      await loadShipments();
    } catch (error) {
      console.error('Erro ao alterar status da remessa:', error);
    }
  };

  const getShipmentStatus = (shipment: Shipment) => {
    if (!shipment.products || shipment.products.length === 0) return 'Sem produtos';

    const totalInitial = shipment.products.reduce((sum, p) => sum + p.initial_quantity, 0);
    const totalSold = shipment.products.reduce((sum, p) => sum + p.sold_quantity, 0);
    const available = totalInitial - totalSold;

    if (available === 0) return 'Esgotada';
    if (totalSold === 0) return 'Nova';
    return `${available} disponíveis`;
  };

  const getProgressPercentage = (shipment: Shipment) => {
    if (!shipment.products || shipment.products.length === 0) return 0;

    const totalInitial = shipment.products.reduce((sum, p) => sum + p.initial_quantity, 0);
    const totalSold = shipment.products.reduce((sum, p) => sum + p.sold_quantity, 0);

    return totalInitial > 0 ? (totalSold / totalInitial) * 100 : 0;
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'null' || dateString === '') return 'Data não informada';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Remessas"
        subtitle={`${shipments.length} ${shipments.length === 1 ? 'remessa' : 'remessas'}`}
        actions={<ConfigMenuButton />}
      />

      {loading ? (
        <ScrollView scrollEnabled={false} style={styles.content}>
          <SkeletonCard lines={8} hasProgressBar />
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {shipments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>Nenhuma remessa cadastrada</Text>
              <Text style={styles.emptySubtext}>Crie sua primeira remessa para começar</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/shipments/new')}>
                <Text style={styles.emptyButtonText}>+ Criar Primeira Remessa</Text>
              </TouchableOpacity>
            </View>
          ) : (
            shipments.map((shipment) => (
              <TouchableOpacity
                key={shipment.id}
                onPress={() => router.push(`/shipments/${shipment.id}` as any)}
                activeOpacity={0.7}
              >
                <View style={styles.shipmentCard}>
                  <View style={styles.shipmentHeader}>
                    <View style={styles.dateContainer}>
                      <Text style={styles.dateLabel}>Data</Text>
                      <Text style={styles.dateValue}>{formatDate(shipment.date)}</Text>
                    </View>
                    <View style={styles.headerBadges}>
                      <View style={[styles.activeBadge, shipment.active ? styles.activeBadgeOn : styles.activeBadgeOff]}>
                        <Text style={styles.activeBadgeText}>{shipment.active ? 'Ativa' : 'Inativa'}</Text>
                      </View>
                      <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>
                          {shipment.products ? shipment.products.length : 0} produtos
                        </Text>
                      </View>
                    </View>
                  </View>

                  {shipment.notes && (
                    <View style={styles.notesContainer}>
                      <Text style={styles.notesText}>{shipment.notes}</Text>
                    </View>
                  )}

                  {shipment.products && shipment.products.length > 0 && (
                    <View style={styles.progressSection}>
                      <View style={styles.progressInfo}>
                        <Text style={styles.progressLabel}>Progresso</Text>
                        <Text style={styles.progressPercentage}>
                          {getProgressPercentage(shipment).toFixed(0)}%
                        </Text>
                      </View>
                      <View style={styles.progressContainer}>
                        <View style={[styles.progressFill, { width: `${getProgressPercentage(shipment)}%` }]} />
                      </View>
                    </View>
                  )}

                  {shipment.products && shipment.products.length > 0 && (
                    <View style={styles.productsContainer}>
                      {shipment.products.slice(0, 3).map((product) => (
                        <Text key={product.id} style={styles.productBullet}>
                          • {product.type} {product.flavor} - {product.initial_quantity} un
                        </Text>
                      ))}
                      {shipment.products.length > 3 && (
                        <Text style={styles.moreItems}>+ {shipment.products.length - 3} produtos</Text>
                      )}
                    </View>
                  )}

                  <View style={styles.footer}>
                    <Text style={styles.viewDetails}>Ver detalhes →</Text>
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={[styles.toggleButton, { borderColor: shipment.active ? '#16a34a' : '#dc2626' }]}
                        onPress={() => handleToggleActive(shipment.id)}
                      >
                        <Power size={16} color={shipment.active ? '#16a34a' : '#dc2626'} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => router.push(`/shipments/edit?id=${shipment.id}`)}
                      >
                        <Edit size={16} color="#2563eb" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => { setSelectedShipmentId(shipment.id); setDeleteModalVisible(true); }}
                      >
                        <Trash2 size={16} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/shipments/new')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <ModernModal
        visible={deleteModalVisible}
        onClose={() => { setDeleteModalVisible(false); setSelectedShipmentId(null); }}
        title="Excluir Remessa"
        primaryAction={{ label: 'Excluir', onPress: handleDelete, destructive: true }}
        secondaryAction={{ label: 'Cancelar', onPress: () => { setDeleteModalVisible(false); setSelectedShipmentId(null); } }}>
        <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 }}>
          Tem certeza que deseja excluir esta remessa? Os produtos serão removidos, mas o histórico de vendas será preservado.
        </Text>
      </ModernModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.softGray },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
  emptyState: { backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 2, borderColor: COLORS.borderGray, padding: 40, alignItems: 'center' },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 8, textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: COLORS.textMedium, textAlign: 'center', marginBottom: 24 },
  emptyButton: { backgroundColor: COLORS.mediumBlue, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 10 },
  emptyButtonText: { color: COLORS.white, fontSize: 15, fontWeight: 'bold' },
  shipmentCard: { backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderGray, padding: 20, marginBottom: 12 },
  shipmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  dateContainer: { flex: 1 },
  dateLabel: { fontSize: 11, color: COLORS.textMedium, fontWeight: '600', marginBottom: 4 },
  dateValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark },
  headerBadges: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  activeBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  activeBadgeOn: { backgroundColor: COLORS.green },
  activeBadgeOff: { backgroundColor: COLORS.error },
  activeBadgeText: { fontSize: 12, fontWeight: 'bold', color: COLORS.white },
  countBadge: { backgroundColor: COLORS.softGray, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderGray },
  countBadgeText: { fontSize: 12, fontWeight: 'bold', color: COLORS.mediumBlue },
  notesContainer: { backgroundColor: COLORS.softGray, padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: COLORS.borderGray },
  notesText: { fontSize: 13, color: COLORS.textDark },
  progressSection: { marginBottom: 16 },
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textMedium },
  progressPercentage: { fontSize: 14, fontWeight: 'bold', color: COLORS.textDark },
  progressContainer: { height: 8, backgroundColor: COLORS.borderGray, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.mediumBlue, borderRadius: 4 },
  productsContainer: { backgroundColor: COLORS.softGray, padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: COLORS.borderGray },
  productBullet: { fontSize: 13, color: COLORS.textDark, fontWeight: '500', marginBottom: 4 },
  moreItems: { fontSize: 12, color: COLORS.textMedium, fontStyle: 'italic', marginTop: 4 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  viewDetails: { fontSize: 13, fontWeight: 'bold', color: COLORS.mediumBlue },
  cardActions: { flexDirection: 'row', gap: 8 },
  toggleButton: { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  editButton: { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.mediumBlue },
  deleteButton: { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.error },
  fab: { position: 'absolute', bottom: 16, right: 16, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.mediumBlue, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  fabText: { fontSize: 32, color: COLORS.white, fontWeight: '300' },
});
