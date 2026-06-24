import { useAuth } from '@/contexts/AuthContext';
import { CustomerService } from '@/service/customerService';
import { Customer } from '@/types/Customer';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';

interface CustomerSearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onCustomerSelect?: (customer: Customer | null) => void;
  onDropdownStateChange?: (isOpen: boolean) => void;
  placeholder?: string;
  label?: string;
}

export default function CustomerSearchInput({
  value,
  onChangeText,
  onCustomerSelect,
  onDropdownStateChange,
  placeholder = "Nome do cliente",
  label = "Cliente *"
}: CustomerSearchInputProps) {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suggestions, setSuggestions] = useState<Customer[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const isSelectingRef = useRef(false);
  const containerRef = useRef(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (value.trim().length > 0) {
      filterSuggestions(value);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
      setSelectedCustomer(null);
    }
  }, [value, customers]);

  useEffect(() => {
    if (!isSelectingRef.current && suggestions.length > 0 && value.trim().length >= 2) {
      setShowDropdown(true);
      onDropdownStateChange?.(true);
    } else {
      setShowDropdown(false);
      onDropdownStateChange?.(false);
    }
  }, [suggestions, value, onDropdownStateChange]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await CustomerService.getAll(user!.id);
      setCustomers(data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const normalizeName = (name: string): string =>
    name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

  const calculateSimilarity = (name1: string, name2: string): number => {
    const n1 = normalizeName(name1);
    const n2 = normalizeName(name2);
    if (n1 === n2) return 1;
    if (n1.includes(n2) || n2.includes(n1)) return 0.8;
    const words1 = n1.split(' ');
    const words2 = n2.split(' ');
    const common = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2)));
    return common.length / Math.max(words1.length, words2.length);
  };

  const filterSuggestions = (text: string) => {
    if (text.trim().length < 2) { setSuggestions([]); setShowDropdown(false); return; }
    const filtered = customers
      .map(c => ({ customer: c, similarity: calculateSimilarity(text, c.name) }))
      .filter(i => i.similarity > 0.3)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)
      .map(i => i.customer);
    setSuggestions(filtered);
    setShowDropdown(filtered.length > 0);
  };

  const selectCustomer = useCallback((customer: Customer) => {
    if (isSelectingRef.current) return;
    isSelectingRef.current = true;
    closeDropdown();
    setSelectedCustomer(customer);
    onChangeText(customer.name);
    onCustomerSelect?.(customer);
    setTimeout(() => { isSelectingRef.current = false; }, 50);
  }, [onChangeText, onCustomerSelect]);

  const closeDropdown = useCallback(() => {
    setShowDropdown(false);
    onDropdownStateChange?.(false);
    setSuggestions([]);
    Keyboard.dismiss();
  }, [onDropdownStateChange]);

  return (
    <View style={styles.container} ref={containerRef}>
      <TextInput
        value={value}
        onChangeText={(text) => {
          onChangeText(text);
          if (selectedCustomer && text !== selectedCustomer.name) {
            setSelectedCustomer(null);
            onCustomerSelect?.(null);
          }
        }}
        style={styles.input}
        mode="outlined"
        label={label}
        placeholder={placeholder}
        outlineColor="#d1d5db"
        activeOutlineColor="#2563eb"
        right={
          selectedCustomer ? <TextInput.Icon icon="check-circle" color="#059669" /> :
          loading ? <TextInput.Icon icon="loading" /> : null
        }
      />

      {showDropdown && suggestions.length > 0 && (
        <>
          <View style={styles.overlayView} pointerEvents="box-none">
            <Pressable style={styles.overlay} onPress={() => closeDropdown()} />
          </View>
          <View style={styles.dropdownContainer} pointerEvents="auto">
            <ScrollView style={styles.dropdown} scrollEnabled nestedScrollEnabled showsVerticalScrollIndicator keyboardShouldPersistTaps="handled">
              {suggestions.map((item) => (
                <TouchableOpacity key={item.id} style={styles.suggestionItem} onPress={() => selectCustomer(item)} activeOpacity={0.7}>
                  <View style={styles.suggestionContent}>
                    <Text style={styles.suggestionName}>{item.name}</Text>
                    <View style={styles.suggestionInfo}>
                      <Text style={styles.suggestionPurchases}>{item.purchase_count} compra{item.purchase_count !== 1 ? 's' : ''}</Text>
                      {item.total_owed > 0 && <Text style={styles.suggestionOwed}>R$ {item.total_owed.toFixed(2)} devido</Text>}
                    </View>
                  </View>
                  <View style={[styles.statusIndicator, item.status === 'devedor' ? styles.statusDebtor : styles.statusCurrent]} />
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
  container: { position: 'relative', zIndex: 1000 },
  input: { backgroundColor: '#ffffff' },
  overlayView: { position: 'absolute', top: -9999, left: -9999, right: -9999, bottom: -9999, zIndex: 999 },
  overlay: { flex: 1 },
  dropdownContainer: { position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: 280, backgroundColor: '#ffffff', borderRadius: 8, borderWidth: 2, borderColor: '#2563eb', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 100, zIndex: 1000, marginTop: 4 },
  dropdown: { maxHeight: 280 },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: '#ffffff' },
  suggestionContent: { flex: 1 },
  suggestionName: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  suggestionInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  suggestionPurchases: { fontSize: 12, color: '#6b7280' },
  suggestionOwed: { fontSize: 12, color: '#dc2626', fontWeight: '500' },
  statusIndicator: { width: 8, height: 8, borderRadius: 4 },
  statusDebtor: { backgroundColor: '#dc2626' },
  statusCurrent: { backgroundColor: '#059669' },
});
