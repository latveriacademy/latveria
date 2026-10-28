import pino from "pino";
import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../types";

export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "test" ? "silent" : "info"),
  base: {
    env: process.env.NODE_ENV || "development",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export const httpLogger = (): MiddlewareHandler<AppEnv> => {
  return async (c, next) => {
    // Skip health checks to keep logs clean
    if (c.req.path === "/api/health") {
      return next();
    }

    const start = performance.now();
    const method = c.req.method;
    const path = c.req.path;

    await next();

    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    const status = c.res.status;
    const user = c.get("user");

    const logData = {
      method,
      path,
      status,
      durationMs,
      userId: user?.id,
      ip: c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip") || undefined,
    };

    if (status >= 500) {
      logger.error(logData, `${method} ${path} ${status} - ${durationMs}ms`);
    } else if (status >= 400) {
      logger.warn(logData, `${method} ${path} ${status} - ${durationMs}ms`);
    } else {
      logger.info(logData, `${method} ${path} ${status} - ${durationMs}ms`);
    }
  };
};
