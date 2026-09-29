"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [["/admin", "Ringkasan"], ["/admin/soal", "Daftar soal"], ["/admin/soal/baru", "Tambah soal"]] as const;

export function AdminNav() {
  const pathname = usePathname();
  return <nav className="flex flex-wrap gap-2" aria-label="Navigasi admin">{links.map(([href, label]) => <Link className={`min-h-11 px-3 py-2 no-underline ${pathname === href ? "bg-[var(--paper-light)] font-bold" : ""}`} href={href} key={href}>{label}</Link>)}</nav>;
}
