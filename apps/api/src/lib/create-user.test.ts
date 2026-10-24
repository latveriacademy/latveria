import { describe, expect, it } from "vitest";
import { createUser } from "../../scripts/create-user";

describe("createUser validation", () => {
  it("rejects invalid email formats", async () => {
    await expect(createUser({ email: "invalid-email", password: "Password123!" })).rejects.toThrow(
      "Format email tidak valid.",
    );
  });

  it("rejects password shorter than 8 characters", async () => {
    await expect(createUser({ email: "user@example.com", password: "short" })).rejects.toThrow(
      "Password minimal harus 8 karakter.",
    );
  });

  it("rejects roles other than user or admin", async () => {
    await expect(
      createUser({ email: "user@example.com", password: "Password123!", role: "superuser" }),
    ).rejects.toThrow("Role hanya boleh 'user' atau 'admin'.");
  });
});
