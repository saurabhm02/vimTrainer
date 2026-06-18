import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface GuestGuardProps {
  children: React.ReactNode;
}

export function GuestGuard({ children }: GuestGuardProps): JSX.Element {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isGuest = useAuthStore(s => s.isGuest);
  const isLoading = useAuthStore(s => s.isLoading);

  if (isLoading) return <>{children}</>;
  if (isAuthenticated && !isGuest) return <Navigate to="/editor" replace />;
  return <>{children}</>;
}
