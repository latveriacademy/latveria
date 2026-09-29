"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "../../lib/access";
import { getDb } from "../../lib/db";
import { questions } from "../../lib/db/schema";

const input = z.object({
  topicId: z.uuid(),
  prompt: z.string().trim().min(5).max(1000),
  options: z.array(z.string().trim().min(1).max(300)).length(4).refine((items) => new Set(items).size === 4),
  correctAnswer: z.enum(["0", "1", "2", "3"]).transform(Number),
  explanation: z.string().trim().min(5).max(2000),
  source: z.string().trim().min(3).max(300),
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
  });
  if (!result.success) return "Periksa kembali semua kolom. Empat opsi dan pembahasan wajib diisi.";
  try {
    await getDb().insert(questions).values(result.data);
  } catch {
    return "Gagal menyimpan soal. Pastikan topik masih tersedia lalu coba lagi.";
  }
  revalidatePath("/admin");
  return "Soal tersimpan.";
}
