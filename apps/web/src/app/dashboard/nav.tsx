"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./dashboard.module.css";

const links = [
  ["/dashboard", "Ringkasan"],
  ["/dashboard/topik", "Topik"],
  ["/dashboard/riwayat", "Riwayat"],
] as const;

export function DashboardNav() {
  const pathname = usePathname();
  return <nav aria-label="Navigasi dashboard">{links.map(([href, label]) => <Link className={pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`)) ? styles.active : undefined} href={href} key={href}>{label}</Link>)}</nav>;
}
