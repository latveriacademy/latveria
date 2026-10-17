import { useEffect, useRef, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { ArrowUpRight } from "lucide-react";
import logo from "../../assets/latveria.webp";
import { ThemeToggle } from "../../components/theme-toggle";
import { LandingMotion } from "./landing-motion";
import styles from "./public-shell.module.css";

export function PublicShell({ children, page }: { children: ReactNode; page: "home" | "about" }) {
  const root = useRef<HTMLDivElement>(null);
  const { pathname, hash } = useLocation();
  useEffect(() => {
    const previousTitle = document.title;
    document.title =
      page === "about"
        ? "Tentang kami — latveriacademy"
        : "latveriacademy — Lebih dari sekadar benar";
    return () => {
      document.title = previousTitle;
    };
  }, [page]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const destination = hash ? document.getElementById(hash.slice(1)) : null;
      if (destination) destination.scrollIntoView({ behavior: "instant" });
      else window.scrollTo({ top: 0, behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);
  return (
    <div ref={root} className={`site-shell ${styles.landing}`}>
      <LandingMotion page={page} root={root} />
      <a className="skip-link" href="#konten">
        Lewati navigasi
      </a>
      <header className="site-header">
        <Link className="wordmark" to="/" aria-label="latveriacademy, beranda">
          <img src={logo} alt="" width={42} height={42} />
          <span>latveriacademy</span>
        </Link>
        <nav aria-label="Navigasi utama" className="nav-links">
          <NavLink to="/" end>
            Beranda
          </NavLink>
          <NavLink to="/tentang">Tentang kami</NavLink>
          <ThemeToggle />
        </nav>
      </header>
      <main id="konten" tabIndex={-1}>
        {children}
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <Link className="wordmark" to="/">
            <img src={logo} alt="" width={32} height={32} />
            <span>latveriacademy</span>
          </Link>
          <nav aria-label="Navigasi footer">
            <Link to="/">Beranda</Link>
            <Link to="/tentang">Tentang kami</Link>
            <Link to="/dashboard">
              Ruang belajar <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </nav>
        </div>
        <div className={styles.footerBottom}>
          <span>Berlatih. Memahami. Bertumbuh.</span>
          <span>Platform belajar independen, bukan layanan resmi UTBK.</span>
        </div>
      </footer>
    </div>
  );
}
