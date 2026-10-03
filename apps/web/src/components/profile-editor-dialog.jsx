import React, { useState } from "react";
import { Check } from "lucide-react";
import { profileSchema } from "@latveria/shared";
import { api } from "../lib/api";
import { AppDialog } from "./app-dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { DialogFooter } from "./ui/dialog";

export function ProfileEditorDialog({ profile, onOpenChange, onSaved }) {
  const [form, setForm] = useState({
    name: profile.name,
    codename: profile.codename,
    bio: profile.bio,
    motto: profile.motto,
    targetUniversity: profile.targetUniversity,
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <AppDialog open onOpenChange={onOpenChange} title="Edit profil" pending={pending}>
      <form
        className="modal-body-form"
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
        <fieldset disabled={pending} className="grid gap-4 border-0 p-0">
          {[
            { key: "name", label: "Nama", maxLength: 100, autoComplete: "name", required: true },
            { key: "codename", label: "Nama panggilan", maxLength: 100, autoComplete: "nickname" },
            { key: "targetUniversity", label: "Target PTN dan program studi", maxLength: 200 },
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
          <label className="grid gap-2 text-sm">
            Bio
            <Textarea
              rows={3}
              maxLength={500}
              value={form.bio ?? ""}
              onChange={(event) => setForm({ ...form, bio: event.target.value })}
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
          <Button type="submit" loading={pending} loadingText="Menyimpan…">
            <Check size={16} />
            Simpan perubahan
          </Button>
        </DialogFooter>
      </form>
    </AppDialog>
  );
}
