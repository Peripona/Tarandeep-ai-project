"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAppStore, getDueCardIds } from "@/lib/store";
import { getAllCardIds, grammarLessons, readingPassages, vocabDecks, conversationLessons } from "@/content/catalog";
import { estimateLevel } from "@/lib/levelAssessor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, GraduationCap, LineChart, RotateCcw } from "lucide-react";

export function HomeDashboard() {
  const vocabProgress = useAppStore((s) => s.vocabProgress);
  const grammarProgress = useAppStore((s) => s.grammarProgress);
  const readingProgress = useAppStore((s) => s.readingProgress);
  const conversationProgress = useAppStore((s) => s.conversationProgress);
  const settings = useAppStore((s) => s.settings);
  const dailyStats = useAppStore((s) => s.dailyStats);
  const streak = useAppStore((s) => s.streak);

  const today = new Date().toISOString().slice(0, 10);
  const todayStat = dailyStats.find((d) => d.date === today);

  const dueCount = useMemo(
    () => getDueCardIds(getAllCardIds(), vocabProgress).length,
    [vocabProgress],
  );

  const totalCards = getAllCardIds().length;
  const learned = useMemo(
    () =>
      Object.values(vocabProgress).filter((s) => s && s.repetitions >= 1).length,
    [vocabProgress],
  );

  const lessonsDone = useMemo(
    () => Object.values(grammarProgress).filter((g) => g.completed).length,
    [grammarProgress],
  );

  const { level } = estimateLevel(
    vocabProgress,
    grammarProgress,
    readingProgress,
    conversationProgress,
    totalCards,
    grammarLessons.length,
    readingPassages.length,
    conversationLessons.length,
  );

  const cardGoalPct = Math.min(
    100,
    ((todayStat?.cardsReviewed ?? 0) / settings.dailyCardGoal) * 100,
  );
  const lessonGoalPct = Math.min(
    100,
    settings.dailyLessonGoal > 0
      ? ((todayStat?.lessonsCompleted ?? 0) / settings.dailyLessonGoal) * 100
      : 100,
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Willkommen</h1>
        <p className="text-muted-foreground">
          Your estimated level is <span className="font-semibold text-foreground">{level}</span>.
          Streak: <span className="font-semibold text-foreground">{streak}</span> days.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <RotateCcw className="size-5" />
              Next up
            </CardTitle>
            <CardDescription>
              {dueCount > 0
                ? `${dueCount} vocabulary card${dueCount === 1 ? "" : "s"} due for review.`
                : "No vocabulary reviews due. Study a new deck or come back tomorrow."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/vocabulary/review">Review due</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/vocabulary">Browse decks</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daily goals</CardTitle>
            <CardDescription>
              Cards reviewed: {todayStat?.cardsReviewed ?? 0} / {settings.dailyCardGoal}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Vocabulary reviews</span>
                <span>{Math.round(cardGoalPct)}%</span>
              </div>
              <Progress value={cardGoalPct} className="h-2" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>New grammar lessons</span>
                <span>{Math.round(lessonGoalPct)}%</span>
              </div>
              <Progress value={lessonGoalPct} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="size-4" />
              Vocabulary
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              {learned} / {totalCards} cards practiced
            </p>
            <Button variant="link" className="h-auto px-0" asChild>
              <Link href="/vocabulary">Go to vocabulary →</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="size-4" />
              Grammar
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              {lessonsDone} / {grammarLessons.length} lessons completed
            </p>
            <Button variant="link" className="h-auto px-0" asChild>
              <Link href="/grammar">Go to grammar →</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Suggested deck</CardTitle>
            <CardDescription>Start with greetings if you are new.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={`/vocabulary/${vocabDecks[0]?.id ?? "a1-greetings"}`}>
                Open {vocabDecks[0]?.title ?? "first deck"}
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LineChart className="size-5" />
              Progress & backup
            </CardTitle>
            <CardDescription>
              Streak calendar, level rings, daily goal settings, and JSON export/import.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href="/progress">Open progress dashboard →</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
