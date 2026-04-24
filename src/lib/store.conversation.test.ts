import { describe, it, expect, beforeEach } from "vitest";
import { createStore } from "zustand/vanilla";
import type { AppStore } from "@/lib/types";

function makeStore() {
  const { getState, setState } = createStore<Pick<AppStore,
    "conversationProgress" | "recordConversationComplete" | "dailyStats" | "lastActiveDate" | "streak"
  >>()(() => ({
    conversationProgress: {},
    dailyStats: [],
    lastActiveDate: new Date().toISOString().slice(0, 10),
    streak: 0,
    recordConversationComplete: (lessonId: string, score: number, total: number) => {
      const { conversationProgress, dailyStats } = getState();
      const completed = score >= total * 0.7;
      const prev = conversationProgress[lessonId];
      const newlyCompleted = completed && !prev?.completed;
      const t = new Date().toISOString().slice(0, 10);
      const stats = [...dailyStats];
      if (newlyCompleted) {
        const idx = stats.findIndex((d) => d.date === t);
        if (idx >= 0) {
          stats[idx] = { ...stats[idx], lessonsCompleted: stats[idx].lessonsCompleted + 1 };
        } else {
          stats.push({ date: t, cardsReviewed: 0, lessonsCompleted: 1 });
        }
      }
      setState({
        conversationProgress: {
          ...conversationProgress,
          [lessonId]: { completed, score, total, lastAttempt: new Date().toISOString() },
        },
        dailyStats: stats,
      });
    },
  }));
  return { getState };
}

describe("recordConversationComplete", () => {
  let store: ReturnType<typeof makeStore>;

  beforeEach(() => { store = makeStore(); });

  it("marks lesson as completed when score >= 70%", () => {
    store.getState().recordConversationComplete("l1", 4, 5);
    expect(store.getState().conversationProgress["l1"].completed).toBe(true);
  });

  it("marks lesson as not completed when score < 70%", () => {
    store.getState().recordConversationComplete("l1", 2, 5);
    expect(store.getState().conversationProgress["l1"].completed).toBe(false);
  });

  it("increments lessonsCompleted when newly completed", () => {
    store.getState().recordConversationComplete("l1", 4, 5);
    const today = new Date().toISOString().slice(0, 10);
    const stat = store.getState().dailyStats.find((d) => d.date === today);
    expect(stat?.lessonsCompleted).toBe(1);
  });
});
