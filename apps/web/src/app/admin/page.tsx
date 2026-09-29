import type { Metadata } from "next";
import Link from "next/link";
import { count } from "drizzle-orm";
import { getDb } from "../../lib/db";
import { questions, topics } from "../../lib/db/schema";

export const metadata: Metadata = { title: "Admin | Latveria" };

export default async function AdminPage() {
  const [[topicCount], [questionCount]] = await Promise.all([getDb().select({ value: count() }).from(topics), getDb().select({ value: count() }).from(questions)]);
  return <><h1 className="!mb-3 !text-5xl">Ringkasan konten</h1><p className="mb-8">Kelola katalog topik dan soal latihan.</p><dl className="grid max-w-2xl grid-cols-2 border-y border-[var(--rule)]"><div className="py-6"><dt>Topik</dt><dd className="text-4xl font-bold">{topicCount.value}</dd></div><div className="border-l border-[var(--rule)] p-6"><dt>Soal</dt><dd className="text-4xl font-bold">{questionCount.value}</dd></div></dl><div className="mt-8 flex gap-5"><Link href="/admin/soal">Lihat soal</Link><Link href="/admin/soal/baru">Tambah soal</Link></div></>;
}
