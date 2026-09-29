import type { Metadata } from "next";
import { getDb } from "../../../../lib/db";
import { topics } from "../../../../lib/db/schema";
import { QuestionForm } from "../../question-form";

export const metadata: Metadata = { title: "Tambah soal | Latveria Admin" };

export default async function NewQuestionPage() {
  const topicList = await getDb().select({ id: topics.id, name: topics.name }).from(topics).orderBy(topics.name);
  return <><h1 className="!mb-3 !text-5xl">Tambah soal</h1><p className="mb-7">Isi soal, empat opsi, jawaban benar, pembahasan, dan sumber.</p><QuestionForm topics={topicList} /></>;
}
