import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { buildUtbkReport, scoreSimulationSubtest } from "@latveria/shared";
import { getDb } from "../../lib/db";
import { questions, questionPackages, tryoutSessions, tryoutResponses } from "../../lib/db/schema";
import { sessionSubtests } from "./tryout-config";
import { revisionQuestions } from "./tryout-revisions";

export function gradeTryoutQuestion(
  question: Pick<
    typeof questions.$inferSelect,
    "questionType" | "correctAnswer" | "scoringConfig" | "statements"
  >,
  value: unknown,
) {
  const isGroup = question.questionType === "true_false_group";
  const mode = question.scoringConfig?.mode ?? "per_statement";
  const maxPoints = isGroup
    ? (question.scoringConfig?.points ?? 1) *
      (mode === "per_statement" ? (question.statements?.length ?? 0) : 1)
    : 1;
  const irtEligible = !isGroup || mode === "all_or_nothing";
  if (value === undefined || value === null || value === "")
    return { isAnswered: false, scoreFraction: 0, maxPoints, irtEligible };
  if (!isGroup) {
    if (
      !(typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 4) &&
      !(typeof value === "string" && /^[0-4A-E]$/.test(value))
    )
      throw new HTTPException(400, { message: "Pilihan jawaban tidak valid." });
    const index =
      typeof value === "string" && /^[A-E]$/.test(value) ? "ABCDE".indexOf(value) : Number(value);
    return {
      isAnswered: true,
      scoreFraction: index === question.correctAnswer ? 1 : 0,
      maxPoints,
      irtEligible,
    };
  }
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      throw new HTTPException(400, { message: "Jawaban benar/salah tidak valid." });
    }
  }
  const statements = question.statements ?? [];
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !statements.length ||
    Object.entries(value).some(
      ([id, answer]) => typeof answer !== "boolean" || !statements.some((s) => s.id === id),
    )
  )
    throw new HTTPException(400, { message: "Pernyataan jawaban tidak sesuai dengan soal." });
  const answers = value as Record<string, boolean>;
  const correct = statements.filter((s) => answers[s.id] === s.answer).length;
  return {
    isAnswered: Object.keys(answers).length > 0,
    scoreFraction:
      mode === "all_or_nothing"
        ? Number(correct === statements.length)
        : correct / statements.length,
    maxPoints,
    irtEligible,
  };
}

export async function submitSimulationSubtest(
  userId: string,
  sessionId: string,
  body: { answers?: unknown; timeSpentByQuestion?: unknown },
) {
  return getDb().transaction(async (tx) => {
    const [session] = await tx
      .select()
      .from(tryoutSessions)
      .where(and(eq(tryoutSessions.id, sessionId), eq(tryoutSessions.userId, userId)))
      .for("update");
    if (!session || session.state !== "active")
      throw new HTTPException(409, { message: "Subtes sudah dikumpulkan atau sesi tidak aktif." });
    const [pkg] = await tx
      .select()
      .from(questionPackages)
      .where(eq(questionPackages.id, session.packageId));
    const subtests = await sessionSubtests(session, pkg);
    const current = subtests[session.currentSubtestIndex];
    if (!current) throw new HTTPException(409, { message: "Subtes sesi tidak tersedia." });
    const sets = JSON.parse(session.questionSets) as Record<string, string[]>;
    const ids = sets[current.id];
    const allowed = new Set(
      subtests.slice(0, session.currentSubtestIndex + 1).flatMap((s) => sets[s.id]),
    );
    const answers = body.answers as Record<string, unknown>;
    const times = body.timeSpentByQuestion as Record<string, unknown>;
    if (
      !answers ||
      !times ||
      Object.keys(answers).some((id) => !allowed.has(id)) ||
      Object.entries(times).some(
        ([id, value]) =>
          !allowed.has(id) || !Number.isInteger(value) || Number(value) < 0 || Number(value) > 7200,
      )
    )
      throw new HTTPException(400, { message: "Respons tidak sesuai dengan sesi." });
    const snapshots = await revisionQuestions(session, ids, tx);
    const items = snapshots.map((q) => ({
      questionId: q.id,
      revisionId: session.revisionSets[q.id],
      ...gradeTryoutQuestion(q, answers[q.id]),
      timeSpentSeconds: Number(times[q.id] ?? 0),
    }));
    await tx.insert(tryoutResponses).values(
      items.map((item) => ({
        ...item,
        sessionId: session.id,
        topicId: current.id,
        answer: answers[item.questionId] ?? null,
      })),
    );
    const section = scoreSimulationSubtest(
      current.slug,
      current.name,
      items,
      session.scoringPlan[current.id],
    );
    const report = buildUtbkReport(
      [...(session.scoreReport?.subtests ?? []), section],
      subtests.length,
    );
    const isLast = session.currentSubtestIndex === subtests.length - 1;
    const prior = JSON.parse(session.answers) as Record<string, unknown>;
    const allAnswers = {
      ...Object.fromEntries(Object.entries(prior).filter(([id]) => !ids.includes(id))),
      ...Object.fromEntries(
        ids
          .filter((id) => Object.hasOwn(answers, id))
          .map((id) => [
            id,
            typeof answers[id] === "object" ? JSON.stringify(answers[id]) : String(answers[id]),
          ]),
      ),
    };
    await tx
      .update(tryoutSessions)
      .set({
        state: isLast ? "completed" : "section_ready",
        completedAt: isLast ? new Date() : null,
        scoreReport: report,
        totalScore: isLast ? report.score : null,
        answers: JSON.stringify(allAnswers),
        currentSubtestIndex: isLast ? session.currentSubtestIndex : session.currentSubtestIndex + 1,
        currentQuestionIndex: 0,
        breakEndsAt: null,
      })
      .where(eq(tryoutSessions.id, session.id));
    return {
      status: isLast ? ("completed" as const) : ("section_ready" as const),
      nextSubtestIndex: session.currentSubtestIndex + 1,
      score: report,
    };
  });
}
