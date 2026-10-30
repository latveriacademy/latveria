import React, { useState } from "react";
import { Check } from "lucide-react";
import { profileSchema } from "@latveria/shared";
import { api } from "../lib/api";
import { AppDialog } from "./app-dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { DialogFooter } from "./ui/dialog";
import { TargetUniversityPicker } from "./target-university-picker";

export function ProfileEditorDialog({ profile, onOpenChange, onSaved }) {
  const [form, setForm] = useState({
    name: profile.name,
    codename: profile.codename,
    bio: profile.bio,
    motto: profile.motto,
    targetUniversity: profile.targetUniversity,
    hideLeaderboardMetrics: Boolean(profile.hideLeaderboardMetrics),
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <AppDialog open onOpenChange={onOpenChange} title="Edit profil" pending={pending}>
      <form
        className="modal-body-form min-w-0 max-w-full"
        onSubmit={async (event) => {
          event.preventDefault();
          if (pending) return;
          setError("");
          const parsed = profileSchema.safeParse(form);
          if (!parsed.success) {
            setError(parsed.error.issues[0].message);
            return;
          }
          setPending(true);
          try {
            onSaved(
              await api("/learner/profile", { method: "PUT", body: JSON.stringify(parsed.data) }),
            );
          } catch (error) {
            setError(error instanceof Error ? error.message : "Gagal menyimpan profil. Coba lagi.");
          } finally {
            setPending(false);
          }
        }}
      >
        <fieldset disabled={pending} className="grid gap-4 border-0 p-0 m-0 min-w-0 max-w-full">
          {[
            { key: "name", label: "Nama", maxLength: 100, autoComplete: "name", required: true },
            { key: "codename", label: "Nama panggilan", maxLength: 100, autoComplete: "nickname" },
            { key: "motto", label: "Motto", maxLength: 200 },
          ].map(({ key, label, ...props }) => (
            <label key={key} className="grid gap-2 text-sm">
              {label}
              <Input
                {...props}
                value={form[key] ?? ""}
                onChange={(event) => setForm({ ...form, [key]: event.target.value })}
              />
            </label>
          ))}
          <div className="grid gap-2 text-sm min-w-0 max-w-full">
            <span>Target PTN dan program studi</span>
            <TargetUniversityPicker
              value={form.targetUniversity ?? ""}
              disabled={pending}
              onChange={(val) => setForm({ ...form, targetUniversity: val })}
            />
          </div>
          <label className="grid gap-2 text-sm">
            Bio
            <Textarea
              rows={3}
              maxLength={500}
              value={form.bio ?? ""}
              onChange={(event) => setForm({ ...form, bio: event.target.value })}
            />
          </label>
          <div className="pt-2 border-t border-[var(--edge)]">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={form.hideLeaderboardMetrics}
                onChange={(event) =>
                  setForm({ ...form, hideLeaderboardMetrics: event.target.checked })
                }
                className="mt-0.5 rounded border-[var(--edge)] text-[var(--gold)] focus:ring-[var(--gold)]"
              />
              <div className="grid gap-0.5">
                <span className="font-semibold text-[var(--ink)]">
                  Sembunyikan metrik detail dari publik
                </span>
                <span className="text-[var(--ink-muted)]">
                  Persentase akurasi dan jumlah soal dijawab hanya dapat dilihat olehmu di papan
                  peringkat.
                </span>
              </div>
            </label>
          </div>
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
          <Button type="submit" loading={pending} loadingText="Menyimpan…">
            <Check size={16} />
            Simpan perubahan
          </Button>
        </DialogFooter>
      </form>
    </AppDialog>
  );
}
