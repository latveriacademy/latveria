import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import {
  type AdvancedSearchQuery,
  type BulkActionInput,
  type BulkActionResult,
  type QuestionWorkflowStatus,
} from "@latveria/shared";
import { getDb } from "../lib/db";
import {
  questions,
  topics,
  questionPackages,
  practiceAnswers,
  questionReports,
  tryoutResponses,
} from "../lib/db/schema";
import { catalog, invalidateCatalogCache } from "./topic.service";
import { validateQuestionQuality } from "./question-intelligence.service";

export async function searchAdminQuestions(query: AdvancedSearchQuery) {
  const db = getDb();
  const searchPattern = query.cari ? `%${query.cari.replace(/[\\%_]/g, "\\$&")}%` : null;

  const whereConditions = and(
    searchPattern
      ? or(
          ilike(questions.prompt, searchPattern),
          ilike(questions.source, searchPattern),
          ilike(questions.passage, searchPattern),
          ilike(questionPackages.name, searchPattern),
        )
      : undefined,
    query.subtes && query.subtes !== "semua" ? eq(topics.slug, query.subtes) : undefined,
    query.kategori && query.kategori !== "semua"
      ? eq(questions.category, query.kategori)
      : undefined,
    query.paket && query.paket !== "semua" ? eq(questionPackages.name, query.paket) : undefined,
    query.tipe ? eq(questions.questionType, query.tipe) : undefined,
    query.difficulty ? eq(questions.difficulty, query.difficulty) : undefined,
    query.status ? eq(questions.workflowStatus, query.status) : undefined,
    query.hasPassage !== undefined
      ? query.hasPassage
        ? or(isNotNull(questions.passage), isNotNull(questions.passageId))
        : and(isNull(questions.passage), isNull(questions.passageId))
      : undefined,
    query.hasMedia !== undefined
      ? query.hasMedia
        ? or(isNotNull(questions.imageUrl), sql`${questions.stimulus} is not null`)
        : and(isNull(questions.imageUrl), sql`${questions.stimulus} is null`)
      : undefined,
    query.tag ? sql`${query.tag} = ANY(${questions.tags})` : undefined,
    query.startDate ? gte(questions.updatedAt, new Date(query.startDate)) : undefined,
    query.endDate ? lte(questions.updatedAt, new Date(query.endDate)) : undefined,
  );

  const sortColumnMap = {
    created_at: questions.updatedAt,
    updated_at: questions.updatedAt,
    prompt: questions.prompt,
    subtest: topics.name,
    difficulty: questions.difficulty,
    order: questions.order,
  };

  const sortCol = sortColumnMap[query.sortBy ?? "created_at"] ?? questions.updatedAt;
  const orderByClause = query.sortOrder === "asc" ? asc(sortCol) : desc(sortCol);

  const page = query.halaman ?? 1;
  const limit = query.limit ?? 15;
  const offset = (page - 1) * limit;

  const [[totalRes], categories, counts, pkgs, rows] = await Promise.all([
    db
      .select({ value: count() })
      .from(questions)
      .innerJoin(topics, eq(questions.topicId, topics.id))
      .leftJoin(questionPackages, eq(questions.packageId, questionPackages.id))
      .where(whereConditions),
    db
      .selectDistinct({ category: questions.category })
      .from(questions)
      .innerJoin(topics, eq(questions.topicId, topics.id))
      .where(query.subtes && query.subtes !== "semua" ? eq(topics.slug, query.subtes) : undefined)
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
      .where(query.subtes && query.subtes !== "semua" ? eq(topics.slug, query.subtes) : undefined)
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
        topicSlug: topics.slug,
        source: questions.source,
        annotations: questions.annotations,
        workflowStatus: questions.workflowStatus,
        difficulty: questions.difficulty,
        tags: questions.tags,
        updatedAt: questions.updatedAt,
      })
      .from(questions)
      .innerJoin(topics, eq(questions.topicId, topics.id))
      .leftJoin(questionPackages, eq(questions.packageId, questionPackages.id))
      .where(whereConditions)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset),
  ]);

  const total = Number(totalRes?.value ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / limit));

  return {
    rows: rows.map((r) => ({
      ...r,
      annotationsCount: r.annotations?.length || 0,
      workflowStatus: r.workflowStatus as QuestionWorkflowStatus,
    })),
    total,
    page,
    pageCount,
    categories: categories.flatMap((c) => (c.category ? [c.category] : [])),
    packages: pkgs.map((p) => ({ ...p, questionCount: Number(p.questionCount ?? 0) })),
    tabs: [
      {
        slug: "semua",
        name: "Semua",
        value: counts.reduce((sum, item) => sum + item.questionCount, 0),
      },
      ...counts.map((item) => ({
        slug: item.slug,
        name: item.name,
        value: item.questionCount,
      })),
    ],
  };
}

// Bulk Actions Processor
export async function processBulkAction(
  input: BulkActionInput,
  actorId: string,
): Promise<BulkActionResult> {
  const db = getDb();
  const ids = input.questionIds;
  if (!ids.length) throw new HTTPException(400, { message: "Pilih setidaknya satu soal." });

  const targetRows = await db
    .select({
      id: questions.id,
      prompt: questions.prompt,
      questionType: questions.questionType,
      options: questions.options,
      correctAnswer: questions.correctAnswer,
      workflowStatus: questions.workflowStatus,
      tags: questions.tags,
    })
    .from(questions)
    .where(inArray(questions.id, ids));

  if (!targetRows.length) {
    throw new HTTPException(404, { message: "Soal yang dipilih tidak ditemukan." });
  }

  let succeeded = 0;
  const errors: { id: string; reason: string }[] = [];

  for (const row of targetRows) {
    try {
      if (input.action === "set_status") {
        const nextStatus = input.payload?.status ?? "draft";
        if (nextStatus === "published") {
          const report = validateQuestionQuality({
            prompt: row.prompt,
            questionType: row.questionType,
            options: row.options,
            correctAnswer: row.correctAnswer,
          });
          if (!report.isValid) {
            const firstErr = report.issues.find((i) => i.severity === "error")?.message;
            throw new Error(`Gagal publikasi: ${firstErr || "Ada masalah validasi"}`);
          }
        }
        await db
          .update(questions)
          .set({ workflowStatus: nextStatus, updatedAt: new Date(), authorId: actorId })
          .where(eq(questions.id, row.id));
        succeeded++;
      } else if (input.action === "set_difficulty") {
        const diff = input.payload?.difficulty ?? "medium";
        await db
          .update(questions)
          .set({ difficulty: diff, updatedAt: new Date() })
          .where(eq(questions.id, row.id));
        succeeded++;
      } else if (input.action === "add_tags") {
        const newTags = input.payload?.tags ?? [];
        const combined = [...new Set([...(row.tags ?? []), ...newTags])];
        await db
          .update(questions)
          .set({ tags: combined, updatedAt: new Date() })
          .where(eq(questions.id, row.id));
        succeeded++;
      } else if (input.action === "remove_tags") {
        const removeTags = new Set(input.payload?.tags ?? []);
        const filtered = (row.tags ?? []).filter((t) => !removeTags.has(t));
        await db
          .update(questions)
          .set({ tags: filtered, updatedAt: new Date() })
          .where(eq(questions.id, row.id));
        succeeded++;
      } else if (input.action === "assign_package") {
        const pkgId = input.payload?.packageId ?? null;
        await db
          .update(questions)
          .set({ packageId: pkgId, updatedAt: new Date() })
          .where(eq(questions.id, row.id));
        succeeded++;
      } else if (input.action === "detach_package") {
        await db
          .update(questions)
          .set({ packageId: null, updatedAt: new Date() })
          .where(eq(questions.id, row.id));
        succeeded++;
      } else if (input.action === "archive") {
        await db
          .update(questions)
          .set({ workflowStatus: "archived", updatedAt: new Date() })
          .where(eq(questions.id, row.id));
        succeeded++;
      } else if (input.action === "delete") {
        // Safe delete check: cannot hard delete if attempts or sessions exist!
        const [paCount] = await db
          .select({ value: count() })
          .from(practiceAnswers)
          .where(eq(practiceAnswers.questionId, row.id));
        const [trCount] = await db
          .select({ value: count() })
          .from(tryoutResponses)
          .where(eq(tryoutResponses.questionId, row.id));

        if (Number(paCount?.value || 0) > 0 || Number(trCount?.value || 0) > 0) {
          throw new Error("Soal telah dikerjakan peserta. Gunakan aksi Arsipkan.");
        }

        await db.delete(questionReports).where(eq(questionReports.questionId, row.id));
        await db.delete(questions).where(eq(questions.id, row.id));
        succeeded++;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Operasi gagal";
      errors.push({ id: row.id, reason: message });
    }
  }

  invalidateCatalogCache();
  return {
    total: targetRows.length,
    succeeded,
    failed: errors.length,
    errors,
  };
}
