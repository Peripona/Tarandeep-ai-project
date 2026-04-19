# Audio Playback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add German audio playback throughout the app using the Web Speech API — vocabulary flashcards, grammar examples, and exercise feedback — with configurable voice, speed, and auto-play settings.

**Architecture:** A `useAudio` hook wraps `window.speechSynthesis` and reads rate/voice from the Zustand store. A shared `AudioButton` component renders the speaker icon inline wherever German text appears. Settings UI lets users pick voice, speed, and toggle auto-play.

**Tech Stack:** Next.js 15 (App Router), React 19, Zustand 5, lucide-react, Web Speech API, Vitest + @testing-library/react

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/types.ts` | Modify | Add `autoPlayAudio`, `audioRate`, `audioVoiceURI` to `UserSettings` |
| `src/lib/store.ts` | Modify | Add defaults for the three new settings fields |
| `src/lib/useAudio.ts` | Create | Hook wrapping `window.speechSynthesis` |
| `src/lib/useAudio.test.ts` | Create | Unit tests for the hook |
| `src/components/ui/AudioButton.tsx` | Create | Reusable speaker icon button |
| `src/components/vocabulary/FlashCard.tsx` | Modify | Add `AudioButton` on each card face |
| `src/components/vocabulary/StudySession.tsx` | Modify | Auto-play word on card load; sentence on flip |
| `src/components/grammar/LessonView.tsx` | Modify | `AudioButton` next to each German example |
| `src/components/grammar/FillBlank.tsx` | Modify | `AudioButton` next to correct answer in feedback |
| `src/components/grammar/MultipleChoice.tsx` | Modify | `AudioButton` next to each option |
| `src/components/grammar/WordOrder.tsx` | Modify | `AudioButton` next to correct sentence in feedback |
| `src/components/settings/GoalSettings.tsx` | Modify | Add audio section: toggle, speed presets, voice dropdown |

---

### Task 1: Extend the data model

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/store.ts`

- [ ] **Step 1: Update `UserSettings` interface**

In `src/lib/types.ts`, replace the existing `UserSettings` interface:

```ts
export interface UserSettings {
  dailyCardGoal: number;
  dailyLessonGoal: number;
  theme: "light" | "dark" | "system";
  autoPlayAudio: boolean;
  audioRate: number;
  audioVoiceURI: string | null;
}
```

- [ ] **Step 2: Update default settings in the store**

In `src/lib/store.ts`, replace the `defaultSettings` object:

```ts
const defaultSettings: UserSettings = {
  dailyCardGoal: 10,
  dailyLessonGoal: 1,
  theme: "system",
  autoPlayAudio: false,
  audioRate: 0.9,
  audioVoiceURI: null,
};
```

- [ ] **Step 3: Run existing tests to confirm nothing is broken**

```bash
npm test
```

Expected: all existing tests pass (no type errors yet — TypeScript is checked at build time).

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/store.ts
git commit -m "feat: add audioPlayback fields to UserSettings"
```

---

### Task 2: `useAudio` hook

**Files:**
- Create: `src/lib/useAudio.ts`
- Create: `src/lib/useAudio.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/useAudio.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAudio } from "./useAudio";

// Mock the Zustand store selector
vi.mock("@/lib/store", () => ({
  useAppStore: vi.fn((selector: (s: { settings: { audioRate: number; audioVoiceURI: string | null } }) => unknown) =>
    selector({ settings: { audioRate: 0.9, audioVoiceURI: null } }),
  ),
}));

const mockCancel = vi.fn();
const mockSpeak = vi.fn();
const mockGetVoices = vi.fn(() => []);

beforeEach(() => {
  mockCancel.mockClear();
  mockSpeak.mockClear();
  Object.defineProperty(window, "speechSynthesis", {
    value: { cancel: mockCancel, speak: mockSpeak, getVoices: mockGetVoices },
    writable: true,
    configurable: true,
  });
});

describe("useAudio", () => {
  it("calls cancel then speak when speak() is called", () => {
    const { result } = renderHook(() => useAudio());
    act(() => { result.current.speak("Hallo"); });
    expect(mockCancel).toHaveBeenCalledTimes(1);
    expect(mockSpeak).toHaveBeenCalledTimes(1);
    const utterance = mockSpeak.mock.calls[0][0] as SpeechSynthesisUtterance;
    expect(utterance.text).toBe("Hallo");
    expect(utterance.lang).toBe("de-DE");
    expect(utterance.rate).toBe(0.9);
  });

  it("cancels speech when stop() is called", () => {
    const { result } = renderHook(() => useAudio());
    act(() => { result.current.stop(); });
    expect(mockCancel).toHaveBeenCalledTimes(1);
  });

  it("cancels speech on unmount", () => {
    const { unmount } = renderHook(() => useAudio());
    unmount();
    expect(mockCancel).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- src/lib/useAudio.test.ts
```

Expected: FAIL — "Cannot find module './useAudio'"

- [ ] **Step 3: Implement `useAudio`**

Create `src/lib/useAudio.ts`:

```ts
import { useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store";

export function useAudio() {
  const audioRate = useAppStore((s) => s.settings.audioRate);
  const audioVoiceURI = useAppStore((s) => s.settings.audioVoiceURI);

  const speak = useCallback(
    (text: string) => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "de-DE";
      utterance.rate = audioRate;
      if (audioVoiceURI) {
        const voice = window.speechSynthesis
          .getVoices()
          .find((v) => v.voiceURI === audioVoiceURI);
        if (voice) utterance.voice = voice;
      }
      window.speechSynthesis.speak(utterance);
    },
    [audioRate, audioVoiceURI],
  );

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
  }, []);

  useEffect(() => () => { window.speechSynthesis.cancel(); }, []);

  return { speak, stop };
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm test -- src/lib/useAudio.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/useAudio.ts src/lib/useAudio.test.ts
git commit -m "feat: add useAudio hook wrapping Web Speech API"
```

---

### Task 3: `AudioButton` component

**Files:**
- Create: `src/components/ui/AudioButton.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/ui/AudioButton.tsx`:

```tsx
"use client";

import { Volume2 } from "lucide-react";
import { useAudio } from "@/lib/useAudio";

export function AudioButton({ text }: { text: string }) {
  const { speak } = useAudio();

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        speak(text);
      }}
      aria-label="Play audio"
      className="inline-flex shrink-0 items-center text-muted-foreground transition-colors hover:text-foreground"
    >
      <Volume2 size={16} />
    </button>
  );
}
```

- [ ] **Step 2: Run all tests to confirm no regressions**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/AudioButton.tsx
git commit -m "feat: add AudioButton reusable speaker icon component"
```

---

### Task 4: Add audio to `FlashCard`

**Files:**
- Modify: `src/components/vocabulary/FlashCard.tsx`

- [ ] **Step 1: Add `AudioButton` to each card face**

Replace the entire content of `src/components/vocabulary/FlashCard.tsx` with:

```tsx
"use client";

import { motion } from "framer-motion";
import { useCallback } from "react";
import type { VocabCard } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AudioButton } from "@/components/ui/AudioButton";

function genderClass(g: VocabCard["gender"]): string {
  if (g === "masculine") return "text-[var(--der)]";
  if (g === "feminine") return "text-[var(--die)]";
  if (g === "neuter") return "text-[var(--das)]";
  return "";
}

export function FlashCard({
  card,
  flipped,
  onFlip,
}: {
  card: VocabCard;
  flipped: boolean;
  onFlip: () => void;
}) {
  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        onFlip();
      }
    },
    [onFlip],
  );

  return (
    <div
      className="mx-auto w-full max-w-lg perspective-[1000px]"
      onKeyDown={handleKey}
      role="button"
      tabIndex={0}
      onClick={onFlip}
      aria-label={flipped ? "Show front" : "Show back"}
    >
      <motion.div
        className="relative h-64 cursor-pointer md:h-72"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
      >
        {/* Front face */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col justify-center rounded-2xl border-2 border-border bg-card p-8 shadow-lg",
            "backface-hidden",
          )}
          style={{ backfaceVisibility: "hidden" }}
        >
          <p className={cn("text-center text-3xl font-bold md:text-4xl", genderClass(card.gender))}>
            {card.german}
          </p>
          {card.gender && (
            <p className="mt-2 text-center text-sm capitalize text-muted-foreground">
              {card.gender}
            </p>
          )}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Tap or Space to flip
          </p>
          <div className="mt-4 flex justify-center">
            <AudioButton text={card.german} />
          </div>
        </div>

        {/* Back face */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col justify-center rounded-2xl border-2 border-border bg-muted/50 p-8 shadow-lg",
          )}
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <p className="text-center text-2xl font-medium text-foreground md:text-3xl">
            {card.english}
          </p>
          <p className="mt-4 text-center text-sm italic text-muted-foreground">
            {card.example}
          </p>
          <p className="mt-1 text-center text-xs text-muted-foreground">{card.exampleEn}</p>
          <div className="mt-4 flex justify-center">
            <AudioButton text={card.example} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/vocabulary/FlashCard.tsx
git commit -m "feat: add audio buttons to FlashCard front and back faces"
```

---

### Task 5: Auto-play in `StudySession`

**Files:**
- Modify: `src/components/vocabulary/StudySession.tsx`

- [ ] **Step 1: Add auto-play effects**

Replace the entire content of `src/components/vocabulary/StudySession.tsx` with:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Rating, VocabCard } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { useAudio } from "@/lib/useAudio";
import { FlashCard } from "./FlashCard";
import { RatingButtons } from "./RatingButtons";
import { Button } from "@/components/ui/button";

const keyToRating: Record<string, Rating> = {
  "1": "again",
  "2": "hard",
  "3": "good",
  "4": "easy",
};

export function StudySession({
  cards,
  title,
  finishHref = "/vocabulary",
}: {
  cards: VocabCard[];
  title: string;
  finishHref?: string;
}) {
  const router = useRouter();
  const recordCardReview = useAppStore((s) => s.recordCardReview);
  const autoPlayAudio = useAppStore((s) => s.settings.autoPlayAudio);
  const { speak, stop } = useAudio();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = cards[index];
  const done = index >= cards.length;

  const onRate = useCallback(
    (r: Rating) => {
      if (!flipped || !card) return;
      recordCardReview(card.id, r);
      setFlipped(false);
      setIndex((i) => i + 1);
    },
    [card, flipped, recordCardReview],
  );

  // Reset flip state when card changes
  useEffect(() => {
    setFlipped(false);
  }, [index]);

  // Auto-play German word when a new card appears
  useEffect(() => {
    if (autoPlayAudio && card) speak(card.german);
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Auto-play example sentence when card flips to back
  useEffect(() => {
    if (autoPlayAudio && flipped && card) speak(card.example);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (done) return;
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
      if (flipped && keyToRating[e.key]) {
        e.preventDefault();
        onRate(keyToRating[e.key]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [done, flipped, onRate]);

  if (cards.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        No cards in this session.
        <div className="mt-4">
          <Button variant="outline" onClick={() => router.push(finishHref)}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg space-y-6 text-center">
        <h2 className="text-2xl font-semibold">Session complete</h2>
        <p className="text-muted-foreground">
          You reviewed {cards.length} card{cards.length === 1 ? "" : "s"} in {title}.
        </p>
        <Button onClick={() => router.push(finishHref)}>Continue</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{title}</span>
        <span>
          {index + 1} / {cards.length}
        </span>
      </div>
      <FlashCard card={card} flipped={flipped} onFlip={() => setFlipped((f) => !f)} />
      <div className="space-y-2">
        <p className="text-center text-sm text-muted-foreground">
          {flipped ? "How well did you remember?" : "Flip the card, then rate."}
        </p>
        <div className={!flipped ? "pointer-events-none opacity-40" : ""}>
          <RatingButtons onRate={onRate} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/vocabulary/StudySession.tsx
git commit -m "feat: auto-play German word and sentence in StudySession"
```

---

### Task 6: Audio in grammar lesson examples

**Files:**
- Modify: `src/components/grammar/LessonView.tsx`

- [ ] **Step 1: Add `AudioButton` next to each German example**

Replace the entire content of `src/components/grammar/LessonView.tsx` with:

```tsx
"use client";

import { useMemo, useState } from "react";
import type { GrammarExercise, GrammarLesson } from "@/lib/types";
import { FillBlank } from "./FillBlank";
import { MultipleChoice } from "./MultipleChoice";
import { WordOrder } from "./WordOrder";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AudioButton } from "@/components/ui/AudioButton";

function ExerciseBlock({
  ex,
  onResult,
}: {
  ex: GrammarExercise;
  onResult: (correct: boolean) => void;
}) {
  switch (ex.type) {
    case "fillBlank":
      return <FillBlank exercise={ex} onResult={onResult} />;
    case "multipleChoice":
      return <MultipleChoice exercise={ex} onResult={onResult} />;
    case "wordOrder":
      return <WordOrder exercise={ex} onResult={onResult} />;
    default:
      return null;
  }
}

export function LessonView({ lesson }: { lesson: GrammarLesson }) {
  const recordLessonComplete = useAppStore((s) => s.recordLessonComplete);
  const [scores, setScores] = useState<boolean[]>(() =>
    lesson.exercises.map(() => false),
  );
  const [recorded, setRecorded] = useState(false);

  const total = lesson.exercises.length;
  const correctCount = useMemo(() => scores.filter(Boolean).length, [scores]);

  const setScore = (idx: number, ok: boolean) => {
    setScores((prev) => {
      const next = [...prev];
      next[idx] = ok;
      return next;
    });
  };

  const finish = () => {
    if (recorded) return;
    recordLessonComplete(lesson.id, correctCount, total);
    setRecorded(true);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      {lesson.sections.map((sec) => (
        <section key={sec.heading} className="space-y-4">
          <h2 className="text-xl font-semibold">{sec.heading}</h2>
          {sec.body.map((p, i) => (
            <p key={i} className="text-muted-foreground leading-relaxed">
              {p}
            </p>
          ))}
          {sec.examples && (
            <ul className="space-y-2 border-l-2 border-destructive/50 pl-4">
              {sec.examples.map((ex) => (
                <li key={ex.de} className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{ex.de}</span>
                  <AudioButton text={ex.de} />
                  <span className="text-muted-foreground"> — {ex.en}</span>
                </li>
              ))}
            </ul>
          )}
          {sec.table && (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                {sec.table.headers && (
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {sec.table.headers.map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {sec.table.rows.map((row, ri) => (
                    <tr key={ri} className="border-b last:border-0">
                      {row.cells.map((c, ci) => (
                        <td key={ci} className="px-3 py-2">
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      <Separator />

      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Exercises</h2>
        {lesson.exercises.map((ex, idx) => (
          <Card key={ex.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Exercise {idx + 1}</CardTitle>
            </CardHeader>
            <CardContent>
              <ExerciseBlock ex={ex} onResult={(ok) => setScore(idx, ok)} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col items-center gap-4 pb-8">
        <p className="text-sm text-muted-foreground">
          Score: {correctCount} / {total}
        </p>
        <Button type="button" onClick={finish} disabled={recorded}>
          {recorded ? "Progress saved" : "Save lesson progress"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/grammar/LessonView.tsx
git commit -m "feat: add audio buttons to grammar lesson examples"
```

---

### Task 7: Audio in grammar exercise feedback

**Files:**
- Modify: `src/components/grammar/FillBlank.tsx`
- Modify: `src/components/grammar/MultipleChoice.tsx`
- Modify: `src/components/grammar/WordOrder.tsx`

- [ ] **Step 1: Update `FillBlank` — speaker next to correct answer**

Replace the entire content of `src/components/grammar/FillBlank.tsx` with:

```tsx
"use client";

import { useState } from "react";
import type { FillBlankExercise } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AudioButton } from "@/components/ui/AudioButton";

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export function FillBlank({
  exercise,
  onResult,
}: {
  exercise: FillBlankExercise;
  onResult: (correct: boolean) => void;
}) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const correct =
    submitted &&
    (normalize(value) === normalize(exercise.answer) ||
      exercise.alternatives?.some((a) => normalize(value) === normalize(a)));

  const submit = () => {
    setSubmitted(true);
    const ok =
      normalize(value) === normalize(exercise.answer) ||
      Boolean(exercise.alternatives?.some((a) => normalize(value) === normalize(a)));
    onResult(ok);
  };

  return (
    <div className="space-y-3">
      <p className="font-medium">{exercise.prompt}</p>
      <input
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        value={value}
        disabled={submitted}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Your answer"
      />
      {!submitted ? (
        <Button type="button" onClick={submit}>
          Check
        </Button>
      ) : (
        <div
          className={cn(
            "rounded-md p-3 text-sm",
            correct ? "bg-green-500/10 text-green-800 dark:text-green-200" : "bg-destructive/10",
          )}
        >
          {correct ? (
            "Correct!"
          ) : (
            <span className="flex items-center gap-2">
              Expected: {exercise.answer}
              <AudioButton text={exercise.answer} />
            </span>
          )}
          {exercise.explanation && (
            <p className="mt-2 text-muted-foreground">{exercise.explanation}</p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `MultipleChoice` — speaker next to each option**

Replace the entire content of `src/components/grammar/MultipleChoice.tsx` with:

```tsx
"use client";

import { useState } from "react";
import type { MultipleChoiceExercise } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AudioButton } from "@/components/ui/AudioButton";

export function MultipleChoice({
  exercise,
  onResult,
}: {
  exercise: MultipleChoiceExercise;
  onResult: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);

  const select = (idx: number) => {
    if (picked !== null) return;
    setPicked(idx);
    onResult(idx === exercise.correctIndex);
  };

  return (
    <div className="space-y-3">
      <p className="font-medium">{exercise.question}</p>
      <div className="flex flex-col gap-2">
        {exercise.options.map((opt, idx) => (
          <div key={opt} className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className={cn(
                "flex-1 justify-start text-left",
                picked !== null &&
                  idx === exercise.correctIndex &&
                  "border-green-600 bg-green-500/10",
                picked !== null &&
                  picked === idx &&
                  idx !== exercise.correctIndex &&
                  "border-destructive bg-destructive/10",
              )}
              onClick={() => select(idx)}
              disabled={picked !== null}
            >
              {opt}
            </Button>
            <AudioButton text={opt} />
          </div>
        ))}
      </div>
      {picked !== null && exercise.explanation && (
        <p className="text-sm text-muted-foreground">{exercise.explanation}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update `WordOrder` — speaker next to correct sentence in feedback**

Replace the entire content of `src/components/grammar/WordOrder.tsx` with:

```tsx
"use client";

import { useState } from "react";
import type { WordOrderExercise } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AudioButton } from "@/components/ui/AudioButton";

export function WordOrder({
  exercise,
  onResult,
}: {
  exercise: WordOrderExercise;
  onResult: (correct: boolean) => void;
}) {
  const [pool, setPool] = useState(() => [...exercise.words]);
  const [built, setBuilt] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const add = (w: string, fromPool: number) => {
    if (submitted) return;
    setPool((p) => p.filter((_, i) => i !== fromPool));
    setBuilt((b) => [...b, w]);
  };

  const removeLast = () => {
    if (submitted || built.length === 0) return;
    const w = built[built.length - 1];
    setBuilt((b) => b.slice(0, -1));
    setPool((p) => [...p, w]);
  };

  const check = () => {
    setSubmitted(true);
    const ok =
      built.length === exercise.correctOrder.length &&
      built.every((w, i) => w === exercise.correctOrder[i]);
    onResult(ok);
  };

  const correct =
    submitted &&
    built.length === exercise.correctOrder.length &&
    built.every((w, i) => w === exercise.correctOrder[i]);

  const correctSentence = exercise.correctOrder.join(" ");

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Tap words in order.</p>
      <div className="flex min-h-12 flex-wrap gap-2 rounded-md border border-dashed border-border p-2">
        {built.map((w, i) => (
          <span key={`${w}-${i}`} className="rounded bg-muted px-2 py-1 text-sm">
            {w}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {pool.map((w, i) => (
          <Button
            key={`${w}-${i}`}
            type="button"
            size="sm"
            variant="secondary"
            disabled={submitted}
            onClick={() => add(w, i)}
          >
            {w}
          </Button>
        ))}
      </div>
      <div className="flex gap-2">
        {!submitted && (
          <>
            <Button type="button" variant="outline" size="sm" onClick={removeLast}>
              Undo
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={check}
              disabled={built.length !== exercise.correctOrder.length}
            >
              Check
            </Button>
          </>
        )}
      </div>
      {submitted && (
        <div
          className={cn(
            "rounded-md p-3 text-sm",
            correct ? "bg-green-500/10 text-green-800 dark:text-green-200" : "bg-destructive/10",
          )}
        >
          {correct ? (
            "Correct!"
          ) : (
            <span className="flex items-center gap-2">
              Expected: {correctSentence}
              <AudioButton text={correctSentence} />
            </span>
          )}
          {exercise.explanation && (
            <p className="mt-2 text-muted-foreground">{exercise.explanation}</p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/grammar/FillBlank.tsx src/components/grammar/MultipleChoice.tsx src/components/grammar/WordOrder.tsx
git commit -m "feat: add audio buttons to grammar exercise feedback"
```

---

### Task 8: Audio settings UI

**Files:**
- Modify: `src/components/settings/GoalSettings.tsx`

- [ ] **Step 1: Add audio settings section**

Replace the entire content of `src/components/settings/GoalSettings.tsx` with:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const SPEED_PRESETS = [
  { label: "Slow", rate: 0.7 },
  { label: "Normal", rate: 0.9 },
  { label: "Fast", rate: 1.1 },
];

export function GoalSettings() {
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    function loadVoices() {
      const all = window.speechSynthesis.getVoices();
      setVoices(all.filter((v) => v.lang.startsWith("de")));
    }
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  return (
    <div className="space-y-8">
      {/* Goal settings */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="card-goal">Daily card review goal</Label>
          <div className="flex gap-2">
            <input
              id="card-goal"
              type="number"
              min={1}
              max={200}
              className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm"
              value={settings.dailyCardGoal}
              onChange={(e) =>
                setSettings({ dailyCardGoal: Number(e.target.value) || 1 })
              }
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSettings({ dailyCardGoal: 10 })}
            >
              Reset
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lesson-goal">Daily new grammar lessons goal</Label>
          <div className="flex gap-2">
            <input
              id="lesson-goal"
              type="number"
              min={0}
              max={20}
              className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm"
              value={settings.dailyLessonGoal}
              onChange={(e) =>
                setSettings({ dailyLessonGoal: Number(e.target.value) || 0 })
              }
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSettings({ dailyLessonGoal: 1 })}
            >
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Audio settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Audio</h3>

        {/* Auto-play toggle */}
        <div className="flex items-start gap-3">
          <input
            id="auto-play"
            type="checkbox"
            className="mt-0.5 h-4 w-4 cursor-pointer rounded border-input accent-primary"
            checked={settings.autoPlayAudio}
            onChange={(e) => setSettings({ autoPlayAudio: e.target.checked })}
          />
          <div>
            <Label htmlFor="auto-play" className="cursor-pointer font-medium">
              Auto-play German word and sentence
            </Label>
            <p className="text-xs text-muted-foreground">
              Automatically speak the word when a card loads and the example sentence when you flip it.
            </p>
          </div>
        </div>

        {/* Playback speed */}
        <div className="space-y-2">
          <Label>Playback speed</Label>
          <div className="flex gap-2">
            {SPEED_PRESETS.map(({ label, rate }) => (
              <Button
                key={label}
                type="button"
                size="sm"
                variant={settings.audioRate === rate ? "default" : "outline"}
                onClick={() => setSettings({ audioRate: rate })}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Voice selection */}
        {voices.length > 0 ? (
          <div className="space-y-2">
            <Label htmlFor="voice-select">Voice</Label>
            <select
              id="voice-select"
              className="rounded-md border border-input bg-background px-2 py-1 text-sm"
              value={settings.audioVoiceURI ?? ""}
              onChange={(e) =>
                setSettings({ audioVoiceURI: e.target.value || null })
              }
            >
              <option value="">OS default</option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Using OS default German voice.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/settings/GoalSettings.tsx
git commit -m "feat: add audio settings section (auto-play, speed, voice)"
```

---

### Task 9: Final verification and push

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```

Expected: all tests pass with no errors.

- [ ] **Step 2: Type-check the project**

```bash
npx tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 3: Build the project**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 4: Push to remote**

```bash
git push
```
