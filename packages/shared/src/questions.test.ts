import { describe, expect, it } from "vitest";
import {
  stimulusSchema,
  singleChoiceImportQuestionSchema,
  trueFalseImportQuestionSchema,
  sectionImportSchema,
  calculateLatveriaScore,
} from "./index";

describe("Question Stimulus Schema", () => {
  it("validates structured content blocks (text, latex, table, chart, diagram)", () => {
    const valid = stimulusSchema.safeParse({
      title: "Data Penjualan Toko",
      passage: "Sebuah toko mencatat data transaksi selama tiga bulan terakhir.",
      blocks: [
        { type: "text", content: "Berikut adalah rincian data dalam tabel:" },
        {
          type: "table",
          title: "Tabel 1",
          columns: ["Bulan", "Target", "Realisasi"],
          rows: [
            ["Januari", 100, 110],
            ["Februari", 120, 115],
            ["Maret", 130, 140],
          ],
        },
        {
          type: "chart",
          chartType: "bar",
          title: "Grafik Batang Penjualan",
          data: [
            { label: "Jan", value: 110 },
            { label: "Feb", value: 115 },
            { label: "Mar", value: 140 },
          ],
        },
        {
          type: "latex",
          source: "$$R = \\frac{\\sum x_i}{N}$$",
        },
        {
          type: "diagram",
          source: "\\begin{tikzpicture}\\draw (0,0) rectangle (2,2);\\end{tikzpicture}",
          caption: "Bentuk penampang kotak",
        },
      ],
    });
    expect(valid.success).toBe(true);
  });

  it("rejects invalid content block type", () => {
    const invalid = stimulusSchema.safeParse({
      blocks: [{ type: "unknown_type", content: "Invalid" }],
    });
    expect(invalid.success).toBe(false);
  });
});

describe("Section Import Question Schema", () => {
  it("validates single_choice question with letter or numeric correctAnswer", () => {
    const resA = singleChoiceImportQuestionSchema.safeParse({
      externalId: "PM-001",
      type: "single_choice",
      prompt: "Berapa nilai x jika 2x + 4 = 10?",
      options: ["1", "2", "3", "4", "5"],
      correctAnswer: "C", // 'C' -> index 2
      explanation: "2x = 6 -> x = 3.",
    });
    expect(resA.success).toBe(true);
    if (resA.success) {
      expect(resA.data.correctAnswer).toBe(2);
    }

    const resNum = singleChoiceImportQuestionSchema.safeParse({
      prompt: "Berapa nilai x jika 2x + 4 = 10?",
      options: ["1", "2", "3", "4", "5"],
      correctAnswer: 2,
      explanation: "2x = 6 -> x = 3.",
    });
    expect(resNum.success).toBe(true);
  });

  it("validates true_false_group question with 3-4 statements", () => {
    const tfRes = trueFalseImportQuestionSchema.safeParse({
      externalId: "PM-021",
      type: "true_false_group",
      prompt: "Tentukan apakah setiap pernyataan berikut benar atau salah.",
      statements: [
        { id: "S1", text: "Pernyataan pertama.", answer: true },
        { id: "S2", text: "Pernyataan kedua.", answer: false },
        { id: "S3", text: "Pernyataan ketiga.", answer: true },
        { id: "S4", text: "Pernyataan keempat.", answer: false },
      ],
      scoring: { mode: "per_statement", points: 1 },
      explanation: "Pembahasan untuk keempat pernyataan.",
    });
    expect(tfRes.success).toBe(true);
    if (tfRes.success) {
      expect(tfRes.data.statements).toHaveLength(4);
      expect(tfRes.data.scoring.mode).toBe("per_statement");
    }
  });

  it("validates complete subtest section import payload", () => {
    const importPayload = {
      schemaVersion: 2,
      subtest: "PM",
      questions: [
        {
          type: "single_choice",
          prompt: "Soal pilihan ganda 1",
          options: ["A", "B", "C", "D", "E"],
          correctAnswer: "A",
        },
        {
          type: "true_false_group",
          prompt: "Soal benar salah 2",
          statements: [
            { id: "S1", text: "Pernyataan 1", answer: true },
            { id: "S2", text: "Pernyataan 2", answer: false },
            { id: "S3", text: "Pernyataan 3", answer: true },
          ],
        },
      ],
    };
    const parsed = sectionImportSchema.safeParse(importPayload);
    expect(parsed.success).toBe(true);
  });

  it("validates shared passages schema and questions linking via passageId", () => {
    const payload = {
      schemaVersion: 2,
      subtest: "Penalaran Umum",
      passages: [
        {
          externalId: "PASS-001",
          title: "Bacaan PU 01",
          blocks: [
            {
              type: "text",
              content: "Teks panjang stimulus bacaan nomor 1 sampai 4.",
            },
          ],
        },
      ],
      questions: [
        {
          externalId: "PU-001",
          type: "single_choice",
          passageId: "PASS-001",
          prompt: "Berdasarkan bacaan tersebut, simpulan yang tepat adalah...",
          options: ["Opsi A", "Opsi B", "Opsi C", "Opsi D", "Opsi E"],
          correctAnswer: "A",
        },
        {
          externalId: "PU-002",
          type: "single_choice",
          passageId: "PASS-001",
          prompt: "Kelemahan argumen pada paragraf kedua adalah...",
          options: ["Opsi A", "Opsi B", "Opsi C", "Opsi D", "Opsi E"],
          correctAnswer: "B",
        },
      ],
    };

    const parsed = sectionImportSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid passageId reference with clear issue path", () => {
    const payload = {
      schemaVersion: 2,
      passages: [
        {
          externalId: "PASS-001",
          content: "Teks bacaan.",
        },
      ],
      questions: [
        {
          externalId: "PU-001",
          type: "single_choice",
          passageId: "PASS-TIDAK-ADA",
          prompt: "Pertanyaan dengan passage tidak valid...",
          options: ["A", "B", "C", "D", "E"],
          correctAnswer: "A",
        },
      ],
    };

    const parsed = sectionImportSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) => i.path.includes("passageId"));
      expect(issue).toBeDefined();
      expect(issue?.message).toContain("PASS-TIDAK-ADA");
    }
  });
});

describe("True/False Scoring with Partial Credit", () => {
  it("calculates partial score when mode is per_statement (e.g. 3 of 4 statements correct)", () => {
    const result = calculateLatveriaScore([
      {
        questionId: "q1",
        isCorrect: false,
        scoreFraction: 3 / 4, // 0.75
        itemWeight: 100,
        timeSpentSeconds: 60,
      },
    ]);
    expect(result.rawScore).toBeGreaterThan(0);
    expect(result.correctCount).toBe(1); // rounded up to 1 for display
    expect(result.accuracy).toBe(75);
  });

  it("scores 0 when mode is all_or_nothing and not all statements are correct", () => {
    const result = calculateLatveriaScore([
      {
        questionId: "q1",
        isCorrect: false,
        scoreFraction: 0,
        itemWeight: 100,
        timeSpentSeconds: 60,
      },
    ]);
    expect(result.rawScore).toBe(0);
    expect(result.correctCount).toBe(0);
    expect(result.accuracy).toBe(0);
  });
});
