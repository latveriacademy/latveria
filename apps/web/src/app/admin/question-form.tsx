"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../../components/ui/select";
import { createQuestion } from "./actions";
import styles from "./admin.module.css";

export function QuestionForm({ topics, initialTopicId }: { topics: { id: string; name: string; section: "tps" | "literasi" }[]; initialTopicId?: string }) {
  const [message, action, pending] = useActionState(createQuestion, "");
  if (!topics.length) return <div className={styles.empty}><p>Belum ada subtes. Jalankan <code>pnpm db:seed</code> untuk memuat katalog UTBK.</p></div>;
  return (
    <form action={action} className={styles.questionForm}>
      <fieldset className={styles.formSection}><legend>Soal</legend>
        <div className={styles.field}><label htmlFor="topicId">Subtes</label><Select name="topicId" defaultValue={initialTopicId} required><SelectTrigger id="topicId"><SelectValue placeholder="Pilih subtes" /></SelectTrigger><SelectContent>{(["tps", "literasi"] as const).map((section) => <SelectGroup key={section}><SelectLabel>{section === "tps" ? "Tes Potensi Skolastik" : "Tes Literasi"}</SelectLabel>{topics.filter((topic) => topic.section === section).map((topic) => <SelectItem key={topic.id} value={topic.id}>{topic.name}</SelectItem>)}</SelectGroup>)}</SelectContent></Select></div>
        <div className={styles.field}><label htmlFor="category">Materi / kategori</label><input id="category" name="category" maxLength={120} placeholder="Contoh: Perbandingan dan persentase" /><span className={styles.hint}>Opsional. Isi sesuai materi yang ingin kamu kelompokkan.</span></div>
        <div className={styles.field}><label htmlFor="prompt">Pertanyaan</label><textarea id="prompt" name="prompt" minLength={5} maxLength={1000} required /></div>
        <p className={styles.hint}>Rumus: <code>$x^2$</code> inline atau <code>$$\frac&#123;1&#125;&#123;2&#125;$$</code> blok.</p>
      </fieldset>
      <fieldset className={styles.formSection}><legend>Pilihan jawaban</legend>
        <div className={styles.options}>{[0, 1, 2, 3].map((index) => <div className={styles.field} key={index}><label htmlFor={`option-${index}`}>Opsi {index + 1}</label><input id={`option-${index}`} name={`option-${index}`} maxLength={300} required /></div>)}</div>
        <div className={styles.field}><label htmlFor="correctAnswer">Jawaban benar</label><Select name="correctAnswer" defaultValue="0"><SelectTrigger id="correctAnswer"><SelectValue /></SelectTrigger><SelectContent>{[0, 1, 2, 3].map((index) => <SelectItem key={index} value={String(index)}>Opsi {index + 1}</SelectItem>)}</SelectContent></Select></div>
      </fieldset>
      <fieldset className={styles.formSection}><legend>Pembahasan dan sumber</legend>
        <div className={styles.field}><label htmlFor="explanation">Pembahasan</label><textarea id="explanation" name="explanation" minLength={5} maxLength={2000} required /></div>
        <div className={styles.field}><label htmlFor="source">Sumber soal</label><input id="source" name="source" maxLength={300} required /></div>
      </fieldset>
      {message && <p className={styles.formError} role="alert">{message}</p>}
      <div className={styles.formActions}><Button type="submit" disabled={pending}>{pending ? "Menyimpan..." : <><Save />Simpan soal</>}</Button><Button asChild variant="ghost"><Link href="/admin/soal"><ArrowLeft />Batal</Link></Button></div>
    </form>
  );
}
