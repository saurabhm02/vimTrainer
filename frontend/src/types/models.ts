export interface User {
  id: string;
  email: string | null;
  displayName: string;
  isGuest: boolean;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Keymap {
  id: string;
  userId: string | null;
  sourceId: string | null;
  sourceName: string | null;
  keySequence: string;
  mode: VimMode;
  description: string;
  category: KeymapCategory;
  difficulty: KeymapDifficulty;
  isBuiltin: boolean;
  createdAt: string;
}

export interface KeymapSource {
  id: string;
  sourceType: 'file_upload' | 'github_import' | 'builtin';
  sourceName: string;
  githubUrl: string | null;
  keymapCount: number;
  parsedAt: string;
}

export interface PracticeSession {
  id: string;
  userId: string;
  mode: PracticeMode;
  status: 'active' | 'completed' | 'abandoned';
  keymapIds: string[];
  totalChallenges: number;
  completedChallenges: number;
  correctCount: number;
  avgResponseMs: number | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
}

export interface SpacedRepetitionRecord {
  id: string;
  userId: string;
  keymapId: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewAt: string;
  lastReviewedAt: string | null;
  correctReviews: number;
  totalReviews: number;
  avgResponseMs: number | null;
}

export interface Achievement {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: 'practice' | 'mastery' | 'streak' | 'import';
  conditionType: string;
  conditionValue: number;
  unlockedAt: string | null;
}

export interface UserSettings {
  id: string;
  userId: string;
  theme: 'dark' | 'light' | 'system';
  sessionLength: 10 | 20 | 30;
  practiceSounds: boolean;
  showKeyHints: boolean;
  reducedMotion: boolean;
}

export type PracticeMode = 'practice' | 'motion' | 'leader' | 'flashcard';
export type VimMode = 'n' | 'i' | 'v' | 'x' | 'o' | 't' | 'c';
export type KeymapCategory = 'motion' | 'leader' | 'lsp' | 'navigation' | 'editing' | 'plugin' | 'other';
export type KeymapDifficulty = 'beginner' | 'intermediate' | 'advanced';
