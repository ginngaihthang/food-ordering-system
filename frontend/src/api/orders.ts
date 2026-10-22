import axios from 'axios';
import { apiClient } from './client';

export interface OrderItemInput {
  productId: number;
  quantity: number;
  notes?: string;
}

export interface CreateOrderInput {
  orderType: 'DINE_IN' | 'TAKEAWAY';
  tableToken?: string;
  items: OrderItemInput[];
}

export interface OrderItemResult {
  id: number;
  publicToken: string; 
  productId: number;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  Product?: { id: number; name: string; imageUrl: string | null };
}

export interface OrderResult {
  id: number;
  publicToken: string; 
  orderType: 'DINE_IN' | 'TAKEAWAY';
  status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  pickupNumber: number | null;
  tableSessionId: number | null;
  paymentStatus: 'UNPAID' | 'PAID';
  paymentMethod: 'CASH' | 'ONLINE' | null;
  createdAt: string;
  OrderItems: OrderItemResult[];
}

export interface SessionOrdersResult {
  session: { id: number; startedAt: string } | null;
  tableNumber?: number;
  orders: OrderResult[];
  total: number;
}

export type TrackedOrder =
  | { state: 'ready'; order: OrderResult }
  | { state: 'awaiting_payment' }
  | { state: 'payment_failed'; message: string };

export async function fetchOrderByToken(token: string): Promise<TrackedOrder> {
  try {
    const res = await apiClient.get(`/api/orders/track/${token}`);
    if (res.status === 202) return { state: 'awaiting_payment' };
    return { state: 'ready', order: res.data };
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 410) {
      const message = (err.response.data as { message?: string } | undefined)?.message;
      return { state: 'payment_failed', message: message ?? 'The payment was not completed.' };
    }
    throw err;
  }
}

export interface CheckoutStart {
  url: string;
  publicToken: string;
}

export async function markOrderServed(orderId: number): Promise<void> {
  await apiClient.patch(`/api/orders/${orderId}/status`, { status: 'COMPLETED' });
}

export async function startTakeawayCheckout(items: OrderItemInput[]): Promise<CheckoutStart> {
  const res = await apiClient.post('/api/orders/takeaway-checkout', { items });
  return res.data;
}

export async function createOrder(data: CreateOrderInput): Promise<OrderResult> {
  const res = await apiClient.post('/api/orders', data);
  return res.data;
}

export async function fetchSessionOrders(tableToken: string): Promise<SessionOrdersResult> {
  const res = await apiClient.get(`/api/orders/session/${tableToken}`);
  return res.data;
}

export async function fetchOrdersByTokens(tokens: string[]): Promise<OrderResult[]> {
  if (tokens.length === 0) return [];
  const res = await apiClient.get('/api/orders/by-tokens', { params: { tokens: tokens.join(',') } });
  return res.data;
}
// export async function fetchOrdersByIds(ids: number[]): Promise<OrderResult[]> {
//   if (ids.length === 0) return [];
//   const res = await apiClient.get('/api/orders/by-ids', { params: { ids: ids.join(',') } });
//   return res.data;
// }



export async function fetchTakeawayOrders(date: string): Promise<OrderResult[]> {
  const res = await apiClient.get('/api/orders/takeaway', { params: { date } });
  return res.data;
}

export interface TakeawayWeekDay {
  date: string;
  revenue: number;
  count: number;
}

export async function fetchTakeawayWeek(date: string): Promise<TakeawayWeekDay[]> {
  const res = await apiClient.get('/api/orders/takeaway/week', { params: { date } });
  return res.data.days;
}

export async function cancelOrder(orderId: number): Promise<OrderResult> {
  const res = await apiClient.patch(`/api/orders/${orderId}/cancel`);
  return res.data;
}