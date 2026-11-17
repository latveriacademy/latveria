import { and, desc, eq, sql } from "drizzle-orm";
import type { TryoutHistoryEntry, UtbkScoreReport } from "@latveria/shared";
import { idSchema } from "@latveria/shared";
import { HTTPException } from "hono/http-exception";
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

export async function deleteTryoutSession(
  userId: string,
  sessionId: string,
): Promise<{ success: true }> {
  const sId = idSchema.safeParse(sessionId);
  if (!sId.success) throw new HTTPException(400, { message: "ID sesi tidak valid." });

  const db = getDb();
  return db.transaction(async (tx) => {
    const [session] = await tx
      .select()
      .from(tryoutSessions)
      .where(and(eq(tryoutSessions.id, sId.data), eq(tryoutSessions.userId, userId)))
      .for("update");

    if (!session) throw new HTTPException(404, { message: "Sesi tryout tidak ditemukan." });
    if (session.state !== "completed")
      throw new HTTPException(409, {
        message: "Hanya sesi yang sudah selesai yang dapat dihapus.",
      });

    await tx.delete(tryoutSessions).where(eq(tryoutSessions.id, sId.data));
    return { success: true };
  });
}
