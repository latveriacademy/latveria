export const practiceOptionKeys = ["A", "B", "C", "D", "E"];

export function practiceAnswersToPayload(
  questions: { id: string; options: unknown[] }[],
  answers: Record<number, string | undefined>,
): Record<string, number> | null {
  const payload: Record<string, number> = {};
  for (const [index, question] of questions.entries()) {
    const selected = practiceOptionKeys.indexOf(answers[index] ?? "");
    if (selected < 0 || selected >= question.options.length) return null;
    payload[question.id] = selected;
  }
  return payload;
}
