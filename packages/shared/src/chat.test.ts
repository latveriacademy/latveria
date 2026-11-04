import { describe, expect, it } from "vitest";
import { editChatMessageSchema, sendChatMessageSchema } from "./chat";

describe("chat schemas", () => {
  it("validates valid message", () => {
    const res = sendChatMessageSchema.safeParse({ message: "Halo pejuang UTBK!" });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.message).toBe("Halo pejuang UTBK!");
    }
  });

  it("trims message and rejects empty string when no media is provided", () => {
    const res = sendChatMessageSchema.safeParse({ message: "   " });
    expect(res.success).toBe(false);
  });

  it("accepts message with mediaUrl even if message text is empty", () => {
    const res = sendChatMessageSchema.safeParse({
      message: "",
      mediaUrl: "/api/chat/media/image123.png",
    });
    expect(res.success).toBe(true);
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

  it("validates editChatMessageSchema correctly", () => {
    expect(editChatMessageSchema.safeParse({ message: "Pesan revisi" }).success).toBe(true);
    expect(editChatMessageSchema.safeParse({ message: "   " }).success).toBe(false);
    expect(editChatMessageSchema.safeParse({ message: "b".repeat(1001) }).success).toBe(false);
  });
});
