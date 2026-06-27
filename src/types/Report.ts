export interface ReportParams {
  period: 'day' | 'week' | 'month';
  startDate?: string;
  endDate?: string;
}

export interface ReportResponse {
  totalSold: number;
  totalPending: number;
  quantitySold: number;
  topProducts: Array<{
    product: string;
    quantity: number;
    totalValue: number;
  }>;
}
