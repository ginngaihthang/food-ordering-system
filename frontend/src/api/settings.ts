import { apiClient } from './client';
import type { Settings } from '@/types/settings';

export interface SystemStatus {
  database: 'connected' | 'disconnected';
  serverTime: string;
  timezone: string;
  uptimeSeconds: number;
  version: string;
  onlinePayments: boolean;
}

export async function fetchSettings(): Promise<Settings> {
  const res = await apiClient.get('/api/settings');
  return res.data;
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const res = await apiClient.put('/api/settings', patch);
  return res.data;
}

export async function fetchSystemStatus(): Promise<SystemStatus> {
  const res = await apiClient.get('/api/settings/system');
  return res.data;
}