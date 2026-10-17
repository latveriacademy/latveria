import { eq, inArray } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { computeQuestionFingerprint, questionImportSchema, utbkSubtests } from "@latveria/shared";
import { getDb } from "../lib/db";
import { questions, topics } from "../lib/db/schema";
import { validateQuestionQuality } from "./question-intelligence.service";

export interface ImportDryRunIssue {
  groupIndex: number;
  questionIndex: number;
  code: string;
  severity: "error" | "warning";
  message: string;
}

export interface ImportDryRunDuplicate {
  groupIndex: number;
  questionIndex: number;
  prompt: string;
  matchedId: string;
  matchedTopic: string;
}

export interface ImportDryRunResult {
  isValid: boolean;
  totalGroups: number;
  totalQuestions: number;
  validQuestionsCount: number;
  invalidQuestionsCount: number;
  exactDuplicateCount: number;
  exactDuplicates: ImportDryRunDuplicate[];
  issues: ImportDryRunIssue[];
}

export async function dryRunImportQuestions(text: string): Promise<ImportDryRunResult> {
  if (new TextEncoder().encode(text).byteLength > 200_000) {
    throw new HTTPException(413, { message: "File JSON terlalu besar (maksimal 200 KB)." });
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new HTTPException(400, { message: "Format JSON tidak valid." });
  }

  const parsed = questionImportSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const group = typeof issue.path[1] === "number" ? issue.path[1] : 0;
    const qNum = typeof issue.path[3] === "number" ? issue.path[3] : 0;
    return {
      isValid: false,
      totalGroups: 0,
      totalQuestions: 0,
      validQuestionsCount: 0,
      invalidQuestionsCount: 1,
      exactDuplicateCount: 0,
      exactDuplicates: [],
      issues: [
        {
          groupIndex: group,
          questionIndex: qNum,
          code: "SCHEMA_VALIDATION_ERROR",
          severity: "error",
          message: issue.message,
        },
      ],
    };
  }

  const validSlugs = new Set(utbkSubtests.map((s) => s.slug));
  const issues: ImportDryRunIssue[] = [];
  const db = getDb();

  let totalQuestions = 0;
  const fingerprints: { groupIndex: number; questionIndex: number; prompt: string; fp: string }[] =
    [];

  parsed.data.groups.forEach((group, gIdx) => {
    if (!validSlugs.has(group.subtes as (typeof utbkSubtests)[number]["slug"])) {
      issues.push({
        groupIndex: gIdx,
        questionIndex: -1,
        code: "INVALID_SUBTEST",
        severity: "error",
        message: `Subtes "${group.subtes}" tidak dikenal dalam katalog SNPMB 2026.`,
      });
    }

    group.questions.forEach((q, qIdx) => {
      totalQuestions++;
      const quality = validateQuestionQuality({
        prompt: q.prompt,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        passage: q.passage,
        passageId: q.passageId,
      });

      for (const iss of quality.issues) {
        issues.push({
          groupIndex: gIdx,
          questionIndex: qIdx,
          code: iss.code,
          severity: iss.severity === "error" ? "error" : "warning",
          message: iss.message,
        });
      }

      const fp = computeQuestionFingerprint({
        prompt: q.prompt,
        passage: q.passage,
        options: q.options,
      });
      fingerprints.push({ groupIndex: gIdx, questionIndex: qIdx, prompt: q.prompt, fp });
    });
  });

  // Check exact duplicates in database
  const fps = fingerprints.map((f) => f.fp);
  const exactDuplicates: ImportDryRunDuplicate[] = [];

  if (fps.length > 0) {
    const existingMatches = await db
      .select({
        id: questions.id,
        contentFingerprint: questions.contentFingerprint,
        topicName: topics.name,
      })
      .from(questions)
      .innerJoin(topics, eq(questions.topicId, topics.id))
      .where(inArray(questions.contentFingerprint, fps));

    const matchMap = new Map(existingMatches.map((m) => [m.contentFingerprint, m]));
    for (const f of fingerprints) {
      const match = matchMap.get(f.fp);
      if (match) {
        exactDuplicates.push({
          groupIndex: f.groupIndex,
          questionIndex: f.questionIndex,
          prompt: f.prompt,
          matchedId: match.id,
          matchedTopic: match.topicName,
        });
      }
    }
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const invalidQuestionsCount = errorCount;
  const validQuestionsCount = Math.max(0, totalQuestions - invalidQuestionsCount);

  return {
    isValid: errorCount === 0,
    totalGroups: parsed.data.groups.length,
    totalQuestions,
    validQuestionsCount,
    invalidQuestionsCount,
    exactDuplicateCount: exactDuplicates.length,
    exactDuplicates,
    issues,
  };
}
