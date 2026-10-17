import { and, desc, eq, ne, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import {
  computeQuestionFingerprint,
  type CheckDuplicateInput,
  type CheckSimilarityInput,
  type DuplicateCheckResponse,
  type DuplicateMatchItem,
  type QuestionQualityReport,
  type QualityIssue,
} from "@latveria/shared";
import { getDb } from "../lib/db";
import { questions, topics, questionPackages, questionRevisions } from "../lib/db/schema";
import { invalidateCatalogCache } from "./topic.service";

// Trigram & Exact Duplicate Service
export async function checkQuestionDuplicate(
  input: CheckDuplicateInput,
): Promise<DuplicateCheckResponse> {
  const db = getDb();
  const fingerprint = computeQuestionFingerprint(input);

  // 1. Exact Duplicate Search by SHA-256 Fingerprint
  const exactRows = await db
    .select({
      id: questions.id,
      prompt: questions.prompt,
      workflowStatus: questions.workflowStatus,
      topicName: topics.name,
      subtestSlug: topics.slug,
      packageName: questionPackages.name,
    })
    .from(questions)
    .innerJoin(topics, eq(questions.topicId, topics.id))
    .leftJoin(questionPackages, eq(questions.packageId, questionPackages.id))
    .where(
      and(
        eq(questions.contentFingerprint, fingerprint),
        input.excludeId ? ne(questions.id, input.excludeId) : undefined,
      ),
    )
    .limit(1);

  let exactMatch: DuplicateMatchItem | null = null;
  if (exactRows.length > 0) {
    const row = exactRows[0];
    exactMatch = {
      id: row.id,
      prompt: row.prompt,
      topicName: row.topicName,
      subtestSlug: row.subtestSlug,
      packageName: row.packageName,
      workflowStatus: row.workflowStatus as DuplicateMatchItem["workflowStatus"],
      similarityScore: 1.0,
      matchType: "exact",
      reason: "Konten dan opsi identik secara deterministik (SHA-256 cocok)",
    };
  }

  // 2. Similar Candidates
  const similarCandidates = await findSimilarQuestions({
    prompt: input.prompt,
    excludeId: input.excludeId ?? exactMatch?.id,
    threshold: 0.35,
  });

  return {
    isExactDuplicate: Boolean(exactMatch),
    fingerprint,
    exactMatch,
    similarCandidates,
  };
}

export async function findSimilarQuestions(
  input: CheckSimilarityInput,
): Promise<DuplicateMatchItem[]> {
  const db = getDb();
  const cleanPrompt = input.prompt.trim();
  if (cleanPrompt.length < 5) return [];

  try {
    // Try pg_trgm similarity via PostgreSQL
    const similarityExpr = sql<number>`similarity(${questions.prompt}, ${cleanPrompt})`;
    const rows = await db
      .select({
        id: questions.id,
        prompt: questions.prompt,
        workflowStatus: questions.workflowStatus,
        topicName: topics.name,
        subtestSlug: topics.slug,
        packageName: questionPackages.name,
        score: similarityExpr,
      })
      .from(questions)
      .innerJoin(topics, eq(questions.topicId, topics.id))
      .leftJoin(questionPackages, eq(questions.packageId, questionPackages.id))
      .where(
        and(
          sql`similarity(${questions.prompt}, ${cleanPrompt}) >= ${input.threshold ?? 0.35}`,
          input.topicId ? eq(questions.topicId, input.topicId) : undefined,
          input.excludeId ? ne(questions.id, input.excludeId) : undefined,
        ),
      )
      .orderBy(desc(similarityExpr))
      .limit(5);

    return rows.map((r) => ({
      id: r.id,
      prompt: r.prompt,
      topicName: r.topicName,
      subtestSlug: r.subtestSlug,
      packageName: r.packageName,
      workflowStatus: r.workflowStatus as DuplicateMatchItem["workflowStatus"],
      similarityScore: Number(r.score || 0),
      matchType: "similar",
      reason: `Kemiripan teks trigram ${Math.round(Number(r.score || 0) * 100)}%`,
    }));
  } catch {
    // Fallback if pg_trgm is not active: token Jaccard similarity in TypeScript
    const sampleRows = await db
      .select({
        id: questions.id,
        prompt: questions.prompt,
        workflowStatus: questions.workflowStatus,
        topicName: topics.name,
        subtestSlug: topics.slug,
        packageName: questionPackages.name,
      })
      .from(questions)
      .innerJoin(topics, eq(questions.topicId, topics.id))
      .leftJoin(questionPackages, eq(questions.packageId, questionPackages.id))
      .where(
        and(
          input.topicId ? eq(questions.topicId, input.topicId) : undefined,
          input.excludeId ? ne(questions.id, input.excludeId) : undefined,
        ),
      )
      .limit(100);

    const inputTokens = new Set(
      cleanPrompt
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2),
    );
    if (inputTokens.size === 0) return [];

    const scored = sampleRows
      .map((row) => {
        const rowTokens = new Set(
          row.prompt
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 2),
        );
        let intersection = 0;
        for (const token of inputTokens) {
          if (rowTokens.has(token)) intersection++;
        }
        const union = new Set([...inputTokens, ...rowTokens]).size;
        const score = union > 0 ? intersection / union : 0;
        return { ...row, score };
      })
      .filter((item) => item.score >= (input.threshold ?? 0.35))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return scored.map((r) => ({
      id: r.id,
      prompt: r.prompt,
      topicName: r.topicName,
      subtestSlug: r.subtestSlug,
      packageName: r.packageName,
      workflowStatus: r.workflowStatus as DuplicateMatchItem["workflowStatus"],
      similarityScore: r.score,
      matchType: "similar",
      reason: `Kemiripan kata kunci ${Math.round(r.score * 100)}% (fallback)`,
    }));
  }
}

// Duplicate as New Question Feature
export async function duplicateAsNewQuestion(
  sourceId: string,
  actorId: string,
  overrides?: { targetTopicId?: string; targetPackageId?: string | null },
) {
  const db = getDb();
  const [source] = await db.select().from(questions).where(eq(questions.id, sourceId));
  if (!source) throw new HTTPException(404, { message: "Soal sumber tidak ditemukan." });

  const targetTopicId = overrides?.targetTopicId ?? source.topicId;
  const targetPackageId =
    overrides?.targetPackageId !== undefined ? overrides.targetPackageId : null;

  // Compute fresh fingerprint
  const fingerprint = computeQuestionFingerprint({
    prompt: source.prompt,
    passage: source.passage,
    stimulus: source.stimulus,
    questionType: source.questionType,
    options: source.options,
    statements: source.statements,
    scoringConfig: source.scoringConfig,
  });

  const created = await db.transaction(async (tx) => {
    const [newQuestion] = await tx
      .insert(questions)
      .values({
        topicId: targetTopicId,
        packageId: targetPackageId,
        questionType: source.questionType,
        schemaVersion: source.schemaVersion,
        prompt: source.prompt,
        stimulus: source.stimulus,
        passage: source.passage,
        passageId: source.passageId,
        statements: source.statements,
        scoringConfig: source.scoringConfig,
        annotations: source.annotations ?? [],
        options: source.options,
        correctAnswer: source.correctAnswer,
        explanation: source.explanation,
        source: source.source ? `${source.source} (Duplikat)` : "Duplikat",
        category: source.category,
        itemWeight: source.itemWeight,
        calculatorAllowed: source.calculatorAllowed,
        imageUrl: source.imageUrl,
        order: 0,
        subtestOrder: 0,
        contentFingerprint: fingerprint,
        workflowStatus: "draft", // Always starts as draft
        difficulty: source.difficulty,
        tags: source.tags ?? [],
        sourceQuestionId: source.id,
        authorId: actorId,
      })
      .returning();

    // Create initial revision log
    await tx.insert(questionRevisions).values({
      questionId: newQuestion.id,
      topicId: newQuestion.topicId,
      contentHash: fingerprint,
      snapshot: newQuestion,
      versionNumber: 1,
      authorId: actorId,
      changeSummary: `Duplikat dari soal ID ${source.id.slice(0, 8)}`,
      changeReason: "Inisiasi soal baru dari duplikasi",
    });

    return newQuestion;
  });

  invalidateCatalogCache();
  const [topic] = await db
    .select({ slug: topics.slug })
    .from(topics)
    .where(eq(topics.id, targetTopicId));
  return {
    id: created.id,
    slug: topic?.slug ?? "penalaran-umum",
    workflowStatus: created.workflowStatus,
  };
}

// Automated Quality Checker
export function validateQuestionQuality(q: {
  prompt?: string | null;
  questionType?: string;
  options?: string[];
  correctAnswer?: number | null;
  statements?: { id: string; text: string; answer?: boolean }[] | null;
  explanation?: string | null;
  passage?: string | null;
  passageId?: string | null;
}): QuestionQualityReport {
  const issues: QualityIssue[] = [];

  // 1. Structure Checks
  if (!q.prompt || q.prompt.trim().length < 5) {
    issues.push({
      code: "EMPTY_PROMPT",
      severity: "error",
      message: "Teks pertanyaan (prompt) terlalu pendek atau kosong.",
      field: "prompt",
      suggestion: "Tuliskan pertanyaan dengan konteks yang jelas minimal 5 karakter.",
    });
  }

  const qType = q.questionType ?? "single_choice";
  if (qType === "single_choice") {
    if (!Array.isArray(q.options) || q.options.length !== 5) {
      issues.push({
        code: "INVALID_OPTIONS_COUNT",
        severity: "error",
        message: "Soal pilihan ganda wajib memiliki tepat 5 pilihan (A–E).",
        field: "options",
        suggestion: "Lengkapi pilihan jawaban sehingga terdapat tepat 5 opsi.",
      });
    } else {
      // Check duplicate options
      const trimmed = q.options.map((o) => o.trim().toLowerCase());
      if (new Set(trimmed).size !== trimmed.length) {
        issues.push({
          code: "DUPLICATE_OPTIONS",
          severity: "error",
          message: "Terdapat pilihan jawaban yang duplikat atau identik.",
          field: "options",
          suggestion: "Pastikan kelima opsi memiliki nilai yang berbeda.",
        });
      }
    }

    if (
      q.correctAnswer === null ||
      q.correctAnswer === undefined ||
      q.correctAnswer < 0 ||
      q.correctAnswer > 4
    ) {
      issues.push({
        code: "INVALID_CORRECT_ANSWER",
        severity: "error",
        message: "Kunci jawaban harus bernilai antara indeks 0 sampai 4 (A–E).",
        field: "correctAnswer",
        suggestion: "Pilih salah satu kunci jawaban yang valid.",
      });
    }
  } else if (qType === "true_false_group") {
    if (!Array.isArray(q.statements) || q.statements.length < 2) {
      issues.push({
        code: "INSUFFICIENT_STATEMENTS",
        severity: "error",
        message: "Soal Benar/Salah wajib memiliki minimal 2 pernyataan.",
        field: "statements",
        suggestion: "Tambahkan setidaknya 2 pernyataan pada kelompok soal.",
      });
    }
  }

  // 2. Content Checks
  if (!q.explanation || q.explanation.trim().length < 5) {
    issues.push({
      code: "EMPTY_EXPLANATION",
      severity: "warning",
      message: "Pembahasan soal belum diisi atau terlalu singkat.",
      field: "explanation",
      suggestion: "Sediakan penjelasan langkah demi langkah untuk membantu peserta.",
    });
  }

  // 3. LaTeX / Rendering Checks
  const allText = `${q.prompt ?? ""} ${q.passage ?? ""} ${(q.options ?? []).join(" ")}`;
  const singleDollarCount = (allText.match(/(?<!\$)\$(?!\$)/g) || []).length;
  if (singleDollarCount % 2 !== 0) {
    issues.push({
      code: "UNBALANCED_LATEX_DELIMITER",
      severity: "warning",
      message: "Ditemukan tanda $ inline LaTeX yang tidak berpasangan.",
      suggestion: "Periksa kembali sintaks rumus LaTeX agar setiap pembuka $ memiliki penutup $.",
    });
  }

  const doubleDollarCount = (allText.match(/\$\$/g) || []).length;
  if (doubleDollarCount % 2 !== 0) {
    issues.push({
      code: "UNBALANCED_LATEX_BLOCK",
      severity: "warning",
      message: "Ditemukan tanda $$ display LaTeX yang tidak berpasangan.",
      suggestion: "Pastikan blok display math memiliki tanda $$ penutup.",
    });
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const isValid = errorCount === 0;
  const canPublish = isValid && warningCount === 0;
  const qualityScore = Math.max(0, 100 - errorCount * 30 - warningCount * 10);

  return {
    isValid,
    canPublish,
    qualityScore,
    issues,
  };
}
