import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { ConfirmDialog } from "../../../components/confirm-dialog";
import { api } from "../../../lib/api";

export function DeleteTryoutSection({
  packageId,
  sectionId,
  title,
  questionCount,
  onDeleted,
}: {
  packageId: string;
  sectionId: string;
  title: string;
  questionCount: number;
  onDeleted: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        aria-label={`Hapus subtes ${title}`}
      >
        <Trash2 size={14} />
        Hapus subtes
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Hapus subtes ${title}?`}
        description={`Subtes dan ${questionCount} relasi soal akan dihapus dari Tryout ini. Soal Bank dan hasil peserta yang sudah tersimpan tetap dipertahankan.`}
        destructive
        pending={pending}
        error={error}
        confirmLabel="Hapus subtes"
        onConfirm={async () => {
          setPending(true);
          setError("");
          try {
            await api(`/admin/tryouts/${packageId}/sections/${sectionId}`, { method: "DELETE" });
            setOpen(false);
            await onDeleted();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Subtes tidak dapat dihapus.");
          } finally {
            setPending(false);
          }
        }}
      />
    </>
  );
}
