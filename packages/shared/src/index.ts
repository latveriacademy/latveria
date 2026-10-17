import { z } from "zod";
import type { LatveriaScoreResult } from "./scoring";
import type { QuestionWorkflowStatus, QuestionDifficulty } from "./question-intelligence";
export type { TryoutHistoryEntry } from "./tryout-history";
export {
  irtArtifactSchema,
  type IrtDatasetItem,
  type IrtDiagnostics,
  type IrtCalibrationItem,
} from "./irt-calibration";
export { estimate2pl, type IrtParameter, type IrtEstimate } from "./irt";
export {
  scoreSimulationSubtest,
  buildUtbkReport,
  type SimulationItem,
  type SimulationSubtest,
  type UtbkScoreReport,
  type SectionCalibration,
} from "./utbk-scoring";
export { normalizeTryoutImport, tryoutImportSchema, type TryoutImport } from "./tryout-import";
export {
  createTryoutSchema,
  updateTryoutSchema,
  isTryoutPackage,
  type AdminTryoutItem,
  type AdminTryoutDetail,
} from "./admin-tryout";
import {
  lexiconAnnotationInputSchema,
  resolveLexiconAnnotations,
  validLexiconRanges,
  type LexiconAnnotation,
} from "./lexicon";
export {
  lexiconAnnotationInputSchema,
  lexiconAnnotationSchema,
  resolveLexiconAnnotations,
  validLexiconRanges,
  mathSourcePattern,
  saveVocabularySchema,
  type LexiconAnnotation,
  type VocabularyEntry,
} from "./lexicon";
export { utbkSubtests } from "./utbk-subtests";
export {
  practiceXP,
  levelProgress,
  practiceDay,
  practiceStreak,
  learnerSummary,
  type LearnerSummary,
} from "./progression";
export { cylinderTankQuestion, openCuboidQuestion, pyramidQuestion } from "./geometry-examples";
export {
  calculateLatveriaScore,
  type LatveriaScoreResult,
  type ScoringItemInput,
  type ItemScoreBreakdown,
} from "./scoring";
export {
  textBlockSchema,
  latexBlockSchema,
  tableBlockSchema,
  chartPointSchema,
  chartBlockSchema,
  diagramBlockSchema,
  imageBlockSchema,
  contentBlockSchema,
  stimulusSchema,
  trueFalseStatementSchema,
  trueFalseStatementClientSchema,
  scoringConfigSchema,
  createTryoutSectionSchema,
  updateTryoutSectionSchema,
  singleChoiceImportQuestionSchema,
  trueFalseImportQuestionSchema,
  sectionImportQuestionSchema,
  passageImportItemSchema,
  sectionImportSchema,
  type PassageImportItem,
  type TextBlock,
  type LatexBlock,
  type TableBlock,
  type ChartPoint,
  type ChartBlock,
  type DiagramBlock,
  type ImageBlock,
  type ContentBlock,
  type QuestionStimulus,
  type TrueFalseStatement,
  type TrueFalseStatementClient,
  type ScoringConfig,
  type QuestionType,
  type CreateTryoutSectionInput,
  type UpdateTryoutSectionInput,
  type TryoutSectionItem,
  type TryoutSectionQuestion,
  type TryoutSectionWithQuestions,
  type AdminTryoutSectionDetail,
  type SectionImportQuestion,
  type SectionImportInput,
} from "./questions";

// Leaderboard query parameters schema
export const leaderboardQuerySchema = z.object({
  metric: z.enum(["xp", "answered", "correct", "accuracy", "streak"]).default("xp"),
  subtest: z.enum(["all", "PU", "PPU", "PBM", "PK", "BI", "EN", "PM"]).default("all"),
  period: z.enum(["daily", "weekly", "monthly", "all"]).default("weekly"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;

// Leaderboard entry
export const leaderboardEntrySchema = z.object({
  rank: z.number(),
  id: z.string(),
  userId: z.string().optional(),
  name: z.string(),
  metricValue: z.number(),
  level: z.number(),
  totalXP: z.number(),
  score: z.number().optional(),
  attemptsCount: z.number().optional(),
  totalAnswered: z.number().optional(),
  answered: z.number().optional(),
  correct: z.number().optional(),
  accuracy: z.number().optional(),
  questions: z.number().optional(),
  streak: z.number().optional(),
  delta: z.string().optional(),
  isCurrentUser: z.boolean().optional(),
  status: z.string().optional(),
});
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;

// Leaderboard response
export const leaderboardResponseSchema = z.object({
  entries: z.array(leaderboardEntrySchema),
  me: z
    .object({
      rank: z.number().nullable(),
      metricValue: z.number().nullable(),
      answered: z.number().nullable(),
      correct: z.number().nullable(),
      accuracy: z.number().nullable(),
      streak: z.number().nullable(),
      needsMore: z.number().nullable().optional(), // questions needed to appear on leaderboard
    })
    .nullable(),
  meta: z.object({
    metric: z.string(),
    subtest: z.string(),
    period: z.string(),
    periodStart: z.string(),
    periodEnd: z.string(),
    generatedAt: z.string(),
  }),
});
export type LeaderboardResponse = z.infer<typeof leaderboardResponseSchema>;
export type LegacyLeaderboardEntry = {
  rank: number;
  id: string;
  name: string;
  codename: string | null;
  level: number;
  xp: number;
  score: number;
  accuracy: number;
  attemptsCount: number;
  totalAnswered: number;
};

export const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});
export const signupSchema = credentialsSchema.extend({ name: z.string().trim().min(1).max(100) });
export const profileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Nama tidak boleh kosong.")
      .max(100, "Nama maksimal 100 karakter."),
    codename: z.string().trim().max(100, "Nama panggilan maksimal 100 karakter."),
    targetUniversity: z.string().trim().max(200, "Target PTN maksimal 200 karakter."),
    bio: z.string().trim().max(500, "Bio maksimal 500 karakter."),
    motto: z.string().trim().max(200, "Motto maksimal 200 karakter."),
    image: z.string().nullable().optional(),
  })
  .strict();
export type Profile = z.infer<typeof profileSchema>;

export const AVATAR_MIN_SIZE_BYTES = 5120; // 5 KB
export const AVATAR_MAX_SIZE_BYTES = 3145728; // 3 MB
export const ALLOWED_AVATAR_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const affirmationSchema = z.object({
  affirmation: z
    .string()
    .trim()
    .min(3, "Afirmasi minimal 3 karakter.")
    .max(300, "Afirmasi maksimal 300 karakter."),
  author: z.string().trim().max(100).optional().nullable(),
  active: z.boolean().default(true),
});
export type AffirmationInput = z.infer<typeof affirmationSchema>;
export type Affirmation = {
  id: string;
  affirmation: string;
  author: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export const questionReportReasons = [
  "Soal bermasalah",
  "Jawaban tidak sesuai",
  "Pembahasan bermasalah",
  "Soal ambigu",
  "Typo",
  "Gambar tidak tampil",
  "Pilihan jawaban bermasalah",
  "Lainnya",
] as const;

export const questionReportSchema = z.object({
  questionId: z.uuid("ID soal tidak valid."),
  packageId: z.uuid().optional().nullable(),
  reason: z.enum(questionReportReasons),
  description: z.string().trim().max(1000).default(""),
});
export type QuestionReportInput = z.infer<typeof questionReportSchema>;

export type QuestionReportItem = {
  id: string;
  questionId: string;
  packageId?: string | null;
  packageName?: string | null;
  userId: string;
  userName?: string;
  reason: string;
  description: string;
  status: "open" | "reviewing" | "resolved" | "rejected";
  questionPrompt?: string;
  questionOptions?: string[];
  correctAnswer?: number;
  explanation?: string;
  createdAt: string;
  updatedAt: string;
};

export type SystemConfigItem = {
  key: string;
  value: string;
  description?: string | null;
  updatedAt: string;
};

export const createPackageSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama paket tidak boleh kosong.")
    .max(100, "Nama paket maksimal 100 karakter."),
  description: z.string().trim().max(500, "Deskripsi maksimal 500 karakter.").optional().nullable(),
  order: z.coerce.number().int().min(0, "Urutan harus berupa bilangan bulat positif.").default(0),
  isActive: z.boolean().default(true),
  packageType: z.enum(["Tryout", "Airdrop Fundamental", "Airdrop Akselerasi"]).default("Tryout"),
  category: z.enum(["utbk", "ujian-mandiri", "tka", "mata-kuliah"]).default("utbk"),
  duration: z.coerce.number().int().min(5).max(300).default(30),
  isFullTryout: z.boolean().default(false),
  targetQuestions: z.coerce.number().int().min(1).max(300).default(30),
  published: z.boolean().default(true),
});
export type CreatePackageInput = z.infer<typeof createPackageSchema>;

export const updatePackageSchema = createPackageSchema.partial();
export type UpdatePackageInput = z.infer<typeof updatePackageSchema>;

export const assignQuestionToPackageSchema = z.object({
  questionId: z.uuid("ID soal tidak valid."),
});
export type AssignQuestionToPackageInput = z.infer<typeof assignQuestionToPackageSchema>;

export const moveQuestionPackageSchema = z.object({
  packageId: z.uuid("ID paket tujuan tidak valid.").nullable(),
});
export type MoveQuestionPackageInput = z.infer<typeof moveQuestionPackageSchema>;

const questionFields = z.object({
  topicId: z.uuid(),
  packageId: z.uuid("ID paket tidak valid.").optional().nullable(),
  prompt: z.string().trim().min(5).max(5000),
  passage: z.string().trim().max(10000).optional().nullable(),
  passageId: z.string().uuid("ID wacana tidak valid.").optional().nullable(),
  options: z
    .array(z.string().trim().min(1).max(300))
    .length(5)
    .refine((items) => new Set(items).size === 5, "Opsi harus berbeda."),
  correctAnswer: z.number().int().min(0).max(4),
  explanation: z.string().trim().min(5).max(2000),
  source: z.string().trim().min(3).max(300),
  category: z.string().trim().max(120).optional(),
  itemWeight: z.number().int().min(10).max(300).optional(),
  calculatorAllowed: z.boolean().optional(),
  annotations: z.array(lexiconAnnotationInputSchema).max(20).default([]),
});
export const questionSchema = questionFields
  .transform((q) => ({
    ...q,
    annotations: resolveLexiconAnnotations(q.prompt, q.annotations),
  }))
  .refine((question) => validLexiconRanges(question.prompt, question.annotations), {
    message:
      "Anotasi harus sesuai dengan teks pertanyaan, tidak tumpang tindih, dan berada di luar rumus/diagram.",
    path: ["annotations"],
  });
export const questionImportSchema = z
  .object({
    groups: z
      .array(
        z
          .object({
            subtes: z.string().min(1),
            category: z.string().trim().min(1).max(120),
            packageId: z.uuid("ID paket tidak valid.").optional(),
            packageName: z
              .string()
              .trim()
              .min(1, "Nama paket tidak boleh kosong.")
              .max(100)
              .optional(),
            questions: z
              .array(
                questionFields
                  .omit({ topicId: true, category: true })
                  .transform((q) => ({
                    ...q,
                    annotations: resolveLexiconAnnotations(q.prompt, q.annotations),
                  }))
                  .refine((question) => validLexiconRanges(question.prompt, question.annotations), {
                    message: "Anotasi tidak sesuai dengan teks pertanyaan.",
                    path: ["annotations"],
                  })
                  .refine((question) => !question.packageId, {
                    message: "Tentukan packageId atau packageName pada grup, bukan pada tiap soal.",
                    path: ["packageId"],
                  }),
              )
              .min(1)
              .max(100, "Maksimal 100 soal per impor."),
          })
          .refine((group) => !(group.packageId && group.packageName), {
            message: "Gunakan packageId atau packageName, jangan keduanya.",
            path: ["packageName"],
          }),
      )
      .min(1)
      .max(30),
  })
  .refine(
    (input) => input.groups.reduce((sum, group) => sum + group.questions.length, 0) <= 100,
    "Maksimal 100 soal per impor.",
  );

export const submissionSchema = z.object({
  submissionId: z.uuid().optional(),
  answers: z.record(z.uuid(), z.number().int().min(0).max(4)),
  packageId: z.uuid().optional().nullable(),
  timeSpentSeconds: z.number().int().min(0).optional(),
  questionTimes: z.record(z.uuid(), z.number().int().min(0)).optional(),
});
export const bankQuerySchema = z.object({
  cari: z.string().trim().max(200).optional(),
  subtes: z.string().max(100).optional(),
  kategori: z.string().max(120).optional(),
  paket: z.string().max(100).optional(),
  halaman: z.coerce.number().int().min(1).max(10000).default(1),
});
export const idSchema = z.uuid();
export const bulkDeleteSchema = z.object({
  ids: z
    .array(idSchema)
    .min(1)
    .max(100)
    .refine((ids) => new Set(ids).size === ids.length, "ID soal tidak boleh berulang."),
});
export type NewQuestion = z.infer<typeof questionSchema>;
export type QuestionImport = z.input<typeof questionImportSchema>;
export type Submission = z.infer<typeof submissionSchema>;
export type User = { id: string; name: string; email: string; role: string; image?: string | null };
export type Topic = {
  id: string;
  slug: string;
  name: string;
  description: string;
  short: string;
  section: string;
  category?: string;
  questionCount: number;
  packageCount?: number;
};
export type PracticeQuestion = {
  id: string;
  prompt: string;
  options: string[];
  annotations?: LexiconAnnotation[];
  passage?: string | null;
  passageId?: string | null;
};
export type ReviewQuestion = PracticeQuestion & {
  selectedAnswer: number;
  correctAnswer: number;
  isCorrect: number;
  explanation: string;
};
export type HistoryItem = {
  id: string;
  topic: string;
  slug: string;
  packageId?: string | null;
  packageName?: string | null;
  correct: number;
  total: number;
  submittedAt: string;
  earnedXP?: number;
  score?: number | null;
  rawScore?: number | null;
  timeSpentSeconds?: number | null;
  scoreBreakdown?: LatveriaScoreResult | null;
};
export type Result = { attempt: HistoryItem; answers: ReviewQuestion[] };
export type QuestionDetail = NewQuestion & {
  id: string;
  topic: string;
  slug: string;
  packageName?: string | null;
  usage: number;
  workflowStatus?: QuestionWorkflowStatus;
  difficulty?: QuestionDifficulty;
  tags?: string[];
  sourceQuestionId?: string | null;
  reviewerNotes?: string | null;
};
export type Bank = {
  rows: {
    id: string;
    prompt: string;
    category: string | null;
    topic: string;
    packageId?: string | null;
    packageName?: string | null;
    source: string;
    annotationsCount?: number;
    passage?: string | null;
    passageId?: string | null;
    workflowStatus?: QuestionWorkflowStatus;
    difficulty?: QuestionDifficulty;
    tags?: string[];
  }[];
  total: number;
  page: number;
  pageCount: number;
  categories: string[];
  packages?: { id: string; name: string; topicId: string; questionCount: number }[];
  tabs: { slug: string; name: string; value: number }[];
};

export type QuestionPackage = {
  id: string;
  topicId: string;
  name: string;
  description: string | null;
  order: number;
  isActive: boolean;
  packageType: "Tryout" | "Airdrop Fundamental" | "Airdrop Akselerasi" | string;
  category: "utbk" | "ujian-mandiri" | "tka" | "mata-kuliah" | string;
  duration: number;
  isFullTryout: boolean;
  targetQuestions: number;
  published: boolean;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type LearnerPackage = {
  id: string;
  name: string;
  description: string | null;
  order: number;
  questionCount: number;
  packageType?: "Tryout" | "Airdrop Fundamental" | "Airdrop Akselerasi";
  category?: string;
  duration?: number;
  isFullTryout?: boolean;
};

export type PackageDetail = QuestionPackage & {
  topicName: string;
  topicSlug: string;
  questions: {
    id: string;
    prompt: string;
    passage?: string | null;
    passageId?: string | null;
    category: string | null;
    source: string;
    usage: number;
  }[];
};

export * from "./warrior";
export * from "./latex";
export * from "./question-intelligence";
export { sha256 } from "./sha256";
