import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { questionImportSchema, utbkSubtests, type QuestionImport } from "@latveria/shared";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import styles from "./admin.module.css";

const example: QuestionImport = {
  groups: [{
    subtes: "pengetahuan-kuantitatif",
    category: "Perbandingan dan persentase",
    questions: [{
      prompt: "Berapakah $25\\%$ dari $80$?",
      options: ["$10$", "$15$", "$20$", "$25$"],
      correctAnswer: 2,
      explanation: "$25\\% \\times 80 = 20$.",
      source: "Contoh buatan tim",
    }],
  }],
};

export function ImportQuestions() {
  const navigate = useNavigate();
  const [batch, setBatch] = useState<QuestionImport | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const count = batch?.groups.reduce((sum, group) => sum + group.questions.length, 0) ?? 0;
  return <div className={styles.questionForm}>
    <p>Masukkan satu atau beberapa grup subtes dan kategori. Maksimal 100 soal, 200 KB. Seluruh batch dibatalkan jika ada yang tidak valid.</p>
    <details className={styles.formSection}><summary>Contoh format JSON</summary><pre className="overflow-x-auto text-sm">{JSON.stringify(example, null, 2)}</pre></details>
    <label className={styles.field} htmlFor="json-file">File JSON
      <input id="json-file" type="file" accept=".json,application/json" onChange={async (event) => {
        setError(""); setBatch(null);
        const file = event.target.files?.[0]; if (!file) return;
        if (file.size > 200_000) { setError("File melebihi 200 KB."); return; }
        try {
          const parsed = questionImportSchema.safeParse(JSON.parse(await file.text()));
          if (!parsed.success) {
            const issue = parsed.error.issues[0];
            const group = issue.path[1]; const question = issue.path[3];
            setError(`Periksa ${typeof group === "number" ? `grup ${group + 1}` : "format batch"}${typeof question === "number" ? `, soal ${question + 1}` : ""}: ${issue.message}`);
            return;
          }
          const invalid = parsed.data.groups.findIndex((group) => !utbkSubtests.some((subtest) => subtest.slug === group.subtes));
          if (invalid >= 0) { setError(`Subtes grup ${invalid + 1} tidak dikenal.`); return; }
          setBatch(parsed.data);
        } catch { setError("File bukan JSON yang valid."); }
      }} />
    </label>
    {batch && <div className={styles.summary}><strong>{count} soal siap diimpor</strong><ul>{batch.groups.map((group, index) => <li key={index}>{group.questions.length} soal · {utbkSubtests.find((subtest) => subtest.slug === group.subtes)?.name} · {group.category}</li>)}</ul></div>}
    {error && <p className={styles.formError} role="alert">{error}</p>}
    <div className={styles.formActions}><Button disabled={!batch || pending} onClick={async () => {
      if (!batch) return;
      setPending(true); setError("");
      try { const result = await api<{ count: number }>("/admin/questions/import", { method: "POST", body: JSON.stringify(batch) }); navigate(`/admin/soal?imported=${result.count}`); }
      catch (error) { setError(error instanceof Error ? error.message : "Impor gagal."); }
      finally { setPending(false); }
    }}>{pending ? "Mengimpor..." : `Impor ${count} soal`}</Button><Button asChild variant="ghost"><Link to="/admin/soal">Batal</Link></Button></div>
  </div>;
}
