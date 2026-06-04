# Content Expansion + Listening, Writing, Speaking Modes

**Status:** Approved
**Date:** 2026-06-04
**Scope:** Four sub-projects executed in one batch — content expansion across CEFR A1–C2, plus three new skill modes (Listening, Writing, Speaking). No LLM, no runtime API, fully local-first.

## Goals

1. Eliminate the "content runs out" gap by curating substantially more static German content at every CEFR level.
2. Close the "passive recognition only" gap by adding three new skill modes (listening, writing, speaking) that don't require any backend, API key, or LLM.

## Non-goals

- No accounts, no multi-device sync, no server-side state.
- No LLM calls, no network calls at runtime beyond what's already in the app.
- No pasted-text ingestion / BYO content.
- No phoneme-level pronunciation analysis (transcript text-match only).
- No new third-party packages unless strictly required (none expected).

## Constraints

- Existing stack only: Next.js 15 App Router, TypeScript, Tailwind v4, Zustand persist, Framer Motion, Vitest.
- Existing patterns reused: route conventions (`src/app/<feature>/page.tsx`, `[id]/page.tsx`), component conventions (`src/components/<feature>/`), state via `useAppStore`, audio via `useAudio`.
- All progress data persisted via existing `persist` middleware; store version bumped with a migration that defaults new fields to `{}`.

---

## Sub-project 1: Content expansion

Author static content authored to CEFR standards and commit as JSON / typed-TS in the existing shapes. **Zero type changes; zero app-code changes beyond catalog wiring.**

### Targets

| Type | Today | Target | Net new |
|---|---|---|---|
| Reading passages | 12 (2 per level) | 48 (8 per level) | **+36** |
| Conversations | 12 (2 per level) | 36 (6 per level) | **+24** |
| Vocabulary decks | 23 (A1×8, A2×5, B1×4, B2×3, C1×2, C2×2) | +1 themed deck per level (~60 cards) | **+6 decks** |
| Grammar lessons | 20 | Min 5 per level (currently A1=6, A2=4, B1=4, B2=3, C1=2, C2=1) | **+6 lessons** to hit min |

### Content rules

- **Reading passages**: 80–180 words at A1, growing to 250–400 at C2. Realistic topics matched to level. 4–6 exercises mixing `multipleChoice` and `fillBlank`. Tooltips for level-appropriate gloss words (8–15 per passage). Both `text` (German) and `textEn` (English translation) required by the existing type.
- **Conversations**: 8–14 dialogue lines split between two speakers (A/B) with `name`, `line`, `lineEn`. 4–6 reusable phrases. 4–6 exercises (MCQ + fillBlank).
- **Vocabulary decks**: ~60 cards each. Every card has `id`, `german`, `english`, `gender` (or `null` for non-nouns), `example`, `exampleEn`, `level`, `topic`. Themed by topic the level doesn't yet cover.
- **Grammar lessons**: Existing `GrammarLesson` shape — `summary`, `sections` (heading/body/examples/optional table), 4–8 exercises. Cover gaps so every CEFR level has at least 5 lessons.

### Topic coverage targets

- **A1**: numbers/time, weather basics, body/health basics, transport, jobs, free-time, home/rooms, food extended
- **A2**: clothing, technology basics, friendships, school subjects, city life, environment intro, festivals
- **B1**: career, social media, sustainability, history, music/arts, travel stories, opinions
- **B2**: politics & society, ethics, economics, technology debates, climate, education, identity
- **C1**: academic discourse, philosophy, journalism, literature excerpts (paraphrased/original), specialised vocabulary
- **C2**: register-shifts, idiomatic/figurative usage, cultural & literary criticism, rhetorical analysis

### File layout

- Reading: append to `src/content/reading.ts` (typed TS file with all passages).
- Conversations: append to `src/content/conversations.ts`.
- Vocabulary: one new JSON per level under `src/content/vocabulary/<level>-<topic>.json`, then registered in `src/content/catalog.ts`.
- Grammar: one new JSON per gap under `src/content/grammar/<level>-<topic>.json`, then registered in `src/content/catalog.ts`.

### Tests

- Existing `conversations.test.ts` and `reading.test.ts` schemas must still pass.
- Add to those tests: assertion that every CEFR level has at least the target counts.

---

## Sub-project 2: Listening mode

Audio-first comprehension over reading passages and conversations.

### UX flow

1. User opens `/listening`. Sees a list of available items (all reading passages + all conversations), filterable by level.
2. User picks one → `/listening/[id]`.
3. The item's German text/dialogue is **hidden** behind a "Show text" reveal. The English translation is also hidden behind a separate "Show translation" reveal.
4. A play button uses existing `useAudio.speak` to read:
   - For a passage: the full `text` field.
   - For a conversation: concatenated lines, each prefixed with the speaker name and a pause (e.g. `"Anna: ... . Max: ... ."`). Punctuation handles pacing; no chunked playback in v1.
5. The same exercises from the source item run beneath the player, in the same scoring component.
6. On complete, score and total are passed to a new `recordListeningComplete(itemId, score, total)` store action.

### Routing & components

- New route: `src/app/listening/page.tsx` (list) and `src/app/listening/[id]/page.tsx` (detail).
- New components in `src/components/listening/`:
  - `ListeningList.tsx` — grouped by level, links to detail.
  - `ListeningPlayer.tsx` — play/pause + show-text + show-translation toggles + audio rate hint.
  - `ListeningView.tsx` — composes player + reused exercise component.
- Reuse existing exercise runner; rename if necessary so it can render exercises in both Reading and Listening contexts (no behaviour change).

### State

- New field in `AppState`: `listeningProgress: Record<string, ContentProgress>` (key is `passage:<id>` or `conversation:<id>` to avoid collisions).
- New action: `recordListeningComplete(itemKey: string, score: number, total: number)`.
- Persisted via existing `partialize`.

### Item identity

The item key takes the form `"passage:reading-a1-family"` or `"conversation:conversation-a1-cafe"`. This avoids needing to scan two collections when looking up progress.

---

## Sub-project 3: Writing mode

Self-graded short-form writing exercises using fuzzy text match.

### Exercise types

Three new exercise variants, all stored as static items (no LLM):

1. **Translate-prompt** — `prompt` (English short sentence) → user types German → match against `acceptedAnswers: string[]` (case-insensitive, punctuation-stripped, whitespace-collapsed).
2. **Sentence-completion** — `template` with one or more blanks marked `___` → user fills each blank → match each blank against its `acceptedAnswers: string[][]`.
3. **Guided-composition** — `prompt` (English instruction, e.g. "Write 3 sentences about your weekend") → user types a paragraph → no auto-grading; show a model answer and a checkbox "I'm satisfied with my answer." Marked complete when the user ticks the box.

### Data shape

A new content collection at `src/content/writing.ts` exporting `WritingPrompt[]`. New types added to `src/lib/types.ts`:

```ts
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
  exercises: WritingExercise[]; // 3–5 per prompt
}

export interface WritingProgress {
  [promptId: string]: ContentProgress;
}
```

### Grading

- Normalize function: lowercase → strip leading/trailing whitespace → collapse internal whitespace → strip terminal punctuation (`. ! ? , ; :`) → strip German quotes (`„ " " «»`).
- A translate or completion blank is correct iff normalized user input equals any normalized accepted answer.
- Composition is "complete" when the user ticks the satisfaction box.

### Targets

- 6–10 writing prompts per CEFR level = ~50 prompts total. Each prompt has 3–5 exercises. Roughly 200 exercises total.

### Routing & components

- New route: `src/app/writing/page.tsx` (list) and `src/app/writing/[id]/page.tsx` (detail).
- New components in `src/components/writing/`:
  - `WritingList.tsx` — list grouped by level.
  - `WritingView.tsx` — runs the prompt's exercises one at a time, then surfaces final score.
  - Per-type runners: `TranslateRunner.tsx`, `CompletionRunner.tsx`, `CompositionRunner.tsx`.

### State

- New field: `writingProgress: WritingProgress`.
- New action: `recordWritingComplete(promptId: string, score: number, total: number)`.

---

## Sub-project 4: Speaking mode

Browser-native speech-recognition drill for pronunciation.

### UX flow

1. User opens `/speaking`. Sees a list of drill sets grouped by level.
2. User picks one → `/speaking/[id]`.
3. For each target phrase in the drill:
   - Target shown (German + English gloss).
   - "Listen" button plays target via `useAudio.speak`.
   - "Record" button starts recognition (mic permission requested on first use).
   - Transcript appears as recognition emits.
   - On final result: normalized similarity computed; show pass (≥ 0.85), retry (0.6–0.85), or fail (< 0.6). User can retry or move on.
4. Drill completion records `recordSpeakingComplete(setId, scoreCount, totalCount)`.

### Tech & support

- Use `SpeechRecognition` / `webkitSpeechRecognition` Web API, `lang = "de-DE"`, `continuous = false`, `interimResults = true`.
- Feature detection at component mount: if neither global exists, render an explanation card with "Your browser doesn't support speech recognition. You can still listen to and read the phrases." Listen + show-target still work.
- Supported in v1: Chrome, Edge. Safari partial (works on macOS 14+/iOS 17+). Firefox: no.

### Similarity

A small Levenshtein implementation in a new file `src/lib/strings.ts`:

```ts
export function normalize(s: string): string { /* see Writing grading */ }
export function levenshtein(a: string, b: string): number { /* classic DP */ }
export function similarity(a: string, b: string): number {
  const na = normalize(a), nb = normalize(b);
  if (na === nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(na, nb) / maxLen;
}
```

Used by Speaking. Writing uses exact-after-normalize against `acceptedAnswers` only — `similarity` is not applied to Writing in v1, to keep grading deterministic.

### Data shape

New content collection at `src/content/speaking.ts`:

```ts
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
  phrases: SpeakingPhrase[]; // 8–12 per drill
}

export interface SpeakingProgress {
  [drillId: string]: ContentProgress;
}
```

### Targets

- 4–6 drills per CEFR level = ~30 drills × ~10 phrases = ~300 target phrases. Sources: existing vocab example sentences + existing conversation lines + a few new dedicated phrase sets per level.

### Routing & components

- New route: `src/app/speaking/page.tsx` + `src/app/speaking/[id]/page.tsx`.
- New components in `src/components/speaking/`:
  - `SpeakingList.tsx`
  - `SpeakingDrillView.tsx`
  - `RecordButton.tsx` — encapsulates the Web Speech state machine (idle/listening/processing/error).

### State

- New field: `speakingProgress: SpeakingProgress`.
- New action: `recordSpeakingComplete(drillId: string, score: number, total: number)`.

---

## Cross-cutting changes

### `AppState` and store

Three new fields, three new actions:

```ts
listeningProgress: Record<string, ContentProgress>; // key: "passage:..."|"conversation:..."
writingProgress: WritingProgress;
speakingProgress: SpeakingProgress;

recordListeningComplete: (itemKey: string, score: number, total: number) => void;
recordWritingComplete: (promptId: string, score: number, total: number) => void;
recordSpeakingComplete: (drillId: string, score: number, total: number) => void;
```

All three actions follow the existing pattern: `completed = score >= total * 0.7`, bump streak, update dailyStats `lessonsCompleted` if newly completed.

### Store migration

`persist` middleware version goes 1 → 2. Migration defaults missing fields to `{}`. `partialize` extended to persist the three new keys. `importState` and `resetProgress` extended to cover them.

### CEFR level calculation

Current weights: vocab 40% + grammar 30% + reading 20% + conversation 10% = 100%. The level assessor only sees four signals.

**New weights**: vocab 30%, grammar 25%, reading 15%, conversation 10%, listening 8%, writing 8%, speaking 4%. (Total 100%.)

`estimateLevel` and `levelProgressForAll` signatures get three new parameters: `listeningProgress`, `writingProgress`, `speakingProgress` (and their totals). Update call sites in `src/components/progress/` and anywhere else `estimateLevel` is invoked.

Listening "completion" counts each unique `itemKey` whose record has `completed = true`. Total denominator = `readingPassages.length + conversationLessons.length` (every listenable item).

### Navigation

- Sidebar (`src/components/layout/Sidebar.tsx`): add Listening, Writing, Speaking entries below Reading, in that order.
- Mobile More drawer: same additions.
- Home page (`src/app/page.tsx`): add tile entries for the three new modes if a tile grid is present.

### Progress dashboard

`src/components/progress/`: extend the existing dashboard to show one row per new mode (completed / total) and overall percentage. Same visual treatment as the existing Reading row.

### Tests

- Unit tests for `normalize`, `levenshtein`, `similarity` in `src/lib/strings.test.ts`.
- Store tests `src/lib/store.listening.test.ts`, `store.writing.test.ts`, `store.speaking.test.ts` for the three new actions (mirror of `store.reading.test.ts`).
- `levelAssessor.test.ts` extended with cases for new signals.
- Content-shape tests for the new collections (`writing.test.ts`, `speaking.test.ts`).
- All existing tests must continue to pass.

### Files touched / created (summary)

**Modified**
- `src/lib/types.ts`
- `src/lib/store.ts`
- `src/lib/levelAssessor.ts`
- `src/lib/levelAssessor.test.ts`
- `src/content/catalog.ts`
- `src/content/reading.ts`
- `src/content/conversations.ts`
- `src/content/reading.test.ts`, `conversations.test.ts`
- `src/components/layout/Sidebar.tsx` (+ mobile drawer counterpart)
- `src/components/progress/*` (dashboard)
- `src/app/page.tsx` (home tiles)

**Created**
- `src/lib/strings.ts`, `src/lib/strings.test.ts`
- `src/lib/store.listening.test.ts`, `store.writing.test.ts`, `store.speaking.test.ts`
- `src/content/writing.ts`, `writing.test.ts`
- `src/content/speaking.ts`, `speaking.test.ts`
- `src/content/vocabulary/<6 new files>` and `src/content/grammar/<6 new files>`
- `src/app/listening/page.tsx`, `src/app/listening/[id]/page.tsx`
- `src/app/writing/page.tsx`, `src/app/writing/[id]/page.tsx`
- `src/app/speaking/page.tsx`, `src/app/speaking/[id]/page.tsx`
- `src/components/listening/*`
- `src/components/writing/*`
- `src/components/speaking/*`

## Execution

Once this design is committed, the implementation plan is produced via `superpowers:writing-plans`, then executed with `superpowers:subagent-driven-development`. Natural parallelization:

- Content authoring fans out per CEFR level (6 streams).
- Skill modes (Listening, Writing, Speaking) build in parallel after the foundation (types + store + strings utility) is in place.

Verification before declaring done: `npm run lint`, `npm test`, `npm run build`, and a dev-server smoke test of each new route.
