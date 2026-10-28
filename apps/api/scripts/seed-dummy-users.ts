import { generateId } from "better-auth";
import { hashPassword } from "better-auth/crypto";
import { inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { account, user } from "../src/lib/db/auth-schema";
import { getDatabaseUrl } from "../src/lib/env";

export async function seedDummyUsers(count = 100, password = "dummy12345") {
  const url = getDatabaseUrl("DATABASE_URL");
  const hostname = new URL(url).hostname;
  if (
    !["localhost", "127.0.0.1", "postgres"].includes(hostname) &&
    !url.includes("pooler.supabase") &&
    !url.includes("supabase.co")
  ) {
    throw new Error("Pembuatan akun dummy hanya diizinkan untuk database lokal, docker, atau Supabase.");
  }

  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client);

  try {
    console.info(`Memulai pembuatan ${count} akun dummy (password default: ${password})...`);
    const hashedPassword = await hashPassword(password);
    const now = new Date();

    // Ambil semua dummy user yang sudah ada
    const existingUsers = await db
      .select({ id: user.id, email: user.email })
      .from(user)
      .where(like(user.email, "dummy%@latveria.test"));

    const existingMap = new Map(existingUsers.map((u) => [u.email, u.id]));

    const usersToInsert: Array<typeof user.$inferInsert> = [];
    const accountsToInsert: Array<typeof account.$inferInsert> = [];
    const usersToUpdate: Array<{ id: string; name: string }> = [];

    for (let i = 1; i <= count; i++) {
      const email = `dummy${i}@latveria.test`;
      const name = `dummy ${i}`;

      const existingId = existingMap.get(email);
      if (existingId) {
        usersToUpdate.push({ id: existingId, name });
      } else {
        const userId = generateId();
        const accountId = generateId();

        usersToInsert.push({
          id: userId,
          name,
          email,
          role: "user",
          isDemo: true,
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
        });

        accountsToInsert.push({
          id: accountId,
          accountId: userId,
          providerId: "credential",
          userId,
          password: hashedPassword,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // 1. Bulk insert user baru
    if (usersToInsert.length > 0) {
      console.info(`Menyimpan ${usersToInsert.length} akun user baru...`);
      await db.insert(user).values(usersToInsert);
      console.info(`Menyimpan ${accountsToInsert.length} kredensial akun baru...`);
      await db.insert(account).values(accountsToInsert);
    }

    // 2. Perbarui user lama jika nama berbeda
    if (usersToUpdate.length > 0) {
      console.info(`Memperbarui ${usersToUpdate.length} akun dummy yang sudah ada agar sesuai nama dummy 1-${count}...`);
      for (const item of usersToUpdate) {
        await db
          .update(user)
          .set({ name: item.name, isDemo: true, updatedAt: now })
          .where(inArray(user.id, [item.id]));

        // Pastikan password credential juga disesuaikan jika perlu
        const [existingAcc] = await db
          .select({ id: account.id })
          .from(account)
          .where(inArray(account.userId, [item.id]))
          .limit(1);

        if (existingAcc) {
          await db
            .update(account)
            .set({ password: hashedPassword, updatedAt: now })
            .where(inArray(account.id, [existingAcc.id]));
        } else {
          await db.insert(account).values({
            id: generateId(),
            accountId: item.id,
            providerId: "credential",
            userId: item.id,
            password: hashedPassword,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }

    console.info(`\nSukses! Total ${count} akun dummy (dummy 1 s/d dummy ${count}) telah aktif di server:`);
    console.info(`- Akun baru dibuat: ${usersToInsert.length}`);
    console.info(`- Akun lama diperbarui: ${usersToUpdate.length}`);
    console.info(`- Format email: dummy1@latveria.test s/d dummy${count}@latveria.test`);
    console.info(`- Password default: ${password}`);
    console.info(`- Role: user | isDemo: true`);
  } finally {
    await client.end({ timeout: 5 });
  }
}

async function main() {
  const countArg = process.argv[2] ? parseInt(process.argv[2], 10) : 100;
  const count = Number.isFinite(countArg) && countArg > 0 ? countArg : 100;
  const password = process.argv[3] || "dummy12345";

  await seedDummyUsers(count, password);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Pembuatan akun dummy gagal.");
    process.exitCode = 1;
  });
}
