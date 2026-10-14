import { useEffect, useState } from "react";
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
    </div>
  );
}
