import ConfirmationModal from '@/components/ConfirmationModal';
import Header from '@/components/Header';
import { COLORS } from '@/constants/Colors';
import { RemessaService } from '@/service/remessaService';
import { Remessa } from '@/types/Remessa';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { Edit, Power, Trash2 } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

export default function RemessasScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [remessas, setRemessas] = useState<Remessa[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedRemessaId, setSelectedRemessaId] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      carregarRemessas();
    }, [])
  );

  const carregarRemessas = async () => {
    try {
      setLoading(true);
      const todasRemessas = await RemessaService.getAll();
      setRemessas(todasRemessas);
    } catch (error) {
      console.error('Erro ao carregar remessas:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await carregarRemessas();
    setRefreshing(false);
  };

  const handleDelete = async () => {
    if (selectedRemessaId) {
      try {
        await RemessaService.delete(selectedRemessaId);
        await carregarRemessas(); // reload list
      } catch (error) {
        console.error('Erro ao excluir remessa:', error);
      } finally {
        setDeleteModalVisible(false);
        setSelectedRemessaId(null);
      }
    }
  };

  const handleToggleAtiva = async (remessaId: number) => {
    try {
      await RemessaService.toggleAtiva(remessaId);
      await carregarRemessas();
    } catch (error) {
      console.error('Erro ao alterar status da remessa:', error);
    }
  };

  const getStatusRemessa = (remessa: Remessa) => {
    if (!remessa.produtos || remessa.produtos.length === 0) return 'Sem produtos';
    
    const totalInicial = remessa.produtos.reduce((sum, p) => sum + p.quantidade_inicial, 0);
    const totalVendido = remessa.produtos.reduce((sum, p) => sum + p.quantidade_vendida, 0);
    const disponivel = totalInicial - totalVendido;
    
    if (disponivel === 0) return 'Esgotada';
    if (totalVendido === 0) return 'Nova';
    return `${disponivel} disponíveis`;
  };

  const getProgressPercentage = (remessa: Remessa) => {
    if (!remessa.produtos || remessa.produtos.length === 0) return 0;
    
    const totalInicial = remessa.produtos.reduce((sum, p) => sum + p.quantidade_inicial, 0);
    const totalVendido = remessa.produtos.reduce((sum, p) => sum + p.quantidade_vendida, 0);
    
    return totalInicial > 0 ? (totalVendido / totalInicial) * 100 : 0;
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'null' || dateString === '') {
      return 'Data não informada';
    }
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
        subtitle={`${remessas.length} ${remessas.length === 1 ? 'remessa' : 'remessas'}`}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.mediumBlue} />
        </View>
      ) : (
        <ScrollView 
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
        {remessas.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>Nenhuma remessa cadastrada</Text>
            <Text style={styles.emptySubtext}>
              Crie sua primeira remessa para começar
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => router.push('/remessas/nova')}
            >
              <Text style={styles.emptyButtonText}>+ Criar Primeira Remessa</Text>
            </TouchableOpacity>
          </View>
        ) : (
          remessas.map((remessa) => (
            <TouchableOpacity
              key={remessa.id}
              onPress={() => router.push(`/remessas/${remessa.id}` as any)}
              activeOpacity={0.7}
            >
              <View style={styles.remessaCard}>
                {/* Header */}
                <View style={styles.remessaHeader}>
                  <View style={styles.remessaDateContainer}>
                    <Text style={styles.remessaDateLabel}>Data</Text>
                    <Text style={styles.remessaData}>
                      {formatDate(remessa.data)}
                    </Text>
                  </View>
                  <View style={styles.headerBadges}>
                    <View style={[
                      styles.ativaBadge,
                      { backgroundColor: remessa.ativa === 1 ? '#dcfce7' : '#fee2e2',
                        borderColor: remessa.ativa === 1 ? '#16a34a' : '#dc2626' }
                    ]}>
                      <Text style={[
                        styles.ativaText,
                        { color: remessa.ativa === 1 ? '#16a34a' : '#dc2626' }
                      ]}>
                        {remessa.ativa === 1 ? 'Ativa' : 'Inativa'}
                      </Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>
                        {remessa.produtos ? remessa.produtos.length : 0} produtos
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Observação */}
                {remessa.observacao && (
                  <View style={styles.observacaoContainer}>
                    <Text style={styles.observacaoText}>{remessa.observacao}</Text>
                  </View>
                )}

                {/* Progress */}
                {remessa.produtos && remessa.produtos.length > 0 && (
                  <View style={styles.progressSection}>
                    <View style={styles.progressInfo}>
                      <Text style={styles.progressLabel}>Progresso</Text>
                      <Text style={styles.progressPercentage}>
                        {getProgressPercentage(remessa).toFixed(0)}%
                      </Text>
                    </View>
                    <View style={styles.progressContainer}>
                      <View 
                        style={[styles.progressFill, { width: `${getProgressPercentage(remessa)}%` }]}
                      />
                    </View>
                  </View>
                )}

                {/* Produtos */}
                {remessa.produtos && remessa.produtos.length > 0 && (
                  <View style={styles.produtosContainer}>
                    {remessa.produtos.slice(0, 3).map((produto) => (
                      <Text key={produto.id} style={styles.produtoBullet}>
                        • {produto.tipo} {produto.sabor} - {produto.quantidade_inicial} un
                      </Text>
                    ))}
                    {remessa.produtos.length > 3 && (
                      <Text style={styles.maisItens}>
                        + {remessa.produtos.length - 3} produtos
                      </Text>
                    )}
                  </View>
                )}

                {/* Footer */}
                <View style={styles.remessaFooter}>
                  <Text style={styles.verDetalhes}>Ver detalhes →</Text>
                  <View style={styles.cardActions}>
                    <TouchableOpacity 
                      style={[
                        styles.toggleCardButton,
                        { borderColor: remessa.ativa === 1 ? '#16a34a' : '#dc2626' }
                      ]} 
                      onPress={() => handleToggleAtiva(remessa.id)}
                    >
                      <Power size={16} color={remessa.ativa === 1 ? '#16a34a' : '#dc2626'} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.editCardButton} 
                      onPress={() => router.push(`/remessas/editar?id=${remessa.id}`)}
                    >
                      <Edit size={16} color="#2563eb" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.deleteCardButton} 
                      onPress={() => {
                        setSelectedRemessaId(remessa.id);
                        setDeleteModalVisible(true);
                      }}
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
      
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/remessas/nova')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <ConfirmationModal
        visible={deleteModalVisible}
        title="Excluir Remessa"
        message="Tem certeza que deseja excluir esta remessa? Os produtos serão removidos, mas o histórico de vendas será preservado."
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteModalVisible(false);
          setSelectedRemessaId(null);
        }}
        confirmText="Excluir"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.softGray,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyState: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.borderGray,
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textMedium,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: COLORS.mediumBlue,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
  remessaCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    padding: 20,
    marginBottom: 12,
  },
  remessaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  remessaDateContainer: {
    flex: 1,
  },
  remessaDateLabel: {
    fontSize: 11,
    color: COLORS.textMedium,
    fontWeight: '600',
    marginBottom: 4,
  },
  remessaData: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  statusBadge: {
    backgroundColor: COLORS.softGray,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.mediumBlue,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  ativaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  ativaText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  observacaoContainer: {
    backgroundColor: COLORS.softGray,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
  },
  observacaoText: {
    fontSize: 13,
    color: COLORS.textDark,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMedium,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  progressContainer: {
    height: 8,
    backgroundColor: COLORS.borderGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.mediumBlue,
    borderRadius: 4,
  },
  produtosContainer: {
    backgroundColor: COLORS.softGray,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
  },
  produtosTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 12,
  },
  produtoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  produtoNome: {
    fontSize: 13,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  produtoBullet: {
    fontSize: 13,
    color: COLORS.textDark,
    fontWeight: '500',
    marginBottom: 4,
  },
  produtoQuantidade: {
    fontSize: 13,
    color: COLORS.textMedium,
    fontWeight: '600',
  },
  maisItens: {
    fontSize: 12,
    color: COLORS.textMedium,
    fontStyle: 'italic',
    marginTop: 4,
  },
  remessaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  verDetalhes: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.mediumBlue,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleCardButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.softGray,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  editCardButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.softGray,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.mediumBlue,
  },
  deleteCardButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.softGray,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.mediumBlue,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 32,
    color: COLORS.white,
    fontWeight: '300',
  },
});