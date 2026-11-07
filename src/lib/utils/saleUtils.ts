import { Sale, SaleItem } from '@/types/Sale';

export function sortSalesOldestFirst(sales: Sale[]): Sale[] {
  return [...sales].sort((a, b) => {
    const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (diff !== 0) return diff;
    return (a.created_at ?? '').localeCompare(b.created_at ?? '');
  });
}

export function getSaleItemName(item?: Pick<SaleItem, 'product_type' | 'product_flavor'>): string {
  if (item?.product_type && item?.product_flavor) return `${item.product_type} ${item.product_flavor}`;
  return 'Produto removido';
}
