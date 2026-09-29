import type { Metadata } from "next";
import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { requireUser } from "../../lib/access";
import { getDb } from "../../lib/db";
import { practiceAttempts, topics } from "../../lib/db/schema";
import styles from "./dashboard.module.css";

export const metadata: Metadata = { title: "Ringkasan | Latveria" };

export default async function Dashboard() {
  const user = await requireUser();
  const db = getDb();
  const [[summary], recent] = await Promise.all([
    db.select({ attempts: count(practiceAttempts.id) }).from(practiceAttempts).where(eq(practiceAttempts.userId, user.id)),
    db.select({ id: practiceAttempts.id, topic: topics.name, correct: practiceAttempts.correctCount, total: practiceAttempts.totalCount })
      .from(practiceAttempts).innerJoin(topics, eq(practiceAttempts.topicId, topics.id)).where(eq(practiceAttempts.userId, user.id)).orderBy(desc(practiceAttempts.submittedAt)).limit(3),
  ]);
  return <>
    <section className={styles.intro}><div><h1>Mulai dari satu topik.</h1><p>Kerjakan latsol singkat, lalu baca pembahasannya.</p></div><Link className={styles.primary} href="/dashboard/topik">Pilih topik</Link></section>
    <dl className={styles.stats}><div><dt>Latihan selesai</dt><dd>{summary.attempts}</dd></div><div><dt>Terakhir dikerjakan</dt><dd className={styles.statText}>{recent[0]?.topic ?? "Belum ada"}</dd></div></dl>
    <section className={styles.block}><div className={styles.heading}><h2>Aktivitas terbaru</h2>{recent.length > 0 && <Link href="/dashboard/riwayat">Lihat semua</Link>}</div>
      {recent.length ? <ul className={styles.rows}>{recent.map((item) => <li key={item.id}><Link href={`/dashboard/riwayat/${item.id}`}><span>{item.topic}</span><strong>{item.correct}/{item.total}</strong></Link></li>)}</ul> : <div className={styles.empty}><p>Belum ada latihan.</p><Link href="/dashboard/topik">Pilih topik pertama</Link></div>}
    </section>
  </>;
}
