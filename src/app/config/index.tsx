import Header from '@/components/Header';
import ModernModal from '@/components/ModernModal';
import { COLORS } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { ChevronRight, LogOut, Package, User } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

export default function ConfigScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const configItems = [
    {
      title: 'Produtos',
      description: 'Configure tipos de produto, preços base e promoções',
      onPress: () => router.push('/config/products'),
      icon: Package,
    },
    {
      title: 'Meu Perfil',
      description: 'Edite seus dados pessoais e meta diária',
      onPress: () => router.push('/config/profile'),
      icon: User,
    },
  ];

  return (
    <View style={styles.container}>
      <Header title="Configurações" subtitle="Gerencie as configurações do sistema" />

      <ScrollView style={styles.content}>
        <View style={styles.configList}>
          {configItems.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <TouchableOpacity
                key={index}
                onPress={item.onPress}
                style={styles.configItem}
                activeOpacity={0.7}
              >
                <View style={styles.configItemContent}>
                  <View style={styles.configIconContainer}>
                    <IconComponent size={24} color={COLORS.mediumBlue} />
                  </View>
                  <View style={styles.configText}>
                    <Text style={styles.configTitle}>{item.title}</Text>
                    <Text style={styles.configDescription}>{item.description}</Text>
                  </View>
                </View>
                <ChevronRight size={20} color={COLORS.textLight} />
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={() => setLogoutModalVisible(true)}
          style={[styles.configItem, styles.logoutItem]}
          activeOpacity={0.7}
        >
          <View style={styles.configItemContent}>
            <View style={[styles.configIconContainer, styles.logoutIconContainer]}>
              <LogOut size={24} color={COLORS.error} />
            </View>
            <View style={styles.configText}>
              <Text style={[styles.configTitle, styles.logoutTitle]}>Sair</Text>
              <Text style={styles.configDescription}>Sair da sua conta</Text>
            </View>
          </View>
          <ChevronRight size={20} color={COLORS.error} />
        </TouchableOpacity>
      </ScrollView>

      <ModernModal
        visible={logoutModalVisible}
        onClose={() => setLogoutModalVisible(false)}
        title="Sair do app"
        primaryAction={{ label: 'Sair', onPress: handleLogout, destructive: true }}
        secondaryAction={{ label: 'Cancelar', onPress: () => setLogoutModalVisible(false) }}>
        <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 }}>
          Tem certeza que deseja sair da sua conta?
        </Text>
      </ModernModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.softGray,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  configList: {
    gap: 12,
  },
  configItem: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  configItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  configIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.softGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  configText: {
    flex: 1,
  },
  configTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  configDescription: {
    fontSize: 14,
    color: COLORS.textMedium,
  },
  logoutItem: {
    marginTop: 24,
    borderColor: COLORS.error,
    borderWidth: 1.5,
  },
  logoutIconContainer: {
    backgroundColor: `${COLORS.error}15`,
  },
  logoutTitle: {
    color: COLORS.error,
  },
});
