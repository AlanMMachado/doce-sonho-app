import { useRouter } from 'expo-router';
import React, { useState, useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar, Eye, EyeOff, Lock, Mail, Phone, User } from 'react-native-feather';
import CpfInput, { isValidCpf } from '../../components/CpfInput';
import ModernButton from '../../components/ModernButton';
import ModernInput from '../../components/ModernInput';
import ModernModal from '../../components/ModernModal';
import SafiraLogo from '../../components/SafiraLogo';
import { COLORS } from '../../constants/Colors';
import { useAuth } from '../../lib/context/AuthContext';
import { convertDateToISO, formatDate, formatPhone } from '../../lib/utils/formatters';
import { isAdult, isValidDate } from '../../lib/utils/validators';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<'error' | 'success'>('error');
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!nome.trim()) newErrors.nome = 'Nome é obrigatório';
    if (!cpf.trim()) newErrors.cpf = 'CPF é obrigatório';
    else if (!isValidCpf(cpf)) newErrors.cpf = 'CPF inválido';
    if (!email.trim()) newErrors.email = 'E-mail é obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'E-mail inválido';
    if (!telefone.trim()) newErrors.telefone = 'Telefone é obrigatório';
    else if (telefone.replace(/\D/g, '').length < 10) newErrors.telefone = 'Telefone inválido';
    if (!dataNascimento.trim()) newErrors.dataNascimento = 'Data de nascimento é obrigatória';
    else if (dataNascimento.replace(/\D/g, '').length < 8 || !isValidDate(dataNascimento)) newErrors.dataNascimento = 'Data inválida';
    else if (!isAdult(dataNascimento)) newErrors.dataNascimento = 'Você deve ter pelo menos 18 anos';
    if (!password) newErrors.password = 'Senha é obrigatória';
    else if (password.length < 6) newErrors.password = 'Mínimo 6 caracteres';
    else if (calculatePasswordStrength(password).score < 3) newErrors.password = 'Senha precisa cumprir os critérios de segurança';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Senhas não coincidem';
    return newErrors;
  };

  const handleRegister = async () => {
    const newErrors = validate();
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    try {
      await register({
        nome: nome.trim(),
        cpf,
        email: email.trim(),
        telefone: telefone.replace(/\D/g, ''),
        dataNascimento: convertDateToISO(dataNascimento),
        senha: password,
      });
      setAlertType('success');
      setAlertMessage('Conta criada com sucesso!');
    } catch (error: any) {
      setAlertType('error');
      setAlertMessage(error.message || 'Erro ao criar conta.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAlertDismiss = () => {
    setAlertMessage(null);
    if (alertType === 'success') router.replace('/(protected)/(tabs)/home');
  };

  const clearError = (field: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const inlineError = (msg: string | undefined) =>
    msg && !msg.includes('obrigatóri') ? msg : undefined;

  const calculatePasswordStrength = (pwd: string) => {
    let score = 0;
    const checks = {
      length: pwd.length >= 6,
      lowercase: /[a-z]/.test(pwd),
      uppercase: /[A-Z]/.test(pwd),
      numbers: /\d/.test(pwd),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
    };
    Object.values(checks).forEach(check => { if (check) score++; });
    if (pwd.length >= 12) score += 0.5;
    if (pwd.length >= 16) score += 0.5;
    return { score, checks };
  };

  const passwordStrength = useMemo(
    () => (password.length > 0 ? calculatePasswordStrength(password) : null),
    [password]
  );

  const getPasswordStrengthInfo = () => {
    if (!passwordStrength) return null;
    const { score } = passwordStrength;
    if (score < 3) return { level: 'Fraca', color: '#ff4444', progress: 0.33 };
    if (score < 5) return { level: 'Média', color: '#ffa500', progress: 0.66 };
    return { level: 'Forte', color: '#28a745', progress: 1 };
  };

  const strengthInfo = useMemo(() => getPasswordStrengthInfo(), [passwordStrength]);

  const getPasswordInputStyle = () => {
    if (errors.password) return styles.inputError;
    if (!passwordStrength) return styles.inputDefault;
    const { score } = passwordStrength;
    if (score <= 2) return styles.inputError;
    if (score <= 4) return styles.inputWarning;
    return styles.inputSuccess;
  };

  const getConfirmPasswordInputStyle = () => {
    if (errors.confirmPassword) return styles.inputError;
    if (confirmPassword.length > 0 && password !== confirmPassword) return styles.inputError;
    if (confirmPassword.length > 0 && password === confirmPassword && password.length >= 6) return styles.inputSuccess;
    return styles.inputDefault;
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerSection}>
            <SafiraLogo size={80} style={{ marginBottom: -10 }} />
            <Text style={styles.title}>Crie sua conta</Text>
            <Text style={styles.subtitle}>Preencha seus dados para começar</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome completo *</Text>
              <ModernInput
                placeholder="Seu nome completo"
                value={nome}
                onChangeText={(t) => { setNome(t); clearError('nome'); }}
                icon={<User width={20} height={20} color={COLORS.mediumBlue} />}
                error={!!errors.nome}
                style={errors.nome ? styles.inputError : styles.inputDefault}
              />
            </View>

            <CpfInput
              value={cpf}
              onChangeText={(t) => { setCpf(t); clearError('cpf'); }}
              hasError={!!errors.cpf}
              error={inlineError(errors.cpf)}
              label="CPF *"
            />

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
                style={errors.email ? styles.inputError : styles.inputDefault}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Telefone *</Text>
                {inlineError(errors.telefone) && <Text style={styles.errorText}>{inlineError(errors.telefone)}</Text>}
              </View>
              <ModernInput
                placeholder="(00) 00000-0000"
                value={telefone}
                onChangeText={(t) => { setTelefone(formatPhone(t)); clearError('telefone'); }}
                keyboardType="phone-pad"
                icon={<Phone width={20} height={20} color={COLORS.mediumBlue} />}
                error={!!errors.telefone}
                style={errors.telefone ? styles.inputError : styles.inputDefault}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Data de nascimento *</Text>
                {inlineError(errors.dataNascimento) && <Text style={styles.errorText}>{inlineError(errors.dataNascimento)}</Text>}
              </View>
              <ModernInput
                placeholder="DD/MM/AAAA"
                value={dataNascimento}
                onChangeText={(t) => { setDataNascimento(formatDate(t)); clearError('dataNascimento'); }}
                keyboardType="numeric"
                icon={<Calendar width={20} height={20} color={COLORS.mediumBlue} />}
                error={!!errors.dataNascimento}
                style={errors.dataNascimento ? styles.inputError : styles.inputDefault}
              />
            </View>

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
                  <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                    {isPasswordVisible ? (
                      <Eye width={20} height={20} color={COLORS.gray} />
                    ) : (
                      <EyeOff width={20} height={20} color={COLORS.gray} />
                    )}
                  </TouchableOpacity>
                }
                error={!!errors.password}
                style={getPasswordInputStyle()}
              />
              {strengthInfo && (
                <View style={styles.passwordStrengthContainer}>
                  <View style={styles.passwordStrengthBar}>
                    <View style={[styles.passwordStrengthProgress, { backgroundColor: strengthInfo.color, width: `${strengthInfo.progress * 100}%` }]} />
                  </View>
                  <Text style={[styles.passwordStrengthText, { color: strengthInfo.color }]}>
                    Senha {strengthInfo.level.toLowerCase()}
                  </Text>
                </View>
              )}
              {passwordStrength && (
                <View style={styles.passwordCriteriaContainer}>
                  <View style={styles.passwordCriteriaRow}>
                    <Text style={[styles.passwordCriteriaText, passwordStrength.checks.length ? styles.criteriaMet : styles.criteriaNotMet]}>✓ Pelo menos 6 caracteres</Text>
                    <Text style={[styles.passwordCriteriaText, passwordStrength.checks.lowercase ? styles.criteriaMet : styles.criteriaNotMet]}>✓ Letra minúscula</Text>
                  </View>
                  <View style={styles.passwordCriteriaRow}>
                    <Text style={[styles.passwordCriteriaText, passwordStrength.checks.uppercase ? styles.criteriaMet : styles.criteriaNotMet]}>✓ Letra maiúscula</Text>
                    <Text style={[styles.passwordCriteriaText, passwordStrength.checks.numbers ? styles.criteriaMet : styles.criteriaNotMet]}>✓ Número</Text>
                  </View>
                  <View style={styles.passwordCriteriaRow}>
                    <Text style={[styles.passwordCriteriaText, passwordStrength.checks.special ? styles.criteriaMet : styles.criteriaNotMet]}>✓ Caractere especial</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Confirmar senha *</Text>
                {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
              </View>
              <ModernInput
                placeholder="Repita a senha"
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); clearError('confirmPassword'); }}
                secureTextEntry={!isConfirmPasswordVisible}
                icon={<Lock width={20} height={20} color={COLORS.mediumBlue} />}
                rightIcon={
                  <TouchableOpacity onPress={() => setIsConfirmPasswordVisible((prev) => !prev)}>
                    {isConfirmPasswordVisible ? (
                      <Eye width={20} height={20} color={COLORS.gray} />
                    ) : (
                      <EyeOff width={20} height={20} color={COLORS.gray} />
                    )}
                  </TouchableOpacity>
                }
                error={!!errors.confirmPassword}
                style={getConfirmPasswordInputStyle()}
              />
            </View>

            <ModernButton
              title="Criar conta"
              onPress={handleRegister}
              loading={isLoading}
              size="medium"
              style={styles.registerButton}
            />

            <TouchableOpacity style={styles.loginLink} onPress={() => router.back()}>
              <Text style={styles.loginLinkText}>
                Já tem uma conta? <Text style={styles.loginLinkBold}>Entrar</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ModernModal
        visible={!!alertMessage}
        type={alertType}
        title={alertType === 'success' ? 'Sucesso!' : 'Atenção'}
        message={alertMessage ?? ''}
        primaryButtonText={alertType === 'success' ? 'Ir para Home' : 'Tentar novamente'}
        onClose={handleAlertDismiss}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scrollContainer: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 50, paddingBottom: 40 },
  headerSection: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.navy, marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.gray },
  formContainer: { width: '100%' },
  inputGroup: { marginBottom: 4 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.navy, marginLeft: 4 },
  inputDefault: { borderColor: '#e1e5e9', borderWidth: 1.5, height: 52, fontSize: 14 },
  inputError: { borderColor: COLORS.error, borderWidth: 1.5, height: 52, fontSize: 14 },
  inputWarning: { borderColor: '#ffa500', borderWidth: 1.5, height: 52, fontSize: 14 },
  inputSuccess: { borderColor: '#28a745', borderWidth: 1.5, height: 52, fontSize: 14 },
  passwordStrengthContainer: { marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  passwordStrengthBar: { flex: 1, height: 4, backgroundColor: '#e1e5e9', borderRadius: 2, marginRight: 12, overflow: 'hidden' },
  passwordStrengthProgress: { height: '100%', borderRadius: 2 },
  passwordStrengthText: { fontSize: 11, fontWeight: '600' },
  passwordCriteriaContainer: { marginTop: 6, backgroundColor: '#f8f9fa', borderRadius: 8, padding: 12 },
  passwordCriteriaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  passwordCriteriaText: { fontSize: 10, flex: 1 },
  criteriaMet: { color: '#28a745' },
  criteriaNotMet: { color: COLORS.gray },
  registerButton: { marginTop: 12, shadowColor: COLORS.mediumBlue, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  loginLink: { alignItems: 'center', marginTop: 20, paddingVertical: 8 },
  loginLinkText: { fontSize: 14, color: COLORS.gray },
  loginLinkBold: { color: COLORS.mediumBlue, fontWeight: '700' },
  errorText: { fontSize: 12, color: COLORS.error, marginRight: 4 },
});
