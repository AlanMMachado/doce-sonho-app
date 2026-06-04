import Header from '@/components/Header';
import { COLORS } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import { ChevronRight, Package, Settings } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

export default function ConfigScreen() {
  const router = useRouter();

  const configItems = [
    {
      title: 'Produtos',
      description: 'Configure tipos de produto, preços base e promoções',
      onPress: () => router.push('/config/produtos'),
      icon: Package
    },
    {
      title: 'Metas',
      description: 'Configure metas diárias de vendas',
      onPress: () => router.push('/config/metas'),
      icon: Settings
    }
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
                    <Text style={styles.configTitle}>
                      {item.title}
                    </Text>
                    <Text style={styles.configDescription}>
                      {item.description}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color={COLORS.textLight} />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
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
});