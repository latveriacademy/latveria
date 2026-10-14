import React, { useEffect, useState, useRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Bookmark, Check, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { api } from "../../lib/api";
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
        <DialogPrimitive.Content className={styles.drawer} aria-describedby="lexicon-drawer-desc">
          {/* Header Bar */}
          <div className="lexicon-header">
            <div className="lexicon-stamp font-mono">
              <span className="lexicon-dot" />
              <span>GLOSARIUM AKADEMIK LATVERIA</span>
            </div>
            <DialogPrimitive.Close asChild>
              <button type="button" className="lexicon-close-btn" aria-label="Tutup glosarium">
                <X size={18} />
              </button>
            </DialogPrimitive.Close>
          </div>

          <div id="lexicon-drawer-desc" className="sr-only">
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
          <div className="lexicon-actions">
            <button
              type="button"
              className="btn-archive-vocab"
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
                      : "SIMPAN KE ARSIP KOSAKATA"}
              </span>
            </button>
            <button type="button" className="btn-dismiss-vocab" onClick={closeLexicon}>
              <span>KEMBALI KE SOAL</span>
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
