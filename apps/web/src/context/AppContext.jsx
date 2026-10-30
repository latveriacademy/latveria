import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { api } from "../lib/api";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { DEFAULT_USER } from "../data/userData";
import { sound } from "../utils/audioFeedback";
import { practiceAnswersToPayload } from "../lib/practice/practice-answers";
import {
  clearPracticeDraft,
  loadPracticeDraft,
  savePracticeDraft,
} from "../lib/practice/practice-draft";
import {
  SHORT_TO_SLUG,
  topicToSubject,
  apiQuestionToView,
  mergeReviewData,
  formatRecentActivities,
  buildSessionResults,
} from "../lib/practice/practice-helpers";

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Navigation State
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const tab = params.get("tab") || "dashboard";
  const currentTab = pathname.startsWith("/dashboard/riwayat")
    ? "practice"
    : [
          "dashboard",
          "practice",
          "warrior",
          "chat",
          "library",
          "tryout",
          "leaderboard",
          "profile",
          "settings",
        ].includes(tab)
      ? tab
      : "dashboard";
  const setCurrentTab = useCallback(
    (next, options) => {
      const dmParam = options?.dm ? `&dm=${encodeURIComponent(options.dm)}` : "";
      navigate(`/dashboard?tab=${next}${dmParam}`);
    },
    [navigate],
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
      if (window.innerWidth > 768) localStorage.setItem("latveria_sidebar", String(next));
      return next;
    });
  }, []);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 768px)");
    const syncSidebar = () =>
      setSidebarOpen(mobile.matches ? false : localStorage.getItem("latveria_sidebar") !== "false");
    mobile.addEventListener("change", syncSidebar);
    return () => mobile.removeEventListener("change", syncSidebar);
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

  // Topics from the API are the source of the learner catalog.
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
        userId: apiUser.id,
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
          const recentActivities = formatRecentActivities(data);
          if (recentActivities.length > 0) {
            setUser((prev) => ({ ...prev, recentActivities }));
          }
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
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute("content", theme === "parchment" ? "#f5f0e6" : "#07100d");
    }
  }, [theme]);

  // Show Toast
  const showToast = (title, subtitle = "", type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, title, subtitle, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const draftRestoredRef = useRef(false);
  const storageWarnedRef = useRef(false);
  const userIdentifier =
    user.userId || user.email || (user.id && !user.id.startsWith("LTV-") ? user.id : "");

  // Pulihkan draf latihan yang belum selesai setelah profil peserta dimuat
  useEffect(() => {
    if (!userIdentifier || activeSession || draftRestoredRef.current) return;
    draftRestoredRef.current = true;
    const draft = loadPracticeDraft(userIdentifier);
    if (draft) {
      setActiveSession(draft);
      showToast(
        "Sesi Dipulihkan",
        `Latihan ${draft.subjectName || "soal"} Anda dipulihkan.`,
        "info",
      );
    }
  }, [userIdentifier, activeSession]);

  // Simpan autosave draft sesi latihan aktif saat jawaban atau pilihan berubah
  useEffect(() => {
    if (!userIdentifier || !activeSession) return;
    if (activeSession.isEvaluated || activeSession.attemptId) {
      clearPracticeDraft(userIdentifier);
      return;
    }
    const saved = savePracticeDraft(userIdentifier, activeSession);
    if (!saved && !storageWarnedRef.current) {
      storageWarnedRef.current = true;
      showToast(
        "Penyimpanan Penuh",
        "Draf latihan gagal disimpan di perangkat ini, namun latihan tetap dapat dilanjutkan.",
        "error",
      );
    }
  }, [activeSession, userIdentifier]);

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
          answers: {}, // { [questionIndex]: 'A' | 'B' | 'C' | 'D' | 'E' }
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

    const apiAnswers = practiceAnswersToPayload(activeSession.questions, activeSession.answers);
    if (!apiAnswers) {
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
                answer.correctAnswer < q.options.length &&
                typeof answer.explanation === "string",
            ),
        )
      ) {
        throw new Error("Hasil belum lengkap. Coba muat hasil lagi.");
      }

      // Merge correct answers + explanations into session questions
      const enrichedQuestions = mergeReviewData(activeSession.questions, reviewData.answers);

      const results = buildSessionResults({
        activeSession,
        reviewData,
        enrichedQuestions,
        attemptId,
      });

      sound.playSuccess();

      setSessionResults(results);
      if (userIdentifier) clearPracticeDraft(userIdentifier);
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
            const recentActivities = formatRecentActivities(data);
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
  }, [activeSession, refreshSummary, user.level, userIdentifier]);

  // Exit Session
  const exitPractice = () => {
    if (submitLock.current) return;
    sound.playClick();
    if (userIdentifier) clearPracticeDraft(userIdentifier);
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
