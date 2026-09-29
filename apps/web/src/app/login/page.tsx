import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getAuth } from "../../lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk | Latveria" };

export default async function LoginPage() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");
  return (
    <main className="mx-auto grid min-h-dvh max-w-xl content-center gap-6 px-6 py-12">
      <Link href="/" className="text-xl font-bold">← latveria</Link>
      <h1 className="!mb-0 !text-5xl">Masuk ke ruang belajar</h1>
      <p>Gunakan akun lokal untuk mengakses dashboard. Pendaftaran hanya tersedia saat pengembangan.</p>
      <LoginForm />
    </main>
  );
}
