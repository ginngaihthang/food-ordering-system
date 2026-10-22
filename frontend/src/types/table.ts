export interface ActiveSessionSummary {
  id: number;
  startedAt: string;
  orderCount: number;
  total: number;
  paymentStatus: 'UNPAID' | 'PAID';
  paymentMethod: 'CASH' | 'ONLINE' | null;
}

export interface RestaurantTable {
  id: number;
  tableNumber: number;
  qrToken: string;
  status: 'AVAILABLE' | 'OCCUPIED';
  activeSession?: ActiveSessionSummary   | null;
}

export interface SessionOrderItem {
  id: number;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  Product?: { id: number; name: string };
}

export interface SessionOrder {
  id: number;
  status: string;
  createdAt: string;
  OrderItems: SessionOrderItem[];
}

export interface TableSessionResult {
  session: { id: number; startedAt: string } | null;
  paymentStatus?: 'UNPAID' | 'PAID';
  paymentMethod: 'CASH' | 'ONLINE' | null;
  paidAt: string | null;
  cashReceived: number | null;
  orders: SessionOrder[];
  total: number;
}