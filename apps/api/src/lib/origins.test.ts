import { afterEach, expect, it, vi } from "vitest";
import { allowedOrigins } from "./origins";

afterEach(() => vi.unstubAllEnvs());

it("trusts configured localhost, loopback alias, and exact HTTPS tunnel during development", () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
  vi.stubEnv("DEV_TUNNEL_ORIGIN", "https://latveria.dorrit.dev");
  expect(allowedOrigins()).toEqual([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://latveria.dorrit.dev",
  ]);
  vi.stubEnv("DEV_TUNNEL_ORIGIN", "http://latveria.dorrit.dev");
  expect(allowedOrigins).toThrow("DEV_TUNNEL_ORIGIN");
});

it("does not trust development tunnel in production", () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("BETTER_AUTH_URL", "https://latveria.example.com");
  vi.stubEnv("DEV_TUNNEL_ORIGIN", "https://latveria.dorrit.dev");
  expect(allowedOrigins()).toEqual(["https://latveria.example.com"]);
});
