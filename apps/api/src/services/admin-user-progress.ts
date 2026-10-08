import { inArray } from "drizzle-orm";
import { learnerSummary, practiceDay } from "@latveria/shared";
import { getDb } from "../lib/db";
import { practiceAttempts } from "../lib/db/schema";

export async function getUserProgress(userIds: string[]) {
  const attempts = userIds.length
    ? await getDb().select().from(practiceAttempts).where(inArray(practiceAttempts.userId, userIds))
    : [];
  return new Map(
    userIds.map((id) => {
      const rows = attempts.filter((attempt) => attempt.userId === id);
      const days = [...new Set(rows.map((row) => practiceDay(row.submittedAt)))].sort();
      let longestStreak = 0;
      let streak = 0;
      for (const [index, day] of days.entries()) {
        streak =
          index > 0 && Date.parse(day) - Date.parse(days[index - 1]) === 86400000 ? streak + 1 : 1;
        longestStreak = Math.max(longestStreak, streak);
      }
      return [
        id,
        {
          ...learnerSummary(rows),
          longestStreak,
          timeSpent: rows.reduce((sum, row) => sum + (row.timeSpentSeconds ?? 0), 0),
        },
      ];
    }),
  );
}
