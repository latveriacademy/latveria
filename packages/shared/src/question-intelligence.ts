import { z } from "zod";
import { sha256 } from "./sha256";
import type { QuestionStimulus, TrueFalseStatement, ScoringConfig } from "./questions";

// ==========================================
// QUESTION INTELLIGENCE TYPES & ENUMS
// ==========================================

export const questionWorkflowStatusEnum = z.enum([
  "draft",
  "in_review",
  "approved",
  "published",
  "archived",
]);
export type QuestionWorkflowStatus = z.infer<typeof questionWorkflowStatusEnum>;

export const questionDifficultyEnum = z.enum(["easy", "medium", "hard"]);
export type QuestionDifficulty = z.infer<typeof questionDifficultyEnum>;

// ==========================================
// DETERMINISTIC NORMALIZATION & FINGERPRINT
// ==========================================

export function normalizeContentWhitespace(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line, idx, arr) => line !== "" || (idx > 0 && arr[idx - 1] !== ""))
    .join("\n")
    .trim();
}

export interface QuestionFingerprintInput {
  prompt: string;
  passage?: string | null;
  stimulus?: QuestionStimulus | null;
  questionType?: string;
  options?: string[];
  statements?: TrueFalseStatement[] | null;
  scoringConfig?: ScoringConfig | null;
}

export function buildCanonicalQuestionContent(input: QuestionFingerprintInput): string {
  const normType = input.questionType || "single_choice";
  const normPrompt = normalizeContentWhitespace(input.prompt);

  const rawPassage = input.passage || input.stimulus?.passage || "";
  const normPassage = normalizeContentWhitespace(rawPassage);

  let optionsPart = "";
  if (Array.isArray(input.options)) {
    optionsPart = input.options.map((opt) => normalizeContentWhitespace(opt)).join("##OPT##");
  }

  let statementsPart = "";
  if (Array.isArray(input.statements)) {
    statementsPart = input.statements
      .map((s) => `${s.id}::${normalizeContentWhitespace(s.text)}::${Boolean(s.answer)}`)
      .join("##STMT##");
  }

  const scoringPart = input.scoringConfig
    ? `${input.scoringConfig.mode || "per_statement"}::${input.scoringConfig.points || 1}`
    : "";

  return [
    `TYPE:${normType}`,
    `PROMPT:${normPrompt}`,
    `PASSAGE:${normPassage}`,
    `OPTIONS:${optionsPart}`,
    `STATEMENTS:${statementsPart}`,
    `SCORING:${scoringPart}`,
  ].join("\n--CANONICAL_BOUNDARY--\n");
}

export function computeQuestionFingerprint(input: QuestionFingerprintInput): string {
  const canonical = buildCanonicalQuestionContent(input);
  return sha256(canonical);
}

// ==========================================
// DUPLICATE & SIMILARITY SCHEMAS
// ==========================================

export const checkDuplicateSchema = z.object({
  prompt: z.string().min(1),
  passage: z.string().optional().nullable(),
  options: z.array(z.string()).optional(),
  statements: z.array(z.any()).optional(),
  questionType: z.string().default("single_choice"),
  excludeId: z.string().uuid().optional(),
});
export type CheckDuplicateInput = z.infer<typeof checkDuplicateSchema>;

export const checkSimilaritySchema = z.object({
  prompt: z.string().min(1),
  topicId: z.string().uuid().optional(),
  threshold: z.coerce.number().min(0.1).max(1.0).default(0.4),
  excludeId: z.string().uuid().optional(),
});
export type CheckSimilarityInput = z.infer<typeof checkSimilaritySchema>;

export interface DuplicateMatchItem {
  id: string;
  prompt: string;
  topicName: string;
  subtestSlug: string;
  packageName: string | null;
  workflowStatus: QuestionWorkflowStatus;
  similarityScore: number; // 1.0 = exact duplicate
  matchType: "exact" | "similar";
  reason: string;
}

export interface DuplicateCheckResponse {
  isExactDuplicate: boolean;
  fingerprint: string;
  exactMatch: DuplicateMatchItem | null;
  similarCandidates: DuplicateMatchItem[];
}

// ==========================================
// ADVANCED SEARCH SCHEMAS
// ==========================================

export const advancedSearchQuerySchema = z.object({
  subtes: z.string().optional(),
  kategori: z.string().optional(),
  paket: z.string().optional(),
  tipe: z.enum(["single_choice", "true_false_group"]).optional(),
  difficulty: questionDifficultyEnum.optional(),
  status: questionWorkflowStatusEnum.optional(),
  tag: z.string().optional(),
  hasPassage: z.coerce.boolean().optional(),
  hasMedia: z.coerce.boolean().optional(),
  hasReports: z.coerce.boolean().optional(),
  isUsed: z.coerce.boolean().optional(),
  hasValidationIssue: z.coerce.boolean().optional(),
  author: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  cari: z.string().max(200).optional(),
  sortBy: z
    .enum(["created_at", "updated_at", "prompt", "subtest", "difficulty", "order"])
    .default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  halaman: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(15),
});
export type AdvancedSearchQuery = z.infer<typeof advancedSearchQuerySchema>;

// ==========================================
// BULK ACTIONS
// ==========================================

export const bulkActionSchema = z.object({
  questionIds: z.array(z.string().uuid()).min(1).max(200),
  action: z.enum([
    "set_status",
    "add_tags",
    "remove_tags",
    "set_difficulty",
    "assign_package",
    "detach_package",
    "archive",
    "delete",
  ]),
  payload: z
    .object({
      status: questionWorkflowStatusEnum.optional(),
      tags: z.array(z.string().trim().min(1).max(50)).optional(),
      difficulty: questionDifficultyEnum.optional(),
      packageId: z.string().uuid().nullable().optional(),
    })
    .optional(),
});
export type BulkActionInput = z.infer<typeof bulkActionSchema>;

export interface BulkActionResult {
  total: number;
  succeeded: number;
  failed: number;
  errors: { id: string; reason: string }[];
}

// ==========================================
// QUALITY CHECKER & AUDIT SCHEMAS
// ==========================================

export interface QualityIssue {
  code: string;
  severity: "error" | "warning" | "info";
  message: string;
  field?: string;
  suggestion?: string;
  resolved?: boolean;
}

export interface QuestionQualityReport {
  isValid: boolean;
  canPublish: boolean;
  qualityScore: number;
  issues: QualityIssue[];
}

export const reviewActionSchema = z.object({
  action: z.enum(["approve", "request_changes", "reject"]),
  notes: z.string().max(1000).optional(),
});
export type ReviewActionInput = z.infer<typeof reviewActionSchema>;

// ==========================================
// USAGE MAP & PERFORMANCE ANALYTICS
// ==========================================

export interface QuestionUsageMap {
  questionId: string;
  canDeletePermanently: boolean;
  cannotDeleteReason?: string;
  packages: { id: string; name: string }[];
  tryouts: { id: string; name: string; sectionCode: string }[];
  activeSessionsCount: number;
  practiceAttemptsCount: number;
  tryoutResponsesCount: number;
  reportsCount: number;
  revisionsCount: number;
}

export interface OptionDistributionItem {
  optionIndex: number;
  label: string;
  count: number;
  percentage: number;
}

export interface QuestionPerformanceAnalytics {
  questionId: string;
  totalAttempts: number;
  correctCount: number;
  accuracyPercentage: number;
  isLowSample: boolean;
  medianTimeSeconds: number;
  skipCount: number;
  skipPercentage: number;
  optionDistribution: OptionDistributionItem[];
  empiricalDifficulty: "very_easy" | "easy" | "medium" | "hard" | "very_hard";
  configuredDifficulty: string;
  reportsCount: number;
}

// ==========================================
// PASSAGE LIBRARY SCHEMAS
// ==========================================

export const passageLibraryItemSchema = z.object({
  title: z.string().trim().min(1).max(300),
  content: z.string().trim().max(30000).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(50)).default([]),
  isArchived: z.boolean().default(false),
});
export type PassageLibraryInput = z.infer<typeof passageLibraryItemSchema>;

export interface PassageLibraryDetail {
  id: string;
  title: string;
  content: string | null;
  tags: string[];
  isArchived: boolean;
  usedInQuestionsCount: number;
  usedInQuestions: { id: string; prompt: string; subtest: string }[];
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// VERSION DIFF DTO
// ==========================================

export interface QuestionVersionItem {
  id: string;
  questionId: string;
  versionNumber: number;
  contentHash: string;
  authorName: string | null;
  changeSummary: string | null;
  changeReason: string | null;
  createdAt: string;
}

export interface QuestionVersionDiff {
  oldVersion: number;
  newVersion: number;
  changedFields: string[];
  diffs: Record<string, { before: unknown; after: unknown }>;
}
