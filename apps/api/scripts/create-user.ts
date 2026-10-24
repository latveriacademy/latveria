import { generateId } from "better-auth";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { account, user } from "../src/lib/db/auth-schema";
import { getDatabaseUrl } from "../src/lib/env";

export async function createUser({
  email,
  password,
  name,
  role = "user",
}: {
  email: string;
  password: string;
  name?: string;
  role?: string;
}) {
  const normalizedEmail = email.trim().toLowerCase();
  const displayName = name?.trim() || normalizedEmail.split("@")[0];
  const userRole = role.trim().toLowerCase();

  if (!normalizedEmail.includes("@") || !normalizedEmail.includes(".")) {
    throw new Error("Format email tidak valid.");
  }
  if (password.length < 8) {
    throw new Error("Password minimal harus 8 karakter.");
  }
  if (userRole !== "user" && userRole !== "admin") {
    throw new Error("Role hanya boleh 'user' atau 'admin'.");
  }

  const url = getDatabaseUrl("DATABASE_URL");
  const hostname = new URL(url).hostname;
  if (
    !["localhost", "127.0.0.1", "postgres"].includes(hostname) &&
    !url.includes("pooler.supabase")
  ) {
    throw new Error("Pembuatan user hanya tersedia untuk database lokal, docker, atau Supabase.");
  }

  const client = postgres(url, { max: 1, prepare: false });
  try {
    const db = drizzle(client);
    const [existing] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, normalizedEmail))
      .limit(1);

    if (existing) {
      throw new Error(`User dengan email ${normalizedEmail} sudah terdaftar.`);
    }

    const userId = generateId();
    const accountId = generateId();
    const hashedPassword = await hashPassword(password);
    const now = new Date();

    await db.insert(user).values({
      id: userId,
      name: displayName,
      email: normalizedEmail,
      role: userRole,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(account).values({
      id: accountId,
      accountId: userId,
      providerId: "credential",
      userId,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    });

    return { id: userId, email: normalizedEmail, name: displayName, role: userRole };
  } finally {
    await client.end({ timeout: 5 });
  }
}

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4];
  const role = process.argv[5];

  if (!email || !password) {
    throw new Error("Gunakan: bun run db:user <email> <password> [nama] [role=user|admin]");
  }

  const result = await createUser({ email, password, name, role });
  console.info(
    `Akun ${result.email} (${result.name}) dengan role '${result.role}' berhasil dibuat.`,
  );
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Pembuatan user gagal.");
    process.exitCode = 1;
  });
}
