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
