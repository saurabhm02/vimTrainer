import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SettingsState } from '../types/stores';
import type { UserSettings } from '../types/models';

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark' as const,
      sessionLength: 20 as const,
      practiceSounds: true,
      showKeyHints: true,
      reducedMotion: false,
      updateSetting: (key, value) => set({ [key]: value } as Partial<SettingsState>),
      syncFromServer: (settings: UserSettings) =>
        set({
          theme: settings.theme,
          sessionLength: settings.sessionLength,
          practiceSounds: settings.practiceSounds,
          showKeyHints: settings.showKeyHints,
          reducedMotion: settings.reducedMotion,
        }),
    }),
    {
      name: 'vimtrainer_settings',
      partialize: (state) => ({
        theme: state.theme,
        sessionLength: state.sessionLength,
        practiceSounds: state.practiceSounds,
        showKeyHints: state.showKeyHints,
        reducedMotion: state.reducedMotion,
      }),
    }
  )
);
