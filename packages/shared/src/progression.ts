export function practiceXP(correctCount: number, previousBestCorrect: number | null = null) {
  if (previousBestCorrect === null) {
    return 30 + correctCount * 15;
  }
  const improvement = Math.max(0, correctCount - previousBestCorrect);
  const bonus = correctCount > 0 ? 10 : 5;
  return improvement * 15 + bonus;
}

export function levelProgress(totalXP: number) {
  if (!Number.isSafeInteger(totalXP) || totalXP < 0)
    throw new RangeError("EXP harus berupa bilangan bulat nonnegatif.");
  let level = 1;
  let currentXP = totalXP;
  let nextLevelXP = 300;
  while (currentXP >= nextLevelXP) {
    currentXP -= nextLevelXP;
    level++;
    nextLevelXP = Math.round(nextLevelXP * 1.35);
  }
  return { totalXP, level, currentXP, nextLevelXP };
}

const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
export function practiceDay(date: Date | string) {
  const parts = dayFormat.formatToParts(new Date(date));
  return ["year", "month", "day"]
    .map((type) => parts.find((part) => part.type === type)!.value)
    .join("-");
}
const dayMs = 86_400_000;
function previousDay(day: string) {
  return new Date(Date.parse(`${day}T00:00:00Z`) - dayMs).toISOString().slice(0, 10);
}

export function practiceStreak(dates: (Date | string)[], now = new Date()) {
  const days = new Set(dates.map(practiceDay));
  const today = practiceDay(now);
  const practicedToday = days.has(today);
  let day = practicedToday ? today : previousDay(today);
  let streakDays = 0;
  while (days.has(day)) {
    streakDays++;
    day = previousDay(day);
  }
  return { streakDays, practicedToday };
}

type Attempt = {
  topicId: string;
  packageId?: string | null;
  correctCount: number;
  totalCount: number;
  submittedAt: Date | string;
  earnedXP?: number | null;
};
export function learnerSummary(attempts: Attempt[], now = new Date()) {
  // Sort attempts chronologically to calculate anti-farming re-attempt XP if earnedXP is not pre-recorded
  const sorted = [...attempts].sort(
    (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
  );
  const bestByPackage = new Map<string, number>();
  const attemptsWithXP = sorted.map((attempt) => {
    let xp = attempt.earnedXP;
    if (xp == null) {
      const key = attempt.packageId || null;
      if (key) {
        const prevBest = bestByPackage.get(key);
        if (prevBest !== undefined) {
          xp = practiceXP(attempt.correctCount, prevBest);
          bestByPackage.set(key, Math.max(prevBest, attempt.correctCount));
        } else {
          xp = practiceXP(attempt.correctCount);
          bestByPackage.set(key, attempt.correctCount);
        }
      } else {
        xp = practiceXP(attempt.correctCount);
      }
    }
    return { ...attempt, xp };
  });

  const totalXP = attemptsWithXP.reduce((sum, attempt) => sum + attempt.xp, 0);
  const todayMs = Date.parse(`${practiceDay(now)}T00:00:00Z`);
  const weekday = new Date(todayMs).getUTCDay();
  const monday = todayMs - ((weekday + 6) % 7) * dayMs;
  const days = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  const weeklyChartData = days.map((day, index) => {
    const date = new Date(monday + index * dayMs).toISOString().slice(0, 10);
    const sessions = attemptsWithXP.filter((attempt) => practiceDay(attempt.submittedAt) === date);
    const questions = sessions.reduce((sum, attempt) => sum + attempt.totalCount, 0);
    const correct = sessions.reduce((sum, attempt) => sum + attempt.correctCount, 0);
    return {
      day,
      fullDay: date,
      questions,
      correct,
      xp: sessions.reduce((sum, attempt) => sum + attempt.xp, 0),
      accuracy: questions ? Math.round((correct / questions) * 1000) / 10 : 0,
    };
  });
  const weeklyQuestions = weeklyChartData.reduce((sum, day) => sum + day.questions, 0);
  const weeklyCorrect = weeklyChartData.reduce((sum, day) => sum + day.correct, 0);
  return {
    attempts: attempts.length,
    tried: new Set(attempts.map((attempt) => attempt.topicId)).size,
    correct: attempts.reduce((sum, attempt) => sum + attempt.correctCount, 0),
    answered: attempts.reduce((sum, attempt) => sum + attempt.totalCount, 0),
    ...levelProgress(totalXP),
    ...practiceStreak(
      attempts.map((attempt) => attempt.submittedAt),
      now,
    ),
    weeklyChartData,
    weeklyXP: weeklyChartData.reduce((sum, day) => sum + day.xp, 0),
    weeklyAccuracy: weeklyQuestions ? Math.round((weeklyCorrect / weeklyQuestions) * 1000) / 10 : 0,
  };
}
export type LearnerSummary = ReturnType<typeof learnerSummary>;
