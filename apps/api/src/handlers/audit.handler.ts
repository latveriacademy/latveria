import { Hono } from "hono";
import { getDb } from "../lib/db";
import { auditLogs } from "../lib/db/schema";
import { user as userTable } from "../lib/db/auth-schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { pagination } from "../lib/admin-query";

export const auditHandler = new Hono();

auditHandler.get("/api/admin/audit", async (c) => {
  const db = getDb();
  const { page, limit } = pagination(c.req.query());
  const action = c.req.query("action") ?? "";
  const targetType = c.req.query("target_type") ?? "";
  const adminId = c.req.query("admin_id") ?? "";

  const conditions = [];
  if (action) {
    conditions.push(eq(auditLogs.action, action));
  }
  if (targetType) {
    conditions.push(eq(auditLogs.targetType, targetType));
  }
  if (adminId) {
    conditions.push(eq(auditLogs.adminId, adminId));
  }

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  const total = Number(countResult[0]?.count ?? 0);

  // Get logs with admin email
  const offset = (page - 1) * limit;
  const logs = await db
    .select({
      id: auditLogs.id,
      adminId: auditLogs.adminId,
      action: auditLogs.action,
      targetType: auditLogs.targetType,
      targetId: auditLogs.targetId,
      details: auditLogs.details,
      createdAt: auditLogs.createdAt,
      adminEmail: userTable.email,
    })
    .from(auditLogs)
    .leftJoin(userTable, eq(auditLogs.adminId, userTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  const rows = logs.map((log) => ({
    id: log.id,
    adminId: log.adminId,
    adminEmail: log.adminEmail ?? "Unknown",
    action: log.action,
    targetType: log.targetType,
    targetId: log.targetId,
    details: log.details ?? {},
    createdAt: log.createdAt?.toISOString() ?? "",
  }));

  return c.json({
    rows,
    pagination: {
      page,
      limit,
      total,
      pageCount: Math.ceil(total / limit),
    },
  });
});

// Helper function to log admin actions (can be used by other handlers)
export async function logAuditAction(
  db: ReturnType<typeof getDb>,
  adminId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  details: Record<string, unknown> = {},
) {
  await db.insert(auditLogs).values({
    adminId,
    action,
    targetType,
    targetId,
    details,
  });
}
