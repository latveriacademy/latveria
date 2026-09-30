import type { Metadata } from "next";
import styles from "../dashboard.module.css";
import { getPracticeTopics } from "../topic-data";
import { TopicList } from "../topic-list";

export const metadata: Metadata = { title: "Latihan | Latveria" };

export default async function TopicsPage() {
  const items = await getPracticeTopics();
  return <section className={styles.page}><div className={styles.pageHeading}><h1>Latihan</h1><p>Pilih topik untuk mulai mengerjakan soal contoh.</p></div>
    <div className={styles.topicPageList}><TopicList items={items} /></div>
  </section>;
}
