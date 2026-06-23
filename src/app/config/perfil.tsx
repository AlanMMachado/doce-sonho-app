import Header from '@/components/Header';
import ModernButton from '@/components/ModernButton';
import ModernInput from '@/components/ModernInput';
import { COLORS } from '@/constants/Colors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { dataParaISO, formatarData } from '@/lib/utils/formatters';
import { isValidDate } from '@/lib/utils/validators';
import { PerfilService } from '@/service/perfilService';
import { useRouter } from 'expo-router';
import { Calendar, DollarSign, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function PerfilScreen() {
  const { user } = useAuth();
  const { state, recarregarPerfil } = useApp();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    nome_completo: '',
    data_nascimento: '',
    meta_diaria: '',
    email: '',
  });

  useEffect(() => {
    if (state.perfil) {
      const [ano, mes, dia] = state.perfil.data_nascimento.split('-');
      setForm({
        nome_completo: state.perfil.nome_completo,
        data_nascimento: `${dia}/${mes}/${ano}`,
        meta_diaria: state.perfil.meta_diaria.toString(),
        email: state.perfil.email,
      });
    }
  }, [state.perfil]);

  const clearError = (field: string) => {
    setErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
  };

  const handleSalvar = async () => {
    const newErrors: Record<string, string> = {};
    if (!form.nome_completo.trim()) newErrors.nome_completo = 'Nome é obrigatório';
    if (!form.data_nascimento.trim()) newErrors.data_nascimento = 'Data é obrigatória';
    else if (!isValidDate(form.data_nascimento)) newErrors.data_nascimento = 'Data inválida';
    const metaNum = parseFloat(form.meta_diaria);
    if (!form.meta_diaria || isNaN(metaNum) || metaNum <= 0) newErrors.meta_diaria = 'Valor inválido';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    try {
      await PerfilService.atualizar(user!.id, {
        nome_completo: form.nome_completo.trim(),
        data_nascimento: dataParaISO(form.data_nascimento),
        meta_diaria: metaNum,
      });
      await recarregarPerfil();
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
      router.back();
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
                {errors.nome_completo && <Text style={styles.errorText}>{errors.nome_completo}</Text>}
              </View>
              <ModernInput
                placeholder="Seu nome completo"
                value={form.nome_completo}
                onChangeText={(t) => { setForm(p => ({ ...p, nome_completo: t })); clearError('nome_completo'); }}
                icon={<User width={20} height={20} color={COLORS.mediumBlue} />}
                error={!!errors.nome_completo}
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
                {errors.data_nascimento && <Text style={styles.errorText}>{errors.data_nascimento}</Text>}
              </View>
              <ModernInput
                placeholder="DD/MM/AAAA"
                value={form.data_nascimento}
                onChangeText={(t) => { setForm(p => ({ ...p, data_nascimento: formatarData(t) })); clearError('data_nascimento'); }}
                keyboardType="numeric"
                icon={<Calendar width={20} height={20} color={COLORS.mediumBlue} />}
                error={!!errors.data_nascimento}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Meta diária (R$) *</Text>
                {errors.meta_diaria && <Text style={styles.errorText}>{errors.meta_diaria}</Text>}
              </View>
              <ModernInput
                placeholder="200.00"
                value={form.meta_diaria}
                onChangeText={(t) => { setForm(p => ({ ...p, meta_diaria: t })); clearError('meta_diaria'); }}
                keyboardType="numeric"
                icon={<DollarSign width={20} height={20} color={COLORS.mediumBlue} />}
                error={!!errors.meta_diaria}
              />
            </View>

            <ModernButton
              title={saving ? 'Salvando...' : 'Salvar'}
              onPress={handleSalvar}
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
