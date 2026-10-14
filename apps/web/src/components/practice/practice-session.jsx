import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Award,
  BarChart2,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Layers,
  RotateCcw,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { sound } from "../../utils/audioFeedback";
import { Button } from "../ui/button";
import { ProgressBar } from "../ui/dashboard";
import { LatveriaCalculator } from "../LatveriaCalculator";
import { PracticeQuestion } from "./practice-question";
import { PracticeNavigator } from "./practice-navigator";
import { PracticeResultsDialog } from "./practice-results-dialog";
import { QuestionReportDialog } from "../question/question-report-dialog";
import { ConfirmDialog } from "../confirm-dialog";
import { SubmissionSummary } from "./submission-summary";
import { practiceOptionKeys } from "../../lib/practice/practice-answers";

export function PracticeSession({
  activeSession: session,
  setActiveSession,
  exitPractice,
  reviewSession,
  onReviewStart,
}) {
  const {
    startPractice,
    selectAnswer,
    toggleFlag,
    finishSession,
    openLexicon,
    submitting,
    submissionError,
  } = useApp();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [timeLeft, setTimeLeft] = useState(session.totalQuestions * 90);
  const [timerPaused, setTimerPaused] = useState(false);
  const timerSubmitted = useRef(false);
  const evaluated = Boolean(session.isEvaluated);
  const index = session.currentIndex;
  const question = session.questions[index];
  const total = session.totalQuestions;
  const answer = session.answers[index];
  const flagged = !evaluated && Boolean(session.flagged[index]);
  const answered = Object.values(session.answers).filter(Boolean).length;
  const locked = evaluated || Boolean(session.attemptId) || submitting;
  const overlayOpen = mobileNavOpen || showCalculator || showSubmit || showReport || showResults;

  useEffect(() => {
    if (evaluated || session.attemptId || session.mode !== "Timed Practice" || timerPaused) return;
    if (timeLeft === 0) {
      if (!timerSubmitted.current) {
        timerSubmitted.current = true;
        void finishSession();
      }
      return;
    }
    const interval = setInterval(() => setTimeLeft((previous) => Math.max(0, previous - 1)), 1000);
    return () => clearInterval(interval);
  }, [evaluated, session.attemptId, session.mode, timerPaused, timeLeft, finishSession]);

  useEffect(() => {
    const handleKey = (event) => {
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName) ||
        event.target.isContentEditable ||
        event.target.closest?.('[role="dialog"], [role="alertdialog"]') ||
        overlayOpen
      )
        return;
      const key = event.key.toUpperCase();
      if (!locked) {
        if (
          practiceOptionKeys.includes(key) &&
          practiceOptionKeys.indexOf(key) < question.options.length
        )
          selectAnswer(index, key);
        else if (/^[1-5]$/.test(key) && Number(key) <= question.options.length)
          selectAnswer(index, practiceOptionKeys[Number(key) - 1]);
        else if (key === "F") toggleFlag(index);
      }
      const next =
        event.key === "ArrowRight" ? index + 1 : event.key === "ArrowLeft" ? index - 1 : index;
      if (next !== index && next >= 0 && next < total) {
        sound.playClick();
        setActiveSession((previous) => ({ ...previous, currentIndex: next }));
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [
    index,
    total,
    locked,
    overlayOpen,
    selectAnswer,
    toggleFlag,
    setActiveSession,
    question.options.length,
  ]);

  const jump = (next) => {
    sound.playClick();
    setActiveSession((previous) => ({ ...previous, currentIndex: next }));
    setMobileNavOpen(false);
  };
  const time = `${String(Math.floor(timeLeft / 60)).padStart(2, "0")}:${String(timeLeft % 60).padStart(2, "0")}`;
  return (
    <div
      className={`latveria-view-container question-view-active ${evaluated ? "mode-evaluation" : "mode-practice"}`}
    >
      <LatveriaCalculator
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
        isAllowed={["PK", "PM", "PU"].includes(session.subjectId)}
      />
      <header className="question-header-bar">
        <div className="header-subtest-info">
          <Button
            variant="ghost"
            className="btn-exit-minimal"
            disabled={submitting}
            onClick={exitPractice}
          >
            <ChevronLeft size={16} />
            <span className="font-mono">{evaluated ? "KEMBALI" : "KELUAR"}</span>
          </Button>
          <div className="subtest-badge-box">
            <span className="subtest-code font-mono">{session.subjectCode}</span>
            <span className="subtest-name font-serif">{session.subjectName}</span>
            {session.packageName && (
              <span className="subtest-package-badge font-mono text-xs px-2 py-0.5 rounded border border-[var(--edge)] text-[var(--gold)]">
                {session.packageName}
              </span>
            )}
          </div>
        </div>
        <div className="header-center-info">
          {evaluated ? (
            <div className="eval-quick-score font-mono">
              <span className="eval-score-val text-gold">{session.results?.score || 0}/100</span>
              <span className="eval-score-divider">•</span>
              <span className="text-sage">{session.results?.correctCount || 0} benar</span>
              <span className="eval-score-divider">•</span>
              <span className="text-crimson">{session.results?.incorrectCount || 0} salah</span>
              {index < total - 1 && (
                <Button
                  variant="ghost"
                  className="btn-open-dossier-pill"
                  onClick={() => setShowResults(true)}
                >
                  <BarChart2 size={13} />
                  Ringkasan
                </Button>
              )}
            </div>
          ) : session.mode === "Timed Practice" ? (
            <div className={`timer-display font-mono ${timeLeft < 120 ? "timer-warning" : ""}`}>
              <Clock size={15} />
              <span className="time-label">Sisa waktu</span>
              <span className="time-digits">{time}</span>
              <Button
                variant="ghost"
                className="btn-timer-pause"
                onClick={() => setTimerPaused(!timerPaused)}
              >
                {timerPaused ? "Lanjutkan" : "Jeda"}
              </Button>
            </div>
          ) : (
            <span className="mode-display font-mono">
              {session.mode === "Practice"
                ? "Tanpa batas waktu"
                : session.mode === "Review"
                  ? "Ulasan"
                  : session.mode}
            </span>
          )}
        </div>
        <div className="header-tools-group">
          <Button
            variant="ghost"
            className={`tool-action-btn ${showCalculator ? "active" : ""}`}
            onClick={() => setShowCalculator(!showCalculator)}
          >
            <Calculator size={15} />
            Kalkulator
          </Button>
          {!evaluated ? (
            <>
              <Button
                variant="ghost"
                className={`tool-action-btn ${flagged ? "flagged" : ""}`}
                disabled={locked}
                onClick={() => toggleFlag(index)}
              >
                <Flag size={15} />
                {flagged ? "Ditandai" : "Tandai"}
              </Button>
              <Button
                variant="ghost"
                className="tool-action-btn"
                onClick={() => setShowReport(true)}
              >
                <AlertCircle size={15} />
                Laporkan
              </Button>
              {index < total - 1 && (
                <Button disabled={submitting} onClick={() => setShowSubmit(true)}>
                  {submitting ? "Memproses…" : session.attemptId ? "Muat hasil" : "Kumpulkan"}
                </Button>
              )}
            </>
          ) : (
            <Button
              onClick={() => {
                if (onReviewStart) onReviewStart();
                else
                  startPractice(
                    session.subjectId,
                    session.mode,
                    total,
                    "",
                    session.packageId || null,
                  );
              }}
            >
              <RotateCcw size={14} />
              Drilling lagi
            </Button>
          )}
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
      {submissionError && (
        <div className="submit-error-banner">
          <p role="alert">{submissionError}</p>
          {session.attemptId && (
            <Button variant="outline" disabled={submitting} onClick={finishSession}>
              Muat hasil lagi
            </Button>
          )}
        </div>
      )}
      <div className="quiz-progress-strip">
        <div className="progress-info-left font-mono">
          <span className="prog-step text-gold">Soal {index + 1}</span>
          <span className="prog-total text-muted"> / {total}</span>
        </div>
        <ProgressBar
          value={index + 1}
          max={total}
          label="Posisi soal"
          className="progress-bar-track"
          fillClassName="progress-bar-fill"
        />
      </div>
      <div className="quiz-split-workspace">
        <main className="quiz-question-pane">
          <PracticeQuestion
            key={question.id}
            question={question}
            answer={answer}
            evaluated={evaluated}
            disabled={locked}
            englishLiteracy={
              session.subjectSlug === "literasi-bahasa-inggris" ||
              session.subjectId === "LBE" ||
              Boolean(question?.annotations?.length)
            }
            onAnswer={(key) => selectAnswer(index, key)}
            onOpenLexicon={openLexicon}
          />
          <footer className="question-footer-nav">
            <Button variant="outline" disabled={index === 0} onClick={() => jump(index - 1)}>
              <ChevronLeft size={16} />
              SEBELUMNYA
            </Button>
            <span className="sr-only" aria-live="polite">
              {evaluated
                ? answer === question.correctAnswer
                  ? "Jawaban benar"
                  : !answer
                    ? "Belum dijawab"
                    : "Jawaban salah"
                : answer
                  ? `Jawaban ${answer} dipilih`
                  : "Belum dijawab"}
            </span>
            {index < total - 1 ? (
              <Button onClick={() => jump(index + 1)}>
                BERIKUTNYA
                <ChevronRight size={16} />
              </Button>
            ) : evaluated ? (
              <Button onClick={() => setShowResults(true)}>
                Lihat hasil
                <BarChart2 size={16} />
              </Button>
            ) : (
              <Button disabled={submitting} onClick={() => setShowSubmit(true)}>
                Kumpulkan
                <Award size={16} />
              </Button>
            )}
          </footer>
        </main>
        <PracticeNavigator
          session={session}
          onJump={jump}
          mobileOpen={mobileNavOpen}
          onMobileOpenChange={setMobileNavOpen}
        />
      </div>
      <ConfirmDialog
        open={showSubmit}
        onOpenChange={setShowSubmit}
        title="Kumpulkan jawaban?"
        description="Jawaban tidak dapat diubah setelah dikumpulkan."
        cancelLabel="Lanjutkan"
        confirmLabel={session.attemptId ? "Muat hasil" : "Kumpulkan"}
        pending={submitting}
        onConfirm={() => {
          setShowSubmit(false);
          void finishSession();
        }}
      >
        <SubmissionSummary total={total} answered={answered} />
      </ConfirmDialog>
      {showReport && (
        <QuestionReportDialog
          open
          onOpenChange={setShowReport}
          questionId={question.id}
          packageId={session.packageId}
        />
      )}
      {session.results && (
        <PracticeResultsDialog
          open={showResults}
          subject={session.subjectName}
          packageName={session.packageName}
          correct={session.results.correctCount}
          total={total}
          unanswered={session.results.unansweredCount}
          earnedXP={session.results.earnedXP}
          score={session.results.score}
          onClose={() => setShowResults(false)}
          onExit={() => {
            setShowResults(false);
            exitPractice();
          }}
          exitLabel={reviewSession ? "Kembali ke Drill Log" : "Kembali ke Drilling"}
        />
      )}
    </div>
  );
}
