import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "../../lib/access";
import { getDb } from "../../lib/db";
import { questions, topics } from "../../lib/db/schema";
import { SignOut } from "../sign-out";
import { QuestionForm } from "./question-form";

export const metadata: Metadata = { title: "Kelola soal | Latveria" };

export default async function AdminPage() {
  const admin = await requireAdmin();
  const db = getDb();
  const [topicList, questionList] = await Promise.all([
    db.select({ id: topics.id, name: topics.name }).from(topics),
    db.select({ id: questions.id, prompt: questions.prompt, topic: topics.name, source: questions.source })
      .from(questions).innerJoin(topics, eq(questions.topicId, topics.id)).orderBy(desc(questions.id)).limit(50),
  ]);
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <nav className="mb-8 flex flex-wrap items-center gap-6" aria-label="Navigasi admin"><Link href="/dashboard">← Dashboard</Link><span>Admin: {admin.name}</span><SignOut /></nav>
      <h1 className="!text-5xl">Kelola soal</h1>
      <p className="my-5">Soal yang dibuat di sini adalah konten draft lokal. Pastikan sumber dan izin konten sebelum digunakan untuk latihan.</p>
      <QuestionForm topics={topicList} />
      <section className="mt-12"><h2 className="!text-3xl">Soal tersimpan</h2><ul className="mt-5 grid gap-3">{questionList.map((item) => <li className="border-b border-[var(--rule)] pb-3" key={item.id}><strong>{item.prompt}</strong><p>{item.topic} · {item.source}</p></li>)}</ul>{!questionList.length && <p>Belum ada soal.</p>}</section>
    </main>
  );
}
