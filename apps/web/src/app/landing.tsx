import logo from "../../../../latveria.webp";
import { LandingMotion } from "./landing-motion";
import { ThemeToggle } from "../components/theme-toggle";

export default function Home() {
  return (
    <div className="site-shell">
      <LandingMotion />
      <a className="skip-link" href="#atas">Lewati navigasi</a>
      <header className="site-header">
        <a className="wordmark" href="#atas" aria-label="Latveria, kembali ke atas">
          <img src={logo} alt="" width={42} height={42} />
          <span>latveriacademy</span>
        </a>
        <nav aria-label="Navigasi utama" className="nav-links">
          <a href="#cara-belajar">Cara belajar</a>
          <a href="#tentang">Tentang kami</a>
          <ThemeToggle />
        </nav>
      </header>
      <main id="atas">
        <section className="hero" aria-labelledby="judul">
          <div className="hero-copy">
            <h1 id="judul"><span className="hero-title-line">Lebih dari</span>{" "}<span className="hero-title-line">sekadar <em>benar.</em></span></h1>
            <p className="hero-description">Berlatih, memahami kesalahan, lalu kembali lebih siap. Satu soal dalam satu waktu.</p>
            <a className="main-link" href="/dashboard">Masuk ruang belajar</a>
          </div>
          <div className="hero-art">
            <div className="emblem-wrap">
              <img className="hero-logo" src={logo} alt="Lambang Latveria" width={1024} height={1024} fetchPriority="high" />
            </div>
          </div>
        </section>
        <section id="cara-belajar" className="method" aria-labelledby="metode-judul">
          <div className="section-intro"><h2 id="metode-judul">Pahami caramu <em>berpikir.</em></h2><p>Inilah alur belajar yang sedang kami siapkan: latihan terarah, waktu untuk memahami, dan pembahasan yang bisa dipelajari kembali.</p></div>
          <ol className="method-list">
            <li><div><h3>Pilih.</h3><p>Satu topik yang ingin kamu pahami. Mulai dari sana.</p></div></li>
            <li><div><h3>Coba.</h3><p>Kerjakan soal dengan ritmemu. Beri ruang untuk berpikir.</p></div></li>
            <li><div><h3>Pahami.</h3><p>Pelajari pembahasannya. Temukan alasan di balik setiap jawaban.</p></div></li>
          </ol>
        </section>
        <section id="tentang" className="closing" aria-labelledby="tentang-judul">
          <img className="closing-logo" src={logo} alt="" width={220} height={220} />
          <div><p className="hand-note">Untuk para pembelajar,</p><h2 id="tentang-judul">Belajar terasa <em>lebih ringan bersama.</em></h2><p>Latveria masih dalam tahap awal. Kami menyiapkan ruang belajar UTBK yang mengutamakan latihan dan pemahaman, bukan janji nilai instan.</p><p className="closing-note">Latihan pertama sedang disiapkan.</p></div>
        </section>
      </main>
      <footer className="site-footer">
        <span className="wordmark"><img src={logo} alt="" width={34} height={34} /><span>latveriacademy</span></span>
        <span>Platform belajar independen, bukan layanan resmi UTBK.</span>
      </footer>
    </div>
  );
}
