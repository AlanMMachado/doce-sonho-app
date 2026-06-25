import CustomerSearchInput from '@/components/CustomerSearchInput';
import Header from '@/components/Header';
import ModernModal from '@/components/ModernModal';
import { SkeletonBlock } from '@/components/SkeletonCard';
import { COLORS } from '@/constants/Colors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useScreenData } from '@/hooks/useScreenData';
import { SaleService, recalculateAllPrices } from '@/service/saleService';
import { ShipmentService } from '@/service/shipmentService';
import { Product } from '@/types/Product';
import { SaleItemForm } from '@/types/Sale';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Text, TextInput } from 'react-native-paper';

const { width } = Dimensions.get('window');

export default function NewSaleScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { dispatch } = useApp();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<SaleItemForm[]>([]);
  const [formData, setFormData] = useState({
    customer_name: '',
    status: 'OK' as 'OK' | 'PENDENTE',
    payment_method: 'Pix'
  });

  const loadProducts = async () => {
    try {
      const activeShipments = await ShipmentService.getActive(user!.id);
      const allProducts: Product[] = [];

      for (const shipment of activeShipments) {
        const shipmentProducts = await ShipmentService.getProductsByShipmentId(user!.id, shipment.id);
        const availableProducts = shipmentProducts.filter(p =>
          p.initial_quantity - p.sold_quantity > 0
        );
        allProducts.push(...availableProducts);
      }

      setProducts(allProducts);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const { loading } = useScreenData(loadProducts);

  const setProductQuantity = (productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const availableStock = product.initial_quantity - product.sold_quantity;

    if (quantity > availableStock) {
      quantity = availableStock;
    }

    if (quantity <= 0) {
      const newItems = items.filter(item => item.product_id !== productId);
      setItems(newItems);
    } else {
      if (errors.products) setErrors(prev => { const n = {...prev}; delete n.products; return n; });
      const existingIndex = items.findIndex(item => item.product_id === productId);

      if (existingIndex >= 0) {
        const updated = items.map((item, i) =>
          i === existingIndex ? { ...item, quantity: quantity.toString() } : item
        );
        const itemsWithUpdatedPrices = recalculateAllPrices(updated, products);
        setItems(itemsWithUpdatedPrices);
      } else {
        const newItem: SaleItemForm = {
          product_id: productId,
          quantity: quantity.toString(),
          base_price: '',
          promo_price: '',
          subtotal: '',
          qty_with_discount: '0',
          qty_without_discount: '0'
        };
        const newItems = [...items, newItem];
        const itemsWithUpdatedPrices = recalculateAllPrices(newItems, products);
        setItems(itemsWithUpdatedPrices);
      }
    }
  };

  const getProductQuantity = (productId: string): number => {
    const item = items.find(i => i.product_id === productId);
    return item ? parseInt(item.quantity) || 0 : 0;
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      const subtotal = parseFloat(item.subtotal) || 0;
      return total + subtotal;
    }, 0);
  };

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};
    if (!formData.customer_name.trim()) newErrors.customer_name = 'required';

    const validItems = items.filter(item => {
      const product = products.find(p => p.id === item.product_id);
      return product && item.quantity.trim() && parseInt(item.quantity) > 0 && item.subtotal.trim() && parseFloat(item.subtotal) >= 0;
    });

    if (validItems.length === 0) newErrors.products = 'required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    try {
      setSaving(true);

      const saleData = {
        customer_name: formData.customer_name.trim(),
        date: new Date().toISOString(),
        status: formData.status,
        payment_method: formData.payment_method,
        items: validItems.map(item => {
          const product = products.find(p => p.id === item.product_id);
          return {
            product_id: item.product_id,
            product_type: product?.type,
            product_flavor: product?.flavor,
            quantity: parseInt(item.quantity),
            base_price: parseFloat(item.base_price),
            promo_price: item.promo_price ? parseFloat(item.promo_price) : undefined,
            subtotal: parseFloat(item.subtotal)
          };
        })
      };

      const sale = await SaleService.create(user!.id, saleData);

      dispatch({ type: 'ADD_SALE', payload: sale });
      router.back();
    } catch (error) {
      console.error('Erro ao salvar venda:', error);
      setServerError('Erro ao salvar venda. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (!loading && products.length === 0) {
    return (
      <View style={styles.container}>
        <Header title="Nova Venda" subtitle="Registre uma venda rapidamente" />
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyText}>Nenhum produto disponível</Text>
          <Text style={styles.emptySubtext}>Crie uma remessa com produtos primeiro</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/shipments/new')}
          >
            <Text style={styles.emptyButtonText}>+ Criar Remessa</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Nova Venda" subtitle="Registre uma venda rapidamente" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
      {loading ? (
        <ScrollView scrollEnabled={false} style={styles.scrollView}>
          <View style={styles.content}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <SkeletonBlock width={40} height={40} style={{ borderRadius: 12 }} />
                <View style={{ flex: 1 }}>
                  <SkeletonBlock width="65%" height={18} style={{ marginBottom: 4 }} />
                  <SkeletonBlock width="45%" height={13} />
                </View>
              </View>
              <View style={styles.produtosListContainer}>
                {[1, 2, 3].map(i => (
                  <View key={i} style={styles.produtoListItem}>
                    <View style={styles.produtoListInfo}>
                      <SkeletonBlock width="60%" height={14} style={{ marginBottom: 4 }} />
                      <SkeletonBlock width="40%" height={12} />
                    </View>
                    <View style={styles.produtoListQuantityControl}>
                      <SkeletonBlock width={36} height={36} style={{ borderRadius: 8 }} />
                      <SkeletonBlock width={50} height={36} style={{ borderRadius: 4 }} />
                      <SkeletonBlock width={36} height={36} style={{ borderRadius: 8 }} />
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <SkeletonBlock width={40} height={40} style={{ borderRadius: 12 }} />
                <View style={{ flex: 1 }}>
                  <SkeletonBlock width="55%" height={18} style={{ marginBottom: 4 }} />
                  <SkeletonBlock width="40%" height={13} />
                </View>
              </View>
              <View style={styles.inputContainer}>
                <SkeletonBlock width="100%" height={56} style={{ borderRadius: 4 }} />
              </View>
              <View style={styles.inputContainer}>
                <SkeletonBlock width="40%" height={13} style={{ marginBottom: 10 }} />
                <View style={styles.paymentGrid}>
                  {[1, 2, 3, 4].map(i => (
                    <View key={i} style={{ flex: 1, minWidth: '47%' }}>
                      <SkeletonBlock width="100%" height={42} style={{ borderRadius: 10 }} />
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <SkeletonBlock width={40} height={40} style={{ borderRadius: 12 }} />
                <View style={{ flex: 1 }}>
                  <SkeletonBlock width="60%" height={18} style={{ marginBottom: 4 }} />
                  <SkeletonBlock width="45%" height={13} />
                </View>
              </View>
              <View style={styles.statusGrid}>
                {[1, 2].map(i => (
                  <View key={i} style={{ flex: 1 }}>
                    <SkeletonBlock width="100%" height={42} style={{ borderRadius: 10 }} />
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.actionButtons}>
              {[1, 2].map(i => (
                <View key={i} style={{ flex: 1 }}>
                  <SkeletonBlock width="100%" height={50} style={{ borderRadius: 12 }} />
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" style={styles.scrollView}>
          <View style={styles.content}>

            {/* PASSO 1: Seleção de Produtos */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepNumber}>1</Text>
                </View>
                <View>
                  <Text style={styles.sectionTitle}>Selecione os Produtos</Text>
                  <Text style={styles.sectionSubtitle}>Defina as quantidades</Text>
                </View>
              </View>

              {/* Lista de Produtos */}
              <View style={styles.produtosListContainer}>
                {products.map((product) => {
                  const stock = product.initial_quantity - product.sold_quantity;
                  const selectedQuantity = getProductQuantity(product.id);

                  return (
                    <View
                      key={product.id}
                      style={[
                        styles.produtoListItem,
                        selectedQuantity > 0 && styles.produtoListItemSelected
                      ]}
                    >
                      {/* Info do Produto */}
                      <View style={styles.produtoListInfo}>
                        <Text style={styles.produtoListName}>
                          {product.type}
                          {product.flavor ? ` - ${product.flavor}` : ''}
                        </Text>
                        <View>
                          <Text style={styles.produtoListStockText}>
                            {stock} em estoque
                          </Text>
                        </View>
                      </View>

                      {/* Seletor de Quantidade */}
                        <View style={styles.produtoListQuantityControl}>
                          <TouchableOpacity
                            onPress={() => setProductQuantity(product.id, selectedQuantity - 1)}
                            style={[
                              styles.quantityButtonSmall,
                              selectedQuantity <= 0 && styles.quantityButtonSmallDisabled
                            ]}
                            disabled={selectedQuantity <= 0}
                          >
                            <Text style={styles.quantityButtonSmallText}>−</Text>
                          </TouchableOpacity>
                          <TextInput
                            value={selectedQuantity.toString()}
                            onChangeText={(text) => {
                              const num = parseInt(text) || 0;
                              setProductQuantity(product.id, num);
                            }}
                            keyboardType="numeric"
                            style={styles.quantityInputSmall}
                            mode="outlined"
                            outlineColor={errors.products ? COLORS.error : COLORS.borderGray}
                            activeOutlineColor={errors.products ? COLORS.error : COLORS.mediumBlue}
                          />
                          <TouchableOpacity
                            onPress={() => setProductQuantity(product.id, selectedQuantity + 1)}
                            style={styles.quantityButtonSmall}
                            disabled={selectedQuantity >= stock}
                          >
                            <Text style={styles.quantityButtonSmallText}>+</Text>
                          </TouchableOpacity>
                        </View>
                    </View>
                  );
                })}
              </View>

              {products.length === 0 && (
                <View style={styles.emptyListMessage}>
                  <Text style={styles.emptyListText}>Nenhum produto disponível</Text>
                </View>
              )}
            </View>

            {/* PASSO 2: Cliente e Pagamento */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepNumber}>2</Text>
                </View>
                <View>
                  <Text style={styles.sectionTitle}>Detalhes da Venda</Text>
                  <Text style={styles.sectionSubtitle}>Cliente e pagamento</Text>
                </View>
              </View>

              {/* Cliente */}
              <View style={styles.inputContainer}>
                <CustomerSearchInput
                  value={formData.customer_name}
                  error={!!errors.customer_name}
                  onChangeText={(text) => {
                    setFormData({ ...formData, customer_name: text });
                    if (errors.customer_name) setErrors(prev => { const n = {...prev}; delete n.customer_name; return n; });
                  }}
                />
              </View>

              {/* Método de Pagamento */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Método de Pagamento</Text>
                <View style={styles.paymentGrid}>
                  {[
                    { label: 'Pix', value: 'Pix', color: '#10b981' },
                    { label: 'Dinheiro', value: 'Dinheiro', color: '#059669' },
                    { label: 'Débito', value: 'Cartão Débito', color: '#0891b2' },
                    { label: 'Crédito', value: 'Cartão Crédito', color: '#8b5cf6' }
                  ].map((method) => (
                    <TouchableOpacity
                      key={method.value}
                      onPress={() => setFormData({ ...formData, payment_method: method.value })}
                      style={[
                        styles.paymentButton,
                        formData.payment_method === method.value && {
                          ...styles.paymentButtonActive,
                          backgroundColor: method.color
                        }
                      ]}
                    >
                      <Text style={[
                        styles.paymentLabel,
                        formData.payment_method === method.value && styles.paymentLabelActive
                      ]}>
                        {method.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* PASSO 3: Status de Pagamento */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepNumber}>3</Text>
                </View>
                <View>
                  <Text style={styles.sectionTitle}>Status de Pagamento</Text>
                  <Text style={styles.sectionSubtitle}>A venda foi paga?</Text>
                </View>
              </View>

              <View style={styles.statusGrid}>
                <TouchableOpacity
                  onPress={() => setFormData({ ...formData, status: 'OK' })}
                  style={[
                    styles.statusButton,
                    formData.status === 'OK' && styles.statusButtonPaid
                  ]}
                >
                  <Text style={[
                    styles.statusLabel,
                    formData.status === 'OK' && styles.statusLabelActive
                  ]}>
                    Pago
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setFormData({ ...formData, status: 'PENDENTE' })}
                  style={[
                    styles.statusButton,
                    formData.status === 'PENDENTE' && styles.statusButtonPending
                  ]}
                >
                  <Text style={[
                    styles.statusLabel,
                    formData.status === 'PENDENTE' && styles.statusLabelActive
                  ]}>
                    Pendente
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Resumo da Venda */}
            {calculateTotal() > 0 && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <Text style={styles.summaryTitle}>Resumo da Venda</Text>
                  <View style={styles.itemCountBadge}>
                    <Text style={styles.itemCountText}>
                      {items.filter(i => i.product_id).length}
                    </Text>
                  </View>
                </View>

                {/* Itens */}
                <View style={styles.summaryItems}>
                  {items.map((item, index) => {
                    if (!item.product_id || !item.quantity || !item.base_price) return null;
                    const product = products.find(p => p.id === item.product_id);
                    if (!product) return null;

                    return (
                      <View key={index} style={styles.summaryItem}>
                        <View style={styles.summaryItemInfo}>
                          <Text style={styles.summaryItemName}>
                            {product.type} - {product.flavor}
                          </Text>
                          {item.qty_with_discount && parseInt(item.qty_with_discount) > 0 && (
                            <Text style={styles.summaryItemDetails}>
                              {item.qty_with_discount}x R$ {parseFloat(item.promo_price || '0').toFixed(2)}
                              <Text style={styles.summaryPromoText}> • Promoção</Text>
                            </Text>
                          )}
                          {item.qty_without_discount && parseInt(item.qty_without_discount) > 0 && (
                            <Text style={styles.summaryItemDetails}>
                              {item.qty_without_discount}x R$ {parseFloat(item.base_price).toFixed(2)}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.summaryItemAmount}>
                          R$ {parseFloat(item.subtotal).toFixed(2)}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {/* Total */}
                <View style={styles.summaryTotal}>
                  <Text style={styles.summaryTotalLabel}>Valor Total</Text>
                  <Text style={styles.summaryTotalValue}>
                    R$ {calculateTotal().toFixed(2)}
                  </Text>
                </View>
              </View>
            )}

            {/* Botões de Ação */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => router.back()}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, saving && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={COLORS.white} size={20} />
                ) : (
                  <Text style={styles.submitButtonText}>Confirmar Venda</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
      </KeyboardAvoidingView>

      <ModernModal
        visible={!!serverError}
        onClose={() => setServerError(null)}
        title="Erro ao salvar venda"
        primaryAction={{ label: 'Tentar novamente', onPress: () => setServerError(null) }}>
        <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 }}>{serverError ?? ''}</Text>
      </ModernModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.softGray,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textMedium,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: COLORS.mediumBlue,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },

  // SEÇÕES
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  stepBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.mediumBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textMedium,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 10,
  },
  input: {
    backgroundColor: COLORS.softGray,
  },
  produtosListContainer: {
    gap: 10,
  },
  produtoListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    backgroundColor: COLORS.white,
  },
  produtoListItemSelected: {
    borderColor: COLORS.mediumBlue,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  produtoListInfo: {
    flex: 1,
    marginRight: 12,
  },
  produtoListName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  produtoListStockText: {
    fontSize: 12,
    color: COLORS.textMedium,
    fontWeight: '500',
  },
  produtoListQuantityControl: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  quantityButtonSmall: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.mediumBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonSmallDisabled: {
    opacity: 0.5,
  },
  quantityButtonSmallText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  quantityInputSmall: {
    width: 50,
    height: 36,
    textAlign: 'center',
    backgroundColor: COLORS.white,
    fontSize: 14,
  },
  emptyListMessage: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 13,
    color: COLORS.textMedium,
    fontWeight: '500',
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  paymentButton: {
    flex: 1,
    minWidth: '47%',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  paymentButtonActive: {
    borderColor: 'transparent',
  },
  paymentLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  paymentLabelActive: {
    color: COLORS.white,
  },

  // STATUS
  statusGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.borderGray,
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  statusButtonPaid: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.green,
  },
  statusButtonPending: {
    borderColor: COLORS.warning,
    backgroundColor: COLORS.warning,
  },
  statusEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  statusLabelActive: {
    color: COLORS.white,
  },

  // RESUMO
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.mediumBlue,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  itemCountBadge: {
    backgroundColor: COLORS.mediumBlue,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  itemCountText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  summaryItems: {
    borderTopWidth: 1,
    borderColor: COLORS.borderGray,
    paddingVertical: 5,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  summaryItemInfo: {
    flex: 1,
  },
  summaryItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  summaryItemDetails: {
    fontSize: 12,
    color: COLORS.textMedium,
  },
  summaryPromoText: {
    color: COLORS.pink,
    fontWeight: '700',
    fontSize: 12,
  },
  summaryItemAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.mediumBlue,
  },
  summaryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: COLORS.mediumBlue,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.mediumBlue,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.borderGray,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMedium,
  },
  submitButton: {
    flex: 1,
    backgroundColor: COLORS.mediumBlue,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 8,
  },
});
