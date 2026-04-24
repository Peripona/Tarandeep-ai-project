"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { estimateLevel } from "@/lib/levelAssessor";
import { getAllCardIds, grammarLessons, readingPassages } from "@/content/catalog";

export function Header() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const streak = useAppStore((s) => s.streak);
  const setSettings = useAppStore((s) => s.setSettings);
  const vocabProgress = useAppStore((s) => s.vocabProgress);
  const grammarProgress = useAppStore((s) => s.grammarProgress);
  const readingProgress = useAppStore((s) => s.readingProgress);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalCards = getAllCardIds().length;
  const { level } = estimateLevel(
    vocabProgress,
    grammarProgress,
    readingProgress,
    totalCards,
    grammarLessons.length,
    readingPassages.length,
  );

  const dark = mounted && (resolvedTheme === "dark" || theme === "dark");

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4 md:px-6">
      <Link href="/" className="font-semibold md:hidden">
        <span className="text-destructive">Deutsch</span> Tutor
      </Link>
      <div className="ml-auto flex items-center gap-2">
        <Badge variant="secondary" className="font-mono text-xs">
          {level}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {streak} day streak
        </Badge>
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            type="button"
            aria-label="Toggle theme"
            onClick={() => {
              const next = dark ? "light" : "dark";
              setTheme(next);
              setSettings({ theme: next });
            }}
          >
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        )}
      </div>
    </header>
  );
}
