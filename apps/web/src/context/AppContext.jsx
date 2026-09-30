import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DEFAULT_USER } from '../data/userData';
import { LEXICON_DATABASE } from '../data/lexiconData';
import { sound } from '../utils/audioFeedback';

const AppContext = createContext();

// ponytail: map between API index 0-3 and view letter keys A-D
const INDEX_TO_KEY = ['A', 'B', 'C', 'D'];
const KEY_TO_INDEX = { A: 0, B: 1, C: 2, D: 3 };

// ponytail: map between API slugs and view short codes
const SLUG_TO_SHORT = {
  'penalaran-umum': 'PU',
  'pengetahuan-pemahaman-umum': 'PPU',
  'pemahaman-bacaan-menulis': 'PBM',
  'pengetahuan-kuantitatif': 'PK',
  'literasi-bahasa-indonesia': 'LBI',
  'literasi-bahasa-inggris': 'LBE',
  'penalaran-matematika': 'PM',
};
const SHORT_TO_SLUG = Object.fromEntries(
  Object.entries(SLUG_TO_SHORT).map(([slug, short]) => [short, slug])
);

const SECTION_MAP = {
  PU: 'Tes Skolastik', PPU: 'Tes Skolastik', PBM: 'Tes Skolastik', PK: 'Tes Skolastik',
  LBI: 'Tes Literasi', LBE: 'Tes Literasi', PM: 'Tes Literasi',
};

/** Convert API topic to the shape UTBK_SUBJECTS expects */
function topicToSubject(topic) {
  const short = SLUG_TO_SHORT[topic.slug] || topic.slug;
  return {
    id: short,
    slug: topic.slug,
    topicId: topic.id,
    name: topic.name,
    code: `SNBT-${short}`,
    category: SECTION_MAP[short] || 'Tes Skolastik',
    questionsCount: topic.questionCount,
    // ponytail: no per-user progress/accuracy from API yet, show question count only
    progress: null,
    accuracy: null,
    description: topic.description,
  };
}

/** Convert API PracticeQuestion to mock shape the view uses */
function apiQuestionToView(q) {
  return {
    id: q.id, // UUID
    question: q.prompt,
    passage: null, // API doesn't have passage field, prompt contains everything
    options: q.options.map((text, i) => ({ key: INDEX_TO_KEY[i], text })),
    // correctAnswer and explanation not available during practice (API strips them)
    correctAnswer: null,
    explanation: null,
  };
}

/** Merge review data into session questions after submission */
function mergeReviewData(sessionQuestions, reviewAnswers) {
  const byId = new Map(reviewAnswers.map((ra) => [ra.id, ra]));
  return sessionQuestions.map((sq) => {
    const ra = byId.get(sq.id);
    if (!ra) return sq;
    return {
      ...sq,
      correctAnswer: INDEX_TO_KEY[ra.correctAnswer],
      explanation: ra.explanation,
      // keep original options from practice (same order)
    };
  });
}

export const AppProvider = ({ children }) => {
  // Navigation State
  const [currentTab, setCurrentTab] = useState('dashboard');

  // Theme State
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('latveria_theme');
    return saved === 'light' ? 'parchment' : saved || 'dark';
  });

  // Sound feedback toggle
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('latveria_sound');
    return saved !== null ? saved === 'true' : true;
  });

  // User State
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('latveria_user');
    if (saved) {
      try { return JSON.parse(saved); } catch { return DEFAULT_USER; }
    }
    return DEFAULT_USER;
  });

  // Real topics from API (replaces UTBK_SUBJECTS)
  const [topics, setTopics] = useState([]);

  // Learner summary from API
  const [summary, setSummary] = useState(null);
  // Learner history from API
  const [history, setHistory] = useState([]);

  // Notifications / Toast
  const [toasts, setToasts] = useState([]);

  // Lexicon Dictionary State (For English Literacy Interactive Words)
  const [lexiconState, setLexiconState] = useState({
    isOpen: false,
    wordData: null
  });

  // Active Practice Session State
  const [activeSession, setActiveSession] = useState(null);
  // Session results (after completion)
  const [sessionResults, setSessionResults] = useState(null);
  // Loading state for async operations
  const [loading, setLoading] = useState(false);

  // Synchronize sound engine
  useEffect(() => {
    sound.enabled = soundEnabled;
    localStorage.setItem('latveria_sound', soundEnabled);
  }, [soundEnabled]);

  // Synchronize with backend authenticated user + fetch topics/summary/history
  useEffect(() => {
    fetch('/api/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((apiUser) => {
        if (apiUser && apiUser.name) {
          setUser((prev) => ({
            ...prev,
            name: apiUser.name,
            email: apiUser.email,
            role: apiUser.role,
            codename: apiUser.name,
            id: apiUser.id ? `LTV-${apiUser.id.slice(0, 4).toUpperCase()}` : prev.id,
          }));
        }
      })
      .catch(() => {});

    // Fetch topics catalog
    fetch('/api/learner/topics')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setTopics(Array.isArray(data) ? data.map(topicToSubject) : []))
      .catch(() => {});

    // Fetch learner summary
    fetch('/api/learner/summary')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setSummary(data);
          // Update user stats from real data
          setUser((prev) => ({
            ...prev,
            questionsCompleted: data.answered || prev.questionsCompleted,
            accuracy: data.answered > 0 ? Math.round((data.correct / data.answered) * 100 * 10) / 10 : prev.accuracy,
          }));
        }
      })
      .catch(() => {});

    // Fetch learner history
    fetch('/api/learner/history')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setHistory(data);
          // Map history to recentActivities format for dashboard
          const recentActivities = data.slice(0, 6).map((h, i) => {
            const short = SLUG_TO_SHORT[h.slug] || h.slug;
            return {
              id: h.id,
              code: short,
              subject: h.topic,
              title: `Selesai ${h.total} Soal ${h.topic}`,
              xp: h.correct * 15 + 30,
              time: new Date(h.submittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
              accuracy: h.total > 0 ? `${Math.round((h.correct / h.total) * 100)}%` : '0%',
            };
          });
          if (recentActivities.length > 0) {
            setUser((prev) => ({ ...prev, recentActivities }));
          }
        }
      })
      .catch(() => {});
  }, []);

  // Synchronize Theme & Body Class
  useEffect(() => {
    localStorage.setItem('latveria_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Synchronize User to LocalStorage
  useEffect(() => {
    localStorage.setItem('latveria_user', JSON.stringify(user));
  }, [user]);

  // Show Toast
  const showToast = (title, subtitle = '', type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, title, subtitle, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Add XP Function with Institutional Protocol
  // ponytail: XP is client-only until issue #8 adds backend XP
  const addXP = (amount, reason = 'Aktivitas Akademik Selesai') => {
    sound.playSuccess();
    setUser((prev) => {
      let newXP = prev.currentXP + amount;
      let newLevel = prev.level;
      let nextLevelXP = prev.nextLevelXP;

      if (newXP >= nextLevelXP) {
        newLevel += 1;
        newXP = newXP - nextLevelXP;
        nextLevelXP = Math.round(nextLevelXP * 1.35);
        showToast(
          `PROMOTED TO LEVEL ${newLevel < 10 ? '0' + newLevel : newLevel}`,
          `Pangkat akademik diperbarui. Status: Otoritas Terverifikasi`,
          'level-up'
        );
      } else {
        showToast(`+${amount} XP REWARD`, `${reason} • Record tersimpan`, 'xp');
      }

      return {
        ...prev,
        currentXP: newXP,
        nextLevelXP: nextLevelXP,
        level: newLevel,
      };
    });
  };

  // Open Lexicon Dictionary Annotation
  const openLexicon = (wordKey) => {
    const normalizedKey = wordKey.toLowerCase().replace(/[^a-z]/g, '');
    const entry = LEXICON_DATABASE[normalizedKey];
    if (entry) {
      sound.playClick();
      setLexiconState({
        isOpen: true,
        wordData: entry
      });
    } else {
      setLexiconState({
        isOpen: true,
        wordData: {
          word: wordKey,
          partOfSpeech: 'Term / Vocabulary',
          indonesianDefinition: 'Istilah akademik terpilih dalam teks evaluasi penalaran Latveria.',
          example: `Critical analysis of "${wordKey}" within academic context.`,
          academicContext: 'Analyzed in Latveria Imperial Repository.'
        }
      });
    }
  };

  const closeLexicon = () => {
    setLexiconState({ isOpen: false, wordData: null });
  };

  // Start a Practice Session — fetches real questions from API
  const startPractice = useCallback(async (subjectId, mode = 'Practice', count = 10, difficulty = 'Latverian Elite') => {
    sound.playClick();

    const subject = topics.find((s) => s.id === subjectId) || topics[0];
    if (!subject) {
      showToast('SYSTEM ERROR', 'Subtes tidak ditemukan. Muat ulang halaman.', 'error');
      return;
    }

    setLoading(true);
    try {
      const slug = subject.slug || SHORT_TO_SLUG[subjectId];
      const res = await fetch(`/api/learner/practice/${slug}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();

      if (!data.items || data.items.length === 0) {
        showToast('TIDAK ADA SOAL', `Subtes ${subject.name} belum memiliki soal.`, 'error');
        setLoading(false);
        return;
      }

      // Normalize API questions to view shape
      let sessionQuestions = data.items.map(apiQuestionToView);

      // Slice to requested count (API returns all questions for the topic)
      if (sessionQuestions.length > count) {
        // Shuffle then slice
        for (let i = sessionQuestions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [sessionQuestions[i], sessionQuestions[j]] = [sessionQuestions[j], sessionQuestions[i]];
        }
        sessionQuestions = sessionQuestions.slice(0, count);
      }

      const session = {
        subjectId,
        subjectSlug: slug,
        subjectName: subject.name,
        subjectCode: subject.code,
        mode,
        difficulty,
        totalQuestions: sessionQuestions.length,
        currentIndex: 0,
        questions: sessionQuestions,
        answers: {},    // { [questionIndex]: 'A' | 'B' | 'C' | 'D' }
        flagged: {},    // { [questionIndex]: true }
        timeRemainingSeconds: mode === 'Timed Practice' ? sessionQuestions.length * 90 : null,
        isTimerRunning: mode === 'Timed Practice',
        startTime: Date.now()
      };

      setSessionResults(null);
      setActiveSession(session);
      setCurrentTab('practice');
    } catch (err) {
      showToast('GAGAL MEMUAT SOAL', err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [topics]);

  // Select Answer
  const selectAnswer = (questionIndex, optionKey) => {
    sound.playSelect();
    setActiveSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        answers: {
          ...prev.answers,
          [questionIndex]: optionKey
        }
      };
    });
  };

  // Toggle Flag
  const toggleFlag = (questionIndex) => {
    sound.playClick();
    setActiveSession((prev) => {
      if (!prev) return null;
      const isFlagged = !prev.flagged[questionIndex];
      const newFlags = { ...prev.flagged };
      if (isFlagged) {
        newFlags[questionIndex] = true;
      } else {
        delete newFlags[questionIndex];
      }
      return {
        ...prev,
        flagged: newFlags
      };
    });
  };

  // Finish and Evaluate Session — submits to API
  const finishSession = useCallback(async () => {
    if (!activeSession) return;
    sound.playSuccess();

    // Build API submission: { answers: Record<uuid, 0-3> }
    // Must include ALL questions (unanswered ones need a value too — but API requires all)
    const apiAnswers = {};
    let allAnswered = true;
    activeSession.questions.forEach((q, idx) => {
      const letterKey = activeSession.answers[idx];
      if (letterKey && KEY_TO_INDEX[letterKey] !== undefined) {
        apiAnswers[q.id] = KEY_TO_INDEX[letterKey];
      } else {
        allAnswered = false;
      }
    });

    // API requires ALL questions answered. If some are unanswered, default them to 0.
    // ponytail: API enforces "must answer ALL questions", so fill unanswered with index 0
    // to avoid 400. The user sees them as unanswered in the review.
    activeSession.questions.forEach((q, idx) => {
      if (apiAnswers[q.id] === undefined) {
        apiAnswers[q.id] = 0;
      }
    });

    try {
      const slug = activeSession.subjectSlug;
      const submitRes = await fetch(`/api/learner/practice/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: apiAnswers }),
      });

      if (!submitRes.ok) {
        const err = await submitRes.json().catch(() => ({}));
        throw new Error(err.error || `Submit failed: HTTP ${submitRes.status}`);
      }

      const { id: attemptId } = await submitRes.json();

      // Fetch review data with correct answers and explanations
      const reviewRes = await fetch(`/api/learner/results/${attemptId}`);
      if (!reviewRes.ok) throw new Error('Failed to fetch results');
      const reviewData = await reviewRes.json();

      // Merge correct answers + explanations into session questions
      const enrichedQuestions = mergeReviewData(activeSession.questions, reviewData.answers);

      // Calculate results from review data
      let correctCount = 0;
      let incorrectCount = 0;
      let unansweredCount = 0;

      activeSession.questions.forEach((q, idx) => {
        const userAns = activeSession.answers[idx];
        const reviewQ = reviewData.answers.find((ra) => ra.id === q.id);
        if (!userAns) {
          unansweredCount++;
        } else if (reviewQ && KEY_TO_INDEX[userAns] === reviewQ.correctAnswer) {
          correctCount++;
        } else {
          incorrectCount++;
        }
      });

      const accuracy = Math.round((correctCount / activeSession.totalQuestions) * 100);
      const score = accuracy;
      const earnedXP = correctCount * 15 + 30;

      const results = {
        attemptId,
        subjectId: activeSession.subjectId,
        subjectName: activeSession.subjectName,
        subjectCode: activeSession.subjectCode,
        mode: activeSession.mode,
        difficulty: activeSession.difficulty,
        totalQuestions: activeSession.totalQuestions,
        correctCount,
        incorrectCount,
        unansweredCount,
        accuracy,
        score,
        earnedXP,
        answers: activeSession.answers,
        questions: enrichedQuestions,
        completedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      };

      // Update local XP (client-only until backend XP exists)
      addXP(earnedXP, `Sesi ${activeSession.subjectName} Selesai`);

      setSessionResults(results);
      setActiveSession((prev) => ({
        ...prev,
        questions: enrichedQuestions,
        isEvaluated: true,
        currentIndex: 0,
        results
      }));

      // Refresh summary and history in background
      fetch('/api/learner/summary').then((r) => r.ok ? r.json() : null).then((d) => {
        if (d) {
          setSummary(d);
          setUser((prev) => ({
            ...prev,
            questionsCompleted: d.answered || prev.questionsCompleted,
            accuracy: d.answered > 0 ? Math.round((d.correct / d.answered) * 100 * 10) / 10 : prev.accuracy,
          }));
        }
      }).catch(() => {});

      fetch('/api/learner/history').then((r) => r.ok ? r.json() : []).then((data) => {
        if (Array.isArray(data)) {
          setHistory(data);
          const recentActivities = data.slice(0, 6).map((h) => {
            const short = SLUG_TO_SHORT[h.slug] || h.slug;
            return {
              id: h.id,
              code: short,
              subject: h.topic,
              title: `Selesai ${h.total} Soal ${h.topic}`,
              xp: h.correct * 15 + 30,
              time: new Date(h.submittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
              accuracy: h.total > 0 ? `${Math.round((h.correct / h.total) * 100)}%` : '0%',
            };
          });
          if (recentActivities.length > 0) {
            setUser((prev) => ({ ...prev, recentActivities }));
          }
        }
      }).catch(() => {});

    } catch (err) {
      // Fallback: evaluate locally if API fails
      showToast('PERINGATAN', 'Gagal menyimpan ke server. Evaluasi lokal.', 'error');

      let correctCount = 0;
      let incorrectCount = 0;
      let unansweredCount = activeSession.totalQuestions;

      // Can't evaluate correctness without API data; mark all as unanswered
      const results = {
        subjectId: activeSession.subjectId,
        subjectName: activeSession.subjectName,
        subjectCode: activeSession.subjectCode,
        mode: activeSession.mode,
        difficulty: activeSession.difficulty,
        totalQuestions: activeSession.totalQuestions,
        correctCount,
        incorrectCount,
        unansweredCount,
        accuracy: 0,
        score: 0,
        earnedXP: 30,
        answers: activeSession.answers,
        questions: activeSession.questions,
        completedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      };

      setSessionResults(results);
      setActiveSession((prev) => ({
        ...prev,
        isEvaluated: true,
        currentIndex: 0,
        results
      }));
    }
  }, [activeSession]);

  // Exit Session
  const exitPractice = () => {
    sound.playClick();
    setActiveSession(null);
    setSessionResults(null);
  };

  // Mark Daily Training task as completed directly
  // ponytail: daily training is still mock-only, no API
  const completeDailyTraining = (taskId) => {
    sound.playSuccess();
    setUser((prev) => ({
      ...prev,
      todayTraining: prev.todayTraining.map((t) =>
        t.id === taskId ? { ...t, completed: true } : t
      )
    }));
    addXP(40, 'Daily Training Task Completed');
  };

  return (
    <AppContext.Provider
      value={{
        currentTab,
        setCurrentTab,
        theme,
        setTheme,
        soundEnabled,
        setSoundEnabled,
        user,
        setUser,
        topics,
        summary,
        history,
        loading,
        toasts,
        showToast,
        addXP,
        lexiconState,
        openLexicon,
        closeLexicon,
        activeSession,
        setActiveSession,
        sessionResults,
        setSessionResults,
        startPractice,
        selectAnswer,
        toggleFlag,
        finishSession,
        exitPractice,
        completeDailyTraining
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
