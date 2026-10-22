import { apiClient } from './client';
import type { Category, CategoryForm } from '@/types/category';

// Re-exported so older imports like `import { type Category } from '@/api/categories'` keep working
export type { Category } from '@/types/category';

export async function fetchCategories(): Promise<Category[]> {
  const res = await apiClient.get('/api/categories');
  return res.data;
}

export async function createCategory(data: CategoryForm): Promise<Category> {
  const res = await apiClient.post('/api/categories', data);
  return res.data;
}

export async function updateCategory(id: number, data: CategoryForm): Promise<Category> {
  const res = await apiClient.put(`/api/categories/${id}`, data);
  return res.data;
}

export async function toggleCategoryActive(id: number): Promise<void> {
  await apiClient.patch(`/api/categories/${id}/active`);
}

export async function deleteCategory(id: number): Promise<void> {
  await apiClient.delete(`/api/categories/${id}`);
}