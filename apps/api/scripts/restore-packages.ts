import { sql } from "drizzle-orm";
import { getDb } from "../src/lib/db";
import { questionPackages, topics } from "../src/lib/db/schema";
import { invalidateCatalogCache } from "../src/services/topic.service";

interface PackageMapping {
  sourcePattern: string;
  topicSlug: string;
  packageName: string;
  description: string;
  category: "utbk" | "tka" | "ujian-mandiri" | "mata-kuliah";
  packageType: "Tryout" | "Airdrop Fundamental" | "Simulasi";
  isFullTryout?: boolean;
}

const MAPPINGS: PackageMapping[] = [
  {
    sourcePattern: "SOAL PU ASLI UTBK BY LATVERIA",
    topicSlug: "penalaran-umum",
    packageName: "Soal Asli UTBK By Latveria",
    description: "Soal kutipan asli dan adaptasi UTBK untuk Penalaran Umum",
    category: "utbk",
    packageType: "Tryout",
  },
  {
    sourcePattern: "Soal kalkulus dasar",
    topicSlug: "pengetahuan-kuantitatif",
    packageName: "Kalkulus 001",
    description: "Latihan kalkulus dasar dan aljabar analitik",
    category: "utbk",
    packageType: "Tryout",
  },
  {
    sourcePattern: "LBE TO#1 SAINSIN BY LATVERIA",
    topicSlug: "literasi-bahasa-inggris",
    packageName: "Soal SainsIn 01",
    description: "Paket latihan literasi bahasa Inggris UTBK-SNBT",
    category: "utbk",
    packageType: "Tryout",
  },
  {
    sourcePattern: "Sainsin Latihan TO241 M11",
    topicSlug: "penalaran-umum",
    packageName: "Sainsin Latihan TO241 M11",
    description: "Simulasi penalaran kritis dan analitik bergaya UTBK",
    category: "utbk",
    packageType: "Tryout",
  },
  {
    sourcePattern: "PU001 - Kak Egi",
    topicSlug: "penalaran-umum",
    packageName: "PU001 - Kak Egi",
    description: "Koleksi latihan penalaran umum intensif",
    category: "utbk",
    packageType: "Tryout",
  },
  {
    sourcePattern: "TO MIPY #5 - PU%",
    topicSlug: "penalaran-umum",
    packageName: "TO MIPY #5 - PU",
    description: "Simulasi penalaran analitik dan kuantitatif MIPY",
    category: "utbk",
    packageType: "Tryout",
  },
  {
    sourcePattern: "TO MIPY PREMIS #1%",
    topicSlug: "penalaran-umum",
    packageName: "TO MIPY PREMIS #1 - PU",
    description: "Latihan premis dan penalaran logis terpadu",
    category: "utbk",
    packageType: "Tryout",
  },
  {
    sourcePattern: "TO MIPY #5 - PPU%",
    topicSlug: "pengetahuan-pemahaman-umum",
    packageName: "TO MIPY #5 - PPU",
    description: "Pemahaman makna kata, ejaan, dan wacana kebahasaan",
    category: "utbk",
    packageType: "Tryout",
  },
  {
    sourcePattern: "TO MIPY #5 - PBM%",
    topicSlug: "pemahaman-bacaan-menulis",
    packageName: "TO MIPY #5 - PBM",
    description: "Analisis teks wacana dan perbaikan kalimat efektif",
    category: "utbk",
    packageType: "Tryout",
  },
  {
    sourcePattern: "TO Pahamify #5",
    topicSlug: "pengetahuan-kuantitatif",
    packageName: "TO Pahamify #5 - PK",
    description: "Paket latihan kuantitatif dan penalaran matematis",
    category: "utbk",
    packageType: "Tryout",
  },
  {
    sourcePattern: "Soal latihan bergaya UTBK",
    topicSlug: "pengetahuan-kuantitatif",
    packageName: "Kuantitatif Standar SNBT",
    description: "Perbandingan, persentase, dan analisis data kuantitatif",
    category: "utbk",
    packageType: "Tryout",
  },
  {
    sourcePattern: "PK TO#1 SAINSIN%",
    topicSlug: "pengetahuan-kuantitatif",
    packageName: "PK TO#1 SainsIn",
    description: "Latihan aljabar, fungsi, dan geometri kuantitatif",
    category: "utbk",
    packageType: "Tryout",
  },
];

async function run() {
  const db = getDb();
  console.info("Memulihkan paket soal yang belum terhubung...");

  const allTopics = await db.select().from(topics);
  const topicMap = new Map(allTopics.map((t) => [t.slug, t.id]));

  for (const m of MAPPINGS) {
    const topicId = topicMap.get(m.topicSlug);
    if (!topicId) continue;

    // 1. Ensure package exists
    let [pkg] = await db
      .select()
      .from(questionPackages)
      .where(
        sql`${questionPackages.topicId} = ${topicId} AND ${questionPackages.name} = ${m.packageName}`,
      );

    if (!pkg) {
      const [inserted] = await db
        .insert(questionPackages)
        .values({
          topicId,
          name: m.packageName,
          description: m.description,
          packageType: m.packageType,
          category: m.category,
          isFullTryout: Boolean(m.isFullTryout),
          duration: 30,
          isActive: true,
          published: true,
          order: 2,
        })
        .onConflictDoNothing()
        .returning();
      pkg = inserted;
    }

    if (!pkg) {
      const [existing] = await db
        .select()
        .from(questionPackages)
        .where(
          sql`${questionPackages.topicId} = ${topicId} AND ${questionPackages.name} = ${m.packageName}`,
        );
      pkg = existing;
    }

    if (pkg) {
      // 2. Link matching questions that currently have package_id IS NULL
      await db.execute(sql`
        UPDATE questions
        SET package_id = ${pkg.id}
        WHERE topic_id = ${topicId}
          AND package_id IS NULL
          AND source ILIKE ${m.sourcePattern}
      `);
      console.info(`✓ Paket "${m.packageName}" (${m.topicSlug}): terhubung.`);
    }
  }

  // Fallback: attach any remaining unlinked questions to Paket 1 of their topic
  for (const t of allTopics) {
    const [paket1] = await db
      .select()
      .from(questionPackages)
      .where(sql`${questionPackages.topicId} = ${t.id} AND ${questionPackages.name} = 'Paket 1'`);

    if (paket1) {
      await db.execute(sql`
        UPDATE questions
        SET package_id = ${paket1.id}
        WHERE topic_id = ${t.id} AND package_id IS NULL
      `);
    }
  }

  invalidateCatalogCache();
  console.info("Pemulihan paket selesai.");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
