import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { api } from "../lib/api";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { DEFAULT_USER } from "../data/userData";
import { practiceXP } from "@latveria/shared";
import { sound } from "../utils/audioFeedback";

const AppContext = createContext();

// ponytail: map between API index 0-3 and view letter keys A-D
const INDEX_TO_KEY = ["A", "B", "C", "D"];
const KEY_TO_INDEX = { A: 0, B: 1, C: 2, D: 3 };

// ponytail: map between API slugs and view short codes
const SLUG_TO_SHORT = {
  "penalaran-umum": "PU",
  "pengetahuan-pemahaman-umum": "PPU",
  "pemahaman-bacaan-menulis": "PBM",
  "pengetahuan-kuantitatif": "PK",
  "literasi-bahasa-indonesia": "LBI",
  "literasi-bahasa-inggris": "LBE",
  "penalaran-matematika": "PM",
};
const SHORT_TO_SLUG = Object.fromEntries(
  Object.entries(SLUG_TO_SHORT).map(([slug, short]) => [short, slug]),
);

const SECTION_MAP = {
  PU: "Tes Skolastik",
  PPU: "Tes Skolastik",
  PBM: "Tes Skolastik",
  PK: "Tes Skolastik",
  LBI: "Tes Literasi",
  LBE: "Tes Literasi",
  PM: "Tes Literasi",
};

/** Convert API topic to the shape UTBK_SUBJECTS expects */
function topicToSubject(topic) {
  const short = SLUG_TO_SHORT[topic.slug] || topic.short || topic.slug;
  const category =
    topic.category === "tka"
      ? "Tes Kemampuan Akademik"
      : topic.category === "ujian-mandiri"
        ? "Ujian Mandiri"
        : topic.category === "mata-kuliah"
          ? "Mata Kuliah"
          : SECTION_MAP[short] || (topic.section === "literasi" ? "Tes Literasi" : "Tes Skolastik");
  return {
    id: short,
    slug: topic.slug,
    topicId: topic.id,
    name: topic.name,
    code: short.startsWith("SNBT-") ? short : `LTV-${short.toUpperCase()}`,
    category,
    questionsCount: topic.questionCount,
    packageCount: Number(topic.packageCount ?? 0),
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
    annotations: q.annotations ?? [],
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
      annotations: ra.annotations ?? sq.annotations ?? [],
      // keep original options from practice (same order)
    };
  });
}

export const AppProvider = ({ children }) => {
  // Navigation State
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const tab = params.get("tab") || "dashboard";
  const practiceSubtest = params.get("subtes");
  const currentTab = pathname.startsWith("/dashboard/riwayat")
    ? "practice"
    : ["dashboard", "practice", "library", "tryout", "leaderboard", "profile", "settings"].includes(
          tab,
        )
      ? tab
      : "dashboard";
  const setCurrentTab = useCallback(
    (next) =>
      navigate(
        `/dashboard?tab=${next}${next === "practice" && practiceSubtest ? `&subtes=${encodeURIComponent(practiceSubtest)}` : ""}`,
      ),
    [navigate, practiceSubtest],
  );

  // Sidebar collapse state — default terbuka di desktop, tertutup di mobile
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (window.innerWidth <= 768) return false;
    const saved = localStorage.getItem("latveria_sidebar");
    if (saved !== null) return saved === "true";
    return true;
  });
  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem("latveria_sidebar", String(next));
      return next;
    });
  }, []);

  // Theme State
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("latveria_theme");
    return saved === "light" ? "parchment" : saved || "dark";
  });

  // Sound feedback toggle
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem("latveria_sound");
    return saved !== null ? saved === "true" : true;
  });

  // User State
  const [user, setUser] = useState(DEFAULT_USER);

  // Real topics from API (replaces UTBK_SUBJECTS)
  const [topics, setTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topicsError, setTopicsError] = useState("");

  // Learner summary from API
  const [summary, setSummary] = useState(null);
  // Learner history from API
  const [history, setHistory] = useState([]);

  // Notifications / Toast
  const [toasts, setToasts] = useState([]);

  // Lexicon Dictionary State (For English Literacy Interactive Words)
  const [lexiconState, setLexiconState] = useState({
    isOpen: false,
    wordData: null,
  });

  // Active Practice Session State
  const [activeSession, setActiveSession] = useState(null);
  // Session results (after completion)
  const [sessionResults, setSessionResults] = useState(null);
  // Loading state for async operations
  const [loading, setLoading] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const submitLock = useRef(false);

  const loadProfile = useCallback(async () => {
    setProfileError("");
    try {
      const [apiUser, profile] = await Promise.all([api("/me"), api("/learner/profile")]);
      setUser((prev) => ({
        ...prev,
        ...profile,
        email: apiUser.email,
        role: apiUser.role,
        image: profile.image ?? apiUser.image ?? null,
        id: `LTV-${apiUser.id.slice(0, 4).toUpperCase()}`,
      }));
      setProfileLoaded(true);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Gagal memuat profil. Coba lagi.");
    }
  }, []);

  // Synchronize sound engine
  useEffect(() => {
    sound.enabled = soundEnabled;
    localStorage.setItem("latveria_sound", soundEnabled);
  }, [soundEnabled]);

  const refreshTopics = useCallback(async () => {
    setTopicsLoading(true);
    setTopicsError("");
    try {
      const data = await api("/learner/topics?all=true");
      if (!Array.isArray(data)) throw new Error("Respons subtes tidak valid.");
      setTopics(data.map(topicToSubject));
    } catch {
      setTopicsError("Gagal memuat subtes. Coba lagi.");
    } finally {
      setTopicsLoading(false);
    }
  }, []);

  const refreshSummary = useCallback(async () => {
    const data = await api("/learner/summary");
    setSummary(data);
    setUser((prev) => ({
      ...prev,
      totalXP: data.totalXP,
      level: data.level,
      currentXP: data.currentXP,
      nextLevelXP: data.nextLevelXP,
      streakDays: data.streakDays,
      practicedToday: data.practicedToday,
      questionsCompleted: data.answered,
      attempts: data.attempts,
      accuracy: data.answered ? Math.round((data.correct / data.answered) * 1000) / 10 : 0,
      weeklyChartData: data.weeklyChartData,
      weeklyXP: data.weeklyXP,
      weeklyAccuracy: data.weeklyAccuracy,
    }));
    return data;
  }, []);

  // Synchronize with backend authenticated user + fetch topics/summary/history
  useEffect(() => {
    loadProfile();
    refreshTopics();

    // Fetch learner summary
    refreshSummary().catch(() => {});

    // Fetch learner history
    fetch("/api/learner/history")
      .then((res) => (res.ok ? res.json().catch(() => []) : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setHistory(data);
          // Map history to recentActivities format for dashboard
          const recentActivities = data.slice(0, 6).map((h) => {
            const short = SLUG_TO_SHORT[h.slug] || h.slug;
            return {
              id: h.id,
              code: short,
              subject: h.topic,
              title: `Selesai ${h.total} Soal ${h.topic}`,
              xp: h.earnedXP ?? practiceXP(h.correct),
              time: new Date(h.submittedAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
              accuracy: h.total > 0 ? `${Math.round((h.correct / h.total) * 100)}%` : "0%",
            };
          });
          setUser((prev) => ({ ...prev, recentActivities }));
        }
      })
      .catch(() => {});
  }, [loadProfile, refreshTopics, refreshSummary]);

  useEffect(() => {
    // Perbarui streak saat hari WIB berganti dan latihan diselesaikan di tab lain.
    const refresh = () => {
      if (document.visibilityState === "visible") refreshSummary().catch(() => {});
    };
    const timer = setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [refreshSummary]);

  // Synchronize Theme & Body Class
  useEffect(() => {
    localStorage.setItem("latveria_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Show Toast
  const showToast = (title, subtitle = "", type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, title, subtitle, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Open Lexicon Dictionary Annotation
  const openLexicon = (annotation, questionId) => {
    if (!annotation?.id || !questionId) return;
    sound.playClick();
    setLexiconState({ isOpen: true, wordData: annotation, questionId });
  };

  const closeLexicon = () => {
    setLexiconState({ isOpen: false, wordData: null });
  };

  const fetchSubtestPackages = useCallback(async (slugOrId, signal) => {
    const data = await api(`/learner/topics/${slugOrId}/packages`, { signal });
    if (!Array.isArray(data)) throw new Error("Respons paket tidak valid.");
    return data;
  }, []);

  // Start a Practice Session — fetches real questions from API
  const startPractice = useCallback(
    async (
      subjectId,
      mode = "Practice",
      count = 10,
      difficulty = "Latverian Elite",
      packageId = null,
    ) => {
      if (submitLock.current) return;
      setSubmissionError("");
      sound.playClick();

      const subject = topics.find((s) => s.id === subjectId || s.slug === subjectId) || topics[0];
      if (!subject) {
        showToast("SYSTEM ERROR", "Subtes tidak ditemukan. Muat ulang halaman.", "error");
        return;
      }

      setLoading(true);
      try {
        const slug = subject.slug || SHORT_TO_SLUG[subjectId];
        const url = packageId
          ? `/api/learner/practice/${slug}/${packageId}`
          : `/api/learner/practice/${slug}`;
        const res = await fetch(url);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const data = await res.json();

        if (!data.items || data.items.length === 0) {
          showToast(
            "TIDAK ADA SOAL",
            `Subtes ${subject.name} belum memiliki soal pada paket ini.`,
            "error",
          );
          setLoading(false);
          return;
        }

        // Normalize API questions to view shape
        let sessionQuestions = data.items.map(apiQuestionToView);

        // Slice to requested count if specified and smaller than package
        if (count && sessionQuestions.length > count) {
          // Shuffle then slice
          for (let i = sessionQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [sessionQuestions[i], sessionQuestions[j]] = [sessionQuestions[j], sessionQuestions[i]];
          }
          sessionQuestions = sessionQuestions.slice(0, count);
        }

        const session = {
          submissionId: crypto.randomUUID(),
          subjectId: subject.id,
          subjectSlug: slug,
          subjectName: subject.name,
          subjectCode: subject.code,
          packageId: data.packageId ?? packageId ?? null,
          packageName: data.packageName ?? null,
          mode,
          difficulty,
          totalQuestions: sessionQuestions.length,
          currentIndex: 0,
          questions: sessionQuestions,
          answers: {}, // { [questionIndex]: 'A' | 'B' | 'C' | 'D' }
          flagged: {}, // { [questionIndex]: true }
          timeRemainingSeconds: mode === "Timed Practice" ? sessionQuestions.length * 90 : null,
          isTimerRunning: mode === "Timed Practice",
          startTime: Date.now(),
        };

        setSessionResults(null);
        setActiveSession(session);
        setCurrentTab("practice");
      } catch (err) {
        showToast("GAGAL MEMUAT SOAL", err.message, "error");
      } finally {
        setLoading(false);
      }
    },
    [topics, setCurrentTab],
  );

  // Select Answer
  const selectAnswer = (questionIndex, optionKey) => {
    if (submitLock.current) return;
    sound.playSelect();
    setActiveSession((prev) => {
      if (!prev) return null;
      if (prev.attemptId || prev.isEvaluated) return prev;
      return {
        ...prev,
        answers: {
          ...prev.answers,
          [questionIndex]: optionKey,
        },
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
        flagged: newFlags,
      };
    });
  };

  // Finish and Evaluate Session — submits to API
  const finishSession = useCallback(async () => {
    if (!activeSession || activeSession.isEvaluated || submitLock.current) return;

    // Build API submission: { answers: Record<uuid, 0-3> }
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

    if (!allAnswered) {
      setSubmissionError(
        "Jawab semua soal dalam sesi sebelum dikumpulkan. Jawabanmu tetap tersimpan selama sesi ini terbuka.",
      );
      return;
    }
    submitLock.current = true;
    setSubmitting(true);
    setSubmissionError("");
    let attemptId = activeSession.attemptId;

    try {
      if (!attemptId) {
        const endpoint = activeSession.packageId
          ? `/learner/practice/${activeSession.subjectSlug}/${activeSession.packageId}`
          : `/learner/practice/${activeSession.subjectSlug}`;
        const saved = await api(endpoint, {
          method: "POST",
          body: JSON.stringify({
            submissionId: activeSession.submissionId,
            answers: apiAnswers,
            packageId: activeSession.packageId || undefined,
          }),
        });
        attemptId = saved.id;
        setActiveSession((prev) => ({ ...prev, attemptId }));
      }
      const reviewData = await api(`/learner/results/${attemptId}`);
      if (
        reviewData.answers.length !== activeSession.questions.length ||
        activeSession.questions.some(
          (q) =>
            !reviewData.answers.some(
              (answer) =>
                answer.id === q.id &&
                Number.isInteger(answer.correctAnswer) &&
                answer.correctAnswer >= 0 &&
                answer.correctAnswer <= 3 &&
                typeof answer.explanation === "string",
            ),
        )
      ) {
        throw new Error("Hasil belum lengkap. Coba muat hasil lagi.");
      }

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
      const earnedXP = reviewData.attempt.earnedXP;

      const results = {
        attemptId,
        subjectId: activeSession.subjectId,
        subjectName: activeSession.subjectName,
        subjectCode: activeSession.subjectCode,
        packageId: activeSession.packageId,
        packageName: activeSession.packageName,
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
        completedAt: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      };

      sound.playSuccess();

      setSessionResults(results);
      setActiveSession((prev) => ({
        ...prev,
        questions: enrichedQuestions,
        isEvaluated: true,
        currentIndex: 0,
        results,
      }));

      // Refresh summary and history in background
      refreshSummary()
        .then((data) => {
          if (data.level > user.level)
            showToast(
              `Level ${data.level} unlocked!`,
              `Total ${data.totalXP} EXP dari drilling.`,
              "level-up",
            );
        })
        .catch(() =>
          showToast(
            "Progres belum dapat dimuat",
            "Progres latihan sudah tersimpan. Muat ulang halaman untuk mencoba lagi.",
            "error",
          ),
        );

      fetch("/api/learner/history")
        .then((r) => (r.ok ? r.json().catch(() => []) : []))
        .then((data) => {
          if (Array.isArray(data)) {
            setHistory(data);
            const recentActivities = data.slice(0, 6).map((h) => {
              const short = SLUG_TO_SHORT[h.slug] || h.slug;
              return {
                id: h.id,
                code: short,
                subject: h.topic,
                title: `Selesai ${h.total} Soal ${h.topic}`,
                xp: h.earnedXP ?? practiceXP(h.correct),
                time: new Date(h.submittedAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }),
                accuracy: h.total > 0 ? `${Math.round((h.correct / h.total) * 100)}%` : "0%",
              };
            });
            if (recentActivities.length > 0) {
              setUser((prev) => ({ ...prev, recentActivities }));
            }
          }
        })
        .catch(() => {});
    } catch (err) {
      setSubmissionError(
        `${attemptId ? "Jawaban sudah tersimpan, tetapi hasil belum dapat dimuat." : "Jawaban belum berhasil dikumpulkan."} ${err.message} Coba lagi.`,
      );
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }, [activeSession, refreshSummary, user.level]);

  // Exit Session
  const exitPractice = () => {
    if (submitLock.current) return;
    sound.playClick();
    setActiveSession(null);
    setSessionResults(null);
    setSubmissionError("");
  };

  // Mark Daily Training task as completed directly
  // ponytail: daily training is still mock-only, no API
  const completeDailyTraining = (taskId) => {
    sound.playSuccess();
    setUser((prev) => ({
      ...prev,
      todayTraining: prev.todayTraining.map((t) =>
        t.id === taskId ? { ...t, completed: true } : t,
      ),
    }));
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
        profileLoaded,
        profileError,
        loadProfile,
        topics,
        topicsLoading,
        topicsError,
        setTopics,
        refreshTopics,
        summary,
        refreshSummary,
        history,
        loading,
        submitting,
        submissionError,
        toasts,
        showToast,
        lexiconState,
        openLexicon,
        closeLexicon,
        activeSession,
        setActiveSession,
        sessionResults,
        setSessionResults,
        startPractice,
        fetchSubtestPackages,
        selectAnswer,
        toggleFlag,
        finishSession,
        exitPractice,
        completeDailyTraining,
        sidebarOpen,
        toggleSidebar,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
