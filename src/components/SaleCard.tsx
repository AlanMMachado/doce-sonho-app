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
  const isPaid = sale.status === 'PAGO';

  return (
    <View style={[styles.saleItem, isPaid ? styles.saleItemPaid : styles.saleItemPending]}>
      <View style={styles.saleContent}>
        <View style={styles.saleInfo}>
          <Text style={styles.saleCustomer}>
            {sale.customer_name || 'Cliente'}
            {showDate && (
              <Text style={styles.saleTime}>
                {' · '}{format(parseISO(sale.date), 'HH:mm', { locale: ptBR })}
              </Text>
            )}
          </Text>

          {sale.items.map((item, index) => (
            <Text key={`${sale.id}-item-${index}`} style={styles.saleProduct}>
              {'• '}{getProductName(item.product_id, item)}{' · '}<Text style={styles.saleQuantity}>{item.quantity} un</Text>{' · R$ '}{item.subtotal.toFixed(2)}
            </Text>
          ))}

          {showDate && (
            <Text style={styles.saleDate}>
              {format(parseISO(sale.date), 'dd/MM/yyyy', { locale: ptBR })}
            </Text>
          )}
        </View>

        <View style={styles.saleValues}>
          <Text style={styles.salePrice}>R$ {sale.total_price.toFixed(2)}</Text>
          <Text style={[styles.statusLabel, isPaid ? styles.statusLabelPaid : styles.statusLabelPending]}>
            {'● '}{isPaid ? 'Pago' : 'Pendente'}
          </Text>
        </View>
      </View>

      {(showActions || (sale.status === 'PENDENTE' && onMarkAsPaid)) && (
        <View style={styles.actionsRow}>
          {showActions && (
            <View style={styles.actionButtons}>
              {onEdit && (
                <TouchableOpacity style={styles.editButton} onPress={() => onEdit(sale)} activeOpacity={0.7}>
                  <Edit size={13} color={COLORS.mediumBlue} />
                  <Text style={styles.editButtonText}>Editar</Text>
                </TouchableOpacity>
              )}
              {onDelete && (
                <TouchableOpacity style={styles.deleteButton} onPress={() => onDelete(sale)} activeOpacity={0.7}>
                  <Trash2 size={13} color={COLORS.error} />
                  <Text style={styles.deleteButtonText}>Excluir</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {sale.status === 'PENDENTE' && onMarkAsPaid && (
            <TouchableOpacity
              style={[styles.markPaidButton, !showActions && { marginLeft: 'auto' }]}
              onPress={() => onMarkAsPaid(sale)}
              activeOpacity={0.7}
            >
              <Text style={styles.markPaidText}>Marcar Pago</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  saleItem: { paddingVertical: 12, paddingHorizontal: 16, backgroundColor: COLORS.white, borderRadius: 8, borderWidth: 1, borderColor: COLORS.borderGray, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  saleItemPaid: { borderLeftColor: COLORS.green },
  saleItemPending: { borderLeftColor: COLORS.warning },
  saleContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  saleInfo: { flex: 1, flexDirection: 'column' },
  saleCustomer: { fontSize: 14, fontWeight: '600', color: COLORS.textDark, marginBottom: 2 },
  saleTime: { fontSize: 13, fontWeight: '400', color: COLORS.textMedium },
  saleProduct: { fontSize: 12, color: COLORS.textMedium, marginBottom: 2 },
  saleQuantity: { color: COLORS.mediumBlue, fontWeight: 'bold' },
  saleDate: { fontSize: 11, color: COLORS.textLight, marginTop: 4 },
  saleValues: { alignItems: 'flex-end', marginLeft: 12 },
  salePrice: { fontSize: 15, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 4 },
  statusLabel: { fontSize: 11, fontWeight: 'bold' },
  statusLabelPaid: { color: COLORS.green },
  statusLabelPending: { color: COLORS.warning },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.borderGray },
  markPaidButton: { backgroundColor: COLORS.green, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  markPaidText: { color: COLORS.white, fontSize: 12, fontWeight: 'bold' },
  actionButtons: { flexDirection: 'row', gap: 8 },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.mediumBlue },
  editButtonText: { fontSize: 12, fontWeight: '600', color: COLORS.mediumBlue },
  deleteButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.error },
  deleteButtonText: { fontSize: 12, fontWeight: '600', color: COLORS.error },
});
