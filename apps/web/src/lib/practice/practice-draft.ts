// ponytail: simpan dan pulihkan draft sesi latihan di browser per pengguna

const DRAFT_PREFIX = "latveria_practice_draft_";

function getStorage(): Storage | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    return null;
  }
  return null;
}

export function getPracticeDraftKey(ownerId: string): string {
  return `${DRAFT_PREFIX}${ownerId}`;
}

export interface PracticeDraftData {
  ownerId: string;
  submissionId: string;
  subjectId: string;
  subjectSlug: string;
  subjectName: string;
  subjectCode: string;
  packageId: string | null;
  packageName: string | null;
  mode: string;
  difficulty: string;
  totalQuestions: number;
  currentIndex: number;
  questions: Array<unknown>;
  answers: Record<number, string>;
  flagged: Record<number, boolean>;
  timeRemainingSeconds: number | null;
  isTimerRunning: boolean;
  startTime: number;
  savedAt: number;
  isEvaluated?: boolean;
  attemptId?: string | null;
}

export function savePracticeDraft(
  ownerId: string,
  session: Partial<PracticeDraftData> | null | undefined,
): boolean {
  if (!ownerId || !session || session.isEvaluated || session.attemptId) return false;
  const storage = getStorage();
  if (!storage) return false;
  try {
    const draft: PracticeDraftData = {
      ownerId,
      submissionId: session.submissionId || "",
      subjectId: session.subjectId || "",
      subjectSlug: session.subjectSlug || "",
      subjectName: session.subjectName || "",
      subjectCode: session.subjectCode || "",
      packageId: session.packageId ?? null,
      packageName: session.packageName ?? null,
      mode: session.mode || "Practice",
      difficulty: session.difficulty || "",
      totalQuestions: session.totalQuestions ?? (session.questions ? session.questions.length : 0),
      currentIndex: session.currentIndex ?? 0,
      questions: session.questions ?? [],
      answers: session.answers ?? {},
      flagged: session.flagged ?? {},
      timeRemainingSeconds: session.timeRemainingSeconds ?? null,
      isTimerRunning: session.isTimerRunning ?? false,
      startTime: session.startTime ?? Date.now(),
      savedAt: Date.now(),
    };
    storage.setItem(getPracticeDraftKey(ownerId), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function loadPracticeDraft(ownerId: string): PracticeDraftData | null {
  if (!ownerId) return null;
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(getPracticeDraftKey(ownerId));
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (!draft || typeof draft !== "object") return null;

    // Pastikan hanya pemilik asli yang dapat memulihkan draft
    if (draft.ownerId !== ownerId) return null;

    // Sesi yang sudah dievaluasi tidak boleh dipulihkan sebagai draft
    if (draft.isEvaluated || draft.attemptId) {
      clearPracticeDraft(ownerId);
      return null;
    }

    if (!Array.isArray(draft.questions) || draft.questions.length === 0) return null;

    return draft as PracticeDraftData;
  } catch {
    return null;
  }
}

export function clearPracticeDraft(ownerId: string): void {
  if (!ownerId) return;
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(getPracticeDraftKey(ownerId));
  } catch {
    // shortcut: abaikan kegagalan remove storage saat quota/akses dibatasi
  }
}
