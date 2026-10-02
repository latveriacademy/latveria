import { z } from "zod";
export { utbkSubtests } from "./utbk-subtests";
export { cylinderTankQuestion, openCuboidQuestion, pyramidQuestion } from "./geometry-examples";

export const credentialsSchema = z.object({ email: z.email(), password: z.string().min(8).max(128) });
export const signupSchema = credentialsSchema.extend({ name: z.string().trim().min(1).max(100) });
export const profileSchema = z.object({
  name: z.string().trim().min(1, "Nama tidak boleh kosong.").max(100, "Nama maksimal 100 karakter."),
  codename: z.string().trim().max(100, "Nama panggilan maksimal 100 karakter."),
  targetUniversity: z.string().trim().max(200, "Target PTN maksimal 200 karakter."),
  bio: z.string().trim().max(500, "Bio maksimal 500 karakter."),
  motto: z.string().trim().max(200, "Motto maksimal 200 karakter."),
}).strict();
export type Profile = z.infer<typeof profileSchema>;

export const createPackageSchema = z.object({
  name: z.string().trim().min(1, "Nama paket tidak boleh kosong.").max(100, "Nama paket maksimal 100 karakter."),
  description: z.string().trim().max(500, "Deskripsi maksimal 500 karakter.").optional().nullable(),
  order: z.coerce.number().int().min(0, "Urutan harus berupa bilangan bulat positif.").default(0),
  isActive: z.boolean().default(true),
});
export type CreatePackageInput = z.infer<typeof createPackageSchema>;

export const updatePackageSchema = z.object({
  name: z.string().trim().min(1, "Nama paket tidak boleh kosong.").max(100, "Nama paket maksimal 100 karakter.").optional(),
  description: z.string().trim().max(500, "Deskripsi maksimal 500 karakter.").optional().nullable(),
  order: z.coerce.number().int().min(0, "Urutan harus berupa bilangan bulat positif.").optional(),
  isActive: z.boolean().optional(),
});
export type UpdatePackageInput = z.infer<typeof updatePackageSchema>;

export const assignQuestionToPackageSchema = z.object({
  questionId: z.uuid("ID soal tidak valid."),
});
export type AssignQuestionToPackageInput = z.infer<typeof assignQuestionToPackageSchema>;

export const moveQuestionPackageSchema = z.object({
  packageId: z.uuid("ID paket tujuan tidak valid.").nullable(),
});
export type MoveQuestionPackageInput = z.infer<typeof moveQuestionPackageSchema>;

export const questionSchema = z.object({
  topicId: z.uuid(),
  packageId: z.uuid("ID paket tidak valid.").optional().nullable(),
  prompt: z.string().trim().min(5).max(1000),
  options: z.array(z.string().trim().min(1).max(300)).length(4).refine((items) => new Set(items).size === 4, "Opsi harus berbeda."),
  correctAnswer: z.number().int().min(0).max(3), explanation: z.string().trim().min(5).max(2000),
  source: z.string().trim().min(3).max(300), category: z.string().trim().max(120).optional(),
});
export const questionImportSchema = z.object({
  groups: z.array(z.object({
    subtes: z.string().min(1),
    category: z.string().trim().min(1).max(120),
    packageId: z.uuid("ID paket tidak valid.").optional(),
    packageName: z.string().trim().min(1, "Nama paket tidak boleh kosong.").max(100).optional(),
    questions: z.array(questionSchema.omit({ topicId: true, category: true }).refine((question) => !question.packageId, { message: "Tentukan packageId atau packageName pada grup, bukan pada tiap soal.", path: ["packageId"] })).min(1).max(100),
  }).refine((group) => !(group.packageId && group.packageName), { message: "Gunakan packageId atau packageName, jangan keduanya.", path: ["packageName"] })).min(1).max(20),
}).refine((input) => input.groups.reduce((sum, group) => sum + group.questions.length, 0) <= 100, "Maksimal 100 soal per impor.");
export const submissionSchema = z.object({
  answers: z.record(z.uuid(), z.number().int().min(0).max(3)),
  packageId: z.uuid().optional().nullable(),
});
export const bankQuerySchema = z.object({
  subtes: z.string().max(100).optional(),
  kategori: z.string().max(120).optional(),
  paket: z.string().max(100).optional(),
  halaman: z.coerce.number().int().min(1).max(10000).default(1),
});
export const idSchema = z.uuid();
export const bulkDeleteSchema = z.object({ ids: z.array(idSchema).min(1).max(100).refine((ids) => new Set(ids).size === ids.length, "ID soal tidak boleh berulang.") });
export type NewQuestion = z.infer<typeof questionSchema>;
export type QuestionImport = z.infer<typeof questionImportSchema>;
export type Submission = z.infer<typeof submissionSchema>;
export type User = { id: string; name: string; email: string; role: string };
export type Topic = { id: string; slug: string; name: string; description: string; short: string; section: "tps" | "literasi"; questionCount: number; packageCount?: number };
export type PracticeQuestion = { id: string; prompt: string; options: string[] };
export type ReviewQuestion = PracticeQuestion & { selectedAnswer: number; correctAnswer: number; isCorrect: number; explanation: string };
export type HistoryItem = { id: string; topic: string; slug: string; packageId?: string | null; packageName?: string | null; correct: number; total: number; submittedAt: string };
export type Result = { attempt: HistoryItem; answers: ReviewQuestion[] };
export type QuestionDetail = NewQuestion & { id: string; topic: string; slug: string; packageName?: string | null; usage: number };
export type Bank = {
  rows: { id: string; prompt: string; category: string | null; topic: string; packageId?: string | null; packageName?: string | null; source: string }[];
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
};

export type PackageDetail = QuestionPackage & {
  topicName: string;
  topicSlug: string;
  questions: {
    id: string;
    prompt: string;
    category: string | null;
    source: string;
    usage: number;
  }[];
};
