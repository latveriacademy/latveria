import type { Metadata } from "next";
import Link from "next/link";
import { count, countDistinct, desc, eq, sum } from "drizzle-orm";
import { requireUser } from "../../lib/access";
import { getDb } from "../../lib/db";
import { practiceAttempts, topics } from "../../lib/db/schema";
import styles from "./dashboard.module.css";
import { getPracticeTopics } from "./topic-data";
import { TopicList } from "./topic-list";

export const metadata: Metadata = { title: "Beranda | Latveria" };

export default async function Dashboard() {
  const user = await requireUser();
  const db = getDb();
  const [[summary], recent, catalog] = await Promise.all([
    db.select({ attempts: count(practiceAttempts.id), tried: countDistinct(practiceAttempts.topicId), correct: sum(practiceAttempts.correctCount), answered: sum(practiceAttempts.totalCount) }).from(practiceAttempts).where(eq(practiceAttempts.userId, user.id)),
    db.select({ slug: topics.slug, topic: topics.name })
      .from(practiceAttempts).innerJoin(topics, eq(practiceAttempts.topicId, topics.id)).where(eq(practiceAttempts.userId, user.id)).orderBy(desc(practiceAttempts.submittedAt)).limit(1),
    getPracticeTopics(),
  ]);
  const recommended = recent[0]
    ? { slug: recent[0].slug, name: recent[0].topic }
    : catalog.find((topic) => topic.questionCount > 0);
  const accuracy = Number(summary.answered) ? Math.round(Number(summary.correct) / Number(summary.answered) * 100) : null;
  return <section className={styles.home} aria-labelledby="judul-beranda">
    <div className={styles.pageHeading}><h1 id="judul-beranda">Latihan</h1><p>Soal singkat untuk memahami materi, satu topik dalam satu waktu.</p></div>
    <div className={styles.homeColumns}>
      <div className={styles.homeMain}>
        {recommended && <section className={styles.continueCard} aria-labelledby="lanjut-judul">
          <div className={styles.continueMark} aria-hidden="true">{recent.length ? "↺" : "→"}</div>
          <div className={styles.continueCopy}><span>{recent.length ? "Topik terakhir" : "Mulai dari sini"}</span><h2 id="lanjut-judul">{recommended.name.replace(" (dummy)", "")}</h2><p>{recent.length ? "Kerjakan set soal baru pada topik ini." : "Buka soal dan baca pembahasannya setelah selesai."}</p></div>
          <Link className={styles.primary} href={`/dashboard/topik/${recommended.slug}`}>{recent.length ? "Latihan lagi" : "Mulai latihan"}</Link>
        </section>}
        <dl className={styles.quickStats}><div><dt>Sesi selesai</dt><dd>{summary.attempts}</dd></div><div><dt>Soal dikerjakan</dt><dd>{Number(summary.answered ?? 0)}</dd></div></dl>
        <div className={styles.listHeading}><h2>Pilih topik</h2><Link href="/dashboard/topik">Lihat semua</Link></div>
        <TopicList items={catalog} />
      </div>
      <aside className={styles.progressPanel} aria-labelledby="progres-judul"><h2 id="progres-judul">Progres belajar</h2>
        <div className={styles.progressMain}><span className={styles.progressValue}>{accuracy === null ? "Belum ada" : `${accuracy}%`}</span><span>Akurasi latihan</span><p>{accuracy === null ? "Hasil muncul setelah latihan pertama." : `${summary.correct} dari ${summary.answered} soal dijawab benar.`}</p></div>
        <dl className={styles.progressDetails}><div><dt>Topik dicoba</dt><dd>{summary.tried}</dd></div><div><dt>Latihan selesai</dt><dd>{summary.attempts}</dd></div></dl>
        {summary.attempts > 0 && <Link href="/dashboard/riwayat">Buka riwayat latihan</Link>}
      </aside>
    </div>
  </section>;
}
