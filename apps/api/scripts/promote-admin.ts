import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDatabaseUrl } from "../src/lib/env";
import { user } from "../src/lib/db/auth-schema";

async function main() {
  const email = process.argv[2]?.toLowerCase();
  if (!email) throw new Error("Gunakan: bun run db:admin email@contoh.test");
  const url = getDatabaseUrl("DATABASE_URL");
  // Allow for Supabase databases by checking for pooler URL
  if (
    !["localhost", "127.0.0.1"].includes(new URL(url).hostname) &&
    !url.includes("pooler.supabase")
  )
    throw new Error("Promosi hanya tersedia untuk database lokal atau Supabase.");
  const client = postgres(url, { max: 1, prepare: false });
  try {
    const result = await drizzle(client)
      .update(user)
      .set({ role: "admin" })
      .where(eq(user.email, email))
      .returning({ id: user.id });
    if (result.length !== 1) throw new Error("Akun belum ada. Daftarkan pengguna terlebih dahulu.");
    console.info("Akun dipromosikan menjadi admin.");
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Promosi gagal.");
  process.exitCode = 1;
});
