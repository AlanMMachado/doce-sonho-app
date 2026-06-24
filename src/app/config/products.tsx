import Header from '@/components/Header';
import ModernModal from '@/components/ModernModal';
import SkeletonCard from '@/components/SkeletonCard';
import { COLORS } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useScreenData } from '@/hooks/useScreenData';
import { ProductConfigService } from '@/service/productConfigService';
import { ProductConfig } from '@/types/ProductConfig';
import { useRouter } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

export default function ProductsConfigScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [productConfigs, setProductConfigs] = useState<ProductConfig[]>([]);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductConfig | null>(null);

  const loadProductConfigs = async () => {
    try {
      const products = await ProductConfigService.getAll(user!.id);
      setProductConfigs(products);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      Alert.alert('Erro', 'Não foi possível carregar as configurações de produtos.');
    }
  };

  const { loading } = useScreenData(loadProductConfigs);

  const handleDelete = async () => {
    if (!productToDelete) return;
    try {
      await ProductConfigService.delete(user!.id, productToDelete.id);
      await loadProductConfigs();
    } catch (error) {
      console.error('Erro ao excluir configuração:', error);
      Alert.alert('Erro', 'Não foi possível excluir a configuração.');
    } finally {
      setDeleteModalVisible(false);
      setProductToDelete(null);
    }
  };

  const getTypeDisplay = (product: ProductConfig) => {
    return product.type === 'outro' ? product.custom_type : product.type;
  };

  return (
    <View style={styles.container}>
      <Header title="Configurar Produtos" subtitle="Gerencie os tipos de produto e seus preços" />

      {loading ? (
        <ScrollView scrollEnabled={false} style={styles.content}>
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </ScrollView>
      ) : (
        <ScrollView style={styles.content}>
        <View style={styles.produtosList}>
          {productConfigs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Nenhum produto configurado ainda.</Text>
              <Text style={styles.emptySubtext}>
                Adicione configurações para facilitar a criação de remessas.
              </Text>
            </View>
          ) : (
            productConfigs.map((product) => (
              <View key={product.id} style={styles.produtoCard}>
                <View style={styles.produtoHeader}>
                  <Text style={styles.produtoTipo}>{getTypeDisplay(product)}</Text>
                  <View style={styles.produtoActions}>
                    <TouchableOpacity
                      onPress={() => router.push({
                        pathname: '/config/edit-product',
                        params: {
                          id: product.id,
                          tipo: product.type,
                          tipoCustomizado: product.custom_type || '',
                          preco_base: product.base_price.toString(),
                          preco_promocao: product.promo_price?.toString() || '',
                          quantidade_promocao: product.promo_quantity?.toString() || '',
                        },
                      })}
                      style={styles.editButton}
                    >
                      <Text style={styles.editButtonText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => { setProductToDelete(product); setDeleteModalVisible(true); }}
                      style={styles.deleteButton}
                    >
                      <Trash2 size={16} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.produtoDetails}>
                  <Text style={styles.precoText}>Preço Base: R$ {product.base_price.toFixed(2)}</Text>
                  {product.promo_price && (
                    <Text style={styles.precoText}>
                      Promoção: R$ {product.promo_price.toFixed(2)} (a partir de {product.promo_quantity} unidades)
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity
          onPress={() => router.push('/config/new-product')}
          style={styles.addButton}
          activeOpacity={0.7}
        >
          <Text style={styles.addButtonText}>+ Adicionar Configuração</Text>
        </TouchableOpacity>
        </ScrollView>
      )}

      <ModernModal
        visible={deleteModalVisible}
        onClose={() => { setDeleteModalVisible(false); setProductToDelete(null); }}
        title="Excluir Configuração"
        primaryAction={{ label: 'Excluir', onPress: handleDelete, destructive: true }}
        secondaryAction={{ label: 'Cancelar', onPress: () => { setDeleteModalVisible(false); setProductToDelete(null); } }}>
        <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 }}>
          Deseja realmente excluir a configuração de {productToDelete?.type}{productToDelete?.custom_type ? ` (${productToDelete.custom_type})` : ''}?
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
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.softGray,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textMedium,
  },
  produtosList: {
    marginBottom: 20,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textMedium,
    textAlign: 'center',
  },
  produtoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    padding: 16,
    marginBottom: 12,
  },
  produtoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  produtoTipo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
    textTransform: 'capitalize',
  },
  produtoActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: COLORS.softGray,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.mediumBlue,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.mediumBlue,
  },
  deleteButton: {
    backgroundColor: COLORS.softGray,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  produtoDetails: {
    gap: 4,
  },
  precoText: {
    fontSize: 14,
    color: COLORS.textDark,
  },
  addButton: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.borderGray,
    borderStyle: 'dashed',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 32,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.mediumBlue,
  },
});
