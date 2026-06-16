# VimTrainer Zustand Stores

**Version**: 1.0
**Last Updated**: 2026-06-16
**Status**: Production Reference

All store code is syntactically complete TypeScript. Copy directly into implementation files.

---

## 1. Shared Types

**File:** `src/types/stores.ts`

```typescript
export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  streakDays: number;
  totalSessions: number;
}

export interface Keymap {
  id: string;
  userId: string;
  sourceId: string;
  mode: 'normal' | 'insert' | 'visual' | 'command' | 'terminal';
  lhs: string;         // The key sequence e.g. "<leader>ff"
  rhs: string | null;  // What it maps to (may be null for <Plug> maps)
  description: string;
  category: string;
  pluginName: string | null;
  createdAt: string;
  masteryScore: number;  // 0–1000
  lastPracticed: string | null;
}

export interface Challenge {
  keymapId: string;
  description: string;
  sequence: string;
  mode: Keymap['mode'];
  category: string;
  pluginName: string | null;
  masteryScore: number;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  /** Duration in ms before auto-dismiss. 0 = persistent. */
  duration: number;
}

export type Theme = 'dark' | 'light' | 'system';
export type KeyboardLayout = 'qwerty' | 'dvorak' | 'colemak' | 'azerty';
```

---

## 2. authStore

**File:** `src/stores/authStore.ts`

```typescript
import { create } from 'zustand';
import { User } from '../types/stores';

interface AuthState {
  /** JWT access token */
  token: string | null;
  /** Decoded/stored user data */
  user: User | null;
  /** True when user is in guest (unauthenticated) mode */
  isGuest: boolean;
  /** True during token refresh operation */
  isRefreshing: boolean;
  /** Timeout ID for proactive token refresh */
  _refreshTimeoutId: ReturnType<typeof setTimeout> | null;
}

interface AuthActions {
  /** Called after successful login/register API response */
  login: (token: string, user: User, expiresInSeconds: number) => void;
  /** Called on logout — clears all auth state */
  logout: () => void;
  /** Switches app to guest mode without authentication */
  setGuest: () => void;
  /** Updates the stored token after a refresh */
  setToken: (token: string, expiresInSeconds: number) => void;
  /** Updates user data (e.g. after profile edit) */
  setUser: (user: User) => void;
  /** Resets store to initial state — called during full logout */
  reset: () => void;
}

type AuthStore = AuthState & AuthActions;

const INITIAL_STATE: AuthState = {
  token: null,
  user: null,
  isGuest: false,
  isRefreshing: false,
  _refreshTimeoutId: null,
};

/**
 * Schedule a proactive token refresh 60 seconds before expiry.
 * The actual refresh API call is made by the axios interceptor in src/api/client.ts.
 * This store only manages the scheduling.
 */
function scheduleRefresh(
  expiresInSeconds: number,
  get: () => AuthStore,
  set: (partial: Partial<AuthState>) => void,
): ReturnType<typeof setTimeout> {
  // Refresh 60 seconds before expiry, minimum 1 second
  const delayMs = Math.max((expiresInSeconds - 60) * 1000, 1000);

  return setTimeout(async () => {
    const state = get();
    if (!state.token) return;  // User logged out during timer

    set({ isRefreshing: true });

    try {
      // Dynamic import to avoid circular dependency with api/client.ts
      const { refreshAccessToken } = await import('../api/auth.api');
      const { token, expiresIn } = await refreshAccessToken();
      state.setToken(token, expiresIn);
    } catch {
      // Refresh failed — token expired, force logout
      get().logout();
    } finally {
      set({ isRefreshing: false });
    }
  }, delayMs);
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  ...INITIAL_STATE,

  login(token: string, user: User, expiresInSeconds: number): void {
    // Clear any existing refresh timer
    const existing = get()._refreshTimeoutId;
    if (existing !== null) clearTimeout(existing);

    const timeoutId = scheduleRefresh(expiresInSeconds, get, set);

    set({
      token,
      user,
      isGuest: false,
      isRefreshing: false,
      _refreshTimeoutId: timeoutId,
    });
  },

  logout(): void {
    const { _refreshTimeoutId } = get();
    if (_refreshTimeoutId !== null) clearTimeout(_refreshTimeoutId);

    // Reset this store first, then trigger cascading resets
    set(INITIAL_STATE);

    // Reset all other stores on logout
    // Imported here to avoid circular deps at module load time
    import('./practiceStore').then(m => m.usePracticeStore.getState().resetSession());
    import('./keymapStore').then(m  => m.useKeymapStore.getState().reset());
    import('./uiStore').then(m      => m.useUIStore.getState().clearToasts());
    // settingsStore: do NOT reset — preserve theme/preferences across login/logout
  },

  setGuest(): void {
    const existing = get()._refreshTimeoutId;
    if (existing !== null) clearTimeout(existing);

    set({
      token: null,
      user: null,
      isGuest: true,
      isRefreshing: false,
      _refreshTimeoutId: null,
    });
  },

  setToken(token: string, expiresInSeconds: number): void {
    const existing = get()._refreshTimeoutId;
    if (existing !== null) clearTimeout(existing);

    const timeoutId = scheduleRefresh(expiresInSeconds, get, set);

    set({ token, _refreshTimeoutId: timeoutId });
  },

  setUser(user: User): void {
    set({ user });
  },

  reset(): void {
    const { _refreshTimeoutId } = get();
    if (_refreshTimeoutId !== null) clearTimeout(_refreshTimeoutId);
    set(INITIAL_STATE);
  },
}));
```

---

## 3. practiceStore

**File:** `src/stores/practiceStore.ts`

```typescript
import { create } from 'zustand';
import { Challenge } from '../types/stores';

/**
 * Session state machine transitions:
 *
 *   idle
 *     → loading        (startSession called)
 *   loading
 *     → active         (challenges loaded, first challenge set)
 *     → idle           (load failed)
 *   active
 *     → correct-feedback   (submitAnswer called, answer is correct)
 *     → incorrect-feedback (submitAnswer called, answer is wrong)
 *   correct-feedback
 *     → active         (nextChallenge, more challenges remain)
 *     → complete       (nextChallenge, no challenges remain)
 *   incorrect-feedback
 *     → active         (nextChallenge, more challenges remain)
 *     → complete       (nextChallenge, no challenges remain)
 *   complete
 *     → idle           (resetSession called)
 */
export type SessionState =
  | 'idle'
  | 'loading'
  | 'active'
  | 'correct-feedback'
  | 'incorrect-feedback'
  | 'complete';

export type PracticeMode = 'all' | 'motions' | 'leader' | 'custom';

interface AttemptRecord {
  keymapId: string;
  wasCorrect: boolean;
  responseTimeMs: number;
  typedSequence: string;
}

interface PracticeState {
  sessionState: SessionState;
  mode: PracticeMode;
  /** Full list of challenges for this session */
  challenges: Challenge[];
  /** Index into challenges array */
  challengeIndex: number;
  /** Currently active challenge */
  currentChallenge: Challenge | null;
  /** Keys typed so far for the current challenge, e.g. ['<leader>', 'f', 'f'] */
  inputBuffer: string[];
  /** Accumulates typed buffer as a single string for comparison */
  typedSequence: string;

  // Score tracking
  score: number;
  streak: number;
  highStreak: number;
  correctCount: number;
  incorrectCount: number;

  // Timer (ms)
  sessionStartTimeMs: number;
  challengeStartTimeMs: number;
  elapsedMs: number;
  _timerIntervalId: ReturnType<typeof setInterval> | null;

  // Attempt history for end-of-session summary and API submission
  attempts: AttemptRecord[];
}

interface PracticeActions {
  startSession: (mode: PracticeMode, challenges: Challenge[]) => void;
  submitAnswer: (typedSequence: string) => void;
  nextChallenge: () => void;
  appendKey: (key: string) => void;
  clearBuffer: () => void;
  endSession: () => void;
  resetSession: () => void;
  /** Called by timer interval to update elapsed time */
  _tickTimer: () => void;
}

type PracticeStore = PracticeState & PracticeActions;

const INITIAL_PRACTICE_STATE: PracticeState = {
  sessionState: 'idle',
  mode: 'all',
  challenges: [],
  challengeIndex: 0,
  currentChallenge: null,
  inputBuffer: [],
  typedSequence: '',
  score: 0,
  streak: 0,
  highStreak: 0,
  correctCount: 0,
  incorrectCount: 0,
  sessionStartTimeMs: 0,
  challengeStartTimeMs: 0,
  elapsedMs: 0,
  _timerIntervalId: null,
  attempts: [],
};

/** Points awarded per correct answer. Streak multiplier applied. */
function calculateScore(streak: number, responseTimeMs: number): number {
  const base        = 100;
  const streakBonus = Math.min(streak * 10, 100);  // Cap bonus at 100
  const speedBonus  = responseTimeMs < 1000 ? 50
                    : responseTimeMs < 2000 ? 25
                    : responseTimeMs < 3000 ? 10
                    : 0;
  return base + streakBonus + speedBonus;
}

/** Normalize the typed sequence for comparison (trim whitespace, lowercase) */
function normalizeSequence(seq: string): string {
  return seq.trim().toLowerCase();
}

export const usePracticeStore = create<PracticeStore>((set, get) => ({
  ...INITIAL_PRACTICE_STATE,

  startSession(mode: PracticeMode, challenges: Challenge[]): void {
    const existing = get()._timerIntervalId;
    if (existing !== null) clearInterval(existing);

    if (challenges.length === 0) {
      set({ sessionState: 'idle' });
      return;
    }

    const now = Date.now();
    const intervalId = setInterval(() => get()._tickTimer(), 100);

    set({
      ...INITIAL_PRACTICE_STATE,
      sessionState: 'active',
      mode,
      challenges,
      challengeIndex: 0,
      currentChallenge: challenges[0],
      sessionStartTimeMs: now,
      challengeStartTimeMs: now,
      _timerIntervalId: intervalId,
    });
  },

  submitAnswer(typedSequence: string): void {
    const state = get();
    if (state.sessionState !== 'active') return;
    if (!state.currentChallenge) return;

    const responseTimeMs = Date.now() - state.challengeStartTimeMs;
    const expected       = normalizeSequence(state.currentChallenge.sequence);
    const actual         = normalizeSequence(typedSequence);
    const isCorrect      = expected === actual;

    const newStreak     = isCorrect ? state.streak + 1 : 0;
    const newHighStreak = Math.max(newStreak, state.highStreak);
    const newScore      = isCorrect
      ? state.score + calculateScore(state.streak, responseTimeMs)
      : state.score;

    const attempt: AttemptRecord = {
      keymapId:      state.currentChallenge.keymapId,
      wasCorrect:    isCorrect,
      responseTimeMs,
      typedSequence,
    };

    set({
      sessionState: isCorrect ? 'correct-feedback' : 'incorrect-feedback',
      score:         newScore,
      streak:        newStreak,
      highStreak:    newHighStreak,
      correctCount:  isCorrect ? state.correctCount + 1 : state.correctCount,
      incorrectCount:isCorrect ? state.incorrectCount : state.incorrectCount + 1,
      inputBuffer:   [],
      typedSequence: '',
      attempts:      [...state.attempts, attempt],
    });
  },

  nextChallenge(): void {
    const state = get();
    const feedbackStates: SessionState[] = ['correct-feedback', 'incorrect-feedback'];
    if (!feedbackStates.includes(state.sessionState)) return;

    const nextIndex = state.challengeIndex + 1;

    if (nextIndex >= state.challenges.length) {
      // Session complete
      const existing = state._timerIntervalId;
      if (existing !== null) clearInterval(existing);

      set({
        sessionState:      'complete',
        challengeIndex:    nextIndex,
        currentChallenge:  null,
        elapsedMs:         Date.now() - state.sessionStartTimeMs,
        _timerIntervalId:  null,
      });
    } else {
      set({
        sessionState:        'active',
        challengeIndex:      nextIndex,
        currentChallenge:    state.challenges[nextIndex],
        challengeStartTimeMs: Date.now(),
        inputBuffer:         [],
        typedSequence:       '',
      });
    }
  },

  appendKey(key: string): void {
    const state = get();
    if (state.sessionState !== 'active') return;

    const newBuffer   = [...state.inputBuffer, key];
    const newSequence = newBuffer.join('');

    set({ inputBuffer: newBuffer, typedSequence: newSequence });
  },

  clearBuffer(): void {
    set({ inputBuffer: [], typedSequence: '' });
  },

  endSession(): void {
    const existing = get()._timerIntervalId;
    if (existing !== null) clearInterval(existing);

    set({
      sessionState:     'complete',
      elapsedMs:        Date.now() - get().sessionStartTimeMs,
      _timerIntervalId: null,
    });
  },

  resetSession(): void {
    const existing = get()._timerIntervalId;
    if (existing !== null) clearInterval(existing);

    set(INITIAL_PRACTICE_STATE);
  },

  _tickTimer(): void {
    const state = get();
    if (state.sessionState === 'idle' || state.sessionState === 'complete') return;

    set({ elapsedMs: Date.now() - state.sessionStartTimeMs });
  },
}));

// Derived selectors (use these in components for stable references)
export const selectAccuracy = (s: PracticeStore): number => {
  const total = s.correctCount + s.incorrectCount;
  if (total === 0) return 0;
  return Math.round((s.correctCount / total) * 100);
};

export const selectSessionResult = (s: PracticeStore) => ({
  totalChallenges:      s.challenges.length,
  correctCount:         s.correctCount,
  incorrectCount:       s.incorrectCount,
  accuracy:             selectAccuracy(s),
  score:                s.score,
  highStreak:           s.highStreak,
  durationMs:           s.elapsedMs,
  averageResponseTimeMs: s.attempts.length === 0
    ? 0
    : Math.round(s.attempts.reduce((sum, a) => sum + a.responseTimeMs, 0) / s.attempts.length),
  attempts:             s.attempts,
});
```

---

## 4. keymapStore

**File:** `src/stores/keymapStore.ts`

```typescript
import { create } from 'zustand';
import { Keymap } from '../types/stores';

interface KeymapFilters {
  /** Filter by source UUIDs (empty = all sources) */
  sourceIds: string[];
  /** Filter by category names (empty = all categories) */
  categories: string[];
  /** Filter by Vim modes (empty = all modes) */
  modes: Array<Keymap['mode']>;
  /** Free-text search against description and lhs */
  search: string;
}

interface KeymapState {
  /** All keymaps loaded from the API */
  allKeymaps: Keymap[];
  /** Currently applied filters */
  filters: KeymapFilters;
  /** Whether keymaps have been loaded at least once */
  isHydrated: boolean;
}

interface KeymapActions {
  /** Replace the full keymaps array (called after API fetch) */
  setKeymaps: (keymaps: Keymap[]) => void;
  /** Set filter values (partial update — unspecified filters preserved) */
  setFilter: (partial: Partial<KeymapFilters>) => void;
  /** Clear all filters to defaults */
  clearFilters: () => void;
  /** Update search text */
  setSearch: (query: string) => void;
  /** Reset store to initial state (called on logout) */
  reset: () => void;
}

type KeymapStore = KeymapState & KeymapActions;

const DEFAULT_FILTERS: KeymapFilters = {
  sourceIds:  [],
  categories: [],
  modes:      [],
  search:     '',
};

const INITIAL_KEYMAP_STATE: KeymapState = {
  allKeymaps:  [],
  filters:     DEFAULT_FILTERS,
  isHydrated:  false,
};

/** Pure filter function — applied to allKeymaps to produce filtered keymaps */
function applyFilters(keymaps: Keymap[], filters: KeymapFilters): Keymap[] {
  let result = keymaps;

  if (filters.sourceIds.length > 0) {
    result = result.filter(k => filters.sourceIds.includes(k.sourceId));
  }

  if (filters.categories.length > 0) {
    result = result.filter(k => filters.categories.includes(k.category));
  }

  if (filters.modes.length > 0) {
    result = result.filter(k => filters.modes.includes(k.mode));
  }

  if (filters.search.trim().length > 0) {
    const needle = filters.search.trim().toLowerCase();
    result = result.filter(k =>
      k.description.toLowerCase().includes(needle) ||
      k.lhs.toLowerCase().includes(needle) ||
      (k.pluginName?.toLowerCase().includes(needle) ?? false),
    );
  }

  return result;
}

export const useKeymapStore = create<KeymapStore>((set, get) => ({
  ...INITIAL_KEYMAP_STATE,

  setKeymaps(keymaps: Keymap[]): void {
    set({ allKeymaps: keymaps, isHydrated: true });
  },

  setFilter(partial: Partial<KeymapFilters>): void {
    set(state => ({
      filters: { ...state.filters, ...partial },
    }));
  },

  clearFilters(): void {
    set({ filters: DEFAULT_FILTERS });
  },

  setSearch(query: string): void {
    set(state => ({
      filters: { ...state.filters, search: query },
    }));
  },

  reset(): void {
    set(INITIAL_KEYMAP_STATE);
  },
}));

/** Derived selector — computes filtered keymaps without storing them in state */
export const selectFilteredKeymaps = (s: KeymapStore): Keymap[] =>
  applyFilters(s.allKeymaps, s.filters);

/** Derived selector — unique categories from all keymaps */
export const selectCategories = (s: KeymapStore): string[] =>
  [...new Set(s.allKeymaps.map(k => k.category))].sort();

/** Derived selector — unique modes from all keymaps */
export const selectModes = (s: KeymapStore): Array<Keymap['mode']> =>
  [...new Set(s.allKeymaps.map(k => k.mode))] as Array<Keymap['mode']>;
```

---

## 5. settingsStore

**File:** `src/stores/settingsStore.ts`

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage, PersistOptions } from 'zustand/middleware';
import { Theme, KeyboardLayout } from '../types/stores';

interface AppSettings {
  theme: Theme;
  /** Session duration in minutes (used as default session length) */
  session_duration_minutes: number;
  sounds_enabled: boolean;
  animations_enabled: boolean;
  keyboard_layout: KeyboardLayout;
  /** The leader key symbol shown in key chips (default: backslash) */
  leader_key_symbol: string;
  /** Show accuracy percentage after each answer */
  show_accuracy_after_answer: boolean;
  /** Auto-advance to next challenge after correct answer delay */
  auto_advance: boolean;
  /** Delay in ms before auto-advancing after correct answer */
  auto_advance_delay_ms: number;
}

interface SettingsState {
  settings: AppSettings;
  /** True when settings have been synced from API at least once */
  isSynced: boolean;
}

interface SettingsActions {
  /** Update one or more settings fields */
  updateSettings: (partial: Partial<AppSettings>) => void;
  /** Overwrite all settings from API response (after login/settings fetch) */
  syncFromAPI: (apiSettings: AppSettings) => void;
  /** Apply theme to <html> element */
  applyTheme: () => void;
  /** Reset to defaults (called on logout) — preserves theme */
  resetToDefaults: () => void;
}

type SettingsStore = SettingsState & SettingsActions;

const DEFAULT_SETTINGS: AppSettings = {
  theme:                    'dark',
  session_duration_minutes:  10,
  sounds_enabled:            false,
  animations_enabled:        true,
  keyboard_layout:           'qwerty',
  leader_key_symbol:         '\\',
  show_accuracy_after_answer: true,
  auto_advance:              true,
  auto_advance_delay_ms:     400,
};

const INITIAL_SETTINGS_STATE: SettingsState = {
  settings:  DEFAULT_SETTINGS,
  isSynced:  false,
};

/**
 * Apply theme class to <html> element.
 *
 * - 'dark'   → remove 'light' class
 * - 'light'  → add 'light' class
 * - 'system' → match prefers-color-scheme media query
 */
function applyThemeToDOM(theme: Theme): void {
  const root = document.documentElement;

  if (theme === 'light') {
    root.classList.add('light');
  } else if (theme === 'dark') {
    root.classList.remove('light');
  } else {
    // 'system'
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) root.classList.remove('light');
    else             root.classList.add('light');
  }
}

const persistConfig: PersistOptions<SettingsStore, SettingsState> = {
  name: 'vimtrainer-settings',
  storage: createJSONStorage(() => localStorage),
  // Only persist the settings object and sync flag, not actions
  partialize: (state: SettingsStore): SettingsState => ({
    settings: state.settings,
    isSynced: state.isSynced,
  }),
  version: 1,
  // Migration: v0 → v1 (add new fields with defaults)
  migrate: (persistedState: unknown, version: number): SettingsState => {
    if (version === 0) {
      const old = persistedState as Partial<SettingsState>;
      return {
        settings: { ...DEFAULT_SETTINGS, ...old.settings },
        isSynced: old.isSynced ?? false,
      };
    }
    return persistedState as SettingsState;
  },
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_SETTINGS_STATE,

      updateSettings(partial: Partial<AppSettings>): void {
        set(state => ({
          settings: { ...state.settings, ...partial },
        }));

        // If theme changed, apply it immediately
        if (partial.theme !== undefined) {
          applyThemeToDOM(partial.theme);
        }
      },

      syncFromAPI(apiSettings: AppSettings): void {
        set({
          settings: apiSettings,
          isSynced: true,
        });
        applyThemeToDOM(apiSettings.theme);
      },

      applyTheme(): void {
        applyThemeToDOM(get().settings.theme);
      },

      resetToDefaults(): void {
        // Preserve theme across logout so user doesn't get jarred by sudden theme change
        const currentTheme = get().settings.theme;
        set({
          settings: { ...DEFAULT_SETTINGS, theme: currentTheme },
          isSynced: false,
        });
      },
    }),
    persistConfig,
  ),
);
```

---

## 6. uiStore

**File:** `src/stores/uiStore.ts`

```typescript
import { create } from 'zustand';
import { Toast } from '../types/stores';

type ModalId = string;

interface UIState {
  isSidebarOpen: boolean;
  /** Stack of open modal IDs — last element is topmost modal */
  modalStack: ModalId[];
  /** Active toast notifications */
  toasts: Toast[];
  /** Registered global keyboard shortcuts: key combo → callback */
  shortcutRegistry: Map<string, () => void>;
}

interface UIActions {
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  openModal: (id: ModalId) => void;
  closeModal: (id: ModalId) => void;
  closeTopModal: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  registerShortcut: (combo: string, callback: () => void) => void;
  unregisterShortcut: (combo: string) => void;
}

type UIStore = UIState & UIActions;

let toastIdCounter = 0;
function generateToastId(): string {
  return `toast-${++toastIdCounter}-${Date.now()}`;
}

export const useUIStore = create<UIStore>((set, get) => ({
  isSidebarOpen: true,
  modalStack: [],
  toasts: [],
  shortcutRegistry: new Map(),

  toggleSidebar(): void {
    set(state => ({ isSidebarOpen: !state.isSidebarOpen }));
  },

  openSidebar(): void {
    set({ isSidebarOpen: true });
  },

  closeSidebar(): void {
    set({ isSidebarOpen: false });
  },

  openModal(id: ModalId): void {
    set(state => {
      // Prevent duplicate entries in the stack
      if (state.modalStack.includes(id)) return state;
      return { modalStack: [...state.modalStack, id] };
    });
  },

  closeModal(id: ModalId): void {
    set(state => ({
      modalStack: state.modalStack.filter(m => m !== id),
    }));
  },

  closeTopModal(): void {
    set(state => ({
      modalStack: state.modalStack.slice(0, -1),
    }));
  },

  addToast(toast: Omit<Toast, 'id'>): void {
    const id = generateToastId();
    const newToast: Toast = { ...toast, id };

    set(state => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto-dismiss after duration (if non-zero)
    if (toast.duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, toast.duration);
    }
  },

  removeToast(id: string): void {
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id),
    }));
  },

  clearToasts(): void {
    set({ toasts: [] });
  },

  registerShortcut(combo: string, callback: () => void): void {
    set(state => {
      const next = new Map(state.shortcutRegistry);
      next.set(combo, callback);
      return { shortcutRegistry: next };
    });
  },

  unregisterShortcut(combo: string): void {
    set(state => {
      const next = new Map(state.shortcutRegistry);
      next.delete(combo);
      return { shortcutRegistry: next };
    });
  },
}));
```

---

## 7. `useStoreHydration` Hook

Initializes all stores on app mount in the correct order.

**File:** `src/hooks/useStoreHydration.ts`

```typescript
import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useUIStore } from '../stores/uiStore';

/**
 * Run once on app mount (in main.tsx / App.tsx).
 *
 * Initialization order:
 * 1. settingsStore — apply persisted theme to DOM immediately (prevents flash)
 * 2. authStore — check for stored token in localStorage (non-persisted; use sessionStorage)
 * 3. uiStore — restore sidebar state from localStorage
 *
 * keymapStore and practiceStore do not need hydration — they load data lazily.
 */
export function useStoreHydration(): { isHydrated: boolean } {
  const isHydrated = useRef(false);
  const applyTheme = useSettingsStore(s => s.applyTheme);

  useEffect(() => {
    if (isHydrated.current) return;
    isHydrated.current = true;

    // Step 1: Apply theme from localStorage before first render to avoid FOUC
    applyTheme();

    // Step 2: Restore auth state from sessionStorage
    // (We use sessionStorage for tokens — never localStorage — for XSS safety)
    const storedToken = sessionStorage.getItem('vt_access_token');
    const storedUser  = sessionStorage.getItem('vt_user');
    const storedExpiry= sessionStorage.getItem('vt_token_expiry');

    if (storedToken && storedUser && storedExpiry) {
      const expiresInSeconds = Math.floor(
        (parseInt(storedExpiry, 10) - Date.now()) / 1000,
      );

      if (expiresInSeconds > 0) {
        try {
          const user = JSON.parse(storedUser);
          useAuthStore.getState().login(storedToken, user, expiresInSeconds);
        } catch {
          // Corrupted user data — clear and continue as guest
          sessionStorage.removeItem('vt_access_token');
          sessionStorage.removeItem('vt_user');
          sessionStorage.removeItem('vt_token_expiry');
        }
      } else {
        // Token expired while app was closed — clear storage
        sessionStorage.removeItem('vt_access_token');
        sessionStorage.removeItem('vt_user');
        sessionStorage.removeItem('vt_token_expiry');
      }
    }

    // Step 3: Restore sidebar state
    const sidebarState = localStorage.getItem('vt_sidebar_open');
    if (sidebarState === 'false') {
      useUIStore.getState().closeSidebar();
    }
  }, [applyTheme]);

  // Also persist sidebar state on toggle
  useEffect(() => {
    const unsub = useUIStore.subscribe(
      s => s.isSidebarOpen,
      (isOpen) => {
        localStorage.setItem('vt_sidebar_open', String(isOpen));
      },
    );
    return unsub;
  }, []);

  return { isHydrated: isHydrated.current };
}
```

---

## 8. Store Reset Coordination on Logout

Logout sequence is orchestrated by `authStore.logout()`, which imports and resets other stores in a safe order:

```
1. authStore.reset()         — clear token, user, cancel refresh timer
2. practiceStore.resetSession() — end any active session, clear timer
3. keymapStore.reset()       — clear keymaps and filters
4. uiStore.clearToasts()     — dismiss any active toasts
5. settingsStore.resetToDefaults() — reset settings but preserve theme
```

This ordering ensures:
- The API client sees `token = null` before any in-flight requests complete.
- The session timer is cancelled before the session display unmounts.
- No stale keymap data persists to the next user session on a shared device.
- Theme is preserved so the next user doesn't see a jarring theme flash.

**sessionStorage cleanup on logout:**

```typescript
// In authStore.logout() — after setting INITIAL_STATE
sessionStorage.removeItem('vt_access_token');
sessionStorage.removeItem('vt_user');
sessionStorage.removeItem('vt_token_expiry');
```

---

## 9. Zustand Persist Config Summary

Only `settingsStore` uses Zustand `persist`. Other stores are in-memory only.

| Store | Persistence | Storage | Key |
|-------|-------------|---------|-----|
| authStore | No (uses sessionStorage manually) | sessionStorage | `vt_access_token`, `vt_user`, `vt_token_expiry` |
| practiceStore | No | — | — |
| keymapStore | No | — | — |
| settingsStore | Yes (Zustand persist) | localStorage | `vimtrainer-settings` |
| uiStore | No (manual for sidebar) | localStorage | `vt_sidebar_open` |

The settingsStore `partialize` function excludes all action functions from the persisted snapshot, ensuring only serializable data is written to localStorage.
