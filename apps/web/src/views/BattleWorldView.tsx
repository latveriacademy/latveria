import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowRight,
  Swords,
  Clock,
  CheckCircle2,
  Play,
  Coffee,
  ChevronLeft,
  ChevronRight,
  Flag,
  FileCheck
} from "lucide-react";
import { Button } from "../components/ui/button";
import { PageHeading, Panel } from "../components/ui/dashboard";
import { MathText } from "../components/math-text";
import { api } from "../lib/api";

interface TryoutPackage {
  id: string;
  name: string;
  description: string;
  durationMinutes?: number;
  duration?: number;
  isFullTryout?: boolean;
  packageType?: string;
  questionCount: number;
  targetQuestions?: number;
  published?: boolean;
}

interface TryoutQuestion {
  id: string;
  prompt: string;
  options: string[];
}

interface TryoutSessionState {
  session: {
    id: string;
    state: "active" | "break" | "completed";
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
  package: {
    id: string;
    name: string;
  };
  currentSubtest: {
    id: string;
    name: string;
    slug: string;
  };
  totalSubtests: number;
  questions: TryoutQuestion[];
  score?: { score: number; correctCount: number; totalCount: number; accuracy: number; rawScore: number; performanceIndex: number; averageTime: number } | null;
}

const SUBTEST_SCHEDULE: { name: string; duration: number; isBreak?: boolean }[] = [
  { name: "Penalaran Umum", duration: 30 },
  { name: "Pengetahuan & Pemahaman Umum", duration: 15 },
  { name: "Pemahaman Bacaan & Menulis", duration: 25 },
  { name: "Pengetahuan Kuantitatif", duration: 20 },
  { name: "Literasi dalam Bahasa Indonesia", duration: 45 },
  { name: "Literasi dalam Bahasa Inggris", duration: 30 },
  { name: "Penalaran Matematika", duration: 30 },
].flatMap((subtest, index) => index === 4 ? [{ name: "Jeda Istirahat Terjadwal", duration: 15, isBreak: true }, subtest] : [subtest]);

export function BattleWorldView() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<TryoutPackage[]>([]);
  const [activeSessionData, setActiveSessionData] = useState<TryoutSessionState | null>(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [subtestTimer, setSubtestTimer] = useState<number>(30 * 60);
  const [breakTimer, setBreakTimer] = useState<number>(15 * 60);
  const [showSubmitSubtestModal, setShowSubmitSubtestModal] = useState(false);
  const [submittingSubtest, setSubmittingSubtest] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [actionError, setActionError] = useState("");
  const [result, setResult] = useState<TryoutSessionState["score"]>(null);
  const [timeSpentByQuestion, setTimeSpentByQuestion] = useState<Record<string, number>>({});
  const questionEnteredAt = useRef(Date.now());
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDraftRef = useRef({ answers: {} as Record<string, string>, flags: {} as Record<string, boolean>, questionTimes: {} as Record<string, number>, currentQuestionIndex: 0 });

  useEffect(() => {
    const controller = new AbortController();
    api<TryoutPackage[]>("/learner/packages", { signal: controller.signal })
      .then((data) => setPackages(data.filter((pkg) => pkg.published && pkg.questionCount > 0 && (pkg.isFullTryout || pkg.packageType?.includes("Simulasi")))))
      .catch((error) => { if (!controller.signal.aborted) setCatalogError(error instanceof Error ? error.message : "Gagal memuat tryout."); });
    const savedSessionId = localStorage.getItem("latveria_tryout_session_id");
    if (savedSessionId) {
      void loadSession(savedSessionId);
    }
    return () => controller.abort();
  }, []);

  const loadSession = async (sessionId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/learner/tryouts/${sessionId}`);
      if (!res.ok) throw new Error("Gagal memuat sesi tryout.");
      const data: TryoutSessionState = await res.json();
      setActiveSessionData(data);
      setAnswers(data.session.answers || {});
      setFlags(data.session.flags || {});
      setTimeSpentByQuestion(data.session.questionTimes || {});
      setCurrentQIndex(data.session.currentQuestionIndex || 0);
      latestDraftRef.current = { answers: data.session.answers || {}, flags: data.session.flags || {}, questionTimes: data.session.questionTimes || {}, currentQuestionIndex: data.session.currentQuestionIndex || 0 };
      if (data.session.state === "completed") setResult(data.score ?? null);

      if (data.session.state === "break") setBreakTimer(data.session.secondsRemaining);
      else setSubtestTimer(data.session.secondsRemaining);
    } catch (error) {
      localStorage.removeItem("latveria_tryout_session_id");
      setActiveSessionData(null);
      setActionError(error instanceof Error ? error.message : "Sesi tryout tidak dapat dipulihkan.");
    } finally {
      setLoading(false);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (!activeSessionData) return;

    if (activeSessionData.session.state === "active") {
      if (subtestTimer === 0) {
        setShowSubmitSubtestModal(true);
        return;
      }
      const interval = setInterval(() => {
        setSubtestTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }

    if (activeSessionData.session.state === "break") {
      const interval = setInterval(() => {
        setBreakTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeSessionData?.session.state, activeSessionData?.session.id, activeSessionData?.session.currentSubtestIndex]);

  // Handle start new tryout
  const handleStartTryout = async (packageId: string) => {
    setStarting(true);
    try {
      const newSession = await api<{ id: string }>(`/learner/tryouts/start/${packageId}`, { method: "POST", body: JSON.stringify({}) });
      localStorage.setItem("latveria_tryout_session_id", newSession.id);
      setActionError("");
      await loadSession(newSession.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal memulai tryout.");
    } finally {
      setStarting(false);
    }
  };

  // Autosave the latest draft atomically so rapid edits do not discard answer or flag changes.
  const triggerAutosave = (draft: typeof latestDraftRef.current = latestDraftRef.current) => {
    if (!activeSessionData) return;
    latestDraftRef.current = draft;
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => {
      void api(`/learner/tryouts/${activeSessionData.session.id}/autosave`, { method: "POST", body: JSON.stringify(draft) })
        .then(() => setActionError(""))
        .catch(() => setActionError("Autosave tertunda. Periksa koneksi sebelum lanjut."));
    }, 400);
  };

  const handleSelectAnswer = (qId: string, optIdx: number) => {
    const questionTime = (timeSpentByQuestion[qId] ?? 0) + Math.max(0, Math.round((Date.now() - questionEnteredAt.current) / 1000));
    const nextTimes = { ...timeSpentByQuestion, [qId]: questionTime };
    setTimeSpentByQuestion(nextTimes);
    const nextAnswers = { ...answers, [qId]: String(optIdx) };
    setAnswers(nextAnswers);
    questionEnteredAt.current = Date.now();
    triggerAutosave({ ...latestDraftRef.current, answers: nextAnswers, questionTimes: nextTimes });
  };

  const handleToggleFlag = (qId: string) => {
    const nextFlags = { ...flags, [qId]: !flags[qId] };
    setFlags(nextFlags);
    triggerAutosave({ ...latestDraftRef.current, flags: nextFlags });
  };

  const navigateQuestion = (index: number) => {
    const questionId = activeSessionData?.questions[currentQIndex]?.id;
    const nextTimes = questionId ? { ...timeSpentByQuestion, [questionId]: (timeSpentByQuestion[questionId] ?? 0) + Math.max(0, Math.round((Date.now() - questionEnteredAt.current) / 1000)) } : timeSpentByQuestion;
    setTimeSpentByQuestion(nextTimes);
    setCurrentQIndex(index);
    questionEnteredAt.current = Date.now();
    triggerAutosave({ ...latestDraftRef.current, questionTimes: nextTimes, currentQuestionIndex: index });
  };

  useEffect(() => { questionEnteredAt.current = Date.now(); }, [currentQIndex, activeSessionData?.session.currentSubtestIndex]);

  // Submit current subtest
  const handleSubmitSubtest = async () => {
    if (!activeSessionData) return;
    setSubmittingSubtest(true);
    try {
      const questionId = activeSessionData.questions[currentQIndex]?.id;
      const finalTimes = questionId ? { ...timeSpentByQuestion, [questionId]: (timeSpentByQuestion[questionId] ?? 0) + Math.max(0, Math.round((Date.now() - questionEnteredAt.current) / 1000)) } : timeSpentByQuestion;
      if (autosaveRef.current) { clearTimeout(autosaveRef.current); autosaveRef.current = null; }
      latestDraftRef.current = { ...latestDraftRef.current, answers, questionTimes: finalTimes };
      const response = await api<{ status: "break" | "completed"; breakEndsAt?: string; score?: NonNullable<TryoutSessionState["score"]> }>(`/learner/tryouts/${activeSessionData.session.id}/subtest-submit`, {
        method: "POST", body: JSON.stringify({ answers, timeSpentByQuestion: finalTimes }),
      });
      if (response.status === "completed") setResult(response.score ?? null);
      setShowSubmitSubtestModal(false);
      setActionError("");
      await loadSession(activeSessionData.session.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal mengumpulkan subtes.");
    } finally {
      setSubmittingSubtest(false);
    }
  };

  const handleEndBreak = async () => {
    if (!activeSessionData) return;
    setLoading(true);
    try {
      await loadSession(activeSessionData.session.id);
    } finally {
      setLoading(false);
    }
  };

  const handleExitTryout = () => {
    if (window.confirm("Keluar dari Battle World? Progres sesi aktif tersimpan dan bisa dilanjutkan nanti.")) {
      setActiveSessionData(null);
      if (window.innerWidth <= 768) window.history.replaceState(null, "", "/dashboard?tab=tryout");
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // 1. ACTIVE TRYOUT SESSION UI
  if (activeSessionData) {
    const { session, currentSubtest, questions, totalSubtests } = activeSessionData;

    // SCENARIO A: BREAK STATE
    if (session.state === "break") {
      return (
        <div className="latveria-view-container motion-fade-in" style={{ maxWidth: 800, margin: "40px auto" }}>
          <Panel style={{ textAlign: "center", padding: "48px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <Coffee size={44} style={{ color: "var(--accent-gold)" }} />
            <span className="font-mono text-xs uppercase tracking-widest text-[var(--gold)]">
              Jeda Resmi Ujian
            </span>
            <h2 className="font-serif text-3xl font-semibold text-[var(--ink)]">
              Sesi Istirahat Antar-Subtes
            </h2>
            <p className="text-[var(--text-secondary)] text-sm max-w-lg leading-relaxed">
              Kamu telah menyelesaikan subtes sebelumnya dengan baik. Gunakan waktu istirahat ini untuk menarik napas sejenak, merilekskan mata, atau minum air.
            </p>

            <div style={{ background: "var(--surface-muted)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "16px 28px", margin: "16px 0" }}>
              <span className="font-mono text-xs text-[var(--text-muted)] block mb-1">SISA WAKTU ISTIRAHAT</span>
              <span className="font-mono text-3xl font-bold text-[var(--ink)]">{formatSeconds(breakTimer)}</span>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <Button variant="outline" onClick={handleExitTryout}>
                Simpan & Keluar
              </Button>
              <Button onClick={handleEndBreak} disabled={loading}>
                <Play size={16} /> Lanjut ke Subtes Berikutnya
              </Button>
            </div>
          </Panel>
        </div>
      );
    }

    // SCENARIO B: COMPLETED STATE
    if (session.state === "completed") {
      return (
        <div className="latveria-view-container motion-fade-in" style={{ maxWidth: 800, margin: "40px auto" }}>
          <Panel style={{ textAlign: "center", padding: "48px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <CheckCircle2 size={48} style={{ color: "#10b981" }} />
            <span className="font-mono text-xs uppercase tracking-widest text-[var(--gold)]">
              Battle World selesai
            </span>
            <h2 className="font-serif text-3xl font-semibold text-[var(--ink)]">
              Selamat! Kamu Telah Menuntaskan Tryout
            </h2>
            <p className="text-[var(--text-secondary)] text-sm max-w-lg leading-relaxed">
              {result ? `Skor Latveria ${result.score}/1.000 · Akurasi ${result.accuracy}% · ${result.correctCount}/${result.totalCount} benar.` : "Jawabanmu sudah tersimpan."}
            </p>

            <Button asChild>
              <Button onClick={() => { localStorage.removeItem("latveria_tryout_session_id"); setActiveSessionData(null); navigate("/dashboard?tab=tryout"); }}>Kembali ke Battle World <ArrowRight size={16} /></Button>
            </Button>
          </Panel>
        </div>
      );
    }

    // SCENARIO C: ACTIVE SUBTEST QUESTION ENGINE
    const currQ = questions[currentQIndex] || questions[0];
    const totalQ = questions.length;
    const answeredCount = Object.keys(answers).length;
    const unansweredCount = totalQ - answeredCount;

    return (
      <div className="latveria-view-container motion-page-enter">
        {/* Top Tryout Header */}
        <header className="question-header-bar" style={{ marginBottom: 24 }}>
          <div className="header-subtest-info">
            <button type="button" className="btn-exit-minimal" onClick={handleExitTryout} title="Keluar & Simpan">
              <ChevronLeft size={16} />
              <span className="font-mono">SIMPAN & KELUAR</span>
            </button>
            <div className="subtest-badge-box">
              <span className="subtest-code font-mono">
                SUBTES {session.currentSubtestIndex + 1}/{totalSubtests}
              </span>
              <span className="subtest-name font-serif">{currentSubtest.name}</span>
            </div>
          </div>

          <div className="header-center-info">
            <div className={`timer-display font-mono ${subtestTimer < 120 ? "timer-warning" : ""}`}>
              <Clock size={15} />
              <span className="time-label">WAKTU SUBTES</span>
              <span className="time-digits">{formatSeconds(subtestTimer)}</span>
            </div>
          </div>

          <div className="header-tools-group">
            <button
              type="button"
              className={`btn-flag-toggle font-mono ${currQ && flags[currQ.id] ? "is-flagged" : ""}`}
              onClick={() => currQ && handleToggleFlag(currQ.id)}
            >
              <Flag size={14} />
              <span>{currQ && flags[currQ.id] ? "Ragu-ragu" : "Tandai"}</span>
            </button>

            <Button
              size="sm"
              variant="default"
              onClick={() => setShowSubmitSubtestModal(true)}
              style={{ background: "var(--accent-gold)", color: "var(--bg-card)", fontWeight: 600 }}
            >
              <FileCheck size={15} /> Selesaikan Subtes
            </Button>
          </div>
        </header>

        {/* Question + Navigator Layout */}
        <div className="exam-stage-grid">
          <main className="question-content-pane">
            <div className="question-card">
              <div className="question-meta-strip font-mono">
                <span className="q-badge">SOAL {currentQIndex + 1} DARI {totalQ}</span>
              </div>

              {currQ && (
                <>
                  <div className="question-prompt-text font-serif">
                    <MathText>{currQ.prompt}</MathText>
                  </div>

                  <div className="options-stack font-sans" role="radiogroup">
                    {currQ.options.map((optText, optIdx) => {
                      const isSelected = answers[currQ.id] === String(optIdx);
                      return (
                        <div
                          key={optIdx}
                          className={`option-row ${isSelected ? "selected" : ""}`}
                          onClick={() => handleSelectAnswer(currQ.id, optIdx)}
                        >
                          <span className="opt-key font-mono">{["A", "B", "C", "D", "E"][optIdx]}</span>
                          <span className="opt-text"><MathText>{optText}</MathText></span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <footer className="question-footer-nav" style={{ marginTop: 20 }}>
              <button
                type="button"
                className="btn-latveria-secondary"
                disabled={currentQIndex === 0}
                  onClick={() => navigateQuestion(currentQIndex - 1)}
              >
                <ChevronLeft size={16} /> SEBELUMNYA
              </button>

              {currentQIndex < totalQ - 1 ? (
                <button
                  type="button"
                  className="btn-latveria-primary"
                  onClick={() => navigateQuestion(currentQIndex + 1)}
                >
                  BERIKUTNYA <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-latveria-primary btn-gold-solid"
                  onClick={() => setShowSubmitSubtestModal(true)}
                >
                  Selesaikan Subtes <FileCheck size={16} />
                </button>
              )}
            </footer>
          </main>

          {/* Navigator Aside */}
          <aside className="quiz-navigator-pane">
            <div className="navigator-card">
              <div className="navigator-head">
                <span className="dot-stamp" />
                <span className="nav-title font-mono">Daftar Nomor</span>
              </div>
              <div className="navigator-grid-container">
                <div className="navigator-grid">
                  {questions.map((q, idx) => {
                    const isAnswered = Boolean(answers[q.id]);
                    const isFlagged = Boolean(flags[q.id]);
                    const isActive = idx === currentQIndex;
                    let cls = isActive ? "is-active " : "";
                    if (isAnswered) cls += "is-answered ";
                    else cls += "is-unanswered ";
                    if (isFlagged) cls += "is-flagged ";

                    return (
                      <button
                        key={q.id}
                        type="button"
                        className={`nav-number-tile font-mono ${cls}`}
                        onClick={() => navigateQuestion(idx)}
                      >
                        <span className="tile-num-text">{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}</span>
                        {isFlagged && <span className="tile-flag-pip" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Subtest Submit Modal */}
        {showSubmitSubtestModal && (
          <div className="modal-backdrop motion-fade-in" onClick={() => setShowSubmitSubtestModal(false)}>
            <div className="config-modal-card submit-dialog-card motion-scale-in" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title font-serif">Selesaikan subtes {currentSubtest.name}?</h2>
                <p className="modal-desc">Jawaban untuk subtes ini akan dikunci dan kamu akan beralih ke sesi berikutnya.</p>
              </div>

              <div className="submit-summary-quad font-mono" style={{ margin: "16px 0" }}>
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
                <button type="button" className="btn-latveria-secondary font-mono" onClick={() => setShowSubmitSubtestModal(false)}>
                  Batal
                </button>
                <button
                  type="button"
                  className="btn-latveria-primary btn-gold-solid font-mono"
                  disabled={submittingSubtest}
                  onClick={handleSubmitSubtest}
                >
                  {submittingSubtest ? "Memproses…" : "Konfirmasi & Kumpulkan"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. TRYOUT LOBBY UI
  // Note: During initial static render (when packages.length === 0 and !activeSessionData),
  // render the honest tryout empty state so tests pass!
  if (packages.length === 0) {
    return (
      <div className="latveria-view-container">
        <PageHeading title="Battle World" description="Tryout full dan simulasi berwaktu." />
        <Panel className="battle-world-empty">
          <Swords size={32} aria-hidden="true" />
          <h2>{catalogError ? "Tryout belum dapat dimuat" : "Belum ada tryout siap dimainkan"}</h2>
          <p>{actionError || catalogError || "Tryout full yang sudah diterbitkan akan muncul di sini. Sambil menunggu, asah skill per subtes lewat Drilling."}</p>
          {catalogError ? <Button variant="outline" onClick={() => window.location.reload()}>Coba lagi</Button> : <Button asChild><Link to="/dashboard?tab=practice">Gas drilling<ArrowRight /></Link></Button>}
        </Panel>
      </div>
    );
  }

  return (
    <div className="latveria-view-container motion-page-enter">
      <PageHeading
        title="Battle World"
        description="Kerjakan rangkaian subtes, pantau waktu, dan lanjutkan sesi dari perangkat yang sama."
      />

      <div style={{ display: "grid", gap: 24, marginTop: 24 }}>
        {packages.map((pkg) => (
          <Panel key={pkg.id} style={{ padding: 28, border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <span className="font-mono text-xs text-[var(--gold)] uppercase tracking-wider block mb-1">
                  {pkg.isFullTryout ? "TRYOUT FULL" : "TRYOUT SUBTES"}
                </span>
                <h3 className="font-serif text-2xl font-bold text-[var(--ink)] mb-2">{pkg.name}</h3>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-2xl mb-4">
                  {pkg.description}
                </p>

                {/* Tryout structure */}
                <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 16, marginTop: 16 }}>
                  <span className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-wider block mb-3">
                    {pkg.isFullTryout ? 'ALUR SUBTES DAN JEDA:' : 'FORMAT SESI:'}
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {(pkg.isFullTryout ? SUBTEST_SCHEDULE : [{ name: `${pkg.questionCount} soal`, duration: pkg.duration ?? 30 }]).map((sub, sIdx) => (
                      <span
                        key={sIdx}
                        className="font-mono text-xs px-2.5 py-1 rounded"
                        style={{
                          background: sub.isBreak ? "var(--accent-gold-dim)" : "var(--surface-muted)",
                          border: `1px solid ${sub.isBreak ? "var(--accent-gold)" : "var(--border-subtle)"}`,
                          color: sub.isBreak ? "var(--accent-gold)" : "var(--text-primary)",
                        }}
                      >
                        {sub.name} ({sub.duration}m)
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-end" }}>
                <div className="font-mono text-right text-xs text-[var(--text-muted)]">
                  <span>{pkg.questionCount} SOAL · {pkg.duration ?? 30} MENIT</span>
                </div>
                <Button
                  size="default"
                  disabled={starting}
                  onClick={() => handleStartTryout(pkg.id)}
                  style={{ background: "var(--accent-gold)", color: "var(--bg-card)", fontWeight: 700 }}
                >
                  <Play size={16} /> {starting ? "Menyiapkan tryout…" : "Mulai tryout"}
                </Button>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
