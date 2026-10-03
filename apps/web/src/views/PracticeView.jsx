import { PracticeCatalog } from "./PracticeCatalog";
import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { History } from "lucide-react";
import { useApp } from "../context/AppContext";
import { LatveriaCalculator } from "../components/LatveriaCalculator";
import { MathText } from "../components/math-text";
import { PageHeading, Panel, PanelHeader } from "../components/ui/dashboard";
import styles from "./practice-catalog.module.css";
import { PracticeResultsDialog } from "../components/practice-results-dialog";
import { Button } from "../components/ui/button";
import { sound } from "../utils/audioFeedback";
import {
  BookOpen,
  Clock,
  Flag,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Award,
  Layers,
  HelpCircle,
  BookMarked,
  SlidersHorizontal,
  Compass,
  FileText,
  Brain,
  Hash,
  PenTool,
  Globe,
  Calculator,
  Check,
  X,
  FileCheck,
  BarChart2,
  Maximize2,
  AlertCircle,
  Search,
} from "lucide-react";

export const PracticeView = ({ reviewSession, onReviewExit, onReviewStart } = {}) => {
  const {
    activeSession: liveSession,
    setActiveSession: setLiveSession,
    sessionResults,
    setSessionResults,
    startPractice,
    fetchSubtestPackages,
    selectAnswer,
    toggleFlag,
    finishSession,
    exitPractice: exitLivePractice,
    openLexicon,
    topics,
    topicsLoading,
    topicsError,
    refreshTopics,
    loading,
    submitting,
    submissionError,
  } = useApp();
  const [reviewState, setReviewState] = useState(reviewSession ?? null);
  const activeSession = reviewSession ? reviewState : liveSession;
  const setActiveSession = reviewSession ? setReviewState : setLiveSession;
  const exitPractice = reviewSession ? onReviewExit : exitLivePractice;

  // Selection Screen State
  const [selectedMode, setSelectedMode] = useState("Practice");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogSection, setCatalogSection] = useState("semua");

  // Subtest Package Selection State
  const [params] = useSearchParams();
  const selectedSubtest = topics.find((topic) => topic.slug === params.get("subtes"));
  const selectedSlug = selectedSubtest?.slug;
  const [subtestPackages, setSubtestPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [packagesError, setPackagesError] = useState("");
  const [packagesRetry, setPackagesRetry] = useState(0);
  const hasSession = Boolean(activeSession);

  useEffect(() => {
    setSelectedPackage(null);
    if (!selectedSlug || hasSession) return;
    const controller = new AbortController();
    setSubtestPackages([]);
    setPackagesError("");
    setLoadingPackages(true);
    fetchSubtestPackages(selectedSlug, controller.signal)
      .then((packages) => {
        if (!controller.signal.aborted) setSubtestPackages(packages);
      })
      .catch(() => {
        if (!controller.signal.aborted) setPackagesError("Gagal memuat paket soal. Coba lagi.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingPackages(false);
      });
    return () => controller.abort();
  }, [selectedSlug, hasSession, fetchSubtestPackages, packagesRetry]);

  // In-Session Navigator (Mobile Sheet / Drawer)
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Calculator State
  const [showCalculator, setShowCalculator] = useState(false);

  // Submission Confirmation Modal State
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Question Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [reportSending, setReportSending] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [reportError, setReportError] = useState("");

  // In-Session Timer Countdown
  const [timeLeft, setTimeLeft] = useState(null);
  const [timerPaused, setTimerPaused] = useState(false);

  // Evaluation Mode: Show Full Summary Modal
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // Subject Icon Map
  const getSubjectIcon = (id, slug) => {
    switch (id) {
      case "PU":
        return Brain;
      case "PPU":
        return BookOpen;
      case "PBM":
        return PenTool;
      case "PK":
        return Hash;
      case "LBI":
        return FileText;
      case "LBE":
        return Globe;
      case "PM":
        return Compass;
      default:
        if (slug === "matematika-dasar" || slug === "kalkulus") return Calculator;
        if (slug === "fisika-dasar") return Compass;
        if (slug === "ekonomi") return BarChart2;
        return Layers;
    }
  };

  // Timer Effect when Timed Practice is active
  useEffect(() => {
    if (
      !activeSession ||
      activeSession.isEvaluated ||
      activeSession.attemptId ||
      activeSession.mode !== "Timed Practice" ||
      timerPaused ||
      timeLeft === 0
    )
      return;

    if (timeLeft === null) {
      setTimeLeft(activeSession.totalQuestions * 90);
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          finishSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSession, timerPaused, timeLeft]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (!activeSession) return;

    const handleKeyDown = (e) => {
      if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;

      const currIdx = activeSession.currentIndex;
      const key = e.key.toUpperCase();

      // Only allow answer selection if not yet evaluated
      if (!activeSession.isEvaluated && !activeSession.attemptId && !submitting) {
        if (["A", "B", "C", "D"].includes(key)) {
          selectAnswer(currIdx, key);
        } else if (["1", "2", "3", "4"].includes(key)) {
          const keyMap = { 1: "A", 2: "B", 3: "C", 4: "D" };
          selectAnswer(currIdx, keyMap[key]);
        } else if (key === "F") {
          toggleFlag(currIdx);
        }
      }

      if (e.key === "ArrowRight" && currIdx < activeSession.totalQuestions - 1) {
        sound.playClick();
        setActiveSession((prev) => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
      } else if (e.key === "ArrowLeft" && currIdx > 0) {
        sound.playClick();
        setActiveSession((prev) => ({ ...prev, currentIndex: prev.currentIndex - 1 }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSession]);

  // Format seconds to MM:SS
  const formatTime = (secs) => {
    if (secs === null) return "--:--";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Render passage with interactive clickable words for English Literacy
  const renderInteractivePassage = (passage, interactiveWords = []) => {
    if (!interactiveWords || !interactiveWords.length) {
      return <div className="passage-body font-serif">{passage}</div>;
    }

    const words = passage.split(/(\s+)/);

    return (
      <div className="passage-body font-serif interactive-passage">
        {words.map((word, idx) => {
          const cleanWord = word.toLowerCase().replace(/[^a-z]/g, "");
          const isInteractive = interactiveWords.includes(cleanWord);

          if (isInteractive) {
            return (
              <span
                key={idx}
                className="interactive-word-token"
                onClick={() => openLexicon(cleanWord)}
                title="Buka Latveria Academic Lexicon"
              >
                {word}
                <span className="token-indicator" />
              </span>
            );
          }
          return <span key={idx}>{word}</span>;
        })}
      </div>
    );
  };

  // ========================================================
  // SCENARIO 1 & 2: ACTIVE SESSION (PRACTICE OR EVALUATION MODE)
  // ========================================================
  if (activeSession) {
    const isEvaluated = !!activeSession.isEvaluated;
    const currIdx = activeSession.currentIndex;
    const currentQ = activeSession.questions[currIdx];
    const totalQ = activeSession.totalQuestions;
    const userSelectedKey = activeSession.answers[currIdx];
    const isFlagged = !isEvaluated && !!activeSession.flagged[currIdx];
    const isEnglishLiteracy = activeSession.subjectId === "LBE";

    // Calculation for progress indicators
    const answeredCount = Object.keys(activeSession.answers).filter(
      (k) => activeSession.answers[k],
    ).length;
    const unansweredCount = totalQ - answeredCount;
    const progressPercent = Math.round(((currIdx + 1) / totalQ) * 100);

    // Evaluation specific status for current question
    const isCurrentCorrect = userSelectedKey === currentQ.correctAnswer;
    const isCurrentUnanswered = !userSelectedKey;

    const handleNext = () => {
      sound.playClick();
      if (currIdx < totalQ - 1) {
        setActiveSession((prev) => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
      }
    };

    const handlePrev = () => {
      sound.playClick();
      if (currIdx > 0) {
        setActiveSession((prev) => ({ ...prev, currentIndex: prev.currentIndex - 1 }));
      }
    };

    const handleJumpToQuestion = (targetIdx) => {
      sound.playClick();
      setActiveSession((prev) => ({ ...prev, currentIndex: targetIdx }));
      setMobileNavOpen(false);
    };

    return (
      <div
        className={`latveria-view-container question-view-active ${isEvaluated ? "mode-evaluation" : "mode-practice"}`}
      >
        {/* Floating Interactive Calculator */}
        <LatveriaCalculator
          isOpen={showCalculator}
          onClose={() => setShowCalculator(false)}
          isAllowed={["PK", "PM", "PU"].includes(activeSession.subjectId)}
        />

        {/* ========================================================
            HEADER BAR: METADATA, PROGRESS, TIMER & TOOL ACTIONS
            ======================================================== */}
        <header className="question-header-bar">
          <div className="header-subtest-info">
            <button
              type="button"
              className="btn-exit-minimal"
              disabled={submitting}
              onClick={exitPractice}
              title={isEvaluated ? "Kembali ke Drilling" : "Keluar dari sesi"}
            >
              <ChevronLeft size={16} />
              <span className="font-mono">{isEvaluated ? "KEMBALI" : "KELUAR"}</span>
            </button>
            <div className="subtest-badge-box">
              <span className="subtest-code font-mono">{activeSession.subjectCode}</span>
              <span className="subtest-name font-serif">{activeSession.subjectName}</span>
              {activeSession.packageName && (
                <span className="subtest-package-badge font-mono text-xs px-2 py-0.5 rounded border border-[var(--edge)] bg-[var(--surface-muted)] text-[var(--gold)]">
                  {activeSession.packageName}
                </span>
              )}
            </div>
          </div>

          {/* Center: Timer or Evaluation Score Summary */}
          <div className="header-center-info">
            {isEvaluated ? (
              <div className="eval-quick-score font-mono">
                <span className="eval-score-val text-gold">
                  {activeSession.results?.score || 0}/100
                </span>
                <span className="eval-score-divider">•</span>
                <span className="text-sage">{activeSession.results?.correctCount || 0} benar</span>
                <span className="eval-score-divider">•</span>
                <span className="text-crimson">
                  {activeSession.results?.incorrectCount || 0} salah
                </span>
                {currIdx < totalQ - 1 && (
                  <button
                    type="button"
                    className="btn-open-dossier-pill font-mono"
                    onClick={() => setShowSummaryModal(true)}
                  >
                    <BarChart2 size={13} />
                    <span>Ringkasan</span>
                  </button>
                )}
              </div>
            ) : activeSession.mode === "Timed Practice" ? (
              <div className={`timer-display font-mono ${timeLeft < 120 ? "timer-warning" : ""}`}>
                <Clock size={15} />
                <span className="time-label">Sisa waktu</span>
                <span className="time-digits">{formatTime(timeLeft)}</span>
                <button
                  type="button"
                  className="btn-timer-pause"
                  onClick={() => setTimerPaused(!timerPaused)}
                  title={timerPaused ? "Lanjutkan Waktu" : "Jeda Waktu"}
                >
                  {timerPaused ? "Lanjutkan" : "Jeda"}
                </button>
              </div>
            ) : (
              <span className="mode-display font-mono">
                {activeSession.mode === "Practice"
                  ? "Tanpa batas waktu"
                  : activeSession.mode === "Review"
                    ? "Ulasan"
                    : activeSession.mode}
              </span>
            )}
          </div>

          {/* Right: Tools (Calculator, Flag, Submit / Repeat) */}
          <div className="header-tools-group">
            <button
              type="button"
              id="btn-toggle-calc"
              className={`tool-action-btn ${showCalculator ? "active" : ""}`}
              onClick={() => setShowCalculator(!showCalculator)}
              title="Kalkulator"
            >
              <Calculator size={15} />
              <span className="font-mono">Kalkulator</span>
            </button>

            {!isEvaluated ? (
              <>
                <button
                  type="button"
                  id="btn-flag-question"
                  className={`tool-action-btn ${isFlagged ? "flagged" : ""}`}
                  onClick={() => toggleFlag(currIdx)}
                  title="Tandai soal"
                >
                  <Flag size={15} />
                  <span className="font-mono">{isFlagged ? "Ditandai" : "Tandai"}</span>
                </button>

                <button
                  type="button"
                  id="btn-report-question"
                  className="tool-action-btn"
                  onClick={() => {
                    sound.playClick();
                    setReportSent(false);
                    setReportError("");
                    setReportReason("");
                    setReportDesc("");
                    setShowReportModal(true);
                  }}
                  title="Laporkan soal bermasalah"
                >
                  <AlertCircle size={15} />
                  <span className="font-mono">Laporkan</span>
                </button>

                {currIdx < totalQ - 1 && (
                  <button
                    type="button"
                    id="btn-open-submit-modal"
                    className="btn-latveria-primary btn-submit-exam font-mono"
                    disabled={submitting}
                    onClick={() => setShowSubmitModal(true)}
                  >
                    <span>
                      {submitting
                        ? "Memproses…"
                        : activeSession.attemptId
                          ? "Muat hasil"
                          : "Kumpulkan"}
                    </span>
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                className="btn-latveria-primary btn-submit-exam font-mono"
                onClick={() => {
                  if (onReviewStart) {
                    onReviewStart();
                    return;
                  }
                  sound.playClick();
                  startPractice(
                    activeSession.subjectId,
                    activeSession.mode,
                    activeSession.totalQuestions,
                    "",
                    activeSession.packageId || null,
                  );
                }}
              >
                <RotateCcw size={14} />
                <span>Drilling lagi</span>
              </button>
            )}

            {/* Mobile Sheet Trigger */}
            <button
              type="button"
              className="btn-mobile-nav-toggle font-mono"
              onClick={() => setMobileNavOpen(true)}
              title="Buka navigasi soal"
            >
              <Layers size={15} />
              <span>Navigasi</span>
            </button>
          </div>
        </header>
        {submissionError && (
          <div className="submit-error-banner">
            <p role="alert">{submissionError}</p>
            {activeSession.attemptId && (
              <button
                type="button"
                className="btn-latveria-secondary"
                disabled={submitting}
                onClick={finishSession}
              >
                Muat hasil lagi
              </button>
            )}
          </div>
        )}

        {/* ========================================================
            SUB-HEADER STRIP: PROGRESS BAR & COUNTER
            ======================================================== */}
        <div className="quiz-progress-strip">
          <div className="progress-info-left font-mono">
            <span className="prog-step text-gold">Soal {currIdx + 1}</span>
            <span className="prog-total text-muted"> / {totalQ}</span>
          </div>

          <div className="progress-bar-track">
            <div
              className="progress-bar-fill transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[width]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* ========================================================
            MAIN QUIZ WORKSPACE: AREA SOAL (LEFT) + NAVIGATOR (RIGHT)
            ======================================================== */}
        <div className="quiz-split-workspace">
          {/* ----------------------------------------------------
              1. AREA SOAL (QUESTION WORKSPACE)
              ---------------------------------------------------- */}
          <main className="quiz-question-pane">
            <div className="question-layout-card motion-fade-up" key={currIdx}>
              {/* Question Header & Evaluation Badge */}
              <div className="q-card-top-meta">
                {/* Status Badge in Evaluation Mode */}
                {isEvaluated ? (
                  <div className="q-eval-verdict font-mono">
                    {isCurrentCorrect && (
                      <span className="verdict-pill verdict-correct motion-scale-in">
                        <CheckCircle2 size={15} />
                        <span>✓ JAWABAN BENAR</span>
                      </span>
                    )}
                    {!isCurrentCorrect && !isCurrentUnanswered && (
                      <span className="verdict-pill verdict-incorrect motion-scale-in">
                        <XCircle size={15} />
                        <span>× JAWABAN SALAH</span>
                      </span>
                    )}
                    {isCurrentUnanswered && (
                      <span className="verdict-pill verdict-unanswered motion-scale-in">
                        <AlertTriangle size={15} />
                        <span>○ BELUM DIJAWAB</span>
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="q-practice-status font-mono">
                    {userSelectedKey ? (
                      <span className="status-indicator-answered">
                        <span className="status-dot answered" />
                        TERJAWAB ({userSelectedKey})
                      </span>
                    ) : (
                      <span className="status-indicator-unanswered">
                        <span className="status-dot unanswered" />
                        BELUM DIJAWAB
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Passage Excerpt (if present) */}
              {currentQ.passage && (
                <section className="passage-section">
                  <div className="passage-label font-mono">
                    <span>Teks soal</span>
                    {isEnglishLiteracy && (
                      <span className="text-gold">
                        Klik kata bergaris bawah untuk melihat arti.
                      </span>
                    )}
                  </div>
                  {renderInteractivePassage(currentQ.passage, currentQ.interactiveWords)}
                </section>
              )}

              {/* Question Prompt */}
              <div className="question-prompt-box">
                <h2 className="question-prompt font-serif">
                  <MathText>{currentQ.question}</MathText>
                </h2>
              </div>

              {/* Options A - E */}
              <div className="options-container" role="radiogroup" aria-label="Pilihan Jawaban">
                {currentQ.options.map((option) => {
                  const isSelected = userSelectedKey === option.key;
                  const isCorrectAnswer = currentQ.correctAnswer === option.key;

                  // Determine classes based on mode
                  let stateClass = "";
                  if (!isEvaluated) {
                    if (isSelected) stateClass = "selected";
                  } else {
                    if (isCorrectAnswer) {
                      stateClass = "eval-correct-opt";
                    } else if (isSelected && !isCorrectAnswer) {
                      stateClass = "eval-incorrect-opt";
                    } else {
                      stateClass = "eval-neutral-opt";
                    }
                  }

                  return (
                    <button
                      key={option.key}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      disabled={isEvaluated || submitting || !!activeSession.attemptId}
                      className={`option-choice-card ${stateClass} transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.01] active:scale-[0.985]`}
                      onClick={() => !isEvaluated && selectAnswer(currIdx, option.key)}
                    >
                      <div className="option-key-badge font-mono">{option.key}</div>
                      <div className="option-text-body font-sans">
                        <MathText>{option.text}</MathText>
                      </div>

                      {/* Right Tag / Indicator */}
                      {!isEvaluated ? (
                        <div className="option-radio-indicator">
                          {isSelected && <span className="radio-inner-pip motion-scale-in" />}
                        </div>
                      ) : (
                        <div className="eval-opt-badge font-mono">
                          {isCorrectAnswer && (
                            <span className="badge-tag-correct">
                              <Check size={13} />
                              {isSelected ? "JAWABAN ANDA (BENAR)" : "KUNCI JAWABAN BENAR"}
                            </span>
                          )}
                          {isSelected && !isCorrectAnswer && (
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

              {/* ------------------------------------------------
                  9. PEMBAHASAN AKADEMIK (HANYA MUNCUL DI EVALUATION MODE)
                  ------------------------------------------------ */}
              {isEvaluated && (
                <section className="academic-explanation-dossier" aria-label="Pembahasan Soal">
                  <div className="explanation-title font-mono">
                    <BookMarked size={17} className="text-gold" />
                    <span>Pembahasan</span>
                  </div>

                  {typeof currentQ.explanation === "string" ? (
                    <div className="explanation-section">
                      <p className="sec-body font-serif">
                        <MathText>{currentQ.explanation}</MathText>
                      </p>
                    </div>
                  ) : currentQ.explanation ? (
                    <>
                      {currentQ.explanation.concept && (
                        <div className="explanation-section">
                          <p className="sec-body font-serif">
                            <MathText>{currentQ.explanation.concept}</MathText>
                          </p>
                        </div>
                      )}

                      {Array.isArray(currentQ.explanation.stepByStep) && (
                        <div className="explanation-section">
                          <ul className="step-list font-sans">
                            {currentQ.explanation.stepByStep.map((step, sIdx) => (
                              <li key={sIdx}>
                                <span className="step-num font-mono">{sIdx + 1}.</span>
                                <span>
                                  <MathText>{step}</MathText>
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {currentQ.explanation.whyCorrect && (
                        <div className="explanation-section">
                          <p className="sec-body font-serif text-sage-dim">
                            <MathText>{currentQ.explanation.whyCorrect}</MathText>
                          </p>
                        </div>
                      )}

                      {currentQ.explanation.pitfall && (
                        <div className="explanation-section pitfall-sec">
                          <p className="sec-body font-serif text-crimson-dim">
                            <MathText>{currentQ.explanation.pitfall}</MathText>
                          </p>
                        </div>
                      )}
                    </>
                  ) : null}
                </section>
              )}
            </div>

            {/* Bottom Navigasi Soal */}
            <footer className="question-footer-nav">
              <button
                type="button"
                className="btn-latveria-secondary"
                onClick={handlePrev}
                disabled={currIdx === 0}
              >
                <ChevronLeft size={16} />
                <span>SEBELUMNYA</span>
              </button>

              <span className="sr-only" aria-live="polite">
                {isEvaluated
                  ? isCurrentCorrect
                    ? "Jawaban benar"
                    : isCurrentUnanswered
                      ? "Belum dijawab"
                      : "Jawaban salah"
                  : userSelectedKey
                    ? `Jawaban ${userSelectedKey} dipilih`
                    : "Belum dijawab"}
              </span>

              {currIdx < totalQ - 1 ? (
                <button type="button" className="btn-latveria-primary" onClick={handleNext}>
                  <span>BERIKUTNYA</span>
                  <ChevronRight size={16} />
                </button>
              ) : !isEvaluated ? (
                <button
                  type="button"
                  className="btn-latveria-primary btn-gold-solid"
                  disabled={submitting}
                  onClick={() => setShowSubmitModal(true)}
                >
                  <span>Kumpulkan</span>
                  <Award size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-latveria-primary btn-gold-solid"
                  onClick={() => setShowSummaryModal(true)}
                >
                  <span>Lihat hasil</span>
                  <BarChart2 size={16} />
                </button>
              )}
            </footer>
          </main>

          {/* ----------------------------------------------------
              2. QUESTION NAVIGATOR (DESKTOP PERSISTENT PANEL)
              ---------------------------------------------------- */}
          <aside className="quiz-navigator-pane" aria-label="Question Navigator">
            <div className="navigator-card">
              <div className="navigator-head">
                <div className="nav-title-group font-mono">
                  <span className="dot-stamp" />
                  <span className="nav-title">Navigasi soal</span>
                </div>
              </div>

              {/* Grid Nomor Soal */}
              <div className="navigator-grid-container">
                <div className="navigator-grid">
                  {activeSession.questions.map((q, pIdx) => {
                    const ans = activeSession.answers[pIdx];
                    const hasFlag = !isEvaluated && !!activeSession.flagged[pIdx];
                    const isActive = pIdx === currIdx;

                    let tileClass = "";
                    let tileIcon = null;

                    if (!isEvaluated) {
                      // Practice Mode
                      if (isActive) tileClass += " is-active";
                      if (ans) tileClass += " is-answered";
                      else tileClass += " is-unanswered";
                      if (hasFlag) tileClass += " is-flagged";
                    } else {
                      // Evaluation Mode
                      if (isActive) tileClass += " is-active";
                      if (!ans) {
                        tileClass += " eval-unanswered";
                        tileIcon = "○";
                      } else if (ans === q.correctAnswer) {
                        tileClass += " eval-correct";
                        tileIcon = "✓";
                      } else {
                        tileClass += " eval-incorrect";
                        tileIcon = "×";
                      }
                    }

                    return (
                      <button
                        key={pIdx}
                        type="button"
                        className={`nav-number-tile font-mono ${tileClass}`}
                        onClick={() => handleJumpToQuestion(pIdx)}
                        title={`Buka Soal ${pIdx + 1}`}
                      >
                        <span className="tile-num-text">
                          {pIdx + 1 < 10 ? `0${pIdx + 1}` : pIdx + 1}
                        </span>
                        {tileIcon && <span className="tile-eval-symbol">{tileIcon}</span>}
                        {hasFlag && <span className="tile-flag-pip" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="navigator-legend font-mono">
                {isEvaluated ? (
                  <>
                    <span className="legend-item text-sage">
                      <span className="legend-indicator eval-c" aria-hidden="true" />
                      Benar
                    </span>
                    <span className="legend-item text-crimson">
                      <span className="legend-indicator eval-i" aria-hidden="true" />
                      Salah
                    </span>
                    <span className="legend-item text-muted">
                      <span className="legend-indicator eval-u" aria-hidden="true" />
                      Kosong
                    </span>
                  </>
                ) : (
                  <>
                    <span className="legend-item">
                      <span className="legend-indicator unans" aria-hidden="true" />
                      Belum dijawab
                    </span>
                    <span className="legend-item">
                      <span className="legend-indicator ans" aria-hidden="true" />
                      Terjawab
                    </span>
                    <span className="legend-item">
                      <span className="legend-indicator flag" aria-hidden="true" />
                      Ditandai
                    </span>
                  </>
                )}
              </div>
            </div>
          </aside>
        </div>

        {/* ========================================================
            MOBILE / TABLET DRAWER OVERLAY
            ======================================================== */}
        {mobileNavOpen && (
          <div className="palette-drawer-overlay" onClick={() => setMobileNavOpen(false)}>
            <div className="palette-drawer" onClick={(e) => e.stopPropagation()}>
              <div className="palette-head">
                <span className="font-mono">Navigasi soal</span>
                <button
                  type="button"
                  className="close-palette-btn font-mono"
                  onClick={() => setMobileNavOpen(false)}
                >
                  Tutup
                </button>
              </div>

              <div className="navigator-grid">
                {activeSession.questions.map((q, pIdx) => {
                  const ans = activeSession.answers[pIdx];
                  const hasFlag = !isEvaluated && !!activeSession.flagged[pIdx];
                  const isActive = pIdx === currIdx;

                  let tileClass = "";
                  let tileIcon = null;

                  if (!isEvaluated) {
                    if (isActive) tileClass += " is-active";
                    if (ans) tileClass += " is-answered";
                    else tileClass += " is-unanswered";
                    if (hasFlag) tileClass += " is-flagged";
                  } else {
                    if (isActive) tileClass += " is-active";
                    if (!ans) {
                      tileClass += " eval-unanswered";
                      tileIcon = "○";
                    } else if (ans === q.correctAnswer) {
                      tileClass += " eval-correct";
                      tileIcon = "✓";
                    } else {
                      tileClass += " eval-incorrect";
                      tileIcon = "×";
                    }
                  }

                  return (
                    <button
                      key={pIdx}
                      type="button"
                      className={`nav-number-tile font-mono ${tileClass}`}
                      onClick={() => handleJumpToQuestion(pIdx)}
                    >
                      <span className="tile-num-text">
                        {pIdx + 1 < 10 ? `0${pIdx + 1}` : pIdx + 1}
                      </span>
                      {tileIcon && <span className="tile-eval-symbol">{tileIcon}</span>}
                      {hasFlag && <span className="tile-flag-pip" />}
                    </button>
                  );
                })}
              </div>

              <div className="navigator-legend font-mono" style={{ marginTop: "16px" }}>
                {!isEvaluated ? (
                  <>
                    <span className="legend-item">
                      <span className="legend-indicator unans" /> Belum
                    </span>
                    <span className="legend-item">
                      <span className="legend-indicator ans" /> Terjawab
                    </span>
                    <span className="legend-item">
                      <span className="legend-indicator flag" /> Ditandai
                    </span>
                  </>
                ) : (
                  <>
                    <span className="legend-item text-sage">
                      <span className="legend-indicator eval-c" /> Benar
                    </span>
                    <span className="legend-item text-crimson">
                      <span className="legend-indicator eval-i" /> Salah
                    </span>
                    <span className="legend-item text-muted">
                      <span className="legend-indicator eval-u" /> Kosong
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            6. SUBMIT CONFIRMATION MODAL
            ======================================================== */}
        {showSubmitModal && (
          <div className="modal-backdrop motion-fade-in" onClick={() => setShowSubmitModal(false)}>
            <div
              className="config-modal-card submit-dialog-card motion-scale-in"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-labelledby="modal-submit-title"
            >
              <div className="modal-header">
                <h2 id="modal-submit-title" className="modal-title font-serif">
                  Kumpulkan jawaban?
                </h2>
                <p className="modal-desc">Jawaban tidak dapat diubah setelah dikumpulkan.</p>
              </div>

              {/* Statistics Strip */}
              <div className="submit-summary-quad font-mono">
                <div className="sum-quad-tile">
                  <span className="s-label">TOTAL SOAL</span>
                  <span className="s-val text-primary">{totalQ}</span>
                </div>
                <div className="sum-quad-tile">
                  <span className="s-label">TERJAWAB</span>
                  <span className="s-val text-sage">{answeredCount}</span>
                </div>
                <div className="sum-quad-tile">
                  <span className="s-label">BELUM DIJAWAB</span>
                  <span className="s-val text-crimson">{unansweredCount}</span>
                </div>
              </div>

              <div className="modal-actions-footer">
                <button
                  type="button"
                  className="btn-latveria-secondary font-mono"
                  onClick={() => setShowSubmitModal(false)}
                >
                  Lanjutkan
                </button>
                <button
                  type="button"
                  className="btn-latveria-primary btn-gold-solid font-mono"
                  disabled={submitting}
                  onClick={() => {
                    setShowSubmitModal(false);
                    finishSession();
                  }}
                >
                  <span>
                    {submitting
                      ? "Memproses…"
                      : activeSession.attemptId
                        ? "Muat hasil"
                        : "Kumpulkan"}
                  </span>
                  <FileCheck size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            QUESTION REPORT MODAL
            ======================================================== */}
        {showReportModal && (
          <div className="modal-backdrop motion-fade-in" onClick={() => setShowReportModal(false)}>
            <div
              className="config-modal-card submit-dialog-card motion-scale-in"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-labelledby="modal-report-title"
            >
              <div className="modal-header">
                <h2 id="modal-report-title" className="modal-title font-serif">
                  Laporkan soal
                </h2>
                <p className="modal-desc">
                  Bantu kami meningkatkan kualitas soal dengan melaporkan masalah yang kamu temukan.
                </p>
              </div>

              {reportSent ? (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <CheckCircle2 size={32} className="text-sage" />
                  <p className="font-sans text-sm text-[var(--text-primary)]">
                    Laporan terkirim. Terima kasih!
                  </p>
                  <button
                    type="button"
                    className="btn-latveria-secondary font-mono"
                    onClick={() => setShowReportModal(false)}
                  >
                    Tutup
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!reportReason) return;
                    setReportSending(true);
                    setReportError("");
                    try {
                      const qId = currentQ.id;
                      const res = await fetch("/api/learner/reports", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Origin: window.location.origin,
                        },
                        body: JSON.stringify({
                          questionId: qId,
                          packageId: activeSession.packageId || undefined,
                          reason: reportReason,
                          description: reportDesc,
                        }),
                      });
                      if (!res.ok)
                        throw new Error(
                          (await res.json().catch(() => ({}))).error || `HTTP ${res.status}`,
                        );
                      setReportSent(true);
                    } catch (err) {
                      setReportError(err.message || "Laporan gagal terkirim. Coba lagi.");
                    } finally {
                      setReportSending(false);
                    }
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      padding: "0 0 16px",
                    }}
                  >
                    <fieldset
                      style={{
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-sm)",
                        padding: "10px 14px",
                      }}
                    >
                      <legend
                        style={{
                          fontSize: "11px",
                          fontFamily: "var(--font-mono)",
                          color: "var(--text-muted)",
                          padding: "0 4px",
                        }}
                      >
                        ALASAN LAPORAN
                      </legend>
                      {[
                        "Soal/jawaban tidak jelas atau ambigu",
                        "Kunci jawaban salah",
                        "Soal mengandung kesalahan faktual",
                        "Gambar atau formula tidak tampil dengan benar",
                        "Lainnya",
                      ].map((reason) => (
                        <label
                          key={reason}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "6px 0",
                            cursor: "pointer",
                            fontSize: "13px",
                          }}
                        >
                          <input
                            type="radio"
                            name="report-reason"
                            value={reason}
                            checked={reportReason === reason}
                            onChange={() => setReportReason(reason)}
                          />
                          {reason}
                        </label>
                      ))}
                    </fieldset>
                    <label
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        fontSize: "12px",
                        fontFamily: "var(--font-mono)",
                        color: "var(--text-muted)",
                      }}
                    >
                      KETERANGAN TAMBAHAN (OPSIONAL)
                      <textarea
                        value={reportDesc}
                        onChange={(e) => setReportDesc(e.target.value)}
                        placeholder="Jelaskan masalah lebih detail..."
                        maxLength={500}
                        rows={3}
                        style={{
                          resize: "vertical",
                          fontFamily: "var(--font-sans)",
                          fontSize: "13px",
                          padding: "8px 10px",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "var(--radius-xs)",
                          background: "var(--bg-app)",
                          color: "var(--text-primary)",
                        }}
                      />
                    </label>
                    {reportError && (
                      <p role="alert" style={{ fontSize: "12px", color: "var(--accent-crimson)" }}>
                        {reportError}
                      </p>
                    )}
                  </div>
                  <div className="modal-actions-footer">
                    <button
                      type="button"
                      className="btn-latveria-secondary font-mono"
                      onClick={() => setShowReportModal(false)}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="btn-latveria-primary font-mono"
                      disabled={!reportReason || reportSending}
                    >
                      {reportSending ? "Mengirim…" : "Kirim laporan"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            EVALUATION SUMMARY DOSSIER MODAL (OPSIONAL VIEW)
            ======================================================== */}
        {activeSession.results && (
          <PracticeResultsDialog
            open={showSummaryModal}
            subject={activeSession.subjectName}
            packageName={activeSession.packageName}
            correct={activeSession.results.correctCount}
            total={activeSession.totalQuestions}
            unanswered={activeSession.results.unansweredCount}
            earnedXP={activeSession.results.earnedXP}
            score={activeSession.results.score}
            onClose={() => setShowSummaryModal(false)}
            onExit={() => {
              setShowSummaryModal(false);
              exitPractice();
            }}
            exitLabel={reviewSession ? "Kembali ke Drill Log" : "Kembali ke Drilling"}
          />
        )}
      </div>
    );
  }

  // ========================================================
  return (
    <div className="latveria-view-container practice-catalog-view">
      <PracticeCatalog />
    </div>
  );
};
