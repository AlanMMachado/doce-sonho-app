import ChargeTemplateEditor from '@/components/ChargeTemplateEditor';
import Header from '@/components/Header';
import ModernModal from '@/components/ModernModal';
import { COLORS } from '@/constants/Colors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  buildChargeMessage,
  DEFAULT_CHARGE_TEMPLATE,
  findUnknownVariables,
  normalizeChargeTemplate,
  splitBoldSegments,
} from '@/lib/utils/whatsapp';
import { ProfileService } from '@/service/profileService';
import { Sale, SaleItem } from '@/types/Sale';
import { useRouter } from 'expo-router';
import { AlertCircle, AlertTriangle, Info, RotateCcw } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActivityIndicator, Text } from 'react-native-paper';

const MAX_TEMPLATE_LENGTH = 1000;
const SAMPLE_CUSTOMER_NAME = 'Maria Silva';

const sampleItem = (id: string, quantity: number, flavor: string, subtotal: number): SaleItem => ({
  id,
  sale_id: 'exemplo',
  product_id: null,
  product_type: 'Trufa',
  product_flavor: flavor,
  quantity,
  base_price: subtotal / quantity,
  subtotal,
});

const sampleSale = (id: string, date: string, totalPrice: number, amountPaid: number, items: SaleItem[]): Sale => ({
  id,
  customer_id: 'exemplo',
  customer_name: SAMPLE_CUSTOMER_NAME,
  date,
  status: 'PENDENTE',
  total_price: totalPrice,
  amount_paid: amountPaid,
  items,
});

const SAMPLE_SALES: Sale[] = [
  sampleSale('1', '2026-11-03T14:30:00', 13.5, 5, [
    sampleItem('1', 2, 'de Chocolate', 9),
    sampleItem('2', 1, 'de Morango', 4.5),
  ]),
  sampleSale('2', '2026-11-05T16:45:00', 13.5, 0, [sampleItem('3', 3, 'de Maracujá', 13.5)]),
];

type Feedback = { state: 'neutral' | 'warning' | 'error'; text: string };

function getFeedback(template: string, hasPixKey: boolean): Feedback {
  if (!template.trim()) {
    return { state: 'error', text: 'Escreva a mensagem ou restaure o padrão' };
  }

  const unknownVariables = findUnknownVariables(template).map(key => `{${key}}`);
  if (unknownVariables.length > 0) {
    const label = unknownVariables.length > 1 ? 'Variáveis desconhecidas' : 'Variável desconhecida';
    return { state: 'error', text: `${label}: ${unknownVariables.join(', ')}` };
  }

  if (!hasPixKey && template.includes('{chave_pix}')) {
    return { state: 'error', text: 'Cadastre sua chave em Meu Perfil ou remova {chave_pix} da mensagem' };
  }

  const hasSales = template.includes('{compras}');
  const hasTotal = template.includes('{total}');
  if (!hasSales && !hasTotal) {
    return { state: 'warning', text: 'Sem {compras} e {total}, a mensagem não listará as compras nem o valor total' };
  }
  if (!hasSales) return { state: 'warning', text: 'Sem {compras}, a mensagem não listará as compras' };
  if (!hasTotal) return { state: 'warning', text: 'Sem {total}, a mensagem não mostrará o valor total' };

  return { state: 'neutral', text: 'Use *texto* para deixar em negrito no WhatsApp' };
}

export default function ChargeMessageScreen() {
  const { user } = useAuth();
  const { state, reloadProfile } = useApp();
  const router = useRouter();
  const [template, setTemplate] = useState(DEFAULT_CHARGE_TEMPLATE);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [pixModalVisible, setPixModalVisible] = useState(false);
  const profileLoaded = !!state.profile;
  const savedTemplate = state.profile?.charge_message_template;

  useEffect(() => {
    // Depende só do template salvo: cadastrar a chave Pix muda o perfil e não pode
    // descartar o que está sendo editado nesta tela.
    if (profileLoaded) setTemplate(normalizeChargeTemplate(savedTemplate ?? DEFAULT_CHARGE_TEMPLATE));
  }, [profileLoaded, savedTemplate]);

  const pixKey = state.profile?.pix_key;
  const feedback = getFeedback(template, !state.profile || !!pixKey);
  const saveDisabled = feedback.state === 'error' || !state.profile;
  const restoreDisabled = saving || template === DEFAULT_CHARGE_TEMPLATE;

  const handleSave = async () => {
    const trimmed = template.trim();

    setSaving(true);
    try {
      // NULL mantém o usuário no padrão do app, inclusive em melhorias futuras do texto.
      await ProfileService.update(user!.id, {
        charge_message_template: trimmed === DEFAULT_CHARGE_TEMPLATE ? null : trimmed,
      });
      await reloadProfile();
      setSuccessModalVisible(true);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a mensagem.');
    } finally {
      setSaving(false);
    }
  };

  const closeSuccessModal = () => {
    setSuccessModalVisible(false);
    router.back();
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <Header title="Mensagem de cobrança" showBackButton />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" scrollEnabled={!dragging}>
          <View style={styles.content}>
            {/* SEÇÃO 1 — Mensagem */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepNumber}>1</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Mensagem</Text>
                  <Text style={styles.sectionSubtitle}>Toque para inserir uma variável ou arraste para o texto</Text>
                </View>
                <TouchableOpacity
                  style={[styles.restoreButton, restoreDisabled && styles.buttonDisabled]}
                  onPress={() => setRestoreModalVisible(true)}
                  disabled={restoreDisabled}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Restaurar mensagem padrão"
                  accessibilityState={{ disabled: restoreDisabled }}
                >
                  <RotateCcw size={14} color={COLORS.mediumBlue} />
                  <Text style={styles.restoreButtonText}>Restaurar</Text>
                </TouchableOpacity>
              </View>

              <ChargeTemplateEditor
                value={template}
                onChange={setTemplate}
                maxLength={MAX_TEMPLATE_LENGTH}
                error={feedback.state === 'error'}
                disabledVariableKeys={pixKey ? undefined : ['chave_pix']}
                onDisabledVariablePress={() => setPixModalVisible(true)}
                onDragActiveChange={setDragging}
              />

              <View style={[styles.feedbackCard, feedback.state === 'error' && styles.feedbackCardError]}>
                {feedback.state === 'error' ? (
                  <AlertCircle size={15} color={COLORS.error} />
                ) : feedback.state === 'warning' ? (
                  <AlertTriangle size={15} color={COLORS.yellow} />
                ) : (
                  <Info size={15} color={COLORS.textLight} />
                )}
                <Text style={[styles.feedbackText, feedback.state === 'error' && styles.feedbackTextError]}>
                  {feedback.text}
                </Text>
              </View>
            </View>

            {/* SEÇÃO 2 — Prévia */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepNumber}>2</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Prévia</Text>
                  <Text style={styles.sectionSubtitle}>Exemplo com dados fictícios</Text>
                </View>
              </View>

              <View style={styles.previewCard}>
                <Text style={styles.previewText}>
                  {splitBoldSegments(buildChargeMessage(SAMPLE_CUSTOMER_NAME, SAMPLE_SALES, template, pixKey)).map((segment, index) => (
                    <Text key={index} style={segment.bold ? styles.previewBold : styles.previewText}>{segment.text}</Text>
                  ))}
                </Text>
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
                style={[styles.submitButton, (saving || saveDisabled) && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={saving || saveDisabled}
              >
                {saving ? (
                  <ActivityIndicator color={COLORS.white} size={20} />
                ) : (
                  <Text style={styles.submitButtonText}>Salvar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ModernModal
        visible={pixModalVisible}
        onClose={() => setPixModalVisible(false)}
        title="Chave Pix não cadastrada"
        primaryAction={{
          label: 'Ir para Meu Perfil',
          onPress: () => {
            setPixModalVisible(false);
            router.push('/config/profile');
          },
        }}
        secondaryAction={{ label: 'Agora não', onPress: () => setPixModalVisible(false) }}>
        <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 }}>
          Cadastre sua chave Pix em Meu Perfil para usar esta variável.
        </Text>
      </ModernModal>

      <ModernModal
        visible={restoreModalVisible}
        onClose={() => setRestoreModalVisible(false)}
        title="Restaurar mensagem padrão"
        primaryAction={{
          label: 'Restaurar',
          destructive: true,
          onPress: () => {
            setTemplate(DEFAULT_CHARGE_TEMPLATE);
            setRestoreModalVisible(false);
          },
        }}
        secondaryAction={{ label: 'Cancelar', onPress: () => setRestoreModalVisible(false) }}>
        <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 }}>
          O texto atual será substituído pela mensagem padrão. A alteração só vale depois de salvar.
        </Text>
      </ModernModal>

      <ModernModal
        visible={successModalVisible}
        onClose={closeSuccessModal}
        title="Mensagem Atualizada"
        primaryAction={{ label: 'Ok', onPress: closeSuccessModal }}>
        <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 }}>
          As próximas cobranças usarão esta mensagem.
        </Text>
      </ModernModal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.softGray },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  section: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.borderGray },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, gap: 12 },
  stepBadge: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.mediumBlue, justifyContent: 'center', alignItems: 'center' },
  stepNumber: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textDark, marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: COLORS.textMedium },
  feedbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    padding: 12,
    minHeight: 58,
    marginTop: 16,
    backgroundColor: COLORS.softGray,
  },
  feedbackCardError: { backgroundColor: '#fdecea' },
  feedbackText: { flex: 1, fontSize: 12, lineHeight: 17, color: COLORS.textMedium },
  feedbackTextError: { color: COLORS.error },
  previewCard: { backgroundColor: COLORS.softGray, borderRadius: 12, padding: 16 },
  previewText: { fontSize: 14, lineHeight: 21, fontFamily: 'Nunito_400Regular', color: COLORS.textDark },
  previewBold: { fontSize: 14, lineHeight: 21, fontFamily: 'Nunito_700Bold', color: COLORS.textDark },
  restoreButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  restoreButtonText: { fontSize: 13, fontWeight: '600', color: COLORS.mediumBlue },
  buttonDisabled: { opacity: 0.5 },
  actionButtons: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  cancelButton: { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.borderGray, paddingVertical: 15, alignItems: 'center' },
  cancelButtonText: { fontSize: 15, fontWeight: '700', color: COLORS.textMedium },
  submitButton: { flex: 2, backgroundColor: COLORS.mediumBlue, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  submitButtonText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
});
