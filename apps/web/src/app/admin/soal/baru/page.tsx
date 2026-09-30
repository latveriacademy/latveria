import type { Metadata } from "next";
import { getDb } from "../../../../lib/db";
import { topics } from "../../../../lib/db/schema";
import { QuestionForm } from "../../question-form";
import { utbkSubtests } from "../../../../lib/utbk-subtests";
import styles from "../../admin.module.css";

export const metadata: Metadata = { title: "Tambah soal | Latveria Admin" };

export default async function NewQuestionPage({ searchParams }: { searchParams: Promise<{ subtes?: string }> }) {
  const { subtes } = await searchParams;
  const rows = await getDb().select({ id: topics.id, slug: topics.slug, name: topics.name }).from(topics);
  const topicList = utbkSubtests.flatMap((subtest) => {
    const topic = rows.find((row) => row.slug === subtest.slug);
    return topic ? [{ id: topic.id, name: topic.name, section: subtest.section }] : [];
  });
  const initialTopicId = rows.find((row) => row.slug === subtes)?.id;
  return <><header className={styles.pageHeader}><div><h1>Tambah soal</h1><p>Soal langsung tersedia untuk latsol setelah disimpan.</p></div></header><QuestionForm topics={topicList} initialTopicId={initialTopicId} /></>;
}
