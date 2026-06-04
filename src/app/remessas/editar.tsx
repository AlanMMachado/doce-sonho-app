import Header from '@/components/Header';
import { COLORS } from '@/constants/Colors';
import { ProdutoConfigService } from '@/service/produtoConfigService';
import { RemessaService } from '@/service/remessaService';
import { ProdutoConfig } from '@/types/ProdutoConfig';
import { ProdutoRemessaForm } from '@/types/Remessa';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Minus, Package, Plus, Trash2 } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Text, TextInput } from 'react-native-paper';

export default function EditarRemessaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [observacao, setObservacao] = useState('');
  const [produtosConfig, setProdutosConfig] = useState<ProdutoConfig[]>([]);
  const [produtos, setProdutos] = useState<ProdutoRemessaForm[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (id) {
        carregarDados();
      }
    }, [id])
  );

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Carregar remessa atual
      const remessa = await RemessaService.getById(parseInt(id));
      if (remessa) {
        setObservacao(remessa.observacao || '');
        
        // Mapear produtos atuais
        const produtosMapeados: ProdutoRemessaForm[] = remessa.produtos?.map(p => ({
          id: p.id,
          produtoConfigId: 0,
          tipo: p.tipo,
          sabor: p.sabor,
          quantidade_inicial: p.quantidade_inicial.toString(),
          preco_base: p.preco_base || 0,
          preco_promocao: p.preco_promocao,
          quantidade_promocao: p.quantidade_promocao
        })) || [];
        
        setProdutos(produtosMapeados);
      }
      
      // Carregar produtos configurados
      const configs = await ProdutoConfigService.getAll();
      setProdutosConfig(configs);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const adicionarProduto = (produtoConfig: ProdutoConfig) => {
    const novoProduto: ProdutoRemessaForm = {
      produtoConfigId: produtoConfig.id,
      tipo: produtoConfig.tipo,
      tipo_customizado: produtoConfig.tipo_customizado,
      sabor: '',
      quantidade_inicial: '',
      preco_base: produtoConfig.preco_base,
      preco_promocao: produtoConfig.preco_promocao,
      quantidade_promocao: produtoConfig.quantidade_promocao
    };

    setProdutos([...produtos, novoProduto]);
  };

  const removerProduto = (index: number) => {
    setProdutos(produtos.filter((_, i) => i !== index));
  };

  const atualizarProduto = (index: number, campo: keyof ProdutoRemessaForm, valor: string) => {
    const novosProdutos = [...produtos];
    (novosProdutos[index] as any)[campo] = valor;
    setProdutos(novosProdutos);
  };

  const handleSubmit = async () => {
    const produtosValidos = produtos.filter(p => {
      const quantidadeValida = p.quantidade_inicial.trim() && !isNaN(parseInt(p.quantidade_inicial)) && parseInt(p.quantidade_inicial) > 0;
      return p.sabor.trim() && quantidadeValida;
    });

    if (produtosValidos.length === 0) {
      alert('Adicione pelo menos um produto válido com sabor e quantidade.');
      return;
    }

    try {
      setSaving(true);

      // Atualizar observação
      await RemessaService.update(parseInt(id), {
        observacao: observacao.trim() || undefined
      });

      // Deletar produtos com ID que não existem mais na lista
      const produtosAtuaisIds = produtosValidos.filter(p => p.id).map(p => p.id!);
      const remessaAtual = await RemessaService.getById(parseInt(id));
      const produtosParaDeletar = (remessaAtual?.produtos || [])
        .filter(p => !produtosAtuaisIds.includes(p.id))
        .map(p => p.id);
      
      for (const produtoId of produtosParaDeletar) {
        await RemessaService.deleteProduto(produtoId);
      }

      // Atualizar ou adicionar produtos
      for (const produto of produtosValidos) {
        const tipoFinal = produto.tipo === 'outro' && produto.tipo_customizado
          ? produto.tipo_customizado.charAt(0).toUpperCase() + produto.tipo_customizado.slice(1).toLowerCase()
          : produto.tipo;

        if (produto.id) {
          // Atualizar produto existente
          await RemessaService.updateProduto(produto.id, {
            tipo: tipoFinal,
            sabor: produto.sabor.trim(),
            quantidade_inicial: parseInt(produto.quantidade_inicial),
            preco_base: produto.preco_base,
            preco_promocao: produto.preco_promocao,
            quantidade_promocao: produto.quantidade_promocao
          });
        } else {
          // Adicionar novo produto
          await RemessaService.addProduto(parseInt(id), {
            tipo: tipoFinal,
            sabor: produto.sabor.trim(),
            quantidade_inicial: parseInt(produto.quantidade_inicial),
            preco_base: produto.preco_base,
            preco_promocao: produto.preco_promocao,
            quantidade_promocao: produto.quantidade_promocao,
            produto_config_id: produto.produtoConfigId
          });
        }
      }

      router.back();
    } catch (error) {
      console.error('Erro ao salvar remessa:', error);
      alert('Erro ao salvar remessa. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const getTipoDisplay = (produto: ProdutoRemessaForm) => {
    return produto.tipo === 'outro' && produto.tipo_customizado
      ? produto.tipo_customizado
      : produto.tipo;
  };

  return (
    <View style={styles.container}>
      <Header title="Editar Remessa" subtitle="Atualize os produtos e dados" />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.mediumBlue} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* PASSO 1: Seleção de Produtos Configurados */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepNumber}>1</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Adicionar Produtos</Text>
                  <Text style={styles.sectionSubtitle}>Toque para adicionar à remessa</Text>
                </View>
              </View>

              {produtosConfig.length === 0 ? (
                <View style={styles.emptyState}>
                  <Package size={40} color={COLORS.textLight} />
                  <Text style={styles.emptyText}>Nenhum produto configurado</Text>
                  <Text style={styles.emptySubtext}>
                    Vá para Configurações → Produtos para configurar seus produtos primeiro.
                  </Text>
                </View>
              ) : (
                <View style={styles.produtosConfigGrid}>
                  {produtosConfig.map((config) => {
                    const count = produtos.filter(p => p.produtoConfigId === config.id).length;
                    return (
                      <TouchableOpacity
                        key={config.id}
                        onPress={() => adicionarProduto(config)}
                        style={[
                          styles.produtoConfigCard,
                          count > 0 && styles.produtoConfigCardActive
                        ]}
                        activeOpacity={0.7}
                      >
                        <View style={styles.produtoConfigLeft}>
                          <Text style={styles.produtoConfigTipo}>
                            {config.tipo === 'outro' ? config.tipo_customizado : config.tipo}
                          </Text>
                          <Text style={styles.produtoConfigPreco}>
                            R$ {config.preco_base.toFixed(2)}
                            {config.preco_promocao ? ` - ${config.quantidade_promocao} por R$ ${config.preco_promocao.toFixed(2)} un `  : ''}
                          </Text>
                        </View>
                        <View style={styles.produtoConfigRight}>
                          {count > 0 && (
                            <View style={styles.configCountBadge}>
                              <Text style={styles.configCountText}>{count}</Text>
                            </View>
                          )}
                          <Plus size={18} color={COLORS.mediumBlue} />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* PASSO 2: Produtos na Remessa */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepNumber}>2</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Produtos na Remessa</Text>
                  <Text style={styles.sectionSubtitle}>Informe sabor e quantidade</Text>
                </View>
                {produtos.length > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{produtos.length}</Text>
                  </View>
                )}
              </View>

              {produtos.length === 0 ? (
                <View style={styles.emptyProducts}>
                  <Text style={styles.emptyProductsText}>
                    Selecione produtos na etapa acima para adicioná-los aqui
                  </Text>
                </View>
              ) : (
                produtos.map((produto, index) => (
                  <View key={index} style={styles.produtoCard}>
                    <View style={styles.produtoCardHeader}>
                      <View style={styles.produtoTypeTag}>
                        <Text style={styles.produtoTypeText}>{getTipoDisplay(produto)}</Text>
                      </View>
                      <View style={{ flex: 1 }} />
                      <TouchableOpacity
                        onPress={() => removerProduto(index)}
                        style={styles.removeButton}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={16} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.produtoCardInputs}>
                      {/* Sabor */}
                      <View style={styles.inputFlex}>
                        <Text style={styles.label}>Sabor *</Text>
                        <TextInput
                          value={produto.sabor}
                          onChangeText={(text) => atualizarProduto(index, 'sabor', text)}
                          style={styles.input}
                          mode="outlined"
                          placeholder="Ex: Morango"
                          dense
                          outlineColor={COLORS.borderGray}
                          activeOutlineColor={COLORS.mediumBlue}
                        />
                      </View>

                      {/* Quantidade */}
                      <View style={styles.inputQuantidade}>
                        <Text style={styles.label}>Qtd *</Text>
                        <View style={styles.quantityControl}>
                          <TouchableOpacity
                            onPress={() => {
                              const current = parseInt(produto.quantidade_inicial) || 0;
                              if (current > 0) atualizarProduto(index, 'quantidade_inicial', (current - 1).toString());
                            }}
                            style={[
                              styles.quantityButton,
                              (!produto.quantidade_inicial || parseInt(produto.quantidade_inicial) <= 0) && styles.quantityButtonDisabled
                            ]}
                            disabled={!produto.quantidade_inicial || parseInt(produto.quantidade_inicial) <= 0}
                          >
                            <Minus size={16} color={(!produto.quantidade_inicial || parseInt(produto.quantidade_inicial) <= 0) ? COLORS.textLight : COLORS.textDark} />
                          </TouchableOpacity>
                          <TextInput
                            value={produto.quantidade_inicial}
                            onChangeText={(text) => atualizarProduto(index, 'quantidade_inicial', text.replace(/[^0-9]/g, ''))}
                            keyboardType="numeric"
                            style={styles.quantityInput}
                            mode="outlined"
                            dense
                            outlineColor={COLORS.borderGray}
                            activeOutlineColor={COLORS.mediumBlue}
                          />
                          <TouchableOpacity
                            onPress={() => {
                              const current = parseInt(produto.quantidade_inicial) || 0;
                              atualizarProduto(index, 'quantidade_inicial', (current + 1).toString());
                            }}
                            style={styles.quantityButton}
                          >
                            <Plus size={16} color={COLORS.textDark} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* PASSO 3: Observações */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.stepBadge, styles.stepBadgeOptional]}>
                  <Text style={styles.stepNumber}>3</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Observações</Text>
                  <Text style={styles.sectionSubtitle}>Opcional - adicione notas sobre a remessa</Text>
                </View>
              </View>
              <TextInput
                value={observacao}
                onChangeText={(text) => setObservacao(text.slice(0, 200))}
                style={styles.observacaoInput}
                mode="outlined"
                multiline
                numberOfLines={3}
                placeholder="Ex: Remessa da segunda-feira, lembrar de congelar..."
                outlineColor={COLORS.borderGray}
                activeOutlineColor={COLORS.mediumBlue}
                placeholderTextColor={COLORS.textLight}
              />
              <Text style={styles.charCount}>
                {observacao.length}/200
              </Text>
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
                style={[
                  styles.submitButton,
                  (saving || produtos.length === 0) && styles.submitButtonDisabled
                ]}
                onPress={handleSubmit}
                disabled={saving || produtos.length === 0}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" size={20} />
                ) : (
                  <Text style={styles.submitButtonText}>Salvar Alterações</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.softGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },

  // SEÇÕES
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  stepBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.mediumBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBadgeOptional: {
    backgroundColor: COLORS.textLight,
  },
  stepNumber: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textMedium,
  },

  // EMPTY STATE
  emptyState: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: COLORS.softGray,
    borderRadius: 12,
    gap: 10,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textMedium,
    textAlign: 'center',
    lineHeight: 20,
  },

  // LISTA DE PRODUTOS CONFIG
  produtosConfigGrid: {
    gap: 8,
  },
  emptyProducts: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: COLORS.softGray,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    borderStyle: 'dashed' as const,
  },
  emptyProductsText: {
    fontSize: 14,
    color: COLORS.textMedium,
    textAlign: 'center',
  },
  produtoConfigCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.softGray,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.borderGray,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  produtoConfigCardActive: {
    borderColor: COLORS.mediumBlue,
    backgroundColor: 'rgba(27, 65, 164, 0.04)',
  },
  produtoConfigLeft: {
    flex: 1,
  },
  produtoConfigTipo: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    textTransform: 'capitalize',
  },
  produtoConfigPreco: {
    fontSize: 13,
    color: COLORS.textMedium,
    fontWeight: '500',
    marginTop: 2,
  },
  produtoConfigRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  configCountBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.mediumBlue,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  configCountText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },

  // BADGE
  badge: {
    backgroundColor: COLORS.softGray,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.mediumBlue,
  },

  // PRODUTO CARD (na remessa)
  produtoCard: {
    backgroundColor: COLORS.softGray,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
  },
  produtoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  produtoTypeTag: {
    backgroundColor: COLORS.mediumBlue,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  produtoTypeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  removeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.error,
  },

  // INPUTS
  produtoCardInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  inputFlex: {
    flex: 1,
  },
  inputQuantidade: {
    width: 150,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.white,
    fontSize: 14,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    opacity: 0.4,
  },
  quantityInput: {
    flex: 1,
    backgroundColor: COLORS.white,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
  },

  // OBSERVAÇÃO
  observacaoInput: {
    backgroundColor: COLORS.softGray,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 6,
    textAlign: 'right',
  },

  // AÇÕES
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.borderGray,
    paddingVertical: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMedium,
  },
  submitButton: {
    flex: 2,
    backgroundColor: COLORS.mediumBlue,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
});