import { supabase } from '@/lib/supabase';
import { ReportParams, ReportResponse, ReportSeriesPoint } from '@/types/Report';

function normalizeProductText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase();
}

function calculateInterval(params: ReportParams): { startDate: string; endDate: string; view: 'month' | 'year' } {
  if (params.startDate && params.endDate) {
    return { startDate: params.startDate, endDate: params.endDate, view: params.view ?? 'month' };
  }

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  if (params.view === 'year') {
    const year = params.year ?? today.getFullYear();
    return { startDate: `${year}-01-01`, endDate: `${year}-12-31`, view: 'year' };
  }

  if (params.view === 'month') {
    const year = params.year ?? today.getFullYear();
    const month = params.month ?? today.getMonth() + 1;
    const lastDay = new Date(year, month, 0).getDate();
    return {
      startDate: `${year}-${String(month).padStart(2, '0')}-01`,
      endDate: `${year}-${String(month).padStart(2, '0')}-${lastDay}`,
      view: 'month',
    };
  }

  switch (params.period) {
    case 'day':
      return { startDate: todayStr, endDate: todayStr, view: 'month' };
    case 'week': {
      const start = new Date(today);
      start.setDate(today.getDate() - 7);
      return { startDate: start.toISOString().split('T')[0], endDate: todayStr, view: 'month' };
    }
    case 'month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: start.toISOString().split('T')[0], endDate: todayStr, view: 'month' };
    }
    default:
      return { startDate: todayStr, endDate: todayStr, view: 'month' };
  }
}

export const ReportService = {
  async generate(userId: string, params: ReportParams): Promise<ReportResponse> {
    const { startDate, endDate, view } = calculateInterval(params);

    const { data: sales, error } = await supabase
      .from('sales')
      .select('customer_id, customer_name, date, total_price, status, amount_paid, items:sale_items(quantity, subtotal, product_type, product_flavor, product_id)')
      .eq('user_id', userId)
      .gte('date', `${startDate}T00:00:00Z`)
      .lte('date', `${endDate}T23:59:59Z`);

    if (error) throw error;

    const saleItems = (sales ?? []).flatMap(sale => (sale.items as any[]) ?? []);
    const productIds = [...new Set(
      saleItems
        .map(item => item.product_id)
        .filter((id): id is string => Boolean(id))
    )];
    const { data: products, error: productsError } = productIds.length > 0
      ? await supabase
        .from('products')
        .select('id, type, flavor')
        .eq('user_id', userId)
        .in('id', productIds)
      : { data: [], error: null };

    if (productsError) throw productsError;
    const productsById = new Map((products ?? []).map(product => [product.id, product]));

    let totalSold = 0;
    let totalPending = 0;
    let quantitySold = 0;
    const productMap: Record<string, { product: string; quantity: number; totalValue: number }> = {};
    const customerMap: Record<string, { customerName: string; totalSpent: number; purchaseCount: number }> = {};
    const seriesMap: Record<string, number> = {};

    for (const sale of sales ?? []) {
      const saleDate = String(sale.date ?? '').slice(0, 10);
      const seriesKey = view === 'year' ? saleDate.slice(0, 7) : saleDate.slice(8, 10);
      if (seriesKey) seriesMap[seriesKey] = (seriesMap[seriesKey] ?? 0) + (sale.total_price ?? 0);

      const customerKey = sale.customer_id ?? sale.customer_name ?? 'unknown';
      if (!customerMap[customerKey]) {
        customerMap[customerKey] = { customerName: sale.customer_name ?? 'Cliente sem nome', totalSpent: 0, purchaseCount: 0 };
      }
      customerMap[customerKey].totalSpent += sale.total_price ?? 0;
      customerMap[customerKey].purchaseCount += 1;

      if (sale.status === 'PAGO') {
        totalSold += sale.total_price ?? 0;
      } else if (sale.status === 'PENDENTE') {
        totalSold += sale.amount_paid ?? 0;
        totalPending += (sale.total_price ?? 0) - (sale.amount_paid ?? 0);
      }

      for (const item of (sale.items as any[]) ?? []) {
        quantitySold += item.quantity ?? 0;

        const linkedProduct = item.product_id ? productsById.get(item.product_id) : undefined;
        const type = linkedProduct?.type ?? item.product_type ?? '?';
        const flavor = linkedProduct?.flavor ?? item.product_flavor ?? '?';
        const normalizedType = normalizeProductText(type);
        const normalizedFlavor = normalizeProductText(flavor);
        const productKey = JSON.stringify([normalizedType, normalizedFlavor]);
        const productName = `${type} - ${flavor}`;

        if (!productMap[productKey]) productMap[productKey] = { quantity: 0, totalValue: 0, product: productName };
        productMap[productKey].quantity += item.quantity ?? 0;
        productMap[productKey].totalValue += item.subtotal ?? 0;
      }
    }

    const topProducts = Object.entries(productMap)
      .map(([productKey, v]) => ({ productKey, product: v.product, quantity: v.quantity, totalValue: v.totalValue }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    const year = params.year ?? new Date().getFullYear();
    const month = params.month ?? new Date().getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    const series: ReportSeriesPoint[] = view === 'year'
      ? Array.from({ length: 12 }, (_, index) => {
        const key = `${year}-${String(index + 1).padStart(2, '0')}`;
        return { label: String(index + 1).padStart(2, '0'), value: seriesMap[key] ?? 0 };
      })
      : Array.from({ length: daysInMonth }, (_, index) => {
        const key = String(index + 1).padStart(2, '0');
        return { label: key, value: seriesMap[key] ?? 0 };
      });

    return {
      totalSold,
      totalPending,
      quantitySold,
      series,
      seriesUnit: view === 'year' ? 'month' : 'day',
      topCustomers: Object.entries(customerMap)
        .map(([customerId, value]) => ({ customerId, ...value }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 3),
      topProducts,
    };
  },
};
