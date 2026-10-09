import { supabase } from '@/lib/supabase';
import { addLocalDays, formatLocalDate, getLocalDateKey, getUtcDateRange } from '@/lib/utils/dateUtils';
import { ReportParams, ReportResponse, ReportSeriesPoint, ReportView } from '@/types/Report';

function normalizeProductText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase();
}

function calculateInterval(params: ReportParams): { startDate: string; endDate: string; view: ReportView } {
  if (params.startDate && params.endDate) {
    const fallbackView = params.period === 'day' || params.period === 'week' ? params.period : 'month';
    return { startDate: params.startDate, endDate: params.endDate, view: params.view ?? fallbackView };
  }

  const today = new Date();
  const todayStr = formatLocalDate(today);

  if (params.view === 'day') {
    return { startDate: todayStr, endDate: todayStr, view: 'day' };
  }

  if (params.view === 'week') {
    return { startDate: addLocalDays(todayStr, -6), endDate: todayStr, view: 'week' };
  }

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
      return { startDate: todayStr, endDate: todayStr, view: 'day' };
    case 'week': {
      return { startDate: addLocalDays(todayStr, -6), endDate: todayStr, view: 'week' };
    }
    case 'month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: formatLocalDate(start), endDate: todayStr, view: 'month' };
    }
    default:
      return { startDate: todayStr, endDate: todayStr, view: 'month' };
  }
}

export const ReportService = {
  async generate(userId: string, params: ReportParams): Promise<ReportResponse> {
    const { startDate, endDate, view } = calculateInterval(params);
    const dateRange = getUtcDateRange(startDate, endDate);

    const { data: sales, error } = await supabase
      .from('sales')
      .select('customer_id, customer_name, date, total_price, status, amount_paid, items:sale_items(quantity, subtotal, product_type, product_flavor, product_id)')
      .eq('user_id', userId)
      .gte('date', dateRange.start)
      .lt('date', dateRange.endExclusive);

    if (error) throw error;

    const saleItems = (sales ?? []).flatMap(sale => (sale.items as any[]) ?? []);
    const productIds = [...new Set(
      saleItems
        .filter(item => !item.product_type?.trim() || !item.product_flavor?.trim())
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
    let totalReceived = 0;
    let totalPending = 0;
    let quantitySold = 0;
    const productMap: Record<string, { product: string; quantity: number; totalValue: number }> = {};
    const customerMap: Record<string, { customerName: string; totalSpent: number; purchaseCount: number }> = {};
    const seriesMap: Record<string, { grossValue: number; receivedValue: number }> = {};

    for (const sale of sales ?? []) {
      const grossValue = sale.total_price ?? 0;
      const paidValue = Math.min(Math.max(sale.amount_paid ?? 0, 0), grossValue);
      const receivedValue = sale.status === 'PAGO'
        ? grossValue
        : sale.status === 'PENDENTE'
          ? paidValue
          : 0;
      const saleDate = getLocalDateKey(String(sale.date ?? ''));
      const seriesKey = view === 'year' ? saleDate.slice(0, 7) : saleDate;
      if (seriesKey) {
        const current = seriesMap[seriesKey] ?? { grossValue: 0, receivedValue: 0 };
        seriesMap[seriesKey] = {
          grossValue: current.grossValue + grossValue,
          receivedValue: current.receivedValue + receivedValue,
        };
      }

      const customerKey = sale.customer_id ?? sale.customer_name ?? 'unknown';
      if (!customerMap[customerKey]) {
        customerMap[customerKey] = { customerName: sale.customer_name ?? 'Cliente sem nome', totalSpent: 0, purchaseCount: 0 };
      }
      customerMap[customerKey].totalSpent += sale.total_price ?? 0;
      customerMap[customerKey].purchaseCount += 1;

      totalSold += grossValue;
      totalReceived += receivedValue;
      if (sale.status === 'PENDENTE') totalPending += grossValue - paidValue;

      for (const item of (sale.items as any[]) ?? []) {
        quantitySold += item.quantity ?? 0;

        const linkedProduct = item.product_id ? productsById.get(item.product_id) : undefined;
        const type = item.product_type?.trim() || linkedProduct?.type?.trim() || '?';
        const flavor = item.product_flavor?.trim() || linkedProduct?.flavor?.trim() || '?';
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

    const seriesYear = Number(startDate.slice(0, 4));
    const seriesMonth = Number(startDate.slice(5, 7));
    const daysInMonth = new Date(seriesYear, seriesMonth, 0).getDate();
    const series: ReportSeriesPoint[] = view === 'year'
      ? Array.from({ length: 12 }, (_, index) => {
        const key = `${seriesYear}-${String(index + 1).padStart(2, '0')}`;
        return { label: String(index + 1).padStart(2, '0'), ...(seriesMap[key] ?? { grossValue: 0, receivedValue: 0 }) };
      })
      : Array.from({ length: view === 'month' ? daysInMonth : 0 }, (_, index) => {
        const date = `${seriesYear}-${String(seriesMonth).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`;
        return { label: date.slice(8, 10), ...(seriesMap[date] ?? { grossValue: 0, receivedValue: 0 }) };
      });

    if (view === 'day' || view === 'week') {
      for (let date = startDate; date <= endDate; date = addLocalDays(date, 1)) {
        series.push({
          label: `${date.slice(8, 10)}/${date.slice(5, 7)}`,
          ...(seriesMap[date] ?? { grossValue: 0, receivedValue: 0 }),
        });
      }
    }

    return {
      totalSold,
      totalReceived,
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
