import { loadEnvConfig } from "@next/env";
import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDatabaseUrl } from "../src/lib/env";
import { questions, topics } from "../src/lib/db/schema";

const catalog = [
  { slug: "dummy-logika", name: "Logika dan penalaran (dummy)", description: "Pola, hubungan pernyataan, dan kesimpulan logis." },
  { slug: "dummy-bacaan", name: "Pemahaman bacaan (dummy)", description: "Gagasan utama, informasi tersirat, dan hubungan antarparagraf." },
  { slug: "dummy-matematika", name: "Matematika dasar (dummy)", description: "Perbandingan, persentase, dan persamaan sederhana." },
  { slug: "dummy-inggris", name: "Bacaan bahasa Inggris (dummy)", description: "Main idea, vocabulary in context, dan inference." },
] as const;

async function main() {
  loadEnvConfig(process.cwd());
  const client = postgres(getDatabaseUrl("DATABASE_URL"), { max: 1, prepare: false, connect_timeout: 10 });
  const db = drizzle(client);
  try {
    await db.transaction(async (tx) => {
      await tx.insert(topics).values(catalog.map((topic) => ({ ...topic, description: `${topic.description} Data pengembangan, bukan materi resmi UTBK.` }))).onConflictDoNothing({ target: topics.slug });
      const storedTopics = await tx.select({ id: topics.id, slug: topics.slug }).from(topics).where(inArray(topics.slug, catalog.map((topic) => topic.slug)));
      const topicId = Object.fromEntries(storedTopics.map((topic) => [topic.slug, topic.id]));
      if (storedTopics.length !== catalog.length) throw new Error("Sebagian topik dummy tidak tersedia.");
      const managedQuestionIds = Array.from({ length: 8 }, (_, index) => questionId(index + 1));
      // Hanya data dummy dengan ID tetap yang disegarkan; soal buatan admin tidak disentuh.
      await tx.delete(questions).where(inArray(questions.id, managedQuestionIds));
      await tx.insert(questions).values([
        question(1, topicId["dummy-logika"], "Semua peserta kelompok A mengikuti kelas logika. Rani adalah peserta kelompok A. Kesimpulan yang tepat adalah...", ["Rani mengikuti kelas logika", "Rani mengajar kelas logika", "Semua peserta kelas logika berada di kelompok A", "Rani bukan peserta kelas logika"], 0, "Rani termasuk kelompok A, sedangkan seluruh anggota kelompok A mengikuti kelas logika."),
        question(2, topicId["dummy-logika"], "Urutan bilangan berikut adalah 3, 6, 12, 24, .... Bilangan selanjutnya adalah...", ["27", "30", "36", "48"], 3, "Setiap bilangan dikalikan 2, sehingga 24 × 2 = 48."),
        question(3, topicId["dummy-bacaan"], "Bacalah kalimat berikut: 'Perpustakaan sekolah menambah jam buka agar siswa memiliki lebih banyak waktu belajar.' Gagasan utamanya adalah...", ["Siswa tidak suka belajar", "Jam buka perpustakaan ditambah", "Sekolah membangun perpustakaan baru", "Perpustakaan hanya buka malam hari"], 1, "Kalimat berpusat pada penambahan jam buka perpustakaan; alasan setelahnya merupakan tujuan."),
        question(4, topicId["dummy-bacaan"], "Kata 'hemat' dalam kalimat 'Penggunaan lampu LED lebih hemat energi' paling dekat artinya dengan...", ["Boros", "Efisien", "Terang", "Mahal"], 1, "Dalam konteks penggunaan energi, hemat berarti menggunakan sumber daya secara efisien."),
        question(5, topicId["dummy-matematika"], "Berapakah 25% dari 80?", ["10", "15", "20", "25"], 2, "25% × 80 = 0,25 × 80 = 20."),
        question(6, topicId["dummy-matematika"], "Jika 2x + 6 = 14, berapakah nilai x?", ["2", "3", "4", "5"], 2, "2x = 14 - 6 = 8, sehingga x = 4."),
        question(7, topicId["dummy-inggris"], "Read the sentence: 'The museum closes earlier on Friday.' What happens on Friday?", ["The museum opens later", "The museum is closed all day", "The museum closes earlier", "The museum offers free tickets"], 2, "The sentence directly states that the museum closes earlier on Friday."),
        question(8, topicId["dummy-inggris"], "In the sentence 'The path was narrow', the word 'narrow' is closest in meaning to...", ["Not wide", "Very long", "Crowded", "Dangerous"], 0, "Narrow describes something that is not wide."),
      ]);
    });
    console.info("Seed selesai: 4 topik dan 8 soal dummy tersedia. Data yang sudah ada tidak ditimpa.");
  } finally {
    await client.end({ timeout: 5 });
  }
}

function question(number: number, topicId: string, prompt: string, options: [string, string, string, string], correctAnswer: number, explanation: string) {
  return {
    id: questionId(number),
    topicId,
    prompt,
    options,
    correctAnswer,
    explanation,
    source: "Dummy lokal buatan tim, bukan soal resmi UTBK",
  };
}

function questionId(number: number) {
  return `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
}

main().catch((error) => {
  console.error(error instanceof Error ? `Seed gagal: ${error.message}` : "Seed gagal. Periksa DATABASE_URL dan jalankan migrasi terlebih dahulu.");
  process.exitCode = 1;
});
