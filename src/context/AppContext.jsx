import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEFAULT_USER } from '../data/userData';
import { MOCK_QUESTIONS, UTBK_SUBJECTS } from '../data/questionsData';
import { LEXICON_DATABASE } from '../data/lexiconData';
import { sound } from '../utils/audioFeedback';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Navigation State
  const [currentTab, setCurrentTab] = useState('dashboard');

  // Theme State
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('latveria_theme') || 'dark';
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

  // Synchronize sound engine
  useEffect(() => {
    sound.enabled = soundEnabled;
    localStorage.setItem('latveria_sound', soundEnabled);
  }, [soundEnabled]);

  // Synchronize Theme & Body Class
  useEffect(() => {
    localStorage.setItem('latveria_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
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
        questionsCompleted: prev.questionsCompleted + 1
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
      // Fallback for general word lookup
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

  // Start a Practice Session
  const startPractice = (subjectId, mode = 'Practice', count = 10, difficulty = 'Latverian Elite') => {
    sound.playClick();
    const subject = UTBK_SUBJECTS.find((s) => s.id === subjectId) || UTBK_SUBJECTS[0];
    const availableQuestions = MOCK_QUESTIONS[subjectId] || MOCK_QUESTIONS['PU'];
    
    // Create question list, duplicate/slice to match count if needed
    let sessionQuestions = [];
    while (sessionQuestions.length < count) {
      sessionQuestions = sessionQuestions.concat(availableQuestions);
    }
    sessionQuestions = sessionQuestions.slice(0, count);

    // Initial session payload
    const session = {
      subjectId,
      subjectName: subject.name,
      subjectCode: subject.code,
      mode,
      difficulty,
      totalQuestions: count,
      currentIndex: 0,
      questions: sessionQuestions,
      answers: {}, // { [index]: 'A' | 'B' | ... }
      flagged: {}, // { [index]: true }
      timeRemainingSeconds: mode === 'Timed Practice' ? count * 90 : null,
      isTimerRunning: mode === 'Timed Practice',
      startTime: Date.now()
    };

    setSessionResults(null);
    setActiveSession(session);
    setCurrentTab('practice');
  };

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

  // Finish and Evaluate Session
  const finishSession = () => {
    if (!activeSession) return;
    sound.playSuccess();

    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    activeSession.questions.forEach((q, idx) => {
      const userAns = activeSession.answers[idx];
      if (!userAns) {
        unansweredCount++;
      } else if (userAns === q.correctAnswer) {
        correctCount++;
      } else {
        incorrectCount++;
      }
    });

    const accuracy = Math.round((correctCount / activeSession.totalQuestions) * 100);
    const score = Math.round((correctCount / activeSession.totalQuestions) * 100);
    const earnedXP = correctCount * 15 + 30; // base completion XP + question bonus

    const results = {
      subjectId: activeSession.subjectId,
      subjectName: activeSession.subjectName,
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
      questions: activeSession.questions,
      completedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    // Update global user stats
    addXP(earnedXP, `Sesi ${activeSession.subjectName} Selesai`);
    setUser((prev) => {
      const updatedToday = prev.todayTraining.map((item) => {
        if (item.subjectId === activeSession.subjectId) {
          return { ...item, completed: true };
        }
        return item;
      });

      return {
        ...prev,
        practiceHours: +(prev.practiceHours + 0.3).toFixed(1),
        todayTraining: updatedToday
      };
    });

    setSessionResults(results);
    setActiveSession(null);
  };

  // Exit Session
  const exitPractice = () => {
    sound.playClick();
    setActiveSession(null);
    setSessionResults(null);
  };

  // Mark Daily Training task as completed directly
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
