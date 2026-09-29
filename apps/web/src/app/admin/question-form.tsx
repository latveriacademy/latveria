"use client";

import { useActionState } from "react";
import { createQuestion } from "./actions";

export function QuestionForm({ topics }: { topics: { id: string; name: string }[] }) {
  const [message, action, pending] = useActionState(createQuestion, "");
  if (!topics.length) return <p>Belum ada topik. Jalankan <code>pnpm db:seed</code> untuk menambah topik dummy.</p>;
  return (
    <form action={action} className="grid max-w-2xl gap-4 rounded border border-[var(--rule)] bg-[var(--paper-light)] p-6">
      <label className="grid gap-1">Topik<select className="min-h-11 border border-[var(--rule)] bg-[var(--paper)] px-3" name="topicId" required>{topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></label>
      <label className="grid gap-1">Pertanyaan<textarea className="min-h-24 border border-[var(--rule)] bg-[var(--paper)] p-3" name="prompt" minLength={5} required /></label>
      {[0, 1, 2, 3].map((index) => <label className="grid gap-1" key={index}>Opsi {index + 1}<input className="min-h-11 border border-[var(--rule)] bg-[var(--paper)] px-3" name={`option-${index}`} required /></label>)}
      <label className="grid gap-1">Jawaban benar<select className="min-h-11 border border-[var(--rule)] bg-[var(--paper)] px-3" name="correctAnswer">{[0, 1, 2, 3].map((index) => <option key={index} value={index}>Opsi {index + 1}</option>)}</select></label>
      <label className="grid gap-1">Pembahasan<textarea className="min-h-24 border border-[var(--rule)] bg-[var(--paper)] p-3" name="explanation" minLength={5} required /></label>
      <label className="grid gap-1">Sumber soal<input className="min-h-11 border border-[var(--rule)] bg-[var(--paper)] px-3" name="source" required /></label>
      {message && <p role="status">{message}</p>}
      <button className="min-h-11 bg-[var(--forest-dark)] px-4 text-[var(--paper-light)] disabled:opacity-60" disabled={pending}>{pending ? "Menyimpan..." : "Simpan soal"}</button>
    </form>
  );
}
