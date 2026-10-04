import React from "react";
import { AlertTriangle, BookMarked, Check, CheckCircle2, X, XCircle } from "lucide-react";
import { MathText } from "./math-text";
import { AnnotatedText } from "./annotated-text";

export function PracticeQuestion({
  question,
  answer,
  evaluated,
  disabled,
  englishLiteracy: _englishLiteracy,
  onAnswer,
  onOpenLexicon,
}) {
  const correct = answer === question.correctAnswer;
  const verdict = !answer ? "unanswered" : correct ? "correct" : "incorrect";
  const VerdictIcon = !answer ? AlertTriangle : correct ? CheckCircle2 : XCircle;
  const explanation = question.explanation;
  return (
    <div className="question-layout-card motion-fade-up">
      <div className="q-card-top-meta">
        {evaluated ? (
          <div className="q-eval-verdict font-mono">
            <span className={`verdict-pill verdict-${verdict}`}>
              <VerdictIcon size={15} />
              <span>
                {!answer ? "○ BELUM DIJAWAB" : correct ? "✓ JAWABAN BENAR" : "× JAWABAN SALAH"}
              </span>
            </span>
          </div>
        ) : (
          <div className="q-practice-status font-mono">
            <span className={answer ? "status-indicator-answered" : "status-indicator-unanswered"}>
              <span className={`status-dot ${answer ? "answered" : "unanswered"}`} />
              {answer ? `TERJAWAB (${answer})` : "BELUM DIJAWAB"}
            </span>
          </div>
        )}
      </div>
      {question.passage && (
        <section className="passage-section">
          <div className="passage-label font-mono">
            <span>Teks soal</span>
          </div>
          <div className="passage-body font-serif interactive-passage">
            <MathText>{question.passage}</MathText>
          </div>
        </section>
      )}
      <div className="question-prompt-box">
        <h2 className="question-prompt font-serif">
          <AnnotatedText
            annotations={question.annotations || []}
            onOpen={
              onOpenLexicon ? (annotation) => onOpenLexicon(annotation, question.id) : undefined
            }
          >
            {question.question}
          </AnnotatedText>
        </h2>
      </div>
      <div className="options-container" role="radiogroup" aria-label="Pilihan Jawaban">
        {question.options.map((option) => {
          const selected = answer === option.key;
          const isCorrect = question.correctAnswer === option.key;
          const state = evaluated
            ? isCorrect
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
              onClick={() => onAnswer(option.key)}
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
                  {isCorrect && (
                    <span className="badge-tag-correct">
                      <Check size={13} />
                      {selected ? "JAWABAN ANDA (BENAR)" : "KUNCI JAWABAN BENAR"}
                    </span>
                  )}
                  {selected && !isCorrect && (
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
      {evaluated && (
        <section className="academic-explanation-dossier" aria-label="Pembahasan Soal">
          <div className="explanation-title font-mono">
            <BookMarked size={17} className="text-gold" />
            <span>Pembahasan</span>
          </div>
          {typeof explanation === "string" ? (
            <div className="explanation-section">
              <p className="sec-body font-serif">
                <MathText>{explanation}</MathText>
              </p>
            </div>
          ) : (
            explanation && (
              <>
                {explanation.concept && (
                  <div className="explanation-section">
                    <p className="sec-body font-serif">
                      <MathText>{explanation.concept}</MathText>
                    </p>
                  </div>
                )}
                {Array.isArray(explanation.stepByStep) && (
                  <div className="explanation-section">
                    <ul className="step-list font-sans">
                      {explanation.stepByStep.map((step, index) => (
                        <li key={index}>
                          <span className="step-num font-mono">{index + 1}.</span>
                          <span>
                            <MathText>{step}</MathText>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {explanation.whyCorrect && (
                  <div className="explanation-section">
                    <p className="sec-body font-serif text-sage-dim">
                      <MathText>{explanation.whyCorrect}</MathText>
                    </p>
                  </div>
                )}
                {explanation.pitfall && (
                  <div className="explanation-section pitfall-sec">
                    <p className="sec-body font-serif text-crimson-dim">
                      <MathText>{explanation.pitfall}</MathText>
                    </p>
                  </div>
                )}
              </>
            )
          )}
        </section>
      )}
    </div>
  );
}
