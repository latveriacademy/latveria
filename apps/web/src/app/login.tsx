import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { credentialsSchema, signupSchema, type User } from "@latveria/shared";
import { api } from "../lib/api";
import { authClient } from "../lib/auth-client";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Brand } from "../components/ui/dashboard";
import { ThemeToggle } from "../components/theme-toggle";
import { ExternalLink, Eye, EyeOff } from "lucide-react";

export function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [register, setRegister] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [discordPending, setDiscordPending] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(false);
  const [discordEnabled, setDiscordEnabled] = useState(false);
  const [discordInviteUrl, setDiscordInviteUrl] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "not_in_guild") {
      setError(
        "Akses ditolak: Anda harus bergabung ke server Discord resmi Latveria Academy terlebih dahulu.",
      );
    } else if (errorParam) {
      setError("Gagal masuk dengan penyedia pihak ketiga.");
    }
  }, [searchParams]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/registration", { signal: controller.signal })
      .then((response) => response.json())
      .then((data: { enabled: boolean; discord?: boolean; discordInviteUrl?: string }) => {
        setRegistrationEnabled(data.enabled);
        if (data.discord) setDiscordEnabled(true);
        if (data.discordInviteUrl) setDiscordInviteUrl(data.discordInviteUrl);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return (
    <main className="mx-auto grid min-h-dvh max-w-xl content-center gap-6 px-6 py-12 motion-page-enter">
      <div className="flex items-center justify-between">
        <Brand />
        <ThemeToggle />
      </div>
      <h1 className="!mb-0 !text-5xl text-[var(--ink)]" style={{ fontFamily: "var(--font-serif)" }}>
        {register ? "Daftar akun" : "Masuk ruang belajar"}
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
          <span className="relative">
            <Input
              className="w-full pr-12"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete={register ? "new-password" : "current-password"}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-1 grid min-w-11 place-items-center text-[var(--soft-ink)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--emerald)]"
              aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((visible) => !visible)}
            >
              {showPassword ? (
                <EyeOff size={18} aria-hidden="true" />
              ) : (
                <Eye size={18} aria-hidden="true" />
              )}
            </button>
          </span>
        </label>
        {error && (
          <div
            role="alert"
            className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm motion-fade-in space-y-2"
          >
            <p>{error}</p>
            {discordInviteUrl && error.includes("server Discord") && (
              <a
                href={discordInviteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline"
              >
                <span>Gabung ke Server Discord Latveria</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}
        <Button disabled={pending || discordPending} loading={pending}>
          {register ? "Daftar" : "Masuk"}
        </Button>
        {registrationEnabled && (
          <Button variant="ghost" type="button" onClick={() => setRegister(!register)}>
            {register ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar"}
          </Button>
        )}

        {discordEnabled && (
          <div className="space-y-3 pt-2 border-t border-[var(--edge)]">
            <div className="relative text-center text-xs text-[var(--ink-muted)]">
              <span className="bg-[var(--surface)] px-2">atau</span>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={pending || discordPending}
              loading={discordPending}
              className="w-full flex items-center justify-center gap-2 border-[#5865F2]/40 hover:bg-[#5865F2]/10 hover:border-[#5865F2] text-[var(--ink)]"
              onClick={async () => {
                setError("");
                setDiscordPending(true);
                try {
                  await authClient.signIn.social({
                    provider: "discord",
                    callbackURL: `${window.location.origin}/dashboard`,
                    errorCallbackURL: `${window.location.origin}/login`,
                  });
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Gagal mengarahkan ke Discord.");
                  setDiscordPending(false);
                }
              }}
            >
              <svg className="w-4 h-4 fill-[#5865F2]" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              <span>Masuk dengan Discord</span>
            </Button>
          </div>
        )}
      </form>
    </main>
  );
}
