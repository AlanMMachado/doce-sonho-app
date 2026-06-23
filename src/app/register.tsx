import DoceAmorLogo from '@/components/DoceAmorLogo';
import ModernButton from '@/components/ModernButton';
import ModernInput from '@/components/ModernInput';
import ModernModal from '@/components/ModernModal';
import { COLORS } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { dataParaISO, formatarData } from '@/lib/utils/formatters';
import { isValidDate } from '@/lib/utils/validators';
import { PerfilService } from '@/service/perfilService';
import { useRouter } from 'expo-router';
import { Calendar, Eye, EyeOff, Lock, Mail, Target, User } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function calcularForcaSenha(pwd: string) {
  let score = 0;
  const checks = {
    length: pwd.length >= 6,
    lowercase: /[a-z]/.test(pwd),
    uppercase: /[A-Z]/.test(pwd),
    numbers: /\d/.test(pwd),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
  };
  Object.values(checks).forEach(c => { if (c) score++; });
  return { score, checks };
}

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [metaDiaria, setMetaDiaria] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [modalType, setModalType] = useState<'error' | 'success'>('error');
  const [loading, setLoading] = useState(false);

  const clearError = (field: string) => {
    setErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = 'Nome é obrigatório';
    if (!email.trim()) e.email = 'E-mail é obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'E-mail inválido';
    if (!dataNascimento.trim()) e.dataNascimento = 'Data é obrigatória';
    else if (dataNascimento.replace(/\D/g, '').length < 8 || !isValidDate(dataNascimento)) e.dataNascimento = 'Data inválida';
    if (!password) e.password = 'Senha é obrigatória';
    else if (password.length < 6) e.password = 'Mínimo 6 caracteres';
    if (password !== confirmPassword) e.confirmPassword = 'Senhas não coincidem';
    if (!metaDiaria.trim()) e.metaDiaria = 'Meta diária é obrigatória';
    return e;
  };

  const handleRegister = async () => {
    const newErrors = validate();
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      const newUser = await signUp(email.trim(), password);

      if (newUser) {
        const { data: { session }, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) throw sessErr;
        if (!session) throw new Error('Usuário não está autenticado ainda.');

        await PerfilService.criar(newUser.id, {
          nome_completo: nome.trim(),
          email: email.trim(),
          data_nascimento: dataParaISO(dataNascimento),
          meta_diaria: parseFloat(metaDiaria),
        });
      }

      setModalType('success');
      setModalMessage('Conta criada com sucesso!');
    } catch (e: any) {
      setModalType('error');
      setModalMessage(e.message ?? 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  const handleModalDismiss = () => {
    setModalMessage(null);
    if (modalType === 'success') router.replace('/(tabs)/dashboard');
  };

  const forca = useMemo(() => password.length > 0 ? calcularForcaSenha(password) : null, [password]);

  const getForcaInfo = () => {
    if (!forca) return null;
    if (forca.score < 3) return { label: 'Fraca', color: COLORS.error, progress: 0.33 };
    if (forca.score < 5) return { label: 'Média', color: COLORS.warning, progress: 0.66 };
    return { label: 'Forte', color: COLORS.success, progress: 1 };
  };

  const forcaInfo = useMemo(getForcaInfo, [forca]);

  const getPasswordBorderColor = () => {
    if (errors.password) return COLORS.error;
    if (!forca) return undefined;
    if (forca.score <= 2) return COLORS.error;
    if (forca.score <= 4) return COLORS.warning;
    return COLORS.success;
  };

  const getConfirmBorderColor = () => {
    if (errors.confirmPassword) return COLORS.error;
    if (confirmPassword.length > 0 && password !== confirmPassword) return COLORS.error;
    if (confirmPassword.length > 0 && password === confirmPassword) return COLORS.success;
    return undefined;
  };

  const inlineError = (msg?: string) =>
    msg && !msg.includes('obrigatóri') ? msg : undefined;

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerSection}>
            <View>
              <DoceAmorLogo size={80} style={{ marginBottom: -5 }} />
            </View>
            <Text style={styles.title}>Crie sua conta</Text>
            <Text style={styles.subtitle}>Preencha seus dados para começar</Text>
          </View>

          <View style={styles.formContainer}>

            {/* Nome */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome completo *</Text>
              <ModernInput
                placeholder="Seu nome completo"
                value={nome}
                onChangeText={(t) => { setNome(t); clearError('nome'); }}
                icon={<User width={20} height={20} color={COLORS.mediumBlue} />}
                error={!!errors.nome}
              />
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>E-mail *</Text>
                {inlineError(errors.email) && <Text style={styles.errorText}>{inlineError(errors.email)}</Text>}
              </View>
              <ModernInput
                placeholder="seu@email.com"
                value={email}
                onChangeText={(t) => { setEmail(t); clearError('email'); }}
                autoCapitalize="none"
                keyboardType="email-address"
                icon={<Mail width={20} height={20} color={COLORS.mediumBlue} />}
                error={!!errors.email}
              />
            </View>

            {/* Data de nascimento */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Data de nascimento *</Text>
                {inlineError(errors.dataNascimento) && <Text style={styles.errorText}>{inlineError(errors.dataNascimento)}</Text>}
              </View>
              <ModernInput
                placeholder="DD/MM/AAAA"
                value={dataNascimento}
                onChangeText={(t) => { setDataNascimento(formatarData(t)); clearError('dataNascimento'); }}
                keyboardType="numeric"
                icon={<Calendar width={20} height={20} color={COLORS.mediumBlue} />}
                error={!!errors.dataNascimento}
              />
            </View>

            {/* Meta diária */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Meta diária (R$)</Text>
              <ModernInput
                placeholder="R$ 200"
                value={metaDiaria}
                onChangeText={(t) => { setMetaDiaria(t); clearError('metaDiaria'); }}
                keyboardType="numeric"
                icon={<Target width={20} height={20} color={COLORS.mediumBlue} />}
                error={!!errors.metaDiaria}
              />
            </View>

            {/* Senha */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Senha *</Text>
                {inlineError(errors.password) && <Text style={styles.errorText}>{inlineError(errors.password)}</Text>}
              </View>
              <ModernInput
                placeholder="Insira sua senha"
                value={password}
                onChangeText={(t) => { setPassword(t); clearError('password'); }}
                secureTextEntry={!isPasswordVisible}
                icon={<Lock width={20} height={20} color={COLORS.mediumBlue} />}
                rightIcon={
                  <TouchableOpacity onPress={() => setIsPasswordVisible(p => !p)}>
                    {isPasswordVisible
                      ? <Eye width={20} height={20} color={COLORS.gray} />
                      : <EyeOff width={20} height={20} color={COLORS.gray} />
                    }
                  </TouchableOpacity>
                }
                error={!!errors.password}
                style={getPasswordBorderColor() ? { borderColor: getPasswordBorderColor(), borderWidth: 1.5 } : undefined}
              />
              {forcaInfo && (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthBar}>
                    <View style={[styles.strengthProgress, { backgroundColor: forcaInfo.color, width: `${forcaInfo.progress * 100}%` }]} />
                  </View>
                  <Text style={[styles.strengthText, { color: forcaInfo.color }]}>Senha {forcaInfo.label.toLowerCase()}</Text>
                </View>
              )}
              {forca && (
                <View style={styles.criteriaContainer}>
                  <View style={styles.criteriaRow}>
                    <Text style={[styles.criteriaText, forca.checks.length ? styles.criteriaMet : styles.criteriaNotMet]}>✓ Pelo menos 6 caracteres</Text>
                    <Text style={[styles.criteriaText, forca.checks.lowercase ? styles.criteriaMet : styles.criteriaNotMet]}>✓ Letra minúscula</Text>
                  </View>
                  <View style={styles.criteriaRow}>
                    <Text style={[styles.criteriaText, forca.checks.uppercase ? styles.criteriaMet : styles.criteriaNotMet]}>✓ Letra maiúscula</Text>
                    <Text style={[styles.criteriaText, forca.checks.numbers ? styles.criteriaMet : styles.criteriaNotMet]}>✓ Número</Text>
                  </View>
                  <View style={styles.criteriaRow}>
                    <Text style={[styles.criteriaText, forca.checks.special ? styles.criteriaMet : styles.criteriaNotMet]}>✓ Caractere especial</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Confirmar senha */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Confirmar senha *</Text>
                {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
              </View>
              <ModernInput
                placeholder="Repita a senha"
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); clearError('confirmPassword'); }}
                secureTextEntry={!isConfirmVisible}
                icon={<Lock width={20} height={20} color={COLORS.mediumBlue} />}
                rightIcon={
                  <TouchableOpacity onPress={() => setIsConfirmVisible(p => !p)}>
                    {isConfirmVisible
                      ? <Eye width={20} height={20} color={COLORS.gray} />
                      : <EyeOff width={20} height={20} color={COLORS.gray} />
                    }
                  </TouchableOpacity>
                }
                error={!!errors.confirmPassword}
                style={getConfirmBorderColor() ? { borderColor: getConfirmBorderColor(), borderWidth: 1.5 } : undefined}
              />
            </View>

            <ModernButton
              title="Criar conta"
              onPress={handleRegister}
              loading={loading}
              size="medium"
              style={styles.registerButton}
            />

            <TouchableOpacity style={styles.loginLink} onPress={() => router.back()}>
              <Text style={styles.loginLinkText}>
                Já tem uma conta?{' '}
                <Text style={styles.loginLinkBold}>Entrar</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ModernModal
        visible={!!modalMessage}
        type={modalType}
        title={modalType === 'success' ? 'Sucesso!' : 'Atenção'}
        message={modalMessage ?? ''}
        primaryButtonText={modalType === 'success' ? 'Ir para o app' : 'Tentar novamente'}
        onClose={handleModalDismiss}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scrollContainer: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  headerSection: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, color: COLORS.navy, fontFamily: 'Nunito_600SemiBold', marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.gray, fontFamily: 'Nunito_400Regular' },
  formContainer: { width: '100%' },
  inputGroup: { marginBottom: 4 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, marginLeft: 4 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.navy, fontFamily: 'Nunito_600SemiBold' },
  errorText: { fontSize: 12, color: COLORS.error, fontFamily: 'Nunito_400Regular' },
  strengthContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, marginBottom: 4 },
  strengthBar: { flex: 1, height: 4, backgroundColor: '#e1e5e9', borderRadius: 2, marginRight: 12, overflow: 'hidden' },
  strengthProgress: { height: '100%', borderRadius: 2 },
  strengthText: { fontSize: 11, fontWeight: '600', fontFamily: 'Nunito_600SemiBold' },
  criteriaContainer: { backgroundColor: COLORS.softGray, borderRadius: 8, padding: 12, marginBottom: 8 },
  criteriaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  criteriaText: { fontSize: 10, flex: 1, fontFamily: 'Nunito_400Regular' },
  criteriaMet: { color: COLORS.success },
  criteriaNotMet: { color: COLORS.gray },
  registerButton: {
    marginTop: 12,
    shadowColor: COLORS.mediumBlue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  loginLink: { alignItems: 'center', marginTop: 20, paddingVertical: 8 },
  loginLinkText: { fontSize: 14, color: COLORS.gray, fontFamily: 'Nunito_400Regular' },
  loginLinkBold: { color: COLORS.mediumBlue, fontWeight: '700', fontFamily: 'Nunito_700Bold' },
});
