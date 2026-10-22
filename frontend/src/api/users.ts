import { apiClient } from './client';
import type { User, UserForm } from '@/types/user';

// An empty password means "keep the current one", so it isn't sent at all
function toPayload(form: UserForm) {
  const { password, ...rest } = form;
  return password ? { ...rest, password } : rest;
}

export async function fetchUsers(): Promise<User[]> {
  const res = await apiClient.get('/api/users');
  return res.data;
}

export async function createUser(form: UserForm): Promise<User> {
  const res = await apiClient.post('/api/users', toPayload(form));
  return res.data;
}

export async function updateUser(id: number, form: UserForm): Promise<User> {
  const res = await apiClient.put(`/api/users/${id}`, toPayload(form));
  return res.data;
}

export async function deleteUser(id: number): Promise<void> {
  await apiClient.delete(`/api/users/${id}`);
}