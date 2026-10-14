import type { QuestionDetail, QuestionImport } from "@latveria/shared";
import { parseQuestionImport } from "./question-import";

/** Kategori pengganti di JSON karena `category` grup impor wajib diisi. */
export const NO_CATEGORY = "Tanpa kategori";

/** Mengubah satu soal menjadi JSON dengan format yang sama dengan impor soal. */
export function questionToImport(item: QuestionDetail): QuestionImport {
  return {
    groups: [
      {
        subtes: item.slug,
        category: item.category?.trim() || NO_CATEGORY,
        ...(item.packageId ? { packageId: item.packageId } : {}),
        questions: [
          {
            prompt: item.prompt,
            ...(item.passage && !item.passageId ? { passage: item.passage } : {}),
            ...(item.passageId ? { passageId: item.passageId } : {}),
            options: item.options,
            correctAnswer: item.correctAnswer,
            explanation: item.explanation,
            source: item.source,
            annotations: item.annotations ?? [],
          },
        ],
      },
    ],
  };
}

export function questionToJson(item: QuestionDetail): string {
  return JSON.stringify(questionToImport(item), null, 2);
}

/**
 * Memvalidasi JSON edit dengan `questionImportSchema`, lalu menyusun body `PUT /admin/questions/:id`.
 * Backend tetap memvalidasi ulang body ini.
 */
export function parseQuestionEdit(text: string, topics: { id: string; slug: string }[]) {
  const data = parseQuestionImport(text);
  if (data.groups.length !== 1 || data.groups[0].questions.length !== 1)
    throw new Error("Edit lewat JSON hanya menerima satu grup berisi satu soal.");
  const group = data.groups[0];
  if (group.packageName)
    throw new Error("Gunakan packageId untuk memindahkan paket. packageName hanya untuk impor.");
  const topic = topics.find((item) => item.slug === group.subtes);
  if (!topic) throw new Error("Subtes tidak dikenal. Gunakan slug subtes seperti pada ekspor.");
  return {
    ...group.questions[0],
    topicId: topic.id,
    packageId: group.packageId ?? null,
    category: group.category === NO_CATEGORY ? undefined : group.category,
  };
}

export function downloadJson(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function questionFilename(item: Pick<QuestionDetail, "id" | "slug">) {
  return `soal-${item.slug}-${item.id.slice(0, 8)}.json`;
}
