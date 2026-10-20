import { afterEach, expect, it, vi } from "vitest";
import { app } from "../app";

afterEach(() => vi.unstubAllEnvs());

it("reports the same registration setting used by production authentication", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("ALLOW_SIGN_UP", "false");
  expect(await (await app.request("/api/auth/registration")).json()).toEqual({ enabled: false });

  vi.stubEnv("ALLOW_SIGN_UP", "true");
  expect(await (await app.request("/api/auth/registration")).json()).toEqual({ enabled: true });
});
