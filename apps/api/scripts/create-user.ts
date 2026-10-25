import { existsSync, readFileSync } from "node:fs";
import { generateId } from "better-auth";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { account, user } from "../src/lib/db/auth-schema";
import { getDatabaseUrl } from "../src/lib/env";

export interface UserInput {
  email: string;
  password: string;
  name?: string;
  role?: string;
}

export function parseCsvUsers(content: string): UserInput[] {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  // Parse header
  const header = lines[0].split(",").map((c) => c.trim().toLowerCase().replaceAll('"', ""));
  const emailIdx = header.indexOf("email");
  const passwordIdx = header.indexOf("password");
  const nameIdx = header.indexOf("name");
  const roleIdx = header.indexOf("role");

  if (emailIdx === -1 || passwordIdx === -1) {
    throw new Error("File CSV harus memiliki kolom 'email' dan 'password'.");
  }

  const users: UserInput[] = [];
  for (let i = 1; i < lines.length; i++) {
    // Simple CSV row parser handling quotes
    const row: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        row.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    row.push(current.trim());

    const email = row[emailIdx]?.replaceAll('"', "");
    const password = row[passwordIdx]?.replaceAll('"', "");
    const name = nameIdx !== -1 ? row[nameIdx]?.replaceAll('"', "") : undefined;
    const role = roleIdx !== -1 ? row[roleIdx]?.replaceAll('"', "") : undefined;

    if (email && password) {
      users.push({ email, password, name, role });
    }
  }

  return users;
}

export function parseJsonUsers(content: string): UserInput[] {
  const data = JSON.parse(content);
  if (!Array.isArray(data)) {
    throw new Error("File JSON harus berisi array of objects dengan properti email dan password.");
  }
  return data.map((item) => {
    if (!item.email || !item.password) {
      throw new Error("Setiap objek user wajib memiliki email dan password.");
    }
    return {
      email: String(item.email),
      password: String(item.password),
      name: item.name ? String(item.name) : undefined,
      role: item.role ? String(item.role) : undefined,
    };
  });
}

export async function createUser({ email, password, name, role = "user" }: UserInput) {
  const normalizedEmail = email.trim().toLowerCase();
  const displayName = name?.trim() || normalizedEmail.split("@")[0];
  const userRole = role?.trim().toLowerCase() || "user";

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

async function handleFileImport(filePath: string) {
  if (!existsSync(filePath)) {
    throw new Error(`File ${filePath} tidak ditemukan.`);
  }

  const content = readFileSync(filePath, "utf-8");
  const isJson = filePath.endsWith(".json");
  const isCsv = filePath.endsWith(".csv");

  if (!isJson && !isCsv) {
    throw new Error("Format file harus .csv atau .json");
  }

  const users = isJson ? parseJsonUsers(content) : parseCsvUsers(content);
  if (users.length === 0) {
    console.info("Tidak ada data pengguna yang ditemukan dalam file.");
    return;
  }

  console.info(`Memproses ${users.length} pengguna dari ${filePath}...`);
  let successCount = 0;
  let failCount = 0;

  for (const item of users) {
    try {
      const res = await createUser(item);
      console.info(`✓ [${res.role}] ${res.email} (${res.name})`);
      successCount++;
    } catch (err) {
      console.error(`✗ Gagal membuat ${item.email}: ${err instanceof Error ? err.message : err}`);
      failCount++;
    }
  }

  console.info(`\nSelesai: ${successCount} berhasil, ${failCount} gagal.`);
}

async function main() {
  const arg1 = process.argv[2];

  if (arg1?.startsWith("--file=")) {
    await handleFileImport(arg1.replace("--file=", ""));
    return;
  }

  if (arg1 && (arg1.endsWith(".csv") || arg1.endsWith(".json"))) {
    await handleFileImport(arg1);
    return;
  }

  const email = arg1;
  const password = process.argv[3];
  const name = process.argv[4];
  const role = process.argv[5];

  if (!email || !password) {
    throw new Error(
      "Gunakan:\n  1. Satuan: bun run db:user <email> <password> [nama] [role=user|admin]\n  2. File:   bun run db:user --file=users.csv (atau users.json)",
    );
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
