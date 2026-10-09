export type ReportView = 'day' | 'week' | 'month' | 'year';

export interface ReportParams {
  period?: 'day' | 'week' | 'month';
  view?: ReportView;
  year?: number;
  month?: number;
  startDate?: string;
  endDate?: string;
}

export interface ReportSeriesPoint {
  label: string;
  grossValue: number;
  receivedValue: number;
}

export interface ReportResponse {
  totalSold: number;
  totalReceived: number;
  totalPending: number;
  quantitySold: number;
  series: ReportSeriesPoint[];
  seriesUnit: 'day' | 'month';
  topCustomers: {
    customerId: string;
    customerName: string;
    totalSpent: number;
    purchaseCount: number;
  }[];
  topProducts: {
    productKey: string;
    product: string;
    quantity: number;
    totalValue: number;
  }[];
}
