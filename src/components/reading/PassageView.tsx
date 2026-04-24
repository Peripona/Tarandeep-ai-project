"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ReadingPassage } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { FillBlank } from "@/components/grammar/FillBlank";
import { MultipleChoice } from "@/components/grammar/MultipleChoice";
import { WordTooltip } from "./WordTooltip";
import { Button } from "@/components/ui/button";
import { LevelBadge } from "@/components/progress/LevelBadge";

function renderPassageText(text: string, tooltips: Record<string, string>) {
  if (Object.keys(tooltips).length === 0) return <p>{text}</p>;
  const pattern = new RegExp(`\\b(${Object.keys(tooltips).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "g");
  const parts: (string | { word: string; def: string })[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push({ word: match[0], def: tooltips[match[0]] });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return (
    <p className="leading-8">
      {parts.map((p, i) =>
        typeof p === "string" ? (
          <span key={i}>{p}</span>
        ) : (
          <WordTooltip key={i} word={p.word} definition={p.def} />
        )
      )}
    </p>
  );
}

export function PassageView({ passage }: { passage: ReadingPassage }) {
  const router = useRouter();
  const recordReadingComplete = useAppStore((s) => s.recordReadingComplete);
  const [scores, setScores] = useState<Record<string, boolean>>({});
  const [showEn, setShowEn] = useState(false);

  const onResult = useCallback((id: string, correct: boolean) => {
    setScores((s) => ({ ...s, [id]: correct }));
  }, []);

  const answered = Object.keys(scores).length;
  const correct = Object.values(scores).filter(Boolean).length;
  const allDone = answered === passage.exercises.length;
  const pct = allDone ? correct / passage.exercises.length : 0;

  const handleSave = () => {
    recordReadingComplete(passage.id, correct, passage.exercises.length);
    router.push("/reading");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <LevelBadge level={passage.level} />
          <span className="text-sm text-muted-foreground">{passage.topic}</span>
        </div>
        <h1 className="text-2xl font-semibold">{passage.title}</h1>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 text-base text-foreground">
        {renderPassageText(passage.text, passage.tooltips)}
        <button
          type="button"
          onClick={() => setShowEn((v) => !v)}
          className="mt-4 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          {showEn ? "Hide translation" : "Show translation"}
        </button>
        {showEn && (
          <p className="mt-2 text-sm italic text-muted-foreground">{passage.textEn}</p>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Exercises</h2>
        {passage.exercises.map((ex) => {
          if (ex.type === "multipleChoice") {
            return <MultipleChoice key={ex.id} exercise={ex} onResult={(c) => onResult(ex.id, c)} />;
          }
          return <FillBlank key={ex.id} exercise={ex} onResult={(c) => onResult(ex.id, c)} />;
        })}
      </div>

      {allDone && (
        <div className="rounded-xl border border-border bg-muted/50 p-6 text-center space-y-3">
          <p className="text-lg font-semibold">
            Score: {correct}/{passage.exercises.length}
            {pct >= 0.7 ? " — Passed!" : " — Keep practising"}
          </p>
          <Button onClick={handleSave}>Save & Back to Reading</Button>
        </div>
      )}
    </div>
  );
}
