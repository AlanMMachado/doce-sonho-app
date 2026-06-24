import DoceAmorLogo from '@/components/DoceAmorLogo';
import ModernButton from '@/components/ModernButton';
import ModernInput from '@/components/ModernInput';
import ModernModal from '@/components/ModernModal';
import { COLORS } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const clearError = (field: string) => {
    setErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
  };

  const handleLogin = async () => {
    const newErrors: Record<string, string> = {};
    if (!email.trim()) newErrors.email = 'E-mail é obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'E-mail inválido';
    if (!password) newErrors.password = 'Senha é obrigatória';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e: any) {
      setServerError(e.message ?? 'Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
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
            <View>
              <DoceAmorLogo size={80} style={{ marginBottom: -5 }} />
            </View>
            <Text style={styles.title}>Bem-vindo ao Doce Sonho!</Text>
            <Text style={styles.subtitle}>Faça login para continuar</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>E-mail *</Text>
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
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

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Senha *</Text>
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              </View>
              <ModernInput
                placeholder="Sua senha"
                value={password}
                onChangeText={(t) => { setPassword(t); clearError('password'); }}
                secureTextEntry={!isPasswordVisible}
                autoComplete="password"
                icon={<Lock width={20} height={20} color={COLORS.mediumBlue} />}
                rightIcon={
                  <TouchableOpacity
                    onPress={() => setIsPasswordVisible(prev => !prev)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {isPasswordVisible
                      ? <Eye width={20} height={20} color={COLORS.gray} />
                      : <EyeOff width={20} height={20} color={COLORS.gray} />
                    }
                  </TouchableOpacity>
                }
                error={!!errors.password}
              />
            </View>

            <ModernButton
              title="Entrar"
              onPress={handleLogin}
              loading={loading}
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
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ModernModal
        visible={!!serverError}
        onClose={() => setServerError(null)}
        title="Erro ao entrar"
        primaryAction={{ label: 'Tentar novamente', onPress: () => setServerError(null) }}>
        <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 }}>{serverError ?? ''}</Text>
      </ModernModal>
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
  title: {
    fontSize: 24,
    color: COLORS.textDark,
    fontFamily: 'Nunito_600SemiBold',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray,
    fontFamily: 'Nunito_400Regular',
  },
  formContainer: { width: '100%' },
  inputGroup: { marginBottom: 4 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    marginLeft: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.navy,
    fontFamily: 'Nunito_600SemiBold',
  },
  errorText: { fontSize: 12, color: COLORS.error, fontFamily: 'Nunito_400Regular' },
  loginButton: {
    marginTop: 8,
    shadowColor: COLORS.mediumBlue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e1e5e9' },
  dividerText: {
    marginHorizontal: 12,
    color: COLORS.gray,
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Nunito_500Medium',
  },
});
