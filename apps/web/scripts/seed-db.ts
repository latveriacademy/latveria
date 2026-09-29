import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDatabaseUrl } from "../src/lib/env";
import { questions, topics } from "../src/lib/db/schema";

async function main() {
  loadEnvConfig(process.cwd());
  const client = postgres(getDatabaseUrl("DATABASE_URL"), { max: 1, prepare: false, connect_timeout: 10 });
  const db = drizzle(client);
  try {
    await db.transaction(async (tx) => {
      await tx.insert(topics).values({
        slug: "dummy-matematika",
        name: "Matematika dasar (dummy)",
        description: "Data pengembangan, bukan soal resmi UTBK.",
      }).onConflictDoNothing({ target: topics.slug });
      const [topic] = await tx.select().from(topics).where(
        // ID topik bisa berbeda jika slug sudah dibuat sebelumnya.
        eq(topics.slug, "dummy-matematika"),
      );
      await tx.insert(questions).values([
        {
          id: "00000000-0000-4000-8000-000000000001",
          topicId: topic.id,
          prompt: "Berapakah 25% dari 80?",
          options: ["10", "15", "20", "25"],
          correctAnswer: 2,
          explanation: "25% × 80 = 0,25 × 80 = 20.",
          source: "Dummy lokal, bukan soal resmi UTBK",
        },
        {
          id: "00000000-0000-4000-8000-000000000002",
          topicId: topic.id,
          prompt: "Jika 2x + 6 = 14, berapakah nilai x?",
          options: ["2", "3", "4", "5"],
          correctAnswer: 2,
          explanation: "2x = 14 − 6 = 8, sehingga x = 4.",
          source: "Dummy lokal, bukan soal resmi UTBK",
        },
        {
          id: "00000000-0000-4000-8000-000000000003",
          topicId: topic.id,
          prompt: "Perbandingan buku merah dan biru adalah 2:3. Jika totalnya 25, berapa buku merah?",
          options: ["5", "10", "15", "20"],
          correctAnswer: 1,
          explanation: "Jumlah bagian = 2 + 3 = 5. Buku merah = 2/5 × 25 = 10.",
          source: "Dummy lokal, bukan soal resmi UTBK",
        },
      ]).onConflictDoNothing({ target: questions.id });
    });
    console.info("Seed selesai: 1 topik dan 3 soal dummy tersedia. Data yang sudah ada tidak ditimpa.");
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch(() => {
  console.error("Seed gagal. Periksa DATABASE_URL dan jalankan migrasi terlebih dahulu.");
  process.exitCode = 1;
});
