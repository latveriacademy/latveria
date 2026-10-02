import { useState, useEffect } from "react";
import { Link, useNavigation } from "react-router";
import { Loader2 } from "lucide-react";
import logo from "../assets/latveria.webp";
import { LandingMotion } from "./landing-motion";
import { ThemeToggle } from "../components/theme-toggle";

export default function Home() {
  const navigation = useNavigation();
  const [clicked, setClicked] = useState(false);
  const isNavigating = clicked || (navigation.state !== "idle" && Boolean(navigation.location?.pathname.startsWith("/dashboard")));

  useEffect(() => {
    if (navigation.state === "idle") {
      setClicked(false);
    }
  }, [navigation.state]);

  return (
    <div className="site-shell">
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-[var(--emerald)]/20 overflow-hidden" role="progressbar" aria-label="Memuat ruang belajar">
          <div className="h-full bg-[var(--emerald)] w-1/2 animate-[pulse_1s_ease-in-out_infinite] transition-all" />
        </div>
      )}
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
            <Link
              className={`main-link ${isNavigating ? "opacity-85 pointer-events-none" : ""}`}
              to="/dashboard"
              onClick={() => setClicked(true)}
              aria-busy={isNavigating}
            >
              {isNavigating ? (
                <span className="inline-flex items-center gap-2.5">
                  <Loader2 className="animate-spin" size={18} aria-hidden="true" />
                  <span>Membuka ruang belajar…</span>
                </span>
              ) : (
                "Masuk ruang belajar"
              )}
            </Link>
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
          <div><h2 id="tentang-judul">Belajar terasa <em>lebih ringan bersama.</em></h2><p>latveriacademy adalah ruang belajar UTBK untuk berlatih dan memahami pembahasan soal.</p></div>
        </section>
      </main>
      <footer className="site-footer">
        <span className="wordmark"><img src={logo} alt="" width={34} height={34} /><span>latveriacademy</span></span>
        <span>Platform belajar independen, bukan layanan resmi UTBK.</span>
      </footer>
    </div>
  );
}
