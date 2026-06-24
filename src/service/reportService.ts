import { supabase } from '@/lib/supabase';
import { ReportParams, ReportResponse } from '@/types/Report';

function calculateInterval(params: ReportParams): { startDate: string; endDate: string } {
  if (params.startDate && params.endDate) {
    return { startDate: params.startDate, endDate: params.endDate };
  }

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  switch (params.period) {
    case 'day':
      return { startDate: todayStr, endDate: todayStr };
    case 'week': {
      const start = new Date(today);
      start.setDate(today.getDate() - 7);
      return { startDate: start.toISOString().split('T')[0], endDate: todayStr };
    }
    case 'month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: start.toISOString().split('T')[0], endDate: todayStr };
    }
    default:
      return { startDate: todayStr, endDate: todayStr };
  }
}

export const ReportService = {
  async generate(userId: string, params: ReportParams): Promise<ReportResponse> {
    const { startDate, endDate } = calculateInterval(params);

    const { data: sales, error } = await supabase
      .from('sales')
      .select('total_price, status, items:sale_items(quantity, subtotal, product_type, product_flavor, product_id, product:products(production_cost))')
      .eq('user_id', userId)
      .gte('date', `${startDate}T00:00:00Z`)
      .lte('date', `${endDate}T23:59:59Z`);

    if (error) throw error;

    let totalSold = 0;
    let totalPending = 0;
    let quantitySold = 0;
    let totalCost = 0;
    const productMap: Record<string, { quantity: number; totalValue: number }> = {};

    for (const sale of sales ?? []) {
      if (sale.status === 'OK') totalSold += sale.total_price ?? 0;
      if (sale.status === 'PENDENTE') totalPending += sale.total_price ?? 0;

      for (const item of (sale.items as any[]) ?? []) {
        quantitySold += item.quantity ?? 0;
        totalCost += ((item.product as any)?.production_cost ?? 0) * (item.quantity ?? 0);

        const productName = `${item.product_type ?? '?'} - ${item.product_flavor ?? '?'}`;
        if (!productMap[productName]) productMap[productName] = { quantity: 0, totalValue: 0 };
        productMap[productName].quantity += item.quantity ?? 0;
        productMap[productName].totalValue += item.subtotal ?? 0;
      }
    }

    const topProducts = Object.entries(productMap)
      .map(([product, v]) => ({ product, ...v }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return {
      totalSold,
      totalPending,
      totalProfit: totalSold - totalCost,
      quantitySold,
      topProducts,
    };
  },
};
