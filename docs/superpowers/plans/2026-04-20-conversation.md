# Conversation Sub-project Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Conversation section with 12 situation-based lessons (A1–C2), each containing a scripted dialogue and a key phrases table, followed by comprehension and fill-in-the-blank exercises.

**Architecture:** Content in `src/content/conversations.ts` as a typed array, re-exported via `catalog.ts`. A new Zustand slice (`conversationProgress`) mirrors `readingProgress`. Two new pages (`/conversation`, `/conversation/[conversationId]`) and two components (`ConversationCard`, `ConversationView`) follow the same pattern as the Reading sub-project. Conversation is added to the mobile More drawer alongside Reading.

**Tech Stack:** Next.js 15 App Router, Zustand 5, Vitest 4, Tailwind CSS 4, Radix UI, lucide-react

**Prerequisite:** Reading sub-project must be complete (types, store pattern, and Sidebar More drawer already exist).

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `src/lib/types.ts` | Add `ConversationLesson`, `ConversationProgress` types; update `AppState`/`AppActions`/`AppStore` |
| Create | `src/content/conversations.ts` | 12 conversation lessons (2 per level A1–C2) |
| Modify | `src/content/catalog.ts` | Export `conversationLessons` and `getConversationById` |
| Modify | `src/lib/store.ts` | Add `conversationProgress` state + `recordConversationComplete` action |
| Modify | `src/lib/levelAssessor.ts` | Add conversation score (10% weight) |
| Create | `src/components/conversation/ConversationCard.tsx` | List card: situation, level badge, completion tick |
| Create | `src/components/conversation/ConversationView.tsx` | Dialogue bubbles + phrases table + exercises + save |
| Create | `src/app/conversation/page.tsx` | Conversation list grouped by CEFR level |
| Create | `src/app/conversation/[conversationId]/page.tsx` | Conversation detail page |
| Modify | `src/components/layout/Sidebar.tsx` | Add Conversation to sidebar + More drawer |
| Create | `src/content/conversations.test.ts` | Validate content shape for all 12 lessons |
| Create | `src/lib/store.conversation.test.ts` | Unit test `recordConversationComplete` |

---

## Task 1: Add types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Write failing content test**

Create `src/content/conversations.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { conversationLessons } from "@/content/conversations";
import type { ConversationLesson } from "@/lib/types";

describe("conversation content", () => {
  it("exports exactly 12 lessons", () => {
    expect(conversationLessons).toHaveLength(12);
  });

  it("each lesson has required fields", () => {
    conversationLessons.forEach((l: ConversationLesson) => {
      expect(l.id).toBeTruthy();
      expect(l.title).toBeTruthy();
      expect(l.situation).toBeTruthy();
      expect(["A1","A2","B1","B2","C1","C2"]).toContain(l.level);
      expect(l.dialogue.length).toBeGreaterThanOrEqual(4);
      expect(l.phrases.length).toBeGreaterThanOrEqual(4);
      expect(l.exercises.length).toBeGreaterThanOrEqual(4);
    });
  });

  it("has 2 lessons per level", () => {
    ["A1","A2","B1","B2","C1","C2"].forEach((level) => {
      const count = conversationLessons.filter((l) => l.level === level).length;
      expect(count).toBe(2);
    });
  });

  it("all dialogue lines have speaker A or B", () => {
    conversationLessons.forEach((l) => {
      l.dialogue.forEach((line) => {
        expect(["A","B"]).toContain(line.speaker);
        expect(line.line).toBeTruthy();
        expect(line.lineEn).toBeTruthy();
      });
    });
  });

  it("all phrase entries have german, english, usage", () => {
    conversationLessons.forEach((l) => {
      l.phrases.forEach((p) => {
        expect(p.german).toBeTruthy();
        expect(p.english).toBeTruthy();
        expect(p.usage).toBeTruthy();
      });
    });
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npm run test -- src/content/conversations.test.ts
```

Expected: FAIL — `Cannot find module '@/content/conversations'`

- [ ] **Step 3: Add types to `src/lib/types.ts`**

After the `ReadingProgress` interface, add:

```typescript
export interface ConversationLine {
  speaker: "A" | "B";
  name: string;
  line: string;
  lineEn: string;
}

export interface ConversationPhrase {
  german: string;
  english: string;
  usage: string;
}

export interface ConversationLesson {
  id: string;
  title: string;
  situation: string;
  level: CEFRLevel;
  dialogue: ConversationLine[];
  phrases: ConversationPhrase[];
  exercises: (MultipleChoiceExercise | FillBlankExercise)[];
}

export interface ConversationProgress {
  [lessonId: string]: ContentProgress;
}
```

Update `AppState`:

```typescript
export interface AppState {
  vocabProgress: VocabProgress;
  grammarProgress: GrammarProgress;
  readingProgress: ReadingProgress;
  conversationProgress: ConversationProgress;
  dailyStats: DailyStats[];
  settings: UserSettings;
  lastActiveDate: string;
  streak: number;
}
```

Update `AppActions`:

```typescript
export interface AppActions {
  recordCardReview: (cardId: string, rating: Rating) => void;
  recordLessonComplete: (lessonId: string, score: number, total: number) => void;
  recordReadingComplete: (passageId: string, score: number, total: number) => void;
  recordConversationComplete: (lessonId: string, score: number, total: number) => void;
  setSettings: (partial: Partial<UserSettings>) => void;
  importState: (data: Partial<AppState>) => void;
  resetProgress: () => void;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/content/conversations.test.ts
git commit -m "feat: add ConversationLesson and ConversationProgress types"
```

---

## Task 2: Write conversation content

**Files:**
- Create: `src/content/conversations.ts`

- [ ] **Step 1: Create the file**

```typescript
import type { ConversationLesson } from "@/lib/types";

export const conversationLessons: ConversationLesson[] = [
  // ── A1 ──────────────────────────────────────────────────────────────
  {
    id: "conv-a1-greeting",
    title: "Sich vorstellen",
    situation: "Meeting someone for the first time",
    level: "A1",
    dialogue: [
      { speaker: "A", name: "Anna", line: "Hallo! Ich heiße Anna. Wie heißt du?", lineEn: "Hello! My name is Anna. What is your name?" },
      { speaker: "B", name: "Ben", line: "Hallo, Anna! Ich bin Ben. Woher kommst du?", lineEn: "Hello, Anna! I'm Ben. Where are you from?" },
      { speaker: "A", name: "Anna", line: "Ich komme aus Deutschland. Und du?", lineEn: "I come from Germany. And you?" },
      { speaker: "B", name: "Ben", line: "Ich komme aus England. Wie alt bist du?", lineEn: "I come from England. How old are you?" },
      { speaker: "A", name: "Anna", line: "Ich bin zwanzig Jahre alt. Und du?", lineEn: "I am twenty years old. And you?" },
      { speaker: "B", name: "Ben", line: "Ich bin zweiundzwanzig. Schön, dich kennenzulernen!", lineEn: "I am twenty-two. Nice to meet you!" },
    ],
    phrases: [
      { german: "Wie heißt du?", english: "What is your name?", usage: "Informal — asking someone's name" },
      { german: "Ich heiße …", english: "My name is …", usage: "Introducing yourself" },
      { german: "Woher kommst du?", english: "Where are you from?", usage: "Asking about origin" },
      { german: "Ich komme aus …", english: "I come from …", usage: "Stating your origin" },
      { german: "Wie alt bist du?", english: "How old are you?", usage: "Asking age (informal)" },
      { german: "Schön, dich kennenzulernen!", english: "Nice to meet you!", usage: "Closing a first introduction" },
    ],
    exercises: [
      {
        id: "ca1g-mc1",
        type: "multipleChoice",
        question: "Woher kommt Anna?",
        options: ["England", "Deutschland", "Österreich", "Schweiz"],
        correctIndex: 1,
        explanation: "Anna sagt: 'Ich komme aus Deutschland.'",
      },
      {
        id: "ca1g-mc2",
        type: "multipleChoice",
        question: "Wie alt ist Ben?",
        options: ["Achtzehn", "Zwanzig", "Einundzwanzig", "Zweiundzwanzig"],
        correctIndex: 3,
        explanation: "Ben sagt: 'Ich bin zweiundzwanzig.'",
      },
      {
        id: "ca1g-fb1",
        type: "fillBlank",
        prompt: "Wenn man jemanden zum ersten Mal trifft, sagt man: 'Schön, dich ___!'",
        answer: "kennenzulernen",
        explanation: "'Schön, dich kennenzulernen!' = Nice to meet you!",
      },
      {
        id: "ca1g-fb2",
        type: "fillBlank",
        prompt: "Um nach dem Namen zu fragen, sagt man: 'Wie ___ du?'",
        answer: "heißt",
        explanation: "'Wie heißt du?' ist die Standardfrage nach dem Namen.",
      },
    ],
  },
  {
    id: "conv-a1-cafe",
    title: "Im Café bestellen",
    situation: "Ordering at a café",
    level: "A1",
    dialogue: [
      { speaker: "A", name: "Kellner", line: "Guten Tag! Was möchten Sie bestellen?", lineEn: "Good afternoon! What would you like to order?" },
      { speaker: "B", name: "Kunde", line: "Ich möchte einen Kaffee, bitte.", lineEn: "I would like a coffee, please." },
      { speaker: "A", name: "Kellner", line: "Mit Milch und Zucker?", lineEn: "With milk and sugar?" },
      { speaker: "B", name: "Kunde", line: "Nur mit Milch, bitte. Und ein Stück Kuchen.", lineEn: "Just with milk, please. And a piece of cake." },
      { speaker: "A", name: "Kellner", line: "Das macht drei Euro fünfzig.", lineEn: "That comes to three euros fifty." },
      { speaker: "B", name: "Kunde", line: "Hier ist fünf Euro. Stimmt so!", lineEn: "Here is five euros. Keep the change!" },
    ],
    phrases: [
      { german: "Ich möchte … bitte.", english: "I would like …, please.", usage: "Polite way to order" },
      { german: "Was möchten Sie?", english: "What would you like?", usage: "Waiter asking formal customer" },
      { german: "Das macht … Euro.", english: "That comes to … euros.", usage: "Stating the total price" },
      { german: "Stimmt so!", english: "Keep the change!", usage: "Telling the waiter to keep the tip" },
      { german: "Die Rechnung, bitte.", english: "The bill, please.", usage: "Asking for the bill" },
      { german: "Noch etwas?", english: "Anything else?", usage: "Waiter asking if you want more" },
    ],
    exercises: [
      {
        id: "ca1c-mc1",
        type: "multipleChoice",
        question: "Was bestellt der Kunde?",
        options: [
          "Tee mit Zucker",
          "Kaffee mit Milch und Kuchen",
          "Kaffee mit Zucker",
          "Saft und Kuchen",
        ],
        correctIndex: 1,
        explanation: "Der Kunde bestellt Kaffee mit Milch und ein Stück Kuchen.",
      },
      {
        id: "ca1c-mc2",
        type: "multipleChoice",
        question: "Wie viel kostet die Bestellung?",
        options: ["Zwei Euro", "Drei Euro", "Drei Euro fünfzig", "Fünf Euro"],
        correctIndex: 2,
        explanation: "'Das macht drei Euro fünfzig.'",
      },
      {
        id: "ca1c-fb1",
        type: "fillBlank",
        prompt: "Um höflich zu bestellen, sagt man: 'Ich ___ einen Kaffee, bitte.'",
        answer: "möchte",
        explanation: "'Ich möchte' ist die Standardformel für eine höfliche Bestellung.",
      },
      {
        id: "ca1c-fb2",
        type: "fillBlank",
        prompt: "Wenn man kein Wechselgeld will, sagt man: 'Stimmt ___!'",
        answer: "so",
        explanation: "'Stimmt so!' bedeutet: Keep the change.",
      },
    ],
  },

  // ── A2 ──────────────────────────────────────────────────────────────
  {
    id: "conv-a2-doctor",
    title: "Beim Arzt",
    situation: "At the doctor's office",
    level: "A2",
    dialogue: [
      { speaker: "A", name: "Arzt", line: "Guten Morgen. Was fehlt Ihnen?", lineEn: "Good morning. What is the matter?" },
      { speaker: "B", name: "Patient", line: "Ich habe seit gestern Halsschmerzen und Fieber.", lineEn: "I have had a sore throat and fever since yesterday." },
      { speaker: "A", name: "Arzt", line: "Haben Sie auch Husten oder Schnupfen?", lineEn: "Do you also have a cough or a runny nose?" },
      { speaker: "B", name: "Patient", line: "Ja, ich huste manchmal. Mein Kopf tut auch weh.", lineEn: "Yes, I cough sometimes. My head also hurts." },
      { speaker: "A", name: "Arzt", line: "Ich schreibe Ihnen ein Rezept für Antibiotika.", lineEn: "I will write you a prescription for antibiotics." },
      { speaker: "B", name: "Patient", line: "Muss ich im Bett bleiben?", lineEn: "Do I need to stay in bed?" },
      { speaker: "A", name: "Arzt", line: "Ja, bleiben Sie drei Tage zu Hause und trinken Sie viel Wasser.", lineEn: "Yes, stay home for three days and drink plenty of water." },
    ],
    phrases: [
      { german: "Was fehlt Ihnen?", english: "What is the matter? / What is wrong with you?", usage: "Doctor asking patient (formal)" },
      { german: "Ich habe Schmerzen.", english: "I am in pain. / I have pain.", usage: "Describing pain" },
      { german: "Seit wann haben Sie das?", english: "How long have you had this?", usage: "Asking about duration of symptom" },
      { german: "Ich schreibe Ihnen ein Rezept.", english: "I'll write you a prescription.", usage: "Doctor issuing a prescription" },
      { german: "Ich bin krankgeschrieben.", english: "I have a sick note / I'm signed off sick.", usage: "Telling employer you have a doctor's note" },
      { german: "Nehmen Sie die Tabletten dreimal täglich.", english: "Take the tablets three times a day.", usage: "Dosage instructions" },
    ],
    exercises: [
      {
        id: "ca2d-mc1",
        type: "multipleChoice",
        question: "Welche Symptome hat der Patient?",
        options: [
          "Bauchschmerzen und Fieber",
          "Halsschmerzen, Fieber und Husten",
          "Nur Kopfschmerzen",
          "Fieber und Rückenschmerzen",
        ],
        correctIndex: 1,
        explanation: "Halsschmerzen, Fieber und Husten werden im Dialog erwähnt.",
      },
      {
        id: "ca2d-mc2",
        type: "multipleChoice",
        question: "Wie viele Tage soll der Patient zu Hause bleiben?",
        options: ["Einen Tag", "Zwei Tage", "Drei Tage", "Fünf Tage"],
        correctIndex: 2,
        explanation: "'bleiben Sie drei Tage zu Hause'",
      },
      {
        id: "ca2d-fb1",
        type: "fillBlank",
        prompt: "Der Arzt sagt: 'Ich schreibe Ihnen ein ___ für Antibiotika.'",
        answer: "Rezept",
        explanation: "Ein Rezept = a prescription.",
      },
      {
        id: "ca2d-fb2",
        type: "fillBlank",
        prompt: "Der Arzt fragt: 'Was ___ Ihnen?'",
        answer: "fehlt",
        explanation: "'Was fehlt Ihnen?' ist die typische Frage des Arztes.",
      },
    ],
  },
  {
    id: "conv-a2-directions",
    title: "Nach dem Weg fragen",
    situation: "Asking for directions in the street",
    level: "A2",
    dialogue: [
      { speaker: "A", name: "Tourist", line: "Entschuldigung, wie komme ich zum Bahnhof?", lineEn: "Excuse me, how do I get to the train station?" },
      { speaker: "B", name: "Passant", line: "Gehen Sie diese Straße geradeaus und dann links.", lineEn: "Go straight along this street and then turn left." },
      { speaker: "A", name: "Tourist", line: "Ist das weit von hier?", lineEn: "Is it far from here?" },
      { speaker: "B", name: "Passant", line: "Nein, etwa zehn Minuten zu Fuß.", lineEn: "No, about ten minutes on foot." },
      { speaker: "A", name: "Tourist", line: "Gibt es auch eine Bushaltestelle in der Nähe?", lineEn: "Is there also a bus stop nearby?" },
      { speaker: "B", name: "Passant", line: "Ja, die Haltestelle ist direkt um die Ecke.", lineEn: "Yes, the stop is right around the corner." },
    ],
    phrases: [
      { german: "Wie komme ich zu …?", english: "How do I get to …?", usage: "Asking for directions" },
      { german: "Gehen Sie geradeaus.", english: "Go straight ahead.", usage: "Giving directions" },
      { german: "Biegen Sie links/rechts ab.", english: "Turn left/right.", usage: "Directing someone to turn" },
      { german: "Es ist in der Nähe.", english: "It is nearby.", usage: "Saying something is close" },
      { german: "Um die Ecke.", english: "Around the corner.", usage: "Indicating a nearby location" },
      { german: "Zu Fuß dauert es … Minuten.", english: "It takes … minutes on foot.", usage: "Estimating walking time" },
    ],
    exercises: [
      {
        id: "ca2dir-mc1",
        type: "multipleChoice",
        question: "Wohin möchte der Tourist?",
        options: ["Zur Post", "Zum Supermarkt", "Zum Bahnhof", "Zum Hotel"],
        correctIndex: 2,
        explanation: "'wie komme ich zum Bahnhof?'",
      },
      {
        id: "ca2dir-mc2",
        type: "multipleChoice",
        question: "Wie lange dauert der Weg zu Fuß?",
        options: ["Fünf Minuten", "Zehn Minuten", "Zwanzig Minuten", "Eine halbe Stunde"],
        correctIndex: 1,
        explanation: "'etwa zehn Minuten zu Fuß'",
      },
      {
        id: "ca2dir-fb1",
        type: "fillBlank",
        prompt: "Die Bushaltestelle ist direkt um die ___.",
        answer: "Ecke",
        explanation: "'die Haltestelle ist direkt um die Ecke'",
      },
      {
        id: "ca2dir-fb2",
        type: "fillBlank",
        prompt: "Um nach dem Weg zu fragen: '___, wie komme ich zum Bahnhof?'",
        answer: "Entschuldigung",
        explanation: "Man beginnt eine Frage an Fremde höflich mit 'Entschuldigung'.",
      },
    ],
  },

  // ── B1 ──────────────────────────────────────────────────────────────
  {
    id: "conv-b1-job-interview",
    title: "Das Vorstellungsgespräch",
    situation: "Job interview",
    level: "B1",
    dialogue: [
      { speaker: "A", name: "Interviewer", line: "Erzählen Sie mir etwas über sich.", lineEn: "Tell me something about yourself." },
      { speaker: "B", name: "Bewerber", line: "Ich habe Informatik studiert und drei Jahre als Softwareentwickler gearbeitet.", lineEn: "I studied computer science and worked as a software developer for three years." },
      { speaker: "A", name: "Interviewer", line: "Warum möchten Sie bei uns arbeiten?", lineEn: "Why do you want to work with us?" },
      { speaker: "B", name: "Bewerber", line: "Ich schätze die innovativen Projekte Ihres Unternehmens und möchte meine Kenntnisse einbringen.", lineEn: "I appreciate the innovative projects of your company and would like to contribute my knowledge." },
      { speaker: "A", name: "Interviewer", line: "Welche Stärken und Schwächen haben Sie?", lineEn: "What are your strengths and weaknesses?" },
      { speaker: "B", name: "Bewerber", line: "Ich bin teamfähig und lösungsorientiert, aber manchmal zu perfektionistisch.", lineEn: "I am a team player and solution-oriented, but sometimes too perfectionist." },
    ],
    phrases: [
      { german: "Erzählen Sie mir etwas über sich.", english: "Tell me something about yourself.", usage: "Classic opening question in interviews (formal)" },
      { german: "Ich bringe Erfahrung in … mit.", english: "I bring experience in …", usage: "Highlighting relevant experience" },
      { german: "Meine Stärke ist …", english: "My strength is …", usage: "Describing a positive quality" },
      { german: "Ich arbeite gut im Team.", english: "I work well in a team.", usage: "Highlighting teamwork skills" },
      { german: "Was sind die Aufgaben dieser Stelle?", english: "What are the responsibilities of this position?", usage: "Asking about the role" },
      { german: "Wann würde ich beginnen?", english: "When would I start?", usage: "Asking about start date" },
    ],
    exercises: [
      {
        id: "cb1j-mc1",
        type: "multipleChoice",
        question: "Was hat der Bewerber studiert?",
        options: ["Wirtschaft", "Medizin", "Informatik", "Jura"],
        correctIndex: 2,
        explanation: "'Ich habe Informatik studiert'",
      },
      {
        id: "cb1j-mc2",
        type: "multipleChoice",
        question: "Was ist eine Schwäche des Bewerbers?",
        options: ["Ungeduld", "Perfektionismus", "Schüchternheit", "Unpünktlichkeit"],
        correctIndex: 1,
        explanation: "'manchmal zu perfektionistisch'",
      },
      {
        id: "cb1j-fb1",
        type: "fillBlank",
        prompt: "Der Bewerber sagt er ist 'teamfähig und ___'.",
        answer: "lösungsorientiert",
        explanation: "'teamfähig und lösungsorientiert' = team player and solution-oriented",
      },
      {
        id: "cb1j-fb2",
        type: "fillBlank",
        prompt: "Der Interviewer fragt: 'Warum möchten Sie bei uns ___?'",
        answer: "arbeiten",
        explanation: "Standardfrage im Vorstellungsgespräch.",
      },
    ],
  },
  {
    id: "conv-b1-landlord",
    title: "Wohnung mieten",
    situation: "Discussing a rental apartment with a landlord",
    level: "B1",
    dialogue: [
      { speaker: "A", name: "Vermieter", line: "Die Wohnung hat drei Zimmer, eine Küche und ein Badezimmer.", lineEn: "The apartment has three rooms, a kitchen and a bathroom." },
      { speaker: "B", name: "Mieterin", line: "Wie hoch ist die Kaltmiete?", lineEn: "What is the cold rent?" },
      { speaker: "A", name: "Vermieter", line: "Achthundert Euro kalt, plus hundertfünfzig Euro Nebenkosten.", lineEn: "Eight hundred euros cold rent, plus one hundred and fifty euros additional costs." },
      { speaker: "B", name: "Mieterin", line: "Ist Parkplatz inbegriffen?", lineEn: "Is parking included?" },
      { speaker: "A", name: "Vermieter", line: "Nein, ein Parkplatz kostet dreißig Euro extra pro Monat.", lineEn: "No, a parking space costs thirty euros extra per month." },
      { speaker: "B", name: "Mieterin", line: "Ich würde die Wohnung gerne nehmen. Wie lange ist die Kündigungsfrist?", lineEn: "I would like to take the apartment. How long is the notice period?" },
      { speaker: "A", name: "Vermieter", line: "Drei Monate zum Monatsende.", lineEn: "Three months to the end of the month." },
    ],
    phrases: [
      { german: "Wie hoch ist die Kaltmiete?", english: "What is the rent (excluding utilities)?", usage: "Asking about the base rent" },
      { german: "Nebenkosten", english: "Additional costs / utilities", usage: "Term for heating, water etc. on top of rent" },
      { german: "Ist … inbegriffen?", english: "Is … included?", usage: "Asking if something is part of the deal" },
      { german: "Die Kündigungsfrist beträgt …", english: "The notice period is …", usage: "Stating the notice period" },
      { german: "Ich würde die Wohnung gerne nehmen.", english: "I would like to take the apartment.", usage: "Expressing interest in renting" },
      { german: "Wann könnte ich einziehen?", english: "When could I move in?", usage: "Asking about the move-in date" },
    ],
    exercises: [
      {
        id: "cb1l-mc1",
        type: "multipleChoice",
        question: "Wie viele Zimmer hat die Wohnung?",
        options: ["Zwei", "Drei", "Vier", "Fünf"],
        correctIndex: 1,
        explanation: "'Die Wohnung hat drei Zimmer'",
      },
      {
        id: "cb1l-mc2",
        type: "multipleChoice",
        question: "Was kostet ein Parkplatz extra?",
        options: ["Zwanzig Euro", "Fünfundzwanzig Euro", "Dreißig Euro", "Fünfzig Euro"],
        correctIndex: 2,
        explanation: "'kostet dreißig Euro extra pro Monat'",
      },
      {
        id: "cb1l-fb1",
        type: "fillBlank",
        prompt: "Die Warmmiete besteht aus Kaltmiete plus ___.",
        answer: "Nebenkosten",
        explanation: "Nebenkosten = additional costs / utilities.",
      },
      {
        id: "cb1l-fb2",
        type: "fillBlank",
        prompt: "Die ___ beträgt drei Monate zum Monatsende.",
        answer: "Kündigungsfrist",
        explanation: "Kündigungsfrist = notice period.",
      },
    ],
  },

  // ── B2 ──────────────────────────────────────────────────────────────
  {
    id: "conv-b2-debate",
    title: "Eine Diskussion führen",
    situation: "Debating a political topic",
    level: "B2",
    dialogue: [
      { speaker: "A", name: "Lena", line: "Ich bin der Meinung, dass das Tempolimit auf Autobahnen eingeführt werden sollte.", lineEn: "I am of the opinion that a speed limit should be introduced on motorways." },
      { speaker: "B", name: "Marc", line: "Das sehe ich anders. Ein Tempolimit würde die persönliche Freiheit einschränken.", lineEn: "I see it differently. A speed limit would restrict personal freedom." },
      { speaker: "A", name: "Lena", line: "Aber Studien zeigen, dass ein Tempolimit den CO₂-Ausstoß erheblich reduziert.", lineEn: "But studies show that a speed limit significantly reduces CO₂ emissions." },
      { speaker: "B", name: "Marc", line: "Das stimmt zwar, aber die wirtschaftlichen Folgen wären gravierend.", lineEn: "That may be true, but the economic consequences would be serious." },
      { speaker: "A", name: "Lena", line: "Ich verstehe deinen Punkt, sehe aber langfristig mehr Vorteile als Nachteile.", lineEn: "I understand your point, but I see more advantages than disadvantages in the long term." },
    ],
    phrases: [
      { german: "Ich bin der Meinung, dass …", english: "I am of the opinion that …", usage: "Stating a position formally" },
      { german: "Das sehe ich anders.", english: "I see it differently.", usage: "Politely disagreeing" },
      { german: "Das stimmt zwar, aber …", english: "That may be true, but …", usage: "Conceding a point before countering" },
      { german: "Studien zeigen, dass …", english: "Studies show that …", usage: "Citing evidence" },
      { german: "Ich verstehe deinen Punkt, jedoch …", english: "I understand your point, however …", usage: "Acknowledging before rebutting" },
      { german: "Langfristig gesehen …", english: "In the long term …", usage: "Talking about long-term perspective" },
    ],
    exercises: [
      {
        id: "cb2d-mc1",
        type: "multipleChoice",
        question: "Welches Argument bringt Lena für das Tempolimit?",
        options: [
          "Es erhöht die Sicherheit",
          "Es reduziert den CO₂-Ausstoß",
          "Es spart Spritkosten",
          "Es verbessert den Verkehrsfluss",
        ],
        correctIndex: 1,
        explanation: "'Studien zeigen, dass ein Tempolimit den CO₂-Ausstoß erheblich reduziert.'",
      },
      {
        id: "cb2d-mc2",
        type: "multipleChoice",
        question: "Wie reagiert Marc auf Lenas Argument?",
        options: [
          "Er stimmt vollständig zu",
          "Er ignoriert das Argument",
          "Er räumt es ein, betont aber wirtschaftliche Folgen",
          "Er verlässt die Diskussion",
        ],
        correctIndex: 2,
        explanation: "'Das stimmt zwar, aber die wirtschaftlichen Folgen wären gravierend.'",
      },
      {
        id: "cb2d-fb1",
        type: "fillBlank",
        prompt: "Um einen Standpunkt formal zu äußern, sagt man: 'Ich bin der ___, dass …'",
        answer: "Meinung",
        explanation: "'Ich bin der Meinung, dass' is a formal way to state an opinion.",
      },
      {
        id: "cb2d-fb2",
        type: "fillBlank",
        prompt: "Um einen Punkt einzuräumen, bevor man widerspricht: 'Das stimmt ___, aber …'",
        answer: "zwar",
        explanation: "'Das stimmt zwar, aber' = That may be true, but …",
      },
    ],
  },
  {
    id: "conv-b2-complaint",
    title: "Eine Reklamation",
    situation: "Making a formal complaint",
    level: "B2",
    dialogue: [
      { speaker: "A", name: "Kundin", line: "Ich möchte mich über ein Produkt beschweren, das ich letzte Woche gekauft habe.", lineEn: "I would like to complain about a product I bought last week." },
      { speaker: "B", name: "Mitarbeiter", line: "Das tut mir leid. Was genau ist das Problem?", lineEn: "I am sorry to hear that. What exactly is the problem?" },
      { speaker: "A", name: "Kundin", line: "Das Gerät funktioniert nicht richtig. Es gibt einen Defekt.", lineEn: "The device does not work properly. There is a defect." },
      { speaker: "B", name: "Mitarbeiter", line: "Haben Sie noch die Quittung?", lineEn: "Do you still have the receipt?" },
      { speaker: "A", name: "Kundin", line: "Ja, hier ist sie. Ich bestehe auf einer Rückerstattung oder einem Umtausch.", lineEn: "Yes, here it is. I insist on a refund or an exchange." },
      { speaker: "B", name: "Mitarbeiter", line: "Wir können das Gerät reparieren lassen oder Ihnen ein neues schicken.", lineEn: "We can have the device repaired or send you a new one." },
    ],
    phrases: [
      { german: "Ich möchte mich beschweren über …", english: "I would like to complain about …", usage: "Opening a formal complaint" },
      { german: "Das Produkt ist defekt.", english: "The product is defective.", usage: "Describing a fault" },
      { german: "Ich bestehe auf einer Rückerstattung.", english: "I insist on a refund.", usage: "Demanding a refund firmly" },
      { german: "Können Sie das reparieren?", english: "Can you repair this?", usage: "Asking for a repair" },
      { german: "Haben Sie noch die Quittung?", english: "Do you still have the receipt?", usage: "Asking for proof of purchase" },
      { german: "Wir bitten um Entschuldigung.", english: "We apologise.", usage: "Formal apology from a company" },
    ],
    exercises: [
      {
        id: "cb2c-mc1",
        type: "multipleChoice",
        question: "Was fordert die Kundin?",
        options: [
          "Eine Entschuldigung",
          "Eine Rückerstattung oder einen Umtausch",
          "Einen Rabatt",
          "Eine kostenlose Lieferung",
        ],
        correctIndex: 1,
        explanation: "'Ich bestehe auf einer Rückerstattung oder einem Umtausch.'",
      },
      {
        id: "cb2c-mc2",
        type: "multipleChoice",
        question: "Was bietet der Mitarbeiter als Lösung an?",
        options: [
          "Rückerstattung oder Gutschein",
          "Rabatt auf den nächsten Kauf",
          "Reparatur oder ein neues Gerät",
          "Entschuldigung und nichts weiter",
        ],
        correctIndex: 2,
        explanation: "'das Gerät reparieren lassen oder Ihnen ein neues schicken'",
      },
      {
        id: "cb2c-fb1",
        type: "fillBlank",
        prompt: "Um eine Beschwerde zu beginnen: 'Ich möchte mich über ein Produkt ___.'",
        answer: "beschweren",
        explanation: "'beschweren' = to complain.",
      },
      {
        id: "cb2c-fb2",
        type: "fillBlank",
        prompt: "Das Gerät hat einen ___.",
        answer: "Defekt",
        explanation: "Ein Defekt = a defect/fault.",
      },
    ],
  },

  // ── C1 ──────────────────────────────────────────────────────────────
  {
    id: "conv-c1-negotiation",
    title: "Geschäftsverhandlung",
    situation: "Business negotiation",
    level: "C1",
    dialogue: [
      { speaker: "A", name: "Frau Kohl", line: "Wir würden gerne über die Konditionen des Vertrags sprechen.", lineEn: "We would like to discuss the terms of the contract." },
      { speaker: "B", name: "Herr Bauer", line: "Selbstverständlich. Welche Punkte sind für Sie vorrangig?", lineEn: "Of course. Which points are a priority for you?" },
      { speaker: "A", name: "Frau Kohl", line: "In erster Linie geht es uns um die Lieferfrist und den Preis.", lineEn: "Our primary concerns are the delivery deadline and the price." },
      { speaker: "B", name: "Herr Bauer", line: "Was den Preis betrifft, sind wir bereit, einen Nachlass von fünf Prozent zu gewähren.", lineEn: "Regarding the price, we are prepared to grant a five percent discount." },
      { speaker: "A", name: "Frau Kohl", line: "Das klingt vernünftig. Allerdings benötigen wir eine Lieferung innerhalb von zwei Wochen.", lineEn: "That sounds reasonable. However, we need delivery within two weeks." },
      { speaker: "B", name: "Herr Bauer", line: "Das lässt sich einrichten, sofern Sie die Bestellung bis Freitag bestätigen.", lineEn: "That can be arranged, provided you confirm the order by Friday." },
    ],
    phrases: [
      { german: "In erster Linie geht es uns um …", english: "Our primary concern is …", usage: "Stating the most important point" },
      { german: "Was … betrifft, …", english: "Regarding …, …", usage: "Introducing a specific topic in negotiation" },
      { german: "Wir sind bereit, … zu gewähren.", english: "We are prepared to grant …", usage: "Making a concession formally" },
      { german: "Das lässt sich einrichten.", english: "That can be arranged.", usage: "Agreeing to a request" },
      { german: "Sofern Sie … bestätigen.", english: "Provided that you confirm …", usage: "Setting a condition" },
      { german: "Wir kommen Ihnen entgegen.", english: "We are meeting you halfway.", usage: "Signalling a compromise" },
    ],
    exercises: [
      {
        id: "cc1n-mc1",
        type: "multipleChoice",
        question: "Was sind die Hauptanliegen von Frau Kohl?",
        options: [
          "Qualität und Design",
          "Lieferfrist und Preis",
          "Garantie und Service",
          "Verpackung und Versand",
        ],
        correctIndex: 1,
        explanation: "'In erster Linie geht es uns um die Lieferfrist und den Preis.'",
      },
      {
        id: "cc1n-mc2",
        type: "multipleChoice",
        question: "Unter welcher Bedingung kann Herr Bauer die Lieferfrist erfüllen?",
        options: [
          "Wenn der Preis erhöht wird",
          "Wenn die Bestellung bis Freitag bestätigt wird",
          "Wenn Frau Kohl persönlich kommt",
          "Wenn die Menge reduziert wird",
        ],
        correctIndex: 1,
        explanation: "'sofern Sie die Bestellung bis Freitag bestätigen'",
      },
      {
        id: "cc1n-fb1",
        type: "fillBlank",
        prompt: "Herr Bauer ist bereit, einen Nachlass von fünf ___ zu gewähren.",
        answer: "Prozent",
        explanation: "'einen Nachlass von fünf Prozent zu gewähren'",
      },
      {
        id: "cc1n-fb2",
        type: "fillBlank",
        prompt: "'Das ___ sich einrichten' bedeutet: That can be arranged.",
        answer: "lässt",
        explanation: "'Das lässt sich einrichten' = That can be arranged.",
      },
    ],
  },
  {
    id: "conv-c1-academic",
    title: "Akademische Diskussion",
    situation: "Seminar discussion at university",
    level: "C1",
    dialogue: [
      { speaker: "A", name: "Dozentin", line: "Was halten Sie von der These, dass Sprache unser Denken formt?", lineEn: "What do you think of the thesis that language shapes our thinking?" },
      { speaker: "B", name: "Student", line: "Ich halte die Sapir-Whorf-Hypothese für teilweise überzeugend, aber empirisch umstritten.", lineEn: "I find the Sapir-Whorf hypothesis partially convincing, but empirically contested." },
      { speaker: "A", name: "Dozentin", line: "Können Sie das an einem Beispiel verdeutlichen?", lineEn: "Can you illustrate that with an example?" },
      { speaker: "B", name: "Student", line: "Sprachen mit mehr Farbbegriffen ermöglichen angeblich feinere Farbwahrnehmungen.", lineEn: "Languages with more colour terms allegedly enable more nuanced colour perception." },
      { speaker: "A", name: "Dozentin", line: "Interessant. Welche methodischen Einwände könnte man dagegen vorbringen?", lineEn: "Interesting. What methodological objections could one raise against this?" },
    ],
    phrases: [
      { german: "Ich halte … für …", english: "I consider … to be …", usage: "Giving an academic evaluation" },
      { german: "empirisch umstritten", english: "empirically contested", usage: "Describing a claim disputed by evidence" },
      { german: "Können Sie das verdeutlichen?", english: "Can you clarify/illustrate that?", usage: "Asking for elaboration (formal)" },
      { german: "Methodische Einwände", english: "Methodological objections", usage: "Academic term for critiquing research methods" },
      { german: "Die These besagt, dass …", english: "The thesis states that …", usage: "Introducing an academic argument" },
      { german: "Das lässt sich nicht verallgemeinern.", english: "That cannot be generalised.", usage: "Challenging overgeneralisation" },
    ],
    exercises: [
      {
        id: "cc1a-mc1",
        type: "multipleChoice",
        question: "Wie bewertet der Student die Sapir-Whorf-Hypothese?",
        options: [
          "Vollständig überzeugend",
          "Teilweise überzeugend, aber umstritten",
          "Völlig falsch",
          "Irrelevant für die Sprachwissenschaft",
        ],
        correctIndex: 1,
        explanation: "'teilweise überzeugend, aber empirisch umstritten'",
      },
      {
        id: "cc1a-mc2",
        type: "multipleChoice",
        question: "Was fragt die Dozentin am Ende?",
        options: [
          "Nach weiteren Beispielen",
          "Nach der Quelle der These",
          "Nach methodischen Einwänden",
          "Nach der Geschichte der Hypothese",
        ],
        correctIndex: 2,
        explanation: "'Welche methodischen Einwände könnte man dagegen vorbringen?'",
      },
      {
        id: "cc1a-fb1",
        type: "fillBlank",
        prompt: "Um eine akademische Bewertung auszudrücken: 'Ich ___ die These für überzeugend.'",
        answer: "halte",
        explanation: "'Ich halte … für …' = I consider … to be …",
      },
      {
        id: "cc1a-fb2",
        type: "fillBlank",
        prompt: "Eine Behauptung, die durch Forschung nicht bewiesen ist, ist '___ umstritten'.",
        answer: "empirisch",
        explanation: "'empirisch umstritten' = empirically contested.",
      },
    ],
  },

  // ── C2 ──────────────────────────────────────────────────────────────
  {
    id: "conv-c2-rhetoric",
    title: "Rhetorische Mittel",
    situation: "Analysing a political speech",
    level: "C2",
    dialogue: [
      { speaker: "A", name: "Moderatorin", line: "Sie haben die Rede des Kanzlers analysiert. Welche rhetorischen Mittel haben Sie identifiziert?", lineEn: "You have analysed the Chancellor's speech. What rhetorical devices did you identify?" },
      { speaker: "B", name: "Experte", line: "Auffällig war der häufige Einsatz von Anapher und Klimax, um Emotionen zu steigern.", lineEn: "What stood out was the frequent use of anaphora and climax to intensify emotions." },
      { speaker: "A", name: "Moderatorin", line: "Inwiefern beeinflusst das die persuasive Wirkung der Rede?", lineEn: "In what way does that influence the persuasive effect of the speech?" },
      { speaker: "B", name: "Experte", line: "Anaphern erzeugen einen Rhythmus, der die Zuhörer mitreißt und Kernbotschaften einprägsam macht.", lineEn: "Anaphors create a rhythm that carries the audience along and makes key messages memorable." },
      { speaker: "A", name: "Moderatorin", line: "Und wo sehen Sie Schwächen in der Argumentation?", lineEn: "And where do you see weaknesses in the argumentation?" },
      { speaker: "B", name: "Experte", line: "Die Rede greift stellenweise auf Populismus zurück und vermeidet konkrete politische Aussagen.", lineEn: "The speech resorts to populism in places and avoids concrete political statements." },
    ],
    phrases: [
      { german: "Auffällig war …", english: "What stood out was …", usage: "Highlighting a notable feature" },
      { german: "Inwiefern beeinflusst das …?", english: "In what way does this influence …?", usage: "Probing for nuance (formal)" },
      { german: "Die Argumentation weist Schwächen auf.", english: "The argumentation has weaknesses.", usage: "Critiquing logical flaws" },
      { german: "greift auf … zurück", english: "resorts to …", usage: "Describing use of a rhetorical technique" },
      { german: "Die Kernbotschaft lautet …", english: "The key message is …", usage: "Summarising a central point" },
      { german: "Das lässt mehrere Interpretationen zu.", english: "That allows for multiple interpretations.", usage: "Acknowledging ambiguity in a text" },
    ],
    exercises: [
      {
        id: "cc2r-mc1",
        type: "multipleChoice",
        question: "Welche rhetorischen Mittel identifiziert der Experte?",
        options: [
          "Metapher und Ironie",
          "Anapher und Klimax",
          "Litotes und Hyperbel",
          "Alliteration und Ellipse",
        ],
        correctIndex: 1,
        explanation: "'häufige Einsatz von Anapher und Klimax'",
      },
      {
        id: "cc2r-mc2",
        type: "multipleChoice",
        question: "Was ist laut Experte eine Schwäche der Rede?",
        options: [
          "Zu viele Fremdwörter",
          "Zu komplizierte Sätze",
          "Populismus und fehlende konkrete Aussagen",
          "Zu wenig Emotionen",
        ],
        correctIndex: 2,
        explanation: "'greift stellenweise auf Populismus zurück und vermeidet konkrete politische Aussagen'",
      },
      {
        id: "cc2r-fb1",
        type: "fillBlank",
        prompt: "Anaphern erzeugen einen ___, der die Zuhörer mitreißt.",
        answer: "Rhythmus",
        explanation: "'Anaphern erzeugen einen Rhythmus'",
      },
      {
        id: "cc2r-fb2",
        type: "fillBlank",
        prompt: "'___ war der häufige Einsatz von Anapher.' (= What stood out was …)",
        answer: "Auffällig",
        explanation: "'Auffällig war …' ist ein eleganter Einstieg in eine Analyse.",
      },
    ],
  },
  {
    id: "conv-c2-philosophy",
    title: "Philosophisches Gespräch",
    situation: "Philosophical discussion on language and truth",
    level: "C2",
    dialogue: [
      { speaker: "A", name: "Prof. Stein", line: "Lässt sich Wahrheit sprachlich überhaupt vollständig erfassen?", lineEn: "Can truth be fully captured in language at all?" },
      { speaker: "B", name: "Dr. Vogel", line: "Wittgenstein würde sagen: Wovon man nicht sprechen kann, darüber muss man schweigen.", lineEn: "Wittgenstein would say: Whereof one cannot speak, thereof one must be silent." },
      { speaker: "A", name: "Prof. Stein", line: "Das impliziert eine fundamentale Grenze des Sagbaren. Teilen Sie diese Auffassung?", lineEn: "That implies a fundamental limit of what can be said. Do you share this view?" },
      { speaker: "B", name: "Dr. Vogel", line: "Nicht uneingeschränkt. Sprache kann Annäherungen leisten, auch wenn sie das Referenzobjekt nie vollständig abbildet.", lineEn: "Not unconditionally. Language can achieve approximations, even if it never fully captures the referent." },
      { speaker: "A", name: "Prof. Stein", line: "Das führt uns unweigerlich zur Frage, ob Bedeutung inhärent oder kontextuell konstituiert wird.", lineEn: "That inevitably leads us to the question of whether meaning is inherently or contextually constituted." },
    ],
    phrases: [
      { german: "Lässt sich … überhaupt erfassen?", english: "Can … be captured at all?", usage: "Questioning the feasibility of something fundamentally" },
      { german: "Das impliziert …", english: "That implies …", usage: "Drawing a logical consequence" },
      { german: "Nicht uneingeschränkt.", english: "Not unconditionally / Not entirely.", usage: "Nuanced partial disagreement" },
      { german: "Annäherungen leisten", english: "to achieve approximations", usage: "Describing imperfect but valid attempts" },
      { german: "unweigerlich", english: "inevitably, inescapably", usage: "Describing an inescapable logical consequence" },
      { german: "kontextuell konstituiert", english: "contextually constituted", usage: "Philosophical term for meaning depending on context" },
    ],
    exercises: [
      {
        id: "cc2p-mc1",
        type: "multipleChoice",
        question: "Was ist laut Wittgenstein (im Zitat) das Richtige, wenn man nicht sprechen kann?",
        options: ["Schreiben", "Schweigen", "Zeichnen", "Metaphern verwenden"],
        correctIndex: 1,
        explanation: "'Wovon man nicht sprechen kann, darüber muss man schweigen.'",
      },
      {
        id: "cc2p-mc2",
        type: "multipleChoice",
        question: "Wie verhält sich Dr. Vogel gegenüber Wittgensteins Position?",
        options: [
          "Vollständige Zustimmung",
          "Totale Ablehnung",
          "Differenzierte Teilzustimmung",
          "Gleichgültigkeit",
        ],
        correctIndex: 2,
        explanation: "'Nicht uneingeschränkt' — partielle, nuancierte Zustimmung.",
      },
      {
        id: "cc2p-fb1",
        type: "fillBlank",
        prompt: "Sprache kann ___ leisten, auch wenn sie das Objekt nie vollständig abbildet.",
        answer: "Annäherungen",
        explanation: "Annäherungen = approximations.",
      },
      {
        id: "cc2p-fb2",
        type: "fillBlank",
        prompt: "Prof. Stein fragt: 'Das führt uns ___ zur Frage der Bedeutung.'",
        answer: "unweigerlich",
        explanation: "'unweigerlich' = inevitably.",
      },
    ],
  },
];
```

- [ ] **Step 2: Run the tests — expect them all to pass**

```bash
npm run test -- src/content/conversations.test.ts
```

Expected: all 5 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/content/conversations.ts
git commit -m "feat: add 12 conversation lessons (A1–C2)"
```

---

## Task 3: Update catalog.ts

**Files:**
- Modify: `src/content/catalog.ts`

- [ ] **Step 1: Add conversation exports**

Add to imports in `src/content/catalog.ts`:

```typescript
import type { ConversationLesson } from "@/lib/types";
import { conversationLessons as _conversationLessons } from "./conversations";
```

Add to exports at the bottom:

```typescript
export const conversationLessons: ConversationLesson[] = _conversationLessons;

export function getConversationById(id: string): ConversationLesson | undefined {
  return conversationLessons.find((l) => l.id === id);
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/content/catalog.ts
git commit -m "feat: export conversationLessons and getConversationById from catalog"
```

---

## Task 4: Update Zustand store

**Files:**
- Modify: `src/lib/store.ts`

- [ ] **Step 1: Write failing store test**

Create `src/lib/store.conversation.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test -- src/lib/store.conversation.test.ts
```

Expected: FAIL — `conversationProgress` not on store.

- [ ] **Step 3: Update `src/lib/store.ts`**

Add `ConversationProgress` to imports:

```typescript
import type {
  AppState,
  AppStore,
  ConversationProgress,
  DailyStats,
  GrammarProgress,
  Rating,
  ReadingProgress,
  UserSettings,
  VocabProgress,
} from "./types";
```

Add `conversationProgress: {}` to `initialState`:

```typescript
const initialState: AppState = {
  vocabProgress: {},
  grammarProgress: {},
  readingProgress: {},
  conversationProgress: {},
  dailyStats: [],
  settings: defaultSettings,
  lastActiveDate: todayISO(),
  streak: 0,
};
```

Add `recordConversationComplete` after `recordReadingComplete` inside `create()`:

```typescript
recordConversationComplete: (lessonId: string, score: number, total: number) => {
  const { conversationProgress, dailyStats, lastActiveDate, streak } = get();
  const completed = score >= total * 0.7;
  const prev = conversationProgress[lessonId];
  const newlyCompleted = completed && !prev?.completed;
  const nextConversation: ConversationProgress = {
    ...conversationProgress,
    [lessonId]: {
      completed,
      score,
      total,
      lastAttempt: new Date().toISOString(),
    },
  };
  const { lastActive, streak: nextStreak } = bumpStreak(lastActiveDate, streak);
  const t = todayISO();
  const stats: DailyStats[] = [...dailyStats];
  if (newlyCompleted) {
    const idx = stats.findIndex((d) => d.date === t);
    if (idx >= 0) {
      stats[idx] = { ...stats[idx], lessonsCompleted: stats[idx].lessonsCompleted + 1 };
    } else {
      stats.push({ date: t, cardsReviewed: 0, lessonsCompleted: 1 });
    }
  }
  set({
    conversationProgress: nextConversation,
    dailyStats: stats,
    lastActiveDate: lastActive,
    streak: nextStreak,
  });
},
```

Add `conversationProgress` to `partialize`:

```typescript
partialize: (state) => ({
  vocabProgress: state.vocabProgress,
  grammarProgress: state.grammarProgress,
  readingProgress: state.readingProgress,
  conversationProgress: state.conversationProgress,
  dailyStats: state.dailyStats,
  settings: state.settings,
  lastActiveDate: state.lastActiveDate,
  streak: state.streak,
}),
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm run test -- src/lib/store.conversation.test.ts
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/store.ts src/lib/store.conversation.test.ts
git commit -m "feat: add conversationProgress state and recordConversationComplete action"
```

---

## Task 5: Update levelAssessor

**Files:**
- Modify: `src/lib/levelAssessor.ts`

- [ ] **Step 1: Update `estimateLevel` to accept conversation progress**

Replace the full `src/lib/levelAssessor.ts`:

```typescript
import type { CEFRLevel, ConversationProgress, GrammarProgress, ReadingProgress, VocabProgress } from "./types";
import { isDue } from "./srs";

export const LEVEL_ORDER: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function estimateLevel(
  vocabProgress: VocabProgress,
  grammarProgress: GrammarProgress,
  readingProgress: ReadingProgress,
  conversationProgress: ConversationProgress,
  totalCards: number,
  totalLessons: number,
  totalPassages: number,
  totalConversations: number,
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

  // Weights: vocab 40%, grammar 30%, reading 20%, conversation 10%
  const combined = (vocabScore * 0.4 + grammarScore * 0.3 + readingScore * 0.2 + conversationScore * 0.1) * 100;

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
  totalCards: number,
  totalLessons: number,
  totalPassages: number,
  totalConversations: number,
): Record<CEFRLevel, number> {
  const { percentToNext } = estimateLevel(
    vocabProgress,
    grammarProgress,
    readingProgress,
    conversationProgress,
    totalCards,
    totalLessons,
    totalPassages,
    totalConversations,
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

- [ ] **Step 2: Fix all callers of `estimateLevel` and `levelProgressForAll`**

```bash
grep -r "estimateLevel\|levelProgressForAll" src/ --include="*.tsx" --include="*.ts" -l
```

For each file, add `conversationProgress` and `conversationLessons.length` to the call arguments, following the updated signature above.

- [ ] **Step 3: Update levelAssessor test**

Open `src/lib/levelAssessor.test.ts` and update `estimateLevel` calls to pass the new `conversationProgress` and `totalConversations` args (pass `{}` and `0` for empty):

```typescript
// Replace all estimateLevel(...) calls:
estimateLevel(emptyVocab, emptyGrammar, emptyReading, {}, 100, 20, 12, 12)
```

- [ ] **Step 4: Run all tests**

```bash
npm run test
npx tsc --noEmit
```

Expected: all tests PASS, no TS errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/levelAssessor.ts src/lib/levelAssessor.test.ts
git commit -m "feat: add conversation score (10%) to CEFR level calculation"
```

---

## Task 6: Build ConversationCard component

**Files:**
- Create: `src/components/conversation/ConversationCard.tsx`

- [ ] **Step 1: Create the component**

```typescript
import Link from "next/link";
import { CheckCircle2, MessageSquare } from "lucide-react";
import { LevelBadge } from "@/components/ui/LevelBadge";
import type { ConversationLesson, ContentProgress } from "@/lib/types";

export function ConversationCard({
  lesson,
  progress,
}: {
  lesson: ConversationLesson;
  progress?: ContentProgress;
}) {
  return (
    <Link
      href={`/conversation/${lesson.id}`}
      className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="shrink-0 text-muted-foreground" size={16} />
          <h3 className="font-semibold text-foreground group-hover:text-primary">
            {lesson.title}
          </h3>
        </div>
        {progress?.completed && (
          <CheckCircle2 className="mt-0.5 shrink-0 text-green-500" size={18} />
        )}
      </div>
      <p className="text-xs text-muted-foreground">{lesson.situation}</p>
      <div className="flex items-center gap-2">
        <LevelBadge level={lesson.level} />
        <span className="text-xs text-muted-foreground">
          {lesson.dialogue.length} lines · {lesson.phrases.length} phrases
        </span>
      </div>
      {progress && (
        <p className="text-xs text-muted-foreground">
          Last score: {progress.score}/{progress.total}
        </p>
      )}
    </Link>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/conversation/ConversationCard.tsx
git commit -m "feat: add ConversationCard component"
```

---

## Task 7: Build ConversationView component

**Files:**
- Create: `src/components/conversation/ConversationView.tsx`

- [ ] **Step 1: Create the component**

```typescript
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ConversationLesson } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { FillBlank } from "@/components/grammar/FillBlank";
import { MultipleChoice } from "@/components/grammar/MultipleChoice";
import { Button } from "@/components/ui/button";
import { LevelBadge } from "@/components/ui/LevelBadge";
import { AudioButton } from "@/components/ui/AudioButton";
import { cn } from "@/lib/utils";

export function ConversationView({ lesson }: { lesson: ConversationLesson }) {
  const router = useRouter();
  const recordConversationComplete = useAppStore((s) => s.recordConversationComplete);
  const [showTranslation, setShowTranslation] = useState(false);
  const [scores, setScores] = useState<Record<string, boolean>>({});

  const onAnswer = useCallback((id: string, correct: boolean) => {
    setScores((s) => ({ ...s, [id]: correct }));
  }, []);

  const answered = Object.keys(scores).length;
  const correct = Object.values(scores).filter(Boolean).length;
  const allDone = answered === lesson.exercises.length;
  const pct = allDone ? correct / lesson.exercises.length : 0;

  const handleSave = () => {
    recordConversationComplete(lesson.id, correct, lesson.exercises.length);
    router.push("/conversation");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <LevelBadge level={lesson.level} />
          <span className="text-sm text-muted-foreground">{lesson.situation}</span>
        </div>
        <h1 className="text-2xl font-semibold">{lesson.title}</h1>
      </div>

      {/* Dialogue */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Dialogue</h2>
          <button
            type="button"
            onClick={() => setShowTranslation((v) => !v)}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            {showTranslation ? "Hide translation" : "Show translation"}
          </button>
        </div>
        {lesson.dialogue.map((line, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-3",
              line.speaker === "B" && "flex-row-reverse",
            )}
          >
            <span className="mt-1 shrink-0 text-xs font-semibold text-muted-foreground w-8 text-center">
              {line.name.slice(0, 1)}
            </span>
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                line.speaker === "A"
                  ? "bg-muted text-foreground rounded-tl-sm"
                  : "bg-primary text-primary-foreground rounded-tr-sm",
              )}
            >
              <div className="flex items-start gap-2">
                <span>{line.line}</span>
                <AudioButton text={line.line} />
              </div>
              {showTranslation && (
                <p className="mt-1 text-xs opacity-70">{line.lineEn}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Key Phrases */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Key Phrases</h2>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium">German</th>
                <th className="px-4 py-2 text-left font-medium">English</th>
                <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">Usage</th>
              </tr>
            </thead>
            <tbody>
              {lesson.phrases.map((p, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-4 py-2 font-medium">
                    <div className="flex items-center gap-1.5">
                      {p.german}
                      <AudioButton text={p.german} />
                    </div>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{p.english}</td>
                  <td className="hidden px-4 py-2 text-muted-foreground sm:table-cell">{p.usage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Exercises */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Exercises</h2>
        {lesson.exercises.map((ex) => {
          if (ex.type === "multipleChoice") {
            return <MultipleChoice key={ex.id} exercise={ex} onAnswer={(c) => onAnswer(ex.id, c)} />;
          }
          return <FillBlank key={ex.id} exercise={ex} onAnswer={(c) => onAnswer(ex.id, c)} />;
        })}
      </div>

      {allDone && (
        <div className="rounded-xl border border-border bg-muted/50 p-6 text-center space-y-3">
          <p className="text-lg font-semibold">
            Score: {correct}/{lesson.exercises.length}
            {pct >= 0.7 ? " — Passed!" : " — Keep practising"}
          </p>
          <Button onClick={handleSave}>Save & Back to Conversations</Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/conversation/ConversationView.tsx
git commit -m "feat: add ConversationView with dialogue bubbles, phrases table, and exercises"
```

---

## Task 8: Create /conversation pages

**Files:**
- Create: `src/app/conversation/page.tsx`
- Create: `src/app/conversation/[conversationId]/page.tsx`

- [ ] **Step 1: Create list page**

```typescript
// src/app/conversation/page.tsx
"use client";

import { useAppStore } from "@/lib/store";
import { conversationLessons } from "@/content/catalog";
import { ConversationCard } from "@/components/conversation/ConversationCard";
import type { CEFRLevel } from "@/lib/types";

const LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function ConversationPage() {
  const conversationProgress = useAppStore((s) => s.conversationProgress);

  return (
    <div className="space-y-10 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Conversation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Situation dialogues and key phrases for every level.
        </p>
      </div>
      {LEVELS.map((level) => {
        const lessons = conversationLessons.filter((l) => l.level === level);
        return (
          <section key={level} className="space-y-3">
            <h2 className="text-lg font-semibold">{level}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {lessons.map((l) => (
                <ConversationCard
                  key={l.id}
                  lesson={l}
                  progress={conversationProgress[l.id]}
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

- [ ] **Step 2: Create detail page**

```typescript
// src/app/conversation/[conversationId]/page.tsx
"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { getConversationById } from "@/content/catalog";
import { ConversationView } from "@/components/conversation/ConversationView";

export default function ConversationDetailPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);
  const lesson = getConversationById(conversationId);
  if (!lesson) notFound();
  return (
    <div className="p-4 md:p-6">
      <ConversationView lesson={lesson} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/conversation/page.tsx src/app/conversation/[conversationId]/page.tsx
git commit -m "feat: add /conversation list and detail pages"
```

---

## Task 9: Add Conversation to Sidebar + More drawer

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add Conversation to `moreLinks`**

In `Sidebar.tsx`, find the `moreLinks` array and add the Conversation entry:

```typescript
import { BookOpen, GraduationCap, Home, LineChart, BookMarked, MessageSquare, MoreHorizontal, X } from "lucide-react";

const moreLinks = [
  { href: "/reading", label: "Reading", icon: BookMarked },
  { href: "/conversation", label: "Conversation", icon: MessageSquare },
];
```

- [ ] **Step 2: Run all tests and type check**

```bash
npm run test
npx tsc --noEmit
```

Expected: all PASS, no errors.

- [ ] **Step 3: Commit and push**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat: add Conversation to sidebar and mobile More drawer"
git push
```

---

## Verification checklist

- [ ] `/conversation` lists 12 lessons grouped by level
- [ ] Dialogue renders as chat bubbles (A left, B right)
- [ ] "Show translation" toggle reveals per-line English
- [ ] Audio buttons play each dialogue line and phrase
- [ ] Key phrases table shows German, English, usage columns
- [ ] Exercises score correctly; save button fires after all answered
- [ ] Completed lessons show tick on list page
- [ ] Mobile More drawer now contains both Reading and Conversation
- [ ] `npm run test` — all tests pass
- [ ] `npx tsc --noEmit` — no TypeScript errors
