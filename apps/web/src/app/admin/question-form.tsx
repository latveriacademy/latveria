"use client";

import { useActionState, useState } from "react";
import { Link, useNavigate } from "react-router";
import { questionSchema, type QuestionDetail } from "@latveria/shared";
import { api } from "../../lib/api";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "../../components/ui/button";
import { MathText } from "../../components/math-text";
import { tikzExamples } from "../../lib/tikz-examples";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../../components/ui/select";
import styles from "./admin.module.css";

export function QuestionForm({ topics, initialTopicId, question }: { topics: { id: string; name: string; section: "tps" | "literasi" }[]; initialTopicId?: string; question?: QuestionDetail }) {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  const [diagramError, setDiagramError] = useState("");
  const createQuestion = async (_previous: string, form: FormData) => {
    const parsed = questionSchema.safeParse({ topicId: form.get("topicId"), prompt: form.get("prompt"), options: [0, 1, 2, 3].map((index) => form.get(`option-${index}`)), correctAnswer: Number(form.get("correctAnswer")), explanation: form.get("explanation"), source: form.get("source"), category: String(form.get("category") ?? "").trim() || undefined });
    if (!parsed.success) return parsed.error.issues[0].message;
    try {
      const result = await api<{ id: string; slug: string }>(question ? `/admin/questions/${question.id}` : "/admin/questions", { method: question ? "PUT" : "POST", body: JSON.stringify(parsed.data) });
      navigate(question ? `/admin/soal/${result.id}?updated=1` : `/admin/soal?subtes=${result.slug}&created=${result.id}`);
      return "";
    } catch (error) { return error instanceof Error ? error.message : "Gagal menyimpan soal."; }
  };
  const [message, action, pending] = useActionState(createQuestion, "");
  if (!topics.length) return <div className={styles.empty}><p>Belum ada subtes. Jalankan <code>bun run db:seed</code> untuk memuat katalog UTBK.</p></div>;
  return (
    <form action={action} className={styles.questionForm}>
      <fieldset className={styles.formSection}><legend>Soal</legend>
        <div className={styles.field}><label htmlFor="topicId">Subtes</label><Select name="topicId" defaultValue={question?.topicId ?? initialTopicId} required><SelectTrigger id="topicId"><SelectValue placeholder="Pilih subtes" /></SelectTrigger><SelectContent>{(["tps", "literasi"] as const).map((section) => <SelectGroup key={section}><SelectLabel>{section === "tps" ? "Tes Potensi Skolastik" : "Tes Literasi"}</SelectLabel>{topics.filter((topic) => topic.section === section).map((topic) => <SelectItem key={topic.id} value={topic.id}>{topic.name}</SelectItem>)}</SelectGroup>)}</SelectContent></Select></div>
        <div className={styles.field}><label htmlFor="category">Materi / kategori</label><input id="category" name="category" maxLength={120} defaultValue={question?.category} placeholder="Contoh: Perbandingan dan persentase" /><span className={styles.hint}>Opsional. Isi sesuai materi yang ingin kamu kelompokkan.</span></div>
        <div className={styles.field}><label htmlFor="prompt">Pertanyaan</label><textarea id="prompt" name="prompt" minLength={5} maxLength={1000} value={prompt} onChange={(event) => { setPrompt(event.target.value); setDiagramError(""); }} required /></div>
        <p className={styles.hint}>Rumus: <code>$x^2$</code> inline atau <code>$$\frac&#123;1&#125;&#123;2&#125;$$</code> blok.</p>
        <details className={styles.diagramHelp}>
          <summary>Tambahkan diagram geometri</summary>
          <p>TikZ dasar mendukung garis, poligon, rectangle, lingkaran, elips, dan label LaTeX. Koordinat (x,y,z) diproyeksikan untuk bangun ruang.</p>
          <div className={styles.formActions}>{tikzExamples.map((example) => <Button type="button" size="sm" variant="outline" key={example.name} disabled={pending} onClick={() => {
            const next = prompt.trim() ? `${prompt}\n\n${example.source}` : example.source;
            if (next.length > 1000) { setDiagramError("Contoh ini melebihi batas 1.000 karakter pertanyaan. Ringkas teks atau diagram sebelum menambahkannya."); return; }
            setPrompt(next); setDiagramError("");
          }}>Tambahkan {example.name.toLowerCase()}</Button>)}</div>
          <p>Ubah koordinat dan label di teks pertanyaan. Gunakan <code>% alt: deskripsi bangun</code> untuk membantu pembaca layar. Sintaks TikZ lain belum didukung.</p>
          {diagramError && <p role="alert">{diagramError}</p>}
        </details>
        {prompt && <div className={styles.promptPreview}><h2>Pratinjau pertanyaan</h2><MathText>{prompt}</MathText></div>}
      </fieldset>
      <fieldset className={styles.formSection}><legend>Pilihan jawaban</legend>
        <div className={styles.options}>{[0, 1, 2, 3].map((index) => <div className={styles.field} key={index}><label htmlFor={`option-${index}`}>Opsi {index + 1}</label><input id={`option-${index}`} name={`option-${index}`} maxLength={300} defaultValue={question?.options[index]} required /></div>)}</div>
        <div className={styles.field}><label htmlFor="correctAnswer">Jawaban benar</label><Select name="correctAnswer" defaultValue={String(question?.correctAnswer ?? 0)}><SelectTrigger id="correctAnswer"><SelectValue /></SelectTrigger><SelectContent>{[0, 1, 2, 3].map((index) => <SelectItem key={index} value={String(index)}>Opsi {index + 1}</SelectItem>)}</SelectContent></Select></div>
      </fieldset>
      <fieldset className={styles.formSection}><legend>Pembahasan dan sumber</legend>
        <div className={styles.field}><label htmlFor="explanation">Pembahasan</label><textarea id="explanation" name="explanation" minLength={5} maxLength={2000} defaultValue={question?.explanation} required /></div>
        <div className={styles.field}><label htmlFor="source">Sumber soal</label><input id="source" name="source" maxLength={300} defaultValue={question?.source} required /></div>
      </fieldset>
      {message && <p className={styles.formError} role="alert">{message}</p>}
      <div className={styles.formActions}><Button type="submit" disabled={pending}>{pending ? "Menyimpan..." : <><Save />{question ? "Simpan perubahan" : "Simpan soal"}</>}</Button><Button asChild variant="ghost"><Link to={question ? `/admin/soal/${question.id}` : "/admin/soal"}><ArrowLeft />Batal</Link></Button></div>
    </form>
  );
}
