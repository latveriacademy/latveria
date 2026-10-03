import { useState } from "react";
import { useNavigate } from "react-router";
import { credentialsSchema, signupSchema, type User } from "@latveria/shared";
import { api } from "../lib/api";
import { authClient } from "../lib/auth-client";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Brand } from "../components/ui/dashboard";
import { ThemeToggle } from "../components/theme-toggle";

export function Login() {
  const navigate = useNavigate();
  const [register, setRegister] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <main className="mx-auto grid min-h-dvh max-w-xl content-center gap-6 px-6 py-12 motion-page-enter">
      <div className="flex items-center justify-between">
        <Brand />
        <ThemeToggle />
      </div>
      <h1 className="!mb-0 !text-5xl text-[var(--ink)]" style={{ fontFamily: "var(--font-serif)" }}>
        Masuk ruang belajar
      </h1>
      <form
        className="grid gap-4 border border-[var(--edge)] bg-[var(--surface)] p-6 rounded-md shadow-sm motion-fade-up"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          const form = new FormData(event.currentTarget);
          const body = {
            email: String(form.get("email")),
            password: String(form.get("password")),
            name: String(form.get("name") ?? ""),
          };
          const parsed = (register ? signupSchema : credentialsSchema).safeParse(body);
          if (!parsed.success) {
            setError(parsed.error.issues[0].message);
            return;
          }
          setPending(true);
          try {
            const result = register
              ? await authClient.signUp.email(body)
              : await authClient.signIn.email(body);
            if (result.error)
              throw new Error(
                register ? "Pendaftaran gagal." : "Email atau kata sandi tidak cocok.",
              );
            const user = await api<User>("/me");
            navigate(user.role === "admin" ? "/admin" : "/dashboard");
          } catch (error) {
            setError(error instanceof Error ? error.message : "Gagal masuk.");
          } finally {
            setPending(false);
          }
        }}
      >
        {register && (
          <label className="grid gap-1 text-[var(--ink)] font-medium">
            Nama
            <Input name="name" required autoComplete="name" />
          </label>
        )}
        <label className="grid gap-1 text-[var(--ink)] font-medium">
          Email
          <Input name="email" type="email" required autoComplete="email" />
        </label>
        <label className="grid gap-1 text-[var(--ink)] font-medium">
          Kata sandi
          <Input
            name="password"
            type="password"
            required
            autoComplete={register ? "new-password" : "current-password"}
          />
        </label>
        {error && (
          <p role="alert" className="text-red-500 text-sm motion-fade-in">
            {error}
          </p>
        )}
        <Button disabled={pending} loading={pending}>
          {register ? "Daftar" : "Masuk"}
        </Button>
        {import.meta.env.DEV && (
          <Button variant="ghost" type="button" onClick={() => setRegister(!register)}>
            {register ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar lokal"}
          </Button>
        )}
      </form>
    </main>
  );
}
