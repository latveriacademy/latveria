import { describe, expect, it } from "vitest";
import type { QuestionDetail } from "@latveria/shared";
import {
  NO_CATEGORY,
  parseQuestionEdit,
  questionToImport,
  questionToJson,
} from "./question-export";
import { parseQuestionImport } from "./question-import";

const topics = [
  { id: "11111111-1111-4111-8111-111111111111", slug: "pengetahuan-kuantitatif" },
  { id: "22222222-2222-4222-8222-222222222222", slug: "literasi-bahasa-inggris" },
];
const packageId = "33333333-3333-4333-8333-333333333333";

const question: QuestionDetail = {
  id: "44444444-4444-4444-8444-444444444444",
  topicId: topics[0].id,
  packageId,
  prompt: "Berapakah $\\frac{1}{4}$ dari 80?",
  options: ["10", "15", "20", "25", "30"],
  correctAnswer: 2,
  explanation: "Seperempat dari 80 adalah 20.",
  source: "Contoh buatan tim",
  category: "Persentase",
  annotations: [],
  topic: "Pengetahuan Kuantitatif",
  slug: "pengetahuan-kuantitatif",
  usage: 0,
};

describe("ekspor soal", () => {
  it("menghasilkan JSON yang lolos validasi impor", () => {
    const data = parseQuestionImport(questionToJson(question));
    expect(data.groups).toHaveLength(1);
    expect(data.groups[0].subtes).toBe("pengetahuan-kuantitatif");
    expect(data.groups[0].packageId).toBe(packageId);
    expect(data.groups[0].questions[0].prompt).toBe(question.prompt);
  });

  it("memakai kategori pengganti dan tidak menyertakan paket jika kosong", () => {
    const data = questionToImport({ ...question, category: undefined, packageId: null });
    expect(data.groups[0].category).toBe(NO_CATEGORY);
    expect(data.groups[0]).not.toHaveProperty("packageId");
  });
});

describe("parseQuestionEdit", () => {
  it("menyusun body update dari JSON ekspor", () => {
    const body = parseQuestionEdit(questionToJson(question), topics);
    expect(body).toMatchObject({
      topicId: topics[0].id,
      packageId,
      category: "Persentase",
      correctAnswer: 2,
    });
  });

  it("memetakan kategori pengganti dan paket kosong ke nilai kosong", () => {
    const body = parseQuestionEdit(
      questionToJson({ ...question, category: undefined, packageId: null }),
      topics,
    );
    expect(body.category).toBeUndefined();
    expect(body.packageId).toBeNull();
  });

  it("menerima perubahan yang dibuat di JSON", () => {
    const data = questionToImport(question);
    data.groups[0].questions[0].correctAnswer = 3;
    expect(parseQuestionEdit(JSON.stringify(data), topics).correctAnswer).toBe(3);
  });

  it("menolak lebih dari satu soal, packageName, dan subtes tak dikenal", () => {
    const data = questionToImport(question);
    const two = structuredClone(data);
    two.groups[0].questions.push(two.groups[0].questions[0]);
    expect(() => parseQuestionEdit(JSON.stringify(two), topics)).toThrow(/satu grup/);

    const named = structuredClone(data);
    delete named.groups[0].packageId;
    named.groups[0].packageName = "Paket baru";
    expect(() => parseQuestionEdit(JSON.stringify(named), topics)).toThrow(/packageId/);

    expect(() => parseQuestionEdit(JSON.stringify(data), [topics[1]])).toThrow(/Subtes/);
  });

  it("menolak JSON rusak dan data yang melanggar skema", () => {
    expect(() => parseQuestionEdit("{", topics)).toThrow(/JSON tidak valid/);
    const data = questionToImport(question);
    data.groups[0].questions[0].options = ["a", "a", "b", "c", "d"];
    expect(() => parseQuestionEdit(JSON.stringify(data), topics)).toThrow(/Opsi harus berbeda/);
  });
});
