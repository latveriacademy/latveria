import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Play, Layers } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Panel, PageHeading } from "../../components/ui/dashboard";
import { api } from "../../lib/api";
import { isBattleWorldPackage } from "../../lib/tryout/battle-world";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { SubmissionSummary } from "../../components/practice/submission-summary";
import {
  BattleWorldCatalog,
  type TryoutPackage,
} from "../../components/tryout/battle-world-catalog";
import { TryoutWorkspace, type TryoutSessionState } from "../../components/tryout/tryout-workspace";
import { TryoutReview } from "../../components/tryout/tryout-review";
import { TryoutResultView } from "../../components/tryout/tryout-result-view";
import { TryoutHistory } from "../../components/tryout/tryout-history";
import { useTryoutHistory } from "../../lib/tryout/use-tryout-history";
import { tryoutResultPath } from "../../lib/tryout/tryout-results";

export function BattleWorldView() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requestedResult = params.get("result");
  const history = useTryoutHistory();
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
  const [showSubmitSubtestModal, setShowSubmitSubtestModal] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [submittingSubtest, setSubmittingSubtest] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [actionError, setActionError] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const showHistory = params.get("history") === "1";
  const [timeSpentByQuestion, setTimeSpentByQuestion] = useState<Record<string, number>>({});
  const questionEnteredAt = useRef(Date.now());
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionLoadId = useRef(0);
  const latestDraftRef = useRef({
    answers: {} as Record<string, string>,
    flags: {} as Record<string, boolean>,
    questionTimes: {} as Record<string, number>,
    currentQuestionIndex: 0,
  });

  useEffect(
    () => () => {
      sessionLoadId.current++;
    },
    [requestedResult, showHistory],
  );
  useEffect(() => {
    const controller = new AbortController();
    api<TryoutPackage[]>("/learner/packages", { signal: controller.signal })
      .then((data) => setPackages(data.filter(isBattleWorldPackage)))
      .catch((error) => {
        if (!controller.signal.aborted)
          setCatalogError(error instanceof Error ? error.message : "Gagal memuat tryout.");
      });
    const savedSessionId = localStorage.getItem("latveria_tryout_session_id");
    if (savedSessionId && !requestedResult && !showHistory) {
      void loadSession(savedSessionId, { resumeOnly: true, signal: controller.signal });
    }
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!requestedResult) {
      if (activeSessionData?.session.state === "completed") {
        if (localStorage.getItem("latveria_tryout_session_id") === activeSessionData.session.id)
          localStorage.removeItem("latveria_tryout_session_id");
        setActiveSessionData(null);
        setActiveSessionId(localStorage.getItem("latveria_tryout_session_id"));
      }
      setReviewing(false);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    void loadSession(requestedResult, { resultOnly: true, signal: controller.signal });
    return () => controller.abort();
  }, [requestedResult]);
  useEffect(() => {
    if (showHistory) {
      setActiveSessionData(null);
      setReviewing(false);
      setLoading(false);
    }
  }, [showHistory]);

  const loadSession = async (
    sessionId: string,
    options: { resumeOnly?: boolean; resultOnly?: boolean; signal?: AbortSignal } = {},
  ) => {
    const requestId = ++sessionLoadId.current;
    const current = () => requestId === sessionLoadId.current && !options.signal?.aborted;
    setLoading(true);
    setActionError("");
    try {
      const data: TryoutSessionState = await api(`/learner/tryouts/${sessionId}`, {
        signal: options.signal,
      });
      if (!current()) return;
      if (options.resultOnly && data.session.state !== "completed")
        throw new Error("Hasil tersedia setelah Tryout selesai.");
      if (options.resumeOnly && data.session.state === "completed") {
        if (localStorage.getItem("latveria_tryout_session_id") === sessionId)
          localStorage.removeItem("latveria_tryout_session_id");
        setActiveSessionId(null);
        setActiveSessionData(null);
        return;
      }
      setActiveSessionData(data);
      setReviewing(false);
      setActiveSessionId(
        data.session.state === "completed"
          ? localStorage.getItem("latveria_tryout_session_id")
          : sessionId,
      );
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
      if (data.session.state === "active") setSubtestTimer(data.session.secondsRemaining);
    } catch (error) {
      if (!current()) return;
      if (!options.resultOnly && localStorage.getItem("latveria_tryout_session_id") === sessionId)
        localStorage.removeItem("latveria_tryout_session_id");
      setActiveSessionData(null);
      setActiveSessionId(localStorage.getItem("latveria_tryout_session_id"));
      setActionError(
        error instanceof Error ? error.message : "Sesi tryout tidak dapat dipulihkan.",
      );
    } finally {
      if (current()) setLoading(false);
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
      navigate("/dashboard?tab=tryout", { replace: true });
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

  const handleSelectAnswer = (qId: string, optIdx: number | string) => {
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
        status: "break" | "section_ready" | "completed";
        breakEndsAt?: string;
        score?: NonNullable<TryoutSessionState["score"]>;
      }>(`/learner/tryouts/${activeSessionData.session.id}/subtest-submit`, {
        method: "POST",
        body: JSON.stringify({ answers, timeSpentByQuestion: finalTimes }),
      });
      setShowSubmitSubtestModal(false);
      setActionError("");
      if (response.status === "completed") {
        history.reload();
        setActiveSessionData(null);
        setLoading(true);
        navigate(tryoutResultPath(activeSessionData.session.id), { replace: true });
      } else await loadSession(activeSessionData.session.id);
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
  const leaveResult = (toHistory = false) => {
    const id = activeSessionData?.session.id;
    if (localStorage.getItem("latveria_tryout_session_id") === id)
      localStorage.removeItem("latveria_tryout_session_id");
    setActiveSessionData(null);
    setReviewing(false);
    setActionError("");
    setActiveSessionId(localStorage.getItem("latveria_tryout_session_id"));
    navigate(`/dashboard?tab=tryout${toHistory ? "&history=1" : ""}`);
    history.reload();
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

  if (
    requestedResult &&
    (loading || !activeSessionData || activeSessionData.session.id !== requestedResult)
  )
    return (
      <div className="latveria-view-container">
        <PageHeading
          title="Hasil Tryout"
          actions={
            <Button variant="outline" onClick={() => leaveResult()}>
              Daftar Tryout
            </Button>
          }
        />
        <Panel>
          {actionError ? (
            <div role="alert">
              <p>{actionError}</p>
              <Button onClick={() => void loadSession(requestedResult, { resultOnly: true })}>
                Coba lagi
              </Button>
            </div>
          ) : (
            <p role="status">Memuat hasil tersimpan…</p>
          )}
        </Panel>
      </div>
    );
  // 1. ACTIVE TRYOUT SESSION UI
  if (activeSessionData && (activeSessionData.session.state !== "completed" || requestedResult)) {
    const { session, currentSubtest, questions } = activeSessionData;

    // SCENARIO A: SECTION READY / TRANSITION STATE (NO FORCED BREAK)
    if (session.state === "section_ready" || session.state === "break") {
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
            <Layers size={44} style={{ color: "var(--accent-gold)" }} />
            <span className="font-mono text-xs uppercase tracking-widest text-[var(--gold)]">
              Subtes Selesai
            </span>
            <h2 className="font-serif text-3xl font-semibold text-[var(--ink)]">
              Siap Melanjutkan Subtes Berikutnya?
            </h2>
            <p className="text-[var(--text-secondary)] text-sm max-w-lg leading-relaxed">
              Subtes sebelumnya berhasil dikumpulkan dan tersimpan aman. Kamu dapat langsung memulai
              subtes berikutnya sekarang atau beristirahat sejenak dan melanjutkannya nanti.
            </p>

            <div
              style={{
                background: "var(--surface-muted)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "16px 28px",
                margin: "12px 0",
              }}
            >
              <span className="font-mono text-xs text-[var(--text-muted)] block mb-1">
                SUBTES SELANJUTNYA
              </span>
              <span className="font-serif text-xl font-bold text-[var(--ink)]">
                {currentSubtest?.name || "Subtes Berikutnya"}
              </span>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <Button variant="outline" onClick={handleExitTryout}>
                Nanti Saja (Simpan)
              </Button>
              <Button onClick={handleEndBreak} disabled={loading} className="btn-gold-solid">
                <Play size={16} /> Mulai Sekarang
              </Button>
            </div>
          </Panel>
          {exitDialog}
        </div>
      );
    }

    // SCENARIO B: COMPLETED STATE
    if (session.state === "completed") {
      if (reviewing)
        return <TryoutReview data={activeSessionData} onBack={() => setReviewing(false)} />;
      return (
        <TryoutResultView
          data={activeSessionData}
          onBack={() => leaveResult()}
          onReview={() => setReviewing(true)}
          onHistory={() => leaveResult(true)}
        />
      );
    }

    // SCENARIO C: ACTIVE SUBTEST QUESTION ENGINE
    const totalQ = questions.length;
    const answeredCount = Object.keys(answers).length;

    return (
      <div className="latveria-view-container question-view-active mode-practice motion-page-enter">
        <TryoutWorkspace
          data={activeSessionData}
          currentIndex={currentQIndex}
          answers={answers}
          flags={flags}
          time={formatSeconds(subtestTimer)}
          timerWarning={subtestTimer < 120}
          pending={submittingSubtest || loading}
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

  if (showHistory)
    return (
      <TryoutHistory
        rows={history.rows}
        loading={history.loading}
        error={history.error}
        onReload={history.reload}
        onBack={() => navigate("/dashboard?tab=tryout")}
        onOpen={(id) => navigate(tryoutResultPath(id))}
      />
    );
  return (
    <BattleWorldCatalog
      packages={packages}
      catalogError={catalogError}
      actionError={actionError}
      starting={starting}
      activeSessionId={activeSessionId}
      onStart={handleStartTryout}
      onResume={(id) => {
        navigate("/dashboard?tab=tryout", { replace: true });
        void loadSession(id, { resumeOnly: true });
      }}
      onHistory={() => navigate("/dashboard?tab=tryout&history=1")}
      history={history.rows}
      historyLoading={history.loading}
      historyError={history.error}
      onReloadHistory={history.reload}
    />
  );
}
