import { practiceOptionKeys as INDEX_TO_KEY } from "./practice-answers";
import { practiceXP } from "@latveria/shared";

export const SLUG_TO_SHORT: Record<string, string> = {
  "penalaran-umum": "PU",
  "pengetahuan-pemahaman-umum": "PPU",
  "pemahaman-bacaan-menulis": "PBM",
  "pengetahuan-kuantitatif": "PK",
  "literasi-bahasa-indonesia": "LBI",
  "literasi-bahasa-inggris": "LBE",
  "penalaran-matematika": "PM",
};

export const SHORT_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(SLUG_TO_SHORT).map(([slug, short]) => [short, slug]),
);

export const SECTION_MAP: Record<string, string> = {
  PU: "Tes Skolastik",
  PPU: "Tes Skolastik",
  PBM: "Tes Skolastik",
  PK: "Tes Skolastik",
  LBI: "Tes Literasi",
  LBE: "Tes Literasi",
  PM: "Tes Literasi",
};

export interface ApiTopic {
  id: string;
  slug: string;
  name: string;
  short?: string;
  category?: string;
  section?: string;
  questionCount?: number;
  packageCount?: number | string;
  description?: string;
}

/** Convert API topics to the learner catalog shape. */
export function topicToSubject(topic: ApiTopic) {
  const short = SLUG_TO_SHORT[topic.slug] || topic.short || topic.slug;
  const category =
    topic.category === "tka"
      ? "Tes Kemampuan Akademik"
      : topic.category === "ujian-mandiri"
        ? "Ujian Mandiri"
        : topic.category === "mata-kuliah"
          ? "Mata Kuliah"
          : SECTION_MAP[short] || (topic.section === "literasi" ? "Tes Literasi" : "Tes Skolastik");
  return {
    id: short,
    slug: topic.slug,
    topicId: topic.id,
    name: topic.name,
    code: short.startsWith("SNBT-") ? short : `LTV-${short.toUpperCase()}`,
    category,
    questionsCount: topic.questionCount,
    packageCount: Number(topic.packageCount ?? 0),
    progress: null,
    accuracy: null,
    description: topic.description,
  };
}

export interface ApiPracticeQuestion {
  id: string;
  prompt: string;
  passage?: string | null;
  annotations?: unknown[];
  options: string[];
}

/** Convert API PracticeQuestion to view shape */
export function apiQuestionToView(q: ApiPracticeQuestion) {
  return {
    id: q.id,
    question: q.prompt,
    passage: q.passage ?? null,
    annotations: q.annotations ?? [],
    options: q.options.map((text, i) => ({ key: INDEX_TO_KEY[i], text })),
    correctAnswer: null,
    explanation: null,
  };
}

export interface ReviewAnswerItem {
  id: string;
  passage?: string | null;
  correctAnswer: number;
  explanation: string;
  annotations?: unknown[];
}

/** Merge review data into session questions after submission */
export function mergeReviewData<T extends { id: string; passage?: string | null }>(
  sessionQuestions: T[],
  reviewAnswers: ReviewAnswerItem[],
): Array<
  T & {
    correctAnswer: string;
    explanation: string;
    annotations: unknown[];
  }
> {
  const byId = new Map(reviewAnswers.map((ra) => [ra.id, ra]));
  return sessionQuestions.map((sq) => {
    const ra = byId.get(sq.id);
    if (!ra) {
      return {
        ...sq,
        correctAnswer: "",
        explanation: "",
        annotations: (sq as unknown as { annotations?: unknown[] }).annotations ?? [],
      };
    }
    return {
      ...sq,
      passage: ra.passage ?? sq.passage ?? null,
      correctAnswer: INDEX_TO_KEY[ra.correctAnswer] ?? "",
      explanation: ra.explanation,
      annotations:
        ra.annotations ?? (sq as unknown as { annotations?: unknown[] }).annotations ?? [],
    };
  });
}

export function formatRecentActivities(
  historyData: Array<{
    id: string;
    slug: string;
    topic: string;
    total: number;
    correct: number;
    submittedAt: string | Date;
    earnedXP?: number;
  }>,
) {
  return historyData.slice(0, 6).map((h) => {
    const short = SLUG_TO_SHORT[h.slug] || h.slug;
    return {
      id: h.id,
      code: short,
      subject: h.topic,
      title: `Selesai ${h.total} Soal ${h.topic}`,
      xp: h.earnedXP ?? practiceXP(h.correct),
      time: new Date(h.submittedAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      accuracy: h.total > 0 ? `${Math.round((h.correct / h.total) * 100)}%` : "0%",
    };
  });
}

export interface SessionResultsParams {
  activeSession: {
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    packageId?: string | null;
    packageName?: string | null;
    mode: string;
    difficulty: string;
    totalQuestions: number;
    questions: Array<{ id: string }>;
    answers: Record<number, string | undefined>;
    startTime?: number;
    isReattempt?: boolean;
  };
  reviewData: {
    attempt: { earnedXP?: number };
    answers: Array<{ id: string; correctAnswer: number }>;
  };
  enrichedQuestions: unknown[];
  attemptId: string;
}

export function buildSessionResults({
  activeSession,
  reviewData,
  enrichedQuestions,
  attemptId,
}: SessionResultsParams) {
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  activeSession.questions.forEach((q, idx) => {
    const userAns = activeSession.answers[idx];
    const reviewQ = reviewData.answers.find((ra) => ra.id === q.id);
    if (!userAns) {
      unansweredCount++;
    } else if (reviewQ && INDEX_TO_KEY.indexOf(userAns) === reviewQ.correctAnswer) {
      correctCount++;
    } else {
      incorrectCount++;
    }
  });

  const accuracy = Math.round((correctCount / activeSession.totalQuestions) * 100);
  const score = accuracy;
  const earnedXP = reviewData.attempt.earnedXP;

  const totalTimeSeconds = activeSession.startTime
    ? Math.max(1, Math.round((Date.now() - activeSession.startTime) / 1000))
    : null;
  const averageTimeSeconds =
    totalTimeSeconds && activeSession.totalQuestions > 0
      ? Math.max(1, Math.round(totalTimeSeconds / activeSession.totalQuestions))
      : null;

  return {
    attemptId,
    subjectId: activeSession.subjectId,
    subjectName: activeSession.subjectName,
    subjectCode: activeSession.subjectCode,
    packageId: activeSession.packageId,
    packageName: activeSession.packageName,
    mode: activeSession.mode,
    difficulty: activeSession.difficulty,
    totalQuestions: activeSession.totalQuestions,
    correctCount,
    incorrectCount,
    unansweredCount,
    accuracy,
    score,
    earnedXP,
    isReattempt: activeSession.isReattempt ?? false,
    totalTimeSeconds,
    averageTimeSeconds,
    answers: activeSession.answers,
    questions: enrichedQuestions,
    completedAt: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
  };
}
