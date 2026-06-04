import Header from '@/components/Header';
import { COLORS } from '@/constants/Colors';
import { useApp } from '@/contexts/AppContext';
import { ClienteService } from '@/service/clienteService';
import { ProdutoService } from '@/service/produtoService';
import { Cliente } from '@/types/Cliente';
import { Produto } from '@/types/Produto';
import { useFocusEffect } from '@react-navigation/native';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Text, TextInput } from 'react-native-paper';

export default function ClientesScreen() {
  const { state } = useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Record<number, Produto>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [filtro, setFiltro] = useState<'todos' | 'devedores' | 'em_dia'>('todos');
  const [busca, setBusca] = useState('');

  // Recarregar dados sempre que a tela ganhar foco (incluindo na montagem)
  useFocusEffect(
    React.useCallback(() => {
      carregarDados();
    }, [])
  );

  const carregarDados = async () => {
    try {
      setLoading(true);

      // Buscar todos os clientes
      const clientesData = await ClienteService.getAll();

      // Buscar produtos para referência
      const produtoIds = [...new Set(
        clientesData.flatMap(c => c.vendas)
      )];
      const produtosMap: Record<number, Produto> = {};
      for (const id of produtoIds) {
        const produto = await ProdutoService.getById(id);
        if (produto) {
          produtosMap[id] = produto;
        }
      }
      setProdutos(produtosMap);

      // Converter para o formato usado na tela
      const clientesConvertidos: Cliente[] = clientesData.map(cliente => ({
        ...cliente,
        vendas: [] // Será carregado sob demanda se necessário
      }));

      setClientes(clientesConvertidos);

      // Carregar estatísticas
      const estatisticas = await ClienteService.getEstatisticas();
      setResumo({
        totalClientes: estatisticas.totalClientes,
        devedores: estatisticas.totalDevedores,
        emDia: estatisticas.totalClientes - estatisticas.totalDevedores,
        totalDevido: estatisticas.totalValorDevido,
        totalComprado: estatisticas.totalValorComprado
      });

    } catch (error) {
      console.error('Erro ao carregar dados dos clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await carregarDados();
    setRefreshing(false);
  };

  const clientesFiltrados = clientes.filter(cliente => {
    const matchBusca = cliente.nome.toLowerCase().includes(busca.toLowerCase());
    const matchFiltro = filtro === 'todos' ||
                       (filtro === 'devedores' && cliente.status === 'devedor') ||
                       (filtro === 'em_dia' && cliente.status === 'em_dia');
    return matchBusca && matchFiltro;
  });

  const getResumoClientes = async () => {
    try {
      const estatisticas = await ClienteService.getEstatisticas();
      return {
        totalClientes: estatisticas.totalClientes,
        devedores: estatisticas.totalDevedores,
        emDia: estatisticas.totalClientes - estatisticas.totalDevedores,
        totalDevido: estatisticas.totalValorDevido,
        totalComprado: estatisticas.totalValorComprado
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return {
        totalClientes: 0,
        devedores: 0,
        emDia: 0,
        totalDevido: 0,
        totalComprado: 0
      };
    }
  };

  const [resumo, setResumo] = useState({
    totalClientes: 0,
    devedores: 0,
    emDia: 0,
    totalDevido: 0,
    totalComprado: 0
  });

  return (
    <View style={styles.container}>
      <Header
        title="Clientes"
        subtitle={`${resumo.totalClientes} clientes ativos`}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.mediumBlue} />
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.content}>

            {/* Resumo */}
            <View style={styles.resumoContainer}>
              <View style={styles.resumoCard}>
                <Text style={styles.resumoIcon}>👥</Text>
                <Text style={styles.resumoValue}>{resumo.totalClientes}</Text>
                <Text style={styles.resumoLabel}>Clientes Ativos</Text>
              </View>

              <View style={styles.resumoCard}>
                <Text style={styles.resumoIcon}>🔴</Text>
                <Text style={styles.resumoValue}>{resumo.devedores}</Text>
                <Text style={styles.resumoLabel}>Devedores</Text>
                <Text style={styles.resumoSubtext}>R$ {(resumo.totalDevido || 0).toFixed(2)}</Text>
              </View>

              <View style={styles.resumoCard}>
                <Text style={styles.resumoIcon}>🟢</Text>
                <Text style={styles.resumoValue}>{resumo.emDia}</Text>
                <Text style={styles.resumoLabel}>Em Dia</Text>
                <Text style={styles.resumoSubtext}>R$ {(resumo.totalComprado || 0).toFixed(2)}</Text>
              </View>
            </View>

            {/* Busca e Filtros */}
            <View style={styles.filtrosContainer}>
              <TextInput
                value={busca}
                onChangeText={setBusca}
                style={styles.buscaInput}
                mode="outlined"
                placeholder="Buscar cliente..."
                outlineColor="#d1d5db"
                activeOutlineColor="#2563eb"
                left={<TextInput.Icon icon="magnify" />}
              />

              <View style={styles.filtrosBotoes}>
                {[
                  { key: 'todos', label: 'Todos', count: resumo.totalClientes },
                  { key: 'devedores', label: 'Devedores', count: resumo.devedores },
                  { key: 'em_dia', label: 'Em Dia', count: resumo.emDia }
                ].map(({ key, label, count }) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setFiltro(key as any)}
                    style={[
                      styles.filtroBotao,
                      filtro === key && styles.filtroBotaoAtivo
                    ]}
                  >
                    <Text style={[
                      styles.filtroTexto,
                      filtro === key && styles.filtroTextoAtivo
                    ]}>
                      {label} ({count})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Lista de Clientes */}
            <View style={styles.clientesSection}>
              <Text style={styles.sectionTitle}>
                {filtro === 'todos' ? 'Todos os Clientes' :
                 filtro === 'devedores' ? 'Clientes Devedores' :
                 filtro === 'em_dia' ? 'Clientes em Dia' : 'Todos os Clientes'}
              </Text>

              {clientesFiltrados.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>👥</Text>
                  <Text style={styles.emptyText}>
                    {busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente nesta categoria'}
                  </Text>
                  <Text style={styles.emptySubtext}>
                    {busca ? 'Tente outro termo de busca' : 'Clientes aparecerão aqui quando houverem vendas'}
                  </Text>
                </View>
              ) : (
                <View style={styles.clientesList}>
                  {clientesFiltrados.map((cliente) => (
                    <TouchableOpacity
                      key={cliente.nome}
                      style={styles.clienteCard}
                      onPress={() => router.push(`/clientes/${encodeURIComponent(cliente.nome)}`)}
                    >
                      <View style={styles.clienteHeader}>
                        <View style={styles.clienteInfo}>
                          <Text style={styles.clienteNome}>{cliente.nome}</Text>
                          <Text style={styles.clienteStatus}>
                            {cliente.numeroCompras} compra{cliente.numeroCompras !== 1 ? 's' : ''} •
                            Última: {format(parseISO(cliente.ultimaCompra), 'dd/MM', { locale: ptBR })}
                          </Text>
                        </View>

                        <View style={styles.statusContainer}>
                          <View style={[
                            styles.statusBadge,
                            cliente.status === 'devedor' && styles.statusDevedor,
                            cliente.status === 'em_dia' && styles.statusEmDia
                          ]}>
                            <Text style={[
                              styles.statusText,
                              cliente.status === 'devedor' && styles.statusTextDevedor,
                              cliente.status === 'em_dia' && styles.statusTextEmDia
                            ]}>
                              {cliente.status === 'devedor' ? 'DEVEDOR' :
                               cliente.status === 'em_dia' ? 'EM DIA' : 'EM DIA'}
                            </Text>
                          </View>

                          <View style={styles.totalComprado}>
                            <Text style={styles.totalCompradoLabel}>Total Comprado</Text>
                            <Text style={styles.totalCompradoValor}>R$ {(cliente.totalComprado || 0).toFixed(2)}</Text>
                          </View>
                        </View>
                      </View>

                      {cliente.totalDevido > 0 && (
                        <View style={styles.valorDevido}>
                          <Text style={styles.valorDevidoLabel}>Valor Devido</Text>
                          <Text style={styles.valorDevidoValor}>
                            R$ {(cliente.totalDevido || 0).toFixed(2)}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
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
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  resumoContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  resumoCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    padding: 16,
    alignItems: 'center',
  },
  resumoIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  resumoValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  resumoLabel: {
    fontSize: 12,
    color: COLORS.textMedium,
    fontWeight: '600',
    textAlign: 'center',
  },
  resumoSubtext: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  filtrosContainer: {
    marginBottom: 20,
  },
  buscaInput: {
    backgroundColor: COLORS.white,
    marginBottom: 12,
  },
  filtrosBotoes: {
    flexDirection: 'row',
    gap: 8,
  },
  filtroBotao: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.borderGray,
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  filtroBotaoAtivo: {
    borderColor: COLORS.mediumBlue,
    backgroundColor: COLORS.mediumBlue,
  },
  filtroTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMedium,
  },
  filtroTextoAtivo: {
    color: COLORS.white,
  },
  clientesSection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textMedium,
    textAlign: 'center',
  },
  clientesList: {
    gap: 12,
  },
  clienteCard: {
    backgroundColor: COLORS.softGray,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    padding: 12,
  },
  clienteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  clienteInfo: {
    flex: 1,
  },
  clienteNome: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  clienteStatus: {
    fontSize: 12,
    color: COLORS.textMedium,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 6,
  },
  statusDevedor: {
    backgroundColor: COLORS.error,
  },
  statusEmDia: {
    backgroundColor: COLORS.green,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusTextDevedor: {
    color: COLORS.white,
  },
  statusTextEmDia: {
    color: COLORS.white,
  },
  totalComprado: {
    alignItems: 'flex-end',
  },
  totalCompradoLabel: {
    fontSize: 10,
    color: COLORS.textMedium,
    fontWeight: '600',
    marginBottom: 2,
  },
  totalCompradoValor: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  valorDevido: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderGray,
    alignItems: 'flex-end',
  },
  valorDevidoLabel: {
    fontSize: 10,
    color: COLORS.textMedium,
    fontWeight: '600',
    marginBottom: 2,
  },
  valorDevidoValor: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.error,
  },
});