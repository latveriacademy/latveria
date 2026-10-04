import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock, FileCheck, Flag, Layers } from "lucide-react";
import { Button } from "./ui/button";
import { PracticeQuestion } from "./practice-question";
import { PracticeNavigator } from "./practice-navigator";
import { ProgressBar } from "./ui/dashboard";
import type { LexiconAnnotation } from "@latveria/shared";

export interface TryoutSessionState {
  session: {
    id: string;
    state: "active" | "break" | "completed";
    currentSubtestIndex: number;
    breakEndsAt: string | null;
    answers: Record<string, string>;
    flags: Record<string, boolean>;
    currentQuestionIndex: number;
    totalScore: number | null;
    completedAt: string | null;
    questionTimes: Record<string, number>;
    secondsRemaining: number;
  };
  package: { id: string; name: string };
  currentSubtest: { id: string; name: string; slug: string };
  totalSubtests: number;
  questions: { id: string; prompt: string; options: string[] }[];
  reviewQuestions?: {
    id: string;
    prompt: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    annotations: LexiconAnnotation[];
    topic: string;
    slug: string;
  }[];
  score?: {
    score: number;
    correctCount: number;
    totalCount: number;
    accuracy: number;
    rawScore: number;
    performanceIndex: number;
    averageTime: number;
  } | null;
}

type Props = {
  data: TryoutSessionState;
  currentIndex: number;
  answers: Record<string, string>;
  flags: Record<string, boolean>;
  time: string;
  timerWarning: boolean;
  pending: boolean;
  onExit: () => void;
  onSubmit: () => void;
  onAnswer: (id: string, index: number) => void;
  onFlag: (id: string) => void;
  onJump: (index: number) => void;
};

export function TryoutWorkspace({
  data,
  currentIndex,
  answers,
  flags,
  time,
  timerWarning,
  pending,
  onExit,
  onSubmit,
  onAnswer,
  onFlag,
  onJump,
}: Props) {
  const { session, questions, currentSubtest, totalSubtests } = data;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const question = questions[currentIndex] || questions[0];
  const practiceQuestions = questions.map((item) => ({
    id: item.id,
    question: item.prompt,
    options: item.options.map((text, index) => ({ key: String.fromCharCode(65 + index), text })),
  }));
  const practiceAnswers = questions.map((item) =>
    answers[item.id] === undefined ? undefined : String.fromCharCode(65 + Number(answers[item.id])),
  );
  return (
    <>
      <header className="question-header-bar">
        <div className="header-subtest-info">
          <Button variant="ghost" className="btn-exit-minimal" onClick={onExit}>
            <ChevronLeft size={16} />
            <span className="font-mono">SIMPAN & KELUAR</span>
          </Button>
          <div className="subtest-badge-box">
            <span className="subtest-code font-mono">
              SUBTES {session.currentSubtestIndex + 1}/{totalSubtests}
            </span>
            <span className="subtest-name font-serif">{currentSubtest.name}</span>
          </div>
        </div>
        <div className="header-center-info">
          <div className={`timer-display font-mono ${timerWarning ? "timer-warning" : ""}`}>
            <Clock size={15} />
            <span className="time-label">WAKTU SUBTES</span>
            <span className="time-digits">{time}</span>
          </div>
        </div>
        <div className="header-tools-group flex-wrap">
          <Button
            variant="ghost"
            className={`tool-action-btn ${question && flags[question.id] ? "flagged" : ""}`}
            aria-pressed={Boolean(question && flags[question.id])}
            disabled={pending}
            onClick={() => question && onFlag(question.id)}
          >
            <Flag size={14} />
            {question && flags[question.id] ? "Ragu-ragu" : "Tandai"}
          </Button>
          <Button size="sm" className="btn-gold-solid" disabled={pending} onClick={onSubmit}>
            <FileCheck size={15} />
            Selesaikan Subtes
          </Button>
          <Button
            variant="ghost"
            className="btn-mobile-nav-toggle"
            onClick={() => setMobileNavOpen(true)}
          >
            <Layers size={15} />
            Navigasi
          </Button>
        </div>
      </header>
      <div className="quiz-progress-strip">
        <div className="progress-info-left font-mono">
          <span className="prog-step text-gold">Soal {currentIndex + 1}</span>
          <span className="prog-total text-muted"> / {questions.length}</span>
        </div>
        <ProgressBar
          value={currentIndex + 1}
          max={questions.length}
          label="Posisi soal"
          className="progress-bar-track"
          fillClassName="progress-bar-fill"
        />
      </div>
      <div className="quiz-split-workspace">
        <main className="quiz-question-pane">
          {question && (
            <PracticeQuestion
              key={question.id}
              question={practiceQuestions[currentIndex] || practiceQuestions[0]}
              answer={practiceAnswers[currentIndex]}
              evaluated={false}
              disabled={pending}
              englishLiteracy={false}
              onAnswer={(key: string) => onAnswer(question.id, key.charCodeAt(0) - 65)}
              onOpenLexicon={() => {}}
            />
          )}
          <footer className="question-footer-nav">
            <Button
              variant="outline"
              disabled={currentIndex === 0 || pending}
              onClick={() => onJump(currentIndex - 1)}
            >
              <ChevronLeft size={16} />
              SEBELUMNYA
            </Button>
            {currentIndex < questions.length - 1 ? (
              <Button disabled={pending} onClick={() => onJump(currentIndex + 1)}>
                BERIKUTNYA
                <ChevronRight size={16} />
              </Button>
            ) : (
              <Button className="btn-gold-solid" disabled={pending} onClick={onSubmit}>
                Selesaikan Subtes
                <FileCheck size={16} />
              </Button>
            )}
          </footer>
        </main>
        <PracticeNavigator
          session={{
            questions: practiceQuestions,
            answers: practiceAnswers,
            flagged: questions.map((item) => Boolean(flags[item.id])),
            currentIndex,
            isEvaluated: false,
          }}
          onJump={(index: number) => {
            if (!pending) {
              onJump(index);
              setMobileNavOpen(false);
            }
          }}
          mobileOpen={mobileNavOpen}
          onMobileOpenChange={setMobileNavOpen}
        />
      </div>
    </>
  );
}
