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

export type RankTitle = {
  level: number;
  title: string;
  badge: string;
};

export function getRankTitle(level: number): RankTitle {
  if (level >= 8) return { level, title: "Legenda Latveria", badge: "LEGEND" };
  if (level >= 6) return { level, title: "Master Strategi UTBK", badge: "MASTER" };
  if (level >= 5) return { level, title: "Perwira Literasi", badge: "OFFICER" };
  if (level >= 4) return { level, title: "Spesialis Subtes", badge: "SPECIALIST" };
  if (level >= 3) return { level, title: "Ksatria Skolastik", badge: "KNIGHT" };
  if (level >= 2) return { level, title: "Pejuang Latihan", badge: "WARRIOR" };
  return { level: 1, title: "Novis Akademik", badge: "NOVICE" };
}

export type LearnerAchievement = {
  id: string;
  code: string;
  title: string;
  description: string;
  unlocked: boolean;
  currentProgress: number;
  target: number;
  icon: string;
  category: string;
  xpReward: number;
};

export function computeLearnerAchievements(
  summary: {
    attempts?: number;
    streakDays?: number;
    answered?: number;
    correct?: number;
    tried?: number;
    level?: number;
  } | null,
): LearnerAchievement[] {
  const attempts = summary?.attempts ?? 0;
  const streakDays = summary?.streakDays ?? 0;
  const answered = summary?.answered ?? 0;
  const correct = summary?.correct ?? 0;
  const tried = summary?.tried ?? 0;
  const level = summary?.level ?? 1;

  return [
    {
      id: "first-blood",
      code: "ACH-01",
      title: "LANGKAH PERTAMA",
      description: "Selesaikan sesi latihan pertamamu di sistem akademik Latveria.",
      unlocked: attempts >= 1,
      currentProgress: Math.min(attempts, 1),
      target: 1,
      icon: "Crosshair",
      category: "Protokol",
      xpReward: 50,
    },
    {
      id: "consistency-3",
      code: "ACH-02",
      title: "KONSISTENSI TEMPUR",
      description: "Pertahankan 3 hari streak belajar berturut-turut tanpa jeda.",
      unlocked: streakDays >= 3,
      currentProgress: Math.min(streakDays, 3),
      target: 3,
      icon: "Flame",
      category: "Ketahanan",
      xpReward: 100,
    },
    {
      id: "consistency-7",
      code: "ACH-03",
      title: "KSATRIA KETEKUNAN",
      description: "Pertahankan 7 hari streak belajar berturut-turut tanpa jeda.",
      unlocked: streakDays >= 7,
      currentProgress: Math.min(streakDays, 7),
      target: 7,
      icon: "Flame",
      category: "Ketahanan",
      xpReward: 250,
    },
    {
      id: "scholar-100",
      code: "ACH-04",
      title: "INTELEKTUAL MUDA",
      description: "Jawab akumulasi 100 butir soal latihan terstandar.",
      unlocked: answered >= 100,
      currentProgress: Math.min(answered, 100),
      target: 100,
      icon: "Award",
      category: "Kemahiran",
      xpReward: 150,
    },
    {
      id: "accuracy-50",
      code: "ACH-05",
      title: "AKURASI ULUNG",
      description: "Raih akumulasi 50 jawaban benar dari seluruh latihan.",
      unlocked: correct >= 50,
      currentProgress: Math.min(correct, 50),
      target: 50,
      icon: "ShieldCheck",
      category: "Ketelitian",
      xpReward: 200,
    },
    {
      id: "polymath-7",
      code: "ACH-06",
      title: "PENJELAJAH KURIKULUM",
      description: "Coba seluruh 7 domain subtes UTBK terdaftar.",
      unlocked: tried >= 7,
      currentProgress: Math.min(tried, 7),
      target: 7,
      icon: "Layers",
      category: "Kurikulum",
      xpReward: 300,
    },
    {
      id: "ascendant-5",
      code: "ACH-07",
      title: "PAHLAWAN LATVERIA",
      description: "Capai tingkatan Level 5 pada progres akademik.",
      unlocked: level >= 5,
      currentProgress: Math.min(level, 5),
      target: 5,
      icon: "Award",
      category: "Kehormatan",
      xpReward: 500,
    },
  ];
}
