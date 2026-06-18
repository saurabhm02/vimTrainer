import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { AuthPrompt } from '../terminal/AuthPrompt/AuthPrompt';

export function AuthGuard(): JSX.Element {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isGuest = useAuthStore(s => s.isGuest);
  const isRealUser = isAuthenticated && !isGuest;

  if (!isRealUser) return <AuthPrompt />;
  return <Outlet />;
}
