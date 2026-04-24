export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type Gender = "masculine" | "feminine" | "neuter" | "plural" | null;

export interface VocabCard {
  id: string;
  german: string;
  english: string;
  gender: Gender;
  example: string;
  exampleEn: string;
  level: CEFRLevel;
  topic: string;
}

export interface VocabDeck {
  id: string;
  title: string;
  level: CEFRLevel;
  topic: string;
  cards: VocabCard[];
}

export type Rating = "again" | "hard" | "good" | "easy";

export interface SRSState {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: string;
  lastReviewed?: string;
}

export interface VocabProgress {
  [cardId: string]: SRSState;
}

export type ExerciseType = "fillBlank" | "multipleChoice" | "wordOrder";

export interface FillBlankExercise {
  id: string;
  type: "fillBlank";
  prompt: string;
  answer: string;
  alternatives?: string[];
  explanation?: string;
}

export interface MultipleChoiceExercise {
  id: string;
  type: "multipleChoice";
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface WordOrderExercise {
  id: string;
  type: "wordOrder";
  words: string[];
  correctOrder: string[];
  explanation?: string;
}

export type GrammarExercise =
  | FillBlankExercise
  | MultipleChoiceExercise
  | WordOrderExercise;

export interface GrammarTableRow {
  cells: string[];
}

export interface GrammarTable {
  headers?: string[];
  rows: GrammarTableRow[];
}

export interface GrammarLesson {
  id: string;
  title: string;
  level: CEFRLevel;
  summary: string;
  sections: {
    heading: string;
    body: string[];
    examples?: { de: string; en: string }[];
    table?: GrammarTable;
  }[];
  exercises: GrammarExercise[];
}

export interface GrammarProgress {
  [lessonId: string]: {
    completed: boolean;
    score: number;
    total: number;
    lastAttempt?: string;
  };
}

export interface ContentProgress {
  completed: boolean;
  score: number;
  total: number;
  lastAttempt: string;
}

export interface ReadingProgress {
  [passageId: string]: ContentProgress;
}

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

export interface ReadingPassage {
  id: string;
  title: string;
  level: CEFRLevel;
  topic: string;
  text: string;
  textEn: string;
  tooltips: Record<string, string>;
  exercises: (MultipleChoiceExercise | FillBlankExercise)[];
}

export interface DailyStats {
  date: string;
  cardsReviewed: number;
  lessonsCompleted: number;
}

export interface UserSettings {
  dailyCardGoal: number;
  dailyLessonGoal: number;
  theme: "light" | "dark" | "system";
  autoPlayAudio: boolean;
  audioRate: number;
  audioVoiceURI: string | null;
}

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

export interface AppActions {
  recordCardReview: (cardId: string, rating: Rating) => void;
  recordLessonComplete: (lessonId: string, score: number, total: number) => void;
  recordReadingComplete: (passageId: string, score: number, total: number) => void;
  recordConversationComplete: (lessonId: string, score: number, total: number) => void;
  setSettings: (partial: Partial<UserSettings>) => void;
  importState: (data: Partial<AppState>) => void;
  resetProgress: () => void;
}

export type AppStore = AppState & AppActions;
