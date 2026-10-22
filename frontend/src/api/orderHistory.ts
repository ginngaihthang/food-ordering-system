import { apiClient } from './client';

export interface HistoryOrderItem {
  name: string;
  quantity: number;
  subtotal: number;
}

export interface HistoryOrder {
  id: number;
  orderNumber: string;
  time: string;
  tableNumber: number | null;
  orderType: 'DINE_IN' | 'TAKEAWAY';
  pickupNumber: number | null;
  items: HistoryOrderItem[];
  itemsSummary: string;
  status: string;
  statusLabel: string;
  total: number;
  paymentStatus: 'UNPAID' | 'PAID';
  paymentMethod: 'CASH' | 'ONLINE' | null;
}

export interface OrderHistoryResult {
  date: string;
  totalOrders: number;
  revenue: number;
  avgOrder: number;
  cancelledCount: number;
  peakHour: string;
  statusCounts: Record<string, number>;
  orders: HistoryOrder[];
}

export interface WeekDay {
  date: string;
  label: string;
  revenue: number;
}

export async function fetchOrderHistory(date: string): Promise<OrderHistoryResult> {
  const res = await apiClient.get('/api/orders/history', { params: { date } });
  return res.data;
}

export async function fetchOrderHistoryWeek(date: string): Promise<{ days: WeekDay[] }> {
  const res = await apiClient.get('/api/orders/history/week', { params: { date } });
  return res.data;
}