import { loadEnvFile } from "node:process";
import { eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDatabaseUrl } from "../src/lib/env";
import { questions, topics } from "../src/lib/db/schema";
import { utbkSubtests } from "@latveria/shared";
import { isLegacyRoofQuestion, roofQuestionCorrectAnswer, roofQuestionExplanation, roofQuestionOptions, roofQuestionPrompt } from "../src/lib/roof-question";

const legacySlugs = [
  ["dummy-logika", "penalaran-umum"],
  ["dummy-bacaan", "pengetahuan-pemahaman-umum"],
  ["dummy-matematika", "pengetahuan-kuantitatif"],
  ["dummy-inggris", "literasi-bahasa-inggris"],
] as const;

async function main() {
  loadEnvFile(".env.local");
  const client = postgres(getDatabaseUrl("DATABASE_URL"), { max: 1, prepare: false, connect_timeout: 10 });
  const db = drizzle(client);
  try {
    await db.transaction(async (tx) => {
      for (const [oldSlug, newSlug] of legacySlugs) {
        const [legacy] = await tx.select({ id: topics.id }).from(topics).where(eq(topics.slug, oldSlug));
        if (!legacy) continue;
        const [existing] = await tx.select({ id: topics.id }).from(topics).where(eq(topics.slug, newSlug));
        if (existing) throw new Error(`Topik ${oldSlug} dan ${newSlug} sama-sama ada. Satukan data lokal secara manual agar riwayat tidak terputus.`);
        const target = utbkSubtests.find((subtest) => subtest.slug === newSlug)!;
        await tx.update(topics).set({ slug: target.slug, name: target.name, description: target.description }).where(eq(topics.id, legacy.id));
      }
      await tx.insert(topics).values(utbkSubtests.map(({ slug, name, description }) => ({ slug, name, description }))).onConflictDoNothing({ target: topics.slug });
      const storedTopics = await tx.select({ id: topics.id, slug: topics.slug }).from(topics).where(inArray(topics.slug, utbkSubtests.map((topic) => topic.slug)));
      const topicId = Object.fromEntries(storedTopics.map((topic) => [topic.slug, topic.id]));
      if (storedTopics.length !== utbkSubtests.length) throw new Error("Sebagian subtes tidak tersedia.");
      await tx.insert(questions).values([
        question(1, topicId["penalaran-umum"], "Semua peserta kelompok A mengikuti kelas logika. Rani adalah peserta kelompok A. Kesimpulan yang tepat adalah...", ["Rani mengikuti kelas logika", "Rani mengajar kelas logika", "Semua peserta kelas logika berada di kelompok A", "Rani bukan peserta kelas logika"], 0, "Rani termasuk kelompok A, sedangkan seluruh anggota kelompok A mengikuti kelas logika."),
        question(2, topicId["penalaran-umum"], "Urutan bilangan berikut adalah 3, 6, 12, 24, .... Bilangan selanjutnya adalah...", ["27", "30", "36", "48"], 3, "Setiap bilangan dikalikan 2, sehingga 24 × 2 = 48."),
        question(3, topicId["pengetahuan-pemahaman-umum"], "Bacalah kalimat berikut: 'Perpustakaan sekolah menambah jam buka agar siswa memiliki lebih banyak waktu belajar.' Gagasan utamanya adalah...", ["Siswa tidak suka belajar", "Jam buka perpustakaan ditambah", "Sekolah membangun perpustakaan baru", "Perpustakaan hanya buka malam hari"], 1, "Kalimat berpusat pada penambahan jam buka perpustakaan; alasan setelahnya merupakan tujuan."),
        question(4, topicId["pengetahuan-pemahaman-umum"], "Kata 'hemat' dalam kalimat 'Penggunaan lampu LED lebih hemat energi' paling dekat artinya dengan...", ["Boros", "Efisien", "Terang", "Mahal"], 1, "Dalam konteks penggunaan energi, hemat berarti menggunakan sumber daya secara efisien."),
        question(5, topicId["pengetahuan-kuantitatif"], "Berapakah $25\\%$ dari $80$?", ["$10$", "$15$", "$20$", "$25$"], 2, "$25\\% \\times 80 = 0{,}25 \\times 80 = 20$."),
        question(6, topicId["pengetahuan-kuantitatif"], "Jika $2x + 6 = 14$, berapakah nilai $x$?", ["$2$", "$3$", "$4$", "$5$"], 2, "$$2x = 14 - 6 = 8$$ sehingga $x = 4$."),
        question(7, topicId["literasi-bahasa-inggris"], "Read the sentence: 'The museum closes earlier on Friday.' What happens on Friday?", ["The museum opens later", "The museum is closed all day", "The museum closes earlier", "The museum offers free tickets"], 2, "The sentence directly states that the museum closes earlier on Friday."),
        question(8, topicId["literasi-bahasa-inggris"], "In the sentence 'The path was narrow', the word 'narrow' is closest in meaning to...", ["Not wide", "Very long", "Crowded", "Dangerous"], 0, "Narrow describes something that is not wide."),
        question(9, topicId["pemahaman-bacaan-menulis"], "Manakah kalimat yang paling efektif?", ["Para siswa-siswa sedang membaca buku bersama.", "Para siswa membaca buku bersama.", "Para siswa semuanya membaca buku bersama-sama.", "Siswa para sedang bersama membaca buku."], 1, "Kata 'para' sudah menunjukkan jamak, sehingga 'siswa-siswa' dan pengulangan 'bersama-sama' tidak diperlukan."),
        question(10, topicId["pemahaman-bacaan-menulis"], "Perbaikan penulisan 'Rani membaca buku diperpustakaan' yang tepat adalah...", ["Rani membaca buku di perpustakaan.", "Rani membaca buku diPerpustakaan.", "Rani membaca buku diperpustakaan.", "Rani membaca buku di-perpustakaan."], 0, "Kata depan 'di' yang menyatakan tempat ditulis terpisah dari 'perpustakaan'."),
        question(11, topicId["literasi-bahasa-indonesia"], "Bacalah: 'Warga menanam pohon di tepi jalan untuk menambah area teduh. Kegiatan dilakukan bersama pada Minggu pagi.' Apa tujuan penanaman pohon?", ["Mengurangi kegiatan warga", "Menambah area teduh", "Memperlebar jalan", "Membuka pasar pagi"], 1, "Tujuan disebut langsung pada kalimat pertama: menambah area teduh."),
        question(12, topicId["literasi-bahasa-indonesia"], "Bacalah: 'Setelah hujan, tanah di halaman masih basah. Dina menunda menjemur tikar di sana.' Mengapa Dina menunda menjemur tikar?", ["Tanah halaman masih basah", "Tikar sudah kering", "Dina belum memiliki tikar", "Halaman baru dicat"], 0, "Teks menghubungkan penundaan dengan keadaan tanah halaman yang masih basah."),
        question(13, topicId["penalaran-matematika"], "Tiga buku masing-masing seharga Rp12.000 mendapat potongan total Rp6.000. Berapa yang dibayar?", ["Rp24.000", "Rp30.000", "Rp36.000", "Rp42.000"], 1, "Harga awal 3 × Rp12.000 = Rp36.000. Sesudah potongan Rp6.000, totalnya Rp30.000."),
        question(14, topicId["penalaran-matematika"], "Tangki berkapasitas 40 liter terisi $\\frac{3}{4}$ bagian. Berapa liter air di dalam tangki?", ["10 liter", "20 liter", "30 liter", "40 liter"], 2, "$\\frac{3}{4} \\times 40 = 30$ liter."),
      ]).onConflictDoUpdate({
        target: questions.id,
        set: {
          topicId: sql`excluded.topic_id`,
          prompt: sql`excluded.prompt`,
          options: sql`excluded.options`,
          correctAnswer: sql`excluded.correct_answer`,
          explanation: sql`excluded.explanation`,
          source: sql`excluded.source`,
        },
      });
      const mathQuestions = await tx.select({ id: questions.id, prompt: questions.prompt }).from(questions).where(eq(questions.topicId, topicId["penalaran-matematika"]));
      const oldRoof = mathQuestions.find(({ prompt }) => isLegacyRoofQuestion(prompt));
      if (oldRoof) {
        await tx.update(questions).set({ prompt: roofQuestionPrompt(), options: [...roofQuestionOptions], correctAnswer: roofQuestionCorrectAnswer, explanation: roofQuestionExplanation }).where(eq(questions.id, oldRoof.id));
      } else if (!mathQuestions.some(({ id }) => id === questionId(15))) {
        await tx.insert(questions).values(question(15, topicId["penalaran-matematika"], roofQuestionPrompt(), [...roofQuestionOptions], roofQuestionCorrectAnswer, roofQuestionExplanation));
      }
    });
    console.info("Seed selesai: 7 subtes dan 15 soal dummy tersedia. ID topik lama dan soal admin tetap dipertahankan.");
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
