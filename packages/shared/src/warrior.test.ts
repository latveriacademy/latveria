import { describe, expect, it } from "vitest";
import {
  createBattleSchema,
  joinBattleSchema,
  battleActiveQuestionSchema,
  clientWsMessageSchema,
  serverWsMessageSchema,
} from "./warrior";

describe("Warrior Battle Shared Schemas", () => {
  it("validates createBattleSchema with defaults and constraints", () => {
    const defaultVal = createBattleSchema.parse({});
    expect(defaultVal.mode).toBe("1v1");
    expect(defaultVal.questionCount).toBe(5);
    expect(defaultVal.timePerQuestionSeconds).toBe(20);

    const custom = createBattleSchema.parse({
      mode: "2v2",
      questionCount: 10,
      timePerQuestionSeconds: 30,
    });
    expect(custom.mode).toBe("2v2");
    expect(custom.questionCount).toBe(10);

    expect(() => createBattleSchema.parse({ questionCount: 0 })).toThrow();
    expect(() => createBattleSchema.parse({ questionCount: 11 })).toThrow();
  });

  it("normalizes room code to uppercase", () => {
    const res = joinBattleSchema.parse({ code: "x7k4p" });
    expect(res.code).toBe("X7K4P");
  });

  it("validates active question payload does not require answers or explanations", () => {
    const q = battleActiveQuestionSchema.parse({
      id: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      position: 1,
      prompt: "Berapakah 2 + 2?",
      questionType: "single_choice",
      options: ["1", "2", "3", "4", "5"],
      startedAt: new Date().toISOString(),
      deadlineAt: new Date().toISOString(),
      durationSeconds: 20,
    });
    expect(q.options).toHaveLength(5);
    expect((q as Record<string, unknown>).correctAnswer).toBeUndefined();
  });

  it("validates client and server WS messages", () => {
    const clientMsg = clientWsMessageSchema.parse({
      type: "battle:ready",
      isReady: true,
    });
    expect(clientMsg.type).toBe("battle:ready");

    const serverMsg = serverWsMessageSchema.parse({
      type: "battle:countdown",
      countdownEndsAt: new Date().toISOString(),
      secondsRemaining: 3,
    });
    expect(serverMsg.type).toBe("battle:countdown");
  });
});
