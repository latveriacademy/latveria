import { and, desc, eq, sql } from "drizzle-orm";
import type { TryoutHistoryEntry, UtbkScoreReport } from "@latveria/shared";
import { getDb } from "../../lib/db";
import { questionPackages, tryoutSessions } from "../../lib/db/schema";

export async function getTryoutHistory(userId: string): Promise<TryoutHistoryEntry[]> {
  const rows = await getDb()
    .select({
      id: tryoutSessions.id,
      packageId: tryoutSessions.packageId,
      name: questionPackages.name,
      completedAt: tryoutSessions.completedAt,
      score: tryoutSessions.totalScore,
      scoringVersion: tryoutSessions.scoringVersion,
      method: sql<UtbkScoreReport["method"] | null>`${tryoutSessions.scoreReport}->>'method'`,
      isCompleteUtbk: sql<
        boolean | null
      >`(${tryoutSessions.scoreReport}->>'isCompleteUtbk')::boolean`,
    })
    .from(tryoutSessions)
    .innerJoin(questionPackages, eq(questionPackages.id, tryoutSessions.packageId))
    .where(and(eq(tryoutSessions.userId, userId), eq(tryoutSessions.state, "completed")))
    .orderBy(sql`${tryoutSessions.completedAt} desc nulls last`, desc(tryoutSessions.id));
  return rows.map((row) => ({
    ...row,
    completedAt: row.completedAt?.toISOString() ?? null,
    method: row.scoringVersion === "legacy" ? "legacy" : (row.method ?? "simulation"),
    isCompleteUtbk: row.isCompleteUtbk ?? false,
  }));
}
