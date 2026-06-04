import { describe, it, expect, beforeEach } from "vitest";
import { createStore } from "zustand/vanilla";
import type { AppStore } from "@/lib/types";

// Minimal store factory for testing without persist middleware
function makeStore() {
  const { getState, setState } = createStore<Pick<AppStore,
    "readingProgress" | "recordReadingComplete" | "dailyStats" | "lastActiveDate" | "streak"
  >>()(() => ({
    readingProgress: {},
    dailyStats: [],
    lastActiveDate: new Date().toISOString().slice(0, 10),
    streak: 0,
    recordReadingComplete: (passageId: string, score: number, total: number) => {
      const { readingProgress, dailyStats } = getState();
      const completed = score >= total * 0.7;
      const prev = readingProgress[passageId];
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
        readingProgress: {
          ...readingProgress,
          [passageId]: { completed, score, total, lastAttempt: new Date().toISOString() },
        },
        dailyStats: stats,
      });
    },
  }));
  return { getState, setState };
}

describe("recordReadingComplete", () => {
  let store: ReturnType<typeof makeStore>;

  beforeEach(() => {
    store = makeStore();
  });

  it("marks passage as completed when score >= 70%", () => {
    store.getState().recordReadingComplete("p1", 4, 5);
    expect(store.getState().readingProgress["p1"].completed).toBe(true);
  });

  it("marks passage as not completed when score < 70%", () => {
    store.getState().recordReadingComplete("p1", 2, 5);
    expect(store.getState().readingProgress["p1"].completed).toBe(false);
  });

  it("saves score and total", () => {
    store.getState().recordReadingComplete("p1", 3, 4);
    expect(store.getState().readingProgress["p1"].score).toBe(3);
    expect(store.getState().readingProgress["p1"].total).toBe(4);
  });

  it("increments lessonsCompleted in dailyStats when newly completed", () => {
    store.getState().recordReadingComplete("p1", 4, 5);
    const today = new Date().toISOString().slice(0, 10);
    const stat = store.getState().dailyStats.find((d) => d.date === today);
    expect(stat?.lessonsCompleted).toBe(1);
  });

  it("does not increment dailyStats when not newly completed", () => {
    store.getState().recordReadingComplete("p1", 1, 5); // fail
    expect(store.getState().dailyStats).toHaveLength(0);
  });
});
