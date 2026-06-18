import type { User, UserSettings, PracticeMode } from './models';

export interface AuthState {
  user: User | null;
  guestToken: string | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  setGuestToken: (token: string | null) => void;
  logout: () => void;
}

export interface Challenge {
  keymapId: string;
  keySequence: string;
  mode: string;
  description: string;
  category: string;
  index: number;
}

export interface AttemptResult {
  isCorrect: boolean;
  correctSequence: string;
  responseMs: number;
}

export interface SessionStats {
  correctCount: number;
  totalCount: number;
  avgResponseMs: number;
  longestStreak: number;
  currentStreak: number;
}

export interface PracticeState {
  sessionId: string | null;
  mode: PracticeMode | null;
  challenges: Challenge[];
  currentIndex: number;
  capturedKeys: string[];
  isCapturing: boolean;
  lastResult: AttemptResult | null;
  sessionStats: SessionStats;
  startSession: (sessionId: string, mode: PracticeMode, challenges: Challenge[]) => void;
  submitAttempt: (result: AttemptResult) => void;
  nextChallenge: () => void;
  completeSession: () => void;
  resetSession: () => void;
}

export interface SettingsState {
  theme: 'dark' | 'light' | 'system';
  sessionLength: 10 | 20 | 30;
  practiceSounds: boolean;
  showKeyHints: boolean;
  reducedMotion: boolean;
  updateSetting: <K extends keyof Omit<SettingsState, 'updateSetting' | 'syncFromServer'>>(
    key: K,
    value: SettingsState[K]
  ) => void;
  syncFromServer: (settings: UserSettings) => void;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

export interface UIState {
  activeModal: string | null;
  toasts: Toast[];
  openModal: (id: string) => void;
  closeModal: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}
