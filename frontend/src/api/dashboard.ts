import { apiClient } from './client';

export interface LiveOrderSummary {
  id: number;
  tableNumber: number | null;
  orderType: 'DINE_IN' | 'TAKEAWAY';
  pickupNumber: number | null;
  itemsSummary: string;
  minutesAgo: number;
}

export interface DashboardResult {
  revenueToday: number;
  revenueChangePct: number;
  ordersToday: number;
  ordersDiff: number;
  avgOrderToday: number;
  avgOrderChangePct: number;
  activeTables: number;
  totalTables: number;
  readyCount: number;
  liveOrders: {
    received: LiveOrderSummary[];
    preparing: LiveOrderSummary[];
    ready: LiveOrderSummary[];
  };
  revenueLast7Days: { label: string; date: string; revenue: number }[];
  topItems: { name: string; count: number }[];
  tablesGrid: { tableNumber: number; status: 'FREE' | 'RECEIVED' | 'PREPARING' | 'READY' }[];
}

export async function fetchDashboard(): Promise<DashboardResult> {
  const res = await apiClient.get('/api/dashboard');
  return res.data;
}
