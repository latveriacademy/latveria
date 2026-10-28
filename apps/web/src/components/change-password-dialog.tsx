import { useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { api } from "../lib/api";
import { AppDialog } from "./app-dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { DialogFooter } from "./ui/dialog";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  isCreate?: boolean;
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
  onSuccess,
  isCreate = false,
}: ChangePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setError("");

    if (!isCreate && !currentPassword) {
      setError("Kata sandi saat ini wajib diisi.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Kata sandi baru minimal 8 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }

    setPending(true);
    try {
      if (isCreate) {
        await api("/learner/set-password", {
          method: "POST",
          body: JSON.stringify({ newPassword }),
        });
      } else {
        await api("/auth/change-password", {
          method: "POST",
          body: JSON.stringify({
            currentPassword,
            newPassword,
            revokeOtherSessions: false,
          }),
        });
      }

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isCreate
            ? "Gagal membuat kata sandi."
            : "Gagal mengubah kata sandi. Periksa kata sandi lama Anda.",
      );
    } finally {
      setPending(false);
    }
  };

  const title = isCreate ? "Buat kata sandi" : "Ubah kata sandi";

  return (
    <AppDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
      title={title}
      pending={pending}
    >
      <form className="modal-body-form" onSubmit={handleSubmit}>
        <fieldset disabled={pending} className="grid gap-4 border-0 p-0">
          {!isCreate && (
            <label className="grid gap-2 text-sm text-[var(--ink)]">
              Kata sandi saat ini
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-1 grid min-w-8 place-items-center text-muted hover:text-[var(--ink)]"
                  aria-label={showCurrent ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  onClick={() => setShowCurrent(!showCurrent)}
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
          )}

          <label className="grid gap-2 text-sm text-[var(--ink)]">
            Kata sandi baru (minimal 8 karakter)
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-1 grid min-w-8 place-items-center text-muted hover:text-[var(--ink)]"
                aria-label={showNew ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                onClick={() => setShowNew(!showNew)}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          <label className="grid gap-2 text-sm text-[var(--ink)]">
            Ulangi kata sandi baru
            <Input
              type={showNew ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full"
              autoComplete="new-password"
            />
          </label>
        </fieldset>

        {error && (
          <p role="alert" className="text-crimson text-sm mt-2">
            {error}
          </p>
        )}

        <DialogFooter className="mt-4">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
          >
            Batal
          </Button>
          <Button type="submit" loading={pending} loadingText="Menyimpan…">
            <KeyRound size={16} className="mr-1" />
            {title}
          </Button>
        </DialogFooter>
      </form>
    </AppDialog>
  );
}
