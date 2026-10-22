    export type UserRole = 'ADMIN' | 'STAFF';

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface UserForm {
  username: string;
  email: string;
  role: UserRole;
  password: string;
}

export const initialUserForm: UserForm = {
  username: '',
  email: '',
  role: 'STAFF',
  password: '',
};