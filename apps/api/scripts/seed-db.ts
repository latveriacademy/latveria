import { eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDatabaseUrl } from "../src/lib/env";
import {
  affirmations,
  practiceAnswers,
  questionPackages,
  questions,
  systemConfig,
  topics,
  tryoutPackageQuestions,
} from "../src/lib/db/schema";
import {
  cylinderTankQuestion,
  openCuboidQuestion,
  pyramidQuestion,
  utbkSubtests,
} from "@latveria/shared";
import { geometryQuestionData } from "../src/lib/roof-question";

const legacySlugs = [
  ["dummy-logika", "penalaran-umum"],
  ["dummy-bacaan", "pengetahuan-pemahaman-umum"],
  ["dummy-matematika", "pengetahuan-kuantitatif"],
  ["dummy-inggris", "literasi-bahasa-inggris"],
] as const;

async function main() {
  const client = postgres(getDatabaseUrl("DATABASE_URL"), {
    max: 1,
    prepare: false,
    connect_timeout: 10,
  });
  const db = drizzle(client);
  try {
    await db.transaction(async (tx) => {
      for (const [oldSlug, newSlug] of legacySlugs) {
        const [legacy] = await tx
          .select({ id: topics.id })
          .from(topics)
          .where(eq(topics.slug, oldSlug));
        if (!legacy) continue;
        const [existing] = await tx
          .select({ id: topics.id })
          .from(topics)
          .where(eq(topics.slug, newSlug));
        if (existing)
          throw new Error(
            `Topik ${oldSlug} dan ${newSlug} sama-sama ada. Satukan data lokal secara manual agar riwayat tidak terputus.`,
          );
        const target = utbkSubtests.find((subtest) => subtest.slug === newSlug)!;
        await tx
          .update(topics)
          .set({ slug: target.slug, name: target.name, description: target.description })
          .where(eq(topics.id, legacy.id));
      }
      await tx
        .insert(topics)
        .values(
          utbkSubtests.map(({ slug, name, description, section }) => ({
            slug,
            name,
            description,
            category: "utbk",
            section,
          })),
        )
        .onConflictDoUpdate({
          target: topics.slug,
          set: {
            name: sql`excluded.name`,
            description: sql`excluded.description`,
            category: sql`excluded.category`,
            section: sql`excluded.section`,
          },
        });
      const storedTopics = await tx
        .select({ id: topics.id, slug: topics.slug })
        .from(topics)
        .where(
          inArray(
            topics.slug,
            utbkSubtests.map((topic) => topic.slug),
          ),
        );
      const topicId = Object.fromEntries(storedTopics.map((topic) => [topic.slug, topic.id]));
      if (storedTopics.length !== utbkSubtests.length)
        throw new Error("Sebagian subtes tidak tersedia.");

      await tx
        .insert(questionPackages)
        .values(
          storedTopics.map((topic) => ({
            topicId: topic.id,
            name: "Paket 1",
            description: "Paket latihan standar",
            order: 1,
            isActive: true,
          })),
        )
        .onConflictDoNothing({ target: [questionPackages.topicId, questionPackages.name] });
      const [firstTopic] = storedTopics;
      if (firstTopic) {
        await tx
          .insert(questionPackages)
          .values({
            topicId: firstTopic.id,
            name: "Tryout Akbar UTBK-SNBT 2027",
            description:
              "Simulasi terpadu seluruh subtes SNPMB 2027 dengan sistem timer resmi dan jeda istirahat antar-subtes.",
            packageType: "Simulasi Akbar",
            duration: 195,
            order: 99,
            isFullTryout: true,
            targetQuestions: 30,
            isActive: true,
          })
          .onConflictDoNothing({ target: [questionPackages.topicId, questionPackages.name] });
      }
      const storedPackages = await tx
        .select({ id: questionPackages.id, topicId: questionPackages.topicId })
        .from(questionPackages)
        .where(eq(questionPackages.name, "Paket 1"));
      const defaultPackageByTopic = Object.fromEntries(
        storedPackages.map((p) => [p.topicId, p.id]),
      );

      await tx
        .insert(questions)
        .values([
          question(
            1,
            topicId["penalaran-umum"],
            defaultPackageByTopic[topicId["penalaran-umum"]],
            "Semua peserta kelompok A mengikuti kelas logika. Rani adalah peserta kelompok A. Kesimpulan yang tepat adalah...",
            [
              "Rani mengikuti kelas logika",
              "Rani mengajar kelas logika",
              "Semua peserta kelas logika berada di kelompok A",
              "Rani bukan peserta kelas logika",
              "Rani tidak mengikuti kelas logika",
            ],
            0,
            "Rani termasuk kelompok A, sedangkan seluruh anggota kelompok A mengikuti kelas logika.",
          ),
          question(
            2,
            topicId["penalaran-umum"],
            defaultPackageByTopic[topicId["penalaran-umum"]],
            "Urutan bilangan berikut adalah 3, 6, 12, 24, .... Bilangan selanjutnya adalah...",
            ["27", "30", "36", "48", "56"],
            3,
            "Setiap bilangan dikalikan 2, sehingga 24 × 2 = 48.",
          ),
          question(
            3,
            topicId["pengetahuan-pemahaman-umum"],
            defaultPackageByTopic[topicId["pengetahuan-pemahaman-umum"]],
            "Bacalah kalimat berikut: 'Perpustakaan sekolah menambah jam buka agar siswa memiliki lebih banyak waktu belajar.' Gagasan utamanya adalah...",
            [
              "Siswa tidak suka belajar",
              "Jam buka perpustakaan ditambah",
              "Sekolah membangun perpustakaan baru",
              "Perpustakaan hanya buka malam hari",
              "Siswa memiliki waktu belajar lebih banyak",
            ],
            1,
            "Kalimat berpusat pada penambahan jam buka perpustakaan; alasan setelahnya merupakan tujuan.",
          ),
          question(
            4,
            topicId["pengetahuan-pemahaman-umum"],
            defaultPackageByTopic[topicId["pengetahuan-pemahaman-umum"]],
            "Kata 'hemat' dalam kalimat 'Penggunaan lampu LED lebih hemat energi' paling dekat artinya dengan...",
            ["Boros", "Efisien", "Terang", "Mahal", "Rendah"],
            1,
            "Dalam konteks penggunaan energi, hemat berarti menggunakan sumber daya secara efisien.",
          ),
          question(
            5,
            topicId["pengetahuan-kuantitatif"],
            defaultPackageByTopic[topicId["pengetahuan-kuantitatif"]],
            "Berapakah $25\\%$ dari $80$?",
            ["$10$", "$15$", "$20$", "$25$", "$30$"],
            2,
            "$25\\% \\times 80 = 0{,}25 \\times 80 = 20$.",
          ),
          question(
            6,
            topicId["pengetahuan-kuantitatif"],
            defaultPackageByTopic[topicId["pengetahuan-kuantitatif"]],
            "Jika $2x + 6 = 14$, berapakah nilai $x$?",
            ["$2$", "$3$", "$4$", "$5$", "$6$"],
            2,
            "$$2x = 14 - 6 = 8$$ sehingga $x = 4$.",
          ),
          question(
            7,
            topicId["literasi-bahasa-inggris"],
            defaultPackageByTopic[topicId["literasi-bahasa-inggris"]],
            "Read the sentence: 'The museum closes earlier on Friday.' What happens on Friday?",
            [
              "The museum opens later",
              "The museum is closed all day",
              "The museum closes earlier",
              "The museum offers free tickets",
              "The museum has special hours",
            ],
            2,
            "The sentence directly states that the museum closes earlier on Friday.",
          ),
          question(
            8,
            topicId["literasi-bahasa-inggris"],
            defaultPackageByTopic[topicId["literasi-bahasa-inggris"]],
            "In the sentence 'The path was narrow', the word 'narrow' is closest in meaning to...",
            ["Not wide", "Very long", "Crowded", "Dangerous", "Hidden"],
            0,
            "Narrow describes something that is not wide.",
          ),
          question(
            9,
            topicId["pemahaman-bacaan-menulis"],
            defaultPackageByTopic[topicId["pemahaman-bacaan-menulis"]],
            "Manakah kalimat yang paling efektif?",
            [
              "Para siswa-siswa sedang membaca buku bersama.",
              "Para siswa membaca buku bersama.",
              "Para siswa semuanya membaca buku bersama-sama.",
              "Siswa para sedang bersama membaca buku.",
              "Para siswa sedang membaca buku secara bersama.",
            ],
            1,
            "Kata 'para' sudah menunjukkan jamak, sehingga 'siswa-siswa' dan pengulangan 'bersama-sama' tidak diperlukan.",
          ),
          question(
            10,
            topicId["pemahaman-bacaan-menulis"],
            defaultPackageByTopic[topicId["pemahaman-bacaan-menulis"]],
            "Perbaikan penulisan 'Rani membaca buku diperpustakaan' yang tepat adalah...",
            [
              "Rani membaca buku di perpustakaan.",
              "Rani membaca buku diPerpustakaan.",
              "Rani membaca buku diperpustakaan.",
              "Rani membaca buku di-perpustakaan.",
              "Rani membaca buku diperpustakaan.",
            ],
            0,
            "Kata depan 'di' yang menyatakan tempat ditulis terpisah dari 'perpustakaan'.",
          ),
          question(
            11,
            topicId["literasi-bahasa-indonesia"],
            defaultPackageByTopic[topicId["literasi-bahasa-indonesia"]],
            "Bacalah: 'Warga menanam pohon di tepi jalan untuk menambah area teduh. Kegiatan dilakukan bersama pada Minggu pagi.' Apa tujuan penanaman pohon?",
            [
              "Mengurangi kegiatan warga",
              "Menambah area teduh",
              "Memperlebar jalan",
              "Membuka pasar pagi",
              "Menambah pemandangan",
            ],
            1,
            "Tujuan disebut langsung pada kalimat pertama: menambah area teduh.",
          ),
          question(
            12,
            topicId["literasi-bahasa-indonesia"],
            defaultPackageByTopic[topicId["literasi-bahasa-indonesia"]],
            "Bacalah: 'Setelah hujan, tanah di halaman masih basah. Dina menunda menjemur tikar di sana.' Mengapa Dina menunda menjemur tikar?",
            [
              "Tanah halaman masih basah",
              "Tikar sudah kering",
              "Dina belum memiliki tikar",
              "Halaman baru dicat",
              "Hujan akan turun lagi",
            ],
            0,
            "Teks menghubungkan penundaan dengan keadaan tanah halaman yang masih basah.",
          ),
          question(
            13,
            topicId["penalaran-matematika"],
            defaultPackageByTopic[topicId["penalaran-matematika"]],
            "Tiga buku masing-masing seharga Rp12.000 mendapat potongan total Rp6.000. Berapa yang dibayar?",
            ["Rp24.000", "Rp30.000", "Rp36.000", "Rp42.000", "Rp18.000"],
            1,
            "Harga awal 3 × Rp12.000 = Rp36.000. Sesudah potongan Rp6.000, totalnya Rp30.000.",
          ),
          question(
            14,
            topicId["penalaran-matematika"],
            defaultPackageByTopic[topicId["penalaran-matematika"]],
            "Tangki berkapasitas 40 liter terisi $\\frac{3}{4}$ bagian. Berapa liter air di dalam tangki?",
            ["10 liter", "20 liter", "30 liter", "40 liter", "50 liter"],
            2,
            "$\\frac{3}{4} \\times 40 = 30$ liter.",
          ),
        ])
        .onConflictDoUpdate({
          target: questions.id,
          set: {
            topicId: sql`excluded.topic_id`,
            packageId: sql`excluded.package_id`,
            prompt: sql`excluded.prompt`,
            options: sql`excluded.options`,
            correctAnswer: sql`excluded.correct_answer`,
            explanation: sql`excluded.explanation`,
            source: sql`excluded.source`,
          },
        });
      const mathQuestions = await tx
        .select({ id: questions.id, prompt: questions.prompt })
        .from(questions)
        .where(eq(questions.topicId, topicId["penalaran-matematika"]));
      const geometryQuestions = [pyramidQuestion, openCuboidQuestion, cylinderTankQuestion];
      for (const [index, geometryQuestion] of geometryQuestions.entries()) {
        const matches = mathQuestions.filter(
          (item) => geometryQuestionData(item.prompt) === geometryQuestion,
        );
        const usages = matches.length
          ? await tx
              .select({ questionId: practiceAnswers.questionId })
              .from(practiceAnswers)
              .where(
                inArray(
                  practiceAnswers.questionId,
                  matches.map((item) => item.id),
                ),
              )
          : [];
        const usedIds = new Set(usages.map((usage) => usage.questionId));
        if (usedIds.size) {
          for (const existing of matches) {
            await tx
              .update(questions)
              .set({
                topicId: topicId["penalaran-matematika"],
                prompt: geometryQuestion.prompt,
                options: [...geometryQuestion.options],
                correctAnswer: geometryQuestion.correctAnswer,
                explanation: geometryQuestion.explanation,
                source: geometryQuestion.source,
              })
              .where(eq(questions.id, existing.id));
          }
          continue;
        }
        if (matches.length)
          await tx.delete(questions).where(
            inArray(
              questions.id,
              matches.map((item) => item.id),
            ),
          );
        await tx
          .insert(questions)
          .values(
            question(
              15 + index,
              topicId["penalaran-matematika"],
              defaultPackageByTopic[topicId["penalaran-matematika"]],
              geometryQuestion.prompt,
              [...geometryQuestion.options],
              geometryQuestion.correctAnswer,
              geometryQuestion.explanation,
            ),
          )
          .onConflictDoUpdate({
            target: questions.id,
            set: {
              topicId: topicId["penalaran-matematika"],
              packageId: defaultPackageByTopic[topicId["penalaran-matematika"]],
              prompt: geometryQuestion.prompt,
              options: [...geometryQuestion.options],
              correctAnswer: geometryQuestion.correctAnswer,
              explanation: geometryQuestion.explanation,
              source: geometryQuestion.source,
            },
          });
      }

      const [fullTryoutPackage] = await tx
        .select({ id: questionPackages.id })
        .from(questionPackages)
        .where(eq(questionPackages.name, "Tryout Akbar UTBK-SNBT 2027"));
      if (fullTryoutPackage) {
        const fullTryoutQuestionRows = await tx
          .select({ id: questions.id })
          .from(questions)
          .innerJoin(topics, eq(questions.topicId, topics.id))
          .where(
            inArray(
              topics.slug,
              utbkSubtests.map((subtest) => subtest.slug),
            ),
          );
        await tx
          .insert(tryoutPackageQuestions)
          .values(
            fullTryoutQuestionRows.map((question, order) => ({
              packageId: fullTryoutPackage.id,
              questionId: question.id,
              order,
            })),
          )
          .onConflictDoNothing();
        await tx
          .update(questionPackages)
          .set({ targetQuestions: fullTryoutQuestionRows.length })
          .where(eq(questionPackages.id, fullTryoutPackage.id));
      }

      // Seed System Configs
      await tx
        .insert(systemConfig)
        .values([
          {
            key: "utbk_target_date",
            value: "2027-04-17",
            description: "Tanggal pelaksanaan UTBK SNBT",
          },
          {
            key: "utbk_timezone",
            value: "Asia/Jakarta",
            description: "Timezone perhitungan countdown",
          },
          {
            key: "break_duration_minutes",
            value: "15",
            description: "Durasi istirahat antar subtes dalam menit",
          },
          { key: "score_max", value: "1000", description: "Skor maksimum Latveria Score" },
        ])
        .onConflictDoUpdate({
          target: systemConfig.key,
          set: { value: sql`excluded.value`, description: sql`excluded.description` },
        });

      // Seed Affirmations
      const defaultAffirmations = [
        {
          affirmation: "Pelan-pelan tidak apa-apa. Yang penting terus bergerak.",
          author: "Latveria Academic Archive",
        },
        { affirmation: "Sedikit progres tetaplah progres.", author: "Catatan Pembina" },
        { affirmation: "Kerjakan satu soal. Pahami satu konsep.", author: "Protokol Belajar" },
        {
          affirmation: "Targetmu besar. Hari ini cukup maju sedikit.",
          author: "Latveria Academic Archive",
        },
        {
          affirmation: "Konsistensi kecil hari ini adalah fondasi lonjakan skormu.",
          author: "Catatan Pembina",
        },
        {
          affirmation: "Fokus pada pemahaman esensial, bukan sekadar kecepatan semu.",
          author: "Direktori Evaluasi",
        },
        {
          affirmation: "Setiap kesalahan latihan adalah peluang pembenahan konsep terbaik.",
          author: "Protokol Belajar",
        },
      ];
      for (const item of defaultAffirmations) {
        const [existing] = await tx
          .select({ id: affirmations.id })
          .from(affirmations)
          .where(eq(affirmations.affirmation, item.affirmation));
        if (!existing) {
          await tx.insert(affirmations).values({ ...item, active: true });
        }
      }

      // Seed Non-UTBK Subjects: Ujian Mandiri, TKA, Mata Kuliah
      const extraSubjects = [
        {
          slug: "matematika-dasar",
          name: "Matematika Dasar",
          description:
            "Materi aljabar, persamaan kuadrat, dan fungsi untuk ujian mandiri perguruan tinggi.",
          category: "ujian-mandiri",
          section: "mandiri",
        },
        {
          slug: "kalkulus",
          name: "Kalkulus",
          description: "Konsep limit, turunan, dan integral dasar perguruan tinggi.",
          category: "mata-kuliah",
          section: "matkul",
        },
        {
          slug: "fisika-dasar",
          name: "Fisika Dasar",
          description: "Kinematika, dinamika partikel, dan mekanika benda tegar.",
          category: "tka",
          section: "tka",
        },
        {
          slug: "ekonomi",
          name: "Ekonomi",
          description: "Konsep dasar mikro dan makro ekonomi, elastisitas, dan pasar.",
          category: "tka",
          section: "tka",
        },
      ];
      for (const subj of extraSubjects) {
        await tx
          .insert(topics)
          .values(subj)
          .onConflictDoUpdate({
            target: topics.slug,
            set: {
              name: subj.name,
              description: subj.description,
              category: subj.category,
              section: subj.section,
            },
          });
        const [insertedSubj] = await tx.select().from(topics).where(eq(topics.slug, subj.slug));
        if (insertedSubj) {
          const pkgName = `Paket Latihan ${subj.name} #01`;
          await tx
            .insert(questionPackages)
            .values({
              topicId: insertedSubj.id,
              name: pkgName,
              description: `Paket soal terstruktur untuk materi ${subj.name}`,
              packageType: "Airdrop Fundamental",
              category: subj.category,
              duration: 25,
              order: 1,
              isActive: true,
            })
            .onConflictDoNothing({ target: [questionPackages.topicId, questionPackages.name] });

          const [pkg] = await tx
            .select()
            .from(questionPackages)
            .where(eq(questionPackages.name, pkgName));
          if (pkg) {
            // Seed a question for this topic
            const qPrompt = `Contoh soal evaluasi konsep untuk ${subj.name}. Manakah pernyataan berikut yang paling tepat sesuai kaidah keilmuan?`;
            const [existingQ] = await tx
              .select()
              .from(questions)
              .where(eq(questions.prompt, qPrompt));
            if (!existingQ) {
              await tx.insert(questions).values({
                topicId: insertedSubj.id,
                packageId: pkg.id,
                prompt: qPrompt,
                options: [
                  "Konsep terverifikasi secara matematis dan analitis",
                  "Variabel tidak terdefinisi secara independen",
                  "Hukum termodinamika tidak berlaku secara mutlak",
                  "Asumsi model mengabaikan seluruh relasi",
                  "Kesimpulan diambil tanpa memeriksa premis",
                ],
                correctAnswer: 0,
                explanation: `Analisis konsep ${subj.name} mengutamakan verifikasi matematis dan keteraturan relasi antar premis.`,
                source: "Arsip Latveria Ujian Mandiri & TKA",
                category: "Fundamental",
              });
            }
          }
        }
      }
    });
    console.info(
      "Seed selesai: 7 subtes dan 17 soal dummy tersedia. ID topik lama dan soal admin tetap dipertahankan.",
    );
  } finally {
    await client.end({ timeout: 5 });
  }
}

function question(
  number: number,
  topicId: string,
  packageId: string | null | undefined,
  prompt: string,
  options: string[],
  correctAnswer: number,
  explanation: string,
) {
  return {
    id: questionId(number),
    topicId,
    packageId: packageId ?? null,
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
  console.error(
    error instanceof Error
      ? `Seed gagal: ${error.message}`
      : "Seed gagal. Periksa DATABASE_URL dan jalankan migrasi terlebih dahulu.",
  );
  process.exitCode = 1;
});
