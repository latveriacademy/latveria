import React from "react";
import { QuestionRenderer } from "../question/question-renderer";

export function PracticeQuestion({
  question,
  answer,
  evaluated,
  disabled,
  englishLiteracy: _englishLiteracy,
  onAnswer,
  onOpenLexicon,
}) {
  return (
    <QuestionRenderer
      question={question}
      answer={answer}
      evaluated={evaluated}
      disabled={disabled}
      onAnswer={(val) => {
        if (typeof val === "string") {
          onAnswer?.(val);
        } else if (typeof val === "object") {
          onAnswer?.(JSON.stringify(val));
        }
      }}
      onOpenLexicon={onOpenLexicon}
    />
  );
}
