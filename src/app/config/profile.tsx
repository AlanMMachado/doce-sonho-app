import Header from '@/components/Header';
import ModernButton from '@/components/ModernButton';
import ModernInput from '@/components/ModernInput';
import ModernModal from '@/components/ModernModal';
import { COLORS } from '@/constants/Colors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { dateToISO, formatDate } from '@/lib/utils/formatters';
import { isValidDate } from '@/lib/utils/validators';
import { ProfileService } from '@/service/profileService';
import { useRouter } from 'expo-router';
import { Calendar, Target, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { state, reloadProfile } = useApp();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    full_name: '',
    birth_date: '',
    daily_goal: '',
    email: '',
  });

  useEffect(() => {
    if (state.profile) {
      const [year, month, day] = state.profile.birth_date.split('-');
      setForm({
        full_name: state.profile.full_name,
        birth_date: `${day}/${month}/${year}`,
        daily_goal: state.profile.daily_goal.toString(),
        email: state.profile.email,
      });
    }
  }, [state.profile]);

  const clearError = (field: string) => {
    setErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
  };

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};
    if (!form.full_name.trim()) newErrors.full_name = 'Nome é obrigatório';
    if (!form.birth_date.trim()) newErrors.birth_date = 'Data é obrigatória';
    else if (!isValidDate(form.birth_date)) newErrors.birth_date = 'Data inválida';
    const goalNum = parseFloat(form.daily_goal);
    if (!form.daily_goal || isNaN(goalNum) || goalNum <= 0) newErrors.daily_goal = 'Valor inválido';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    try {
      await ProfileService.update(user!.id, {
        full_name: form.full_name.trim(),
        birth_date: dateToISO(form.birth_date),
        daily_goal: goalNum,
      });
      await reloadProfile();
      setSuccessModalVisible(true);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar o perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Meu Perfil" subtitle="Edite suas informações pessoais" />
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

            <ModernButton
              title={saving ? 'Salvando...' : 'Salvar'}
              onPress={handleSave}
              loading={saving}
              style={styles.button}
            />
            <ModernButton
              title="Cancelar"
              variant="secondary"
              onPress={() => router.back()}
              disabled={saving}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
  button: { marginTop: 8 },
});
