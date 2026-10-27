import { afterEach, expect, it, vi } from "vitest";
import { app } from "../app";

afterEach(() => vi.unstubAllEnvs());

it("reports the same registration setting used by production authentication", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("ALLOW_SIGN_UP", "false");
  const res1 = (await (await app.request("/api/auth/registration")).json()) as {
    enabled: boolean;
  };
  expect(res1.enabled).toBe(false);

  vi.stubEnv("ALLOW_SIGN_UP", "true");
  const res2 = (await (await app.request("/api/auth/registration")).json()) as {
    enabled: boolean;
  };
  expect(res2.enabled).toBe(true);
});
