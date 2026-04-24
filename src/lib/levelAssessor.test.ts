import { describe, it, expect } from "vitest";
import { estimateLevel } from "@/lib/levelAssessor";
import type { VocabProgress, GrammarProgress, ReadingProgress } from "@/lib/types";

const emptyVocab: VocabProgress = {};
const emptyGrammar: GrammarProgress = {};
const emptyReading: ReadingProgress = {};

describe("estimateLevel", () => {
  it("returns A1 when all progress is empty", () => {
    const { level } = estimateLevel(emptyVocab, emptyGrammar, emptyReading, 100, 20, 12);
    expect(level).toBe("A1");
  });

  it("reading progress contributes 20% weight", () => {
    // 100% reading, 0% vocab, 0% grammar → combined = 0.2 * 100 = 20 → A2
    const fullReading: ReadingProgress = Object.fromEntries(
      Array.from({ length: 12 }, (_, i) => [
        `p${i}`,
        { completed: true, score: 5, total: 5, lastAttempt: "2026-01-01T00:00:00.000Z" },
      ])
    );
    const { level } = estimateLevel(emptyVocab, emptyGrammar, fullReading, 100, 20, 12);
    expect(level).toBe("A2");
  });

  it("percentToNext is finite", () => {
    const { percentToNext } = estimateLevel(emptyVocab, emptyGrammar, emptyReading, 0, 0, 0);
    expect(Number.isFinite(percentToNext)).toBe(true);
  });
});
