import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { LevelBadge } from "@/components/progress/LevelBadge";
import type { ReadingPassage, ContentProgress } from "@/lib/types";

export function PassageCard({
  passage,
  progress,
}: {
  passage: ReadingPassage;
  progress?: ContentProgress;
}) {
  return (
    <Link
      href={`/reading/${passage.id}`}
      className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-foreground group-hover:text-primary">
          {passage.title}
        </h3>
        {progress?.completed && (
          <CheckCircle2 className="mt-0.5 shrink-0 text-green-500" size={18} />
        )}
      </div>
      <div className="flex items-center gap-2">
        <LevelBadge level={passage.level} />
        <span className="text-xs text-muted-foreground">{passage.topic}</span>
      </div>
      {progress && (
        <p className="text-xs text-muted-foreground">
          Last score: {progress.score}/{progress.total}
        </p>
      )}
    </Link>
  );
}
