import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb } from "../../../lib/db";
import { questions, topics } from "../../../lib/db/schema";
import { MathText } from "../../../components/math-text";
import { utbkSubtests } from "../../../lib/utbk-subtests";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "Bank soal | Latveria Admin" };

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<{ subtes?: string; created?: string }> }) {
  const { subtes, created } = await searchParams;
  const selected = utbkSubtests.find((item) => item.slug === subtes);
  const rows = await getDb().select({ id: questions.id, prompt: questions.prompt, topic: topics.name, source: questions.source })
    .from(questions).innerJoin(topics, eq(questions.topicId, topics.id))
    .where(selected ? eq(topics.slug, selected.slug) : undefined).orderBy(topics.name, questions.id);
  const saved = rows.find((item) => item.id === created);
  const items = saved ? [saved, ...rows.filter((item) => item.id !== saved.id)] : rows;
  return <>
    <header className={styles.pageHeader}><div><h1>Bank soal</h1><p>{items.length} soal{selected ? ` dalam ${selected.name}` : " tersimpan"}</p></div><Link href="/admin/soal/baru" className={styles.primary}>Tambah soal</Link></header>
    {saved && <p className={styles.success} role="status">Soal tersimpan di {saved.topic}.</p>}
    <form className={styles.filter} action="/admin/soal" method="get">
      <label htmlFor="subtes">Subtes</label>
      <select id="subtes" name="subtes" defaultValue={selected?.slug ?? ""}><option value="">Semua subtes</option>{utbkSubtests.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select>
      <button type="submit">Tampilkan</button>
      {selected && <Link href="/admin/soal">Reset filter</Link>}
    </form>
    {items.length ? <ul className={styles.questionList}>{items.map((item) => <li className={saved?.id === item.id ? styles.savedQuestion : undefined} key={item.id}>
      <strong><MathText>{item.prompt}</MathText></strong><span>{item.topic} <span aria-hidden="true">/</span> {item.source}</span>
    </li>)}</ul> : <div className={styles.empty}>Belum ada soal untuk subtes ini.</div>}
  </>;
}
