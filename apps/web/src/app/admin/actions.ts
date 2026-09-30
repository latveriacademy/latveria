"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "../../lib/access";
import { getDb } from "../../lib/db";
import { practiceAnswers, questions, topics } from "../../lib/db/schema";

const input = z.object({
  topicId: z.uuid(),
  prompt: z.string().trim().min(5).max(1000),
  options: z.array(z.string().trim().min(1).max(300)).length(4).refine((items) => new Set(items).size === 4),
  correctAnswer: z.enum(["0", "1", "2", "3"]).transform(Number),
  explanation: z.string().trim().min(5).max(2000),
  source: z.string().trim().min(3).max(300),
  category: z.string().trim().max(120).optional(),
});

export async function createQuestion(_previous: string, form: FormData) {
  await requireAdmin();
  const result = input.safeParse({
    topicId: form.get("topicId"),
    prompt: form.get("prompt"),
    options: [0, 1, 2, 3].map((index) => form.get(`option-${index}`)),
    correctAnswer: form.get("correctAnswer"),
    explanation: form.get("explanation"),
    source: form.get("source"),
    category: String(form.get("category") ?? "").trim() || undefined,
  });
  if (!result.success) return "Periksa kembali semua kolom. Empat opsi dan pembahasan wajib diisi.";
  const [topic] = await getDb().select({ slug: topics.slug }).from(topics).where(eq(topics.id, result.data.topicId));
  if (!topic) return "Subtes tidak ditemukan. Pilih subtes lain lalu coba lagi.";
  let createdId: string;
  try {
    const [created] = await getDb().insert(questions).values(result.data).returning({ id: questions.id });
    createdId = created.id;
  } catch {
    return "Soal gagal disimpan. Periksa data lalu coba lagi.";
  }
  revalidatePath("/admin");
  revalidatePath("/admin/soal");
  redirect(`/admin/soal?subtes=${topic.slug}&created=${createdId}`);
}

export async function deleteQuestion(_previous: string, form: FormData) {
  await requireAdmin();
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return "ID soal tidak valid.";
  const [question] = await getDb().select({ topicId: questions.topicId }).from(questions).where(eq(questions.id, id.data));
  if (!question) return "Soal tidak ditemukan.";
  const [used] = await getDb().select({ value: count() }).from(practiceAnswers).where(eq(practiceAnswers.questionId, id.data));
  if (used.value > 0) return "Soal sudah digunakan pada latihan dan tidak dapat dihapus agar riwayat peserta tetap utuh.";
  const [topic] = await getDb().select({ slug: topics.slug }).from(topics).where(eq(topics.id, question.topicId));
  await getDb().delete(questions).where(eq(questions.id, id.data));
  revalidatePath("/admin/soal");
  redirect(`/admin/soal?subtes=${topic.slug}&deleted=1`);
}
