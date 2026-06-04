"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAppStore, getDueCardIds } from "@/lib/store";
import { getAllCardIds, grammarLessons, readingPassages, conversationLessons } from "@/content/catalog";
import { estimateLevel, levelProgressForAll, LEVEL_ORDER } from "@/lib/levelAssessor";
import { StatsCard } from "@/components/progress/StatsCard";
import { LevelBadge } from "@/components/progress/LevelBadge";
import { ProgressRing } from "@/components/progress/ProgressRing";
import { StreakCalendar } from "@/components/progress/StreakCalendar";
import { DataExport } from "@/components/settings/DataExport";
import { GoalSettings } from "@/components/settings/GoalSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Flame, Target, TrendingUp } from "lucide-react";

export default function ProgressPage() {
  const vocabProgress = useAppStore((s) => s.vocabProgress);
  const grammarProgress = useAppStore((s) => s.grammarProgress);
  const readingProgress = useAppStore((s) => s.readingProgress);
  const conversationProgress = useAppStore((s) => s.conversationProgress);
  const dailyStats = useAppStore((s) => s.dailyStats);
  const streak = useAppStore((s) => s.streak);
  const settings = useAppStore((s) => s.settings);

  const allCardIds = useMemo(() => getAllCardIds(), []);
  const dueIds = useMemo(
    () => getDueCardIds(allCardIds, vocabProgress),
    [allCardIds, vocabProgress],
  );

  const learned = useMemo(
    () =>
      allCardIds.filter((id) => {
        const st = vocabProgress[id];
        return st && st.repetitions >= 1;
      }).length,
    [allCardIds, vocabProgress],
  );

  const totalLessons = grammarLessons.length;

  const withAttempts = Object.values(grammarProgress).filter((p) => p.total > 0);
  const totalAttempts = withAttempts.reduce((a, p) => a + p.total, 0);
  const totalCorrect = withAttempts.reduce((a, p) => a + p.score, 0);
  const accuracy =
    totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  const { level } = estimateLevel(
    vocabProgress,
    grammarProgress,
    readingProgress,
    conversationProgress,
    allCardIds.length,
    totalLessons,
    readingPassages.length,
    conversationLessons.length,
  );

  const rings = levelProgressForAll(
    level,
    vocabProgress,
    grammarProgress,
    readingProgress,
    conversationProgress,
    allCardIds.length,
    totalLessons,
    readingPassages.length,
    conversationLessons.length,
  );

  const today = new Date().toISOString().slice(0, 10);
  const todayStat = dailyStats.find((d) => d.date === today);
  const cardsToday = todayStat?.cardsReviewed ?? 0;
  const lessonsToday = todayStat?.lessonsCompleted ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Progress</h1>
        <p className="text-muted-foreground text-sm">
          Track vocabulary, grammar, and streaks — all stored locally.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <LevelBadge level={level} />
        <Button asChild variant="outline" size="sm">
          <Link href="/vocabulary/review">Review due cards</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/grammar">Continue grammar</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Words learned"
          value={learned}
          description={`of ${allCardIds.length} in A1 decks`}
          icon={BookOpen}
        />
        <StatsCard
          title="Due for review"
          value={dueIds.length}
          description="SRS queue"
          icon={Target}
        />
        <StatsCard
          title="Current streak"
          value={`${streak} days`}
          description="Practice daily"
          icon={Flame}
        />
        <StatsCard
          title="Grammar accuracy"
          value={`${accuracy}%`}
          description={
            totalAttempts > 0
              ? `${totalCorrect}/${totalAttempts} exercise answers`
              : "Complete a lesson to track"
          }
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily goals</CardTitle>
            <p className="text-muted-foreground text-sm">
              Today: {cardsToday} / {settings.dailyCardGoal} cards · {lessonsToday} /{" "}
              {settings.dailyLessonGoal} new lessons
            </p>
          </CardHeader>
          <CardContent>
            <GoalSettings />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Backup & restore</CardTitle>
            <p className="text-muted-foreground text-sm">
              Export JSON to backup progress or import on another device.
            </p>
          </CardHeader>
          <CardContent>
            <DataExport />
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-medium">CEFR level progress</h2>
        <div className="flex flex-wrap items-end justify-center gap-8 py-4">
          {LEVEL_ORDER.map((l) => (
            <ProgressRing key={l} label={l} value={rings[l]} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-medium">Activity (last 90 days)</h2>
        <StreakCalendar days={90} />
      </div>
    </div>
  );
}
