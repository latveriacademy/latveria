import { describe, expect, it, vi } from "vitest";
import { app } from "../app";

const { getSession } = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock("../lib/auth", () => ({
  getAuth: () => ({ api: { getSession } }),
}));

describe("LBE Vocabulary Backend Access", () => {
  it("rejects unauthenticated vocabulary access", async () => {
    getSession.mockResolvedValue(null);
    const learnerRes = await app.request("/api/learner/vocabulary");
    expect(learnerRes.status).toBe(401);

    const adminRes = await app.request("/api/admin/vocabulary");
    expect(adminRes.status).toBe(401);
  });

  it("enforces role separation on admin vocabulary endpoints", async () => {
    getSession.mockResolvedValue({
      user: { id: "learner-1", role: "user", name: "Learner", email: "learner@example.com" },
    });

    const res = await app.request("/api/admin/vocabulary", {
      method: "POST",
      headers: {
        Origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        term: "fortitude",
        definition: "Ketabahan hati menghadapi kesulitan",
        partOfSpeech: "noun",
      }),
    });
    expect(res.status).toBe(403);
  });

  it("validates input payload when creating vocabulary", async () => {
    getSession.mockResolvedValue({
      user: { id: "admin-1", role: "admin", name: "Admin", email: "admin@example.com" },
    });

    const invalidRes = await app.request("/api/admin/vocabulary", {
      method: "POST",
      headers: {
        Origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        term: "",
        definition: "",
      }),
    });
    expect(invalidRes.status).toBe(400);
  });
});
