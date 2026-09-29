import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import logo from "../../../../../latveria.webp";
import { TopicExplorer } from "./topic-explorer";
import styles from "./dashboard.module.css";
import { requireUser } from "../../lib/access";
import { SignOut } from "../sign-out";

export const metadata: Metadata = { title: "Ruang belajar | Latveria" };

export default async function Dashboard() {
  const user = await requireUser();
  return (
    <div className={styles.shell}>
      <a className="skip-link" href="#ringkasan">Lewati navigasi</a>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand}><Image src={logo} width={40} height={40} alt="" />latveriacademy</Link>
        <p className={styles.navLabel}>Ruang belajarmu</p>
        <nav aria-label="Navigasi dashboard">
          <a href="#ringkasan">Ringkasan</a>
          <a href="#topik">Jelajahi topik</a>
          <a href="#riwayat">Riwayat latihan</a>
        </nav>
        <div className={styles.sidebarNote}>
          <Image src={logo} alt="" width={70} height={70} />
          <p>Pelan-pelan,<br />asal memahami.</p>
          <Link href="/">Kembali ke beranda</Link>
        </div>
      </aside>
      <main className={styles.main}>
        <header className={styles.topbar}><span>Ruang belajar</span><div className={styles.account}><span className={styles.guest}>{user.name}</span>{user.role === "admin" && <Link href="/admin">Kelola soal</Link>}<SignOut /></div></header>
        <div className={styles.notice} role="note">Pratinjau frontend. Akun sudah aktif; latihan dan penyimpanan progres belum tersedia.</div>
        <section id="ringkasan" className={styles.overview} aria-labelledby="salam">
          <div><p className={styles.kicker}>Selamat datang di Latveria</p><h1 id="salam">Perjalananmu<br />dimulai dari rasa ingin tahu.</h1><p>Tentukan apa yang ingin kamu pahami hari ini. Tidak perlu menguasai semuanya sekaligus.</p><a className={styles.primary} href="#topik">Jelajahi topik</a></div>
          <Image className={styles.crest} src={logo} alt="" width={190} height={190} />
        </section>
        <dl className={styles.stats} aria-label="Ringkasan perkembangan">
          <div><dt>Latihan selesai</dt><dd>0 <span>sesi</span></dd><p>Belum ada latihan tercatat</p></div>
          <div><dt>Akurasi jawaban</dt><dd>Belum ada</dd><p>Muncul setelah latihan pertama</p></div>
          <div><dt>Poin pengalaman</dt><dd>0 <span>EXP</span></dd><p>EXP terpisah dari nilai UTBK</p></div>
        </dl>
        <TopicExplorer />
        <section id="riwayat" className={styles.history} aria-labelledby="riwayat-judul">
          <div className={styles.sectionHeading}><h2 id="riwayat-judul">Riwayat latihan</h2><span>Belum ada sesi</span></div>
          <div className={styles.empty}><h3>Lembaran pertama masih kosong.</h3><p>Nantinya, hasil latihan dan pembahasan yang sudah kamu kerjakan dapat dibuka kembali di sini.</p><a href="#topik">Lihat topik yang direncanakan</a></div>
        </section>
        <footer className={styles.footer}>Latveria adalah platform belajar independen. Hasil latihan dan EXP bukan nilai resmi UTBK.</footer>
      </main>
    </div>
  );
}
