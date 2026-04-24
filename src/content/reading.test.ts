import { describe, it, expect } from "vitest";
import { readingPassages } from "@/content/reading";
import type { ReadingPassage } from "@/lib/types";

describe("reading content", () => {
  it("exports exactly 12 passages", () => {
    expect(readingPassages).toHaveLength(12);
  });

  it("each passage has required fields", () => {
    readingPassages.forEach((p: ReadingPassage) => {
      expect(p.id).toBeTruthy();
      expect(p.title).toBeTruthy();
      expect(["A1","A2","B1","B2","C1","C2"]).toContain(p.level);
      expect(p.topic).toBeTruthy();
      expect(p.text.length).toBeGreaterThan(50);
      expect(p.textEn.length).toBeGreaterThan(20);
      expect(typeof p.tooltips).toBe("object");
      expect(p.exercises.length).toBeGreaterThanOrEqual(4);
    });
  });

  it("has 2 passages per level", () => {
    const levels = ["A1","A2","B1","B2","C1","C2"];
    levels.forEach((level) => {
      const count = readingPassages.filter((p) => p.level === level).length;
      expect(count).toBe(2);
    });
  });

  it("all exercise ids are unique within a passage", () => {
    readingPassages.forEach((p) => {
      const ids = p.exercises.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  it("multipleChoice exercises have correctIndex in range", () => {
    readingPassages.forEach((p) => {
      p.exercises.forEach((e) => {
        if (e.type === "multipleChoice") {
          expect(e.correctIndex).toBeGreaterThanOrEqual(0);
          expect(e.correctIndex).toBeLessThan(e.options.length);
        }
      });
    });
  });
});
