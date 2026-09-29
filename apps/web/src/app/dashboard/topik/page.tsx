import type { Metadata } from "next";
import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { getDb } from "../../../lib/db";
import { questions, topics } from "../../../lib/db/schema";
import styles from "../dashboard.module.css";

export const metadata: Metadata = { title: "Topik | Latveria" };

export default async function TopicsPage() {
  const items = await getDb().select({ slug: topics.slug, name: topics.name, description: topics.description, questionCount: count(questions.id) })
    .from(topics).leftJoin(questions, eq(questions.topicId, topics.id)).groupBy(topics.id).orderBy(topics.name);
  return <section className={styles.page}><div className={styles.heading}><div><h1>Topik</h1><p>Pilih materi untuk membuka latsol.</p></div></div>
    <div className={styles.topicGrid}>{items.map((topic) => <article className={styles.topic} key={topic.slug}><h2>{topic.name.replace(" (dummy)", "")}</h2><p>{topic.description.replace(" Data pengembangan, bukan materi resmi UTBK.", "")}</p><div><span>{topic.questionCount} soal</span><Link href={`/dashboard/topik/${topic.slug}`}>Buka latsol</Link></div></article>)}</div>
  </section>;
}
