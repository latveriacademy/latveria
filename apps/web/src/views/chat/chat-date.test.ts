import { describe, expect, it } from "vitest";
import {
  formatChatDividerDate,
  formatFullTimestamp,
  formatMessageTime,
  isDifferentDay,
} from "./chat-date";

describe("chat-date helpers", () => {
  const ref = new Date("2026-11-04T12:00:00Z");

  it("identifies different calendar days correctly", () => {
    expect(isDifferentDay("2026-11-04T10:00:00Z", undefined)).toBe(true);
    expect(isDifferentDay("2026-11-04T10:00:00Z", "2026-11-04T08:00:00Z")).toBe(false);
    expect(isDifferentDay("2026-11-04T10:00:00Z", "2026-11-03T10:00:00Z")).toBe(true);
  });

  it("formats date dividers as 'Hari Ini', 'Kemarin', or short date", () => {
    expect(formatChatDividerDate("2026-11-04T05:00:00Z", ref)).toBe("Hari Ini");
    expect(formatChatDividerDate("2026-11-03T05:00:00Z", ref)).toBe("Kemarin");
    expect(formatChatDividerDate("2026-10-25T05:00:00Z", ref)).toContain("Okt");
  });

  it("formats message time in HH:mm", () => {
    const formatted = formatMessageTime("2026-11-04T09:49:00Z");
    expect(formatted).toMatch(/\d{2}[:.]\d{2}/);
  });

  it("formats full timestamp with weekday and date", () => {
    const full = formatFullTimestamp("2026-11-04T09:49:00Z");
    expect(full).toBeDefined();
    expect(full.length).toBeGreaterThan(10);
  });
});
