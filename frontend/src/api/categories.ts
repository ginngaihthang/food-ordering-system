import { apiClient } from './client'

export interface Category {
    id: number;
    name: string;
}

export async function fetchCategories(): Promise<Category[]> {
    const res = await apiClient.get('/api/categories');
    return res.data;
}