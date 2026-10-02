import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { utbkSubtests } from "@latveria/shared";
import { FileCheck, Loader2, Upload } from "lucide-react";
import { api } from "../../lib/api";
import { parseQuestionImport } from "../../lib/question-import";
import { geometryImportExample } from "../../lib/tikz-examples";
import { Button } from "../../components/ui/button";
import { Panel, PanelHeader } from "../../components/ui/dashboard";
import styles from "./admin.module.css";

export function ImportQuestions() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [batch, setBatch] = useState<typeof geometryImportExample | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [reading, setReading] = useState(false);
  const [fileName, setFileName] = useState("");
  const busy = pending || reading;
  const count = batch?.groups.reduce((sum, group) => sum + group.questions.length, 0) ?? 0;

  const check = (source: string) => {
    setError(""); setBatch(null);
    try { setBatch(parseQuestionImport(source)); }
    catch (error) { setError(error instanceof Error ? error.message : "JSON tidak dapat diperiksa."); }
  };

  return <div className={styles.importLayout}>
    <Panel>
      <PanelHeader title="Data soal"><Button variant="outline" size="sm" type="button" disabled={busy} onClick={() => {
        setText(JSON.stringify(geometryImportExample, null, 2)); setBatch(null); setError(""); setFileName("");
      }}>Gunakan contoh bangun ruang</Button></PanelHeader>
      <div className={styles.importEditor}>
        <div className={styles.field}>
          <label htmlFor="json-input">JSON</label>
          <textarea id="json-input" className={styles.jsonEditor} value={text} disabled={busy} spellCheck={false} autoCapitalize="off" autoCorrect="off" placeholder="Tempel JSON soal di sini…" aria-describedby={`json-help${error ? " json-error" : ""}`} aria-invalid={!!error} onChange={(event) => {
            setText(event.target.value); setBatch(null); setError(""); setFileName("");
          }} />
          <p id="json-help" className={styles.importHelp}>Maksimal 100 soal dan 200 KB. Setiap soal memiliki 4 opsi; <code>correctAnswer</code> memakai indeks 0–3.</p>
        </div>
        <div className={styles.field}>
          <label htmlFor="json-file">Atau unggah file JSON</label>
          <input id="json-file" type="file" accept=".json,application/json" disabled={busy} onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            event.target.value = "";
            setBatch(null); setError(""); setFileName("");
            if (file.size > 200_000) { setError("File melebihi 200 KB. Pilih file yang lebih kecil."); return; }
            setReading(true);
            try { const source = await file.text(); setText(source); setFileName(file.name); check(source); }
            catch { setError("File tidak dapat dibaca. Coba pilih file lagi."); }
            finally { setReading(false); }
          }} />
          <p className={styles.importHelp}>{reading ? "Membaca file…" : fileName ? `${fileName} sudah dimuat ke editor. Kamu bisa memperbaikinya sebelum impor.` : "Isi file akan masuk ke editor dan bisa diperbaiki sebelum diimpor."}</p>
        </div>
        <Button type="button" variant="outline" disabled={!text.trim() || busy} onClick={() => check(text)}><FileCheck />Periksa JSON</Button>
        {error && <p id="json-error" className={styles.formError} role="alert">{error}</p>}
      </div>
    </Panel>
    <Panel className={styles.importSummary}>
      <PanelHeader title="Ringkasan impor" />
      {batch ? <div role="status">
        <p className={styles.importCount}>{count} soal siap diimpor</p>
        <ul className={styles.importGroups}>{batch.groups.map((group, index) => <li key={index}>
          <strong>{utbkSubtests.find((subtest) => subtest.slug === group.subtes)?.name}</strong>
          <span>{group.category} · {group.questions.length} soal</span>
        </li>)}</ul>
      </div> : <p className={styles.importHelp}>Tempel JSON atau pilih file, lalu periksa untuk melihat subtes, kategori, dan jumlah soal.</p>}
      <p className={styles.importHelp}>Semua soal disimpan sekaligus. Jika ada yang tidak valid, seluruh impor dibatalkan.</p>
      <div className={styles.importActions}>
        <Button type="button" disabled={!batch || busy} onClick={async () => {
          if (!batch || busy) return;
          setPending(true); setError("");
          try { const result = await api<{ count: number }>("/admin/questions/import", { method: "POST", body: JSON.stringify(batch) }); navigate(`/admin/soal?imported=${result.count}`); }
          catch (error) { setError(error instanceof Error ? error.message : "Impor gagal. Coba lagi."); }
          finally { setPending(false); }
        }}>{pending ? <Loader2 className="animate-spin" /> : <Upload />}{pending ? "Mengimpor…" : batch ? `Impor ${count} soal` : "Impor soal"}</Button>
        <Button asChild variant="ghost"><Link to="/admin/soal">Kembali ke bank soal</Link></Button>
      </div>
    </Panel>
  </div>;
}
