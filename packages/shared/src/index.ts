import { z } from "zod";
export { utbkSubtests } from "./utbk-subtests";

export const credentialsSchema = z.object({ email: z.email(), password: z.string().min(8).max(128) });
export const signupSchema = credentialsSchema.extend({ name: z.string().trim().min(1).max(100) });
export const questionSchema = z.object({
  topicId: z.uuid(), prompt: z.string().trim().min(5).max(1000),
  options: z.array(z.string().trim().min(1).max(300)).length(4).refine((items) => new Set(items).size === 4, "Opsi harus berbeda."),
  correctAnswer: z.number().int().min(0).max(3), explanation: z.string().trim().min(5).max(2000),
  source: z.string().trim().min(3).max(300), category: z.string().trim().max(120).optional(),
});
export const questionImportSchema = z.object({
  groups: z.array(z.object({
    subtes: z.string().min(1),
    category: z.string().trim().min(1).max(120),
    questions: z.array(questionSchema.omit({ topicId: true, category: true })).min(1).max(100),
  })).min(1).max(20),
}).refine((input) => input.groups.reduce((sum, group) => sum + group.questions.length, 0) <= 100, "Maksimal 100 soal per impor.");
export const submissionSchema = z.object({ answers: z.record(z.uuid(), z.number().int().min(0).max(3)) });
export const bankQuerySchema = z.object({ subtes: z.string().max(100).optional(), kategori: z.string().max(120).optional(), halaman: z.coerce.number().int().min(1).max(10000).default(1) });
export const idSchema = z.uuid();
export type NewQuestion = z.infer<typeof questionSchema>;
export type QuestionImport = z.infer<typeof questionImportSchema>;
export type Submission = z.infer<typeof submissionSchema>;
export type User = { id: string; name: string; email: string; role: string };
export type Topic = { id: string; slug: string; name: string; description: string; short: string; section: "tps" | "literasi"; questionCount: number };
export type PracticeQuestion = { id: string; prompt: string; options: string[] };
export type ReviewQuestion = PracticeQuestion & { selectedAnswer: number; correctAnswer: number; isCorrect: number; explanation: string };
export type HistoryItem = { id: string; topic: string; slug: string; correct: number; total: number; submittedAt: string };
export type Result = { attempt: HistoryItem; answers: ReviewQuestion[] };
export type QuestionDetail = NewQuestion & { id: string; topic: string; slug: string; usage: number };
export type Bank = { rows: { id: string; prompt: string; category: string | null; topic: string; source: string }[]; total: number; page: number; pageCount: number; categories: string[]; tabs: { slug: string; name: string; value: number }[] };
