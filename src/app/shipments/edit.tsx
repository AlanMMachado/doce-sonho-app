import Header from '@/components/Header';
import { COLORS } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { ProductConfigService } from '@/service/productConfigService';
import { ShipmentService } from '@/service/shipmentService';
import { ProductConfig } from '@/types/ProductConfig';
import { ShipmentProductForm } from '@/types/Shipment';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Minus, Package, Plus, Trash2 } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Text, TextInput } from 'react-native-paper';

export default function EditShipmentScreen() {
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [productConfigs, setProductConfigs] = useState<ProductConfig[]>([]);
  const [products, setProducts] = useState<ShipmentProductForm[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (id) loadData();
    }, [id])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const shipment = await ShipmentService.getById(user!.id, id);
      if (shipment) {
        setNotes(shipment.notes || '');
        const mapped: ShipmentProductForm[] = shipment.products?.map(p => ({
          id: p.id,
          product_config_id: '',
          type: p.type,
          flavor: p.flavor,
          initial_quantity: p.initial_quantity.toString(),
          base_price: p.base_price || 0,
          promo_price: p.promo_price,
          promo_quantity: p.promo_quantity,
        })) || [];
        setProducts(mapped);
      }
      const configs = await ProductConfigService.getAll(user!.id);
      setProductConfigs(configs);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const addProduct = (config: ProductConfig) => {
    setProducts([...products, {
      product_config_id: config.id,
      type: config.type,
      custom_type: config.custom_type,
      flavor: '',
      initial_quantity: '',
      base_price: config.base_price,
      promo_price: config.promo_price,
      promo_quantity: config.promo_quantity,
    }]);
  };

  const removeProduct = (index: number) => setProducts(products.filter((_, i) => i !== index));

  const updateProduct = (index: number, field: keyof ShipmentProductForm, value: string) => {
    const updated = [...products];
    (updated[index] as any)[field] = value;
    setProducts(updated);
  };

  const handleSubmit = async () => {
    const validProducts = products.filter(p => {
      const qtyValid = p.initial_quantity.trim() && !isNaN(parseInt(p.initial_quantity)) && parseInt(p.initial_quantity) > 0;
      return p.flavor.trim() && qtyValid;
    });

    if (validProducts.length === 0) {
      alert('Adicione pelo menos um produto válido com sabor e quantidade.');
      return;
    }

    try {
      setSaving(true);

      await ShipmentService.update(user!.id, id, { notes: notes.trim() || undefined });

      const currentShipment = await ShipmentService.getById(user!.id, id);
      const currentProductIds = validProducts.filter(p => p.id).map(p => p.id!);
      const productsToDelete = (currentShipment?.products || [])
        .filter(p => !currentProductIds.includes(p.id))
        .map(p => p.id);

      for (const productId of productsToDelete) {
        await ShipmentService.deleteProduct(user!.id, productId);
      }

      for (const product of validProducts) {
        const typeFinal = product.type === 'outro' && product.custom_type
          ? product.custom_type.charAt(0).toUpperCase() + product.custom_type.slice(1).toLowerCase()
          : product.type;

        if (product.id) {
          await ShipmentService.updateProduct(user!.id, product.id, {
            type: typeFinal,
            flavor: product.flavor.trim(),
            initial_quantity: parseInt(product.initial_quantity),
            base_price: product.base_price,
            promo_price: product.promo_price,
            promo_quantity: product.promo_quantity,
          });
        } else {
          await ShipmentService.addProduct(user!.id, id, {
            type: typeFinal,
            flavor: product.flavor.trim(),
            initial_quantity: parseInt(product.initial_quantity),
            base_price: product.base_price,
            promo_price: product.promo_price,
            promo_quantity: product.promo_quantity,
            product_config_id: product.product_config_id,
          });
        }
      }

      router.back();
    } catch (error) {
      console.error('Erro ao salvar remessa:', error);
      alert('Erro ao salvar remessa. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const getTypeDisplay = (product: ShipmentProductForm) =>
    product.type === 'outro' && product.custom_type ? product.custom_type : product.type;

  return (
    <View style={styles.container}>
      <Header title="Editar Remessa" subtitle="Atualize os produtos e dados" />
      {loading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.mediumBlue} /></View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.stepBadge}><Text style={styles.stepNumber}>1</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Adicionar Produtos</Text>
                  <Text style={styles.sectionSubtitle}>Toque para adicionar à remessa</Text>
                </View>
              </View>
              {productConfigs.length === 0 ? (
                <View style={styles.emptyState}>
                  <Package size={40} color={COLORS.textLight} />
                  <Text style={styles.emptyText}>Nenhum produto configurado</Text>
                  <Text style={styles.emptySubtext}>Vá para Configurações → Produtos para configurar seus produtos primeiro.</Text>
                </View>
              ) : (
                <View style={styles.configGrid}>
                  {productConfigs.map((config) => {
                    const count = products.filter(p => p.product_config_id === config.id).length;
                    return (
                      <TouchableOpacity key={config.id} onPress={() => addProduct(config)}
                        style={[styles.configCard, count > 0 && styles.configCardActive]} activeOpacity={0.7}>
                        <View style={styles.configLeft}>
                          <Text style={styles.configType}>{config.type === 'outro' ? config.custom_type : config.type}</Text>
                          <Text style={styles.configPrice}>R$ {config.base_price.toFixed(2)}{config.promo_price ? ` - ${config.promo_quantity} por R$ ${config.promo_price.toFixed(2)}` : ''}</Text>
                        </View>
                        <View style={styles.configRight}>
                          {count > 0 && <View style={styles.countBadge}><Text style={styles.countText}>{count}</Text></View>}
                          <Plus size={18} color={COLORS.mediumBlue} />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.stepBadge}><Text style={styles.stepNumber}>2</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Produtos na Remessa</Text>
                  <Text style={styles.sectionSubtitle}>Informe sabor e quantidade</Text>
                </View>
                {products.length > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{products.length}</Text></View>}
              </View>
              {products.length === 0 ? (
                <View style={styles.emptyProducts}>
                  <Text style={styles.emptyProductsText}>Selecione produtos na etapa acima para adicioná-los aqui</Text>
                </View>
              ) : (
                products.map((product, index) => (
                  <View key={index} style={styles.productCard}>
                    <View style={styles.productCardHeader}>
                      <View style={styles.typeTag}><Text style={styles.typeTagText}>{getTypeDisplay(product)}</Text></View>
                      <View style={{ flex: 1 }} />
                      <TouchableOpacity onPress={() => removeProduct(index)} style={styles.removeButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Trash2 size={16} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.productInputs}>
                      <View style={styles.inputFlex}>
                        <Text style={styles.label}>Sabor *</Text>
                        <TextInput value={product.flavor} onChangeText={(t) => updateProduct(index, 'flavor', t)}
                          style={styles.input} mode="outlined" placeholder="Ex: Morango" dense
                          outlineColor={COLORS.borderGray} activeOutlineColor={COLORS.mediumBlue} />
                      </View>
                      <View style={styles.inputQty}>
                        <Text style={styles.label}>Qtd *</Text>
                        <View style={styles.quantityControl}>
                          <TouchableOpacity onPress={() => { const c = parseInt(product.initial_quantity) || 0; if (c > 0) updateProduct(index, 'initial_quantity', (c - 1).toString()); }}
                            style={[styles.qtyButton, (!product.initial_quantity || parseInt(product.initial_quantity) <= 0) && styles.qtyButtonDisabled]}
                            disabled={!product.initial_quantity || parseInt(product.initial_quantity) <= 0}>
                            <Minus size={16} color={(!product.initial_quantity || parseInt(product.initial_quantity) <= 0) ? COLORS.textLight : COLORS.textDark} />
                          </TouchableOpacity>
                          <TextInput value={product.initial_quantity}
                            onChangeText={(t) => updateProduct(index, 'initial_quantity', t.replace(/[^0-9]/g, ''))}
                            keyboardType="numeric" style={styles.quantityInput} mode="outlined" dense
                            outlineColor={COLORS.borderGray} activeOutlineColor={COLORS.mediumBlue} />
                          <TouchableOpacity onPress={() => { const c = parseInt(product.initial_quantity) || 0; updateProduct(index, 'initial_quantity', (c + 1).toString()); }} style={styles.qtyButton}>
                            <Plus size={16} color={COLORS.textDark} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.stepBadge, styles.stepBadgeOptional]}><Text style={styles.stepNumber}>3</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Observações</Text>
                  <Text style={styles.sectionSubtitle}>Opcional - adicione notas sobre a remessa</Text>
                </View>
              </View>
              <TextInput value={notes} onChangeText={(t) => setNotes(t.slice(0, 200))}
                style={styles.notesInput} mode="outlined" multiline numberOfLines={3}
                placeholder="Ex: Remessa da segunda-feira, lembrar de congelar..."
                outlineColor={COLORS.borderGray} activeOutlineColor={COLORS.mediumBlue} placeholderTextColor={COLORS.textLight} />
              <Text style={styles.charCount}>{notes.length}/200</Text>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()} disabled={saving}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitButton, (saving || products.length === 0) && styles.submitButtonDisabled]}
                onPress={handleSubmit} disabled={saving || products.length === 0}>
                {saving ? <ActivityIndicator color="#ffffff" size={20} /> : <Text style={styles.submitButtonText}>Salvar Alterações</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.softGray },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  section: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.borderGray },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, gap: 12 },
  stepBadge: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.mediumBlue, justifyContent: 'center', alignItems: 'center' },
  stepBadgeOptional: { backgroundColor: COLORS.textLight },
  stepNumber: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textDark, marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: COLORS.textMedium },
  emptyState: { padding: 32, alignItems: 'center', backgroundColor: COLORS.softGray, borderRadius: 12, gap: 10 },
  emptyText: { fontSize: 16, fontWeight: '700', color: COLORS.textDark },
  emptySubtext: { fontSize: 14, color: COLORS.textMedium, textAlign: 'center', lineHeight: 20 },
  configGrid: { gap: 8 },
  emptyProducts: { padding: 24, alignItems: 'center', backgroundColor: COLORS.softGray, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderGray, borderStyle: 'dashed' as const },
  emptyProductsText: { fontSize: 14, color: COLORS.textMedium, textAlign: 'center' },
  configCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.softGray, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.borderGray, paddingVertical: 12, paddingHorizontal: 14 },
  configCardActive: { borderColor: COLORS.mediumBlue, backgroundColor: 'rgba(27, 65, 164, 0.04)' },
  configLeft: { flex: 1 },
  configType: { fontSize: 15, fontWeight: '700', color: COLORS.textDark, textTransform: 'capitalize' },
  configPrice: { fontSize: 13, color: COLORS.textMedium, fontWeight: '500', marginTop: 2 },
  configRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countBadge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.mediumBlue, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  countText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  badge: { backgroundColor: COLORS.softGray, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderGray },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: COLORS.mediumBlue },
  productCard: { backgroundColor: COLORS.softGray, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORS.borderGray },
  productCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  typeTag: { backgroundColor: COLORS.mediumBlue, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  typeTagText: { color: COLORS.white, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  removeButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.error },
  productInputs: { flexDirection: 'row', gap: 12 },
  inputFlex: { flex: 1 },
  inputQty: { width: 150 },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textDark, marginBottom: 6 },
  input: { backgroundColor: COLORS.white, fontSize: 14 },
  quantityControl: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qtyButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.borderGray, justifyContent: 'center', alignItems: 'center' },
  qtyButtonDisabled: { opacity: 0.4 },
  quantityInput: { flex: 1, backgroundColor: COLORS.white, textAlign: 'center', fontSize: 15, fontWeight: '700' },
  notesInput: { backgroundColor: COLORS.softGray, minHeight: 80, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: COLORS.textLight, marginTop: 6, textAlign: 'right' },
  actionButtons: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  cancelButton: { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.borderGray, paddingVertical: 15, alignItems: 'center' },
  cancelButtonText: { fontSize: 15, fontWeight: '700', color: COLORS.textMedium },
  submitButton: { flex: 2, backgroundColor: COLORS.mediumBlue, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
});
