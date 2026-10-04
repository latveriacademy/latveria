import { useState } from "react";
import { useApp } from "../context/AppContext";
import { PracticeQuestion } from "./practice-question";
import { PracticeNavigator } from "./practice-navigator";
import { Button } from "./ui/button";
import type { TryoutSessionState } from "./tryout-workspace";

export function TryoutReview({ data, onBack }: { data: TryoutSessionState; onBack: () => void }) {
  const { openLexicon } = useApp();
  const [index, setIndex] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const rows = data.reviewQuestions ?? [];
  const letters = ["A", "B", "C", "D"];
  const questions = rows.map((row) => ({
    id: row.id,
    question: row.prompt,
    options: row.options.map((text, optionIndex) => ({ key: letters[optionIndex], text })),
    correctAnswer: letters[row.correctAnswer],
    explanation: row.explanation,
    annotations: row.annotations,
  }));
  const answers = rows.map((row) =>
    data.session.answers[row.id] === undefined
      ? undefined
      : letters[Number(data.session.answers[row.id])],
  );
  const question = questions[index];
  return (
    <div className="latveria-view-container question-view-active">
      <header className="question-header-bar">
        <Button variant="outline" onClick={onBack}>
          Kembali ke hasil
        </Button>
        <span>
          {rows[index]?.topic} · Soal {index + 1}/{rows.length}
        </span>
        <Button
          className="btn-mobile-nav-toggle"
          variant="outline"
          onClick={() => setMobileOpen(true)}
        >
          Navigasi
        </Button>
      </header>
      {!question ? (
        <p>Soal review tidak tersedia.</p>
      ) : (
        <div className="quiz-split-workspace">
          <main className="quiz-question-pane">
            <PracticeQuestion
              key={question.id}
              question={question}
              answer={answers[index]}
              evaluated
              disabled
              englishLiteracy={rows[index].slug === "literasi-bahasa-inggris"}
              onOpenLexicon={openLexicon}
              onAnswer={() => {}}
            />
            <footer className="question-footer-nav">
              <Button variant="outline" disabled={index === 0} onClick={() => setIndex(index - 1)}>
                Sebelumnya
              </Button>
              <Button disabled={index === rows.length - 1} onClick={() => setIndex(index + 1)}>
                Berikutnya
              </Button>
            </footer>
          </main>
          <PracticeNavigator
            session={{ questions, answers, flagged: [], currentIndex: index, isEvaluated: true }}
            mobileOpen={mobileOpen}
            onMobileOpenChange={setMobileOpen}
            onJump={(next: number) => {
              setIndex(next);
              setMobileOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
