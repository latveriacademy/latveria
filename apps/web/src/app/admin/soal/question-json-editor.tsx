"use client";

import { useState } from "react";
import { Link, useNavigate } from "react-router";
import type { QuestionDetail } from "@latveria/shared";
import { ArrowLeft, Download, Loader2, RotateCcw, Save } from "lucide-react";
import { api } from "../../../lib/api";
import {
  downloadJson,
  parseQuestionEdit,
  questionFilename,
  questionToJson,
} from "../../../lib/question/question-export";
import { Button } from "../../../components/ui/button";
import styles from "../admin.module.css";

export function QuestionJsonEditor({
  question,
  topics,
}: {
  question: QuestionDetail;
  topics: { id: string; slug: string }[];
}) {
  const navigate = useNavigate();
  const original = questionToJson(question);
  const [text, setText] = useState(original);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const save = async () => {
    setError("");
    let body: ReturnType<typeof parseQuestionEdit>;
    try {
      body = parseQuestionEdit(text, topics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "JSON tidak valid.");
      return;
    }
    setPending(true);
    try {
      await api(`/admin/questions/${question.id}`, { method: "PUT", body: JSON.stringify(body) });
      navigate(`/admin/soal/${question.id}?updated=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan soal.");
      setPending(false);
    }
  };

  return (
    <div className={styles.questionForm}>
      <fieldset className={styles.formSection}>
        <legend>JSON soal</legend>
        <div className={styles.field}>
          <label htmlFor="question-json">Edit JSON</label>
          <textarea
            id="question-json"
            className={styles.jsonEditor}
            value={text}
            disabled={pending}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-describedby="question-json-help"
            aria-invalid={!!error}
            onChange={(event) => {
              setText(event.target.value);
              setError("");
            }}
          />
          <span id="question-json-help" className={styles.hint}>
            Format sama dengan impor soal: satu grup berisi satu soal. Gunakan{" "}
            <code>packageId</code> untuk menentukan paket; hapus untuk melepas soal dari paket.
          </span>
        </div>
      </fieldset>
      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}
      <div className={styles.formActions}>
        <Button type="button" disabled={pending} onClick={save}>
          {pending ? (
            <>
              <Loader2 className="animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Save />
              Simpan perubahan
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => downloadJson(questionFilename(question), text)}
        >
          <Download />
          Unduh JSON
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending || text === original}
          onClick={() => {
            setText(original);
            setError("");
          }}
        >
          <RotateCcw />
          Kembalikan
        </Button>
        <Button asChild variant="ghost">
          <Link to={`/admin/soal/${question.id}`}>
            <ArrowLeft />
            Batal
          </Link>
        </Button>
      </div>
    </div>
  );
}
