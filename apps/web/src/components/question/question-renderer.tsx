import React from "react";
import { AlertTriangle, BookMarked, Check, CheckCircle2, X, XCircle } from "lucide-react";
import type {
  LexiconAnnotation,
  QuestionStimulus,
  TrueFalseStatementClient,
} from "@latveria/shared";
import { MathText } from "../math/math-text";
import { AnnotatedText } from "../lexicon/annotated-text";
import { StimulusRenderer } from "./stimulus-renderer";
import { TrueFalseGroup } from "./true-false-group";

export interface QuestionData {
  id: string;
  question?: string;
  prompt?: string;
  questionType?: "single_choice" | "true_false_group" | string;
  stimulus?: QuestionStimulus | null;
  passage?: string | null;
  options?: Array<{ key: string; text: string } | string>;
  rawOptions?: Array<{ id?: string; text: string; isCorrect?: boolean }>;
  statements?: TrueFalseStatementClient[] | null;
  correctAnswer?: string | number | null;
  explanation?:
    | string
    | {
        concept?: string;
        stepByStep?: string[];
        whyCorrect?: string;
        pitfall?: string;
      }
    | null;
  annotations?: LexiconAnnotation[];
  topic?: string;
  source?: string | null;
}

export interface QuestionRendererProps {
  question: QuestionData;
  answer?: string | Record<string, boolean> | null;
  evaluated?: boolean;
  disabled?: boolean;
  onAnswer?: (answer: string | Record<string, boolean>) => void;
  onOpenLexicon?: (annotation: LexiconAnnotation, questionId?: string) => void;
  className?: string;
  showVerdict?: boolean;
}

export function QuestionRenderer({
  question,
  answer,
  evaluated = false,
  disabled = false,
  onAnswer,
  onOpenLexicon,
  className = "",
  showVerdict = true,
}: QuestionRendererProps) {
  const isTrueFalse = question.questionType === "true_false_group";
  const promptText = question.prompt || question.question || "";
  const hasStimulus = Boolean(
    question.stimulus?.passage ||
    (question.stimulus?.blocks && question.stimulus.blocks.length > 0) ||
    question.passage,
  );

  // Normalize single-choice options
  const normalizedOptions: { key: string; text: string }[] = React.useMemo(() => {
    if (!question.options || question.options.length === 0) return [];
    return question.options.map((opt, idx) => {
      if (typeof opt === "string") {
        return { key: String.fromCharCode(65 + idx), text: opt };
      }
      return {
        key: opt.key || String.fromCharCode(65 + idx),
        text: opt.text,
      };
    });
  }, [question.options]);

  // Normalize true/false answers
  const tfAnswers: Record<string, boolean> = React.useMemo(() => {
    if (!isTrueFalse) return {};
    if (typeof answer === "object" && answer !== null) {
      return answer as Record<string, boolean>;
    }
    if (typeof answer === "string" && answer.trim().startsWith("{")) {
      try {
        return JSON.parse(answer);
      } catch {
        return {};
      }
    }
    return {};
  }, [answer, isTrueFalse]);

  // Determine answer status & correctness
  let isAnswered = false;
  let isCorrect = false;

  if (isTrueFalse) {
    const stmts = question.statements || [];
    const answeredCount = Object.keys(tfAnswers).length;
    isAnswered = answeredCount > 0;
    if (stmts.length > 0 && answeredCount === stmts.length) {
      isCorrect = stmts.every(
        (stmt) => stmt.answer !== undefined && tfAnswers[stmt.id] === stmt.answer,
      );
    }
  } else {
    isAnswered = Boolean(answer !== undefined && answer !== null && answer !== "");
    let expectedKey = "";
    if (typeof question.correctAnswer === "number") {
      expectedKey = String.fromCharCode(65 + question.correctAnswer);
    } else if (typeof question.correctAnswer === "string") {
      expectedKey = question.correctAnswer;
    }
    isCorrect = isAnswered && answer === expectedKey;
  }

  const verdict = !isAnswered ? "unanswered" : isCorrect ? "correct" : "incorrect";
  const VerdictIcon = !isAnswered ? AlertTriangle : isCorrect ? CheckCircle2 : XCircle;

  const handleTfChoice = (statementId: string, value: boolean) => {
    if (disabled || evaluated) return;
    const nextAnswers = { ...tfAnswers, [statementId]: value };
    onAnswer?.(nextAnswers);
  };

  const handleSingleChoice = (key: string) => {
    if (disabled || evaluated) return;
    onAnswer?.(key);
  };

  const explanation = question.explanation;

  return (
    <div
      className={`question-layout-card motion-fade-up ${
        hasStimulus ? "has-stimulus-split" : ""
      } ${className}`}
    >
      {/* Top Meta Bar */}
      {showVerdict && (
        <div className="q-card-top-meta mb-4 flex items-center justify-between border-b border-[var(--edge)] pb-3">
          {evaluated ? (
            <div className="q-eval-verdict font-mono">
              <span className={`verdict-pill verdict-${verdict} flex items-center gap-1.5`}>
                <VerdictIcon size={15} />
                <span>
                  {!isAnswered
                    ? "○ BELUM DIJAWAB"
                    : isCorrect
                      ? "✓ JAWABAN BENAR"
                      : "× JAWABAN SALAH"}
                </span>
              </span>
            </div>
          ) : (
            <div className="q-practice-status font-mono">
              <span
                className={isAnswered ? "status-indicator-answered" : "status-indicator-unanswered"}
              >
                <span className={`status-dot ${isAnswered ? "answered" : "unanswered"}`} />
                {isAnswered
                  ? isTrueFalse
                    ? `TERJAWAB (${Object.keys(tfAnswers).length}/${(question.statements || []).length} PERNYATAAN)`
                    : `TERJAWAB (${answer})`
                  : "BELUM DIJAWAB"}
              </span>
            </div>
          )}
          {question.topic && (
            <span className="font-mono text-xs uppercase tracking-wider text-[var(--soft-ink)]">
              {question.topic}
            </span>
          )}
        </div>
      )}

      {/* Main Body: Responsive 2-column if stimulus exists */}
      <div
        className={
          hasStimulus
            ? "stimulus-split-grid lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start"
            : "single-col-body"
        }
      >
        {/* Left Column (Desktop) / Top Section (Mobile): Stimulus & Passage */}
        {hasStimulus && (
          <aside className="stimulus-column mb-6 lg:mb-0 lg:sticky lg:top-4 max-h-[calc(100vh-10rem)] overflow-y-auto pr-1">
            <StimulusRenderer
              stimulus={question.stimulus}
              passage={question.passage}
              className="rounded-lg border border-[var(--edge)] bg-[var(--surface-elevated)] p-4 shadow-sm"
            />
          </aside>
        )}

        {/* Right Column (Desktop) / Bottom Section (Mobile): Question Prompt & Answer Area */}
        <div className="question-content-column space-y-4">
          {/* Question Prompt Box */}
          <div className="question-prompt-box">
            <h2 className="question-prompt font-serif text-lg leading-relaxed text-[var(--ink)]">
              <AnnotatedText
                annotations={question.annotations || []}
                onOpen={
                  onOpenLexicon ? (annotation) => onOpenLexicon(annotation, question.id) : undefined
                }
              >
                {promptText}
              </AnnotatedText>
            </h2>
          </div>

          {/* Answer Controls: True/False Group vs Single Choice */}
          {isTrueFalse ? (
            <TrueFalseGroup
              statements={question.statements || []}
              answers={tfAnswers}
              evaluated={evaluated}
              disabled={disabled}
              onAnswer={handleTfChoice}
            />
          ) : (
            <div className="options-container" role="radiogroup" aria-label="Pilihan Jawaban">
              {normalizedOptions.map((option) => {
                const selected = answer === option.key;
                let isOptionCorrect = false;
                if (typeof question.correctAnswer === "number") {
                  isOptionCorrect = option.key === String.fromCharCode(65 + question.correctAnswer);
                } else if (typeof question.correctAnswer === "string") {
                  isOptionCorrect = option.key === question.correctAnswer;
                }

                const state = evaluated
                  ? isOptionCorrect
                    ? "eval-correct-opt"
                    : selected
                      ? "eval-incorrect-opt"
                      : "eval-neutral-opt"
                  : selected
                    ? "selected"
                    : "";

                return (
                  <button
                    key={option.key}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={evaluated || disabled}
                    className={`option-choice-card ${state}`}
                    onClick={() => handleSingleChoice(option.key)}
                  >
                    <div className="option-key-badge font-mono">{option.key}</div>
                    <div className="option-text-body font-sans">
                      <MathText>{option.text}</MathText>
                    </div>
                    {!evaluated ? (
                      <div className="option-radio-indicator">
                        {selected && <span className="radio-inner-pip" />}
                      </div>
                    ) : (
                      <div className="eval-opt-badge font-mono">
                        {isOptionCorrect && (
                          <span className="badge-tag-correct">
                            <Check size={13} />
                            {selected ? "JAWABAN ANDA (BENAR)" : "KUNCI JAWABAN BENAR"}
                          </span>
                        )}
                        {selected && !isOptionCorrect && (
                          <span className="badge-tag-incorrect">
                            <X size={13} />
                            JAWABAN ANDA (SALAH)
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Academic Explanation Dossier (when evaluated) */}
          {evaluated && (
            <section className="academic-explanation-dossier mt-6" aria-label="Pembahasan Soal">
              <div className="explanation-title font-mono flex items-center gap-2 mb-3 text-[var(--gold)]">
                <BookMarked size={17} />
                <span className="font-semibold uppercase tracking-wider text-xs">
                  Pembahasan Akademik
                </span>
              </div>
              {typeof explanation === "string" ? (
                <div className="explanation-section">
                  <p className="sec-body font-serif leading-relaxed text-[var(--ink)]">
                    <MathText>{explanation}</MathText>
                  </p>
                </div>
              ) : (
                explanation && (
                  <div className="space-y-3">
                    {explanation.concept && (
                      <div className="explanation-section">
                        <h4 className="font-mono text-xs font-semibold text-[var(--soft-ink)] mb-1">
                          KONSEP
                        </h4>
                        <p className="sec-body font-serif text-[var(--ink)]">
                          <MathText>{explanation.concept}</MathText>
                        </p>
                      </div>
                    )}
                    {Array.isArray(explanation.stepByStep) && (
                      <div className="explanation-section">
                        <h4 className="font-mono text-xs font-semibold text-[var(--soft-ink)] mb-1">
                          LANGKAH PENGERJAAN
                        </h4>
                        <ul className="step-list font-sans space-y-1.5">
                          {explanation.stepByStep.map((step, idx) => (
                            <li key={idx} className="flex gap-2 text-sm leading-relaxed">
                              <span className="step-num font-mono text-[var(--gold)] font-bold">
                                {idx + 1}.
                              </span>
                              <span className="text-[var(--ink)]">
                                <MathText>{step}</MathText>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {explanation.whyCorrect && (
                      <div className="explanation-section">
                        <h4 className="font-mono text-xs font-semibold text-[var(--emerald)] mb-1">
                          ALASAN KUNCI BENAR
                        </h4>
                        <p className="sec-body font-serif text-[var(--ink)]">
                          <MathText>{explanation.whyCorrect}</MathText>
                        </p>
                      </div>
                    )}
                    {explanation.pitfall && (
                      <div className="explanation-section pitfall-sec rounded border border-[var(--crimson)]/30 bg-[var(--crimson)]/5 p-3">
                        <h4 className="font-mono text-xs font-semibold text-[var(--crimson)] mb-1">
                          PERINGATAN JEBAKAN
                        </h4>
                        <p className="sec-body font-serif text-sm text-[var(--ink)]">
                          <MathText>{explanation.pitfall}</MathText>
                        </p>
                      </div>
                    )}
                  </div>
                )
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
