import { ClienteService } from '@/service/clienteService';
import { Cliente } from '@/types/Cliente';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';

interface ClienteSearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onClienteSelect?: (cliente: Cliente | null) => void;
  onDropdownStateChange?: (isOpen: boolean) => void;
  placeholder?: string;
  label?: string;
}

export default function ClienteSearchInput({
  value,
  onChangeText,
  onClienteSelect,
  onDropdownStateChange,
  placeholder = "Nome do cliente",
  label = "Cliente *"
}: ClienteSearchInputProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [sugestoes, setSugestoes] = useState<Cliente[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const isSelectingRef = useRef(false);
  const containerRef = useRef(null);

  useEffect(() => {
    carregarClientes();
  }, []);

  useEffect(() => {
    if (value.trim().length > 0) {
      filtrarSugestoes(value);
    } else {
      setSugestoes([]);
      setShowDropdown(false);
      setClienteSelecionado(null);
    }
  }, [value, clientes]);

  useEffect(() => {
    // Mostrar dropdown sempre que há sugestões, exceto quando estamos selecionando
    if (!isSelectingRef.current && sugestoes.length > 0 && value.trim().length >= 2) {
      setShowDropdown(true);
      onDropdownStateChange?.(true);
    } else {
      setShowDropdown(false);
      onDropdownStateChange?.(false);
    }
  }, [sugestoes, value, onDropdownStateChange]);

  const carregarClientes = async () => {
    try {
      setLoading(true);
      const clientesData = await ClienteService.getAll();
      setClientes(clientesData);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const normalizarNome = (nome: string): string => {
    return nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, ' ') // Remove espaços extras
      .trim();
  };

  const calcularSimilaridade = (nome1: string, nome2: string): number => {
    const norm1 = normalizarNome(nome1);
    const norm2 = normalizarNome(nome2);

    if (norm1 === norm2) return 1;

    // Verifica se um contém o outro
    if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.8;

    // Calcula similaridade baseada em palavras em comum
    const palavras1 = norm1.split(' ');
    const palavras2 = norm2.split(' ');

    const palavrasComuns = palavras1.filter(palavra =>
      palavras2.some(p => p.includes(palavra) || palavra.includes(p))
    );

    return palavrasComuns.length / Math.max(palavras1.length, palavras2.length);
  };

  const filtrarSugestoes = (texto: string) => {
    if (texto.trim().length < 2) {
      setSugestoes([]);
      setShowDropdown(false);
      return;
    }

    const sugestoesFiltradas = clientes
      .map(cliente => ({
        cliente,
        similaridade: calcularSimilaridade(texto, cliente.nome)
      }))
      .filter(item => item.similaridade > 0.3) // Similaridade mínima
      .sort((a, b) => b.similaridade - a.similaridade) // Ordena por similaridade
      .slice(0, 5) // Máximo 5 sugestões
      .map(item => item.cliente);

    setSugestoes(sugestoesFiltradas);
    setShowDropdown(sugestoesFiltradas.length > 0);
  };

  const selecionarCliente = useCallback((cliente: Cliente) => {
    if (isSelectingRef.current) return; // Prevenir seleções múltiplas
    
    isSelectingRef.current = true;
    
    // Fechar dropdown imediatamente
    fecharDropdown();
    
    // Atualizar estado interno
    setClienteSelecionado(cliente);
    
    // Executar callbacks externos
    onChangeText(cliente.nome);
    onClienteSelect?.(cliente);
    
    // Resetar flag
    setTimeout(() => {
      isSelectingRef.current = false;
    }, 50);
  }, [onChangeText, onClienteSelect]);

  const fecharDropdown = useCallback(() => {
    setShowDropdown(false);
    onDropdownStateChange?.(false);
    setSugestoes([]);
    Keyboard.dismiss();
  }, [onDropdownStateChange]);

  return (
    <View style={styles.container} ref={containerRef}>
      <TextInput
        value={value}
        onChangeText={(text) => {
          onChangeText(text);
          // Limpar cliente selecionado quando o usuário começa a digitar
          if (clienteSelecionado && text !== clienteSelecionado.nome) {
            setClienteSelecionado(null);
            onClienteSelect?.(null);
          }
        }}
        style={styles.input}
        mode="outlined"
        label={label}
        placeholder={placeholder}
        outlineColor="#d1d5db"
        activeOutlineColor="#2563eb"
        right={
          clienteSelecionado ? (
            <TextInput.Icon icon="check-circle" color="#059669" />
          ) : loading ? (
            <TextInput.Icon icon="loading" />
          ) : null
        }
      />

      {showDropdown && sugestoes.length > 0 && (
        <>
          {/* Overlay invisível para detectar cliques fora */}
          <View
            style={styles.overlayView}
            pointerEvents="box-none"
          >
            <Pressable
              style={styles.overlay}
              onPress={() => fecharDropdown()}
            />
          </View>

          {/* Dropdown com scroll interno */}
          <View style={styles.dropdownContainer} pointerEvents="auto">
            <ScrollView
              style={styles.dropdown}
              scrollEnabled={true}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
              scrollIndicatorInsets={{ right: 1 }}
              keyboardShouldPersistTaps="handled"
            >
              {sugestoes.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.sugestaoItem}
                  onPress={() => selecionarCliente(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.sugestaoContent}>
                    <Text style={styles.sugestaoNome}>{item.nome}</Text>
                    <View style={styles.sugestaoInfo}>
                      <Text style={styles.sugestaoCompras}>
                        {item.numeroCompras} compra{item.numeroCompras !== 1 ? 's' : ''}
                      </Text>
                      {item.totalDevido > 0 && (
                        <Text style={styles.sugestaoDevido}>
                          R$ {item.totalDevido.toFixed(2)} devido
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={[
                    styles.statusIndicator,
                    item.status === 'devedor' ? styles.statusDevedor : styles.statusEmDia
                  ]} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  input: {
    backgroundColor: '#ffffff',
  },
  overlayView: {
    position: 'absolute',
    top: -9999,
    left: -9999,
    right: -9999,
    bottom: -9999,
    zIndex: 999,
  },
  overlay: {
    flex: 1,
  },
  dropdownContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    maxHeight: 280,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2563eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 100,
    zIndex: 1000,
    marginTop: 4,
  },
  dropdown: {
    maxHeight: 280,
  },
  sugestaoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#ffffff',
  },
  sugestaoItemPressed: {
    backgroundColor: '#f3f4f6',
  },
  sugestaoContent: {
    flex: 1,
  },
  sugestaoNome: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  sugestaoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sugestaoCompras: {
    fontSize: 12,
    color: '#6b7280',
  },
  sugestaoDevido: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '500',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDevedor: {
    backgroundColor: '#dc2626',
  },
  statusEmDia: {
    backgroundColor: '#059669',
  },
});