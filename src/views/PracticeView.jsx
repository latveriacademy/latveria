import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { UTBK_SUBJECTS, MOCK_QUESTIONS } from '../data/questionsData';
import { LatveriaSeal, LatveriaWatermark } from '../components/LatveriaSeal';
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
  Globe
} from 'lucide-react';

export const PracticeView = () => {
  const {
    activeSession,
    setActiveSession,
    sessionResults,
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
  const [selectedMode, setSelectedMode] = useState('Practice'); // 'Practice' | 'Timed Practice' | 'Review'
  const [questionCount, setQuestionCount] = useState(10);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // In-Session Palette Drawer State
  const [paletteOpen, setPaletteOpen] = useState(false);

  // In-Session Timer Countdown
  const [timeLeft, setTimeLeft] = useState(null);
  const [timerPaused, setTimerPaused] = useState(false);

  // Review Filter State
  const [reviewFilter, setReviewFilter] = useState('all'); // 'all' | 'correct' | 'incorrect' | 'flagged'

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
    if (!activeSession || activeSession.mode !== 'Timed Practice' || timerPaused) return;

    if (timeLeft === null) {
      setTimeLeft(activeSession.totalQuestions * 90); // 90s per question
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
      // Ignore if typing in input
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      const currIdx = activeSession.currentIndex;
      const key = e.key.toUpperCase();

      if (['A', 'B', 'C', 'D', 'E'].includes(key)) {
        selectAnswer(currIdx, key);
      } else if (['1', '2', '3', '4', '5'].includes(key)) {
        const keyMap = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E' };
        selectAnswer(currIdx, keyMap[key]);
      } else if (e.key === 'ArrowRight' && currIdx < activeSession.totalQuestions - 1) {
        sound.playClick();
        setActiveSession((prev) => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
      } else if (e.key === 'ArrowLeft' && currIdx > 0) {
        sound.playClick();
        setActiveSession((prev) => ({ ...prev, currentIndex: prev.currentIndex - 1 }));
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFlag(currIdx);
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

    // Split passage by words while preserving punctuation
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
  // SCENARIO 1: PRACTICE RESULTS SUMMARY & REVIEW
  // ========================================================
  if (sessionResults) {
    const isPassing = sessionResults.accuracy >= 75;

    return (
      <div className="latveria-view-container practice-results-view">
        <LatveriaWatermark size={360} opacity={0.03} />

        <div className="results-header-banner">
          <div className="results-eyebrow font-mono">
            <span className="dot-stamp" />
            <span>SESSION SUMMARY // IMPERIAL ACADEMIC RECORD</span>
          </div>
          <h1 className="results-headline font-serif">PRACTICE COMPLETE</h1>
          <p className="results-sub">
            Data evaluasi sesi {sessionResults.subjectName} telah terenkripsi dan dicatat ke dalam dossier akademik Latveria Anda.
          </p>
        </div>

        {/* Score & Evaluation Quad Cards */}
        <div className="results-metrics-grid">
          <div className="result-metric-card highlight-card">
            <span className="card-label-mono font-mono">STANDARDIZED SCORE</span>
            <div className="card-val-row font-serif">
              <span className="big-score">{sessionResults.score}</span>
              <span className="score-denom">/ 100</span>
            </div>
            <span className={`status-badge-mono font-mono ${isPassing ? 'text-sage' : 'text-crimson'}`}>
              {isPassing ? 'DISTINCTION MERIT' : 'REMEDIAL RECOMMENDED'}
            </span>
          </div>

          <div className="result-metric-card">
            <span className="card-label-mono font-mono">ACCURACY RATE</span>
            <div className="card-val-row font-serif">
              <span className="big-score text-sage">{sessionResults.accuracy}%</span>
            </div>
            <span className="status-badge-mono font-mono">
              {sessionResults.correctCount} DARI {sessionResults.totalQuestions} BENAR
            </span>
          </div>

          <div className="result-metric-card">
            <span className="card-label-mono font-mono">IMPERIAL XP REWARD</span>
            <div className="card-val-row font-serif">
              <span className="big-score text-gold">+{sessionResults.earnedXP}</span>
              <span className="score-denom">XP</span>
            </div>
            <span className="status-badge-mono font-mono text-gold">COMMITTED TO DOSSIER</span>
          </div>

          <div className="result-metric-card">
            <span className="card-label-mono font-mono">BREAKDOWN HASIL</span>
            <div className="breakdown-stat-list font-mono">
              <div className="b-row text-sage">
                <span>BENAR:</span>
                <span>{sessionResults.correctCount} SOAL</span>
              </div>
              <div className="b-row text-crimson">
                <span>SALAH:</span>
                <span>{sessionResults.incorrectCount} SOAL</span>
              </div>
              <div className="b-row text-muted">
                <span>LEWAT:</span>
                <span>{sessionResults.unansweredCount} SOAL</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="results-cta-bar">
          <button
            type="button"
            className="btn-latveria-secondary"
            onClick={exitPractice}
          >
            <ChevronLeft size={16} />
            <span>KEMBALI KE DASHBOARD</span>
          </button>

          <button
            type="button"
            className="btn-latveria-primary"
            onClick={() => {
              sound.playClick();
              startPractice(sessionResults.subjectId, sessionResults.mode, sessionResults.totalQuestions, sessionResults.difficulty);
            }}
          >
            <RotateCcw size={16} />
            <span>ULANGI SESI LATIHAN</span>
          </button>
        </div>

        {/* Academic Annotation Review Section */}
        <section className="results-review-section">
          <div className="review-section-header">
            <div className="review-header-left">
              <span className="panel-eyebrow font-mono">EXPLANATORY ANNOTATIONS</span>
              <h2 className="panel-title font-serif">PEMBAHASAN AKADEMIK MENDALAM</h2>
            </div>

            {/* Filter buttons */}
            <div className="review-filter-group font-mono">
              <button
                type="button"
                className={`filter-btn ${reviewFilter === 'all' ? 'active' : ''}`}
                onClick={() => setReviewFilter('all')}
              >
                SEMUA ({sessionResults.totalQuestions})
              </button>
              <button
                type="button"
                className={`filter-btn ${reviewFilter === 'correct' ? 'active' : ''}`}
                onClick={() => setReviewFilter('correct')}
              >
                BENAR ({sessionResults.correctCount})
              </button>
              <button
                type="button"
                className={`filter-btn ${reviewFilter === 'incorrect' ? 'active' : ''}`}
                onClick={() => setReviewFilter('incorrect')}
              >
                SALAH ({sessionResults.incorrectCount})
              </button>
            </div>
          </div>

          <div className="review-questions-list">
            {sessionResults.questions.map((q, idx) => {
              const userAns = sessionResults.answers[idx];
              const isCorrect = userAns === q.correctAnswer;
              const isUnanswered = !userAns;

              if (reviewFilter === 'correct' && !isCorrect) return null;
              if (reviewFilter === 'incorrect' && (isCorrect || isUnanswered)) return null;

              return (
                <article key={idx} className="review-question-card">
                  <div className="review-q-header">
                    <div className="q-number-box font-mono">
                      <span>SOAL {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}</span>
                      <span className="meta-dot">•</span>
                      <span className="text-muted">{q.subject}</span>
                    </div>

                    <div className="q-status-badge font-mono">
                      {isCorrect && (
                        <span className="badge-correct">
                          <CheckCircle2 size={15} />
                          CORRECT
                        </span>
                      )}
                      {!isCorrect && !isUnanswered && (
                        <span className="badge-incorrect">
                          <XCircle size={15} />
                          INCORRECT
                        </span>
                      )}
                      {isUnanswered && (
                        <span className="badge-unanswered">
                          <AlertTriangle size={15} />
                          UNANSWERED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Passage */}
                  {q.passage && (
                    <div className="review-passage-box">
                      <div className="passage-label font-mono">ACADEMIC EXCERPT // TEKS BACAAN</div>
                      <div className="font-serif passage-text">{q.passage}</div>
                    </div>
                  )}

                  {/* Question Prompt */}
                  <h3 className="review-q-prompt font-serif">{q.question}</h3>

                  {/* Options Comparison */}
                  <div className="review-options-grid">
                    {q.options.map((opt) => {
                      const isSelected = userAns === opt.key;
                      const isExpected = q.correctAnswer === opt.key;

                      let stateClass = '';
                      if (isExpected) stateClass = 'is-expected';
                      if (isSelected && !isExpected) stateClass = 'is-wrong-selection';

                      return (
                        <div key={opt.key} className={`review-option-tile ${stateClass}`}>
                          <div className="opt-key-cell font-mono">{opt.key}</div>
                          <div className="opt-text-cell font-sans">{opt.text}</div>
                          <div className="opt-status-cell font-mono">
                            {isExpected && <span className="tag-expected">EXPECTED ANSWER</span>}
                            {isSelected && !isExpected && <span className="tag-user-ans">YOUR ANSWER</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Academic Explanation Box */}
                  <div className="academic-explanation-dossier">
                    <div className="explanation-title font-mono">
                      <BookMarked size={16} className="text-gold" />
                      <span>LATVERIA ACADEMIC ANNOTATION // PEMBAHASAN RESMI</span>
                    </div>

                    <div className="explanation-section">
                      <div className="sec-label font-mono">KONSEP UTAMA</div>
                      <p className="sec-body font-serif">{q.explanation.concept}</p>
                    </div>

                    <div className="explanation-section">
                      <div className="sec-label font-mono">LANGKAH PENYELESAIAN TERSTRUKTUR</div>
                      <ul className="step-list font-sans">
                        {q.explanation.stepByStep.map((step, sIdx) => (
                          <li key={sIdx}>
                            <span className="step-num font-mono">{sIdx + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="explanation-section">
                      <div className="sec-label font-mono text-sage">MENGAPA JAWABAN INI TEPAT</div>
                      <p className="sec-body font-serif text-sage-dim">{q.explanation.whyCorrect}</p>
                    </div>

                    {q.explanation.pitfall && (
                      <div className="explanation-section pitfall-sec">
                        <div className="sec-label font-mono text-crimson">ANALISIS DISTRAKTOR & JEBAKAN UMUM</div>
                        <p className="sec-body font-serif text-crimson-dim">{q.explanation.pitfall}</p>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  // ========================================================
  // SCENARIO 2: ACTIVE QUESTION INTERFACE (IN SESSION)
  // ========================================================
  if (activeSession) {
    const currIdx = activeSession.currentIndex;
    const currentQ = activeSession.questions[currIdx];
    const totalQ = activeSession.totalQuestions;
    const selectedAns = activeSession.answers[currIdx];
    const isFlagged = !!activeSession.flagged[currIdx];
    const isEnglishLiteracy = activeSession.subjectId === 'LBE';

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

    return (
      <div className="latveria-view-container question-view-active">
        {/* Distraction-Free Header Bar */}
        <header className="question-header-bar">
          <div className="header-subtest-info">
            <button
              type="button"
              className="btn-exit-minimal"
              onClick={exitPractice}
              title="Keluar dari sesi"
            >
              <ChevronLeft size={18} />
              <span className="font-mono">ABORT</span>
            </button>
            <div className="subtest-badge-box">
              <span className="subtest-code font-mono">{activeSession.subjectCode}</span>
              <span className="subtest-name font-serif">{activeSession.subjectName}</span>
              <span className="difficulty-pill font-mono">{activeSession.difficulty}</span>
            </div>
          </div>

          {/* Center: Timer & Mode */}
          <div className="header-timer-box">
            {activeSession.mode === 'Timed Practice' ? (
              <div className={`timer-display font-mono ${timeLeft < 120 ? 'timer-warning' : ''}`}>
                <Clock size={16} />
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

          {/* Right: Question Palette Drawer & Flag */}
          <div className="header-tools-group">
            <button
              type="button"
              id="btn-flag-question"
              className={`tool-action-btn ${isFlagged ? 'flagged' : ''}`}
              onClick={() => toggleFlag(currIdx)}
              title="Tandai Soal untuk Ditinjau"
            >
              <Flag size={16} />
              <span className="font-mono">{isFlagged ? 'FLAGGED' : 'FLAG'}</span>
            </button>

            <button
              type="button"
              id="btn-open-palette"
              className="tool-action-btn palette-toggle"
              onClick={() => setPaletteOpen(!paletteOpen)}
              title="Navigasi Butir Soal"
            >
              <Layers size={16} />
              <span className="font-mono">PALETTE</span>
            </button>

            <button
              type="button"
              id="btn-submit-session"
              className="btn-latveria-primary btn-submit-exam font-mono"
              onClick={finishSession}
            >
              <span>SUBMIT SESSION</span>
            </button>
          </div>
        </header>

        {/* Question Palette Drawer Modal */}
        {paletteOpen && (
          <div className="palette-drawer-overlay" onClick={() => setPaletteOpen(false)}>
            <div className="palette-drawer" onClick={(e) => e.stopPropagation()}>
              <div className="palette-head">
                <span className="font-mono">QUESTION NAVIGATOR // PALET SOAL</span>
                <button
                  type="button"
                  className="close-palette-btn font-mono"
                  onClick={() => setPaletteOpen(false)}
                >
                  TUTUP [ESC]
                </button>
              </div>
              <div className="palette-grid">
                {activeSession.questions.map((_, pIdx) => {
                  const hasAnswer = !!activeSession.answers[pIdx];
                  const hasFlag = !!activeSession.flagged[pIdx];
                  const isCurrent = pIdx === currIdx;

                  return (
                    <button
                      key={pIdx}
                      type="button"
                      className={`palette-tile font-mono ${isCurrent ? 'current' : ''} ${hasAnswer ? 'answered' : ''} ${hasFlag ? 'flagged' : ''}`}
                      onClick={() => {
                        sound.playClick();
                        setActiveSession((prev) => ({ ...prev, currentIndex: pIdx }));
                        setPaletteOpen(false);
                      }}
                    >
                      <span>{pIdx + 1 < 10 ? `0${pIdx + 1}` : pIdx + 1}</span>
                      {hasFlag && <span className="tile-flag-pip" />}
                    </button>
                  );
                })}
              </div>
              <div className="palette-legend font-mono">
                <span className="legend-item"><span className="legend-dot answered" /> Terjawab</span>
                <span className="legend-item"><span className="legend-dot flagged" /> Ditandai</span>
                <span className="legend-item"><span className="legend-dot current" /> Aktif</span>
              </div>
            </div>
          </div>
        )}

        {/* Main Question Arena */}
        <main className="question-arena-container">
          <div className="question-meta-strip">
            <div className="q-progress-indicator font-mono">
              <span className="text-gold font-bold">SOAL {currIdx + 1 < 10 ? `0${currIdx + 1}` : currIdx + 1}</span>
              <span className="text-muted"> / {totalQ < 10 ? `0${totalQ}` : totalQ}</span>
            </div>

            {isEnglishLiteracy && (
              <div className="lexicon-helper-pill font-mono" onClick={() => openLexicon('sovereignty')}>
                <Globe size={13} className="text-gold" />
                <span>LATVERIAN LEXICON ACTIVE (KLIK KATA DALAM TEKS UNTUK DEFINISI)</span>
              </div>
            )}

            <div className="q-shortcuts-helper font-mono">
              PILIHAN: [A - E] ATAU [1 - 5]
            </div>
          </div>

          <div className="question-layout-card">
            {/* Passage Excerpt (if present) */}
            {currentQ.passage && (
              <section className="passage-section">
                <div className="passage-label font-mono">
                  <span>TEKS RUJUKAN ACADEMIC EXCERPT</span>
                  {isEnglishLiteracy && (
                    <span className="text-gold">✦ Interaktif: Klik kata bergaris bawah</span>
                  )}
                </div>
                {renderInteractivePassage(currentQ.passage, currentQ.interactiveWords)}
              </section>
            )}

            {/* Prompt */}
            <div className="question-prompt-box">
              <h2 className="question-prompt font-serif">{currentQ.question}</h2>
            </div>

            {/* Options */}
            <div className="options-container" role="radiogroup" aria-label="Pilihan Jawaban">
              {currentQ.options.map((option) => {
                const isSelected = selectedAns === option.key;

                return (
                  <button
                    key={option.key}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`option-choice-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => selectAnswer(currIdx, option.key)}
                  >
                    <div className="option-key-badge font-mono">{option.key}</div>
                    <div className="option-text-body font-sans">{option.text}</div>
                    <div className="option-radio-indicator">
                      {isSelected && <span className="radio-inner-pip" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Navigation Controls */}
          <footer className="question-footer-nav">
            <button
              type="button"
              className="btn-latveria-secondary"
              onClick={handlePrev}
              disabled={currIdx === 0}
            >
              <ChevronLeft size={16} />
              <span>PREVIOUS QUESTION</span>
            </button>

            <div className="answered-status-mono font-mono">
              STATUS: {selectedAns ? `TERJAWAB (${selectedAns})` : 'BELUM DIJAWAB'}
            </div>

            {currIdx < totalQ - 1 ? (
              <button
                type="button"
                className="btn-latveria-primary"
                onClick={handleNext}
              >
                <span>NEXT QUESTION</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="btn-latveria-primary btn-gold-solid"
                onClick={finishSession}
              >
                <span>SELESAIKAN TES</span>
                <Award size={16} />
              </button>
            )}
          </footer>
        </main>
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
          Pusat pelatihan terstandar dengan 7 domain subtes resmi. Dilengkapi sistem anotasi glosarium akademik, pemodelan matematis, dan analitik kesalahan sistematis.
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
