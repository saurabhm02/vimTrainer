import { create } from 'zustand';
import type { Keymap, KeymapSource } from '../types/models';

interface KeymapFilters {
  mode: string;
  category: string;
  search: string;
  includeBuiltin: boolean;
}

interface KeymapState {
  keymaps: Keymap[];
  sources: KeymapSource[];
  builtinKeymaps: Keymap[];
  filters: KeymapFilters;
  isLoading: boolean;
  setFilters: (filters: Partial<KeymapFilters>) => void;
  setKeymaps: (keymaps: Keymap[]) => void;
  setSources: (sources: KeymapSource[]) => void;
  setBuiltinKeymaps: (keymaps: Keymap[]) => void;
}

export const useKeymapStore = create<KeymapState>()((set) => ({
  keymaps: [],
  sources: [],
  builtinKeymaps: [],
  filters: { mode: '', category: '', search: '', includeBuiltin: false },
  isLoading: false,
  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),
  setKeymaps: (keymaps) => set({ keymaps }),
  setSources: (sources) => set({ sources }),
  setBuiltinKeymaps: (keymaps) => set({ builtinKeymaps: keymaps }),
}));
