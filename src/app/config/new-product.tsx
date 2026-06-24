import Header from '@/components/Header';
import { COLORS } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { ProductConfigService } from '@/service/productConfigService';
import { ProductConfigCreateParams, ProductConfigForm } from '@/types/ProductConfig';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

const TIPOS = ['Trufa', 'Surpresa', 'Torta', 'Outro'];

export default function NewProductScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<ProductConfigForm>({
    type: '',
    customType: '',
    base_price: '',
    promo_price: '',
    promo_quantity: '',
  });

  const validateForm = (): boolean => {
    const typeNormalized = form.type.toLowerCase();

    if (!typeNormalized.trim()) {
      Alert.alert('Erro', 'Selecione o tipo do produto.');
      return false;
    }

    if (typeNormalized === 'outro' && !form.customType.trim()) {
      Alert.alert('Erro', 'Digite o tipo customizado do produto.');
      return false;
    }

    if (!form.base_price.trim() || isNaN(parseFloat(form.base_price)) || parseFloat(form.base_price) <= 0) {
      Alert.alert('Erro', 'Digite um preço base válido maior que zero.');
      return false;
    }

    if (form.promo_price.trim()) {
      const promoPrice = parseFloat(form.promo_price);
      const basePrice = parseFloat(form.base_price);
      if (isNaN(promoPrice) || promoPrice <= 0) {
        Alert.alert('Erro', 'Digite um preço de promoção válido.');
        return false;
      }
      if (promoPrice >= basePrice) {
        Alert.alert('Erro', 'O preço de promoção deve ser menor que o preço base.');
        return false;
      }
    }

    if (form.promo_quantity.trim()) {
      const promoQty = parseInt(form.promo_quantity);
      if (isNaN(promoQty) || promoQty < 2) {
        Alert.alert('Erro', 'A quantidade para promoção deve ser pelo menos 2.');
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      const typeNormalized = form.type.toLowerCase();
      const existing = await ProductConfigService.getByType(
        user!.id,
        typeNormalized,
        typeNormalized === 'outro' ? form.customType.trim() : undefined
      );

      if (existing) {
        Alert.alert('Erro', 'Já existe uma configuração para este tipo de produto.');
        return;
      }

      const productData: ProductConfigCreateParams = {
        type: typeNormalized,
        custom_type: typeNormalized === 'outro' ? form.customType.trim() : undefined,
        base_price: parseFloat(form.base_price),
        promo_price: form.promo_price.trim() ? parseFloat(form.promo_price) : undefined,
        promo_quantity: form.promo_quantity.trim() ? parseInt(form.promo_quantity) : undefined,
      };

      await ProductConfigService.create(user!.id, productData);
      router.back();
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      Alert.alert('Erro', 'Não foi possível salvar a configuração.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Novo Produto" subtitle="Configure tipo e preços" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* SEÇÃO 1 — Tipo */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNumber}>1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Tipo do Produto</Text>
                <Text style={styles.sectionSubtitle}>Selecione o tipo que será configurado</Text>
              </View>
            </View>

            <View style={styles.tipoButtons}>
              {TIPOS.map((type) => {
                const value = type.toLowerCase();
                const active = form.type === value;
                return (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setForm({ ...form, type: value })}
                    style={[styles.tipoButton, active && styles.tipoButtonActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.tipoButtonText, active && styles.tipoButtonTextActive]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {form.type === 'outro' && (
              <View style={[styles.inputWrapper, { marginTop: 12, marginBottom: 0 }]}>
                <Text style={styles.inputLabel}>Nome do tipo *</Text>
                <TextInput
                  value={form.customType}
                  onChangeText={(text) => setForm({ ...form, customType: text })}
                  style={styles.input}
                  placeholder="Ex: Caixinha, Pote..."
                  placeholderTextColor={COLORS.textLight}
                />
              </View>
            )}
          </View>

          {/* SEÇÃO 2 — Preço Base */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNumber}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Preço Base</Text>
                <Text style={styles.sectionSubtitle}>Preço unitário padrão do produto</Text>
              </View>
            </View>

            <View style={[styles.inputWrapper, { marginBottom: 0 }]}>
              <Text style={styles.inputLabel}>Preço Base (R$) *</Text>
              <TextInput
                value={form.base_price}
                onChangeText={(text) => setForm({ ...form, base_price: text.replace(',', '.') })}
                keyboardType="decimal-pad"
                style={styles.input}
                placeholder="Ex: 5.00"
                placeholderTextColor={COLORS.textLight}
              />
            </View>
          </View>

          {/* SEÇÃO 3 — Promoção (opcional) */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepBadge, styles.stepBadgeOptional]}>
                <Text style={styles.stepNumber}>3</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Promoção</Text>
                <Text style={styles.sectionSubtitle}>Opcional — preço especial por quantidade</Text>
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Preço Promoção (R$)</Text>
              <TextInput
                value={form.promo_price}
                onChangeText={(text) => setForm({ ...form, promo_price: text.replace(',', '.') })}
                keyboardType="decimal-pad"
                style={styles.input}
                placeholder="Ex: 4.50"
                placeholderTextColor={COLORS.textLight}
              />
            </View>

            <View style={[styles.inputWrapper, { marginBottom: 0 }]}>
              <Text style={styles.inputLabel}>Quantidade Mínima para Promoção</Text>
              <TextInput
                value={form.promo_quantity}
                onChangeText={(text) => setForm({ ...form, promo_quantity: text.replace(/[^0-9]/g, '') })}
                keyboardType="numeric"
                style={styles.input}
                placeholder="Ex: 3"
                placeholderTextColor={COLORS.textLight}
              />
            </View>
          </View>

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
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.white} size={20} />
              ) : (
                <Text style={styles.submitButtonText}>Salvar</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.softGray,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
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
  stepBadgeOptional: {
    backgroundColor: COLORS.textLight,
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
  tipoButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tipoButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.borderGray,
    backgroundColor: COLORS.softGray,
  },
  tipoButtonActive: {
    borderColor: COLORS.mediumBlue,
    backgroundColor: COLORS.mediumBlue,
  },
  tipoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMedium,
  },
  tipoButtonTextActive: {
    color: COLORS.white,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 6,
    fontFamily: 'Nunito_600SemiBold',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textDark,
    backgroundColor: COLORS.white,
    fontFamily: 'Nunito_400Regular',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.borderGray,
    paddingVertical: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMedium,
  },
  submitButton: {
    flex: 2,
    backgroundColor: COLORS.mediumBlue,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
});
