import { generateId } from "better-auth";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { getDb } from "../lib/db";
import { account as accountTable, user as userTable } from "../lib/db/auth-schema";

export const userInputSchema = z.object({
  email: z.string().email("Format email tidak valid."),
  password: z.string().min(8, "Password minimal harus 8 karakter."),
  name: z.string().max(100).optional(),
  role: z.enum(["user", "admin"]).optional(),
});

export type UserInput = z.infer<typeof userInputSchema>;

export async function createAdminUser(db: ReturnType<typeof getDb>, input: UserInput) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const displayName = input.name?.trim() || normalizedEmail.split("@")[0];
  const userRole = input.role || "user";

  const [existing] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, normalizedEmail))
    .limit(1);

  if (existing) {
    throw new Error(`Email ${normalizedEmail} sudah terdaftar.`);
  }

  const userId = generateId();
  const accountId = generateId();
  const hashedPassword = await hashPassword(input.password);
  const now = new Date();

  await db.insert(userTable).values({
    id: userId,
    name: displayName,
    email: normalizedEmail,
    role: userRole,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(accountTable).values({
    id: accountId,
    accountId: userId,
    providerId: "credential",
    userId,
    password: hashedPassword,
    createdAt: now,
    updatedAt: now,
  });

  return { id: userId, email: normalizedEmail, name: displayName, role: userRole };
}

export async function bulkCreateAdminUsers(db: ReturnType<typeof getDb>, users: UserInput[]) {
  const created: Array<{ email: string; name: string; role: string }> = [];
  const failed: Array<{ email: string; reason: string }> = [];

  for (const item of users) {
    try {
      const res = await createAdminUser(db, item);
      created.push({ email: res.email, name: res.name, role: res.role });
    } catch (err) {
      failed.push({
        email: item.email,
        reason: err instanceof Error ? err.message : "Gagal membuat pengguna.",
      });
    }
  }

  return { created, failed };
}
