import { apiClient } from './client';

export interface MenuProduct {
  id: number;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  isAvailable: boolean;
}

export interface MenuCategory {
  id: number;
  name: string;
  Products: MenuProduct[];
}

export async function fetchMenu(): Promise<MenuCategory[]> {
  const res = await apiClient.get('/api/menu');
  return res.data;
}