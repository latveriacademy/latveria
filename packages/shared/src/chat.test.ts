import { describe, expect, it } from "vitest";
import { sendChatMessageSchema } from "./chat";

describe("chat schemas", () => {
  it("validates valid message", () => {
    const res = sendChatMessageSchema.safeParse({ message: "Halo pejuang UTBK!" });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.message).toBe("Halo pejuang UTBK!");
    }
  });

  it("trims message and rejects empty string", () => {
    const res = sendChatMessageSchema.safeParse({ message: "   " });
    expect(res.success).toBe(false);
  });

  it("rejects message exceeding 1000 characters", () => {
    const res = sendChatMessageSchema.safeParse({ message: "a".repeat(1001) });
    expect(res.success).toBe(false);
  });

  it("accepts recipientId for direct messages", () => {
    const res = sendChatMessageSchema.safeParse({
      message: "Semangat latihan!",
      recipientId: "usr_123",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.recipientId).toBe("usr_123");
    }
  });
});
