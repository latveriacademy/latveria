import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireUser } from "../../../lib/access";
import { getDb } from "../../../lib/db";
import { practiceAttempts, topics } from "../../../lib/db/schema";
import styles from "../dashboard.module.css";

export const metadata: Metadata = { title: "Riwayat | Latveria" };

export default async function HistoryPage() {
  const user = await requireUser();
  const items = await getDb().select({ id: practiceAttempts.id, topic: topics.name, correct: practiceAttempts.correctCount, total: practiceAttempts.totalCount, submittedAt: practiceAttempts.submittedAt })
    .from(practiceAttempts).innerJoin(topics, eq(practiceAttempts.topicId, topics.id)).where(eq(practiceAttempts.userId, user.id)).orderBy(desc(practiceAttempts.submittedAt));
  return <section className={styles.page}><div className={styles.heading}><div><h1>Riwayat</h1><p>Hasil latihan yang sudah dikumpulkan.</p></div></div>{items.length ? <ul className={styles.rows}>{items.map((item) => <li key={item.id}><Link href={`/dashboard/riwayat/${item.id}`}><span><strong>{item.topic.replace(" (dummy)", "")}</strong><small>{item.submittedAt.toLocaleString("id-ID")}</small></span><strong>{item.correct}/{item.total}</strong></Link></li>)}</ul> : <div className={styles.empty}><p>Belum ada riwayat.</p><Link href="/dashboard/topik">Mulai latsol</Link></div>}</section>;
}
