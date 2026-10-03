import { questionImportSchema, utbkSubtests, type QuestionImport } from "@latveria/shared";

export const packageImportExample: QuestionImport = {
  groups: [
    {
      subtes: "pengetahuan-kuantitatif",
      packageName: "Paket Persentase",
      category: "Persentase",
      questions: [
        {
          prompt: "Berapakah 25 persen dari 80?",
          options: ["10", "15", "20", "25"],
          correctAnswer: 2,
          explanation: "25 persen sama dengan seperempat. Seperempat dari 80 adalah 20.",
          source: "Soal contoh buatan tim",
        },
      ],
    },
  ],
};

export function parseQuestionImport(text: string): QuestionImport {
  if (!text.trim()) throw new Error("Masukkan JSON atau pilih file terlebih dahulu.");
  if (new TextEncoder().encode(text).byteLength > 200_000)
    throw new Error(
      "JSON melebihi 200 KB. Kurangi jumlah soal atau pisahkan menjadi beberapa impor.",
    );
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    throw new Error("JSON tidak valid. Periksa tanda kutip, koma, dan kurung.");
  }
  const parsed = questionImportSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const group = issue.path[1];
    const question = issue.path[3];
    throw new Error(
      `Periksa ${typeof group === "number" ? `grup ${group + 1}` : "format batch"}${typeof question === "number" ? `, soal ${question + 1}` : ""}: ${issue.message}`,
    );
  }
  const invalid = parsed.data.groups.findIndex(
    (group) => !utbkSubtests.some((subtest) => subtest.slug === group.subtes),
  );
  if (invalid >= 0)
    throw new Error(
      `Subtes pada grup ${invalid + 1} tidak dikenal. Gunakan slug subtes seperti pada contoh.`,
    );
  return parsed.data;
}
