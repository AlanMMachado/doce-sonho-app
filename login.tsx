import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Eye, EyeOff, Lock, Mail } from 'react-native-feather';
import ModernButton from '../../components/ModernButton';
import ModernInput from '../../components/ModernInput';
import ModernModal from '../../components/ModernModal';
import SafiraLogo from '../../components/SafiraLogo';
import { COLORS } from '../../constants/Colors';
import { useAuth } from '../../lib/context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    const newErrors: { [key: string]: string } = {};
    if (!email.trim()) newErrors.email = 'Por favor, informe seu e-mail';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'E-mail inválido';
    if (!password) newErrors.password = 'Por favor, informe sua senha';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    try {
      await login({ email, senha: password });
      // Navegação tratada pelo (auth)/_layout.tsx via <Redirect>
    } catch (error: any) {
      setAlertMessage(error.message || 'Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -40}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.headerSection}>
            <View style={styles.logoContainer}>
              <SafiraLogo size={80} style={{ marginBottom: -10 }} />
            </View>
            <Text style={styles.welcomeTitle}>Bem-vindo ao Safira+</Text>
            <Text style={styles.welcomeSubtitle}>
              Portal de Auto-Contratação de Crédito
            </Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>E-mail *</Text>
              <ModernInput
                placeholder="seu@email.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.email;
                    return next;
                  });
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                icon={<Mail width={20} height={20} color={COLORS.mediumBlue} />}
                error={!!errors.email}
                style={errors.email ? styles.inputError : styles.inputDefault}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Senha *</Text>
              <ModernInput
                placeholder="Sua senha"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.password;
                    return next;
                  });
                }}
                secureTextEntry={!isPasswordVisible}
                autoComplete="password"
                icon={<Lock width={20} height={20} color={COLORS.mediumBlue} />}
                rightIcon={
                  <TouchableOpacity
                    onPress={() => setIsPasswordVisible((prev) => !prev)}
                    style={styles.iconTouchable}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {isPasswordVisible ? (
                      <Eye width={20} height={20} color={COLORS.gray} />
                    ) : (
                      <EyeOff width={20} height={20} color={COLORS.gray} />
                    )}
                  </TouchableOpacity>
                }
                error={!!errors.password}
                style={errors.password ? styles.inputError : styles.inputDefault}
              />
            </View>

            <ModernButton
              title="Entrar"
              onPress={handleLogin}
              loading={isLoading}
              size="medium"
              style={styles.loginButton}
            />

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            <ModernButton
              title="Criar nova conta"
              variant="secondary"
              onPress={() => router.push('/register')}
              size="medium"
              style={styles.registerButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ModernModal
        visible={!!alertMessage}
        onClose={() => setAlertMessage(null)}
        title="Atenção"
        message={alertMessage || ''}
        type="error"
        primaryButtonText="Entendi"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  keyboardContainer: { flex: 1 },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 25,
    paddingBottom: 40,
  },
  headerSection: { alignItems: 'center', marginBottom: 6 },
  logoContainer: { paddingLeft: 10 },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.navy,
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
  formContainer: { width: '100%' },
  inputGroup: { marginBottom: 8 },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: 4,
    marginLeft: 4,
  },
  inputDefault: {
    borderColor: '#e1e5e9',
    borderWidth: 1.5,
    height: 52,
    fontSize: 14,
    paddingVertical: 14,
  },
  inputError: {
    borderColor: COLORS.error,
    borderWidth: 1.5,
    height: 52,
    fontSize: 14,
    paddingVertical: 14,
  },
  loginButton: {
    marginTop: 8,
    shadowColor: COLORS.mediumBlue,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 5 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e1e5e9' },
  dividerText: { marginHorizontal: 12, color: COLORS.gray, fontSize: 13, fontWeight: '500' },
  registerButton: {
    marginTop: 8,
    shadowColor: COLORS.mediumBlue,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  iconTouchable: { justifyContent: 'center', alignItems: 'center' },
});
