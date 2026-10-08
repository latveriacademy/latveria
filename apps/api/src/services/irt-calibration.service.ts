import { createHash } from "node:crypto";
import { and, asc, count, eq, sql, inArray } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { irtArtifactSchema, type IrtDatasetItem } from "@latveria/shared";
import { getDb } from "../lib/db";
import { user } from "../lib/db/auth-schema";
import {
  irtCalibrations,
  irtDatasets,
  topics,
  tryoutResponses,
  tryoutSessions,
} from "../lib/db/schema";

export async function listIrtCalibrations() {
  const db = getDb();
  return db
    .select({
      id: irtCalibrations.id,
      topicSlug: topics.slug,
      version: irtCalibrations.version,
      active: irtCalibrations.active,
      sampleSize: irtDatasets.sampleSize,
      createdAt: irtCalibrations.createdAt,
      diagnostics: irtCalibrations.diagnostics,
      parameters: irtCalibrations.parameters,
      sourceVersion: irtCalibrations.sourceVersion,
    })
    .from(irtCalibrations)
    .innerJoin(topics, eq(topics.id, irtCalibrations.topicId))
    .innerJoin(irtDatasets, eq(irtDatasets.id, irtCalibrations.datasetId))
    .orderBy(irtCalibrations.createdAt);
}
export async function irtOverview() {
  return getDb()
    .select({
      slug: topics.slug,
      name: topics.name,
      respondents: count(sql`distinct ${user.id}`),
      responses: count(),
    })
    .from(tryoutResponses)
    .innerJoin(tryoutSessions, eq(tryoutSessions.id, tryoutResponses.sessionId))
    .innerJoin(user, eq(user.id, tryoutSessions.userId))
    .innerJoin(topics, eq(topics.id, tryoutResponses.topicId))
    .where(
      and(
        eq(tryoutSessions.state, "completed"),
        eq(user.role, "user"),
        eq(user.isDemo, false),
        eq(tryoutResponses.irtEligible, true),
      ),
    )
    .groupBy(topics.slug, topics.name);
}

export async function exportIrtDataset(slug: string, revisionIds?: string[]) {
  const db = getDb();
  const [topic] = await db.select().from(topics).where(eq(topics.slug, slug));
  if (!topic) throw new HTTPException(400, { message: "Subtes tidak ditemukan." });
  const responses = await db
    .select({
      userId: user.id,
      revisionId: tryoutResponses.revisionId,
      score: tryoutResponses.scoreFraction,
    })
    .from(tryoutResponses)
    .innerJoin(tryoutSessions, eq(tryoutSessions.id, tryoutResponses.sessionId))
    .innerJoin(user, eq(user.id, tryoutSessions.userId))
    .where(
      and(
        eq(tryoutResponses.topicId, topic.id),
        revisionIds ? inArray(tryoutResponses.revisionId, revisionIds) : undefined,
        eq(tryoutResponses.irtEligible, true),
        eq(tryoutSessions.state, "completed"),
        eq(user.role, "user"),
        eq(user.isDemo, false),
      ),
    )
    .orderBy(asc(tryoutResponses.submittedAt), asc(tryoutResponses.id));
  const byUser = new Map<string, Map<string, number>>();
  for (const response of responses) {
    const answers = byUser.get(response.userId) ?? new Map<string, number>();
    // Only the first completed exposure per participant/revision enters calibration.
    if (!answers.has(response.revisionId)) answers.set(response.revisionId, response.score);
    byUser.set(response.userId, answers);
  }
  let ids = [...new Set(responses.map((r) => r.revisionId))].sort();
  let participants = [...byUser.values()];
  let items: IrtDatasetItem[] = [];
  // ponytail: in-memory matrix for local cohorts; stream/export to an offline warehouse for large populations.
  for (;;) {
    items = ids
      .map((revisionId) => {
        const values = participants.flatMap((p) => (p.has(revisionId) ? [p.get(revisionId)!] : []));
        return {
          revisionId,
          responseCount: values.length,
          correctRate: values.length ? values.reduce((n, v) => n + v, 0) / values.length : 0,
        };
      })
      .filter(
        (item) => item.responseCount >= 100 && item.correctRate >= 0.05 && item.correctRate <= 0.95,
      );
    const nextIds = items.map((item) => item.revisionId);
    const nextParticipants = participants.filter(
      (p) => nextIds.filter((id) => p.has(id)).length >= Math.max(5, Math.ceil(nextIds.length / 2)),
    );
    if (nextIds.length === ids.length && nextParticipants.length === participants.length) break;
    ids = nextIds;
    participants = nextParticipants;
  }
  if (participants.length < 200 || items.length < 10)
    throw new HTTPException(409, {
      message: `Data belum cukup untuk kalibrasi: ${participants.length} responden dan ${items.length} soal layak. Dibutuhkan ≥200 responden, ≥10 soal, dan ≥100 respons per soal.`,
    });
  const rows = [...byUser.entries()]
    .filter(([, values]) => participants.includes(values))
    .map(([id, values]) => ({
      participant: createHash("sha256").update(id).digest("hex"),
      responses: ids.map((revisionId) => values.get(revisionId) ?? null),
    }))
    .sort((a, b) => a.participant.localeCompare(b.participant));
  const payload = { topicSlug: slug, items, rows };
  const datasetHash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  await db
    .insert(irtDatasets)
    .values({ topicId: topic.id, datasetHash, items, sampleSize: rows.length })
    .onConflictDoNothing();
  const [dataset] = await db
    .select()
    .from(irtDatasets)
    .where(eq(irtDatasets.datasetHash, datasetHash));
  return { ...payload, datasetId: dataset.id, datasetHash, sampleSize: rows.length };
}

export async function importIrtCalibration(body: unknown) {
  const parsed = irtArtifactSchema.safeParse(body);
  if (!parsed.success)
    throw new HTTPException(400, {
      message: `Artefak kalibrasi tidak valid: ${parsed.error.issues[0].message}`,
    });
  const artifact = parsed.data;
  const db = getDb();
  const [dataset] = await db
    .select()
    .from(irtDatasets)
    .where(eq(irtDatasets.id, artifact.datasetId));
  if (
    !dataset ||
    dataset.datasetHash !== artifact.datasetHash ||
    dataset.sampleSize < 200 ||
    dataset.items.some(
      (item) => item.responseCount < 100 || item.correctRate < 0.05 || item.correctRate > 0.95,
    ) ||
    artifact.parameters.length !== dataset.items.length ||
    dataset.items.some((item) => !artifact.parameters.some((p) => p.revisionId === item.revisionId))
  )
    throw new HTTPException(400, {
      message: "Provenans atau cakupan dataset kalibrasi tidak cocok.",
    });
  const [existing] = await db
    .select()
    .from(irtCalibrations)
    .where(
      and(
        eq(irtCalibrations.topicId, dataset.topicId),
        eq(irtCalibrations.version, artifact.version),
      ),
    );
  if (existing) throw new HTTPException(409, { message: "Versi kalibrasi sudah ada." });
  const [model] = await db
    .insert(irtCalibrations)
    .values({
      topicId: dataset.topicId,
      datasetId: dataset.id,
      version: artifact.version,
      parameters: artifact.parameters,
      diagnostics: artifact.diagnostics,
      sourceVersion: artifact.sourceVersion,
    })
    .returning();
  return { id: model.id, version: model.version, active: model.active };
}
export async function activateIrtCalibration(id: string, active: boolean) {
  return getDb().transaction(async (tx) => {
    const [model] = await tx.select().from(irtCalibrations).where(eq(irtCalibrations.id, id));
    if (!model) throw new HTTPException(404, { message: "Kalibrasi tidak ditemukan." });
    await tx.select().from(topics).where(eq(topics.id, model.topicId)).for("update");
    if (active)
      await tx
        .update(irtCalibrations)
        .set({ active: false })
        .where(eq(irtCalibrations.topicId, model.topicId));
    await tx.update(irtCalibrations).set({ active }).where(eq(irtCalibrations.id, model.id));
    return { id, active };
  });
}
