import React, { useEffect, useState, useRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Bookmark, Check, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { Button } from "./ui/button";
import { LexiconContent } from "./lexicon-content";
import styles from "./lexicon.module.css";

export function LexiconDrawer() {
  const { lexiconState, closeLexicon } = useApp();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const lastRef = useRef({ annotation: null, questionId: null });
  if (lexiconState.wordData) {
    lastRef.current = {
      annotation: lexiconState.wordData,
      questionId: lexiconState.questionId,
    };
  }

  const activeAnnotation = lexiconState.wordData || lastRef.current.annotation;
  const activeQuestionId = lexiconState.questionId || lastRef.current.questionId;

  useEffect(() => {
    if (!lexiconState.isOpen || !activeAnnotation) return;
    const controller = new AbortController();
    setSaved(false);
    setLoading(true);
    setError("");
    api("/learner/vocabulary", { signal: controller.signal })
      .then((entries) => {
        if (!controller.signal.aborted) {
          setSaved(
            entries.some(
              (entry) =>
                entry.questionId === activeQuestionId && entry.annotationId === activeAnnotation.id,
            ),
          );
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError("Status kosakata belum dapat dimuat.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [lexiconState.isOpen, activeAnnotation?.id, activeQuestionId]);

  if (!activeAnnotation) return null;

  const handleSave = async () => {
    if (!activeQuestionId || !activeAnnotation || saved || pending) return;
    setPending(true);
    setError("");
    try {
      await api("/learner/vocabulary", {
        method: "POST",
        body: JSON.stringify({
          questionId: activeQuestionId,
          annotationId: activeAnnotation.id,
        }),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kosakata gagal disimpan. Coba lagi.");
    } finally {
      setPending(false);
    }
  };

  return (
    <DialogPrimitive.Root
      open={Boolean(lexiconState.isOpen)}
      onOpenChange={(open) => {
        if (!open) closeLexicon();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={styles.overlay} />
        <DialogPrimitive.Content className={styles.modal} aria-describedby="lexicon-modal-desc">
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--accent-gold)] flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[var(--accent-gold)]" />
              Glosarium Akademik Latveria
            </span>
            <DialogPrimitive.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full text-[var(--text-muted)] hover:text-[var(--ink)]"
                aria-label="Tutup glosarium"
              >
                <X size={16} />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <div id="lexicon-modal-desc" className="sr-only">
            Definisi akademik dan konteks kalimat untuk {activeAnnotation.term}
          </div>

          {/* Scrollable Rich Body */}
          <div className={styles.scrollBody}>
            <LexiconContent annotation={activeAnnotation} />
          </div>

          {error && (
            <p role="alert" className="text-xs text-[var(--crimson)] mb-2">
              {error}
            </p>
          )}

          {/* Action Footer */}
          <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
            <Button
              className="btn-gold-solid flex-1 min-h-[40px] text-xs font-mono font-bold"
              disabled={saved || loading || pending}
              onClick={handleSave}
            >
              {saved ? <Check size={15} /> : <Bookmark size={15} />}
              <span>
                {saved
                  ? "TERSIMPAN DI LIBRARY"
                  : loading
                    ? "MEMERIKSA…"
                    : pending
                      ? "MENYIMPAN…"
                      : "SIMPAN KE KOSAKATA"}
              </span>
            </Button>
            <Button
              variant="outline"
              className="min-h-[40px] text-xs font-mono"
              onClick={closeLexicon}
            >
              KEMBALI KE SOAL
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
