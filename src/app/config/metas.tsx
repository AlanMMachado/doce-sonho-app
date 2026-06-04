import Header from '@/components/Header';
import { COLORS } from '@/constants/Colors';
import { useApp } from '@/contexts/AppContext';
import { ConfigService } from '@/service/configService';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Text, TextInput } from 'react-native-paper';

export default function MetasScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    meta_diaria_valor: '200.00',
  });

  useFocusEffect(
    React.useCallback(() => {
      carregarConfiguracoes();
    }, [])
  );

  const carregarConfiguracoes = async () => {
    try {
      setLoading(true);
      const configs = await ConfigService.getAllAsRecord();

      setFormData({
        meta_diaria_valor: (configs.meta_diaria_valor || 200.00).toString(),
      });
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      Alert.alert('Erro', 'Não foi possível carregar as configurações.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validar valores
      const metaValor = parseFloat(formData.meta_diaria_valor);

      if (metaValor <= 0) {
        Alert.alert('Erro', 'O valor da meta deve ser positivo.');
        return;
      }

      // Salvar configurações
      await ConfigService.setValor('meta_diaria_valor', metaValor, 'float');

      // Atualizar contexto
      const configsAtualizadas = await ConfigService.getAllAsRecord();
      dispatch({ type: 'SET_CONFIGURACOES', payload: configsAtualizadas });

      Alert.alert('Sucesso', 'Metas salvas com sucesso!');
      router.back();
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      Alert.alert('Erro', 'Não foi possível salvar as metas.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Metas" subtitle="Carregando..." />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.mediumBlue} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Metas" subtitle="Configure suas metas diárias" />

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Meta Diária */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Meta Diária</Text>

            <View style={styles.inputRow}>
              <Text style={styles.label}>Valor da Meta (R$)</Text>
              <TextInput
                style={styles.input}
                value={formData.meta_diaria_valor}
                onChangeText={(value) => setFormData(prev => ({ ...prev, meta_diaria_valor: value }))}
                keyboardType="numeric"
                placeholder="200.00"
              />
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
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.white} size={20} />
              ) : (
                <Text style={styles.saveButtonText}>Salvar</Text>
              )}
            </TouchableOpacity>
          </View>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
    flex: 1,
  },
  input: {
    backgroundColor: COLORS.softGray,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    width: 120,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 32,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.borderGray,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textMedium,
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.mediumBlue,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});