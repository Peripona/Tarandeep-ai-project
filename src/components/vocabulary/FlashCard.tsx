"use client";

import { motion } from "framer-motion";
import { useCallback } from "react";
import type { VocabCard } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AudioButton } from "@/components/ui/AudioButton";

function genderClass(g: VocabCard["gender"]): string {
  if (g === "masculine") return "text-[var(--der)]";
  if (g === "feminine") return "text-[var(--die)]";
  if (g === "neuter") return "text-[var(--das)]";
  return "";
}

export function FlashCard({
  card,
  flipped,
  onFlip,
}: {
  card: VocabCard;
  flipped: boolean;
  onFlip: () => void;
}) {
  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        onFlip();
      }
    },
    [onFlip],
  );

  return (
    <div
      className="mx-auto w-full max-w-lg perspective-[1000px]"
      onKeyDown={handleKey}
      role="button"
      tabIndex={0}
      onClick={onFlip}
      aria-label={flipped ? "Show front" : "Show back"}
    >
      <motion.div
        className="relative h-64 cursor-pointer md:h-72"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
      >
        {/* Front face */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col justify-center rounded-2xl border-2 border-border bg-card p-8 shadow-lg",
            "backface-hidden",
          )}
          style={{ backfaceVisibility: "hidden" }}
        >
          <p className={cn("text-center text-3xl font-bold md:text-4xl", genderClass(card.gender))}>
            {card.german}
          </p>
          {card.gender && (
            <p className="mt-2 text-center text-sm capitalize text-muted-foreground">
              {card.gender}
            </p>
          )}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Tap or Space to flip
          </p>
          <div className="mt-4 flex justify-center">
            <AudioButton text={card.german} />
          </div>
        </div>

        {/* Back face */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col justify-center rounded-2xl border-2 border-border bg-muted/50 p-8 shadow-lg",
          )}
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <p className="text-center text-2xl font-medium text-foreground md:text-3xl">
            {card.english}
          </p>
          <p className="mt-4 text-center text-sm italic text-muted-foreground">
            {card.example}
          </p>
          <p className="mt-1 text-center text-xs text-muted-foreground">{card.exampleEn}</p>
          <div className="mt-4 flex justify-center">
            <AudioButton text={card.example} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
