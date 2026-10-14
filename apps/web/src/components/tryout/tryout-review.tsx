import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { QuestionRenderer, type QuestionData } from "../question/question-renderer";
import { PracticeNavigator } from "../practice/practice-navigator";
import { Button } from "../ui/button";
import type { TryoutSessionState } from "./tryout-workspace";

export function TryoutReview({ data, onBack }: { data: TryoutSessionState; onBack: () => void }) {
  const { openLexicon } = useApp();
  const [index, setIndex] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const rows = data.reviewQuestions ?? [];
  const letters = ["A", "B", "C", "D", "E"];

  const questions: QuestionData[] = rows.map((row) => ({
    id: row.id,
    prompt: row.prompt,
    questionType: row.questionType || "single_choice",
    stimulus: row.stimulus,
    passage: row.passage,
    statements: row.statements,
    options: row.options.map((text, optionIndex) => ({ key: letters[optionIndex], text })),
    correctAnswer: letters[row.correctAnswer],
    explanation: row.explanation,
    annotations: row.annotations,
    topic: row.topic,
  }));

  const answers = rows.map((row) => {
    const raw = data.session.answers[row.id];
    if (raw === undefined) return undefined;
    if (row.questionType === "true_false_group") {
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    }
    const num = Number(raw);
    return !Number.isNaN(num) && num >= 0 && num < letters.length ? letters[num] : raw;
  });

  const question = questions[index];

  return (
    <div className="latveria-view-container question-view-active">
      <header className="question-header-bar">
        <Button variant="outline" onClick={onBack}>
          Kembali ke hasil
        </Button>
        <span className="font-mono text-xs uppercase tracking-wider text-[var(--gold)]">
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
        <p className="p-8 text-center text-muted">Soal review tidak tersedia.</p>
      ) : (
        <div className="quiz-split-workspace">
          <main className="quiz-question-pane">
            <QuestionRenderer
              key={question.id}
              question={question}
              answer={answers[index]}
              evaluated
              disabled
              onOpenLexicon={openLexicon}
            />
            <footer className="question-footer-nav mt-6">
              <Button variant="outline" disabled={index === 0} onClick={() => setIndex(index - 1)}>
                Sebelumnya
              </Button>
              <Button disabled={index === rows.length - 1} onClick={() => setIndex(index + 1)}>
                Berikutnya
              </Button>
            </footer>
          </main>
          <PracticeNavigator
            session={{
              questions: rows.map((r) => ({
                id: r.id,
                question: r.prompt,
                correctAnswer: letters[r.correctAnswer],
              })),
              answers,
              flagged: [],
              currentIndex: index,
              isEvaluated: true,
            }}
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
