import Image from "next/image";
import Link from "next/link";
import logo from "../../../../../latveria.webp";
import { requireAdmin } from "../../lib/access";
import { SignOut } from "../sign-out";
import { AdminNav } from "./nav";
import styles from "./admin.module.css";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return <div className={styles.shell} data-admin>
    <a className="skip-link" href="#konten-admin">Lewati navigasi</a>
    <aside className={styles.sidebar}>
      <Link href="/admin" className={styles.brand}><Image src={logo} width={34} height={34} alt="" />latveria <span>admin</span></Link>
      <AdminNav />
      <div className={styles.sidebarBottom}>
        <Link href="/dashboard">Ruang peserta</Link>
        <span className={styles.identity}>{admin.name}</span>
        <SignOut />
      </div>
    </aside>
    <main className={styles.main} id="konten-admin">{children}</main>
  </div>;
}
