import { useState } from "react";
import { UserPlus, Eye, EyeOff } from "lucide-react";
import { AppDialog } from "../../../components/app-dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { DialogFooter } from "../../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { api, ApiError } from "../../../lib/api";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateUserDialog({ open, onOpenChange, onSuccess }: CreateUserDialogProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setName("");
    setRole("user");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setError("");

    if (password.length < 8) {
      setError("Password minimal harus 8 karakter.");
      return;
    }

    setPending(true);
    try {
      await api("/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          name: name.trim() || undefined,
          role,
        }),
      });

      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal membuat pengguna.");
    } finally {
      setPending(false);
    }
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
      title="Tambah Pengguna Baru"
      pending={pending}
    >
      <form className="modal-body-form" onSubmit={handleSubmit}>
        <fieldset disabled={pending} className="grid gap-4 border-0 p-0">
          <label className="grid gap-1.5 text-sm text-[var(--ink)]">
            Nama Lengkap (Opsional)
            <Input
              type="text"
              placeholder="cth. Budi Prakoso"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full"
            />
          </label>

          <label className="grid gap-1.5 text-sm text-[var(--ink)]">
            Email <span className="text-red-500">*</span>
            <Input
              type="email"
              placeholder="cth. user@latveriacademy.site"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full"
            />
          </label>

          <label className="grid gap-1.5 text-sm text-[var(--ink)]">
            Password (min 8 karakter) <span className="text-red-500">*</span>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Minimal 8 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-1 grid min-w-8 place-items-center text-muted hover:text-[var(--ink)]"
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          <label className="grid gap-1.5 text-sm text-[var(--ink)]">
            Peran (Role)
            <Select value={role} onValueChange={(val: "user" | "admin") => setRole(val)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Peserta (User)</SelectItem>
                <SelectItem value="admin">Administrator (Admin)</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </fieldset>

        {error && (
          <p role="alert" className="text-red-500 text-sm mt-2">
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
          <Button type="submit" loading={pending} loadingText="Membuat pengguna…">
            <UserPlus size={16} className="mr-1.5" />
            Simpan Pengguna
          </Button>
        </DialogFooter>
      </form>
    </AppDialog>
  );
}
