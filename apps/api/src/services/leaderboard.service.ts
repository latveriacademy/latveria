import { and, eq, gte, lte } from "drizzle-orm";
import { learnerSummary, type LeaderboardResponse } from "@latveria/shared";
import { getDb } from "../lib/db";
import { user as accounts } from "../lib/db/auth-schema";
import { practiceAnswers, practiceAttempts, topics } from "../lib/db/schema";
import {
  ACCURACY_MIN_ANSWERS,
  getPeriodRange,
  SUBTEST_TO_SLUG,
  type Metric,
  type Period,
  type Subtest,
} from "../lib/leaderboard-utils";

const leaderboardCache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;
export function invalidateLeaderboardCache() {
  leaderboardCache.clear();
}

function getCacheKey(
  userId: string,
  metric: Metric,
  subtest: Subtest,
  period: Period,
  limit: number,
): string {
  return `${userId}:${metric}:${subtest}:${period}:${limit}`;
}

export async function getLeaderboard(
  currentUserId: string,
  params: { metric: Metric; subtest: Subtest; period: Period; limit: number },
): Promise<LeaderboardResponse> {
  const { metric, subtest, period, limit } = params;
  const cacheKey = getCacheKey(currentUserId, metric, subtest, period, limit);
  const cached = leaderboardCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data as LeaderboardResponse;
  }

  const periodRange = getPeriodRange(period);
  const isStreakMetric = metric === "streak";

  const topicSlug = SUBTEST_TO_SLUG[subtest];
  const minAnswers = ACCURACY_MIN_ANSWERS[subtest];

  const db = getDb();

  const allUsers = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      codename: accounts.codename,
      isDemo: accounts.isDemo,
    })
    .from(accounts)
    .where(
      and(
        eq(accounts.isDemo, false),
        eq(accounts.hideFromLeaderboard, false),
        eq(accounts.isDeactivated, false),
        eq(accounts.role, "user"),
      ),
    );

  const userMetrics: Map<
    string,
    {
      id: string;
      name: string;
      codename: string;
      metricValue: number;
      answered: number;
      correct: number;
      accuracy: number;
      streak: number;
      lastAnswerAt: Date;
      level: number;
      totalXP: number;
    }
  > = new Map();

  for (const user of allUsers) {
    userMetrics.set(user.id, {
      id: user.id,
      name: user.codename || user.name,
      codename: user.codename,
      metricValue: 0,
      answered: 0,
      correct: 0,
      accuracy: 0,
      streak: 0,
      lastAnswerAt: new Date(0),
      level: 1,
      totalXP: 0,
    });
  }

  if (isStreakMetric) {
    for (const [userId, data] of userMetrics) {
      const userAttempts = await db
        .select({ submittedAt: practiceAttempts.submittedAt })
        .from(practiceAttempts)
        .where(eq(practiceAttempts.userId, userId))
        .orderBy(practiceAttempts.submittedAt);

      const days = new Set(
        userAttempts.map((a) => {
          const wibDate = new Date(a.submittedAt.getTime() + 7 * 60 * 60 * 1000);
          return `${wibDate.getUTCFullYear()}-${String(wibDate.getUTCMonth() + 1).padStart(2, "0")}-${String(wibDate.getUTCDate()).padStart(2, "0")}`;
        }),
      );

      const now = new Date();
      const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
      const today = `${wibNow.getUTCFullYear()}-${String(wibNow.getUTCMonth() + 1).padStart(2, "0")}-${String(wibNow.getUTCDate()).padStart(2, "0")}`;
      const practicedToday = days.has(today);
      let day = practicedToday
        ? today
        : new Date(wibNow.getTime() - 86_400_000).toISOString().slice(0, 10);
      let streakDays = 0;

      while (days.has(day)) {
        streakDays++;
        day = new Date(Date.parse(day + "T00:00:00Z") - 86_400_000).toISOString().slice(0, 10);
      }

      data.streak = streakDays;
      data.metricValue = streakDays;
    }
  } else {
    const periodConditions = [
      ...(topicSlug ? [eq(topics.slug, topicSlug)] : []),
      ...(period === "all"
        ? []
        : [
            gte(practiceAttempts.submittedAt, periodRange.start),
            lte(practiceAttempts.submittedAt, periodRange.end),
          ]),
    ];
    const periodAttempts = await db
      .select({
        userId: practiceAttempts.userId,
        id: practiceAttempts.id,
        correctCount: practiceAttempts.correctCount,
        totalCount: practiceAttempts.totalCount,
        score: practiceAttempts.score,
        submittedAt: practiceAttempts.submittedAt,
      })
      .from(practiceAttempts)
      .innerJoin(topics, eq(practiceAttempts.topicId, topics.id))
      .where(periodConditions.length ? and(...periodConditions) : undefined);

    const answerConditions = [
      eq(practiceAnswers.isFirstAttempt, true),
      ...(topicSlug ? [eq(topics.slug, topicSlug)] : []),
      ...(period === "all"
        ? []
        : [
            gte(practiceAnswers.submittedAt, periodRange.start),
            lte(practiceAnswers.submittedAt, periodRange.end),
          ]),
    ];
    const answers = await db
      .select({
        userId: practiceAttempts.userId,
        questionId: practiceAnswers.questionId,
        isCorrect: practiceAnswers.isCorrect,
        submittedAt: practiceAnswers.submittedAt,
      })
      .from(practiceAnswers)
      .innerJoin(practiceAttempts, eq(practiceAnswers.attemptId, practiceAttempts.id))
      .innerJoin(topics, eq(practiceAttempts.topicId, topics.id))
      .where(and(...answerConditions));

    const statsByUser = new Map<
      string,
      {
        answerIds: Set<string>;
        correctIds: Set<string>;
        firstAnswerCorrect: number;
        attempts: number;
        periodCorrect: number;
        scoreTotal: number;
        scoreCount: number;
        lastAt: Date;
      }
    >();

    for (const userId of userMetrics.keys()) {
      statsByUser.set(userId, {
        answerIds: new Set(),
        correctIds: new Set(),
        firstAnswerCorrect: 0,
        attempts: 0,
        periodCorrect: 0,
        scoreTotal: 0,
        scoreCount: 0,
        lastAt: new Date(0),
      });
    }

    for (const attempt of periodAttempts) {
      const stats = statsByUser.get(attempt.userId);
      if (!stats) continue;
      stats.attempts++;
      stats.periodCorrect += attempt.correctCount;
      stats.lastAt = attempt.submittedAt > stats.lastAt ? attempt.submittedAt : stats.lastAt;
      stats.scoreTotal +=
        attempt.score ??
        Math.round((attempt.correctCount / Math.max(1, attempt.totalCount)) * 1000);
      stats.scoreCount++;
    }

    for (const answer of answers) {
      const stats = statsByUser.get(answer.userId);
      if (!stats) continue;
      stats.answerIds.add(answer.questionId);
      if (answer.isCorrect) {
        stats.correctIds.add(answer.questionId);
        stats.firstAnswerCorrect++;
      }
      stats.lastAt = answer.submittedAt > stats.lastAt ? answer.submittedAt : stats.lastAt;
    }

    const lifetimeAttempts = await db
      .select({
        userId: practiceAttempts.userId,
        topicId: practiceAttempts.topicId,
        correctCount: practiceAttempts.correctCount,
        totalCount: practiceAttempts.totalCount,
        submittedAt: practiceAttempts.submittedAt,
      })
      .from(practiceAttempts);

    const lifetimeByUser = new Map<string, { attempts: number; correct: number }>();
    for (const attempt of lifetimeAttempts) {
      const stats = lifetimeByUser.get(attempt.userId) ?? { attempts: 0, correct: 0 };
      stats.attempts++;
      stats.correct += attempt.correctCount;
      lifetimeByUser.set(attempt.userId, stats);
    }

    for (const [userId, data] of userMetrics) {
      const stats = statsByUser.get(userId)!;
      const lifetime = lifetimeByUser.get(userId) ?? { attempts: 0, correct: 0 };
      data.answered = stats.answerIds.size;
      data.correct = stats.correctIds.size;
      data.accuracy = data.answered ? Math.round((data.correct / data.answered) * 10000) / 100 : 0;
      data.lastAnswerAt = stats.lastAt;
      data.totalXP = lifetime.attempts * 30 + lifetime.correct * 15;
      data.level = learnerSummary(
        lifetimeAttempts.filter((attempt) => attempt.userId === userId),
      ).level;
      data.metricValue =
        metric === "xp"
          ? stats.attempts * 30 + stats.periodCorrect * 15
          : metric === "answered"
            ? data.answered
            : metric === "correct"
              ? data.correct
              : metric === "accuracy"
                ? data.accuracy
                : stats.scoreCount
                  ? Math.round(stats.scoreTotal / stats.scoreCount)
                  : 0;
    }
  }

  const sortedUsers = Array.from(userMetrics.values()).filter((u) => {
    if (isStreakMetric) return u.metricValue > 0;
    if (metric === "accuracy") return u.answered >= minAnswers && u.metricValue > 0;
    return u.metricValue > 0;
  });

  sortedUsers.sort((a, b) => {
    if (a.metricValue !== b.metricValue) return b.metricValue - a.metricValue;
    if (a.lastAnswerAt.getTime() !== b.lastAnswerAt.getTime())
      return a.lastAnswerAt.getTime() - b.lastAnswerAt.getTime();
    return a.id.localeCompare(b.id);
  });

  const entries = sortedUsers.slice(0, limit).map((u, idx) => {
    const rank = idx + 1;
    const isCurrentUser = u.id === currentUserId;
    return {
      rank,
      id: `LTV-${u.id.slice(0, 4).toUpperCase()}`,
      userId: u.id,
      name: u.name,
      metricValue: u.metricValue,
      level: u.level,
      totalXP: u.totalXP,
      answered: u.answered,
      correct: u.correct,
      accuracy: u.accuracy,
      streak: u.streak,
      isCurrentUser,
    };
  });

  let me = null;
  const userRankIdx = sortedUsers.findIndex((u) => u.id === currentUserId);
  const userData = userMetrics.get(currentUserId);

  if (userData) {
    const needsMore =
      metric === "accuracy" && userData.answered < minAnswers
        ? minAnswers - userData.answered
        : null;

    me = {
      rank: userRankIdx >= 0 ? userRankIdx + 1 : null,
      metricValue: userData.metricValue,
      answered: userData.answered,
      correct: userData.correct,
      accuracy: userData.accuracy,
      streak: userData.streak,
      needsMore,
    };
  }

  const response: LeaderboardResponse = {
    entries,
    me,
    meta: {
      metric,
      subtest,
      period,
      periodStart: periodRange.startWIB,
      periodEnd: periodRange.endWIB,
      generatedAt: new Date().toISOString(),
    },
  };

  leaderboardCache.set(cacheKey, { data: response, expiresAt: Date.now() + CACHE_TTL_MS });

  return response;
}
