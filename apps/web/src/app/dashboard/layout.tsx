import Image from "next/image";
import Link from "next/link";
import logo from "../../../../../latveria.webp";
import { requireUser } from "../../lib/access";
import { SignOut } from "../sign-out";
import styles from "./dashboard.module.css";
import { DashboardNav } from "./nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <div className={styles.shell} data-dashboard>
    <a className="skip-link" href="#konten">Lewati navigasi</a>
    <aside className={styles.sidebar}>
      <Link href="/dashboard" className={styles.brand}><Image src={logo} width={34} height={34} alt="" />latveriacademy</Link>
      <DashboardNav />
      <div className={styles.sidebarBottom}>
        <div className={styles.identity}><span className={styles.avatar} aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.email}</small></div></div>
        {user.role === "admin" && <Link href="/admin">Panel admin</Link>}
        <SignOut />
      </div>
    </aside>
    <main id="konten" className={styles.main}>
      <header className={styles.topbar}><span>Ruang belajar</span><span className={styles.topbarContext}>Latihan UTBK</span></header>
      <div className={styles.content}>{children}</div>
    </main>
  </div>;
}
