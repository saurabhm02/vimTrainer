import { create } from 'zustand';
import type { AuthState } from '../types/stores';

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  guestToken: null,
  accessToken: null,
  isAuthenticated: false,
  isGuest: false,
  isLoading: true,
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isGuest: user?.isGuest ?? false,
      isLoading: false,
    }),
  setAccessToken: (token) => set({ accessToken: token }),
  setGuestToken: (token) => set({ guestToken: token, isLoading: false }),
  logout: () =>
    set({
      user: null,
      accessToken: null,
      guestToken: null,
      isAuthenticated: false,
      isGuest: false,
    }),
}));
