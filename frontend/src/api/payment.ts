import { apiClient } from './client';
export interface CashPaymentResult {
  total: number;
  cashReceived: number;
  change: number;
}

export type PaymentMethod = 'CASH' | 'ONLINE';

export interface ReceiptOrderItem {
  id: number;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  Product?: { name: string };
}



export interface ReceiptTax {
  amount: number; // tax included in the total
  rate: number | null; // null when the visit mixed different rates
  net: number; // total before tax
}

export interface ReceiptOrder {
  id: number;
  status: string;
  OrderItems: ReceiptOrderItem[];
}



export interface SessionReceipt {
  tableNumber: number;
  sessionId: number;
  startedAt: string;
  paymentStatus: 'UNPAID' | 'PAID';
  paymentMethod: PaymentMethod | null;
  paidAt: string | null;
  orders: ReceiptOrder[];
  total: number;
  tax: ReceiptTax;
  cashReceived: number | null;
}

export interface OrderReceipt {
  orderId: number;
  orderType: 'DINE_IN' | 'TAKEAWAY';
  pickupNumber: number | null;
  createdAt: string;
  paymentStatus: 'UNPAID' | 'PAID';
  paymentMethod: PaymentMethod | null;
  paidAt: string | null;
  items: ReceiptOrderItem[];
  total: number;
  tax: ReceiptTax;
  cashReceived: number | null;
}
export async function paySession(tableId: number, amountReceived: number): Promise<CashPaymentResult> {
  const res = await apiClient.post(`/api/tables/${tableId}/pay`, {
    method: 'CASH',
    amountReceived,
  });
  return res.data;
}

// export async function paySession(tableId: number, method: PaymentMethod): Promise<void> {
//   await apiClient.post(`/api/tables/${tableId}/pay`, { method });
// }

export async function fetchSessionReceipt(tableId: number): Promise<SessionReceipt> {
  const res = await apiClient.get(`/api/tables/${tableId}/receipt`);
  return res.data;
}

export async function payOrder(orderId: number, method: PaymentMethod): Promise<void> {
  await apiClient.patch(`/api/orders/${orderId}/pay`, { method });
}

export async function fetchOrderReceipt(orderId: number): Promise<OrderReceipt> {
  const res = await apiClient.get(`/api/orders/${orderId}/receipt`);
  return res.data;
}