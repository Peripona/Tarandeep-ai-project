"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Rating, VocabCard } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { useAudio } from "@/lib/useAudio";
import { FlashCard } from "./FlashCard";
import { RatingButtons } from "./RatingButtons";
import { Button } from "@/components/ui/button";

const keyToRating: Record<string, Rating> = {
  "1": "again",
  "2": "hard",
  "3": "good",
  "4": "easy",
};

export function StudySession({
  cards,
  title,
  finishHref = "/vocabulary",
}: {
  cards: VocabCard[];
  title: string;
  finishHref?: string;
}) {
  const router = useRouter();
  const recordCardReview = useAppStore((s) => s.recordCardReview);
  const autoPlayAudio = useAppStore((s) => s.settings.autoPlayAudio);
  const { speak, stop } = useAudio();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [jumping, setJumping] = useState(false);
  const [jumpValue, setJumpValue] = useState("");
  const jumpInputRef = useRef<HTMLInputElement>(null);

  const card = cards[index];
  const done = index >= cards.length;

  const goTo = useCallback(
    (n: number) => {
      const clamped = Math.max(0, Math.min(cards.length - 1, n));
      setIndex(clamped);
    },
    [cards.length],
  );

  const onRate = useCallback(
    (r: Rating) => {
      if (!flipped || !card) return;
      recordCardReview(card.id, r);
      setFlipped(false);
      setIndex((i) => i + 1);
    },
    [card, flipped, recordCardReview],
  );

  const openJump = () => {
    setJumpValue(String(index + 1));
    setJumping(true);
  };

  const commitJump = () => {
    const n = parseInt(jumpValue, 10);
    if (!isNaN(n)) goTo(n - 1);
    setJumping(false);
  };

  useEffect(() => {
    if (jumping) jumpInputRef.current?.select();
  }, [jumping]);

  useEffect(() => {
    setFlipped(false);
  }, [index]);

  // Auto-play German word when a new card appears
  useEffect(() => {
    if (autoPlayAudio && card) speak(card.german);
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Auto-play example sentence when card flips to back
  useEffect(() => {
    if (autoPlayAudio && flipped && card) speak(card.example);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't steal keys when the jump input is focused
      if (jumping) return;
      if (done) return;

      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
      if (flipped && keyToRating[e.key]) {
        e.preventDefault();
        onRate(keyToRating[e.key]);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(index - 1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(index + 1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [done, flipped, index, jumping, onRate, goTo]);

  if (cards.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        No cards in this session.
        <div className="mt-4">
          <Button variant="outline" onClick={() => router.push(finishHref)}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg space-y-6 text-center">
        <h2 className="text-2xl font-semibold">Session complete</h2>
        <p className="text-muted-foreground">
          You reviewed {cards.length} card{cards.length === 1 ? "" : "s"} in {title}.
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={() => goTo(cards.length - 1)}>
            ← Back to last card
          </Button>
          <Button onClick={() => router.push(finishHref)}>Continue</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header row */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{title}</span>

        {/* Navigation controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            aria-label="Previous card"
            className="inline-flex items-center rounded p-1 transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>

          {jumping ? (
            <input
              ref={jumpInputRef}
              type="number"
              min={1}
              max={cards.length}
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              onBlur={commitJump}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitJump();
                if (e.key === "Escape") setJumping(false);
              }}
              className="w-10 rounded border border-border bg-background px-1 py-0.5 text-center text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          ) : (
            <button
              type="button"
              onClick={openJump}
              title="Click to jump to a card"
              className="rounded px-1 tabular-nums hover:text-foreground"
            >
              {index + 1}
            </button>
          )}

          <span>/ {cards.length}</span>

          <button
            type="button"
            onClick={() => goTo(index + 1)}
            disabled={index === cards.length - 1}
            aria-label="Next card"
            className="inline-flex items-center rounded p-1 transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <FlashCard card={card} flipped={flipped} onFlip={() => setFlipped((f) => !f)} />

      <div className="space-y-2">
        <p className="text-center text-sm text-muted-foreground">
          {flipped ? "How well did you remember?" : "Flip the card, then rate."}
        </p>
        <div className={!flipped ? "pointer-events-none opacity-40" : ""}>
          <RatingButtons onRate={onRate} />
        </div>
      </div>
    </div>
  );
}
