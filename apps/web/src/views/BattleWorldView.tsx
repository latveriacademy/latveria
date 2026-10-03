import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, CheckCircle2, Play, Coffee } from "lucide-react";
import { Button } from "../components/ui/button";
import { Panel } from "../components/ui/dashboard";
import { api } from "../lib/api";
import { ConfirmDialog } from "../components/confirm-dialog";
import { SubmissionSummary } from "../components/submission-summary";
import { BattleWorldCatalog, type TryoutPackage } from "../components/battle-world-catalog";
import { TryoutWorkspace, type TryoutSessionState } from "../components/tryout-workspace";

export function BattleWorldView() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<TryoutPackage[]>([]);
  const [activeSessionData, setActiveSessionData] = useState<TryoutSessionState | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() =>
    typeof localStorage !== "undefined" ? localStorage.getItem("latveria_tryout_session_id") : null,
  );
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [subtestTimer, setSubtestTimer] = useState<number>(30 * 60);
  const [breakTimer, setBreakTimer] = useState<number>(15 * 60);
  const [showSubmitSubtestModal, setShowSubmitSubtestModal] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [submittingSubtest, setSubmittingSubtest] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [actionError, setActionError] = useState("");
  const [result, setResult] = useState<TryoutSessionState["score"]>(null);
  const [timeSpentByQuestion, setTimeSpentByQuestion] = useState<Record<string, number>>({});
  const questionEnteredAt = useRef(Date.now());
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDraftRef = useRef({
    answers: {} as Record<string, string>,
    flags: {} as Record<string, boolean>,
    questionTimes: {} as Record<string, number>,
    currentQuestionIndex: 0,
  });

  useEffect(() => {
    const controller = new AbortController();
    api<TryoutPackage[]>("/learner/packages", { signal: controller.signal })
      .then((data) =>
        setPackages(
          data.filter(
            (pkg) =>
              pkg.published &&
              pkg.questionCount > 0 &&
              (pkg.isFullTryout || pkg.packageType?.includes("Simulasi")),
          ),
        ),
      )
      .catch((error) => {
        if (!controller.signal.aborted)
          setCatalogError(error instanceof Error ? error.message : "Gagal memuat tryout.");
      });
    const savedSessionId = localStorage.getItem("latveria_tryout_session_id");
    if (savedSessionId) {
      void loadSession(savedSessionId);
    }
    return () => controller.abort();
  }, []);

  const loadSession = async (sessionId: string) => {
    setLoading(true);
    try {
      const data: TryoutSessionState = await api(`/learner/tryouts/${sessionId}`);
      setActiveSessionData(data);
      setActiveSessionId(sessionId);
      setAnswers(data.session.answers || {});
      setFlags(data.session.flags || {});
      setTimeSpentByQuestion(data.session.questionTimes || {});
      setCurrentQIndex(data.session.currentQuestionIndex || 0);
      latestDraftRef.current = {
        answers: data.session.answers || {},
        flags: data.session.flags || {},
        questionTimes: data.session.questionTimes || {},
        currentQuestionIndex: data.session.currentQuestionIndex || 0,
      };
      if (data.session.state === "completed") setResult(data.score ?? null);

      if (data.session.state === "break") setBreakTimer(data.session.secondsRemaining);
      else setSubtestTimer(data.session.secondsRemaining);
    } catch (error) {
      localStorage.removeItem("latveria_tryout_session_id");
      setActiveSessionData(null);
      setActiveSessionId(null);
      setActionError(
        error instanceof Error ? error.message : "Sesi tryout tidak dapat dipulihkan.",
      );
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
  }, [
    activeSessionData?.session.state,
    activeSessionData?.session.id,
    activeSessionData?.session.currentSubtestIndex,
  ]);

  // Handle start new tryout
  const handleStartTryout = async (packageId: string) => {
    setStarting(true);
    try {
      const newSession = await api<{ id: string }>(`/learner/tryouts/start/${packageId}`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      localStorage.setItem("latveria_tryout_session_id", newSession.id);
      setActiveSessionId(newSession.id);
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
      void api(`/learner/tryouts/${activeSessionData.session.id}/autosave`, {
        method: "POST",
        body: JSON.stringify(draft),
      })
        .then(() => setActionError(""))
        .catch(() => setActionError("Autosave tertunda. Periksa koneksi sebelum lanjut."));
    }, 400);
  };

  const handleSelectAnswer = (qId: string, optIdx: number) => {
    const questionTime =
      (timeSpentByQuestion[qId] ?? 0) +
      Math.max(0, Math.round((Date.now() - questionEnteredAt.current) / 1000));
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
    const nextTimes = questionId
      ? {
          ...timeSpentByQuestion,
          [questionId]:
            (timeSpentByQuestion[questionId] ?? 0) +
            Math.max(0, Math.round((Date.now() - questionEnteredAt.current) / 1000)),
        }
      : timeSpentByQuestion;
    setTimeSpentByQuestion(nextTimes);
    setCurrentQIndex(index);
    questionEnteredAt.current = Date.now();
    triggerAutosave({
      ...latestDraftRef.current,
      questionTimes: nextTimes,
      currentQuestionIndex: index,
    });
  };

  useEffect(() => {
    questionEnteredAt.current = Date.now();
  }, [currentQIndex, activeSessionData?.session.currentSubtestIndex]);

  // Submit current subtest
  const handleSubmitSubtest = async () => {
    if (!activeSessionData) return;
    setSubmittingSubtest(true);
    try {
      const questionId = activeSessionData.questions[currentQIndex]?.id;
      const finalTimes = questionId
        ? {
            ...timeSpentByQuestion,
            [questionId]:
              (timeSpentByQuestion[questionId] ?? 0) +
              Math.max(0, Math.round((Date.now() - questionEnteredAt.current) / 1000)),
          }
        : timeSpentByQuestion;
      if (autosaveRef.current) {
        clearTimeout(autosaveRef.current);
        autosaveRef.current = null;
      }
      latestDraftRef.current = { ...latestDraftRef.current, answers, questionTimes: finalTimes };
      const response = await api<{
        status: "break" | "completed";
        breakEndsAt?: string;
        score?: NonNullable<TryoutSessionState["score"]>;
      }>(`/learner/tryouts/${activeSessionData.session.id}/subtest-submit`, {
        method: "POST",
        body: JSON.stringify({ answers, timeSpentByQuestion: finalTimes }),
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
      await api(`/learner/tryouts/${activeSessionData.session.id}/advance`, {
        method: "POST",
      });
      await loadSession(activeSessionData.session.id);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Gagal melanjutkan ke subtes berikutnya.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExitTryout = () => {
    setShowExitDialog(true);
  };

  const exitDialog = (
    <ConfirmDialog
      open={showExitDialog}
      onOpenChange={setShowExitDialog}
      title="Keluar dari Battle World?"
      description="Progres sesi aktif tersimpan dan bisa dilanjutkan nanti."
      confirmLabel="Simpan & keluar"
      pending={submittingSubtest || loading}
      onConfirm={() => {
        setShowExitDialog(false);
        setActiveSessionData(null);
        if (window.innerWidth <= 768)
          window.history.replaceState(null, "", "/dashboard?tab=tryout");
      }}
    />
  );

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // 1. ACTIVE TRYOUT SESSION UI
  if (activeSessionData) {
    const { session, currentSubtest, questions } = activeSessionData;

    // SCENARIO A: BREAK STATE
    if (session.state === "break") {
      return (
        <div
          className="latveria-view-container motion-fade-in"
          style={{ maxWidth: 800, margin: "40px auto" }}
        >
          <Panel
            style={{
              textAlign: "center",
              padding: "48px 32px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
            }}
          >
            <Coffee size={44} style={{ color: "var(--accent-gold)" }} />
            <span className="font-mono text-xs uppercase tracking-widest text-[var(--gold)]">
              Jeda Resmi Ujian
            </span>
            <h2 className="font-serif text-3xl font-semibold text-[var(--ink)]">
              Sesi Istirahat Antar-Subtes
            </h2>
            <p className="text-[var(--text-secondary)] text-sm max-w-lg leading-relaxed">
              Kamu telah menyelesaikan subtes sebelumnya dengan baik. Gunakan waktu istirahat ini
              untuk menarik napas sejenak, merilekskan mata, atau minum air.
            </p>

            <div
              style={{
                background: "var(--surface-muted)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "16px 28px",
                margin: "16px 0",
              }}
            >
              <span className="font-mono text-xs text-[var(--text-muted)] block mb-1">
                SISA WAKTU ISTIRAHAT
              </span>
              <span className="font-mono text-3xl font-bold text-[var(--ink)]">
                {formatSeconds(breakTimer)}
              </span>
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
          {exitDialog}
        </div>
      );
    }

    // SCENARIO B: COMPLETED STATE
    if (session.state === "completed") {
      return (
        <div
          className="latveria-view-container motion-fade-in"
          style={{ maxWidth: 800, margin: "40px auto" }}
        >
          <Panel
            style={{
              textAlign: "center",
              padding: "48px 32px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
            }}
          >
            <CheckCircle2 size={48} style={{ color: "#10b981" }} />
            <span className="font-mono text-xs uppercase tracking-widest text-[var(--gold)]">
              Battle World selesai
            </span>
            <h2 className="font-serif text-3xl font-semibold text-[var(--ink)]">
              Selamat! Kamu Telah Menuntaskan Tryout
            </h2>
            <p className="text-[var(--text-secondary)] text-sm max-w-lg leading-relaxed">
              {result
                ? `Skor Latveria ${result.score}/1.000 · Akurasi ${result.accuracy}% · ${result.correctCount}/${result.totalCount} benar.`
                : "Jawabanmu sudah tersimpan."}
            </p>

            <Button
              onClick={() => {
                localStorage.removeItem("latveria_tryout_session_id");
                setActiveSessionData(null);
                setActiveSessionId(null);
                navigate("/dashboard?tab=tryout");
              }}
            >
              Kembali ke Battle World <ArrowRight size={16} />
            </Button>
          </Panel>
        </div>
      );
    }

    // SCENARIO C: ACTIVE SUBTEST QUESTION ENGINE
    const totalQ = questions.length;
    const answeredCount = Object.keys(answers).length;

    return (
      <div className="latveria-view-container motion-page-enter">
        <TryoutWorkspace
          data={activeSessionData}
          currentIndex={currentQIndex}
          answers={answers}
          flags={flags}
          time={formatSeconds(subtestTimer)}
          timerWarning={subtestTimer < 120}
          pending={submittingSubtest}
          onExit={handleExitTryout}
          onSubmit={() => setShowSubmitSubtestModal(true)}
          onAnswer={handleSelectAnswer}
          onFlag={handleToggleFlag}
          onJump={navigateQuestion}
        />

        {/* Subtest Submit Modal */}
        <ConfirmDialog
          open={showSubmitSubtestModal}
          onOpenChange={setShowSubmitSubtestModal}
          title={`Selesaikan subtes ${currentSubtest.name}?`}
          description="Jawaban untuk subtes ini akan dikunci dan kamu akan beralih ke sesi berikutnya."
          confirmLabel="Konfirmasi & Kumpulkan"
          pending={submittingSubtest}
          error={actionError}
          onConfirm={handleSubmitSubtest}
        >
          <SubmissionSummary total={totalQ} answered={answeredCount} />
        </ConfirmDialog>
        {exitDialog}
      </div>
    );
  }

  return (
    <BattleWorldCatalog
      packages={packages}
      catalogError={catalogError}
      actionError={actionError}
      starting={starting}
      activeSessionId={activeSessionId}
      onStart={handleStartTryout}
      onResume={loadSession}
    />
  );
}
