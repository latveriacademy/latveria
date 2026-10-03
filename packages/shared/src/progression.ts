export function practiceXP(correctCount: number) {
  return 30 + correctCount * 15;
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
  correctCount: number;
  totalCount: number;
  submittedAt: Date | string;
};
export function learnerSummary(attempts: Attempt[], now = new Date()) {
  // ponytail: O(n) per peserta; pindahkan agregasi ke SQL jika riwayat menjadi sangat besar.
  const totalXP = attempts.reduce((sum, attempt) => sum + practiceXP(attempt.correctCount), 0);
  const todayMs = Date.parse(`${practiceDay(now)}T00:00:00Z`);
  const weekday = new Date(todayMs).getUTCDay();
  const monday = todayMs - ((weekday + 6) % 7) * dayMs;
  const days = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  const weeklyChartData = days.map((day, index) => {
    const date = new Date(monday + index * dayMs).toISOString().slice(0, 10);
    const sessions = attempts.filter((attempt) => practiceDay(attempt.submittedAt) === date);
    const questions = sessions.reduce((sum, attempt) => sum + attempt.totalCount, 0);
    const correct = sessions.reduce((sum, attempt) => sum + attempt.correctCount, 0);
    return {
      day,
      fullDay: date,
      questions,
      correct,
      xp: sessions.reduce((sum, attempt) => sum + practiceXP(attempt.correctCount), 0),
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
