"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppState,
  AppStore,
  DailyStats,
  GrammarProgress,
  Rating,
  UserSettings,
  VocabProgress,
} from "./types";
import { calculateNextReview, createInitialSRSState, isDue } from "./srs";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function bumpStreak(
  lastActive: string,
  streak: number,
): { lastActive: string; streak: number } {
  const t = todayISO();
  if (lastActive === t) return { lastActive, streak };
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const y = yesterday.toISOString().slice(0, 10);
  if (lastActive === y) {
    return { lastActive: t, streak: streak + 1 };
  }
  return { lastActive: t, streak: 1 };
}

const defaultSettings: UserSettings = {
  dailyCardGoal: 10,
  dailyLessonGoal: 1,
  theme: "system",
  autoPlayAudio: false,
  audioRate: 0.9,
  audioVoiceURI: null,
};

const initialState: AppState = {
  vocabProgress: {},
  grammarProgress: {},
  dailyStats: [],
  settings: defaultSettings,
  lastActiveDate: todayISO(),
  streak: 0,
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      recordCardReview: (cardId: string, rating: Rating) => {
        const { vocabProgress, dailyStats, lastActiveDate, streak } = get();
        const prev = vocabProgress[cardId];
        const next = calculateNextReview(prev ?? createInitialSRSState(), rating);
        const nextProgress: VocabProgress = { ...vocabProgress, [cardId]: next };
        const { lastActive, streak: nextStreak } = bumpStreak(
          lastActiveDate,
          streak,
        );
        const t = todayISO();
        const stats: DailyStats[] = [...dailyStats];
        const idx = stats.findIndex((d) => d.date === t);
        if (idx >= 0) {
          stats[idx] = {
            ...stats[idx],
            cardsReviewed: stats[idx].cardsReviewed + 1,
          };
        } else {
          stats.push({ date: t, cardsReviewed: 1, lessonsCompleted: 0 });
        }
        set({
          vocabProgress: nextProgress,
          dailyStats: stats,
          lastActiveDate: lastActive,
          streak: nextStreak,
        });
      },

      recordLessonComplete: (lessonId: string, score: number, total: number) => {
        const { grammarProgress, dailyStats, lastActiveDate, streak } = get();
        const prev = grammarProgress[lessonId];
        const completed = score >= total * 0.7;
        const newlyCompleted = completed && !prev?.completed;
        const nextGrammar: GrammarProgress = {
          ...grammarProgress,
          [lessonId]: {
            completed,
            score,
            total,
            lastAttempt: new Date().toISOString(),
          },
        };
        const { lastActive, streak: nextStreak } = bumpStreak(
          lastActiveDate,
          streak,
        );
        const t = todayISO();
        const stats: DailyStats[] = [...dailyStats];
        if (newlyCompleted) {
          const idx = stats.findIndex((d) => d.date === t);
          if (idx >= 0) {
            stats[idx] = {
              ...stats[idx],
              lessonsCompleted: stats[idx].lessonsCompleted + 1,
            };
          } else {
            stats.push({ date: t, cardsReviewed: 0, lessonsCompleted: 1 });
          }
        }
        set({
          grammarProgress: nextGrammar,
          dailyStats: stats,
          lastActiveDate: lastActive,
          streak: nextStreak,
        });
      },

      setSettings: (partial: Partial<UserSettings>) => {
        const sanitized = { ...partial };
        if (sanitized.audioRate !== undefined) {
          sanitized.audioRate = Number.isFinite(sanitized.audioRate)
            ? Math.min(Math.max(sanitized.audioRate, 0.1), 10)
            : defaultSettings.audioRate;
        }
        set({ settings: { ...get().settings, ...sanitized } });
      },

      importState: (data: Partial<AppState>) => {
        const cur = get();
        set({
          vocabProgress: data.vocabProgress ?? cur.vocabProgress,
          grammarProgress: data.grammarProgress ?? cur.grammarProgress,
          dailyStats: data.dailyStats ?? cur.dailyStats,
          settings: { ...defaultSettings, ...cur.settings, ...data.settings },
          lastActiveDate: data.lastActiveDate ?? cur.lastActiveDate,
          streak: data.streak ?? cur.streak,
        });
      },

      resetProgress: () => {
        set({
          vocabProgress: {},
          grammarProgress: {},
          dailyStats: [],
          streak: 0,
          lastActiveDate: todayISO(),
        });
      },
    }),
    {
      name: "german-tutor-storage",
      version: 1,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as AppState;
        if (version === 0 || !Number.isFinite(state?.settings?.audioRate)) {
          return {
            ...state,
            settings: { ...defaultSettings, ...state?.settings, audioRate: 0.9 },
          };
        }
        return state;
      },
      partialize: (state) => ({
        vocabProgress: state.vocabProgress,
        grammarProgress: state.grammarProgress,
        dailyStats: state.dailyStats,
        settings: state.settings,
        lastActiveDate: state.lastActiveDate,
        streak: state.streak,
      }),
    },
  ),
);

export function getDueCardIds(
  allCardIds: string[],
  vocabProgress: VocabProgress,
): string[] {
  return allCardIds.filter((id) => isDue(vocabProgress[id]));
}
