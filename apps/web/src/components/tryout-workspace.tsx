import { ChevronLeft, ChevronRight, Clock, FileCheck, Flag } from "lucide-react";
import { Button } from "./ui/button";
import { MathText } from "./math-text";

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
  const question = questions[currentIndex] || questions[0];
  return (
    <>
      <header className="question-header-bar mb-6">
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
        <div className="header-tools-group">
          <Button
            variant="ghost"
            className={`btn-flag-toggle font-mono ${question && flags[question.id] ? "is-flagged" : ""}`}
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
        </div>
      </header>
      <div className="exam-stage-grid">
        <main className="question-content-pane">
          <div className="question-card">
            <div className="question-meta-strip font-mono">
              <span className="q-badge">
                SOAL {currentIndex + 1} DARI {questions.length}
              </span>
            </div>
            {question && (
              <>
                <div className="question-prompt-text font-serif">
                  <MathText>{question.prompt}</MathText>
                </div>
                <div
                  className="options-stack font-sans"
                  role="radiogroup"
                  aria-label="Pilihan jawaban tryout"
                >
                  {question.options.map((text, index) => (
                    <button
                      key={index}
                      type="button"
                      role="radio"
                      aria-checked={answers[question.id] === String(index)}
                      disabled={pending}
                      className={`option-row ${answers[question.id] === String(index) ? "selected" : ""}`}
                      onClick={() => onAnswer(question.id, index)}
                    >
                      <span className="opt-key font-mono">{String.fromCharCode(65 + index)}</span>
                      <span className="opt-text">
                        <MathText>{text}</MathText>
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <footer className="question-footer-nav mt-5">
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
        <aside className="quiz-navigator-pane" aria-label="Navigasi soal tryout">
          <div className="navigator-card">
            <div className="navigator-head">
              <span className="dot-stamp" />
              <span className="nav-title font-mono">Daftar Nomor</span>
            </div>
            <div className="navigator-grid-container">
              <div className="navigator-grid">
                {questions.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={pending}
                    aria-label={`Soal ${index + 1}`}
                    aria-current={index === currentIndex ? "step" : undefined}
                    className={`nav-number-tile font-mono ${index === currentIndex ? "is-active" : ""} ${answers[item.id] ? "is-answered" : "is-unanswered"} ${flags[item.id] ? "is-flagged" : ""}`}
                    onClick={() => onJump(index)}
                  >
                    <span className="tile-num-text">{String(index + 1).padStart(2, "0")}</span>
                    {flags[item.id] && <span className="tile-flag-pip" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
