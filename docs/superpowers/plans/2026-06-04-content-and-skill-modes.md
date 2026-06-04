# Content Expansion + Listening, Writing, Speaking Modes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substantially deepen static German content at every CEFR level (A1–C2) and add three new skill modes — Listening, Writing, Speaking — none of which need an LLM or any runtime API.

**Architecture:** Static JSON/TS data committed to the repo; new App Router routes under `/listening`, `/writing`, `/speaking`; three new Zustand store fields with a v2 migration; one tiny strings utility for Levenshtein-based pronunciation grading; browser-native Web Speech API for speech recognition. No new third-party dependencies.

**Tech Stack:** Next.js 15 (App Router) + React 19, TypeScript, Tailwind v4, Zustand persist, existing `useAudio` (Web Speech Synthesis), browser `SpeechRecognition` API, Vitest.

**Reference spec:** `docs/superpowers/specs/2026-06-04-content-and-skill-modes-design.md` — single source of truth for content targets, types, and weights.

---

## Execution shape

Five phases. Phase 0 is sequential and blocks everything else. Phases 1 and 2 then run in parallel across many subagents. Phase 3 ties it all together. Phase 4 verifies.

```
Phase 0 (sequential) → Phase 1 (parallel) ┐
                     → Phase 2 (parallel) ┴→ Phase 3 → Phase 4
```

---

## Phase 0 — Foundation

These tasks must run sequentially in this exact order. They set the contracts (types, store, level assessor) that every later task depends on.

### Task 0.1: Add Writing and Speaking types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Append new types to `src/lib/types.ts`**

Append at end of file (do not modify existing exports):

```ts
// Writing
export type WritingExerciseType = "translate" | "completion" | "composition";

export interface WritingTranslate {
  id: string;
  type: "translate";
  promptEn: string;
  acceptedAnswers: string[];
  hintWords?: string[];
  explanation?: string;
}

export interface WritingCompletion {
  id: string;
  type: "completion";
  template: string; // contains one or more "___" placeholders
  blanks: { acceptedAnswers: string[] }[];
  explanation?: string;
}

export interface WritingComposition {
  id: string;
  type: "composition";
  promptEn: string;
  modelAnswer: string;
  minSentences?: number;
}

export type WritingExercise = WritingTranslate | WritingCompletion | WritingComposition;

export interface WritingPrompt {
  id: string;
  title: string;
  level: CEFRLevel;
  topic: string;
  exercises: WritingExercise[];
}

export interface WritingProgress {
  [promptId: string]: ContentProgress;
}

// Speaking
export interface SpeakingPhrase {
  id: string;
  german: string;
  english: string;
}

export interface SpeakingDrill {
  id: string;
  title: string;
  level: CEFRLevel;
  topic: string;
  phrases: SpeakingPhrase[];
}

export interface SpeakingProgress {
  [drillId: string]: ContentProgress;
}

// Listening
export interface ListeningProgress {
  [itemKey: string]: ContentProgress; // itemKey is "passage:<id>" or "conversation:<id>"
}
```

- [ ] **Step 2: Extend `AppState` and `AppActions`**

Replace the `AppState` and `AppActions` interfaces with these:

```ts
export interface AppState {
  vocabProgress: VocabProgress;
  grammarProgress: GrammarProgress;
  readingProgress: ReadingProgress;
  conversationProgress: ConversationProgress;
  listeningProgress: ListeningProgress;
  writingProgress: WritingProgress;
  speakingProgress: SpeakingProgress;
  dailyStats: DailyStats[];
  settings: UserSettings;
  lastActiveDate: string;
  streak: number;
}

export interface AppActions {
  recordCardReview: (cardId: string, rating: Rating) => void;
  recordLessonComplete: (lessonId: string, score: number, total: number) => void;
  recordReadingComplete: (passageId: string, score: number, total: number) => void;
  recordConversationComplete: (lessonId: string, score: number, total: number) => void;
  recordListeningComplete: (itemKey: string, score: number, total: number) => void;
  recordWritingComplete: (promptId: string, score: number, total: number) => void;
  recordSpeakingComplete: (drillId: string, score: number, total: number) => void;
  setSettings: (partial: Partial<UserSettings>) => void;
  importState: (data: Partial<AppState>) => void;
  resetProgress: () => void;
}
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: errors only in files that consume `AppState`/`AppActions` (store.ts, components). These will be fixed in Task 0.3.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): add Writing, Speaking, Listening progress types"
```

### Task 0.2: Add strings utility (normalize, levenshtein, similarity)

**Files:**
- Create: `src/lib/strings.ts`
- Create: `src/lib/strings.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/strings.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { normalize, levenshtein, similarity } from "./strings";

describe("normalize", () => {
  it("lowercases", () => {
    expect(normalize("Hallo")).toBe("hallo");
  });
  it("trims and collapses whitespace", () => {
    expect(normalize("  guten   morgen  ")).toBe("guten morgen");
  });
  it("strips terminal punctuation", () => {
    expect(normalize("Wie geht's?")).toBe("wie geht's");
    expect(normalize("Danke!")).toBe("danke");
  });
  it("strips German quotes", () => {
    expect(normalize("„Hallo"")).toBe("hallo");
  });
});

describe("levenshtein", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshtein("abc", "abc")).toBe(0);
  });
  it("counts single insertion", () => {
    expect(levenshtein("abc", "abcd")).toBe(1);
  });
  it("counts substitution", () => {
    expect(levenshtein("abc", "abd")).toBe(1);
  });
  it("handles empty strings", () => {
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("", "")).toBe(0);
  });
});

describe("similarity", () => {
  it("returns 1 for identical strings after normalize", () => {
    expect(similarity("Hallo", "hallo")).toBe(1);
  });
  it("returns 1 for both-empty", () => {
    expect(similarity("", "")).toBe(1);
  });
  it("returns a fraction for near matches", () => {
    const s = similarity("ich heiße anna", "ich heise anna");
    expect(s).toBeGreaterThan(0.85);
    expect(s).toBeLessThan(1);
  });
  it("normalizes punctuation before comparing", () => {
    expect(similarity("Guten Tag!", "guten tag")).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests, expect failure**

Run: `npx vitest run src/lib/strings.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/lib/strings.ts`**

```ts
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.!?,;:]+$/g, "")
    .replace(/[„""«»]/g, "")
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,      // insertion
        prev[j] + 1,          // deletion
        prev[j - 1] + cost,   // substitution
      );
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

export function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(na, nb) / maxLen;
}
```

- [ ] **Step 4: Run tests, expect pass**

Run: `npx vitest run src/lib/strings.test.ts`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/strings.ts src/lib/strings.test.ts
git commit -m "feat(strings): add normalize, levenshtein, similarity utilities"
```

### Task 0.3: Extend store with new fields, actions, and v2 migration

**Files:**
- Modify: `src/lib/store.ts`
- Create: `src/lib/store.listening.test.ts`
- Create: `src/lib/store.writing.test.ts`
- Create: `src/lib/store.speaking.test.ts`

- [ ] **Step 1: Write failing listening test**

Create `src/lib/store.listening.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "./store";

describe("recordListeningComplete", () => {
  beforeEach(() => {
    useAppStore.setState({
      vocabProgress: {},
      grammarProgress: {},
      readingProgress: {},
      conversationProgress: {},
      listeningProgress: {},
      writingProgress: {},
      speakingProgress: {},
      dailyStats: [],
      streak: 0,
      lastActiveDate: "1970-01-01",
    });
  });

  it("records a completed listening session", () => {
    useAppStore.getState().recordListeningComplete("passage:r1", 4, 5);
    const lp = useAppStore.getState().listeningProgress;
    expect(lp["passage:r1"].completed).toBe(true);
    expect(lp["passage:r1"].score).toBe(4);
    expect(lp["passage:r1"].total).toBe(5);
  });

  it("marks not-completed when below 70%", () => {
    useAppStore.getState().recordListeningComplete("conversation:c1", 1, 5);
    expect(useAppStore.getState().listeningProgress["conversation:c1"].completed).toBe(false);
  });

  it("bumps lessonsCompleted on first completion only", () => {
    useAppStore.getState().recordListeningComplete("passage:r1", 4, 5);
    useAppStore.getState().recordListeningComplete("passage:r1", 5, 5);
    const today = new Date().toISOString().slice(0, 10);
    const stat = useAppStore.getState().dailyStats.find((d) => d.date === today);
    expect(stat?.lessonsCompleted).toBe(1);
  });
});
```

- [ ] **Step 2: Write failing writing test**

Create `src/lib/store.writing.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "./store";

describe("recordWritingComplete", () => {
  beforeEach(() => {
    useAppStore.setState({
      vocabProgress: {},
      grammarProgress: {},
      readingProgress: {},
      conversationProgress: {},
      listeningProgress: {},
      writingProgress: {},
      speakingProgress: {},
      dailyStats: [],
      streak: 0,
      lastActiveDate: "1970-01-01",
    });
  });

  it("records a completed writing prompt", () => {
    useAppStore.getState().recordWritingComplete("w1", 3, 4);
    expect(useAppStore.getState().writingProgress.w1.completed).toBe(true);
  });

  it("does not mark complete when below 70%", () => {
    useAppStore.getState().recordWritingComplete("w2", 1, 4);
    expect(useAppStore.getState().writingProgress.w2.completed).toBe(false);
  });
});
```

- [ ] **Step 3: Write failing speaking test**

Create `src/lib/store.speaking.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "./store";

describe("recordSpeakingComplete", () => {
  beforeEach(() => {
    useAppStore.setState({
      vocabProgress: {},
      grammarProgress: {},
      readingProgress: {},
      conversationProgress: {},
      listeningProgress: {},
      writingProgress: {},
      speakingProgress: {},
      dailyStats: [],
      streak: 0,
      lastActiveDate: "1970-01-01",
    });
  });

  it("records a completed speaking drill", () => {
    useAppStore.getState().recordSpeakingComplete("s1", 8, 10);
    expect(useAppStore.getState().speakingProgress.s1.completed).toBe(true);
  });
});
```

- [ ] **Step 4: Run tests, expect failure**

Run: `npx vitest run src/lib/store.listening.test.ts src/lib/store.writing.test.ts src/lib/store.speaking.test.ts`
Expected: FAIL (actions don't exist; fields don't exist).

- [ ] **Step 5: Modify `src/lib/store.ts`**

In the imports at the top, add `ListeningProgress`, `SpeakingProgress`, `WritingProgress` to the existing type import.

Replace `initialState`:

```ts
const initialState: AppState = {
  vocabProgress: {},
  grammarProgress: {},
  readingProgress: {},
  conversationProgress: {},
  listeningProgress: {},
  writingProgress: {},
  speakingProgress: {},
  dailyStats: [],
  settings: defaultSettings,
  lastActiveDate: todayISO(),
  streak: 0,
};
```

Inside the store factory, add these three actions right after `recordConversationComplete`:

```ts
recordListeningComplete: (itemKey: string, score: number, total: number) => {
  const { listeningProgress, dailyStats, lastActiveDate, streak } = get();
  const completed = score >= total * 0.7;
  const prev = listeningProgress[itemKey];
  const newlyCompleted = completed && !prev?.completed;
  const next: ListeningProgress = {
    ...listeningProgress,
    [itemKey]: { completed, score, total, lastAttempt: new Date().toISOString() },
  };
  const { lastActive, streak: nextStreak } = bumpStreak(lastActiveDate, streak);
  const t = todayISO();
  const stats: DailyStats[] = [...dailyStats];
  if (newlyCompleted) {
    const idx = stats.findIndex((d) => d.date === t);
    if (idx >= 0) stats[idx] = { ...stats[idx], lessonsCompleted: stats[idx].lessonsCompleted + 1 };
    else stats.push({ date: t, cardsReviewed: 0, lessonsCompleted: 1 });
  }
  set({ listeningProgress: next, dailyStats: stats, lastActiveDate: lastActive, streak: nextStreak });
},

recordWritingComplete: (promptId: string, score: number, total: number) => {
  const { writingProgress, dailyStats, lastActiveDate, streak } = get();
  const completed = score >= total * 0.7;
  const prev = writingProgress[promptId];
  const newlyCompleted = completed && !prev?.completed;
  const next: WritingProgress = {
    ...writingProgress,
    [promptId]: { completed, score, total, lastAttempt: new Date().toISOString() },
  };
  const { lastActive, streak: nextStreak } = bumpStreak(lastActiveDate, streak);
  const t = todayISO();
  const stats: DailyStats[] = [...dailyStats];
  if (newlyCompleted) {
    const idx = stats.findIndex((d) => d.date === t);
    if (idx >= 0) stats[idx] = { ...stats[idx], lessonsCompleted: stats[idx].lessonsCompleted + 1 };
    else stats.push({ date: t, cardsReviewed: 0, lessonsCompleted: 1 });
  }
  set({ writingProgress: next, dailyStats: stats, lastActiveDate: lastActive, streak: nextStreak });
},

recordSpeakingComplete: (drillId: string, score: number, total: number) => {
  const { speakingProgress, dailyStats, lastActiveDate, streak } = get();
  const completed = score >= total * 0.7;
  const prev = speakingProgress[drillId];
  const newlyCompleted = completed && !prev?.completed;
  const next: SpeakingProgress = {
    ...speakingProgress,
    [drillId]: { completed, score, total, lastAttempt: new Date().toISOString() },
  };
  const { lastActive, streak: nextStreak } = bumpStreak(lastActiveDate, streak);
  const t = todayISO();
  const stats: DailyStats[] = [...dailyStats];
  if (newlyCompleted) {
    const idx = stats.findIndex((d) => d.date === t);
    if (idx >= 0) stats[idx] = { ...stats[idx], lessonsCompleted: stats[idx].lessonsCompleted + 1 };
    else stats.push({ date: t, cardsReviewed: 0, lessonsCompleted: 1 });
  }
  set({ speakingProgress: next, dailyStats: stats, lastActiveDate: lastActive, streak: nextStreak });
},
```

Extend `importState`:

```ts
importState: (data: Partial<AppState>) => {
  const cur = get();
  set({
    vocabProgress: data.vocabProgress ?? cur.vocabProgress,
    grammarProgress: data.grammarProgress ?? cur.grammarProgress,
    readingProgress: data.readingProgress ?? cur.readingProgress,
    conversationProgress: data.conversationProgress ?? cur.conversationProgress,
    listeningProgress: data.listeningProgress ?? cur.listeningProgress,
    writingProgress: data.writingProgress ?? cur.writingProgress,
    speakingProgress: data.speakingProgress ?? cur.speakingProgress,
    dailyStats: data.dailyStats ?? cur.dailyStats,
    settings: { ...defaultSettings, ...cur.settings, ...data.settings },
    lastActiveDate: data.lastActiveDate ?? cur.lastActiveDate,
    streak: data.streak ?? cur.streak,
  });
},
```

Extend `resetProgress`:

```ts
resetProgress: () => {
  set({
    vocabProgress: {},
    grammarProgress: {},
    readingProgress: {},
    conversationProgress: {},
    listeningProgress: {},
    writingProgress: {},
    speakingProgress: {},
    dailyStats: [],
    streak: 0,
    lastActiveDate: todayISO(),
  });
},
```

Bump `version` to `2` and extend `migrate` and `partialize`:

```ts
{
  name: "german-tutor-storage",
  version: 2,
  migrate: (persisted: unknown, version: number) => {
    const state = (persisted as Partial<AppState>) ?? {};
    const migrated: AppState = {
      vocabProgress: state.vocabProgress ?? {},
      grammarProgress: state.grammarProgress ?? {},
      readingProgress: state.readingProgress ?? {},
      conversationProgress: state.conversationProgress ?? {},
      listeningProgress: state.listeningProgress ?? {},
      writingProgress: state.writingProgress ?? {},
      speakingProgress: state.speakingProgress ?? {},
      dailyStats: state.dailyStats ?? [],
      settings: { ...defaultSettings, ...state.settings },
      lastActiveDate: state.lastActiveDate ?? todayISO(),
      streak: state.streak ?? 0,
    };
    if (!Number.isFinite(migrated.settings.audioRate)) {
      migrated.settings.audioRate = 0.9;
    }
    return migrated;
  },
  partialize: (state) => ({
    vocabProgress: state.vocabProgress,
    grammarProgress: state.grammarProgress,
    readingProgress: state.readingProgress,
    conversationProgress: state.conversationProgress,
    listeningProgress: state.listeningProgress,
    writingProgress: state.writingProgress,
    speakingProgress: state.speakingProgress,
    dailyStats: state.dailyStats,
    settings: state.settings,
    lastActiveDate: state.lastActiveDate,
    streak: state.streak,
  }),
}
```

- [ ] **Step 6: Run all store tests, expect pass**

Run: `npx vitest run src/lib/store.*.test.ts`
Expected: all PASS, including the existing `store.reading.test.ts` and `store.conversation.test.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/store.ts src/lib/store.listening.test.ts src/lib/store.writing.test.ts src/lib/store.speaking.test.ts src/lib/types.ts
git commit -m "feat(store): add listening, writing, speaking progress + v2 migration"
```

### Task 0.4: Update levelAssessor for new signals and weights

**Files:**
- Modify: `src/lib/levelAssessor.ts`
- Modify: `src/lib/levelAssessor.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/lib/levelAssessor.test.ts`:

```ts
import { estimateLevel } from "./levelAssessor";
import type { ListeningProgress, WritingProgress, SpeakingProgress } from "./types";

describe("estimateLevel with new signals", () => {
  it("accepts listening, writing, speaking progress and computes a level", () => {
    const listening: ListeningProgress = { "passage:r1": { completed: true, score: 4, total: 4, lastAttempt: "" } };
    const writing: WritingProgress = { w1: { completed: true, score: 4, total: 4, lastAttempt: "" } };
    const speaking: SpeakingProgress = { s1: { completed: true, score: 4, total: 4, lastAttempt: "" } };
    const result = estimateLevel({}, {}, {}, {}, listening, writing, speaking, 0, 0, 0, 0, 1, 1, 1);
    expect(result.level).toBe("A1");
    expect(result.percentToNext).toBeGreaterThan(0);
  });

  it("returns A1 with no progress", () => {
    const result = estimateLevel({}, {}, {}, {}, {}, {}, {}, 0, 0, 0, 0, 0, 0, 0);
    expect(result.level).toBe("A1");
  });
});
```

- [ ] **Step 2: Run tests, expect failure**

Run: `npx vitest run src/lib/levelAssessor.test.ts`
Expected: FAIL (signature mismatch).

- [ ] **Step 3: Rewrite `src/lib/levelAssessor.ts`**

Replace file contents:

```ts
import type {
  CEFRLevel,
  ConversationProgress,
  GrammarProgress,
  ListeningProgress,
  ReadingProgress,
  SpeakingProgress,
  VocabProgress,
  WritingProgress,
} from "./types";
import { isDue } from "./srs";

export const LEVEL_ORDER: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

// Weights sum to 1.0
const WEIGHTS = {
  vocab: 0.30,
  grammar: 0.25,
  reading: 0.15,
  conversation: 0.10,
  listening: 0.08,
  writing: 0.08,
  speaking: 0.04,
};

export function estimateLevel(
  vocabProgress: VocabProgress,
  grammarProgress: GrammarProgress,
  readingProgress: ReadingProgress,
  conversationProgress: ConversationProgress,
  listeningProgress: ListeningProgress,
  writingProgress: WritingProgress,
  speakingProgress: SpeakingProgress,
  totalCards: number,
  totalLessons: number,
  totalPassages: number,
  totalConversations: number,
  totalListeningItems: number,
  totalWritingPrompts: number,
  totalSpeakingDrills: number,
): { level: CEFRLevel; percentToNext: number } {
  const masteredCards = Object.values(vocabProgress).filter(
    (s) => s.repetitions >= 2 && !isDue(s),
  ).length;
  const vocabScore = totalCards > 0 ? masteredCards / totalCards : 0;

  const completedLessons = Object.values(grammarProgress).filter((g) => g.completed).length;
  const grammarScore = totalLessons > 0 ? completedLessons / totalLessons : 0;

  const completedPassages = Object.values(readingProgress).filter((r) => r.completed).length;
  const readingScore = totalPassages > 0 ? completedPassages / totalPassages : 0;

  const completedConversations = Object.values(conversationProgress).filter((c) => c.completed).length;
  const conversationScore = totalConversations > 0 ? completedConversations / totalConversations : 0;

  const completedListening = Object.values(listeningProgress).filter((l) => l.completed).length;
  const listeningScore = totalListeningItems > 0 ? completedListening / totalListeningItems : 0;

  const completedWriting = Object.values(writingProgress).filter((w) => w.completed).length;
  const writingScore = totalWritingPrompts > 0 ? completedWriting / totalWritingPrompts : 0;

  const completedSpeaking = Object.values(speakingProgress).filter((s) => s.completed).length;
  const speakingScore = totalSpeakingDrills > 0 ? completedSpeaking / totalSpeakingDrills : 0;

  const combined =
    (vocabScore * WEIGHTS.vocab +
      grammarScore * WEIGHTS.grammar +
      readingScore * WEIGHTS.reading +
      conversationScore * WEIGHTS.conversation +
      listeningScore * WEIGHTS.listening +
      writingScore * WEIGHTS.writing +
      speakingScore * WEIGHTS.speaking) *
    100;

  let idx = 0;
  if (combined >= 85) idx = 5;
  else if (combined >= 70) idx = 4;
  else if (combined >= 55) idx = 3;
  else if (combined >= 40) idx = 2;
  else if (combined >= 20) idx = 1;

  const level = LEVEL_ORDER[idx];
  const nextThreshold = idx < 5 ? [20, 40, 55, 70, 85, 100][idx] : 100;
  const prevThreshold = idx > 0 ? [0, 20, 40, 55, 70, 85][idx] : 0;
  const percentToNext =
    idx >= 5
      ? 100
      : Math.min(
          100,
          ((combined - prevThreshold) / (nextThreshold - prevThreshold)) * 100,
        );

  return { level, percentToNext: Number.isFinite(percentToNext) ? percentToNext : 0 };
}

export function levelProgressForAll(
  currentLevel: CEFRLevel,
  vocabProgress: VocabProgress,
  grammarProgress: GrammarProgress,
  readingProgress: ReadingProgress,
  conversationProgress: ConversationProgress,
  listeningProgress: ListeningProgress,
  writingProgress: WritingProgress,
  speakingProgress: SpeakingProgress,
  totalCards: number,
  totalLessons: number,
  totalPassages: number,
  totalConversations: number,
  totalListeningItems: number,
  totalWritingPrompts: number,
  totalSpeakingDrills: number,
): Record<CEFRLevel, number> {
  const { percentToNext } = estimateLevel(
    vocabProgress,
    grammarProgress,
    readingProgress,
    conversationProgress,
    listeningProgress,
    writingProgress,
    speakingProgress,
    totalCards,
    totalLessons,
    totalPassages,
    totalConversations,
    totalListeningItems,
    totalWritingPrompts,
    totalSpeakingDrills,
  );
  const idx = LEVEL_ORDER.indexOf(currentLevel);
  const out = {} as Record<CEFRLevel, number>;
  LEVEL_ORDER.forEach((l, i) => {
    if (i < idx) out[l] = 100;
    else if (i === idx) out[l] = Math.min(100, percentToNext);
    else out[l] = 0;
  });
  return out;
}
```

- [ ] **Step 4: Run tests, expect pass**

Run: `npx vitest run src/lib/levelAssessor.test.ts`
Expected: all PASS, including any pre-existing tests (older signature tests must be updated to the new signature — append `{}, {}, {}, 0, 0, 0` to existing calls; subagent must check the existing file and update those tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/levelAssessor.ts src/lib/levelAssessor.test.ts
git commit -m "feat(levelAssessor): include listening/writing/speaking with new weights"
```

### Task 0.5: Update call sites of estimateLevel / levelProgressForAll

**Files (search-and-update):**
- `src/components/home/HomeDashboard.tsx`
- Any file under `src/components/progress/` that imports these.

- [ ] **Step 1: Find all call sites**

Run: `grep -rn "estimateLevel\|levelProgressForAll" src/ --include="*.tsx" --include="*.ts"`
Expected: home dashboard + progress components + the level assessor itself + its test.

- [ ] **Step 2: Update each call site**

Each component must:
1. Select the three new progress slices from the store: `useAppStore((s) => s.listeningProgress)` etc.
2. Compute totals: `totalListeningItems = readingPassages.length + conversationLessons.length`, `totalWritingPrompts = writingPrompts.length` (import the new collection — Task 2.3 creates this; for now import the empty stub if needed), `totalSpeakingDrills = speakingDrills.length` (Task 2.5).

For HomeDashboard, the new signature call looks like:

```ts
const { level } = estimateLevel(
  vocabProgress,
  grammarProgress,
  readingProgress,
  conversationProgress,
  listeningProgress,
  writingProgress,
  speakingProgress,
  totalCards,
  grammarLessons.length,
  readingPassages.length,
  conversationLessons.length,
  readingPassages.length + conversationLessons.length,
  writingPrompts.length,
  speakingDrills.length,
);
```

**Important:** `writingPrompts` and `speakingDrills` are exported from `src/content/catalog.ts` after Tasks 2.3 and 2.5. To unblock this task, add stub exports now: in `src/content/catalog.ts`, append at the end:

```ts
import type { WritingPrompt, SpeakingDrill } from "@/lib/types";
export const writingPrompts: WritingPrompt[] = [];
export const speakingDrills: SpeakingDrill[] = [];
```

These will be replaced when Tasks 2.3 and 2.5 land.

- [ ] **Step 3: Run typecheck + tests + build**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: thread new progress signals through call sites"
```

---

## Phase 1 — Content expansion (PARALLELIZABLE)

After Phase 0, these tasks can fan out to many subagents simultaneously. Each task is self-contained: it edits a single content file and runs a single test command.

**Quality bar applied to ALL content tasks** (every subagent must follow):

- Use natural, idiomatic, native-grade German.
- Stay strictly within the level's grammatical and vocabulary range (refer to existing examples in the same file for calibration).
- Use realistic situations and topics. Avoid generic "language textbook" awkwardness.
- Tooltip glosses (`tooltips: Record<string, string>`) cover 8–15 words per passage; map the German word/phrase to a short English gloss.
- Exercises: 4–6 per item. Mix of `multipleChoice` and `fillBlank`. Every exercise needs `explanation`.
- IDs must be unique, kebab-case, and prefixed (`reading-`, `conversation-`).
- Read the existing entries before adding new ones to avoid topic/style collisions.

### Task 1.1: Add 6 new A1 reading passages

**Files:**
- Modify: `src/content/reading.ts`

- [ ] **Step 1: Read existing A1 passages**

Read `src/content/reading.ts` and inspect the existing A1 block to understand tone, exercise style, and tooltip patterns.

- [ ] **Step 2: Append 6 new A1 passages**

Add 6 new `ReadingPassage` entries in the A1 section. IDs must start with `reading-a1-`. Topics not yet covered (check existing entries first; pick 6 from): numbers/time, weather basics, body/health basics, transport, jobs, free-time/hobbies, home/rooms, food extended. Length 80–150 words.

- [ ] **Step 3: Run shape tests**

Run: `npx vitest run src/content/reading.test.ts`
Expected: PASS (existing schema tests still hold).

- [ ] **Step 4: Commit**

```bash
git add src/content/reading.ts
git commit -m "content: add 6 new A1 reading passages"
```

### Task 1.2: Add 6 new A2 reading passages

Same shape as Task 1.1 but for A2. Topics: clothing, technology basics, friendships, school subjects, city life, environment intro, festivals. Length 120–200 words.

Commit message: `content: add 6 new A2 reading passages`

### Task 1.3: Add 6 new B1 reading passages

Same shape. Topics: career, social media, sustainability, history, music/arts, travel stories, opinions. Length 180–280 words.

Commit message: `content: add 6 new B1 reading passages`

### Task 1.4: Add 6 new B2 reading passages

Same shape. Topics: politics & society, ethics, economics, technology debates, climate, education, identity. Length 220–350 words.

Commit message: `content: add 6 new B2 reading passages`

### Task 1.5: Add 6 new C1 reading passages

Same shape. Topics: academic discourse, philosophy, journalism, literature, specialised vocabulary. Length 250–400 words.

Commit message: `content: add 6 new C1 reading passages`

### Task 1.6: Add 6 new C2 reading passages

Same shape. Topics: register-shifts, idiomatic/figurative usage, cultural & literary criticism, rhetorical analysis. Length 300–450 words.

Commit message: `content: add 6 new C2 reading passages`

### Task 1.7: Add 4 new A1 conversations

**Files:**
- Modify: `src/content/conversations.ts`

- [ ] **Step 1: Read existing A1 conversations**

Inspect the existing A1 block of `src/content/conversations.ts`.

- [ ] **Step 2: Append 4 new A1 conversations**

Add 4 `ConversationLesson` entries with IDs prefixed `conversation-a1-`. Situations not yet covered: meeting someone, ordering at a bakery, asking for directions, buying a train ticket, at the doctor's, on the phone. Each conversation has 8–14 lines, 4–6 phrases, 4–6 exercises.

- [ ] **Step 3: Run shape tests**

Run: `npx vitest run src/content/conversations.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/content/conversations.ts
git commit -m "content: add 4 new A1 conversations"
```

### Tasks 1.8–1.12: Add 4 new conversations per remaining level

Same shape as Task 1.7 for A2, B1, B2, C1, C2. Each level: 4 new conversations.

Situations grow in sophistication: A2 (everyday transactions), B1 (negotiation, casual discussion), B2 (interviews, debates), C1 (formal meetings, abstract debates), C2 (nuanced register, rhetorical situations).

One commit per task: `content: add 4 new <LEVEL> conversations`.

### Task 1.13: Add new vocabulary decks (one per CEFR level)

**Files:**
- Create: `src/content/vocabulary/a1-time.json`
- Create: `src/content/vocabulary/a2-clothes.json`
- Create: `src/content/vocabulary/b1-career.json`
- Create: `src/content/vocabulary/b2-debate.json`
- Create: `src/content/vocabulary/c1-rhetoric.json`
- Create: `src/content/vocabulary/c2-literary.json`
- Modify: `src/content/catalog.ts`

- [ ] **Step 1: Inspect deck shape**

Read one existing deck (e.g. `src/content/vocabulary/a1-greetings.json`) to mirror the JSON shape exactly.

- [ ] **Step 2: Author each new deck**

Each deck has ~60 cards. Card fields: `id` (kebab-case, deck-prefixed), `german`, `english`, `gender` (`"masculine" | "feminine" | "neuter" | "plural" | null`), `example` (a short German sentence using the word), `exampleEn`, `level`, `topic`.

Topics:
- A1 time: days, months, time-of-day, telling time, clock numbers.
- A2 clothes: clothing items, materials, sizes, weather-appropriate clothing.
- B1 career: workplace, applications, interviews, colleagues, salary, work-life.
- B2 debate: argument vocabulary, agreement/disagreement, hedging, opinion expressions.
- C1 rhetoric: figures of speech, persuasion, formal register, abstract nouns.
- C2 literary: literary terms, narrative technique, criticism vocabulary.

- [ ] **Step 3: Register in catalog**

In `src/content/catalog.ts`:

```ts
// New decks
import deckA1Time from "./vocabulary/a1-time.json";
import deckA2Clothes from "./vocabulary/a2-clothes.json";
import deckB1Career from "./vocabulary/b1-career.json";
import deckB2Debate from "./vocabulary/b2-debate.json";
import deckC1Rhetoric from "./vocabulary/c1-rhetoric.json";
import deckC2Literary from "./vocabulary/c2-literary.json";
```

Then add each to the `vocabDecks` array in the matching level group.

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/vocabulary/ src/content/catalog.ts
git commit -m "content: add 6 new vocabulary decks (one per CEFR level)"
```

### Task 1.14: Add new grammar lessons to fill gaps

**Files:**
- Create JSON files under `src/content/grammar/`
- Modify: `src/content/catalog.ts`

- [ ] **Step 1: Inspect lesson shape**

Read one existing lesson (e.g. `src/content/grammar/a1-articles.json`) to mirror JSON shape: `id`, `title`, `level`, `summary`, `sections[]` (each with `heading`, `body[]`, optional `examples[]`, optional `table`), `exercises[]`.

- [ ] **Step 2: Identify gaps**

Current per-level counts: A1=6, A2=4, B1=4, B2=3, C1=2, C2=1. Target min 5 per level. Gaps:
- A2: +1 → add `a2-trennbare-verben.json` (separable verbs).
- B1: +1 → add `b1-genitiv.json` (genitive case).
- B2: +2 → add `b2-passive-zustand.json` (Vorgangspassiv vs. Zustandspassiv) and `b2-nominalstil.json` (nominal style).
- C1: +3 → add `c1-funktionsverbgefuege.json`, `c1-partizipialkonstruktionen.json`, `c1-konjunktiv-perfekt.json`.
- C2: +4 → add `c2-stilebenen.json`, `c2-idiome.json`, `c2-modalpartikeln.json`, `c2-rhetorische-figuren.json`.

Authors may merge topics if the gap is smaller than expected after inspection; minimum requirement is each level has ≥ 5 lessons.

- [ ] **Step 3: Author each lesson**

Each lesson must have:
- 3–5 sections with clear bilingual examples.
- 4–8 exercises (mix of `fillBlank`, `multipleChoice`, `wordOrder`).
- An optional declension table where appropriate.

- [ ] **Step 4: Register in catalog**

Add imports and array entries for every new lesson in the matching level group of `grammarLessons`.

- [ ] **Step 5: Run tests + lint**

Run: `npx vitest run && npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/content/grammar/ src/content/catalog.ts
git commit -m "content: add grammar lessons so every level has ≥ 5"
```

### Task 1.15: Strengthen content shape tests

**Files:**
- Modify: `src/content/reading.test.ts`
- Modify: `src/content/conversations.test.ts`

- [ ] **Step 1: Add per-level count assertions**

In each test file, add a test:

```ts
import { readingPassages } from "./reading";
import type { CEFRLevel } from "@/lib/types";

const LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

it("has at least 8 passages per level", () => {
  for (const lvl of LEVELS) {
    const count = readingPassages.filter((p) => p.level === lvl).length;
    expect(count, `level ${lvl}`).toBeGreaterThanOrEqual(8);
  }
});
```

Analogous for conversations (target ≥ 6 per level).

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/content/reading.test.ts src/content/conversations.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/content/reading.test.ts src/content/conversations.test.ts
git commit -m "test(content): assert per-level counts"
```

---

## Phase 2 — Skill modes (PARALLELIZABLE after Phase 0)

Each skill mode is a self-contained slice: route + components + (for Writing/Speaking) content.

### Task 2.1: Listening list page + cards

**Files:**
- Create: `src/app/listening/page.tsx`
- Create: `src/components/listening/ListeningList.tsx`
- Create: `src/components/listening/ListeningCard.tsx`

- [ ] **Step 1: Implement `ListeningCard.tsx`**

```tsx
"use client";

import Link from "next/link";
import { LevelBadge } from "@/components/progress/LevelBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Headphones, Check } from "lucide-react";
import type { CEFRLevel } from "@/lib/types";

export interface ListeningCardProps {
  href: string;
  title: string;
  level: CEFRLevel;
  topic: string;
  completed: boolean;
}

export function ListeningCard({ href, title, level, topic, completed }: ListeningCardProps) {
  return (
    <Link href={href} className="block">
      <Card className="transition-colors hover:bg-accent/30">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <LevelBadge level={level} />
            {completed && <Check className="size-4 text-emerald-500" aria-label="Completed" />}
          </div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Headphones className="size-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{topic}</CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 2: Implement `ListeningList.tsx`**

```tsx
"use client";

import { useAppStore } from "@/lib/store";
import { readingPassages, conversationLessons } from "@/content/catalog";
import { LEVEL_ORDER } from "@/lib/levelAssessor";
import { ListeningCard } from "./ListeningCard";

export function ListeningList() {
  const listeningProgress = useAppStore((s) => s.listeningProgress);

  const items = [
    ...readingPassages.map((p) => ({
      key: `passage:${p.id}`,
      href: `/listening/passage-${p.id}`,
      title: p.title,
      level: p.level,
      topic: p.topic,
    })),
    ...conversationLessons.map((c) => ({
      key: `conversation:${c.id}`,
      href: `/listening/conversation-${c.id}`,
      title: c.title,
      level: c.level,
      topic: c.situation,
    })),
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Listening</h1>
        <p className="text-muted-foreground">
          Listen to passages and conversations. Audio plays with the text hidden — reveal it after you've tried to follow along.
        </p>
      </div>
      {LEVEL_ORDER.map((lvl) => {
        const group = items.filter((i) => i.level === lvl);
        if (group.length === 0) return null;
        return (
          <section key={lvl} className="space-y-3">
            <h2 className="text-xl font-semibold">{lvl}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((i) => (
                <ListeningCard
                  key={i.key}
                  href={i.href}
                  title={i.title}
                  level={i.level}
                  topic={i.topic}
                  completed={listeningProgress[i.key]?.completed ?? false}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Implement `src/app/listening/page.tsx`**

```tsx
import { ListeningList } from "@/components/listening/ListeningList";

export default function ListeningPage() {
  return <ListeningList />;
}
```

- [ ] **Step 4: Run typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/listening/page.tsx src/components/listening/
git commit -m "feat(listening): list page with per-level cards"
```

### Task 2.2: Listening detail page + player

**Files:**
- Create: `src/app/listening/[id]/page.tsx`
- Create: `src/components/listening/ListeningView.tsx`

URL format: `/listening/passage-<passageId>` or `/listening/conversation-<conversationId>`. The dynamic `[id]` segment is parsed: split on the first dash, prefix decides which collection.

- [ ] **Step 1: Implement `ListeningView.tsx`**

```tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { useAudio } from "@/lib/useAudio";
import { LevelBadge } from "@/components/progress/LevelBadge";
import { Button } from "@/components/ui/button";
import { FillBlank } from "@/components/grammar/FillBlank";
import { MultipleChoice } from "@/components/grammar/MultipleChoice";
import { Play, Square } from "lucide-react";
import type { ReadingPassage, ConversationLesson } from "@/lib/types";

interface Props {
  itemKey: string;
  title: string;
  level: ReadingPassage["level"];
  topic: string;
  audioText: string;       // what TTS should read
  germanText: React.ReactNode; // revealed German text
  englishText: string;
  exercises: ReadingPassage["exercises"] | ConversationLesson["exercises"];
  backHref: string;
}

export function ListeningView({ itemKey, title, level, topic, audioText, germanText, englishText, exercises, backHref }: Props) {
  const router = useRouter();
  const recordListeningComplete = useAppStore((s) => s.recordListeningComplete);
  const { speak, stop } = useAudio();
  const [playing, setPlaying] = useState(false);
  const [showText, setShowText] = useState(false);
  const [showEn, setShowEn] = useState(false);
  const [scores, setScores] = useState<Record<string, boolean>>({});

  const onPlay = useCallback(() => {
    speak(audioText);
    setPlaying(true);
    // SpeechSynthesisUtterance doesn't easily emit end; just toggle on button press.
  }, [speak, audioText]);

  const onStop = useCallback(() => {
    stop();
    setPlaying(false);
  }, [stop]);

  const onResult = useCallback((id: string, correct: boolean) => {
    setScores((s) => ({ ...s, [id]: correct }));
  }, []);

  const answered = Object.keys(scores).length;
  const correct = Object.values(scores).filter(Boolean).length;
  const allDone = answered === exercises.length;

  const handleSave = () => {
    recordListeningComplete(itemKey, correct, exercises.length);
    router.push(backHref);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <LevelBadge level={level} />
          <span className="text-sm text-muted-foreground">{topic}</span>
        </div>
        <h1 className="text-2xl font-semibold">{title}</h1>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {!playing ? (
            <Button onClick={onPlay}><Play className="mr-2 size-4" />Play</Button>
          ) : (
            <Button variant="secondary" onClick={onStop}><Square className="mr-2 size-4" />Stop</Button>
          )}
          <Button variant="outline" onClick={onPlay}>Repeat</Button>
          <Button variant="ghost" onClick={() => setShowText((v) => !v)}>
            {showText ? "Hide text" : "Show text"}
          </Button>
          <Button variant="ghost" onClick={() => setShowEn((v) => !v)}>
            {showEn ? "Hide translation" : "Show translation"}
          </Button>
        </div>
        {showText && <div className="text-base leading-7 text-foreground">{germanText}</div>}
        {showEn && <p className="text-sm italic text-muted-foreground">{englishText}</p>}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Exercises</h2>
        {exercises.map((ex) => {
          if (ex.type === "multipleChoice") {
            return <MultipleChoice key={ex.id} exercise={ex} onResult={(c) => onResult(ex.id, c)} />;
          }
          return <FillBlank key={ex.id} exercise={ex} onResult={(c) => onResult(ex.id, c)} />;
        })}
      </div>

      {allDone && (
        <div className="rounded-xl border border-border bg-muted/50 p-6 text-center space-y-3">
          <p className="text-lg font-semibold">
            Score: {correct}/{exercises.length}
          </p>
          <Button onClick={handleSave}>Save & Back to Listening</Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Implement `src/app/listening/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { getPassageById, getConversationById } from "@/content/catalog";
import { ListeningView } from "@/components/listening/ListeningView";

export default async function ListeningDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // id is "passage-<passageId>" or "conversation-<conversationId>"
  if (id.startsWith("passage-")) {
    const passageId = id.slice("passage-".length);
    const passage = getPassageById(passageId);
    if (!passage) notFound();
    return (
      <ListeningView
        itemKey={`passage:${passage.id}`}
        title={passage.title}
        level={passage.level}
        topic={passage.topic}
        audioText={passage.text}
        germanText={<p className="leading-8">{passage.text}</p>}
        englishText={passage.textEn}
        exercises={passage.exercises}
        backHref="/listening"
      />
    );
  }

  if (id.startsWith("conversation-")) {
    const conversationId = id.slice("conversation-".length);
    const conv = getConversationById(conversationId);
    if (!conv) notFound();
    const audioText = conv.dialogue.map((d) => `${d.name}: ${d.line}`).join(". ");
    const germanText = (
      <div className="space-y-2">
        {conv.dialogue.map((d, i) => (
          <p key={i} className="leading-7">
            <span className="font-semibold">{d.name}:</span> {d.line}
          </p>
        ))}
      </div>
    );
    const englishText = conv.dialogue.map((d) => `${d.name}: ${d.lineEn}`).join("\n");
    return (
      <ListeningView
        itemKey={`conversation:${conv.id}`}
        title={conv.title}
        level={conv.level}
        topic={conv.situation}
        audioText={audioText}
        germanText={germanText}
        englishText={englishText}
        exercises={conv.exercises}
        backHref="/listening"
      />
    );
  }

  notFound();
}
```

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: PASS, with `/listening` and `/listening/[id]` showing as routes.

- [ ] **Step 4: Commit**

```bash
git add src/app/listening/[id]/page.tsx src/components/listening/ListeningView.tsx
git commit -m "feat(listening): detail page with audio-first player"
```

### Task 2.3: Writing content data + content shape test

**Files:**
- Create: `src/content/writing.ts`
- Create: `src/content/writing.test.ts`
- Modify: `src/content/catalog.ts`

- [ ] **Step 1: Author writing prompts**

In `src/content/writing.ts`, export `writingPrompts: WritingPrompt[]` with 6–10 prompts per CEFR level. Each prompt has 3–5 exercises of mixed type.

Examples of prompt themes:
- A1: self-introductions, family, food, daily routine, time.
- A2: weekend plans, weather, shopping list, expressing simple opinions.
- B1: arguing pros/cons, describing experiences, applying for something.
- B2: structured opinion essays, news commentary.
- C1: abstract reasoning, formal correspondence.
- C2: nuanced argumentation, literary response.

Each `translate` exercise must have ≥ 2 `acceptedAnswers` (variants in word order or vocabulary). Each `completion` exercise's `template` uses `___` for each blank. Compositions have a clear `modelAnswer`.

- [ ] **Step 2: Write content shape test**

Create `src/content/writing.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { writingPrompts } from "./writing";
import type { CEFRLevel } from "@/lib/types";

const LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

describe("writing prompts", () => {
  it("has unique ids", () => {
    const ids = writingPrompts.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("has at least 6 prompts per level", () => {
    for (const lvl of LEVELS) {
      const count = writingPrompts.filter((p) => p.level === lvl).length;
      expect(count, `level ${lvl}`).toBeGreaterThanOrEqual(6);
    }
  });
  it("every exercise has a valid type", () => {
    for (const p of writingPrompts) {
      for (const ex of p.exercises) {
        expect(["translate", "completion", "composition"]).toContain(ex.type);
      }
    }
  });
});
```

- [ ] **Step 3: Wire into catalog**

Replace the stub from Task 0.5 in `src/content/catalog.ts`:

```ts
import { writingPrompts as _writingPrompts } from "./writing";
export const writingPrompts: WritingPrompt[] = _writingPrompts;

export function getWritingPromptById(id: string): WritingPrompt | undefined {
  return writingPrompts.find((p) => p.id === id);
}
```

(Remove the `export const writingPrompts: WritingPrompt[] = [];` stub line.)

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/content/writing.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/writing.ts src/content/writing.test.ts src/content/catalog.ts
git commit -m "content(writing): add prompts across CEFR levels"
```

### Task 2.4: Writing list page + detail page + per-type runners

**Files:**
- Create: `src/app/writing/page.tsx`
- Create: `src/app/writing/[id]/page.tsx`
- Create: `src/components/writing/WritingList.tsx`
- Create: `src/components/writing/WritingView.tsx`
- Create: `src/components/writing/TranslateRunner.tsx`
- Create: `src/components/writing/CompletionRunner.tsx`
- Create: `src/components/writing/CompositionRunner.tsx`

- [ ] **Step 1: Implement `TranslateRunner.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { normalize } from "@/lib/strings";
import type { WritingTranslate } from "@/lib/types";

export function TranslateRunner({ exercise, onResult }: { exercise: WritingTranslate; onResult: (correct: boolean) => void }) {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);

  const handleSubmit = () => {
    const n = normalize(input);
    const ok = exercise.acceptedAnswers.some((a) => normalize(a) === n);
    setCorrect(ok);
    setSubmitted(true);
    onResult(ok);
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <p className="font-medium">Translate: <span className="italic">{exercise.promptEn}</span></p>
      {exercise.hintWords && (
        <p className="text-xs text-muted-foreground">Useful words: {exercise.hintWords.join(", ")}</p>
      )}
      <textarea
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        rows={2}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={submitted}
        placeholder="Your German translation…"
      />
      {!submitted ? (
        <Button onClick={handleSubmit} disabled={!input.trim()}>Check</Button>
      ) : (
        <div className={`rounded-md p-3 text-sm ${correct ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-destructive/10 text-destructive"}`}>
          <p className="font-medium">{correct ? "Richtig!" : "Try again next time."}</p>
          <p className="mt-1">Accepted: <span className="italic">{exercise.acceptedAnswers[0]}</span></p>
          {exercise.explanation && <p className="mt-1 text-muted-foreground">{exercise.explanation}</p>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Implement `CompletionRunner.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { normalize } from "@/lib/strings";
import type { WritingCompletion } from "@/lib/types";

export function CompletionRunner({ exercise, onResult }: { exercise: WritingCompletion; onResult: (correct: boolean) => void }) {
  const blankCount = exercise.blanks.length;
  const [values, setValues] = useState<string[]>(() => Array(blankCount).fill(""));
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);

  const handleSubmit = () => {
    const r = values.map((v, i) => {
      const n = normalize(v);
      return exercise.blanks[i].acceptedAnswers.some((a) => normalize(a) === n);
    });
    setResults(r);
    setSubmitted(true);
    onResult(r.every(Boolean));
  };

  // Render template with inline inputs in place of ___ markers.
  const segments = exercise.template.split("___");
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <p className="font-medium leading-7">
        {segments.map((seg, i) => (
          <span key={i}>
            {seg}
            {i < blankCount && (
              <input
                className={`mx-1 inline-block w-32 rounded-md border border-input bg-background px-2 py-1 text-sm ${submitted ? (results[i] ? "border-emerald-500" : "border-destructive") : ""}`}
                value={values[i]}
                onChange={(e) => setValues((v) => { const x = [...v]; x[i] = e.target.value; return x; })}
                disabled={submitted}
              />
            )}
          </span>
        ))}
      </p>
      {!submitted ? (
        <Button onClick={handleSubmit} disabled={values.some((v) => !v.trim())}>Check</Button>
      ) : (
        <div className="text-sm text-muted-foreground space-y-1">
          {exercise.blanks.map((b, i) => (
            <p key={i}>Blank {i + 1}: <span className="italic">{b.acceptedAnswers[0]}</span></p>
          ))}
          {exercise.explanation && <p>{exercise.explanation}</p>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Implement `CompositionRunner.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { WritingComposition } from "@/lib/types";

export function CompositionRunner({ exercise, onResult }: { exercise: WritingComposition; onResult: (correct: boolean) => void }) {
  const [input, setInput] = useState("");
  const [showModel, setShowModel] = useState(false);
  const [done, setDone] = useState(false);

  const handleDone = () => {
    setDone(true);
    onResult(true);
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <p className="font-medium">{exercise.promptEn}</p>
      {exercise.minSentences && (
        <p className="text-xs text-muted-foreground">Aim for ≥ {exercise.minSentences} sentences.</p>
      )}
      <textarea
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        rows={5}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={done}
        placeholder="Schreibe deine Antwort hier…"
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setShowModel((v) => !v)}>
          {showModel ? "Hide model answer" : "Show model answer"}
        </Button>
        {!done ? (
          <Button onClick={handleDone} disabled={!input.trim()}>I'm satisfied with my answer</Button>
        ) : (
          <span className="self-center text-sm text-emerald-600 dark:text-emerald-400">Marked complete</span>
        )}
      </div>
      {showModel && (
        <div className="rounded-md bg-muted/50 p-3 text-sm">
          <p className="font-medium">Model answer:</p>
          <p className="whitespace-pre-line italic">{exercise.modelAnswer}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Implement `WritingView.tsx`**

```tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { LevelBadge } from "@/components/progress/LevelBadge";
import { Button } from "@/components/ui/button";
import { TranslateRunner } from "./TranslateRunner";
import { CompletionRunner } from "./CompletionRunner";
import { CompositionRunner } from "./CompositionRunner";
import type { WritingPrompt } from "@/lib/types";

export function WritingView({ prompt }: { prompt: WritingPrompt }) {
  const router = useRouter();
  const recordWritingComplete = useAppStore((s) => s.recordWritingComplete);
  const [scores, setScores] = useState<Record<string, boolean>>({});

  const onResult = useCallback((id: string, correct: boolean) => {
    setScores((s) => ({ ...s, [id]: correct }));
  }, []);

  const answered = Object.keys(scores).length;
  const correct = Object.values(scores).filter(Boolean).length;
  const allDone = answered === prompt.exercises.length;

  const handleSave = () => {
    recordWritingComplete(prompt.id, correct, prompt.exercises.length);
    router.push("/writing");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <LevelBadge level={prompt.level} />
          <span className="text-sm text-muted-foreground">{prompt.topic}</span>
        </div>
        <h1 className="text-2xl font-semibold">{prompt.title}</h1>
      </div>

      <div className="space-y-4">
        {prompt.exercises.map((ex) => {
          if (ex.type === "translate") return <TranslateRunner key={ex.id} exercise={ex} onResult={(c) => onResult(ex.id, c)} />;
          if (ex.type === "completion") return <CompletionRunner key={ex.id} exercise={ex} onResult={(c) => onResult(ex.id, c)} />;
          return <CompositionRunner key={ex.id} exercise={ex} onResult={(c) => onResult(ex.id, c)} />;
        })}
      </div>

      {allDone && (
        <div className="rounded-xl border border-border bg-muted/50 p-6 text-center space-y-3">
          <p className="text-lg font-semibold">
            Score: {correct}/{prompt.exercises.length}
          </p>
          <Button onClick={handleSave}>Save & Back to Writing</Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Implement `WritingList.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { writingPrompts } from "@/content/catalog";
import { LEVEL_ORDER } from "@/lib/levelAssessor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LevelBadge } from "@/components/progress/LevelBadge";
import { PenLine, Check } from "lucide-react";

export function WritingList() {
  const writingProgress = useAppStore((s) => s.writingProgress);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Writing</h1>
        <p className="text-muted-foreground">Translate, complete, and compose short German texts.</p>
      </div>
      {LEVEL_ORDER.map((lvl) => {
        const group = writingPrompts.filter((p) => p.level === lvl);
        if (group.length === 0) return null;
        return (
          <section key={lvl} className="space-y-3">
            <h2 className="text-xl font-semibold">{lvl}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((p) => (
                <Link key={p.id} href={`/writing/${p.id}`} className="block">
                  <Card className="transition-colors hover:bg-accent/30">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <LevelBadge level={p.level} />
                        {writingProgress[p.id]?.completed && (
                          <Check className="size-4 text-emerald-500" aria-label="Completed" />
                        )}
                      </div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <PenLine className="size-4" />
                        {p.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">{p.topic}</CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 6: Implement route files**

`src/app/writing/page.tsx`:

```tsx
import { WritingList } from "@/components/writing/WritingList";
export default function WritingPage() { return <WritingList />; }
```

`src/app/writing/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { getWritingPromptById } from "@/content/catalog";
import { WritingView } from "@/components/writing/WritingView";

export default async function WritingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prompt = getWritingPromptById(id);
  if (!prompt) notFound();
  return <WritingView prompt={prompt} />;
}
```

- [ ] **Step 7: Run typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/app/writing src/components/writing
git commit -m "feat(writing): list, detail, and per-type runners"
```

### Task 2.5: Speaking content data + content shape test

**Files:**
- Create: `src/content/speaking.ts`
- Create: `src/content/speaking.test.ts`
- Modify: `src/content/catalog.ts`

- [ ] **Step 1: Author speaking drills**

`src/content/speaking.ts` exports `speakingDrills: SpeakingDrill[]`. 4–6 drills per CEFR level. Each drill has 8–12 `SpeakingPhrase` entries.

Drill themes:
- A1: greetings, numbers, common requests, directions.
- A2: shopping, restaurant, scheduling.
- B1: opinions, storytelling, planning.
- B2: argument expressions, hedging, complaints.
- C1: formal register, presentations.
- C2: idiom-rich phrases, register-shifting.

- [ ] **Step 2: Write shape test**

```ts
import { describe, it, expect } from "vitest";
import { speakingDrills } from "./speaking";
import type { CEFRLevel } from "@/lib/types";

const LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

describe("speaking drills", () => {
  it("has unique drill ids", () => {
    const ids = speakingDrills.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("has at least 4 drills per level", () => {
    for (const lvl of LEVELS) {
      const count = speakingDrills.filter((d) => d.level === lvl).length;
      expect(count, `level ${lvl}`).toBeGreaterThanOrEqual(4);
    }
  });
  it("each drill has ≥ 6 phrases", () => {
    for (const d of speakingDrills) {
      expect(d.phrases.length, `drill ${d.id}`).toBeGreaterThanOrEqual(6);
    }
  });
});
```

- [ ] **Step 3: Wire into catalog**

Replace the stub from Task 0.5:

```ts
import { speakingDrills as _speakingDrills } from "./speaking";
export const speakingDrills: SpeakingDrill[] = _speakingDrills;

export function getSpeakingDrillById(id: string): SpeakingDrill | undefined {
  return speakingDrills.find((d) => d.id === id);
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/content/speaking.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/speaking.ts src/content/speaking.test.ts src/content/catalog.ts
git commit -m "content(speaking): add drills across CEFR levels"
```

### Task 2.6: Speaking list page + detail page + RecordButton

**Files:**
- Create: `src/app/speaking/page.tsx`
- Create: `src/app/speaking/[id]/page.tsx`
- Create: `src/components/speaking/SpeakingList.tsx`
- Create: `src/components/speaking/SpeakingDrillView.tsx`
- Create: `src/components/speaking/RecordButton.tsx`

- [ ] **Step 1: Implement `RecordButton.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";

type RecognitionState = "idle" | "listening" | "error" | "unsupported";

// Minimal typing for the Web Speech API (not in lib.dom by default).
interface SpeechRecognitionResultLike {
  transcript: string;
}
interface SpeechRecognitionAlternativeLike {
  [index: number]: SpeechRecognitionResultLike;
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  results: { [index: number]: SpeechRecognitionAlternativeLike; length: number };
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: { new (): SpeechRecognitionLike };
    webkitSpeechRecognition?: { new (): SpeechRecognitionLike };
  }
}

export interface RecordButtonProps {
  onTranscript: (transcript: string, isFinal: boolean) => void;
}

export function RecordButton({ onTranscript }: RecordButtonProps) {
  const [state, setState] = useState<RecognitionState>("idle");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const Ctor = typeof window !== "undefined" ? (window.SpeechRecognition ?? window.webkitSpeechRecognition) : undefined;
    if (!Ctor) {
      setState("unsupported");
      return;
    }
    const rec = new Ctor();
    rec.lang = "de-DE";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      const transcript = last[0].transcript;
      onTranscript(transcript, last.isFinal);
    };
    rec.onerror = () => setState("error");
    rec.onend = () => setState("idle");
    recognitionRef.current = rec;
    return () => {
      try { rec.stop(); } catch {}
    };
  }, [onTranscript]);

  const start = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setState("listening");
    } catch {
      setState("error");
    }
  };
  const stop = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
  };

  if (state === "unsupported") {
    return (
      <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        Your browser doesn't support speech recognition. You can still listen to the target phrase.
      </div>
    );
  }

  if (state === "listening") {
    return (
      <Button variant="destructive" onClick={stop}>
        <MicOff className="mr-2 size-4" /> Stop
      </Button>
    );
  }

  return (
    <Button variant="default" onClick={start}>
      <Mic className="mr-2 size-4" /> Record
    </Button>
  );
}
```

- [ ] **Step 2: Implement `SpeakingDrillView.tsx`**

```tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { useAudio } from "@/lib/useAudio";
import { similarity } from "@/lib/strings";
import { LevelBadge } from "@/components/progress/LevelBadge";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { RecordButton } from "./RecordButton";
import type { SpeakingDrill } from "@/lib/types";

const PASS = 0.85;
const RETRY = 0.6;

export function SpeakingDrillView({ drill }: { drill: SpeakingDrill }) {
  const router = useRouter();
  const recordSpeakingComplete = useAppStore((s) => s.recordSpeakingComplete);
  const { speak } = useAudio();

  const [idx, setIdx] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);

  const current = drill.phrases[idx];

  const handleTranscript = useCallback((t: string, isFinal: boolean) => {
    setTranscript(t);
    if (isFinal) {
      const s = similarity(t, current.german);
      setScore(s);
    }
  }, [current.german]);

  const next = () => {
    setResults((r) => [...r, (score ?? 0) >= PASS]);
    setIdx((i) => i + 1);
    setTranscript("");
    setScore(null);
  };

  const allDone = idx >= drill.phrases.length;

  if (allDone) {
    const correct = results.filter(Boolean).length;
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-8 text-center">
        <h1 className="text-2xl font-semibold">Drill complete</h1>
        <p className="text-lg">Score: {correct}/{drill.phrases.length}</p>
        <Button onClick={() => {
          recordSpeakingComplete(drill.id, correct, drill.phrases.length);
          router.push("/speaking");
        }}>Save & Back</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <LevelBadge level={drill.level} />
          <span className="text-sm text-muted-foreground">Phrase {idx + 1} of {drill.phrases.length}</span>
        </div>
        <h1 className="text-2xl font-semibold">{drill.title}</h1>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <p className="text-2xl font-medium">{current.german}</p>
        <p className="text-sm italic text-muted-foreground">{current.english}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => speak(current.german)}>
            <Play className="mr-2 size-4" /> Listen
          </Button>
          <RecordButton onTranscript={handleTranscript} />
        </div>
        {transcript && (
          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">You said</p>
            <p className="mt-1">{transcript}</p>
            {score !== null && (
              <p className={`mt-2 font-medium ${score >= PASS ? "text-emerald-600" : score >= RETRY ? "text-amber-600" : "text-destructive"}`}>
                Match: {Math.round(score * 100)}%
                {score >= PASS ? " — Sehr gut!" : score >= RETRY ? " — Almost, try again" : " — Try again"}
              </p>
            )}
          </div>
        )}
        <div className="flex justify-end">
          <Button variant="ghost" onClick={next}>Next phrase →</Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Implement `SpeakingList.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { speakingDrills } from "@/content/catalog";
import { LEVEL_ORDER } from "@/lib/levelAssessor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LevelBadge } from "@/components/progress/LevelBadge";
import { Mic, Check } from "lucide-react";

export function SpeakingList() {
  const speakingProgress = useAppStore((s) => s.speakingProgress);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Speaking</h1>
        <p className="text-muted-foreground">Pronunciation drills with browser speech recognition.</p>
      </div>
      {LEVEL_ORDER.map((lvl) => {
        const group = speakingDrills.filter((d) => d.level === lvl);
        if (group.length === 0) return null;
        return (
          <section key={lvl} className="space-y-3">
            <h2 className="text-xl font-semibold">{lvl}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((d) => (
                <Link key={d.id} href={`/speaking/${d.id}`} className="block">
                  <Card className="transition-colors hover:bg-accent/30">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <LevelBadge level={d.level} />
                        {speakingProgress[d.id]?.completed && (
                          <Check className="size-4 text-emerald-500" aria-label="Completed" />
                        )}
                      </div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Mic className="size-4" />
                        {d.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">{d.topic}</CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Implement route files**

`src/app/speaking/page.tsx`:

```tsx
import { SpeakingList } from "@/components/speaking/SpeakingList";
export default function SpeakingPage() { return <SpeakingList />; }
```

`src/app/speaking/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { getSpeakingDrillById } from "@/content/catalog";
import { SpeakingDrillView } from "@/components/speaking/SpeakingDrillView";

export default async function SpeakingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const drill = getSpeakingDrillById(id);
  if (!drill) notFound();
  return <SpeakingDrillView drill={drill} />;
}
```

- [ ] **Step 5: Run typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/speaking src/components/speaking
git commit -m "feat(speaking): list, drill view, and record button"
```

---

## Phase 3 — Integration

### Task 3.1: Update navigation (Sidebar + MobileNav)

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Extend `moreLinks` and icon imports**

In `src/components/layout/Sidebar.tsx`, update the icon imports and `moreLinks`:

```tsx
import { BookOpen, GraduationCap, Home, LineChart, BookMarked, MoreHorizontal, X, Headphones, PenLine, Mic } from "lucide-react";

const moreLinks = [
  { href: "/reading", label: "Reading", icon: BookMarked },
  { href: "/listening", label: "Listening", icon: Headphones },
  { href: "/writing", label: "Writing", icon: PenLine },
  { href: "/speaking", label: "Speaking", icon: Mic },
];
```

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat(nav): add Listening, Writing, Speaking entries"
```

### Task 3.2: Update HomeDashboard tiles

**Files:**
- Modify: `src/components/home/HomeDashboard.tsx`

- [ ] **Step 1: Add three new tile rows**

After the existing Vocabulary/Grammar tile row, insert:

```tsx
import { Headphones, PenLine, Mic } from "lucide-react";

// ...inside the dashboard JSX, after the existing Vocab+Grammar grid:

<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="flex items-center gap-2 text-base">
        <Headphones className="size-4" />
        Listening
      </CardTitle>
    </CardHeader>
    <CardContent className="text-sm text-muted-foreground">
      <p>Audio-first comprehension over passages and conversations.</p>
      <Button variant="link" className="h-auto px-0" asChild>
        <Link href="/listening">Go to listening →</Link>
      </Button>
    </CardContent>
  </Card>
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="flex items-center gap-2 text-base">
        <PenLine className="size-4" />
        Writing
      </CardTitle>
    </CardHeader>
    <CardContent className="text-sm text-muted-foreground">
      <p>Translate, complete, compose short German texts.</p>
      <Button variant="link" className="h-auto px-0" asChild>
        <Link href="/writing">Go to writing →</Link>
      </Button>
    </CardContent>
  </Card>
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="flex items-center gap-2 text-base">
        <Mic className="size-4" />
        Speaking
      </CardTitle>
    </CardHeader>
    <CardContent className="text-sm text-muted-foreground">
      <p>Pronunciation drills with browser speech recognition.</p>
      <Button variant="link" className="h-auto px-0" asChild>
        <Link href="/speaking">Go to speaking →</Link>
      </Button>
    </CardContent>
  </Card>
</div>
```

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/home/HomeDashboard.tsx
git commit -m "feat(home): add Listening, Writing, Speaking tiles"
```

### Task 3.3: Update Progress dashboard to show new modes

**Files:**
- Modify whichever component(s) under `src/components/progress/` render the per-mode completion summary. Find via:
  - Run: `grep -rn "readingProgress\|conversationProgress" src/components/progress src/app/progress`.

- [ ] **Step 1: Add rows for Listening / Writing / Speaking**

For each existing per-mode completion summary, add three more rows following the same visual pattern. Each row shows `completed / total` and a percentage bar where:

- Listening total = `readingPassages.length + conversationLessons.length`. Completed = items in `listeningProgress` with `completed === true`.
- Writing total = `writingPrompts.length`. Completed = items in `writingProgress` with `completed === true`.
- Speaking total = `speakingDrills.length`. Completed = items in `speakingProgress` with `completed === true`.

- [ ] **Step 2: Run build + tests**

Run: `npm run build && npx vitest run`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(progress): show Listening, Writing, Speaking rows"
```

---

## Phase 4 — Verification & commit

### Task 4.1: Lint, type-check, full test suite, build

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: zero errors. Fix any new warnings introduced.

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`
Expected: all PASS.

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: PASS, with all six new routes (`/listening`, `/listening/[id]`, `/writing`, `/writing/[id]`, `/speaking`, `/speaking/[id]`) listed in the route table.

### Task 4.2: Dev-server smoke test

- [ ] **Step 1: Start dev server (background)**

Run: `npm run dev` (background).

- [ ] **Step 2: Smoke each new route**

Curl each route, expect HTTP 200 (or 401 if auth is enabled — that's fine, it means the route was reached):

```bash
for r in /listening /writing /speaking; do
  echo "$r -> $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000$r)"
done
```

For a detail page, pick an id from each collection (e.g. read it from `src/content/...`) and curl it.

- [ ] **Step 3: Manually open each route in a browser**

Open `/listening`, click into a passage, press Play, click "Show text", complete the exercises, verify the completion record persists (refresh → still completed).

Repeat for `/writing` (pick a prompt, run all three exercise types) and `/speaking` (pick a drill — if browser supports recognition, run mic flow; otherwise verify the fallback message renders).

### Task 4.3: Final commit + summary

- [ ] **Step 1: Verify clean state**

Run: `git status`
Expected: clean.

- [ ] **Step 2: Push**

Run: `git push origin main`
Expected: PASS (LICENSE is now on both sides; security gate clears).

---

## Self-Review (run before declaring the plan complete)

- [ ] **Spec coverage:** Every section of `docs/superpowers/specs/2026-06-04-content-and-skill-modes-design.md` maps to at least one task above. Content expansion (1.1–1.15), Listening (2.1–2.2), Writing (2.3–2.4), Speaking (2.5–2.6), cross-cutting (0.3, 0.4, 0.5, 3.1, 3.2, 3.3), verification (4.x). ✓
- [ ] **Placeholder scan:** No TBDs, no "implement later", no "similar to Task N". Each step has the literal code or command to run.
- [ ] **Type consistency:** `recordListeningComplete(itemKey, score, total)`, `recordWritingComplete(promptId, score, total)`, `recordSpeakingComplete(drillId, score, total)` — used identically across store, store tests, and component call sites. `ListeningProgress` key format `passage:<id>` / `conversation:<id>` consistent everywhere.
