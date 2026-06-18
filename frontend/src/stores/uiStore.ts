import { create } from 'zustand';
import type { UIState, Toast } from '../types/stores';

export const useUIStore = create<UIState>()((set) => ({
  activeModal: null,
  toasts: [],
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
  addToast: (toast: Omit<Toast, 'id'>) =>
    set((s) => ({
      toasts: [...s.toasts, { ...toast, id: crypto.randomUUID() }],
    })),
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
