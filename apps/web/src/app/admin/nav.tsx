"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./admin.module.css";

const links = [["/admin", "Ringkasan"], ["/admin/soal", "Bank soal"], ["/admin/soal/baru", "Tambah soal"]] as const;

export function AdminNav() {
  const pathname = usePathname();
  return <nav aria-label="Navigasi admin">{links.map(([href, label]) => <Link aria-current={pathname === href ? "page" : undefined} className={pathname === href ? styles.active : undefined} href={href} key={href}>{label}</Link>)}</nav>;
}
