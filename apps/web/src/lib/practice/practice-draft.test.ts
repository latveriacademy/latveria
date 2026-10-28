import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPracticeDraft,
  getPracticeDraftKey,
  loadPracticeDraft,
  savePracticeDraft,
} from "./practice-draft";

describe("practice-draft", () => {
  let mockStore: Record<string, string> = {};

  const fakeStorage = {
    getItem: (key: string) => mockStore[key] ?? null,
    setItem: (key: string, value: string) => {
      mockStore[key] = String(value);
    },
    removeItem: (key: string) => {
      delete mockStore[key];
    },
    clear: () => {
      mockStore = {};
    },
    key: () => null,
    length: 0,
  };

  beforeEach(() => {
    mockStore = {};
    vi.stubGlobal("localStorage", fakeStorage);
    vi.stubGlobal("window", { localStorage: fakeStorage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const mockSession = {
    submissionId: "sub-123",
    subjectId: "PK",
    subjectSlug: "pengetahuan-kuantitatif",
    subjectName: "Pengetahuan Kuantitatif",
    subjectCode: "SNBT-PK",
    packageId: "pkg-1",
    packageName: "Paket Dasar",
    mode: "Practice",
    difficulty: "Latverian Elite",
    totalQuestions: 2,
    currentIndex: 1,
    questions: [
      { id: "q1", prompt: "Soal 1", options: [] },
      { id: "q2", prompt: "Soal 2", options: [] },
    ],
    answers: { 0: "A", 1: "C" },
    flagged: { 1: true },
    timeRemainingSeconds: 180,
    isTimerRunning: false,
    startTime: 1000000,
  };

  it("saves draft under user-scoped storage key and restores correctly", () => {
    const ok = savePracticeDraft("user-alpha", mockSession);
    expect(ok).toBe(true);

    const storedKey = getPracticeDraftKey("user-alpha");
    expect(fakeStorage.getItem(storedKey)).not.toBeNull();

    const restored = loadPracticeDraft("user-alpha");
    expect(restored).not.toBeNull();
    expect(restored?.ownerId).toBe("user-alpha");
    expect(restored?.answers).toEqual({ 0: "A", 1: "C" });
    expect(restored?.flagged).toEqual({ 1: true });
    expect(restored?.currentIndex).toBe(1);
    expect(restored?.questions.length).toBe(2);
  });

  it("does not allow user B to access user A's draft", () => {
    savePracticeDraft("user-alpha", mockSession);

    const otherUserDraft = loadPracticeDraft("user-beta");
    expect(otherUserDraft).toBeNull();
  });

  it("does not save session if it is already evaluated or has attemptId", () => {
    const evaluatedSession = { ...mockSession, isEvaluated: true };
    expect(savePracticeDraft("user-alpha", evaluatedSession)).toBe(false);

    const attemptSession = { ...mockSession, attemptId: "attempt-456" };
    expect(savePracticeDraft("user-alpha", attemptSession)).toBe(false);

    expect(loadPracticeDraft("user-alpha")).toBeNull();
  });

  it("clears evaluated drafts if found during load", () => {
    const key = getPracticeDraftKey("user-alpha");
    fakeStorage.setItem(
      key,
      JSON.stringify({ ...mockSession, ownerId: "user-alpha", isEvaluated: true }),
    );

    const restored = loadPracticeDraft("user-alpha");
    expect(restored).toBeNull();
    expect(fakeStorage.getItem(key)).toBeNull();
  });

  it("handles storage write failure gracefully without throwing", () => {
    vi.spyOn(fakeStorage, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    const ok = savePracticeDraft("user-alpha", mockSession);
    expect(ok).toBe(false);
  });

  it("clears draft on clearPracticeDraft", () => {
    savePracticeDraft("user-alpha", mockSession);
    expect(loadPracticeDraft("user-alpha")).not.toBeNull();

    clearPracticeDraft("user-alpha");
    expect(loadPracticeDraft("user-alpha")).toBeNull();
  });
});
