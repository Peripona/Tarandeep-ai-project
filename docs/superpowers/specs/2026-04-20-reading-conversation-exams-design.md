# Reading, Conversation & Level Exams — Design Spec

**Date:** 2026-04-20
**Status:** Approved

## Context

The app currently covers vocabulary (flashcards + SRS) and grammar (lessons + exercises) for A1–C2. Reading comprehension, conversational practice, and formal level assessment are absent. These gaps mean learners have no way to practise understanding real German texts, encounter natural dialogue, or validate their overall level readiness. This spec adds three independent sections that ship sequentially.

---

## Routes

| Route | Purpose |
|---|---|
| `/reading` | Passage list grouped by CEFR level |
| `/reading/[passageId]` | Single passage + exercises |
| `/conversation` | Conversation list grouped by CEFR level |
| `/conversation/[conversationId]` | Single conversation + exercises |
| `/exams` | Level exam index (A1–C2) |
| `/exams/[level]` | The exam itself |

---

## Navigation

- **Sidebar:** Reading, Conversation, Exams added after Grammar
- **Mobile:** existing 4-tab bottom nav gains a fifth **"More"** tab that opens a drawer containing Reading, Conversation, and Exams links
- No existing nav items are moved or renamed

---

## Content Volume

- **12 reading passages** — 2 per CEFR level (A1–C2)
- **12 conversation lessons** — 2 per CEFR level (A1–C2)
- **6 level exams** — 1 per CEFR level (A1–C2)

All content lives as typed TypeScript files under `src/content/`, mirroring `src/content/grammar.ts` and `src/content/vocabulary.ts`.

---

## Content Types

### Reading Passage

```typescript
interface ReadingPassage {
  id: string;
  title: string;
  level: CEFRLevel;
  topic: string;
  text: string;           // full German passage
  textEn: string;         // English translation (shown on demand)
  tooltips: Record<string, string>; // word → definition for hover tooltips
  exercises: (MultipleChoiceExercise | FillBlankExercise)[];
}
```

### Conversation Lesson

```typescript
interface ConversationLesson {
  id: string;
  title: string;
  situation: string;      // e.g. "At the doctor's office"
  level: CEFRLevel;
  dialogue: {
    speaker: "A" | "B";
    name: string;
    line: string;
    lineEn: string;
  }[];
  phrases: {
    german: string;
    english: string;
    usage: string;
  }[];
  exercises: (MultipleChoiceExercise | FillBlankExercise)[];
}
```

### Level Exam

```typescript
interface LevelExam {
  level: CEFRLevel;
  title: string;          // e.g. "A1 Level Assessment"
  description: string;
  sections: {
    title: string;        // "Reading", "Grammar", "Conversation"
    questions: (MultipleChoiceExercise | FillBlankExercise)[];
  }[];
}
```

`MultipleChoiceExercise` and `FillBlankExercise` are the existing types from `src/lib/types.ts` — no new exercise types needed.

---

## Components

### Reading (`src/components/reading/`)

| Component | Purpose |
|---|---|
| `PassageCard` | List card — title, level badge, topic, completion tick |
| `PassageView` | Passage text with tooltip words highlighted, exercises below |
| `WordTooltip` | Tap/hover popover showing word definition |

### Conversation (`src/components/conversation/`)

| Component | Purpose |
|---|---|
| `ConversationCard` | List card — situation, level badge, completion tick |
| `ConversationView` | Dialogue bubbles (A left, B right) + phrases table + exercises |

### Exams (`src/components/exams/`)

| Component | Purpose |
|---|---|
| `ExamCard` | Level card — pass/fail badge, last score, date |
| `ExamView` | Sectioned exam, progress bar between sections, final score screen |

### Reused unchanged

- `FillBlank`, `MultipleChoice` — existing grammar exercise components
- `LevelBadge`, `Button`, `Card`, `Badge`, `Progress` — existing UI components

---

## Detail Page Structure

**Reading & Conversation pages** follow `LessonView` structure exactly:
1. Header: title + level badge
2. Content: passage (with tooltips) or dialogue + phrases
3. Exercises: `MultipleChoice` + `FillBlank` blocks
4. Save button (enabled at ≥70% score)

**Exam pages** differ slightly:
1. Header: level + description
2. Sections with a progress indicator between them
3. All questions answered → submit → score screen with section breakdown and pass/fail

---

## Pass Thresholds

| Section | Threshold |
|---|---|
| Reading | 70% |
| Conversation | 70% |
| Level Exam | 80% |

---

## Progress Tracking

### New Zustand state slices

```typescript
readingProgress: Record<string, {
  completed: boolean;
  score: number;
  total: number;
  lastAttempt: string;  // ISO date
}>;

conversationProgress: Record<string, {
  completed: boolean;
  score: number;
  total: number;
  lastAttempt: string;
}>;

examResults: Record<CEFRLevel, {
  score: number;
  total: number;
  passed: boolean;
  date: string;
}>;
```

### New actions

- `recordReadingComplete(passageId, score, total)`
- `recordConversationComplete(conversationId, score, total)`
- `recordExamResult(level, score, total)`

All mirror the existing `recordLessonComplete` pattern in `src/lib/store.ts`.

### CEFR ring reweighting (`src/lib/levelAssessor.ts`)

| Signal | Old weight | New weight |
|---|---|---|
| Vocabulary | 60% | 40% |
| Grammar | 40% | 30% |
| Reading | — | 20% |
| Conversation | — | 10% |

### Progress page additions

- Exam pass/fail badge appears on each CEFR level ring
- Reading/conversation completions count toward daily "lessons completed" stat

---

## Implementation Order

Implement as three sequential sub-projects, each independently shippable:

### Sub-project 1: Reading
1. Add `ReadingPassage` type to `src/lib/types.ts`
2. Write `src/content/reading.ts` (12 passages, A1–C2)
3. Add `readingProgress` slice + `recordReadingComplete` to store
4. Build `PassageCard`, `WordTooltip`, `PassageView` components
5. Create `/reading` and `/reading/[passageId]` pages
6. Add Reading to sidebar + mobile More drawer
7. Update CEFR ring weights in `levelAssessor.ts`

### Sub-project 2: Conversation
1. Add `ConversationLesson` type to `src/lib/types.ts`
2. Write `src/content/conversations.ts` (12 conversations, A1–C2)
3. Add `conversationProgress` slice + `recordConversationComplete` to store
4. Build `ConversationCard`, `ConversationView` components
5. Create `/conversation` and `/conversation/[conversationId]` pages
6. Add Conversation to sidebar + mobile More drawer

### Sub-project 3: Exams
1. Add `LevelExam` type to `src/lib/types.ts`
2. Write `src/content/exams.ts` (6 exams, A1–C2)
3. Add `examResults` slice + `recordExamResult` to store
4. Build `ExamCard`, `ExamView` components
5. Create `/exams` and `/exams/[level]` pages
6. Add Exams to sidebar + mobile More drawer
7. Add exam pass/fail badge to CEFR progress rings on progress page

---

## Verification

For each sub-project:
- All list pages render content grouped by level
- Detail pages show content, exercises score correctly, save button enables at threshold
- Progress persists to localStorage after completion
- CEFR rings update after completing content (sub-project 1 onwards)
- Exam: all sections complete → score screen → pass/fail badge on progress page
- Mobile "More" drawer opens and all links navigate correctly
- No TypeScript errors (`tsc --noEmit`)
