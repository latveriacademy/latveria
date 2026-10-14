import React from "react";
import { Check, X } from "lucide-react";
import type { TrueFalseStatementClient } from "@latveria/shared";
import { MathText } from "../math/math-text";

export function TrueFalseGroup({
  statements,
  answers = {},
  evaluated = false,
  disabled = false,
  onAnswer,
}: {
  statements: TrueFalseStatementClient[];
  answers?: Record<string, boolean>;
  evaluated?: boolean;
  disabled?: boolean;
  onAnswer?: (statementId: string, value: boolean) => void;
}) {
  if (!statements || statements.length === 0) return null;

  return (
    <div className="true-false-group-container space-y-3.5 my-4">
      {statements.map((stmt, idx) => {
        const userChoice = answers[stmt.id];
        const hasAnswer = userChoice !== undefined;
        const correctAnswer = stmt.answer;
        const isStatementCorrect =
          evaluated && correctAnswer !== undefined && userChoice === correctAnswer;

        return (
          <div
            key={stmt.id || idx}
            className={`true-false-statement-card rounded-lg border p-4 transition-all duration-150 ${
              evaluated
                ? isStatementCorrect
                  ? "border-[var(--emerald)]/60 bg-[var(--emerald)]/5"
                  : hasAnswer
                    ? "border-[var(--crimson)]/60 bg-[var(--crimson)]/5"
                    : "border-[var(--edge)] bg-[var(--surface)]"
                : "border-[var(--edge)] bg-[var(--surface)] hover:border-[var(--gold)]/60"
            }`}
          >
            {/* Header: Statement Index and Evaluation Verdict */}
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--soft-ink)]">
                Pernyataan {idx + 1}
              </span>
              {evaluated && correctAnswer !== undefined && (
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  {isStatementCorrect ? (
                    <span className="flex items-center gap-1 font-semibold text-[var(--emerald)]">
                      <Check size={14} /> BENAR
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 font-semibold text-[var(--crimson)]">
                      <X size={14} /> SALAH
                    </span>
                  )}
                  <span className="text-[var(--soft-ink)]">
                    (Kunci: {correctAnswer ? "BENAR" : "SALAH"})
                  </span>
                </div>
              )}
            </div>

            {/* Statement text */}
            <div className="mb-3.5 font-serif text-sm leading-relaxed text-[var(--ink)]">
              <MathText>{stmt.text || (stmt as { statement?: string }).statement || ""}</MathText>
            </div>

            {/* Toggle Buttons: [ BENAR ] [ SALAH ] */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={disabled || evaluated}
                onClick={() => onAnswer?.(stmt.id, true)}
                className={`flex-1 rounded-md py-2 px-3 text-center font-mono text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
                  userChoice === true
                    ? "bg-[var(--gold)] text-black shadow-sm ring-1 ring-[var(--gold)]"
                    : "border border-[var(--edge)] bg-[var(--surface-muted)] text-[var(--ink)] hover:bg-[var(--surface-elevated)]"
                } ${disabled || evaluated ? "cursor-default opacity-85" : "cursor-pointer"}`}
              >
                BENAR
              </button>
              <button
                type="button"
                disabled={disabled || evaluated}
                onClick={() => onAnswer?.(stmt.id, false)}
                className={`flex-1 rounded-md py-2 px-3 text-center font-mono text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
                  userChoice === false
                    ? "bg-[var(--gold)] text-black shadow-sm ring-1 ring-[var(--gold)]"
                    : "border border-[var(--edge)] bg-[var(--surface-muted)] text-[var(--ink)] hover:bg-[var(--surface-elevated)]"
                } ${disabled || evaluated ? "cursor-default opacity-85" : "cursor-pointer"}`}
              >
                SALAH
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
