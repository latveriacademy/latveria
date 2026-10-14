import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { api } from "../../lib/api";
import { AppDialog } from "../app-dialog";
import { Button } from "../ui/button";
import { DialogFooter } from "../ui/dialog";
import { Textarea } from "../ui/textarea";

export function QuestionReportDialog({ open, onOpenChange, questionId, packageId }) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Laporkan soal"
      description="Bantu kami meningkatkan kualitas soal dengan melaporkan masalah yang kamu temukan."
      pending={pending}
    >
      {sent ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle2 size={32} className="text-sage" />
          <p>Laporan terkirim. Terima kasih!</p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </div>
      ) : (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!reason || pending) return;
            setPending(true);
            setError("");
            try {
              await api("/learner/reports", {
                method: "POST",
                body: JSON.stringify({
                  questionId,
                  packageId: packageId || undefined,
                  reason,
                  description,
                }),
              });
              setSent(true);
            } catch (error) {
              setError(
                error instanceof Error ? error.message : "Laporan gagal terkirim. Coba lagi.",
              );
            } finally {
              setPending(false);
            }
          }}
        >
          <fieldset disabled={pending} className="grid gap-3 border-0 p-0">
            <legend className="mb-2 text-sm font-semibold">Alasan laporan</legend>
            {[
              "Soal/jawaban tidak jelas atau ambigu",
              "Kunci jawaban salah",
              "Soal mengandung kesalahan faktual",
              "Gambar atau formula tidak tampil dengan benar",
              "Lainnya",
            ].map((item) => (
              <label key={item} className="flex min-h-9 items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="report-reason"
                  value={item}
                  checked={reason === item}
                  onChange={() => setReason(item)}
                  required
                />
                {item}
              </label>
            ))}
            <label className="grid gap-2 text-sm">
              Keterangan tambahan (opsional)
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Jelaskan masalah lebih detail…"
              />
            </label>
          </fieldset>
          {error && (
            <p role="alert" className="text-crimson">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={!reason} loading={pending} loadingText="Mengirim…">
              Kirim laporan
            </Button>
          </DialogFooter>
        </form>
      )}
    </AppDialog>
  );
}
