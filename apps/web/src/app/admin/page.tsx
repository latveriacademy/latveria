import type { Metadata } from "next";
import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { getDb } from "../../lib/db";
import { questions, topics } from "../../lib/db/schema";
import { utbkSubtests } from "../../lib/utbk-subtests";
import styles from "./admin.module.css";

export const metadata: Metadata = { title: "Admin | Latveria" };

export default async function AdminPage() {
  const rows = await getDb().select({ slug: topics.slug, name: topics.name, total: count(questions.id) })
    .from(topics).leftJoin(questions, eq(questions.topicId, topics.id)).groupBy(topics.id);
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  return <>
    <header className={styles.pageHeader}><div><h1>Konten latihan</h1><p>{rows.length} subtes, {total} soal</p></div><Link href="/admin/soal/baru" className={styles.primary}>Tambah soal</Link></header>
    <section className={styles.summary} aria-labelledby="per-subtes"><h2 id="per-subtes">Soal per subtes</h2>
      {(["tps", "literasi"] as const).map((section) => <div className={styles.summaryGroup} key={section}>
        <h3>{section === "tps" ? "Tes Potensi Skolastik" : "Tes Literasi"}</h3>
        <ul>{utbkSubtests.filter((subtest) => subtest.section === section).map((subtest) => {
          const row = bySlug.get(subtest.slug);
          return <li key={subtest.slug}><Link href={`/admin/soal?subtes=${subtest.slug}`}><span>{row?.name ?? subtest.name}</span><strong>{row?.total ?? 0} soal</strong></Link></li>;
        })}</ul>
      </div>)}
    </section>
  </>;
}
