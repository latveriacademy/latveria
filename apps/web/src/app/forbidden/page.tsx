import Link from "next/link";

export default function ForbiddenPage() {
  return <main className="mx-auto grid min-h-dvh max-w-lg content-center gap-5 px-6"><p className="font-bold text-[var(--forest)]">Latveria</p><h1 className="!mb-0 !text-5xl">Halaman ini khusus admin.</h1><p>Akunmu tidak memiliki akses ke panel pengelolaan.</p><Link className="inline-flex min-h-11 items-center font-bold" href="/">Kembali ke beranda</Link></main>;
}
