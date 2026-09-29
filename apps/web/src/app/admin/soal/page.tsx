import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../lib/db";
import { questions, topics } from "../../../lib/db/schema";

export const metadata: Metadata = { title: "Daftar soal | Latveria Admin" };

export default async function QuestionsPage() {
  const items = await getDb().select({ id: questions.id, prompt: questions.prompt, topic: topics.name, source: questions.source }).from(questions).innerJoin(topics, eq(questions.topicId, topics.id)).orderBy(desc(questions.id)).limit(100);
  return <><div className="mb-8 flex flex-wrap items-end justify-between gap-5"><div><h1 className="!mb-2 !text-5xl">Daftar soal</h1><p>{items.length} soal tersimpan</p></div><Link className="bg-[var(--forest-dark)] px-4 py-3 text-[var(--paper-light)] no-underline" href="/admin/soal/baru">Tambah soal</Link></div><ul className="grid gap-0 border-t border-[var(--rule)]">{items.map((item) => <li className="border-b border-[var(--rule)] py-4" key={item.id}><strong>{item.prompt}</strong><p className="mt-1 text-sm">{item.topic.replace(" (dummy)", "")} | {item.source}</p></li>)}</ul></>;
}
