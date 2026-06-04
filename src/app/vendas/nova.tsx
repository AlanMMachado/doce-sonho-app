import ClienteSearchInput from '@/components/ClienteSearchInput';
import Header from '@/components/Header';
import { COLORS } from '@/constants/Colors';
import { useApp } from '@/contexts/AppContext';
import { RemessaService } from '@/service/remessaService';
import { SyncService } from '@/service/syncService';
import { VendaService, recalcularTodosPrecos } from '@/service/vendaService';
import { Produto } from '@/types/Produto';
import { ItemVendaForm } from '@/types/Venda';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Text, TextInput } from 'react-native-paper';

const { width } = Dimensions.get('window');

export default function NovaVendaScreen() {
  const router = useRouter();
  const { dispatch } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [itens, setItens] = useState<ItemVendaForm[]>([]);
  const [formData, setFormData] = useState({
    cliente: '',
    status: 'OK' as 'OK' | 'PENDENTE',
    metodo_pagamento: 'Pix'
  });

  useFocusEffect(
    useCallback(() => {
      carregarProdutos();
    }, [])
  );

  const carregarProdutos = async () => {
    try {
      setLoading(true);
      const remessasAtivas = await RemessaService.getAtivas();
      const todosProdutos: Produto[] = [];
      
      for (const remessa of remessasAtivas) {
        const produtosRemessa = await RemessaService.getProdutosByRemessaId(remessa.id);
        const produtosDisponiveis = produtosRemessa.filter(p => 
          p.quantidade_inicial - p.quantidade_vendida > 0
        );
        todosProdutos.push(...produtosDisponiveis);
      }
      
      setProdutos(todosProdutos);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  const setProductQuantidade = (produtoId: string, quantidade: number) => {
    const produto = produtos.find(p => p.id.toString() === produtoId);
    if (!produto) return;

    const estoqueDisponivel = produto.quantidade_inicial - produto.quantidade_vendida;
    
    // Validar quantidade máxima
    if (quantidade > estoqueDisponivel) {
      quantidade = estoqueDisponivel;
    }

    if (quantidade <= 0) {
      // Remover o produto se quantidade é 0
      const novosItens = itens.filter(item => item.produto_id !== produtoId);
      setItens(novosItens);
    } else {
      // Verificar se o produto já existe nos itens
      const itemExistente = itens.findIndex(item => item.produto_id === produtoId);
      
      if (itemExistente >= 0) {
        // Atualizar quantidade do item existente
        const novosItens = [...itens];
        novosItens[itemExistente].quantidade = quantidade.toString();
        const itensComPrecosAtualizados = recalcularTodosPrecos(novosItens, produtos);
        setItens(itensComPrecosAtualizados);
      } else {
        // Criar novo item
        const novoItem: ItemVendaForm = {
          produto_id: produtoId,
          quantidade: quantidade.toString(),
          preco_base: '',
          preco_desconto: '',
          subtotal: '',
          quantidade_com_desconto: '0',
          quantidade_sem_desconto: '0'
        };
        const novosItens = [...itens, novoItem];
        const itensComPrecosAtualizados = recalcularTodosPrecos(novosItens, produtos);
        setItens(itensComPrecosAtualizados);
      }
    }
  };

  const getProductQuantidade = (produtoId: string): number => {
    const item = itens.find(i => i.produto_id === produtoId);
    return item ? parseInt(item.quantidade) || 0 : 0;
  };

  const calcularTotal = () => {
    return itens.reduce((total, item) => {
      const subtotal = parseFloat(item.subtotal) || 0;
      return total + subtotal;
    }, 0);
  };
  
  const handleSubmit = async () => {
    if (!formData.cliente.trim()) {
      alert('Por favor, informe o nome do cliente');
      return;
    }

    const itensValidos = itens.filter(item => {
      const produto = produtos.find(p => p.id.toString() === item.produto_id);
      return produto && item.quantidade.trim() && parseInt(item.quantidade) > 0 && item.subtotal.trim() && parseFloat(item.subtotal) >= 0;
    });

    if (itensValidos.length === 0) {
      alert('Adicione pelo menos um produto válido');
      return;
    }

    for (const item of itensValidos) {
      const produto = produtos.find(p => p.id.toString() === item.produto_id);
      if (produto) {
        const estoqueDisponivel = produto.quantidade_inicial - produto.quantidade_vendida;
        const quantidadeSolicitada = parseInt(item.quantidade);
        if (quantidadeSolicitada > estoqueDisponivel) {
          alert(`Estoque insuficiente para ${produto.tipo} ${produto.sabor}. Disponível: ${estoqueDisponivel} unidades`);
          return;
        }
      }
    }

    try {
      setSaving(true);
      
      const vendaData = {
        cliente: formData.cliente.trim(),
        data: new Date().toISOString(),
        status: formData.status,
        metodo_pagamento: formData.metodo_pagamento,
        itens: itensValidos.map(item => {
          const produto = produtos.find(p => p.id.toString() === item.produto_id);
          return {
            produto_id: parseInt(item.produto_id),
            produto_tipo: produto?.tipo,
            produto_sabor: produto?.sabor,
            quantidade: parseInt(item.quantidade),
            preco_base: parseFloat(item.preco_base),
            preco_desconto: item.preco_desconto ? parseFloat(item.preco_desconto) : undefined,
            subtotal: parseFloat(item.subtotal)
          };
        })
      };

      const venda = await VendaService.create(vendaData);
      
      // Sincronizar cliente imediatamente (esperar conclusão)
      await SyncService.syncClienteFromVenda(venda);
      
      dispatch({ type: 'ADD_VENDA', payload: venda });
      router.back();
    } catch (error) {
      console.error('Erro ao salvar venda:', error);
      alert('Erro ao salvar venda. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (produtos.length === 0) {
    return (
      <View style={styles.container}>
        <Header title="Nova Venda" subtitle="Registre uma venda rapidamente" />
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyText}>Nenhum produto disponível</Text>
          <Text style={styles.emptySubtext}>Crie uma remessa com produtos primeiro</Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={() => router.push('/remessas/nova')}
          >
            <Text style={styles.emptyButtonText}>+ Criar Remessa</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Nova Venda" subtitle="Registre uma venda rapidamente" />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.mediumBlue} />
        </View>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" style={styles.scrollView}>
          <View style={styles.content}>

            {/* PASSO 1: Seleção de Produtos */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepNumber}>1</Text>
                </View>
                <View>
                  <Text style={styles.sectionTitle}>Selecione os Produtos</Text>
                  <Text style={styles.sectionSubtitle}>Defina as quantidades</Text>
                </View>
              </View>

              {/* Lista de Produtos */}
              <View style={styles.produtosListContainer}>
                {produtos.map((produto) => {
                  const estoque = produto.quantidade_inicial - produto.quantidade_vendida;
                  const quantidadeSelecionada = getProductQuantidade(produto.id.toString());

                  return (
                    <View
                      key={produto.id}
                      style={[
                        styles.produtoListItem,
                        quantidadeSelecionada > 0 && styles.produtoListItemSelected
                      ]}
                    >
                      {/* Info do Produto */}
                      <View style={styles.produtoListInfo}>
                        <Text style={styles.produtoListName}>
                          {produto.tipo}
                          {produto.sabor ? ` - ${produto.sabor}` : ''}
                        </Text>
                        <View>
                          <Text style={styles.produtoListStockText}>
                            {estoque} em estoque
                          </Text>
                        </View>
                      </View>

                      {/* Seletor de Quantidade */}
                        <View style={styles.produtoListQuantityControl}>
                          <TouchableOpacity
                            onPress={() => setProductQuantidade(produto.id.toString(), quantidadeSelecionada - 1)}
                            style={[
                              styles.quantityButtonSmall,
                              quantidadeSelecionada <= 0 && styles.quantityButtonSmallDisabled
                            ]}
                            disabled={quantidadeSelecionada <= 0}
                          >
                            <Text style={styles.quantityButtonSmallText}>−</Text>
                          </TouchableOpacity>
                          <TextInput
                            value={quantidadeSelecionada.toString()}
                            onChangeText={(text) => {
                              const num = parseInt(text) || 0;
                              setProductQuantidade(produto.id.toString(), num);
                            }}
                            keyboardType="numeric"
                            style={styles.quantityInputSmall}
                            mode="outlined"
                            outlineColor={COLORS.borderGray}
                            activeOutlineColor={COLORS.mediumBlue}
                          />
                          <TouchableOpacity
                            onPress={() => setProductQuantidade(produto.id.toString(), quantidadeSelecionada + 1)}
                            style={styles.quantityButtonSmall}
                            disabled={quantidadeSelecionada >= estoque}
                          >
                            <Text style={styles.quantityButtonSmallText}>+</Text>
                          </TouchableOpacity>
                        </View>
                    </View>
                  );
                })}
              </View>

              {produtos.length === 0 && (
                <View style={styles.emptyListMessage}>
                  <Text style={styles.emptyListText}>Nenhum produto disponível</Text>
                </View>
              )}
            </View>

            {/* PASSO 2: Cliente e Pagamento */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepNumber}>2</Text>
                </View>
                <View>
                  <Text style={styles.sectionTitle}>Detalhes da Venda</Text>
                  <Text style={styles.sectionSubtitle}>Cliente e pagamento</Text>
                </View>
              </View>

              {/* Cliente */}
              <View style={styles.inputContainer}>
                <ClienteSearchInput
                  value={formData.cliente}
                  onChangeText={(text) => setFormData({ ...formData, cliente: text })}
                />
              </View>

              {/* Método de Pagamento */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Método de Pagamento</Text>
                <View style={styles.paymentGrid}>
                  {[
                    { label: 'Pix', value: 'Pix', color: '#10b981' },
                    { label: 'Dinheiro', value: 'Dinheiro', color: '#059669' },
                    { label: 'Débito', value: 'Cartão Débito', color: '#0891b2' },
                    { label: 'Crédito', value: 'Cartão Crédito', color: '#8b5cf6' }
                  ].map((method) => (
                    <TouchableOpacity
                      key={method.value}
                      onPress={() => setFormData({ ...formData, metodo_pagamento: method.value })}
                      style={[
                        styles.paymentButton,
                        formData.metodo_pagamento === method.value && {
                          ...styles.paymentButtonActive,
                          backgroundColor: method.color
                        }
                      ]}
                    >
                      <Text style={[
                        styles.paymentLabel,
                        formData.metodo_pagamento === method.value && styles.paymentLabelActive
                      ]}>
                        {method.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* PASSO 3: Status de Pagamento */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepNumber}>3</Text>
                </View>
                <View>
                  <Text style={styles.sectionTitle}>Status de Pagamento</Text>
                  <Text style={styles.sectionSubtitle}>A venda foi paga?</Text>
                </View>
              </View>

              <View style={styles.statusGrid}>
                <TouchableOpacity
                  onPress={() => setFormData({ ...formData, status: 'OK' })}
                  style={[
                    styles.statusButton,
                    formData.status === 'OK' && styles.statusButtonPaid
                  ]}
                >
                  <Text style={[
                    styles.statusLabel,
                    formData.status === 'OK' && styles.statusLabelActive
                  ]}>
                    Pago
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setFormData({ ...formData, status: 'PENDENTE' })}
                  style={[
                    styles.statusButton,
                    formData.status === 'PENDENTE' && styles.statusButtonPending
                  ]}
                >
                  <Text style={[
                    styles.statusLabel,
                    formData.status === 'PENDENTE' && styles.statusLabelActive
                  ]}>
                    Pendente
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Resumo da Venda */}
            {calcularTotal() > 0 && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <Text style={styles.summaryTitle}>Resumo da Venda</Text>
                  <View style={styles.itemCountBadge}>
                    <Text style={styles.itemCountText}>
                      {itens.filter(i => i.produto_id).length}
                    </Text>
                  </View>
                </View>

                {/* Itens */}
                <View style={styles.summaryItems}>
                  {itens.map((item, index) => {
                    if (!item.produto_id || !item.quantidade || !item.preco_base) return null;
                    const produto = produtos.find(p => p.id.toString() === item.produto_id);
                    if (!produto) return null;
                    
                    return (
                      <View key={index} style={styles.summaryItem}>
                        <View style={styles.summaryItemInfo}>
                          <Text style={styles.summaryItemName}>
                            {produto.tipo} - {produto.sabor}
                          </Text>
                          {item.quantidade_com_desconto && parseInt(item.quantidade_com_desconto) > 0 && (
                            <Text style={styles.summaryItemDetails}>
                              {item.quantidade_com_desconto}x R$ {parseFloat(item.preco_desconto || '0').toFixed(2)}
                              <Text style={styles.summaryPromoText}> • Promoção</Text>
                            </Text>
                          )}
                          {item.quantidade_sem_desconto && parseInt(item.quantidade_sem_desconto) > 0 && (
                            <Text style={styles.summaryItemDetails}>
                              {item.quantidade_sem_desconto}x R$ {parseFloat(item.preco_base).toFixed(2)}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.summaryItemAmount}>
                          R$ {parseFloat(item.subtotal).toFixed(2)}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {/* Total */}
                <View style={styles.summaryTotal}>
                  <Text style={styles.summaryTotalLabel}>Valor Total</Text>
                  <Text style={styles.summaryTotalValue}>
                    R$ {calcularTotal().toFixed(2)}
                  </Text>
                </View>
              </View>
            )}

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
                style={[styles.submitButton, saving && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={COLORS.white} size={20} />
                ) : (
                  <Text style={styles.submitButtonText}>Confirmar Venda</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
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
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textMedium,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: COLORS.mediumBlue,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
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
  
  // INPUT
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 10,
  },
  input: {
    backgroundColor: COLORS.softGray,
  },

  // PRODUTOS - LISTA LAYOUT
  produtosListContainer: {
    gap: 10,
  },
  produtoListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    backgroundColor: COLORS.white,
  },
  produtoListItemSelected: {
    borderColor: COLORS.mediumBlue,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  produtoListInfo: {
    flex: 1,
    marginRight: 12,
  },
  produtoListName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  produtoListNameDisabled: {
    color: COLORS.textMedium,
  },
  produtoListStockText: {
    fontSize: 12,
    color: COLORS.textMedium,
    fontWeight: '500',
  },
  produtoListStockTextDisabled: {
    color: COLORS.textMedium,
  },
  produtoListQuantityControl: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  quantityButtonSmall: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.mediumBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonSmallDisabled: {
    opacity: 0.5,
  },
  quantityButtonSmallText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  quantityInputSmall: {
    width: 50,
    height: 36,
    textAlign: 'center',
    backgroundColor: COLORS.white,
    fontSize: 14,
  },
  emptyListMessage: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 13,
    color: COLORS.textMedium,
    fontWeight: '500',
  },

  priceCard: {
    flex: 1,
  },
  priceLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  promotionBadge: {
    backgroundColor: COLORS.pink,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  promotionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  priceInput: {
    backgroundColor: COLORS.white,
  },
  priceInputPromotion: {
    backgroundColor: 'rgba(236, 72, 153, 0.05)',
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  paymentButton: {
    flex: 1,
    minWidth: '47%',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  paymentButtonActive: {
    borderColor: 'transparent',
  },
  paymentLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  paymentLabelActive: {
    color: COLORS.white,
  },

  // STATUS
  statusGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.borderGray,
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  statusButtonPaid: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.green,
  },
  statusButtonPending: {
    borderColor: COLORS.warning,
    backgroundColor: COLORS.warning,
  },
  statusEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  statusLabelActive: {
    color: COLORS.white,
  },

  // RESUMO
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.mediumBlue,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  itemCountBadge: {
    backgroundColor: COLORS.mediumBlue,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  itemCountText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  summaryItems: {
    borderTopWidth: 1,
    borderColor: COLORS.borderGray,
    paddingVertical: 5,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  summaryItemInfo: {
    flex: 1,
  },
  summaryItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  summaryItemDetails: {
    fontSize: 12,
    color: COLORS.textMedium,
  },
  summaryPromoText: {
    color: COLORS.pink,
    fontWeight: '700',
    fontSize: 12,
  },
  summaryItemAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.mediumBlue,
  },
  summaryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: COLORS.mediumBlue,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.mediumBlue,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.borderGray,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMedium,
  },
  submitButton: {
    flex: 1,
    backgroundColor: COLORS.mediumBlue,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
});