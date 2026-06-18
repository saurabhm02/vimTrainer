import { create } from 'zustand';
import type { PracticeState, Challenge, AttemptResult, SessionStats } from '../types/stores';
import type { PracticeMode } from '../types/models';

const defaultStats: SessionStats = {
  correctCount: 0,
  totalCount: 0,
  avgResponseMs: 0,
  longestStreak: 0,
  currentStreak: 0,
};

export const usePracticeStore = create<PracticeState>()((set, get) => ({
  sessionId: null,
  mode: null,
  challenges: [],
  currentIndex: 0,
  capturedKeys: [],
  isCapturing: false,
  lastResult: null,
  sessionStats: defaultStats,

  startSession: (sessionId: string, mode: PracticeMode, challenges: Challenge[]) =>
    set({ sessionId, mode, challenges, currentIndex: 0, sessionStats: defaultStats, lastResult: null }),

  submitAttempt: (result: AttemptResult) => {
    const { sessionStats } = get();
    const newStreak = result.isCorrect ? sessionStats.currentStreak + 1 : 0;
    const newStats: SessionStats = {
      totalCount: sessionStats.totalCount + 1,
      correctCount: result.isCorrect ? sessionStats.correctCount + 1 : sessionStats.correctCount,
      currentStreak: newStreak,
      longestStreak: Math.max(sessionStats.longestStreak, newStreak),
      avgResponseMs:
        sessionStats.totalCount === 0
          ? result.responseMs
          : Math.round(
              (sessionStats.avgResponseMs * sessionStats.totalCount + result.responseMs) /
                (sessionStats.totalCount + 1)
            ),
    };
    set({ lastResult: result, sessionStats: newStats });
  },

  nextChallenge: () =>
    set((state) => ({
      currentIndex: state.currentIndex + 1,
      lastResult: null,
      capturedKeys: [],
      isCapturing: false,
    })),

  completeSession: () => set({ isCapturing: false }),

  resetSession: () =>
    set({
      sessionId: null,
      mode: null,
      challenges: [],
      currentIndex: 0,
      capturedKeys: [],
      isCapturing: false,
      lastResult: null,
      sessionStats: defaultStats,
    }),
}));
