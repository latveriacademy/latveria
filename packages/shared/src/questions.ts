import { z } from "zod";
import {
  lexiconAnnotationInputSchema,
  resolveLexiconAnnotations,
  validLexiconRanges,
} from "./lexicon";

// ==========================================
// CONTENT BLOCKS & STIMULUS
// ==========================================

export const textBlockSchema = z.object({
  type: z.literal("text"),
  content: z.string().trim().min(1).max(10000),
});

export const latexBlockSchema = z.object({
  type: z.literal("latex"),
  source: z.string().trim().min(1).max(5000),
});

export const tableBlockSchema = z
  .object({
    type: z.literal("table"),
    title: z.string().trim().max(200).optional(),
    columns: z.array(z.string().trim().max(200)).max(20).optional(),
    rows: z
      .array(z.array(z.union([z.string(), z.number()])))
      .max(100)
      .optional(),
    source: z.string().trim().max(5000).optional(),
  })
  .refine(
    (t) => (Array.isArray(t.columns) && Array.isArray(t.rows)) || Boolean(t.source),
    "Tabel harus memiliki columns dan rows atau source array.",
  );

export const chartPointSchema = z.object({
  label: z.string().trim().min(1).max(100),
  value: z.number(),
});

export const chartBlockSchema = z.object({
  type: z.literal("chart"),
  chartType: z.enum(["bar", "line"]),
  title: z.string().trim().max(200).optional(),
  xLabel: z.string().trim().max(100).optional(),
  yLabel: z.string().trim().max(100).optional(),
  data: z.array(chartPointSchema).min(1).max(50),
});

export const diagramBlockSchema = z.object({
  type: z.literal("diagram"),
  source: z.string().trim().min(1).max(5000),
  caption: z.string().trim().max(300).optional(),
});

export const imageBlockSchema = z.object({
  type: z.literal("image"),
  url: z.string().trim().min(1).max(1000),
  alt: z.string().trim().max(300).optional(),
  caption: z.string().trim().max(300).optional(),
});

export const contentBlockSchema = z.discriminatedUnion("type", [
  textBlockSchema,
  latexBlockSchema,
  tableBlockSchema,
  chartBlockSchema,
  diagramBlockSchema,
  imageBlockSchema,
]);

export const stimulusSchema = z.object({
  title: z.string().trim().max(300).optional(),
  passage: z.string().trim().max(20000).optional(),
  blocks: z.array(contentBlockSchema).max(30).default([]),
});

export type TextBlock = z.infer<typeof textBlockSchema>;
export type LatexBlock = z.infer<typeof latexBlockSchema>;
export type TableBlock = z.infer<typeof tableBlockSchema>;
export type ChartPoint = z.infer<typeof chartPointSchema>;
export type ChartBlock = z.infer<typeof chartBlockSchema>;
export type DiagramBlock = z.infer<typeof diagramBlockSchema>;
export type ImageBlock = z.infer<typeof imageBlockSchema>;
export type ContentBlock = z.infer<typeof contentBlockSchema>;
export type QuestionStimulus = z.infer<typeof stimulusSchema>;

// ==========================================
// TRUE / FALSE GROUP
// ==========================================

export const trueFalseStatementSchema = z.object({
  id: z.string().trim().min(1).max(50),
  text: z.string().trim().min(1).max(1000),
  answer: z.boolean(),
});

export const trueFalseStatementClientSchema = z.object({
  id: z.string().trim().min(1).max(50),
  text: z.string().trim().min(1).max(1000),
  answer: z.boolean().optional(),
});

export const scoringConfigSchema = z.object({
  mode: z.enum(["per_statement", "all_or_nothing"]).default("per_statement"),
  points: z.number().int().min(1).max(100).default(1),
});

export type TrueFalseStatement = z.infer<typeof trueFalseStatementSchema>;
export type TrueFalseStatementClient = z.infer<typeof trueFalseStatementClientSchema>;
export type ScoringConfig = z.infer<typeof scoringConfigSchema>;

export type QuestionType = "single_choice" | "true_false_group";

// ==========================================
// TRYOUT SECTIONS DTO & SCHEMAS
// ==========================================

export const createTryoutSectionSchema = z.object({
  subtestCode: z.string().trim().min(1).max(20),
  title: z.string().trim().min(1).max(100),
  sectionOrder: z.coerce.number().int().min(0).default(0),
  durationSeconds: z.coerce.number().int().min(60).max(14400).default(1800),
});

export const updateTryoutSectionSchema = createTryoutSectionSchema.partial();

export type CreateTryoutSectionInput = z.infer<typeof createTryoutSectionSchema>;
export type UpdateTryoutSectionInput = z.infer<typeof updateTryoutSectionSchema>;

export type TryoutSectionItem = {
  id: string;
  tryoutPackageId: string;
  subtestCode: string;
  title: string;
  sectionOrder: number;
  durationSeconds: number;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type TryoutSectionQuestion = {
  id: string;
  questionId: string;
  sectionId: string;
  position: number;
  prompt: string;
  type: QuestionType;
  category: string | null;
  itemWeight: number;
  calculatorAllowed: boolean;
  stimulus?: QuestionStimulus | null;
  passage?: string | null;
  passageId?: string | null;
  scoring?: ScoringConfig | null;
  annotations?: import("./lexicon").LexiconAnnotation[];
  options?: string[];
  statements?: TrueFalseStatementClient[] | null;
  correctAnswer?: number | null;
  explanation?: string | null;
  source?: string | null;
};
export type AdminTryoutSectionDetail = {
  tryout: { id: string; name: string; published: boolean };
  section: TryoutSectionWithQuestions;
};

export type TryoutSectionWithQuestions = TryoutSectionItem & {
  questions: TryoutSectionQuestion[];
};

// ==========================================
// SECTION IMPORT SCHEMAS
// ==========================================

export const passageImportItemSchema = z
  .object({
    externalId: z.string().trim().min(1).max(100),
    title: z.string().trim().max(300).optional(),
    content: z.string().trim().max(20000).optional(),
    blocks: z.array(contentBlockSchema).max(30).optional(),
  })
  .refine(
    (p) =>
      Boolean(p.content && p.content.trim()) || (Array.isArray(p.blocks) && p.blocks.length > 0),
    "Passage harus memiliki content teks atau blocks.",
  );

export type PassageImportItem = z.infer<typeof passageImportItemSchema>;

const baseSectionImportQuestion = z.object({
  annotations: z.array(lexiconAnnotationInputSchema).max(20).default([]),
  externalId: z.string().trim().max(50).optional(),
  passageId: z.string().trim().max(100).optional().nullable(),
  prompt: z.string().trim().min(3).max(5000),
  stimulus: stimulusSchema.optional().nullable(),
  passage: z.string().trim().max(20000).optional().nullable(),
  explanation: z.string().trim().min(3).max(5000).default("Pembahasan tersedia."),
  source: z.string().trim().max(300).default("Tryout Latveria"),
  category: z.string().trim().max(120).optional(),
  itemWeight: z.coerce.number().int().min(10).max(300).default(100),
  calculatorAllowed: z.boolean().default(false),
  position: z.coerce.number().int().min(1).max(200).optional(),
});

export const singleChoiceImportQuestionSchema = baseSectionImportQuestion.extend({
  type: z.literal("single_choice").default("single_choice"),
  options: z
    .array(z.string().trim().min(1).max(1000))
    .length(5, "Pilihan ganda harus memiliki tepat 5 opsi.")
    .refine((items) => new Set(items).size === 5, "Opsi harus berbeda."),
  correctAnswer: z.union([
    z.coerce.number().int().min(0).max(4),
    z.enum(["A", "B", "C", "D", "E"]).transform((val) => "ABCDE".indexOf(val)),
  ]),
});

export const trueFalseImportQuestionSchema = baseSectionImportQuestion.extend({
  type: z.literal("true_false_group"),
  statements: z
    .array(trueFalseStatementSchema)
    .min(2, "Minimal 2 pernyataan.")
    .max(10, "Maksimal 10 pernyataan.")
    .refine(
      (items) => new Set(items.map((s) => s.id)).size === items.length,
      "ID pernyataan harus unik.",
    ),
  scoring: scoringConfigSchema.default({ mode: "per_statement", points: 1 }),
});

export const sectionImportQuestionSchema = z
  .union([trueFalseImportQuestionSchema, singleChoiceImportQuestionSchema])
  .transform((q) => ({ ...q, annotations: resolveLexiconAnnotations(q.prompt, q.annotations) }))
  .refine(
    (q) => validLexiconRanges(q.prompt, q.annotations),
    "Anotasi tidak sesuai dengan pertanyaan.",
  );

export const sectionImportSchema = z
  .object({
    schemaVersion: z.coerce.number().int().min(1).max(2).default(2),
    subtest: z.string().trim().max(50).optional(),
    passages: z.array(passageImportItemSchema).max(50).optional(),
    questions: z
      .array(sectionImportQuestionSchema)
      .min(1, "Minimal 1 soal untuk diimpor.")
      .max(100, "Maksimal 100 soal per subtes."),
  })
  .superRefine((data, ctx) => {
    if (data.passages && data.passages.length > 0) {
      const passageIds = new Set(data.passages.map((p) => p.externalId));
      data.questions.forEach((q, idx) => {
        if (q.passageId && !passageIds.has(q.passageId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Referensi passageId "${q.passageId}" tidak ditemukan pada daftar passages.`,
            path: ["questions", idx, "passageId"],
          });
        }
      });
    }
  });

export type SectionImportQuestion = z.infer<typeof sectionImportQuestionSchema>;
export type SectionImportInput = z.infer<typeof sectionImportSchema>;
