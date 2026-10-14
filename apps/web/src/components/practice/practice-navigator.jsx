import React from "react";
import { AppDialog } from "../app-dialog";

export function PracticeNavigator({ session, onJump, mobileOpen, onMobileOpenChange }) {
  const evaluated = Boolean(session.isEvaluated);
  const content = (
    <>
      <div className="navigator-grid-container">
        <div className="navigator-grid">
          {session.questions.map((question, index) => {
            const answer = session.answers[index];
            const flagged = !evaluated && Boolean(session.flagged[index]);
            const verdict = !answer
              ? "unanswered"
              : answer === question.correctAnswer
                ? "correct"
                : "incorrect";
            const state = evaluated ? `eval-${verdict}` : answer ? "is-answered" : "is-unanswered";
            return (
              <button
                key={question.id}
                type="button"
                className={`nav-number-tile font-mono ${state} ${session.currentIndex === index ? "is-active" : ""} ${flagged ? "is-flagged" : ""}`}
                aria-label={`Soal ${index + 1}, ${evaluated ? (verdict === "correct" ? "benar" : verdict === "incorrect" ? "salah" : "belum dijawab") : answer ? "terjawab" : "belum dijawab"}${flagged ? ", ditandai" : ""}`}
                aria-current={session.currentIndex === index ? "step" : undefined}
                onClick={() => onJump(index)}
              >
                <span className="tile-num-text">{String(index + 1).padStart(2, "0")}</span>
                {evaluated && (
                  <span className="tile-eval-symbol">
                    {verdict === "correct" ? "✓" : verdict === "incorrect" ? "×" : "○"}
                  </span>
                )}
                {flagged && <span className="tile-flag-pip" />}
              </button>
            );
          })}
        </div>
      </div>
      <div className="navigator-legend font-mono">
        {(evaluated
          ? [
              ["eval-c", "Benar"],
              ["eval-i", "Salah"],
              ["eval-u", "Kosong"],
            ]
          : [
              ["unans", "Belum dijawab"],
              ["ans", "Terjawab"],
              ["flag", "Ditandai"],
            ]
        ).map(([state, label]) => (
          <span key={state} className="legend-item">
            <span className={`legend-indicator ${state}`} aria-hidden="true" />
            {label}
          </span>
        ))}
      </div>
    </>
  );
  return (
    <>
      <aside className="quiz-navigator-pane" aria-label="Navigasi soal">
        <div className="navigator-card">
          <div className="navigator-head">
            <span className="nav-title font-mono">Navigasi soal</span>
          </div>
          {content}
        </div>
      </aside>
      <AppDialog open={mobileOpen} onOpenChange={onMobileOpenChange} title="Navigasi soal">
        {content}
      </AppDialog>
    </>
  );
}
