import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { VocabularyEntry } from "@latveria/shared";
import { api } from "../../lib/api";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Panel } from "../ui/dashboard";
import { AppDialog } from "../app-dialog";
import { ConfirmDialog } from "../confirm-dialog";
import { LexiconContent } from "./lexicon-content";
import styles from "./vocabulary-collection.module.css";

export function VocabularyCollection() {
  const [entries, setEntries] = useState<VocabularyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<VocabularyEntry | null>(null);
  const [deleting, setDeleting] = useState<VocabularyEntry | null>(null);
  const [pending, setPending] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [adding, setAdding] = useState(false);
  const [newTerm, setNewTerm] = useState("");
  const [newDef, setNewDef] = useState("");
  const [newPos, setNewPos] = useState("noun");
  const [newPhonetic, setNewPhonetic] = useState("");
  const [newContext, setNewContext] = useState("");
  const [addError, setAddError] = useState("");
  const [addPending, setAddPending] = useState(false);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerm.trim() || !newDef.trim()) {
      setAddError("Kata dan arti wajib diisi.");
      return;
    }
    setAddPending(true);
    setAddError("");
    try {
      await api("/learner/vocabulary", {
        method: "POST",
        body: JSON.stringify({
          term: newTerm.trim(),
          definition: newDef.trim(),
          partOfSpeech: newPos.trim() || "noun",
          phonetic: newPhonetic.trim(),
          context: newContext.trim() || `${newTerm.trim()}: ${newDef.trim()}`,
        }),
      });
      setAdding(false);
      setNewTerm("");
      setNewDef("");
      setNewPos("noun");
      setNewPhonetic("");
      setNewContext("");
      setRetry((r) => r + 1);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Gagal menambahkan kosakata.");
    } finally {
      setAddPending(false);
    }
  };
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api<VocabularyEntry[]>("/learner/vocabulary", { signal: controller.signal })
      .then(setEntries)
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : "Kosakata gagal dimuat.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retry]);
  const needle = search.trim().toLocaleLowerCase("id");
  const filtered = entries.filter(({ annotation }) =>
    `${annotation.term} ${annotation.definition}`.toLocaleLowerCase("id").includes(needle),
  );
  return (
    <div className={styles.collection}>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3">
        <div className={styles.search}>
          <label htmlFor="vocabulary-search">Cari kosakata</label>
          <Input
            id="vocabulary-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kata atau arti"
          />
        </div>
        <Button
          type="button"
          onClick={() => {
            setAdding(true);
            setAddError("");
          }}
          className="shrink-0"
        >
          <Plus className="size-4 mr-1.5" />
          Tambah Kosakata
        </Button>
      </div>
      {loading ? (
        <p role="status">Memuat kosakata…</p>
      ) : error ? (
        <Panel>
          <p role="alert">{error}</p>
          <Button variant="outline" onClick={() => setRetry((value) => value + 1)}>
            Coba lagi
          </Button>
        </Panel>
      ) : !entries.length ? (
        <Panel>
          <h2 className={styles.title}>Belum ada kosakata tersimpan</h2>
          <p>
            Saat latihan LBE, klik kata bergaris bawah lalu pilih Simpan kosakata. Kata dan arti
            sesuai konteksnya akan muncul di sini.
          </p>
        </Panel>
      ) : (
        <>
          <p role="status">
            {filtered.length} dari {entries.length} kosakata
          </p>
          {!filtered.length && <p>Tidak ada kosakata yang cocok. Coba kata kunci lain.</p>}
          <ul className={styles.list}>
            {filtered.map((entry) => (
              <li key={entry.id}>
                <Panel className={styles.card}>
                  <div>
                    <h2 className={styles.title}>
                      {entry.annotation.term}
                      {entry.annotation.phonetic && (
                        <span className="font-mono text-xs font-normal text-[var(--soft-ink)] ml-2">
                          {entry.annotation.phonetic}
                        </span>
                      )}
                    </h2>
                    <p className={styles.meta}>{entry.annotation.partOfSpeech}</p>
                    <p>{entry.annotation.definition}</p>
                  </div>
                  <div className={styles.actions}>
                    <Button variant="outline" onClick={() => setSelected(entry)}>
                      Lihat konteks
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setDeleting(entry);
                        setDeleteError("");
                      }}
                      aria-label={`Hapus ${entry.annotation.term}`}
                    >
                      Hapus
                    </Button>
                  </div>
                </Panel>
              </li>
            ))}
          </ul>
        </>
      )}
      {selected && (
        <AppDialog
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          title={
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--accent-gold)] flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[var(--accent-gold)]" />
              Glosarium Akademik Latveria
            </span>
          }
          className="max-w-[560px]"
        >
          <div className="max-h-[75vh] overflow-y-auto pr-1">
            <LexiconContent annotation={selected.annotation} />
            {selected.source && (
              <p className="text-xs text-[var(--soft-ink)] pt-3 border-t border-[var(--edge)] mt-3">
                Sumber soal: {selected.source}
              </p>
            )}
          </div>
        </AppDialog>
      )}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={`Hapus ${deleting?.annotation.term ?? "kosakata"}?`}
        description="Kosakata dihapus dari koleksi pribadimu. Anotasi pada soal tetap tersedia."
        confirmLabel="Hapus kosakata"
        destructive
        pending={pending}
        error={deleteError}
        onConfirm={async () => {
          if (!deleting) return;
          setPending(true);
          setDeleteError("");
          try {
            await api(`/learner/vocabulary/${deleting.id}`, { method: "DELETE" });
            setEntries((items) => items.filter((item) => item.id !== deleting.id));
            setDeleting(null);
          } catch (err) {
            setDeleteError(err instanceof Error ? err.message : "Kosakata gagal dihapus.");
          } finally {
            setPending(false);
          }
        }}
      />
      {adding && (
        <AppDialog
          open
          onOpenChange={(open) => {
            if (!open && !addPending) setAdding(false);
          }}
          title={
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--accent-gold)] flex items-center gap-1.5">
              <Plus size={14} />
              Tambah Kosakata LBE
            </span>
          }
          className="max-w-[480px]"
        >
          <form onSubmit={handleAddSubmit} className="space-y-4 pt-2">
            <div>
              <label
                htmlFor="add-term"
                className="block text-xs font-medium text-[var(--soft-ink)] mb-1"
              >
                Kata / Istilah (Term) <span className="text-[var(--crimson)]">*</span>
              </label>
              <Input
                id="add-term"
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                placeholder="Contoh: resilience"
                required
                disabled={addPending}
              />
            </div>
            <div>
              <label
                htmlFor="add-def"
                className="block text-xs font-medium text-[var(--soft-ink)] mb-1"
              >
                Definisi / Arti <span className="text-[var(--crimson)]">*</span>
              </label>
              <Input
                id="add-def"
                value={newDef}
                onChange={(e) => setNewDef(e.target.value)}
                placeholder="Contoh: Kemampuan untuk pulih dari kesulitan"
                required
                disabled={addPending}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="add-pos"
                  className="block text-xs font-medium text-[var(--soft-ink)] mb-1"
                >
                  Kelas Kata (POS)
                </label>
                <select
                  id="add-pos"
                  value={newPos}
                  onChange={(e) => setNewPos(e.target.value)}
                  disabled={addPending}
                  className="w-full px-3 py-2 rounded-md bg-[var(--surface-elevated)] border border-[var(--edge)] text-xs text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)]"
                >
                  <option value="noun">Noun (Nomina)</option>
                  <option value="verb">Verb (Verba)</option>
                  <option value="adjective">Adjective (Adjektiva)</option>
                  <option value="adverb">Adverb (Adverbia)</option>
                  <option value="phrase">Phrase (Frasa)</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="add-phonetic"
                  className="block text-xs font-medium text-[var(--soft-ink)] mb-1"
                >
                  Fonetik (opsional)
                </label>
                <Input
                  id="add-phonetic"
                  value={newPhonetic}
                  onChange={(e) => setNewPhonetic(e.target.value)}
                  placeholder="/rɪˈzɪl.jəns/"
                  disabled={addPending}
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="add-context"
                className="block text-xs font-medium text-[var(--soft-ink)] mb-1"
              >
                Contoh Kalimat / Konteks (opsional)
              </label>
              <Input
                id="add-context"
                value={newContext}
                onChange={(e) => setNewContext(e.target.value)}
                placeholder="The community showed remarkable resilience."
                disabled={addPending}
              />
            </div>
            {addError && (
              <p role="alert" className="text-xs text-[var(--crimson)]">
                {addError}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAdding(false)}
                disabled={addPending}
              >
                Batal
              </Button>
              <Button type="submit" size="sm" disabled={addPending}>
                {addPending ? "Menyimpan…" : "Simpan Kosakata"}
              </Button>
            </div>
          </form>
        </AppDialog>
      )}
    </div>
  );
}
