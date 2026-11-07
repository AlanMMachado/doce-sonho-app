import Header from '@/components/Header';
import ModernInput from '@/components/ModernInput';
import ModernModal from '@/components/ModernModal';
import { COLORS } from '@/constants/Colors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { dateToISO, formatDate } from '@/lib/utils/formatters';
import { isValidDate } from '@/lib/utils/validators';
import { ProfileService } from '@/service/profileService';
import { useRouter } from 'expo-router';
import { Calendar, KeyRound, Target, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Text as PaperText } from 'react-native-paper';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { state, reloadProfile } = useApp();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [pixRemovalModalVisible, setPixRemovalModalVisible] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    full_name: '',
    birth_date: '',
    daily_goal: '',
    email: '',
    pix_key: '',
  });

  useEffect(() => {
    if (state.profile) {
      const [year, month, day] = state.profile.birth_date.split('-');
      setForm({
        full_name: state.profile.full_name,
        birth_date: `${day}/${month}/${year}`,
        daily_goal: state.profile.daily_goal.toString(),
        email: state.profile.email,
        pix_key: state.profile.pix_key ?? '',
      });
    }
  }, [state.profile]);

  const clearError = (field: string) => {
    setErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
  };

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    if (!form.full_name.trim()) newErrors.full_name = 'Nome é obrigatório';
    if (!form.birth_date.trim()) newErrors.birth_date = 'Data é obrigatória';
    else if (!isValidDate(form.birth_date)) newErrors.birth_date = 'Data inválida';
    const goalNum = parseFloat(form.daily_goal);
    if (!form.daily_goal || isNaN(goalNum) || goalNum <= 0) newErrors.daily_goal = 'Valor inválido';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    if (state.profile?.pix_key && !form.pix_key.trim()) {
      setPixRemovalModalVisible(true);
      return;
    }
    saveProfile();
  };

  const saveProfile = async () => {
    const pixKey = form.pix_key.trim() || null;

    setSaving(true);
    try {
      await ProfileService.update(user!.id, {
        full_name: form.full_name.trim(),
        birth_date: dateToISO(form.birth_date),
        daily_goal: parseFloat(form.daily_goal),
        ...(pixKey !== (state.profile?.pix_key ?? null) && { pix_key: pixKey }),
      });
      await reloadProfile();
      setSuccessModalVisible(true);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Meu Perfil" showBackButton />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Nome completo *</Text>
                {errors.full_name && <Text style={styles.errorText}>{errors.full_name}</Text>}
              </View>
              <ModernInput
                placeholder="Seu nome completo"
                value={form.full_name}
                onChangeText={(t) => { setForm(p => ({ ...p, full_name: t })); clearError('full_name'); }}
                icon={<User width={20} height={20} color={COLORS.mediumBlue} />}
                error={!!errors.full_name}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>E-mail (não editável)</Text>
              <ModernInput
                value={form.email}
                editable={false}
                style={styles.inputReadOnly}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Data de nascimento *</Text>
                {errors.birth_date && <Text style={styles.errorText}>{errors.birth_date}</Text>}
              </View>
              <ModernInput
                placeholder="DD/MM/AAAA"
                value={form.birth_date}
                onChangeText={(t) => { setForm(p => ({ ...p, birth_date: formatDate(t) })); clearError('birth_date'); }}
                keyboardType="numeric"
                icon={<Calendar width={20} height={20} color={COLORS.mediumBlue} />}
                error={!!errors.birth_date}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Meta diária (R$) *</Text>
                {errors.daily_goal && <Text style={styles.errorText}>{errors.daily_goal}</Text>}
              </View>
              <ModernInput
                placeholder="200.00"
                value={form.daily_goal}
                onChangeText={(t) => { setForm(p => ({ ...p, daily_goal: t })); clearError('daily_goal'); }}
                keyboardType="numeric"
                icon={<Target width={20} height={20} color={COLORS.mediumBlue} />}
                error={!!errors.daily_goal}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Chave Pix (opcional)</Text>
              <ModernInput
                placeholder="CPF, telefone, e-mail ou chave aleatória"
                value={form.pix_key}
                onChangeText={(t) => setForm(p => ({ ...p, pix_key: t }))}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={77}
                icon={<KeyRound width={20} height={20} color={COLORS.mediumBlue} />}
              />
            </View>

            {/* Botões de Ação */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => router.back()}
                disabled={saving}
              >
                <PaperText style={styles.cancelButtonText}>Cancelar</PaperText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, saving && styles.submitButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={COLORS.white} size={20} />
                ) : (
                  <PaperText style={styles.submitButtonText}>Salvar</PaperText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ModernModal
        visible={pixRemovalModalVisible}
        onClose={() => setPixRemovalModalVisible(false)}
        title="Remover chave Pix"
        primaryAction={{
          label: 'Remover',
          destructive: true,
          onPress: () => {
            setPixRemovalModalVisible(false);
            saveProfile();
          },
        }}
        secondaryAction={{ label: 'Cancelar', onPress: () => setPixRemovalModalVisible(false) }}>
        <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 }}>
          {state.profile?.charge_message_template?.includes('{chave_pix}')
            ? 'Sua mensagem de cobrança usa esta chave. Sem ela, as próximas cobranças serão enviadas sem a chave Pix.'
            : 'Sua chave Pix será removida do perfil.'}
        </Text>
      </ModernModal>

      <ModernModal
        visible={successModalVisible}
        onClose={() => { setSuccessModalVisible(false); router.back(); }}
        title="Perfil Atualizado"
        primaryAction={{ label: 'Ok', onPress: () => { setSuccessModalVisible(false); router.back(); } }}>
        <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 }}>
          Suas informações foram atualizadas com sucesso!
        </Text>
      </ModernModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.softGray },
  scroll: { flex: 1 },
  content: { padding: 16 },
  inputGroup: { marginBottom: 4 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, marginLeft: 4 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.navy },
  errorText: { fontSize: 12, color: COLORS.error },
  inputReadOnly: { backgroundColor: COLORS.softGray, color: COLORS.textMedium },
  actionButtons: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 16 },
  cancelButton: { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.borderGray, paddingVertical: 15, alignItems: 'center' },
  cancelButtonText: { fontSize: 15, fontWeight: '700', color: COLORS.textMedium },
  submitButton: { flex: 2, backgroundColor: COLORS.mediumBlue, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
});
