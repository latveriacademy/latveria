import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock, FileCheck, Flag, Layers } from "lucide-react";
import { Button } from "../ui/button";
import { QuestionRenderer, type QuestionData } from "../question/question-renderer";
import { PracticeNavigator } from "../practice/practice-navigator";
import { ProgressBar } from "../ui/dashboard";
import type {
  LexiconAnnotation,
  QuestionStimulus,
  TrueFalseStatementClient,
  UtbkScoreReport,
  LatveriaScoreResult,
} from "@latveria/shared";

export interface TryoutSessionQuestion {
  id: string;
  prompt: string;
  questionType?: string;
  stimulus?: QuestionStimulus | null;
  passage?: string | null;
  statements?: TrueFalseStatementClient[] | null;
  options?: string[];
  rawOptions?: Array<{ id?: string; text: string; isCorrect?: boolean }>;
}

export interface TryoutSessionState {
  session: {
    id: string;
    state: "active" | "break" | "section_ready" | "completed";
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
  questions: TryoutSessionQuestion[];
  reviewQuestions?: {
    id: string;
    prompt: string;
    questionType?: string;
    stimulus?: QuestionStimulus | null;
    passage?: string | null;
    statements?: TrueFalseStatementClient[] | null;
    options: string[];
    correctAnswer: number;
    explanation: string;
    annotations: LexiconAnnotation[];
    topic: string;
    slug: string;
  }[];
  score?: UtbkScoreReport | LatveriaScoreResult | null;
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
  onAnswer: (id: string, answerPayload: string | number) => void;
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
  const currentQ = questions[currentIndex] || questions[0];

  // Prepare questions for navigator
  const navigatorQuestions = questions.map((item) => ({
    id: item.id,
    question: item.prompt,
    correctAnswer: undefined,
  }));

  // Map answers for navigator (any answered state)
  const navigatorAnswers = questions.map((item) => answers[item.id]);

  // Normalize current answer for QuestionRenderer
  const rawAnswer = currentQ ? answers[currentQ.id] : undefined;
  let formattedAnswer: string | Record<string, boolean> | undefined = undefined;

  if (rawAnswer !== undefined) {
    if (currentQ?.questionType === "true_false_group") {
      try {
        formattedAnswer = JSON.parse(rawAnswer);
      } catch {
        formattedAnswer = {};
      }
    } else {
      // If single choice and answer is numeric string "0", convert to "A"
      const num = Number(rawAnswer);
      if (!Number.isNaN(num) && num >= 0 && num < 26) {
        formattedAnswer = String.fromCharCode(65 + num);
      } else {
        formattedAnswer = rawAnswer;
      }
    }
  }

  const handleRendererAnswer = (val: string | Record<string, boolean>) => {
    if (!currentQ) return;
    if (typeof val === "object") {
      onAnswer(currentQ.id, JSON.stringify(val));
    } else {
      // Val is "A", "B", ...
      const code = val.charCodeAt(0) - 65;
      onAnswer(currentQ.id, code >= 0 ? code : val);
    }
  };

  const rendererQuestionData: QuestionData = {
    id: currentQ?.id || "",
    prompt: currentQ?.prompt || "",
    questionType: currentQ?.questionType || "single_choice",
    stimulus: currentQ?.stimulus,
    passage: currentQ?.passage,
    statements: currentQ?.statements,
    options: currentQ?.options?.map((text, idx) => ({
      key: String.fromCharCode(65 + idx),
      text,
    })),
  };

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
            className={`tool-action-btn ${currentQ && flags[currentQ.id] ? "flagged" : ""}`}
            aria-pressed={Boolean(currentQ && flags[currentQ.id])}
            disabled={pending}
            onClick={() => currentQ && onFlag(currentQ.id)}
          >
            <Flag size={14} />
            {currentQ && flags[currentQ.id] ? "Ragu-ragu" : "Tandai"}
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
          {currentQ && (
            <QuestionRenderer
              key={currentQ.id}
              question={rendererQuestionData}
              answer={formattedAnswer}
              evaluated={false}
              disabled={pending}
              onAnswer={handleRendererAnswer}
            />
          )}
          <footer className="question-footer-nav mt-6">
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
            questions: navigatorQuestions,
            answers: navigatorAnswers,
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
