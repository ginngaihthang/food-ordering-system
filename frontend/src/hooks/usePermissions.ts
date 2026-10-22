import { useAuth } from '@/context/AuthContext';

export function usePermissions() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  return {
    isAdmin,
    canEdit: isAdmin, // rename, edit, hide, regenerate
    canDelete: isAdmin,
  };
}