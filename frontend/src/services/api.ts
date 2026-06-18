import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const BASE_URL = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:8080/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: unknown) => void; reject: (reason?: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null): void => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${token as string}`;
          }
          return apiClient(originalRequest);
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const { data } = await apiClient.post<{ data: { access_token: string } }>('/auth/refresh');
        const newToken = data.data.access_token;
        useAuthStore.getState().setAccessToken(newToken);
        processQueue(null, newToken);
        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  register: (data: { email: string; password: string; display_name: string }) =>
    apiClient.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    apiClient.post('/auth/login', data),
  logout: () => apiClient.post('/auth/logout'),
  refresh: () => apiClient.post('/auth/refresh'),
  createGuest: () => apiClient.post('/auth/guest'),
};

// Users
export const userApi = {
  getMe: () => apiClient.get('/users/me'),
  updateMe: (data: { display_name: string }) => apiClient.put('/users/me', data),
  changePassword: (data: { current_password: string; new_password: string }) =>
    apiClient.put('/users/me/password', data),
  deleteMe: () => apiClient.delete('/users/me'),
};

// Keymaps
export const keymapApi = {
  list: (params?: { mode?: string; category?: string; source_id?: string; search?: string; cursor?: string; limit?: number }) =>
    apiClient.get('/keymaps', { params }),
  listBuiltin: () => apiClient.get('/keymaps/builtin'),
  upload: (data: { content: string; source_name: string }) =>
    apiClient.post('/keymaps/upload', data),
  listSources: () => apiClient.get('/sources'),
  deleteSource: (id: string) => apiClient.delete(`/sources/${id}`),
};

// Sessions
export const sessionApi = {
  create: (data: { mode: string; length: number }) =>
    apiClient.post('/sessions', data),
  get: (id: string) => apiClient.get(`/sessions/${id}`),
  submitAttempt: (sessionId: string, data: { keymap_id: string; typed_sequence: string; is_correct: boolean; response_ms: number }) =>
    apiClient.post(`/sessions/${sessionId}/attempts`, data),
  complete: (sessionId: string) => apiClient.post(`/sessions/${sessionId}/complete`),
};

// Queue
export const queueApi = {
  getToday: () => apiClient.get('/queue/today'),
  regenerate: () => apiClient.post('/queue/today/regenerate'),
};

// Analytics
export const analyticsApi = {
  overview: () => apiClient.get('/analytics/overview'),
  accuracy: () => apiClient.get('/analytics/accuracy'),
  sessions: () => apiClient.get('/analytics/sessions'),
  heatmap: () => apiClient.get('/analytics/heatmap'),
  progress: () => apiClient.get('/analytics/progress'),
};

// Public Analytics
export const publicAnalyticsApi = {
  trackVisit: (path: string) => apiClient.post('/analytics/traffic/track', { path }),
  todayTraffic: () => apiClient.get('/analytics/traffic/today'),
};

// Achievements
export const achievementApi = {
  list: () => apiClient.get('/achievements'),
};

// Settings
export const settingsApi = {
  get: () => apiClient.get('/settings'),
  update: (data: object) => apiClient.put('/settings', data),
};
