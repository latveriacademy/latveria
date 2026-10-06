import { desc, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import {
  affirmationSchema,
  idSchema,
  profileSchema,
  questionReportSchema,
  type Affirmation,
  type Profile,
  type QuestionReportItem,
} from "@latveria/shared";
import { getDb } from "../lib/db";
import { user as accounts } from "../lib/db/auth-schema";
import {
  affirmations,
  questionPackages,
  questionReports,
  questions,
  systemConfig,
} from "../lib/db/schema";

const profileFields = {
  name: accounts.name,
  codename: accounts.codename,
  targetUniversity: accounts.targetUniversity,
  bio: accounts.bio,
  motto: accounts.motto,
  image: accounts.image,
};

export async function getLearnerProfile(userId: string): Promise<Profile> {
  const [profile] = await getDb()
    .select(profileFields)
    .from(accounts)
    .where(eq(accounts.id, userId));
  if (!profile) throw new HTTPException(404, { message: "Profil tidak ditemukan." });
  return profile;
}

export async function updateLearnerProfile(userId: string, body: unknown): Promise<Profile> {
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) throw new HTTPException(400, { message: parsed.error.issues[0].message });
  const [profile] = await getDb()
    .update(accounts)
    .set(parsed.data)
    .where(eq(accounts.id, userId))
    .returning(profileFields);
  if (!profile) throw new HTTPException(404, { message: "Profil tidak ditemukan." });
  return profile;
}

export async function getLearnerConfigs() {
  const rows = await getDb().select().from(systemConfig);
  const cfg = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    utbkTargetDate: cfg["utbk_target_date"] || "2027-04-17",
    utbkTimezone: cfg["utbk_timezone"] || "Asia/Jakarta",
    breakDurationMinutes: Number(cfg["break_duration_minutes"] || 15),
    scoreMax: Number(cfg["score_max"] || 1000),
  };
}

export async function getAdminConfigs() {
  const rows = await getDb().select().from(systemConfig);
  return rows.map((r) => ({
    ...r,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function updateAdminConfig(key: string, value: string) {
  const [updated] = await getDb()
    .insert(systemConfig)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: systemConfig.key,
      set: { value, updatedAt: new Date() },
    })
    .returning();
  return { ...updated, updatedAt: updated.updatedAt.toISOString() };
}

export async function getAffirmations(activeOnly = true): Promise<Affirmation[]> {
  const rows = await getDb()
    .select()
    .from(affirmations)
    .where(activeOnly ? eq(affirmations.active, true) : undefined)
    .orderBy(desc(affirmations.createdAt));
  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function createAffirmation(body: unknown) {
  const parsed = affirmationSchema.safeParse(body);
  if (!parsed.success)
    throw new HTTPException(400, {
      message: parsed.error.issues[0]?.message ?? "Data afirmasi tidak valid.",
    });
  const [created] = await getDb()
    .insert(affirmations)
    .values({
      affirmation: parsed.data.affirmation,
      author: parsed.data.author ?? null,
      active: parsed.data.active ?? true,
    })
    .returning();
  return {
    ...created,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  };
}

export async function updateAffirmation(idParam: string, body: unknown) {
  const id = idSchema.safeParse(idParam);
  if (!id.success) throw new HTTPException(404, { message: "ID tidak valid." });
  const parsed = affirmationSchema.partial().safeParse(body);
  if (!parsed.success)
    throw new HTTPException(400, {
      message: parsed.error.issues[0]?.message ?? "Data afirmasi tidak valid.",
    });
  const [updated] = await getDb()
    .update(affirmations)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(eq(affirmations.id, id.data))
    .returning();
  if (!updated) throw new HTTPException(404, { message: "Afirmasi tidak ditemukan." });
  return {
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function deleteAffirmation(idParam: string) {
  const id = idSchema.safeParse(idParam);
  if (!id.success) throw new HTTPException(404, { message: "ID tidak valid." });
  await getDb().delete(affirmations).where(eq(affirmations.id, id.data));
  return { success: true };
}

export async function createReport(userId: string, body: unknown) {
  const parsed = questionReportSchema.safeParse(body);
  if (!parsed.success)
    throw new HTTPException(400, {
      message: parsed.error.issues[0]?.message ?? "Data laporan tidak valid.",
    });
  const [created] = await getDb()
    .insert(questionReports)
    .values({
      questionId: parsed.data.questionId,
      packageId: parsed.data.packageId ?? null,
      userId,
      reason: parsed.data.reason,
      description: parsed.data.description,
    })
    .returning();
  return { success: true, id: created.id };
}

export async function getReports(): Promise<QuestionReportItem[]> {
  const rows = await getDb()
    .select({
      id: questionReports.id,
      questionId: questionReports.questionId,
      packageId: questionReports.packageId,
      packageName: questionPackages.name,
      userId: questionReports.userId,
      userName: accounts.name,
      reason: questionReports.reason,
      description: questionReports.description,
      status: questionReports.status,
      questionPrompt: questions.prompt,
      questionOptions: questions.options,
      correctAnswer: questions.correctAnswer,
      explanation: questions.explanation,
      createdAt: questionReports.createdAt,
      updatedAt: questionReports.updatedAt,
    })
    .from(questionReports)
    .innerJoin(questions, eq(questionReports.questionId, questions.id))
    .innerJoin(accounts, eq(questionReports.userId, accounts.id))
    .leftJoin(questionPackages, eq(questionReports.packageId, questionPackages.id))
    .orderBy(desc(questionReports.createdAt));

  return rows.map((r) => ({
    ...r,
    status: r.status as QuestionReportItem["status"],
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function updateReportStatus(idParam: string, status: unknown) {
  const id = idSchema.safeParse(idParam);
  if (!id.success) throw new HTTPException(404, { message: "ID tidak valid." });
  if (
    typeof status !== "string" ||
    !["open", "reviewing", "resolved", "rejected"].includes(status)
  ) {
    throw new HTTPException(400, { message: "Status tidak valid." });
  }
  const [updated] = await getDb()
    .update(questionReports)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(questionReports.id, id.data))
    .returning();
  if (!updated) throw new HTTPException(404, { message: "Laporan tidak ditemukan." });
  return updated;
}
