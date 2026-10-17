import { Link } from "react-router";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import logo from "../../assets/latveria.webp";
import { PublicShell } from "./public-shell";
import shared from "./landing.module.css";
import styles from "./about.module.css";

export default function About() {
  return (
    <PublicShell page="about">
      <section className={styles.hero} aria-labelledby="about-title">
        <div className={styles.headingRow}>
          <h1 id="about-title">
            <span className={shared.lineMask}>
              <span data-about-line>Yang tumbuh,</span>
            </span>
            <span className={shared.lineMask}>
              <span data-about-line>bukan cuma</span>
            </span>
            <span className={shared.lineMask}>
              <em data-about-line>angkanya.</em>
            </span>
          </h1>
          <div className={styles.emblem} data-about-emblem>
            <img src={logo} width={300} height={300} alt="Lambang latveriacademy" />
            <svg viewBox="0 0 300 300" fill="none" aria-hidden="true">
              <path d="M40 225C-15 80 150 5 245 80s40 180-88 181C65 260 27 197 58 110" />
            </svg>
          </div>
        </div>
        <div className={styles.heroFoot}>
          <a href="#gagasan">
            Tentang latveriacademy <ArrowDown size={18} aria-hidden="true" />
          </a>
          <p>
            Kami ingin memberi tempat untuk hal yang sering terlewat saat belajar:{" "}
            <em>proses memahami.</em>
          </p>
        </div>
      </section>
      <section id="gagasan" className={styles.manifesto} aria-labelledby="manifesto-title">
        <h2 id="manifesto-title" data-about-reveal>
          Jawaban benar itu penting.
          <br />
          <em>Tahu alasannya, lebih berarti.</em>
        </h2>
        <div className={styles.manifestoText}>
          <p>
            latveriacademy adalah ruang latihan UTBK-SNBT. Tempat untuk mencoba soal, menemukan
            bagian yang belum dipahami, lalu kembali dengan cara berpikir yang lebih baik.
          </p>
          <p>
            Kami percaya latihan bukan sekadar mengumpulkan jawaban benar. Kesalahan juga punya
            sesuatu untuk diajarkan—asal ada ruang untuk berhenti, membaca pembahasan, dan mencoba
            lagi.
          </p>
        </div>
      </section>
      <section className={styles.beliefs} aria-labelledby="beliefs-title">
        <div className={styles.beliefIntro}>
          <h2 id="beliefs-title">
            Ruang untuk
            <br />
            <em>belum bisa.</em>
          </h2>
          <p>Tiga hal yang menjadi arah kami.</p>
          <div className={styles.scribble} aria-hidden="true">
            <span>belum.</span>
            <svg viewBox="0 0 300 90" fill="none">
              <path d="M18 50c65-42 195-41 266-22M29 66c65-26 177-29 245-18" />
            </svg>
          </div>
        </div>
        <div className={styles.beliefList}>
          <article data-about-reveal>
            <h3>Paham, bukan hafal.</h3>
            <p>
              Pembahasan memberi ruang untuk menelusuri alasan. Jawaban menjadi awal percakapan
              dengan sebuah konsep, bukan akhir latihan.
            </p>
          </article>
          <article data-about-reveal>
            <h3>Ritmemu tetap milikmu.</h3>
            <p>
              Latihan terarah saat ingin fokus. Simulasi saat ingin menguji kesiapan. Tantangan
              bersama teman saat ingin suasana berbeda.
            </p>
          </article>
          <article data-about-reveal>
            <h3>Progres yang jujur.</h3>
            <p>
              EXP dan akurasi membantu membaca aktivitas latihan. Keduanya bukan skor resmi UTBK,
              dan bukan janji hasil ujian.
            </p>
          </article>
        </div>
      </section>
      <section className={styles.invitation} aria-labelledby="invitation-title">
        <span className={styles.smallSeal}>
          <img src={logo} alt="" width={52} height={52} />
        </span>
        <h2 id="invitation-title">
          Ceritanya berlanjut
          <br />
          <em>di caramu belajar.</em>
        </h2>
        <p>Satu soal dalam satu waktu. Kita mulai dari sana.</p>
        <Link className="main-link" to="/dashboard">
          Masuk ruang belajar <ArrowUpRight size={20} aria-hidden="true" />
        </Link>
        <Link className={shared.textLink} to="/#cara-belajar">
          Lihat cara belajarnya <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </section>
    </PublicShell>
  );
}
