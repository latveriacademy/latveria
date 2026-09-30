import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { UTBK_SUBJECTS, MOCK_QUESTIONS } from '../data/questionsData';
import { LatveriaSeal, LatveriaWatermark } from '../components/LatveriaSeal';
import { LatveriaCalculator } from '../components/LatveriaCalculator';
import { MathText } from '../components/math-text';
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

export const PracticeView = () => {
  const {
    activeSession,
    setActiveSession,
    sessionResults,
    setSessionResults,
    startPractice,
    selectAnswer,
    toggleFlag,
    finishSession,
    exitPractice,
    openLexicon
  } = useApp();

  // Selection Screen State
  const [selectedSubject, setSelectedSubject] = useState('PU');
  const [selectedDifficulty, setSelectedDifficulty] = useState('Latverian Elite');
  const [selectedMode, setSelectedMode] = useState('Practice');
  const [questionCount, setQuestionCount] = useState(10);
  const [showConfigModal, setShowConfigModal] = useState(false);

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
    if (!activeSession || activeSession.isEvaluated || activeSession.mode !== 'Timed Practice' || timerPaused) return;

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
      if (!activeSession.isEvaluated) {
        if (['A', 'B', 'C', 'D', 'E'].includes(key)) {
          selectAnswer(currIdx, key);
        } else if (['1', '2', '3', '4', '5'].includes(key)) {
          const keyMap = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E' };
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
              onClick={exitPractice}
              title={isEvaluated ? 'Kembali ke Repository' : 'Batalkan Sesi Latihan'}
            >
              <ChevronLeft size={16} />
              <span className="font-mono">{isEvaluated ? 'KELUAR' : 'ABORT'}</span>
            </button>
            <div className="subtest-badge-box">
              <span className="subtest-code font-mono">{activeSession.subjectCode}</span>
              <span className="subtest-name font-serif">{activeSession.subjectName}</span>
              <span className={`status-mode-pill font-mono ${isEvaluated ? 'pill-evaluated' : 'pill-active'}`}>
                {isEvaluated ? 'EVALUATION RECORD' : activeSession.difficulty}
              </span>
            </div>
          </div>

          {/* Center: Timer or Evaluation Score Summary */}
          <div className="header-center-info">
            {isEvaluated ? (
              <div className="eval-quick-score font-mono">
                <span className="eval-score-label">SKOR HASIL:</span>
                <span className="eval-score-val text-gold">{activeSession.results?.score || 0}/100</span>
                <span className="eval-score-divider">•</span>
                <span className="text-sage">{activeSession.results?.correctCount || 0} BENAR</span>
                <span className="eval-score-divider">•</span>
                <span className="text-crimson">{activeSession.results?.incorrectCount || 0} SALAH</span>
                <button
                  type="button"
                  className="btn-open-dossier-pill font-mono"
                  onClick={() => setShowSummaryModal(true)}
                >
                  <BarChart2 size={13} />
                  <span>DOSSIER</span>
                </button>
              </div>
            ) : activeSession.mode === 'Timed Practice' ? (
              <div className={`timer-display font-mono ${timeLeft < 120 ? 'timer-warning' : ''}`}>
                <Clock size={15} />
                <span className="time-label">SISA WAKTU:</span>
                <span className="time-digits">{formatTime(timeLeft)}</span>
                <button
                  type="button"
                  className="btn-timer-pause"
                  onClick={() => setTimerPaused(!timerPaused)}
                  title={timerPaused ? 'Lanjutkan Waktu' : 'Jeda Waktu'}
                >
                  {timerPaused ? 'RESUME' : 'PAUSE'}
                </button>
              </div>
            ) : (
              <div className="mode-display font-mono">
                <span className="mode-dot" />
                <span>PRACTICE MODE (UNTIMED)</span>
              </div>
            )}
          </div>

          {/* Right: Tools (Calculator, Flag, Submit / Repeat) */}
          <div className="header-tools-group">
            <button
              type="button"
              id="btn-toggle-calc"
              className={`tool-action-btn ${showCalculator ? 'active' : ''}`}
              onClick={() => setShowCalculator(!showCalculator)}
              title="Kalkulator Akademik Latveria"
            >
              <Calculator size={15} />
              <span className="font-mono">CALC</span>
            </button>

            {!isEvaluated ? (
              <>
                <button
                  type="button"
                  id="btn-flag-question"
                  className={`tool-action-btn ${isFlagged ? 'flagged' : ''}`}
                  onClick={() => toggleFlag(currIdx)}
                  title="Tandai Soal untuk Ditinjau"
                >
                  <Flag size={15} />
                  <span className="font-mono">{isFlagged ? 'FLAGGED' : 'FLAG'}</span>
                </button>

                <button
                  type="button"
                  id="btn-open-submit-modal"
                  className="btn-latveria-primary btn-submit-exam font-mono"
                  onClick={() => setShowSubmitModal(true)}
                >
                  <span>SUBMIT QUIZ</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn-latveria-primary btn-submit-exam font-mono"
                onClick={() => {
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
                <span>ULANGI SESI</span>
              </button>
            )}

            {/* Mobile Sheet Trigger */}
            <button
              type="button"
              className="btn-mobile-nav-toggle font-mono"
              onClick={() => setMobileNavOpen(true)}
              title="Buka Question Navigator"
            >
              <Layers size={15} />
              <span>MAP</span>
            </button>
          </div>
        </header>

        {/* ========================================================
            SUB-HEADER STRIP: PROGRESS BAR & COUNTER
            ======================================================== */}
        <div className="quiz-progress-strip">
          <div className="progress-info-left font-mono">
            <span className="prog-step text-gold">
              QUESTION {currIdx + 1 < 10 ? `0${currIdx + 1}` : currIdx + 1}
            </span>
            <span className="prog-total text-muted"> / {totalQ < 10 ? `0${totalQ}` : totalQ}</span>
            <span className="prog-sep">•</span>
            <span className="prog-answered text-secondary">
              {isEvaluated
                ? `EVALUASI PERTANYAAN KE-${currIdx + 1}`
                : `ANSWERED: ${answeredCount < 10 ? `0${answeredCount}` : answeredCount} / ${totalQ}`}
            </span>
          </div>

          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
          </div>

          {isEnglishLiteracy && (
            <div
              className="lexicon-helper-pill font-mono"
              onClick={() => openLexicon('sovereignty')}
              title="Klik untuk membuka glosarium interaktif"
            >
              <Globe size={13} className="text-gold" />
              <span>LEXICON ACTIVE</span>
            </div>
          )}
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
                <div className="q-index-stamp font-mono">
                  <span className="q-title-bold">
                    SOAL {currIdx + 1 < 10 ? `0${currIdx + 1}` : currIdx + 1}
                  </span>
                  <span className="meta-sep">//</span>
                  <span className="text-muted">{activeSession.subjectName}</span>
                </div>

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

              {/* In Evaluation Mode: Answer Comparison Banner */}
              {isEvaluated && (
                <div className="eval-answer-comparison-banner font-mono">
                  <div className="ans-compare-col">
                    <span className="ans-col-label">YOUR ANSWER</span>
                    <span className={`ans-col-value ${isCurrentCorrect ? 'text-sage' : isCurrentUnanswered ? 'text-muted' : 'text-crimson'}`}>
                      {userSelectedKey ? (
                        <>
                          {userSelectedKey}. <MathText>{currentQ.options.find(o => o.key === userSelectedKey)?.text}</MathText>
                        </>
                      ) : '(Tidak Dijawab)'}
                    </span>
                  </div>
                  <div className="ans-compare-divider" />
                  <div className="ans-compare-col">
                    <span className="ans-col-label">CORRECT ANSWER</span>
                    <span className="ans-col-value text-sage">
                      {currentQ.correctAnswer}. <MathText>{currentQ.options.find(o => o.key === currentQ.correctAnswer)?.text}</MathText>
                    </span>
                  </div>
                </div>
              )}

              {/* Passage Excerpt (if present) */}
              {currentQ.passage && (
                <section className="passage-section">
                  <div className="passage-label font-mono">
                    <span>ACADEMIC EXCERPT // TEKS RUJUKAN</span>
                    {isEnglishLiteracy && (
                      <span className="text-gold">✦ Interaktif: Klik kata bergaris bawah</span>
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
                      disabled={isEvaluated}
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
                    <span>LATVERIA ACADEMIC ANNOTATION // PEMBAHASAN RESMI</span>
                  </div>

                  {typeof currentQ.explanation === 'string' ? (
                    <div className="explanation-section">
                      <div className="sec-label font-mono">PENJELASAN SOAL</div>
                      <p className="sec-body font-serif">
                        <MathText>{currentQ.explanation}</MathText>
                      </p>
                    </div>
                  ) : currentQ.explanation ? (
                    <>
                      {/* Konsep Utama */}
                      {currentQ.explanation.concept && (
                        <div className="explanation-section">
                          <div className="sec-label font-mono">KONSEP UTAMA YANG DIGUNAKAN</div>
                          <p className="sec-body font-serif">
                            <MathText>{currentQ.explanation.concept}</MathText>
                          </p>
                        </div>
                      )}

                      {/* Langkah Penyelesaian Terstruktur */}
                      {Array.isArray(currentQ.explanation.stepByStep) && (
                        <div className="explanation-section">
                          <div className="sec-label font-mono">LANGKAH PENYELESAIAN TERSTRUKTUR</div>
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

                      {/* Mengapa Jawaban Ini Tepat */}
                      {currentQ.explanation.whyCorrect && (
                        <div className="explanation-section">
                          <div className="sec-label font-mono text-sage">MENGAPA JAWABAN INI TEPAT</div>
                          <p className="sec-body font-serif text-sage-dim">
                            <MathText>{currentQ.explanation.whyCorrect}</MathText>
                          </p>
                        </div>
                      )}

                      {/* Distraktor & Jebakan */}
                      {currentQ.explanation.pitfall && (
                        <div className="explanation-section pitfall-sec">
                          <div className="sec-label font-mono text-crimson">ANALISIS DISTRAKTOR & JEBAKAN UMUM</div>
                          <p className="sec-body font-serif text-crimson-dim">
                            <MathText>{currentQ.explanation.pitfall}</MathText>
                          </p>
                        </div>
                      )}
                    </>
                  ) : null}

                  {/* Catatan Akademik Tambahan */}
                  <div className="explanation-section notes-sec">
                    <div className="sec-label font-mono text-gold">CATATAN AKADEMIK // LATVERIA EXAMINATION TIP</div>
                    <p className="sec-body font-sans text-secondary">
                      Pemahaman menyeluruh atas pola distractor dan identifikasi premis utama merupakan kunci efisiensi waktu pada subtes {activeSession.subjectName}.
                    </p>
                  </div>
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

              <div className="answered-status-mono font-mono">
                {isEvaluated ? (
                  <span>
                    STATUS: {isCurrentCorrect ? 'BENAR ✓' : isCurrentUnanswered ? 'TIDAK DIJAWAB ○' : 'SALAH ×'}
                  </span>
                ) : (
                  <span>STATUS: {userSelectedKey ? `TERJAWAB (${userSelectedKey})` : 'BELUM DIJAWAB'}</span>
                )}
              </div>

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
                  onClick={() => setShowSubmitModal(true)}
                >
                  <span>SELESAIKAN TES</span>
                  <Award size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-latveria-primary btn-gold-solid"
                  onClick={() => setShowSummaryModal(true)}
                >
                  <span>LIHAT DOSSIER HASIL</span>
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
                  <span className="nav-title">
                    {isEvaluated ? 'EVALUATION MAP' : 'QUESTION NAVIGATOR'}
                  </span>
                </div>
                <span className="nav-stats-count font-mono">
                  {isEvaluated
                    ? `${activeSession.results?.correctCount || 0}/${totalQ} BENAR`
                    : `${answeredCount}/${totalQ} TERJAWAB`}
                </span>
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

              {/* Legend Visual Strip */}
              <div className="navigator-legend font-mono">
                {!isEvaluated ? (
                  <>
                    <span className="legend-item">
                      <span className="legend-indicator unans" /> Belum dijawab
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
                      <span className="legend-indicator eval-c" /> Benar (✓)
                    </span>
                    <span className="legend-item text-crimson">
                      <span className="legend-indicator eval-i" /> Salah (×)
                    </span>
                    <span className="legend-item text-muted">
                      <span className="legend-indicator eval-u" /> Kosong (○)
                    </span>
                  </>
                )}
              </div>

              {/* Bottom Quick Tools inside Navigator */}
              <div className="navigator-tools-panel">
                <button
                  type="button"
                  className="btn-tool-outline font-mono w-full"
                  onClick={() => setShowCalculator(!showCalculator)}
                >
                  <Calculator size={14} />
                  <span>{showCalculator ? 'TUTUP KALKULATOR' : 'BUKA KALKULATOR'}</span>
                </button>

                {!isEvaluated ? (
                  <button
                    type="button"
                    className="btn-latveria-primary btn-gold-solid font-mono w-full"
                    onClick={() => setShowSubmitModal(true)}
                  >
                    <FileCheck size={15} />
                    <span>SUBMIT QUIZ</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-latveria-secondary font-mono w-full"
                    onClick={exitPractice}
                  >
                    <span>KEMBALI KE REPOSITORY</span>
                  </button>
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
                <span className="font-mono">
                  {isEvaluated ? 'EVALUATION MAP // DAFTAR HASIL' : 'QUESTION NAVIGATOR // PALET SOAL'}
                </span>
                <button
                  type="button"
                  className="close-palette-btn font-mono"
                  onClick={() => setMobileNavOpen(false)}
                >
                  TUTUP [✕]
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
                <div className="modal-stamp-mono font-mono">
                  <span className="dot-stamp" />
                  <span>LATVERIA ACADEMIC EXAMINATION PROTOCOL</span>
                </div>
                <h2 id="modal-submit-title" className="modal-title font-serif">
                  Apakah kamu yakin ingin mengakhiri sesi?
                </h2>
                <p className="modal-desc">
                  Seluruh lembar pengerjaan akan dikunci dan dievaluasi secara otomatis ke dalam rekam jejak akademik.
                </p>
              </div>

              {/* Statistics Strip */}
              <div className="submit-summary-quad font-mono">
                <div className="sum-quad-tile">
                  <span className="s-label">TOTAL SOAL</span>
                  <span className="s-val text-primary">{totalQ} Questions</span>
                </div>
                <div className="sum-quad-tile">
                  <span className="s-label">TERJAWAB</span>
                  <span className="s-val text-sage">{answeredCount} Answered</span>
                </div>
                <div className="sum-quad-tile">
                  <span className="s-label">BELUM DIJAWAB</span>
                  <span className="s-val text-crimson">{unansweredCount} Unanswered</span>
                </div>
              </div>

              <div className="modal-actions-footer">
                <button
                  type="button"
                  className="btn-latveria-secondary font-mono"
                  onClick={() => setShowSubmitModal(false)}
                >
                  LANJUTKAN PENGERJAAN
                </button>
                <button
                  type="button"
                  className="btn-latveria-primary btn-gold-solid font-mono"
                  onClick={() => {
                    setShowSubmitModal(false);
                    finishSession();
                  }}
                >
                  <span>SUBMIT QUIZ & EVALUASI</span>
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
                <div className="modal-stamp-mono font-mono">
                  <span className="dot-stamp" />
                  <span>OFFICIAL DOSSIER RECORD // LATVERIA ACADEMY</span>
                </div>
                <h2 className="modal-title font-serif">
                  Ringkasan Evaluasi: {activeSession.subjectName}
                </h2>
              </div>

              <div className="results-metrics-grid">
                <div className="result-metric-card highlight-card">
                  <span className="card-label-mono font-mono">STANDARDIZED SCORE</span>
                  <div className="card-val-row font-serif">
                    <span className="big-score">{activeSession.results.score}</span>
                    <span className="score-denom">/ 100</span>
                  </div>
                  <span className="status-badge-mono font-mono text-sage">
                    AKURASI {activeSession.results.accuracy}%
                  </span>
                </div>

                <div className="result-metric-card">
                  <span className="card-label-mono font-mono">BENAR</span>
                  <div className="card-val-row font-serif">
                    <span className="big-score text-sage">{activeSession.results.correctCount}</span>
                    <span className="score-denom">SOAL</span>
                  </div>
                  <span className="status-badge-mono font-mono">TERVERIFIKASI</span>
                </div>

                <div className="result-metric-card">
                  <span className="card-label-mono font-mono">SALAH & LEWAT</span>
                  <div className="card-val-row font-serif">
                    <span className="big-score text-crimson">{activeSession.results.incorrectCount}</span>
                    <span className="score-denom">SALAH</span>
                  </div>
                  <span className="status-badge-mono font-mono text-muted">
                    {activeSession.results.unansweredCount} TIDAK DIJAWAB
                  </span>
                </div>

                <div className="result-metric-card">
                  <span className="card-label-mono font-mono">IMPERIAL XP GAINED</span>
                  <div className="card-val-row font-serif">
                    <span className="big-score text-gold">+{activeSession.results.earnedXP}</span>
                    <span className="score-denom">XP</span>
                  </div>
                  <span className="status-badge-mono font-mono text-gold">RECORD COMMITTED</span>
                </div>
              </div>

              <div className="modal-actions-footer">
                <button
                  type="button"
                  className="btn-latveria-secondary font-mono"
                  onClick={() => setShowSummaryModal(false)}
                >
                  TUTUP & BACA PEMBAHASAN
                </button>
                <button
                  type="button"
                  className="btn-latveria-primary font-mono"
                  onClick={() => {
                    setShowSummaryModal(false);
                    exitPractice();
                  }}
                >
                  SELESAI KE DASHBOARD
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========================================================
  // SCENARIO 3: PRACTICE SELECTION SCREEN (CATALOG OF 7 SUBTESTS)
  // ========================================================
  return (
    <div className="latveria-view-container practice-catalog-view">
      <LatveriaWatermark size={380} opacity={0.03} />

      {/* Catalog Header */}
      <section className="catalog-header-card">
        <div className="catalog-eyebrow font-mono">
          <span className="dot-stamp" />
          <span>CURRICULUM ARCHIVE // SNBT-UTBK BLUEPRINT</span>
        </div>
        <h1 className="catalog-title font-serif">PRACTICE REPOSITORY</h1>
        <p className="catalog-subtitle">
          Pusat pelatihan terstandar dengan 7 domain subtes resmi. Dilengkapi Question Navigator terpadu, kalkulator analitik, serta evaluasi komprehensif per nomor soal.
        </p>
      </section>

      {/* Subject Cards Grid */}
      <div className="subjects-grid">
        {UTBK_SUBJECTS.map((subject) => {
          const Icon = getSubjectIcon(subject.id);
          const isSelected = selectedSubject === subject.id;

          return (
            <div
              key={subject.id}
              className={`subject-card ${isSelected ? 'active-subject' : ''}`}
              onClick={() => setSelectedSubject(subject.id)}
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

              {/* Progress and Accuracy Metrics */}
              <div className="subject-metrics-strip">
                <div className="s-metric">
                  <span className="s-label font-mono">PROGRESS</span>
                  <span className="s-val font-serif">{subject.progress}%</span>
                </div>
                <div className="s-metric">
                  <span className="s-label font-mono">ACCURACY</span>
                  <span className="s-val font-serif text-sage">{subject.accuracy}%</span>
                </div>
                <div className="s-metric">
                  <span className="s-label font-mono">COMPLETED</span>
                  <span className="s-val font-serif">{subject.questionsCount} Q</span>
                </div>
              </div>

              <div className="subject-card-action">
                <button
                  type="button"
                  className="btn-latveria-primary w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSubject(subject.id);
                    setShowConfigModal(true);
                  }}
                >
                  <Play size={14} fill="currentColor" />
                  <span>START PRACTICE</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

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
              <div className="modal-stamp-mono font-mono">
                <span className="dot-stamp" />
                <span>SESSION CONFIGURATION PROTOCOL</span>
              </div>
              <h2 id="modal-config-title" className="modal-title font-serif">
                Konfigurasi Latihan: {UTBK_SUBJECTS.find((s) => s.id === selectedSubject)?.name}
              </h2>
            </div>

            <div className="modal-body-form">
              {/* Mode Selection */}
              <div className="form-group">
                <label className="form-label-mono font-mono">PILIH MODE LATIHAN</label>
                <div className="options-pill-grid">
                  {[
                    { id: 'Practice', label: 'Practice Mode', note: 'Bebas waktu, reflektif' },
                    { id: 'Timed Practice', label: 'Timed Practice', note: 'Simulasi waktu UTBK (90s/soal)' },
                    { id: 'Review', label: 'Review Mode', note: 'Eksplorasi konsep dan pembahasan' }
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
                <label className="form-label-mono font-mono">TINGKAT KESULITAN</label>
                <div className="options-pill-grid cols-3">
                  {['Standar', 'Menengah', 'Latverian Elite'].map((diff) => (
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

              {/* Question Count Selection */}
              <div className="form-group">
                <label className="form-label-mono font-mono">JUMLAH SOAL DALAM SESI</label>
                <div className="options-pill-grid cols-3">
                  {[5, 10, 20].map((count) => (
                    <button
                      key={count}
                      type="button"
                      className={`pill-option-btn ${questionCount === count ? 'active' : ''}`}
                      onClick={() => setQuestionCount(count)}
                    >
                      <span className="btn-main font-mono">{count} SOAL</span>
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
                BATALKAN
              </button>
              <button
                type="button"
                className="btn-latveria-primary btn-gold-solid"
                onClick={() => {
                  setShowConfigModal(false);
                  startPractice(selectedSubject, selectedMode, questionCount, selectedDifficulty);
                }}
              >
                <span>MULAI SESI LATIHAN</span>
                <Play size={15} fill="currentColor" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
