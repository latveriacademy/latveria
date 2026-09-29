"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../../lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const [register, setRegister] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <form className="grid gap-4 rounded border border-[var(--rule)] bg-[var(--paper-light)] p-6" onSubmit={async (event) => {
      event.preventDefault();
      setError("");
      setPending(true);
      const form = new FormData(event.currentTarget);
      const email = String(form.get("email"));
      const password = String(form.get("password"));
      try {
        const result = register
          ? await authClient.signUp.email({ name: String(form.get("name")), email, password })
          : await authClient.signIn.email({ email, password });
        if (result.error) { setError(register ? "Pendaftaran gagal. Periksa data atau gunakan email lain." : "Email atau kata sandi tidak cocok."); return; }
        router.push("/dashboard");
        router.refresh();
      } catch {
        setError("Tidak dapat terhubung ke server. Coba lagi.");
      } finally {
        setPending(false);
      }
    }}>
      {register && <label className="grid gap-1">Nama<input className="min-h-11 border border-[var(--rule)] bg-[var(--paper)] px-3" name="name" required autoComplete="name" /></label>}
      <label className="grid gap-1">Email<input className="min-h-11 border border-[var(--rule)] bg-[var(--paper)] px-3" type="email" name="email" required autoComplete="email" /></label>
      <label className="grid gap-1">Kata sandi<input className="min-h-11 border border-[var(--rule)] bg-[var(--paper)] px-3" type="password" name="password" minLength={8} required autoComplete={register ? "new-password" : "current-password"} /></label>
      {error && <p role="alert" className="text-red-900">{error}</p>}
      <button className="min-h-11 bg-[var(--forest-dark)] px-4 text-[var(--paper-light)] disabled:opacity-60" disabled={pending}>{pending ? "Memproses..." : register ? "Daftar" : "Masuk"}</button>
      {process.env.NODE_ENV === "development" && <button className="min-h-11 underline" type="button" onClick={() => { setRegister(!register); setError(""); }}>{register ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar lokal"}</button>}
    </form>
  );
}
