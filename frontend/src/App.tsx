import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { router } from './router';
import { useSettingsStore } from './stores/settingsStore';
import { useAuthStore } from './stores/authStore';
import { apiClient } from './services/api';
import { ToastContainer } from './components/ui/Toast/ToastContainer';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ThemeManager() {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light');
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (!isDark) root.classList.add('light');

      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        root.classList.remove('light');
        if (!e.matches) root.classList.add('light');
      };
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    } else if (theme === 'light') {
      root.classList.add('light');
    }
    return undefined;
  }, [theme]);

  return null;
}

function AuthHydrator() {
  useEffect(() => {
    const authStore = useAuthStore.getState();
    apiClient.post('/auth/refresh')
      .then((res) => {
        const { user, access_token } = res.data.data as { user: import('./types/models').User; access_token: string };
        authStore.setUser(user);
        authStore.setAccessToken(access_token);
      })
      .catch(() => {
        authStore.logout();
      })
      .finally(() => {
        useAuthStore.setState({ isLoading: false });
      });
  }, []);

  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeManager />
      <AuthHydrator />
      <RouterProvider router={router} />
      <ToastContainer />
    </QueryClientProvider>
  );
}
