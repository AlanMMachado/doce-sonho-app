import { COLORS } from '@/constants/Colors';
import { ItemVenda, Venda } from '@/types/Venda';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit, Trash2 } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

type ProdutoNomeResolver = (produtoId: number, item?: ItemVenda) => string;

interface VendaCardProps {
  venda: Venda;
  getProdutoNome: ProdutoNomeResolver;
  showDate?: boolean;
  showActions?: boolean;
  onEdit?: (venda: Venda) => void;
  onDelete?: (venda: Venda) => void;
  onMarcarPago?: (venda: Venda) => void;
}

export default function VendaCard({
  venda,
  getProdutoNome,
  showDate = true,
  showActions = false,
  onEdit,
  onDelete,
  onMarcarPago,
}: VendaCardProps) {
  return (
    <View style={styles.vendaItem}>
      <View style={styles.vendaContent}>
        {/* Info: cliente + itens */}
        <View style={styles.vendaInfo}>
          <Text style={styles.vendaCliente}>
            {venda.cliente || 'Cliente'}
            {showDate && (
              <Text style={styles.vendaHora}>
                {' '}- {format(parseISO(venda.data), 'HH:mm', { locale: ptBR })}
              </Text>
            )}
          </Text>

          {venda.itens.map((item, index) => {
            const produtoNome = getProdutoNome(item.produto_id, item);
            return (
              <Text key={`${venda.id}-item-${index}`} style={styles.vendaProduto}>
                • {produtoNome} - <Text style={styles.vendaQuantidade}>{item.quantidade}</Text> (R$ {item.subtotal.toFixed(2)})
              </Text>
            );
          })}

          {showDate && (
            <Text style={styles.vendaData}>
              {format(parseISO(venda.data), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </Text>
          )}
        </View>

        {/* Valores + status */}
        <View style={styles.vendaValores}>
          <Text style={styles.vendaPreco}>R$ {venda.total_preco.toFixed(2)}</Text>
          <View style={[
            styles.statusBadge,
            venda.status === 'OK' ? styles.statusPago : styles.statusPendente
          ]}>
            <Text style={[
              styles.statusText,
              venda.status === 'OK' ? styles.statusTextPago : styles.statusTextPendente
            ]}>
              {venda.status === 'OK' ? 'Pago' : 'Pendente'}
            </Text>
          </View>
        </View>
      </View>

      {/* Ações opcionais */}
      {(showActions || onMarcarPago) && (
        <View style={styles.actionsRow}>
          {venda.status === 'PENDENTE' && onMarcarPago && (
            <TouchableOpacity
              style={styles.marcarPagoBotao}
              onPress={() => onMarcarPago(venda)}
              activeOpacity={0.7}
            >
              <Text style={styles.marcarPagoTexto}>Marcar Pago</Text>
            </TouchableOpacity>
          )}

          {showActions && (
            <View style={styles.actionButtons}>
              {onEdit && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => onEdit(venda)}
                  activeOpacity={0.7}
                >
                  <Edit size={14} color={COLORS.mediumBlue} />
                </TouchableOpacity>
              )}
              {onDelete && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => onDelete(venda)}
                  activeOpacity={0.7}
                >
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
  vendaItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.softGray,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
  },
  vendaContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  vendaInfo: {
    flex: 1,
    flexDirection: 'column',
  },
  vendaCliente: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  vendaHora: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textMedium,
  },
  vendaProduto: {
    fontSize: 12,
    color: COLORS.textMedium,
    marginBottom: 2,
  },
  vendaQuantidade: {
    color: COLORS.mediumBlue,
    fontWeight: 'bold',
  },
  vendaData: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 4,
  },
  vendaValores: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  vendaPreco: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPago: {
    backgroundColor: COLORS.green,
  },
  statusPendente: {
    backgroundColor: COLORS.warning,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  statusTextPago: {
    color: COLORS.white,
  },
  statusTextPendente: {
    color: COLORS.white,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderGray,
  },
  marcarPagoBotao: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  marcarPagoTexto: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 'auto',
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.mediumBlue,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.error,
  },
});
