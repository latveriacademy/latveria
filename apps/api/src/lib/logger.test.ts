import { expect, it, vi } from "vitest";
import { Hono } from "hono";
import { httpLogger, logger } from "./logger";

it("exports pino logger instance", () => {
  expect(logger).toBeDefined();
  expect(typeof logger.info).toBe("function");
  expect(typeof logger.warn).toBe("function");
  expect(typeof logger.error).toBe("function");
});

it("httpLogger logs requests and responses", async () => {
  const app = new Hono();
  const infoSpy = vi.spyOn(logger, "info");
  app.use("*", httpLogger());
  app.get("/test", (c) => c.text("ok"));

  const res = await app.request("/test");
  expect(res.status).toBe(200);
  expect(infoSpy).toHaveBeenCalled();
  infoSpy.mockRestore();
});

it("httpLogger skips health endpoint", async () => {
  const app = new Hono();
  const infoSpy = vi.spyOn(logger, "info");
  app.use("*", httpLogger());
  app.get("/api/health", (c) => c.json({ status: "ok" }));

  const res = await app.request("/api/health");
  expect(res.status).toBe(200);
  expect(infoSpy).not.toHaveBeenCalled();
  infoSpy.mockRestore();
});
