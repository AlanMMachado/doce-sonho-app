import Header from '@/components/Header';
import { COLORS } from '@/constants/Colors';
import { ProdutoConfigService } from '@/service/produtoConfigService';
import { ProdutoConfig, ProdutoConfigCreateParams, ProdutoConfigForm } from '@/types/ProdutoConfig';
import { useRouter } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Dialog, Portal, Text, TextInput } from 'react-native-paper';

export default function ConfigProdutosScreen() {
  const router = useRouter();
  const [produtosConfig, setProdutosConfig] = useState<ProdutoConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingProduto, setEditingProduto] = useState<ProdutoConfig | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<ProdutoConfigForm>({
    tipo: '',
    tipoCustomizado: '',
    preco_base: '',
    preco_promocao: '',
    quantidade_promocao: ''
  });

  useEffect(() => {
    loadProdutosConfig();
  }, []);

  const loadProdutosConfig = async () => {
    try {
      const produtos = await ProdutoConfigService.getAll();
      setProdutosConfig(produtos);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      Alert.alert('Erro', 'Não foi possível carregar as configurações de produtos.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      tipo: '',
      tipoCustomizado: '',
      preco_base: '',
      preco_promocao: '',
      quantidade_promocao: ''
    });
    setEditingProduto(null);
  };

  const openDialog = (produto?: ProdutoConfig) => {
    if (produto) {
      setEditingProduto(produto);
      setForm({
        tipo: produto.tipo,
        tipoCustomizado: produto.tipo_customizado || '',
        preco_base: produto.preco_base.toString(),
        preco_promocao: produto.preco_promocao?.toString() || '',
        quantidade_promocao: produto.quantidade_promocao?.toString() || ''
      });
    } else {
      resetForm();
    }
    setDialogVisible(true);
  };

  const closeDialog = () => {
    setDialogVisible(false);
    resetForm();
  };

  const validateForm = (): boolean => {
    if (!form.tipo.trim()) {
      Alert.alert('Erro', 'Selecione o tipo do produto.');
      return false;
    }

    if (form.tipo === 'outro' && !form.tipoCustomizado.trim()) {
      Alert.alert('Erro', 'Digite o tipo customizado do produto.');
      return false;
    }

    if (!form.preco_base.trim() || isNaN(parseFloat(form.preco_base)) || parseFloat(form.preco_base) <= 0) {
      Alert.alert('Erro', 'Digite um preço base válido maior que zero.');
      return false;
    }

    if (form.preco_promocao.trim()) {
      const precoPromo = parseFloat(form.preco_promocao);
      const precoBase = parseFloat(form.preco_base);

      if (isNaN(precoPromo) || precoPromo <= 0) {
        Alert.alert('Erro', 'Digite um preço de promoção válido.');
        return false;
      }

      if (precoPromo >= precoBase) {
        Alert.alert('Erro', 'O preço de promoção deve ser menor que o preço base.');
        return false;
      }
    }

    if (form.quantidade_promocao.trim()) {
      const qtdPromo = parseInt(form.quantidade_promocao);
      if (isNaN(qtdPromo) || qtdPromo < 2) {
        Alert.alert('Erro', 'A quantidade para promoção deve ser pelo menos 2.');
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      const tipoFinal = form.tipo === 'outro' ? form.tipoCustomizado.trim() : form.tipo;

      // Verificar se já existe uma configuração para este tipo
      const existing = await ProdutoConfigService.getByTipo(form.tipo, form.tipo === 'outro' ? form.tipoCustomizado.trim() : undefined);

      if (existing && (!editingProduto || editingProduto.id !== existing.id)) {
        Alert.alert('Erro', 'Já existe uma configuração para este tipo de produto.');
        return;
      }

      const produtoData: ProdutoConfigCreateParams = {
        tipo: form.tipo,
        tipo_customizado: form.tipo === 'outro' ? form.tipoCustomizado.trim() : undefined,
        preco_base: parseFloat(form.preco_base),
        preco_promocao: form.preco_promocao.trim() ? parseFloat(form.preco_promocao) : undefined,
        quantidade_promocao: form.quantidade_promocao.trim() ? parseInt(form.quantidade_promocao) : undefined
      };

      if (editingProduto) {
        await ProdutoConfigService.update(editingProduto.id, produtoData);
      } else {
        await ProdutoConfigService.create(produtoData);
      }

      await loadProdutosConfig();
      closeDialog();
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      Alert.alert('Erro', 'Não foi possível salvar a configuração.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (produto: ProdutoConfig) => {
    Alert.alert(
      'Confirmar exclusão',
      `Deseja realmente excluir a configuração de ${produto.tipo}${produto.tipo_customizado ? ` (${produto.tipo_customizado})` : ''}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await ProdutoConfigService.delete(produto.id);
              await loadProdutosConfig();
            } catch (error) {
              console.error('Erro ao excluir configuração:', error);
              Alert.alert('Erro', 'Não foi possível excluir a configuração.');
            }
          }
        }
      ]
    );
  };

  const getTipoDisplay = (produto: ProdutoConfig) => {
    return produto.tipo === 'outro' ? produto.tipo_customizado : produto.tipo;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.mediumBlue} />
        <Text style={styles.loadingText}>Carregando configurações...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Configurar Produtos" subtitle="Gerencie os tipos de produto e seus preços" />

      <ScrollView style={styles.content}>
        {/* Lista de produtos configurados */}
        <View style={styles.produtosList}>
          <Text style={styles.sectionTitle}>Produtos Configurados</Text>

          {produtosConfig.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Nenhum produto configurado ainda.</Text>
              <Text style={styles.emptySubtext}>Adicione configurações para facilitar a criação de remessas.</Text>
            </View>
          ) : (
            produtosConfig.map((produto) => (
              <View key={produto.id} style={styles.produtoCard}>
                <View style={styles.produtoHeader}>
                  <Text style={styles.produtoTipo}>{getTipoDisplay(produto)}</Text>
                  <View style={styles.produtoActions}>
                    <TouchableOpacity
                      onPress={() => openDialog(produto)}
                      style={styles.editButton}
                    >
                      <Text style={styles.editButtonText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(produto)}
                      style={styles.deleteButton}
                    >
                      <Trash2 size={16} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.produtoDetails}>
                  <Text style={styles.precoText}>Preço Base: R$ {produto.preco_base.toFixed(2)}</Text>
                  {produto.preco_promocao && (
                    <Text style={styles.precoText}>
                      Promoção: R$ {produto.preco_promocao.toFixed(2)} (a partir de {produto.quantidade_promocao} unidades)
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Botão para adicionar */}
        <TouchableOpacity
          onPress={() => openDialog()}
          style={styles.addButton}
          activeOpacity={0.7}
        >
          <Text style={styles.addButtonText}>+ Adicionar Configuração</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Dialog para adicionar/editar */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={closeDialog} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>
            {editingProduto ? 'Editar Configuração' : 'Nova Configuração'}
          </Dialog.Title>
          
          <Dialog.Content style={styles.dialogContent}>
            {/* Tipo */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Tipo *</Text>
              <View style={styles.tipoButtons}>
                {['Trufa', 'Surpresa', 'Torta', 'outro'].map((tipo) => (
                  <TouchableOpacity
                    key={tipo}
                    onPress={() => setForm({...form, tipo})}
                    style={[
                      styles.tipoButton,
                      form.tipo === tipo && styles.tipoButtonActive
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.tipoButtonText,
                      form.tipo === tipo && styles.tipoButtonTextActive
                    ]}>
                      {tipo === 'outro' ? 'Outro' : tipo}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {form.tipo === 'outro' && (
                <TextInput
                  value={form.tipoCustomizado}
                  onChangeText={(text) => setForm({...form, tipoCustomizado: text})}
                  style={[styles.input, styles.customTipoInput]}
                  mode="outlined"
                  placeholder="Digite o tipo do produto..."
                  outlineColor={COLORS.borderGray}
                  activeOutlineColor={COLORS.mediumBlue}
                />
              )}
            </View>

            {/* Preço Base */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Preço Base (R$) *</Text>
              <TextInput
                value={form.preco_base}
                onChangeText={(text) => setForm({...form, preco_base: text})}
                keyboardType="numeric"
                style={styles.input}
                mode="outlined"
                placeholder="Ex: 5.00"
                outlineColor={COLORS.borderGray}
                activeOutlineColor={COLORS.mediumBlue}
              />
            </View>

            {/* Preço Promoção */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Preço Promoção (R$) (opcional)</Text>
              <TextInput
                value={form.preco_promocao}
                onChangeText={(text) => setForm({...form, preco_promocao: text})}
                keyboardType="numeric"
                style={styles.input}
                mode="outlined"
                placeholder="Ex: 4.50"
                outlineColor={COLORS.borderGray}
                activeOutlineColor={COLORS.mediumBlue}
              />
            </View>

            {/* Quantidade Promoção */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Quantidade para Promoção (opcional)</Text>
              <TextInput
                value={form.quantidade_promocao}
                onChangeText={(text) => setForm({...form, quantidade_promocao: text})}
                keyboardType="numeric"
                style={styles.input}
                mode="outlined"
                placeholder="Ex: 3"
                outlineColor={COLORS.borderGray}
                activeOutlineColor={COLORS.mediumBlue}
              />
            </View>
          </Dialog.Content>

          {/* Botões de Ação */}
          <View style={styles.dialogButtonsContainer}>
            <TouchableOpacity
              onPress={closeDialog}
              disabled={saving}
              style={[styles.dialogButtonCancel, saving && styles.buttonDisabled]}
            >
              <Text style={styles.dialogButtonCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={[styles.dialogButtonSave, saving && styles.buttonDisabled]}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.white} size={20} />
              ) : (
                <Text style={styles.dialogButtonSaveText}>
                  {editingProduto ? 'Atualizar' : 'Salvar'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Dialog>
      </Portal>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.softGray,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textMedium,
  },
  produtosList: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 16,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textMedium,
    textAlign: 'center',
  },
  produtoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    padding: 16,
    marginBottom: 12,
  },
  produtoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  produtoTipo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  produtoActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: COLORS.softGray,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.mediumBlue,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.mediumBlue,
  },
  deleteButton: {
    backgroundColor: COLORS.softGray,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.error,
  },
  produtoDetails: {
    gap: 4,
  },
  precoText: {
    fontSize: 14,
    color: COLORS.textDark,
  },
  addButton: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.borderGray,
    borderStyle: 'dashed',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 32,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.mediumBlue,
  },
  dialog: {
    backgroundColor: COLORS.white,
  },
  dialogTitle: {
    color: COLORS.textDark,
    fontSize: 20,
    fontWeight: '700',
  },
  dialogContent: {
    paddingVertical: 12,
    backgroundColor: COLORS.white,
  },
  dialogButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderGray,
  },
  dialogButtonCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.borderGray,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogButtonCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMedium,
  },
  dialogButtonSave: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.mediumBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogButtonSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.white,
  },
  tipoButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tipoButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    backgroundColor: COLORS.white,
  },
  tipoButtonActive: {
    borderColor: COLORS.mediumBlue,
    backgroundColor: COLORS.mediumBlue,
  },
  tipoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMedium,
  },
  tipoButtonTextActive: {
    color: COLORS.white,
  },
  customTipoInput: {
    marginTop: 8,
  },
});