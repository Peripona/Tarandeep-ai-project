import type { CEFRLevel, GrammarProgress, ReadingProgress, VocabProgress } from "./types";
import { isDue } from "./srs";

export const LEVEL_ORDER: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function estimateLevel(
  vocabProgress: VocabProgress,
  grammarProgress: GrammarProgress,
  readingProgress: ReadingProgress,
  totalCards: number,
  totalLessons: number,
  totalPassages: number,
): { level: CEFRLevel; percentToNext: number } {
  const masteredCards = Object.values(vocabProgress).filter(
    (s) => s.repetitions >= 2 && !isDue(s),
  ).length;
  const vocabScore = totalCards > 0 ? masteredCards / totalCards : 0;

  const completedLessons = Object.values(grammarProgress).filter((g) => g.completed).length;
  const grammarScore = totalLessons > 0 ? completedLessons / totalLessons : 0;

  const completedPassages = Object.values(readingProgress).filter((r) => r.completed).length;
  const readingScore = totalPassages > 0 ? completedPassages / totalPassages : 0;

  // Weights: vocab 40%, grammar 30%, reading 20%, conversation placeholder 10% (defaults to 0)
  const combined = (vocabScore * 0.4 + grammarScore * 0.3 + readingScore * 0.2) * 100;

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
  totalCards: number,
  totalLessons: number,
  totalPassages: number,
): Record<CEFRLevel, number> {
  const { percentToNext } = estimateLevel(
    vocabProgress,
    grammarProgress,
    readingProgress,
    totalCards,
    totalLessons,
    totalPassages,
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
