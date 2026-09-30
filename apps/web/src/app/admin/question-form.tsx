"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createQuestion } from "./actions";
import styles from "./admin.module.css";

export function QuestionForm({ topics }: { topics: { id: string; name: string; section: "tps" | "literasi" }[] }) {
  const [message, action, pending] = useActionState(createQuestion, "");
  if (!topics.length) return <p>Belum ada topik. Jalankan <code>pnpm db:seed</code> untuk menambah topik dummy.</p>;
  return (
    <form action={action} className={styles.questionForm}>
      <fieldset className={styles.formSection}><legend>Soal</legend>
        <div className={styles.field}><label htmlFor="topicId">Subtes</label><select id="topicId" name="topicId" required>{["tps", "literasi"].map((section) => <optgroup key={section} label={section === "tps" ? "Tes Potensi Skolastik" : "Tes Literasi"}>{topics.filter((topic) => topic.section === section).map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</optgroup>)}</select></div>
        <div className={styles.field}><label htmlFor="prompt">Pertanyaan</label><textarea id="prompt" name="prompt" minLength={5} maxLength={1000} required /></div>
        <p className={styles.hint}>Rumus: <code>$x^2$</code> inline atau <code>$$\frac&#123;1&#125;&#123;2&#125;$$</code> blok.</p>
      </fieldset>
      <fieldset className={styles.formSection}><legend>Pilihan jawaban</legend>
        <div className={styles.options}>{[0, 1, 2, 3].map((index) => <div className={styles.field} key={index}><label htmlFor={`option-${index}`}>Opsi {index + 1}</label><input id={`option-${index}`} name={`option-${index}`} maxLength={300} required /></div>)}</div>
        <div className={styles.field}><label htmlFor="correctAnswer">Jawaban benar</label><select id="correctAnswer" name="correctAnswer">{[0, 1, 2, 3].map((index) => <option key={index} value={index}>Opsi {index + 1}</option>)}</select></div>
      </fieldset>
      <fieldset className={styles.formSection}><legend>Pembahasan dan sumber</legend>
        <div className={styles.field}><label htmlFor="explanation">Pembahasan</label><textarea id="explanation" name="explanation" minLength={5} maxLength={2000} required /></div>
        <div className={styles.field}><label htmlFor="source">Sumber soal</label><input id="source" name="source" maxLength={300} required /></div>
      </fieldset>
      {message && <p className={styles.formError} role="alert">{message}</p>}
      <div className={styles.formActions}><button className={styles.primary} disabled={pending}>{pending ? "Menyimpan..." : "Simpan soal"}</button><Link href="/admin/soal">Batal</Link></div>
    </form>
  );
}
