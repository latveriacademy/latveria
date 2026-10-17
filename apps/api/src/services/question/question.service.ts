import { and, count, eq, ilike, inArray, or } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import {
  bankQuerySchema,
  bulkDeleteSchema,
  idSchema,
  questionImportSchema,
  questionSchema,
  utbkSubtests,
  computeQuestionFingerprint,
  type Bank,
  type QuestionDetail,
  type QuestionWorkflowStatus,
  type QuestionDifficulty,
} from "@latveria/shared";
import { getDb } from "../../lib/db";
import { practiceAnswers, questionPackages, questions, topics } from "../../lib/db/schema";
import { catalog, invalidateCatalogCache } from "../topic.service";
import { validatePassage, protectPassageSources, protectWarriorAnswers } from "./question-passage";

export async function getAdminQuestions(
  queryParams: Record<string, string | undefined>,
): Promise<Bank> {
  const parsed = bankQuerySchema.safeParse(queryParams);
  if (!parsed.success) throw new HTTPException(400, { message: "Filter tidak valid." });
  const query = parsed.data;
  if (query.subtes && !utbkSubtests.some((subtest) => subtest.slug === query.subtes))
    throw new HTTPException(404);

  const searchPattern = `%${query.cari?.replace(/[\\%_]/g, "\\$&") ?? ""}%`;
  const where = and(
    query.cari
      ? or(
          ilike(questions.prompt, searchPattern),
          ilike(questions.source, searchPattern),
          ilike(questions.passage, searchPattern),
          ilike(questionPackages.name, searchPattern),
        )
      : undefined,
    query.subtes ? eq(topics.slug, query.subtes) : undefined,
    query.kategori ? eq(questions.category, query.kategori) : undefined,
    query.paket
      ? idSchema.safeParse(query.paket).success
        ? eq(questions.packageId, query.paket)
        : eq(questionPackages.name, query.paket)
      : undefined,
  );
  const db = getDb();
  const pageParam = query.halaman;
  const [[total], categories, counts, pkgs, initialRows] = await Promise.all([
    db
      .select({ value: count() })
      .from(questions)
      .innerJoin(topics, eq(questions.topicId, topics.id))
      .leftJoin(questionPackages, eq(questions.packageId, questionPackages.id))
      .where(where),
    db
      .selectDistinct({ category: questions.category })
      .from(questions)
      .innerJoin(topics, eq(questions.topicId, topics.id))
      .where(query.subtes ? eq(topics.slug, query.subtes) : undefined)
      .orderBy(questions.category),
    catalog(),
    db
      .select({
        id: questionPackages.id,
        name: questionPackages.name,
        topicId: questionPackages.topicId,
        questionCount: count(questions.id),
      })
      .from(questionPackages)
      .innerJoin(topics, eq(questionPackages.topicId, topics.id))
      .leftJoin(questions, eq(questions.packageId, questionPackages.id))
      .where(query.subtes ? eq(topics.slug, query.subtes) : undefined)
      .groupBy(questionPackages.id)
      .orderBy(questionPackages.order),
    db
      .select({
        id: questions.id,
        prompt: questions.prompt,
        passage: questions.passage,
        passageId: questions.passageId,
        category: questions.category,
        packageId: questions.packageId,
        packageName: questionPackages.name,
        topic: topics.name,
        source: questions.source,
        annotations: questions.annotations,
        workflowStatus: questions.workflowStatus,
        difficulty: questions.difficulty,
        tags: questions.tags,
      })
      .from(questions)
      .innerJoin(topics, eq(questions.topicId, topics.id))
      .leftJoin(questionPackages, eq(questions.packageId, questionPackages.id))
      .where(where)
      .orderBy(topics.name, questions.id)
      .limit(15)
      .offset((pageParam - 1) * 15),
  ]);
  const pageCount = Math.max(1, Math.ceil(total.value / 15));
  const page = Math.min(pageParam, pageCount);
  const rows = (
    page === pageParam
      ? initialRows
      : await db
          .select({
            id: questions.id,
            prompt: questions.prompt,
            passage: questions.passage,
            passageId: questions.passageId,
            category: questions.category,
            packageId: questions.packageId,
            packageName: questionPackages.name,
            topic: topics.name,
            source: questions.source,
            annotations: questions.annotations,
            workflowStatus: questions.workflowStatus,
            difficulty: questions.difficulty,
            tags: questions.tags,
          })
          .from(questions)
          .innerJoin(topics, eq(questions.topicId, topics.id))
          .leftJoin(questionPackages, eq(questions.packageId, questionPackages.id))
          .where(where)
          .orderBy(topics.name, questions.id)
          .limit(15)
          .offset((page - 1) * 15)
  ).map(({ annotations, workflowStatus, difficulty, ...row }) => ({
    ...row,
    annotationsCount: annotations?.length || 0,
    workflowStatus: workflowStatus as QuestionWorkflowStatus,
    difficulty: difficulty as QuestionDifficulty,
  }));

  return {
    rows,
    total: total.value,
    page,
    pageCount,
    categories: categories.flatMap((row) => (row.category ? [row.category] : [])),
    packages: pkgs.map((p) => ({ ...p, questionCount: Number(p.questionCount ?? 0) })),
    tabs: [
      {
        slug: "semua",
        name: "Semua",
        value: counts.reduce((sum, row) => sum + row.questionCount, 0),
      },
      ...counts.map((row) => ({ slug: row.slug, name: row.name, value: row.questionCount })),
    ],
  };
}

export async function createQuestion(body: unknown) {
  const parsed = questionSchema.safeParse(body);
  if (!parsed.success)
    throw new HTTPException(400, { message: "Periksa isian soal, opsi, dan pembahasan." });
  const [topic] = await getDb()
    .select({ slug: topics.slug })
    .from(topics)
    .where(eq(topics.id, parsed.data.topicId));
  if (!topic) throw new HTTPException(400, { message: "Subtes tidak ditemukan." });
  if (parsed.data.annotations.length && topic.slug !== "literasi-bahasa-inggris")
    throw new HTTPException(400, { message: "Anotasi Lexicon hanya tersedia untuk LBE." });

  if (parsed.data.packageId) {
    const [pkg] = await getDb()
      .select()
      .from(questionPackages)
      .where(eq(questionPackages.id, parsed.data.packageId));
    if (!pkg) throw new HTTPException(400, { message: "Paket soal tidak ditemukan." });
    if (pkg.topicId !== parsed.data.topicId) {
      throw new HTTPException(400, {
        message: "Paket soal tidak cocok dengan subtes yang dipilih.",
      });
    }
  }

  const created = await getDb().transaction(async (tx) => {
    await validatePassage(tx, parsed.data);
    const fingerprint = computeQuestionFingerprint({
      prompt: parsed.data.prompt,
      passage: parsed.data.passage,
      options: parsed.data.options,
    });
    const [row] = await tx
      .insert(questions)
      .values({
        ...parsed.data,
        contentFingerprint: fingerprint,
        passage: parsed.data.passageId ? null : (parsed.data.passage ?? null),
        passageId: parsed.data.passageId ?? null,
      })
      .returning({ id: questions.id, packageId: questions.packageId });
    return row;
  });
  invalidateCatalogCache();
  return { id: created.id, slug: topic.slug, packageId: created.packageId };
}

export async function importQuestions(text: string) {
  if (new TextEncoder().encode(text).byteLength > 200_000)
    throw new HTTPException(413, { message: "File JSON terlalu besar (maksimal 200 KB)." });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new HTTPException(400, { message: "Format JSON tidak valid." });
  }
  const parsed = questionImportSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const group = issue.path[1];
    const number = issue.path[3];
    throw new HTTPException(400, {
      message: `Data impor tidak valid${typeof group === "number" ? ` pada grup ${group + 1}` : ""}${typeof number === "number" ? ` soal ${number + 1}` : ""}: ${issue.message}`,
    });
  }
  const validSlugs = new Set(utbkSubtests.map((subtest) => subtest.slug));
  const invalid = parsed.data.groups.findIndex(
    (group) => !validSlugs.has(group.subtes as (typeof utbkSubtests)[number]["slug"]),
  );
  if (invalid >= 0)
    throw new HTTPException(400, { message: `Subtes grup ${invalid + 1} tidak dikenal.` });

  const result = await getDb().transaction(async (tx) => {
    const slugs = [...new Set(parsed.data.groups.map((group) => group.subtes))];
    const existing = await tx
      .select({ id: topics.id, slug: topics.slug })
      .from(topics)
      .where(inArray(topics.slug, slugs));
    if (existing.length !== slugs.length)
      throw new HTTPException(400, { message: "Subtes belum tersedia di database." });
    const ids = new Map(existing.map((topic) => [topic.slug, topic.id]));

    const destinations = new Map<
      string,
      { id: string; name: string; slug: string; count: number }
    >();
    let count = 0;
    for (const group of parsed.data.groups) {
      if (
        group.subtes !== "literasi-bahasa-inggris" &&
        group.questions.some((item) => item.annotations.length)
      )
        throw new HTTPException(400, { message: "Anotasi Lexicon hanya tersedia untuk LBE." });
      const topicId = ids.get(group.subtes)!;
      let pkg;
      if (group.packageId) {
        [pkg] = await tx
          .select({ id: questionPackages.id, name: questionPackages.name })
          .from(questionPackages)
          .where(
            and(eq(questionPackages.id, group.packageId), eq(questionPackages.topicId, topicId)),
          )
          .for("update");
        if (!pkg)
          throw new HTTPException(400, {
            message: `Paket tujuan tidak ditemukan pada subtes ${group.subtes}.`,
          });
      } else {
        const name = group.packageName ?? "Paket 1";
        await tx
          .insert(questionPackages)
          .values({ topicId, name, order: 1 })
          .onConflictDoNothing({ target: [questionPackages.topicId, questionPackages.name] });
        [pkg] = await tx
          .select({ id: questionPackages.id, name: questionPackages.name })
          .from(questionPackages)
          .where(and(eq(questionPackages.topicId, topicId), eq(questionPackages.name, name)))
          .for("update");
      }
      if (!pkg)
        throw new HTTPException(400, { message: "Paket tujuan tidak tersedia. Coba lagi." });
      const values = group.questions.map((question) => ({
        ...question,
        passage: question.passageId ? null : (question.passage ?? null),
        category: group.category,
        topicId,
        packageId: pkg.id,
      }));
      for (const value of values) await validatePassage(tx, value);
      await tx.insert(questions).values(values);
      count += values.length;
      const destination = destinations.get(pkg.id) ?? { ...pkg, slug: group.subtes, count: 0 };
      destination.count += values.length;
      destinations.set(pkg.id, destination);
    }
    return { count, packages: [...destinations.values()] };
  });

  invalidateCatalogCache();
  return result;
}

export async function getQuestionDetail(idParam: string): Promise<QuestionDetail> {
  const id = idSchema.safeParse(idParam);
  if (!id.success) throw new HTTPException(404);
  const [item] = await getDb()
    .select({
      id: questions.id,
      topicId: questions.topicId,
      packageId: questions.packageId,
      packageName: questionPackages.name,
      prompt: questions.prompt,
      passage: questions.passage,
      passageId: questions.passageId,
      stimulus: questions.stimulus,
      annotations: questions.annotations,
      options: questions.options,
      correctAnswer: questions.correctAnswer,
      explanation: questions.explanation,
      category: questions.category,
      source: questions.source,
      workflowStatus: questions.workflowStatus,
      difficulty: questions.difficulty,
      tags: questions.tags,
      sourceQuestionId: questions.sourceQuestionId,
      reviewerNotes: questions.reviewerNotes,
      topic: topics.name,
      slug: topics.slug,
    })
    .from(questions)
    .innerJoin(topics, eq(questions.topicId, topics.id))
    .leftJoin(questionPackages, eq(questions.packageId, questionPackages.id))
    .where(eq(questions.id, id.data));
  if (!item) throw new HTTPException(404);

  let resolvedPassage = item.passage || item.stimulus?.passage || null;
  if (!resolvedPassage && item.passageId) {
    const [ref] = await getDb()
      .select({ passage: questions.passage, stimulus: questions.stimulus })
      .from(questions)
      .where(eq(questions.id, item.passageId));
    resolvedPassage = ref?.passage || ref?.stimulus?.passage || null;
  }

  const [usage] = await getDb()
    .select({ value: count() })
    .from(practiceAnswers)
    .where(eq(practiceAnswers.questionId, id.data));
  return {
    ...item,
    workflowStatus: item.workflowStatus as QuestionWorkflowStatus,
    difficulty: item.difficulty as QuestionDifficulty,
    passage: resolvedPassage ?? undefined,
    passageId: item.passageId ?? undefined,
    category: item.category ?? undefined,
    usage: usage.value,
  };
}

export async function updateQuestion(idParam: string, body: unknown) {
  const id = idSchema.safeParse(idParam);
  const parsed = questionSchema.safeParse(body);
  if (!id.success || !parsed.success)
    throw new HTTPException(400, { message: "Data soal tidak valid." });
  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(questions)
      .where(eq(questions.id, id.data))
      .for("update");
    if (!existing) throw new HTTPException(404, { message: "Soal tidak ditemukan." });
    await protectWarriorAnswers(tx, [id.data]);
    await validatePassage(tx, parsed.data, id.data);
    if (
      ((!parsed.data.passage || parsed.data.passageId) &&
        (existing.passage || existing.stimulus?.passage)) ||
      existing.topicId !== parsed.data.topicId ||
      existing.packageId !== (parsed.data.packageId ?? null)
    )
      await protectPassageSources(tx, [id.data]);
    const [topic] = await tx
      .select({ slug: topics.slug })
      .from(topics)
      .where(eq(topics.id, parsed.data.topicId));
    if (!topic) throw new HTTPException(400, { message: "Subtes tidak ditemukan." });
    if (parsed.data.annotations.length && topic.slug !== "literasi-bahasa-inggris")
      throw new HTTPException(400, { message: "Anotasi Lexicon hanya tersedia untuk LBE." });

    if (parsed.data.packageId) {
      const [pkg] = await tx
        .select()
        .from(questionPackages)
        .where(eq(questionPackages.id, parsed.data.packageId));
      if (!pkg) throw new HTTPException(400, { message: "Paket soal tidak ditemukan." });
      if (pkg.topicId !== parsed.data.topicId) {
        throw new HTTPException(400, {
          message: "Paket soal tidak cocok dengan subtes yang dipilih.",
        });
      }
    }

    const fingerprint = computeQuestionFingerprint({
      prompt: parsed.data.prompt,
      passage: parsed.data.passage,
      options: parsed.data.options,
    });
    await tx
      .update(questions)
      .set({
        ...parsed.data,
        contentFingerprint: fingerprint,
        packageId: parsed.data.packageId ?? null,
        category: parsed.data.category ?? null,
        passage: parsed.data.passageId ? null : (parsed.data.passage ?? null),
        passageId: parsed.data.passageId ?? null,
        updatedAt: new Date(),
        ...(existing.stimulus?.passage
          ? { stimulus: { ...existing.stimulus, passage: undefined } }
          : {}),
      })
      .where(eq(questions.id, id.data));
    return topic.slug;
  });
  invalidateCatalogCache();
  return { id: id.data, slug: result };
}

export async function bulkDeleteQuestions(body: unknown) {
  const parsed = bulkDeleteSchema.safeParse(body);
  if (!parsed.success)
    throw new HTTPException(400, { message: "Pilih 1–100 soal dengan ID valid." });
  const ids = parsed.data.ids;
  const deleted = await getDb().transaction(async (tx) => {
    const rows = await tx
      .select({ id: questions.id })
      .from(questions)
      .where(inArray(questions.id, ids))
      .orderBy(questions.id)
      .for("update");
    if (rows.length !== ids.length)
      throw new HTTPException(404, {
        message: "Sebagian soal tidak ditemukan. Muat ulang bank soal.",
      });
    await protectPassageSources(tx, ids);
    await protectWarriorAnswers(tx, ids);
    return tx.delete(questions).where(inArray(questions.id, ids)).returning({ id: questions.id });
  });
  invalidateCatalogCache();
  return { count: deleted.length };
}

export async function deleteQuestion(idParam: string) {
  const id = idSchema.safeParse(idParam);
  if (!id.success) throw new HTTPException(400);
  try {
    const deleted = await getDb().transaction(async (tx) => {
      await tx
        .select({ id: questions.id })
        .from(questions)
        .where(eq(questions.id, id.data))
        .for("update");
      await protectPassageSources(tx, [id.data]);
      await protectWarriorAnswers(tx, [id.data]);
      return tx.delete(questions).where(eq(questions.id, id.data)).returning({ id: questions.id });
    });
    if (!deleted.length) throw new HTTPException(404);
    invalidateCatalogCache();
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    throw new HTTPException(409, { message: "Soal sudah digunakan atau tidak dapat dihapus." });
  }
  return { success: true };
}
