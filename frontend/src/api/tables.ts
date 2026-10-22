import type { RestaurantTable, TableSessionResult } from '@/types/table';
import { apiClient } from './client';



export async function fetchTables(): Promise<RestaurantTable[]> {
  const res = await apiClient.get('/api/tables');
  return res.data;
}

export async function createTable(tableNumber: number): Promise<RestaurantTable> {
  const res = await apiClient.post('/api/tables', { tableNumber });
  return res.data;
}

export async function updateTable(id: number, tableNumber: number): Promise<RestaurantTable> {
  const res = await apiClient.put(`/api/tables/${id}`, { tableNumber });
  return res.data;
}

export async function deleteTable(id: number): Promise<void> {
  await apiClient.delete(`/api/tables/${id}`);
}

export async function regenerateQrToken(id: number): Promise<RestaurantTable> {
  const res = await apiClient.patch(`/api/tables/${id}/regenerate-qr`);
  return res.data;
}

export async function fetchTableByToken(token: string) {
  const res = await apiClient.get(`/api/tables/by-token/${token}`);
  return res.data as { id: number; tableNumber: number; status: string };
}

export async function fetchTableSession(tableId: number): Promise<TableSessionResult> {
  const res = await apiClient.get(`/api/tables/${tableId}/session`);
  return res.data;
}

export async function closeTableSession(tableId: number): Promise<void> {
  await apiClient.post(`/api/tables/${tableId}/close-session`);
}