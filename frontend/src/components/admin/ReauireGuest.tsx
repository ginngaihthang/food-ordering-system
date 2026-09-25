import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function RequireGuest({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token } = useAuth();

  if (token) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
}