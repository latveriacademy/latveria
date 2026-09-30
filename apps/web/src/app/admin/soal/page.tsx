import type { Metadata } from "next";
import Link from "next/link";
import { and, count, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Eye, Plus, RotateCcw } from "lucide-react";
import { getDb } from "../../../lib/db";
import { questions, topics } from "../../../lib/db/schema";
import { MathText } from "../../../components/math-text";
import { Button } from "../../../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { utbkSubtests } from "../../../lib/utbk-subtests";
import { CategorySelect, QuestionSubtestTabs } from "./question-filters";
import { PaginationControls } from "./pagination-controls";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "Bank soal | Latveria Admin" };

const PAGE_SIZE = 15;

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<{ subtes?: string; kategori?: string; halaman?: string; created?: string }> }) {
  const { subtes, kategori, created, halaman: pageValue } = await searchParams;
  const selected = utbkSubtests.find((item) => item.slug === subtes);
  if (subtes && !selected) notFound();
  const category = kategori?.trim() || undefined;
  const rawPage = Number(pageValue ?? 1);
  const page = Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 10000 ? rawPage : 1;
  const filters = [selected ? eq(topics.slug, selected.slug) : undefined, category ? eq(questions.category, category) : undefined].filter((filter) => filter !== undefined);
  const where = filters.length ? and(...filters) : undefined;
  const db = getDb();
  const [rows, [totalRow], categoryRows, tabRows] = await Promise.all([
    db.select({ id: questions.id, prompt: questions.prompt, category: questions.category, topic: topics.name, topicSlug: topics.slug, source: questions.source })
      .from(questions).innerJoin(topics, eq(questions.topicId, topics.id)).where(where)
      .orderBy(topics.name, questions.id).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ value: count() }).from(questions).innerJoin(topics, eq(questions.topicId, topics.id)).where(where),
    db.selectDistinct({ category: questions.category }).from(questions).innerJoin(topics, eq(questions.topicId, topics.id))
      .where(selected ? eq(topics.slug, selected.slug) : undefined).orderBy(questions.category),
    db.select({ slug: topics.slug, value: count(questions.id) }).from(topics).leftJoin(questions, eq(questions.topicId, topics.id))
      .groupBy(topics.slug),
  ]);
  const saved = rows.find((item) => item.id === created);
  const total = totalRow.value;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const categories = categoryRows.flatMap((row) => row.category ? [row.category] : []);
  const selectedCategory = category && categories.includes(category) ? category : undefined;
  const href = (values: { subtes?: string; kategori?: string; halaman?: number }) => {
    const query = new URLSearchParams();
    if (values.subtes) query.set("subtes", values.subtes);
    if (values.kategori) query.set("kategori", values.kategori);
    if (values.halaman && values.halaman > 1) query.set("halaman", String(values.halaman));
    const search = query.toString();
    return search ? `/admin/soal?${search}` : "/admin/soal";
  };
  const tabs = [
    { slug: "semua", name: "Semua", value: tabRows.reduce((sum, item) => sum + item.value, 0) },
    ...utbkSubtests.map((item) => ({ slug: item.slug, name: item.name, value: tabRows.find((row) => row.slug === item.slug)?.value ?? 0 })),
  ];
  return <>
    <header className={styles.pageHeader}><div><h1>Bank soal</h1><p>{total} soal{selected ? ` · ${selected.name}` : ""}</p></div><Button asChild><Link href={`/admin/soal/baru${selected ? `?subtes=${selected.slug}` : ""}`}><Plus />Tambah soal</Link></Button></header>
    {saved && <p className={styles.success} role="status">Soal tersimpan di {saved.topic}.</p>}
    <QuestionSubtestTabs tabs={tabs} selected={selected?.slug ?? "semua"} />
    <div className={styles.filter}>
      <span id="category-filter-label" className={styles.filterLabel}>Kategori materi</span><CategorySelect categories={categories} value={selectedCategory} />
      {selectedCategory && <Button asChild variant="ghost"><Link href={href({ subtes: selected?.slug })}><RotateCcw />Reset</Link></Button>}
    </div>
    <Table className={styles.questionTable}><TableHeader><TableRow><TableHead className={styles.numberColumn}>#</TableHead><TableHead>Pertanyaan</TableHead><TableHead>Kategori</TableHead><TableHead>Sumber</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
      <TableBody>{rows.map((item, index) => <TableRow className={saved?.id === item.id ? styles.savedQuestion : undefined} key={item.id}><TableCell>{(page - 1) * PAGE_SIZE + index + 1}</TableCell><TableCell className={styles.promptCell}><MathText>{item.prompt}</MathText></TableCell><TableCell>{item.category ?? <span className={styles.noCategory}>Belum diatur</span>}</TableCell><TableCell>{item.source}</TableCell><TableCell><Button asChild variant="outline" size="sm"><Link href={`/admin/soal/${item.id}`} aria-label={`Pratinjau soal ${item.prompt}`}><Eye />Pratinjau</Link></Button></TableCell></TableRow>)}{!rows.length && <TableRow><TableCell colSpan={5} className={styles.emptyCell}>Belum ada soal untuk filter ini.</TableCell></TableRow>}</TableBody>
    </Table>
    <nav className={styles.pagination} aria-label="Paginasi bank soal"><span>{total ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} dari ${total}` : "0 soal"}</span><PaginationControls page={page} pageCount={pageCount} previousHref={href({ subtes: selected?.slug, kategori: selectedCategory, halaman: Math.max(1, page - 1) })} nextHref={href({ subtes: selected?.slug, kategori: selectedCategory, halaman: Math.min(pageCount, page + 1) })} /></nav>
  </>;
}
