import { COLORS } from '@/constants/Colors';
import { Sale, SaleItem } from '@/types/Sale';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit, Trash2 } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

type ProductNameResolver = (productId: string | null, item?: SaleItem) => string;

interface SaleCardProps {
  sale: Sale;
  getProductName: ProductNameResolver;
  showDate?: boolean;
  showActions?: boolean;
  onEdit?: (sale: Sale) => void;
  onDelete?: (sale: Sale) => void;
  onMarkAsPaid?: (sale: Sale) => void;
}

export default function SaleCard({
  sale,
  getProductName,
  showDate = true,
  showActions = false,
  onEdit,
  onDelete,
  onMarkAsPaid,
}: SaleCardProps) {
  return (
    <View style={styles.saleItem}>
      <View style={styles.saleContent}>
        <View style={styles.saleInfo}>
          <Text style={styles.saleCustomer}>
            {sale.customer_name || 'Cliente'}
            {showDate && (
              <Text style={styles.saleTime}>
                {' '}- {format(parseISO(sale.date), 'HH:mm', { locale: ptBR })}
              </Text>
            )}
          </Text>

          {sale.items.map((item, index) => (
            <Text key={`${sale.id}-item-${index}`} style={styles.saleProduct}>
              • {getProductName(item.product_id, item)} - <Text style={styles.saleQuantity}>{item.quantity}</Text> (R$ {item.subtotal.toFixed(2)})
            </Text>
          ))}

          {showDate && (
            <Text style={styles.saleDate}>
              {format(parseISO(sale.date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </Text>
          )}
        </View>

        <View style={styles.saleValues}>
          <Text style={styles.salePrice}>R$ {sale.total_price.toFixed(2)}</Text>
          <View style={[styles.statusBadge, sale.status === 'OK' ? styles.statusPaid : styles.statusPending]}>
            <Text style={styles.statusText}>
              {sale.status === 'OK' ? 'Pago' : 'Pendente'}
            </Text>
          </View>
        </View>
      </View>

      {(showActions || onMarkAsPaid) && (
        <View style={styles.actionsRow}>
          {sale.status === 'PENDENTE' && onMarkAsPaid && (
            <TouchableOpacity style={styles.markPaidButton} onPress={() => onMarkAsPaid(sale)} activeOpacity={0.7}>
              <Text style={styles.markPaidText}>Marcar Pago</Text>
            </TouchableOpacity>
          )}
          {showActions && (
            <View style={styles.actionButtons}>
              {onEdit && (
                <TouchableOpacity style={styles.editButton} onPress={() => onEdit(sale)} activeOpacity={0.7}>
                  <Edit size={14} color={COLORS.mediumBlue} />
                </TouchableOpacity>
              )}
              {onDelete && (
                <TouchableOpacity style={styles.deleteButton} onPress={() => onDelete(sale)} activeOpacity={0.7}>
                  <Trash2 size={14} color={COLORS.error} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  saleItem: { paddingVertical: 12, paddingHorizontal: 16, backgroundColor: COLORS.softGray, borderRadius: 8, borderWidth: 1, borderColor: COLORS.borderGray },
  saleContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  saleInfo: { flex: 1, flexDirection: 'column' },
  saleCustomer: { fontSize: 14, fontWeight: '600', color: COLORS.textDark, marginBottom: 2 },
  saleTime: { fontSize: 13, fontWeight: '400', color: COLORS.textMedium },
  saleProduct: { fontSize: 12, color: COLORS.textMedium, marginBottom: 2 },
  saleQuantity: { color: COLORS.mediumBlue, fontWeight: 'bold' },
  saleDate: { fontSize: 11, color: COLORS.textLight, marginTop: 4 },
  saleValues: { alignItems: 'flex-end', marginLeft: 12 },
  salePrice: { fontSize: 15, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPaid: { backgroundColor: COLORS.green },
  statusPending: { backgroundColor: COLORS.warning },
  statusText: { fontSize: 11, fontWeight: 'bold', color: COLORS.white },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.borderGray },
  markPaidButton: { backgroundColor: COLORS.green, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  markPaidText: { color: COLORS.white, fontSize: 12, fontWeight: 'bold' },
  actionButtons: { flexDirection: 'row', gap: 8, marginLeft: 'auto' },
  editButton: { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.mediumBlue },
  deleteButton: { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.error },
});
