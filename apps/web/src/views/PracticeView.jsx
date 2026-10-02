import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { History } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LatveriaSeal, LatveriaWatermark } from '../components/LatveriaSeal';
import { LatveriaCalculator } from '../components/LatveriaCalculator';
import { MathText } from '../components/math-text';
import { PageHeading } from '../components/ui/dashboard';
import { Button } from '../components/ui/button';
import { sound } from '../utils/audioFeedback';
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
  Maximize2
} from 'lucide-react';

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
    setTopics,
    refreshTopics,
    loading,
    submitting,
    submissionError
  } = useApp();
  const [reviewState, setReviewState] = useState(reviewSession ?? null);
  const activeSession = reviewSession ? reviewState : liveSession;
  const setActiveSession = reviewSession ? setReviewState : setLiveSession;
  const exitPractice = reviewSession ? onReviewExit : exitLivePractice;

  // Selection Screen State
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState('Sulit');
  const [selectedMode, setSelectedMode] = useState('Practice');
  const [questionCount, setQuestionCount] = useState(10);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Subtest Package Selection State
  const [selectedSubtest, setSelectedSubtest] = useState(null);
  const [subtestPackages, setSubtestPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);

  const handleSelectSubtest = async (subject) => {
    setSelectedSubtest(subject);
    setSelectedPackage(null);
    setLoadingPackages(true);
    try {
      const pkgs = await fetchSubtestPackages(subject.slug || subject.id);
      setSubtestPackages(pkgs);
      setTopics((prev) => prev.map((t) => (t.id === subject.id || t.slug === subject.slug) ? { ...t, packageCount: pkgs.length } : t));
    } catch {
      setSubtestPackages([]);
    } finally {
      setLoadingPackages(false);
    }
  };

  // In-Session Navigator (Mobile Sheet / Drawer)
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Calculator State
  const [showCalculator, setShowCalculator] = useState(false);

  // Submission Confirmation Modal State
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // In-Session Timer Countdown
  const [timeLeft, setTimeLeft] = useState(null);
  const [timerPaused, setTimerPaused] = useState(false);

  // Evaluation Mode: Show Full Summary Modal
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // Subject Icon Map
  const getSubjectIcon = (id) => {
    switch (id) {
      case 'PU': return Brain;
      case 'PPU': return BookOpen;
      case 'PBM': return PenTool;
      case 'PK': return Hash;
      case 'LBI': return FileText;
      case 'LBE': return Globe;
      case 'PM': return Compass;
      default: return Layers;
    }
  };

  // Timer Effect when Timed Practice is active
  useEffect(() => {
    if (!activeSession || activeSession.isEvaluated || activeSession.attemptId || activeSession.mode !== 'Timed Practice' || timerPaused || timeLeft === 0) return;

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
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      const currIdx = activeSession.currentIndex;
      const key = e.key.toUpperCase();

      // Only allow answer selection if not yet evaluated
      if (!activeSession.isEvaluated && !activeSession.attemptId && !submitting) {
        if (['A', 'B', 'C', 'D'].includes(key)) {
          selectAnswer(currIdx, key);
        } else if (['1', '2', '3', '4'].includes(key)) {
          const keyMap = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
          selectAnswer(currIdx, keyMap[key]);
        } else if (key === 'F') {
          toggleFlag(currIdx);
        }
      }

      if (e.key === 'ArrowRight' && currIdx < activeSession.totalQuestions - 1) {
        sound.playClick();
        setActiveSession((prev) => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
      } else if (e.key === 'ArrowLeft' && currIdx > 0) {
        sound.playClick();
        setActiveSession((prev) => ({ ...prev, currentIndex: prev.currentIndex - 1 }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSession]);

  // Format seconds to MM:SS
  const formatTime = (secs) => {
    if (secs === null) return '--:--';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
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
          const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
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
    const isEnglishLiteracy = activeSession.subjectId === 'LBE';

    // Calculation for progress indicators
    const answeredCount = Object.keys(activeSession.answers).filter(
      (k) => activeSession.answers[k]
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
      <div className={`latveria-view-container question-view-active ${isEvaluated ? 'mode-evaluation' : 'mode-practice'}`}>
        {/* Floating Interactive Calculator */}
        <LatveriaCalculator
          isOpen={showCalculator}
          onClose={() => setShowCalculator(false)}
          isAllowed={['PK', 'PM', 'PU'].includes(activeSession.subjectId)}
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
              title={isEvaluated ? 'Kembali ke daftar latihan' : 'Keluar dari sesi'}
            >
              <ChevronLeft size={16} />
              <span className="font-mono">{isEvaluated ? 'KEMBALI' : 'KELUAR'}</span>
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
                <span className="eval-score-val text-gold">{activeSession.results?.score || 0}/100</span>
                <span className="eval-score-divider">•</span>
                <span className="text-sage">{activeSession.results?.correctCount || 0} benar</span>
                <span className="eval-score-divider">•</span>
                <span className="text-crimson">{activeSession.results?.incorrectCount || 0} salah</span>
                {currIdx < totalQ - 1 && <button
                  type="button"
                  className="btn-open-dossier-pill font-mono"
                  onClick={() => setShowSummaryModal(true)}
                >
                  <BarChart2 size={13} />
                  <span>Ringkasan</span>
                </button>}
              </div>
            ) : activeSession.mode === 'Timed Practice' ? (
              <div className={`timer-display font-mono ${timeLeft < 120 ? 'timer-warning' : ''}`}>
                <Clock size={15} />
                <span className="time-label">Sisa waktu</span>
                <span className="time-digits">{formatTime(timeLeft)}</span>
                <button
                  type="button"
                  className="btn-timer-pause"
                  onClick={() => setTimerPaused(!timerPaused)}
                  title={timerPaused ? 'Lanjutkan Waktu' : 'Jeda Waktu'}
                >
                  {timerPaused ? 'Lanjutkan' : 'Jeda'}
                </button>
              </div>
            ) : (
              <span className="mode-display font-mono">{activeSession.mode === 'Practice' ? 'Tanpa batas waktu' : activeSession.mode === 'Review' ? 'Ulasan' : activeSession.mode}</span>
            )}
          </div>

          {/* Right: Tools (Calculator, Flag, Submit / Repeat) */}
          <div className="header-tools-group">
            <button
              type="button"
              id="btn-toggle-calc"
              className={`tool-action-btn ${showCalculator ? 'active' : ''}`}
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
                  className={`tool-action-btn ${isFlagged ? 'flagged' : ''}`}
                  onClick={() => toggleFlag(currIdx)}
                  title="Tandai soal"
                >
                  <Flag size={15} />
                  <span className="font-mono">{isFlagged ? 'Ditandai' : 'Tandai'}</span>
                </button>

                {currIdx < totalQ - 1 && <button
                  type="button"
                  id="btn-open-submit-modal"
                  className="btn-latveria-primary btn-submit-exam font-mono"
                  disabled={submitting}
                  onClick={() => setShowSubmitModal(true)}
                >
                  <span>{submitting ? 'Memproses…' : activeSession.attemptId ? 'Muat hasil' : 'Kumpulkan'}</span>
                </button>}
              </>
            ) : (
              <button
                type="button"
                className="btn-latveria-primary btn-submit-exam font-mono"
                onClick={() => {
                  if (onReviewStart) { onReviewStart(); return; }
                  sound.playClick();
                  startPractice(
                    activeSession.subjectId,
                    activeSession.mode,
                    activeSession.totalQuestions,
                    activeSession.difficulty
                  );
                }}
              >
                <RotateCcw size={14} />
                <span>{onReviewStart ? 'Latihan lagi' : 'Ulangi latihan'}</span>
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
            {activeSession.attemptId && <button type="button" className="btn-latveria-secondary" disabled={submitting} onClick={finishSession}>Muat hasil lagi</button>}
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
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
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
            <div className="question-layout-card">
              {/* Question Header & Evaluation Badge */}
              <div className="q-card-top-meta">

                {/* Status Badge in Evaluation Mode */}
                {isEvaluated ? (
                  <div className="q-eval-verdict font-mono">
                    {isCurrentCorrect && (
                      <span className="verdict-pill verdict-correct">
                        <CheckCircle2 size={15} />
                        <span>✓ JAWABAN BENAR</span>
                      </span>
                    )}
                    {!isCurrentCorrect && !isCurrentUnanswered && (
                      <span className="verdict-pill verdict-incorrect">
                        <XCircle size={15} />
                        <span>× JAWABAN SALAH</span>
                      </span>
                    )}
                    {isCurrentUnanswered && (
                      <span className="verdict-pill verdict-unanswered">
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
                      <span className="text-gold">Klik kata bergaris bawah untuk melihat arti.</span>
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
                  let stateClass = '';
                  if (!isEvaluated) {
                    if (isSelected) stateClass = 'selected';
                  } else {
                    if (isCorrectAnswer) {
                      stateClass = 'eval-correct-opt';
                    } else if (isSelected && !isCorrectAnswer) {
                      stateClass = 'eval-incorrect-opt';
                    } else {
                      stateClass = 'eval-neutral-opt';
                    }
                  }

                  return (
                    <button
                      key={option.key}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      disabled={isEvaluated || submitting || !!activeSession.attemptId}
                      className={`option-choice-card ${stateClass}`}
                      onClick={() => !isEvaluated && selectAnswer(currIdx, option.key)}
                    >
                      <div className="option-key-badge font-mono">{option.key}</div>
                      <div className="option-text-body font-sans">
                        <MathText>{option.text}</MathText>
                      </div>

                      {/* Right Tag / Indicator */}
                      {!isEvaluated ? (
                        <div className="option-radio-indicator">
                          {isSelected && <span className="radio-inner-pip" />}
                        </div>
                      ) : (
                        <div className="eval-opt-badge font-mono">
                          {isCorrectAnswer && (
                            <span className="badge-tag-correct">
                              <Check size={13} />
                              {isSelected ? 'JAWABAN ANDA (BENAR)' : 'KUNCI JAWABAN BENAR'}
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

                  {typeof currentQ.explanation === 'string' ? (
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
                                <span><MathText>{step}</MathText></span>
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

              <span className="sr-only" aria-live="polite">{isEvaluated ? (isCurrentCorrect ? 'Jawaban benar' : isCurrentUnanswered ? 'Belum dijawab' : 'Jawaban salah') : userSelectedKey ? `Jawaban ${userSelectedKey} dipilih` : 'Belum dijawab'}</span>

              {currIdx < totalQ - 1 ? (
                <button
                  type="button"
                  className="btn-latveria-primary"
                  onClick={handleNext}
                >
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

                    let tileClass = '';
                    let tileIcon = null;

                    if (!isEvaluated) {
                      // Practice Mode
                      if (isActive) tileClass += ' is-active';
                      if (ans) tileClass += ' is-answered';
                      else tileClass += ' is-unanswered';
                      if (hasFlag) tileClass += ' is-flagged';
                    } else {
                      // Evaluation Mode
                      if (isActive) tileClass += ' is-active';
                      if (!ans) {
                        tileClass += ' eval-unanswered';
                        tileIcon = '○';
                      } else if (ans === q.correctAnswer) {
                        tileClass += ' eval-correct';
                        tileIcon = '✓';
                      } else {
                        tileClass += ' eval-incorrect';
                        tileIcon = '×';
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
                        <span className="tile-num-text">{pIdx + 1 < 10 ? `0${pIdx + 1}` : pIdx + 1}</span>
                        {tileIcon && <span className="tile-eval-symbol">{tileIcon}</span>}
                        {hasFlag && <span className="tile-flag-pip" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="navigator-legend font-mono">
                {isEvaluated ? <>
                  <span className="legend-item text-sage"><span className="legend-indicator eval-c" aria-hidden="true" />Benar</span>
                  <span className="legend-item text-crimson"><span className="legend-indicator eval-i" aria-hidden="true" />Salah</span>
                  <span className="legend-item text-muted"><span className="legend-indicator eval-u" aria-hidden="true" />Kosong</span>
                </> : <>
                  <span className="legend-item"><span className="legend-indicator unans" aria-hidden="true" />Belum dijawab</span>
                  <span className="legend-item"><span className="legend-indicator ans" aria-hidden="true" />Terjawab</span>
                  <span className="legend-item"><span className="legend-indicator flag" aria-hidden="true" />Ditandai</span>
                </>}
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
                <span className="font-mono">
                  Navigasi soal
                </span>
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

                  let tileClass = '';
                  let tileIcon = null;

                  if (!isEvaluated) {
                    if (isActive) tileClass += ' is-active';
                    if (ans) tileClass += ' is-answered';
                    else tileClass += ' is-unanswered';
                    if (hasFlag) tileClass += ' is-flagged';
                  } else {
                    if (isActive) tileClass += ' is-active';
                    if (!ans) {
                      tileClass += ' eval-unanswered';
                      tileIcon = '○';
                    } else if (ans === q.correctAnswer) {
                      tileClass += ' eval-correct';
                      tileIcon = '✓';
                    } else {
                      tileClass += ' eval-incorrect';
                      tileIcon = '×';
                    }
                  }

                  return (
                    <button
                      key={pIdx}
                      type="button"
                      className={`nav-number-tile font-mono ${tileClass}`}
                      onClick={() => handleJumpToQuestion(pIdx)}
                    >
                      <span className="tile-num-text">{pIdx + 1 < 10 ? `0${pIdx + 1}` : pIdx + 1}</span>
                      {tileIcon && <span className="tile-eval-symbol">{tileIcon}</span>}
                      {hasFlag && <span className="tile-flag-pip" />}
                    </button>
                  );
                })}
              </div>

              <div className="navigator-legend font-mono" style={{ marginTop: '16px' }}>
                {!isEvaluated ? (
                  <>
                    <span className="legend-item"><span className="legend-indicator unans" /> Belum</span>
                    <span className="legend-item"><span className="legend-indicator ans" /> Terjawab</span>
                    <span className="legend-item"><span className="legend-indicator flag" /> Ditandai</span>
                  </>
                ) : (
                  <>
                    <span className="legend-item text-sage"><span className="legend-indicator eval-c" /> Benar</span>
                    <span className="legend-item text-crimson"><span className="legend-indicator eval-i" /> Salah</span>
                    <span className="legend-item text-muted"><span className="legend-indicator eval-u" /> Kosong</span>
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
          <div className="modal-backdrop" onClick={() => setShowSubmitModal(false)}>
            <div
              className="config-modal-card submit-dialog-card"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-labelledby="modal-submit-title"
            >
              <div className="modal-header">
                <h2 id="modal-submit-title" className="modal-title font-serif">Kumpulkan latihan?</h2>
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
                  <span>{submitting ? 'Memproses…' : activeSession.attemptId ? 'Muat hasil' : 'Kumpulkan'}</span>
                  <FileCheck size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            EVALUATION SUMMARY DOSSIER MODAL (OPSIONAL VIEW)
            ======================================================== */}
        {showSummaryModal && activeSession.results && (
          <div className="modal-backdrop" onClick={() => setShowSummaryModal(false)}>
            <div
              className="config-modal-card eval-summary-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2 className="modal-title font-serif">
                  Hasil latihan
                </h2>
                <p className="modal-desc text-sm text-[var(--soft-ink)]">
                  {activeSession.subjectName}{activeSession.packageName ? ` · ${activeSession.packageName}` : ''}
                </p>
              </div>

              <div className="results-metrics-grid">
                <div className="result-metric-card highlight-card">
                  <span className="card-label-mono font-mono">Skor</span>
                  <div className="card-val-row font-serif">
                    <span className="big-score">{activeSession.results.score}</span>
                    <span className="score-denom">/ 100</span>
                  </div>
                </div>

                <div className="result-metric-card">
                  <span className="card-label-mono font-mono">Benar</span>
                  <div className="card-val-row font-serif">
                    <span className="big-score text-sage">{activeSession.results.correctCount}</span>
                    <span className="score-denom">SOAL</span>
                  </div>
                </div>

                <div className="result-metric-card">
                  <span className="card-label-mono font-mono">Salah</span>
                  <div className="card-val-row font-serif">
                    <span className="big-score text-crimson">{activeSession.results.incorrectCount}</span>
                    <span className="score-denom">SALAH</span>
                  </div>
                  <span className="status-badge-mono font-mono text-muted">
                    {activeSession.results.unansweredCount} belum dijawab
                  </span>
                </div>

                {activeSession.results.earnedXP != null && <div className="result-metric-card">
                  <span className="card-label-mono font-mono">EXP diperoleh</span>
                  <div className="card-val-row font-serif">
                    <span className="big-score text-gold">+{activeSession.results.earnedXP}</span>
                    <span className="score-denom">XP</span>
                  </div>
                </div>}
              </div>

              <div className="modal-actions-footer">
                <button
                  type="button"
                  className="btn-latveria-secondary font-mono"
                  onClick={() => setShowSummaryModal(false)}
                >
                  Tutup
                </button>
                <button
                  type="button"
                  className="btn-latveria-primary font-mono"
                  onClick={() => {
                    setShowSummaryModal(false);
                    exitPractice();
                  }}
                >
                  Selesai
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========================================================
  // SCENARIO 3: PRACTICE SELECTION SCREEN (SUBTEST CATALOG & PACKAGES)
  // ========================================================
  return (
    <div className="latveria-view-container practice-catalog-view">
      <LatveriaWatermark size={380} opacity={0.03} />

      {selectedSubtest ? (
        /* Subtest Packages Selection View */
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedSubtest(null);
                setSelectedPackage(null);
                refreshTopics();
              }}
            >
              <ChevronLeft className="size-4 mr-1" />
              Semua subtes
            </Button>
          </div>

          <PageHeading
            title={selectedSubtest.name}
            description={`Pilih paket soal untuk memulai latihan subtes ${selectedSubtest.name}.`}
            actions={
              <Button asChild variant="outline">
                <Link to="/dashboard/riwayat">
                  <History className="size-4" />
                  Riwayat
                </Link>
              </Button>
            }
          />

          {loadingPackages ? (
            <div className="flex flex-col items-center justify-center p-16 text-[var(--soft-ink)]">
              <div className="size-8 animate-spin rounded-full border-2 border-[var(--emerald)] border-t-transparent mb-3" />
              <p className="font-mono text-sm">Memuat paket soal…</p>
            </div>
          ) : subtestPackages.length === 0 ? (
            <div className="border border-[var(--edge)] bg-[var(--surface)] p-12 text-center rounded-lg space-y-4">
              <p className="text-[var(--soft-ink)]">Belum ada paket soal aktif untuk subtes ini.</p>
              <Button variant="outline" onClick={() => setSelectedSubtest(null)}>
                Kembali ke daftar subtes
              </Button>
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" aria-label={`Paket soal ${selectedSubtest.name}`}>
              {subtestPackages.map((pkg) => (
                <li
                  key={pkg.id}
                  className="border border-[var(--edge)] bg-[var(--surface)] hover:border-[var(--emerald)] p-6 rounded-lg flex flex-col justify-between transition-all shadow-sm gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--gold)] font-medium border border-[var(--edge)]">
                        {pkg.questionCount} Soal
                      </span>
                      <span className="text-xs font-mono text-[var(--soft-ink)]">Paket #{pkg.order}</span>
                    </div>
                    <h3 className="font-serif text-xl font-bold text-[var(--ink)]">{pkg.name}</h3>
                    {pkg.description ? (
                      <p className="text-sm text-[var(--soft-ink)] line-clamp-3">{pkg.description}</p>
                    ) : (
                      <p className="text-sm text-[var(--soft-ink)] italic">Paket latihan terarah subtes {selectedSubtest.name}.</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[var(--edge)]">
                    <Button
                      type="button"
                      className="w-full flex items-center justify-center gap-2"
                      disabled={pkg.questionCount === 0 || loading}
                      onClick={() => {
                        setSelectedPackage(pkg);
                        setSelectedSubject(selectedSubtest.id);
                        setQuestionCount(pkg.questionCount);
                        setShowConfigModal(true);
                      }}
                    >
                      <Play size={14} fill="currentColor" />
                      <span>{pkg.questionCount === 0 ? 'Belum Ada Soal' : 'Mulai Latihan'}</span>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        /* Subtests Catalog View */
        <>
          <PageHeading
            title="Latihan"
            description="Pilih subtes SNPMB 2026 untuk melihat paket soal yang tersedia."
            actions={
              <Button asChild variant="outline">
                <Link to="/dashboard/riwayat">
                  <History className="size-4" />
                  Riwayat
                </Link>
              </Button>
            }
          />

          <ul className="subjects-grid" aria-label="Subtes latihan">
            {topics.map((subject) => {
              const Icon = getSubjectIcon(subject.id);
              const isSelected = selectedSubject === subject.id;

              return (
                <li
                  key={subject.id}
                  className={`subject-card ${isSelected ? 'active-subject' : ''}`}
                >
                  <div className="subject-card-top">
                    <div className="subject-icon-box">
                      <Icon size={22} className="text-gold" />
                    </div>
                    <div className="subject-code-tag font-mono">{subject.code}</div>
                  </div>

                  <div className="subject-card-body">
                    <span className="subject-category font-mono">{subject.category}</span>
                    <h3 className="subject-title font-serif">{subject.name}</h3>
                    <p className="subject-description">{subject.description}</p>
                  </div>

                  {/* Progress and Package/Question Metrics */}
                  <div className="subject-metrics-strip">
                    <div className="s-metric">
                      <span className="s-label font-mono">PAKET</span>
                      <span className="s-val font-serif">{subject.packageCount ?? 0}</span>
                    </div>
                    <div className="s-metric">
                      <span className="s-label font-mono">TOTAL SOAL</span>
                      <span className="s-val font-serif">{subject.questionsCount}</span>
                    </div>
                  </div>

                  <div className="subject-card-action">
                    <Button
                      type="button"
                      className="btn-latveria-primary w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectSubtest(subject);
                      }}
                    >
                      <span>Lihat Paket Soal</span>
                      <ChevronRight size={14} />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* Configuration Modal */}
      {showConfigModal && (
        <div className="modal-backdrop" onClick={() => setShowConfigModal(false)}>
          <div
            className="config-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="modal-config-title"
          >
            <div className="modal-header">
              <h2 id="modal-config-title" className="modal-title font-serif">
                {selectedSubtest?.name || topics.find((s) => s.id === selectedSubject)?.name}
              </h2>
              {selectedPackage && (
                <p className="text-sm font-mono text-[var(--gold)]">
                  {selectedPackage.name} · {selectedPackage.questionCount} Soal
                </p>
              )}
            </div>

            <div className="modal-body-form">
              {/* Mode Selection */}
              <div className="form-group">
                <label className="form-label-mono font-mono">Mode</label>
                <div className="options-pill-grid">
                  {[
                    { id: 'Practice', label: 'Bebas waktu', note: 'Tanpa batas waktu' },
                    { id: 'Timed Practice', label: 'Berwaktu', note: '90 detik per soal' },
                    { id: 'Review', label: 'Ulasan', note: 'Lihat pembahasan' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`pill-option-btn ${selectedMode === m.id ? 'active' : ''}`}
                      onClick={() => setSelectedMode(m.id)}
                    >
                      <span className="btn-main font-mono">{m.label}</span>
                      <span className="btn-sub">{m.note}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty Selection */}
              <div className="form-group">
                <label className="form-label-mono font-mono">Kesulitan</label>
                <div className="options-pill-grid cols-3">
                  {['Standar', 'Menengah', 'Sulit'].map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      className={`pill-option-btn ${selectedDifficulty === diff ? 'active' : ''}`}
                      onClick={() => setSelectedDifficulty(diff)}
                    >
                      <span className="btn-main font-mono">{diff}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-actions-footer">
              <button
                type="button"
                className="btn-latveria-secondary"
                onClick={() => setShowConfigModal(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-latveria-primary btn-gold-solid"
                disabled={loading}
                onClick={() => {
                  setShowConfigModal(false);
                  startPractice(
                    selectedSubtest?.id || selectedSubject,
                    selectedMode,
                    selectedPackage ? selectedPackage.questionCount : questionCount,
                    selectedDifficulty,
                    selectedPackage?.id
                  );
                }}
              >
                <span>{loading ? 'Memuat…' : 'Mulai latihan'}</span>
                <Play size={15} fill="currentColor" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
