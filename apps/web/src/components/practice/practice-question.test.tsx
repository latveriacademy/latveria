import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { PracticeQuestion } from "./practice-question";

it("only reveals the answer key and explanation during read-only review", () => {
  const question = {
    id: "question-1",
    question: "Pilih jawaban",
    options: [
      { key: "A", text: "Satu" },
      { key: "B", text: "Dua" },
    ],
    correctAnswer: "B",
    explanation: "Pembahasan rahasia",
  };
  const props = {
    question,
    answer: "A",
    disabled: false,
    englishLiteracy: false,
    onAnswer: () => {},
    onOpenLexicon: () => {},
  };
  const practice = renderToStaticMarkup(<PracticeQuestion {...props} evaluated={false} />);
  expect(practice).not.toContain("Pembahasan rahasia");
  expect(practice).not.toContain("KUNCI JAWABAN BENAR");
  const review = renderToStaticMarkup(<PracticeQuestion {...props} evaluated />);
  expect(review).toContain("Pembahasan rahasia");
  expect(review).toContain("KUNCI JAWABAN BENAR");
  expect(review).toContain("JAWABAN ANDA (SALAH)");
  expect(review.match(/disabled=""/g)).toHaveLength(2);
});
