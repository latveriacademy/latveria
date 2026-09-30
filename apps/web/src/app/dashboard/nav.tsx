"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./dashboard.module.css";

const links = [
  ["/dashboard", "Beranda"],
  ["/dashboard/topik", "Latihan"],
  ["/dashboard/riwayat", "Riwayat"],
] as const;

export function DashboardNav() {
  const pathname = usePathname();
  return <nav aria-label="Navigasi dashboard">{links.map(([href, label]) => {
    const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
    return <Link aria-current={active ? "page" : undefined} className={active ? styles.active : undefined} href={href} key={href}>{label}</Link>;
  })}</nav>;
}
