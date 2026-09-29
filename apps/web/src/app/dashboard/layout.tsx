import Image from "next/image";
import Link from "next/link";
import logo from "../../../../../latveria.webp";
import { requireUser } from "../../lib/access";
import { SignOut } from "../sign-out";
import styles from "./dashboard.module.css";
import { DashboardNav } from "./nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <div className={styles.shell}>
    <a className="skip-link" href="#konten">Lewati navigasi</a>
    <aside className={styles.sidebar}>
      <Link href="/" className={styles.brand}><Image src={logo} width={38} height={38} alt="" />latveria</Link>
      <DashboardNav />
      <div className={styles.sidebarBottom}>{user.role === "admin" && <Link href="/admin">Panel admin</Link>}<SignOut /></div>
      {user.role === "admin" && <Link className={styles.mobileAdmin} href="/admin">Panel admin</Link>}
    </aside>
    <main id="konten" className={styles.main}>
      <header className={styles.topbar}><span>{user.name}</span><span>{user.role === "admin" ? "Admin" : "Peserta"}</span></header>
      {children}
    </main>
  </div>;
}
