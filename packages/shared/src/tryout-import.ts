import { z } from "zod";
import { sectionImportSchema, sectionImportQuestionSchema } from "./questions";
import { utbkSubtests } from "./utbk-subtests";

export const tryoutImportSchema = z
  .object({
    schemaVersion: z.number().int().min(1).max(2).default(2),
    groups: z
      .array(
        z.object({
          subtes: z
            .string()
            .refine((slug) => utbkSubtests.some((s) => s.slug === slug), "Subtes tidak dikenal."),
          category: z.string().trim().max(120).optional(),
          questions: z.array(sectionImportQuestionSchema).min(1).max(100),
        }),
      )
      .min(1)
      .max(30),
  })
  .refine(
    (batch) => batch.groups.reduce((n, group) => n + group.questions.length, 0) <= 100,
    "Maksimal 100 soal per impor.",
  );

/** Both import entry points normalize to the same group-based request. */
export function normalizeTryoutImport(body: unknown, selectedSubtest?: string) {
  if (body && typeof body === "object" && "questions" in body) {
    const parsed = sectionImportSchema.safeParse(body);
    if (!parsed.success)
      throw new Error(
        `Periksa ${parsed.error.issues[0].path.join(".")}: ${parsed.error.issues[0].message}`,
      );
    const legacy = parsed.data;
    const slug = legacy.subtest
      ? utbkSubtests.find((s) => s.short === legacy.subtest || s.slug === legacy.subtest)?.slug
      : selectedSubtest;
    if (!slug) throw new Error("Pilih subtes tujuan untuk format questions.");
    body = {
      schemaVersion: legacy.schemaVersion,
      groups: [{ subtes: slug, questions: legacy.questions }],
    };
  }
  const parsed = tryoutImportSchema.safeParse(body);
  if (!parsed.success)
    throw new Error(
      `Periksa ${parsed.error.issues[0].path.join(".") || "batch"}: ${parsed.error.issues[0].message}`,
    );
  const batch = parsed.data;
  if (selectedSubtest && batch.groups.some((group) => group.subtes !== selectedSubtest))
    throw new Error("Semua grup harus menggunakan subtes tujuan yang dipilih.");
  return batch;
}
export type TryoutImport = z.infer<typeof tryoutImportSchema>;
