import { createMiddleware } from "hono/factory";
import { logAuditAction } from "./audit.handler";
import { getDb } from "../lib/db";
import type { AppEnv } from "../types";

export const adminAudit = createMiddleware<AppEnv>(async (c, next) => {
  await next();
  if (!c.res.ok || (["GET", "HEAD"].includes(c.req.method) && !c.req.path.includes("/export")))
    return;
  const segments = c.req.path.split("/").slice(3);
  const resources: Record<string, string> = {
    users: "user",
    questions: "question",
    packages: "package",
    subtests: "package",
    topics: "topic",
    tryouts: "tryout",
    reports: "report",
    affirmations: "affirmation",
    config: "config",
    export: segments[1],
  };
  const resource = resources[segments[0]] ?? segments[0];
  const actions: Record<string, string> = {
    POST: "created",
    PUT: "updated",
    PATCH: "updated",
    DELETE: "deleted",
    GET: "exported",
  };
  const action = segments.includes("import")
    ? "imported"
    : segments.includes("reset")
      ? "progress_reset"
      : segments.includes("flags")
        ? "flag_changed"
        : segments.includes("bulk-action")
          ? "bulk_action"
          : segments.includes("deactivate")
            ? "status_changed"
            : actions[c.req.method];
  await logAuditAction(
    getDb(),
    c.get("user").id,
    `${resource}.${action}`,
    resource,
    segments[0] === "export" ? null : (segments[1] ?? null),
    { method: c.req.method, path: c.req.path },
  );
});
