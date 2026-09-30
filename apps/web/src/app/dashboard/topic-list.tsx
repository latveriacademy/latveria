import Link from "next/link";
import styles from "./dashboard.module.css";

type Topic = { slug: string; name: string; questionCount: number };

export function TopicList({ items }: { items: Topic[] }) {
  if (!items.length) return <div className={styles.empty}><p>Belum ada topik latihan.</p></div>;
  return <ul className={styles.topicList}>{items.map((topic) => <li key={topic.slug}>
    <Link href={`/dashboard/topik/${topic.slug}`}>
      <span className={styles.topicMark} aria-hidden="true">{topic.name.slice(0, 1)}</span>
      <span className={styles.topicName}>{topic.name.replace(" (dummy)", "")}</span>
      <span className={styles.topicCount}>{topic.questionCount} soal</span>
      <span className={styles.topicArrow} aria-hidden="true">›</span>
    </Link>
  </li>)}</ul>;
}
