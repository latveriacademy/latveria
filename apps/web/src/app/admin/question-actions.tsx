"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { deleteQuestion } from "./actions";

export function DeleteQuestionForm({ id }: { id: string }) {
  const [message, action, pending] = useActionState(deleteQuestion, "");
  return <form action={action} className="grid gap-2">
    <input type="hidden" name="id" value={id} />
    <Button type="submit" variant="outline" disabled={pending}><Trash2 />{pending ? "Menghapus..." : "Hapus soal"}</Button>
    {message && <p className="text-sm text-red-900" role="alert">{message}</p>}
  </form>;
}

export function BackToQuestionList({ subtest }: { subtest: string }) {
  return <Button asChild variant="outline"><Link href={`/admin/soal?subtes=${subtest}`}><ArrowLeft />Kembali ke bank soal</Link></Button>;
}
