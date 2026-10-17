import { questionImportSchema, utbkSubtests, type QuestionImport } from "@latveria/shared";
import { geometryImportExample } from "../math/tikz-examples";
import { mathImportExample } from "../math/math-import-examples";

export const packageImportExample: QuestionImport = {
  groups: [
    {
      subtes: "pengetahuan-kuantitatif",
      packageName: "Paket Persentase",
      category: "Persentase",
      questions: [
        {
          prompt: "Berapakah 25 persen dari 80?",
          options: ["10", "15", "20", "25", "30"],
          correctAnswer: 2,
          explanation: "25 persen sama dengan seperempat. Seperempat dari 80 adalah 20.",
          source: "Soal contoh buatan tim",
        },
      ],
    },
  ],
};

export const lexiconImportExample: QuestionImport = {
  groups: [
    {
      subtes: "literasi-bahasa-inggris",
      packageName: "Paket Vocabulary LBE",
      category: "Academic Vocabulary",
      questions: [
        {
          prompt: "Economic hegemony must never supersede ethical inquiry and human discretion.",
          options: [
            "Dominance or authority",
            "Equality and fairness",
            "Financial collapse",
            "International commerce",
            "Technological advancement",
          ],
          correctAnswer: 0,
          explanation:
            "Hegemony mengacu pada kepemimpinan dominan atau pengaruh mutlak suatu negara atau kelompok terhadap pihak lain.",
          source: "Soal contoh Lexicon buatan tim",
          annotations: [
            {
              term: "hegemony",
              definition:
                "Hegemoni; dominasi kepemimpinan atau pengaruh mutlak satu kelompok terhadap yang lain.",
              partOfSpeech: "noun",
              phonetic: "/hɪˈɡem.ə.ni/",
            },
            {
              term: "discretion",
              definition:
                "Kebijaksanaan dan kehati-hatian dalam mempertimbangkan atau memutuskan sesuatu.",
              partOfSpeech: "noun",
            },
          ],
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

export function importExample(
  kind: string,
  subtest?: string,
  packageName?: string,
): QuestionImport {
  const source =
    kind === "geometry"
      ? geometryImportExample
      : kind === "math"
        ? mathImportExample
        : kind === "lexicon"
          ? lexiconImportExample
          : packageImportExample;
  return {
    groups: source.groups.map((group) => ({
      ...group,
      subtes: subtest ?? group.subtes,
      packageName:
        packageName ??
        (kind === "geometry"
          ? "Paket Bangun Ruang"
          : kind === "math"
            ? "Paket Rumus Matematika"
            : kind === "lexicon"
              ? "Paket Vocabulary LBE"
              : "Paket Persentase"),
    })),
  };
}

export function downloadJson(data: unknown, filename: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export const IMPORT_EXAMPLE_KINDS = [
  { kind: "basic", label: "Gunakan contoh sederhana" },
  { kind: "math", label: "Gunakan contoh rumus" },
  { kind: "geometry", label: "Gunakan contoh geometri" },
  { kind: "lexicon", label: "Gunakan contoh Lexicon LBE" },
] as const;
