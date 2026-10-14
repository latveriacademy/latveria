import { createHash } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDb } from "../../lib/db";
import { questions, questionRevisions, irtCalibrations, tryoutSessions } from "../../lib/db/schema";
import type { SectionCalibration } from "@latveria/shared";

type Writer = Pick<ReturnType<typeof getDb>, "select" | "insert">;
export async function snapshotTryoutQuestions(db: Writer, sets: Record<string, string[]>) {
  const ids = [...new Set(Object.values(sets).flat())];
  const rows = ids.length
    ? await db.select().from(questions).where(inArray(questions.id, ids)).for("share")
    : [];
  if (rows.length !== ids.length)
    throw new HTTPException(409, { message: "Soal berubah sebelum sesi dimulai." });
  const sourceIds = rows.flatMap((q) => (!q.passage && q.passageId ? [q.passageId] : []));
  const sources = sourceIds.length
    ? await db.select().from(questions).where(inArray(questions.id, sourceIds)).for("share")
    : [];
  const records = rows.map((q) => {
    const snapshot = {
      ...q,
      passage:
        q.passage ||
        q.stimulus?.passage ||
        sources.find((source) => source.id === q.passageId)?.passage ||
        sources.find((source) => source.id === q.passageId)?.stimulus?.passage ||
        null,
    };
    const { packageId, order, subtestOrder, passageId, ...content } = snapshot;
    void packageId;
    void order;
    void subtestOrder;
    void passageId;
    return {
      questionId: q.id,
      topicId: q.topicId,
      snapshot,
      contentHash: createHash("sha256").update(JSON.stringify(content)).digest("hex"),
    };
  });
  if (records.length) await db.insert(questionRevisions).values(records).onConflictDoNothing();
  const revisions = records.length
    ? await db
        .select()
        .from(questionRevisions)
        .where(
          and(
            inArray(questionRevisions.questionId, ids),
            inArray(
              questionRevisions.contentHash,
              records.map((r) => r.contentHash),
            ),
          ),
        )
    : [];
  const revisionSets = Object.fromEntries(revisions.map((r) => [r.questionId, r.id]));
  const topicIds = Object.keys(sets);
  const models = topicIds.length
    ? await db
        .select()
        .from(irtCalibrations)
        .where(and(eq(irtCalibrations.active, true), inArray(irtCalibrations.topicId, topicIds)))
    : [];
  const scoringPlan: Record<string, SectionCalibration> = Object.fromEntries(
    models.map((m) => [m.topicId, { id: m.id, version: m.version, parameters: m.parameters }]),
  );
  return { revisionSets, scoringPlan, scoringVersion: "utbk-simulation-v1" };
}

export async function revisionQuestions(
  session: typeof tryoutSessions.$inferSelect,
  ids: string[],
  db: Pick<ReturnType<typeof getDb>, "select"> = getDb(),
) {
  const revisionIds = ids.map((id) => session.revisionSets[id]);
  if (revisionIds.some((id) => !id))
    throw new HTTPException(409, { message: "Versi soal sesi tidak tersedia." });
  const revisions = revisionIds.length
    ? await db.select().from(questionRevisions).where(inArray(questionRevisions.id, revisionIds))
    : [];
  if (revisions.length !== revisionIds.length)
    throw new HTTPException(409, { message: "Versi soal sesi berubah." });
  return revisionIds.map((id) => revisions.find((r) => r.id === id)!.snapshot);
}

export function publicTryoutSession(session: typeof tryoutSessions.$inferSelect) {
  const { scoringPlan, revisionSets, ...result } = session;
  void scoringPlan;
  void revisionSets;
  return result;
}
