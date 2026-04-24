"use client";

import { useAppStore } from "@/lib/store";
import { readingPassages } from "@/content/catalog";
import { PassageCard } from "@/components/reading/PassageCard";
import type { CEFRLevel } from "@/lib/types";

const LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function ReadingPage() {
  const readingProgress = useAppStore((s) => s.readingProgress);

  return (
    <div className="space-y-10 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Reading</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Level-appropriate German passages with comprehension exercises.
        </p>
      </div>
      {LEVELS.map((level) => {
        const passages = readingPassages.filter((p) => p.level === level);
        return (
          <section key={level} className="space-y-3">
            <h2 className="text-lg font-semibold">{level}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {passages.map((p) => (
                <PassageCard
                  key={p.id}
                  passage={p}
                  progress={readingProgress[p.id]}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
