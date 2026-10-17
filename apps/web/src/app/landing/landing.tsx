import { Link, useNavigation } from "react-router";
import { ArrowDown, ArrowUpRight, Loader2 } from "lucide-react";
import { PublicShell } from "./public-shell";
import { LearningArtwork } from "./learning-artwork";
import { LearningStory } from "./learning-story";
import styles from "./landing.module.css";

export default function Home() {
  const navigation = useNavigation();
  const pending =
    navigation.state !== "idle" && navigation.location?.pathname.startsWith("/dashboard");
  return (
    <PublicShell page="home">
      <section className={styles.hero} aria-labelledby="judul" data-home-hero>
        <h1 id="judul">
          <span className={styles.lineMask}>
            <span className="hero-title-line">Lebih dari</span>
          </span>
          <span className={`${styles.lineMask} ${styles.secondLine}`}>
            <span className="hero-title-line">
              sekadar <em>benar.</em>
            </span>
          </span>
        </h1>
        <div className={styles.heroBottom}>
          <div className={styles.heroIntro}>
            <p>
              Ruang latihan UTBK untuk yang ingin tahu <em>mengapa.</em> Bukan hanya jawaban yang
              mana.
            </p>
            <Link className="main-link" to="/dashboard" aria-busy={pending}>
              {pending ? (
                <>
                  Membuka ruang belajar{" "}
                  <Loader2 className="animate-spin" size={20} aria-hidden="true" />
                </>
              ) : (
                <>
                  Masuk ruang belajar <ArrowUpRight size={20} aria-hidden="true" />
                </>
              )}
            </Link>
          </div>
          <div className={styles.heroArtStage}>
            <LearningArtwork />
          </div>
          <a className={styles.scrollCue} href="#cara-belajar">
            Mulai dari rasa ingin tahu <ArrowDown size={19} aria-hidden="true" />
          </a>
        </div>
      </section>
      <LearningStory />
      <section className={styles.practiceModes} aria-labelledby="modes-title">
        <div className={styles.modeIntro}>
          <h2 id="modes-title">
            Beda hari.
            <br />
            <em>Beda ritme.</em>
          </h2>
          <p>
            Ada hari untuk fokus sendiri. Ada hari untuk menguji kesiapan. Ada juga hari untuk
            menantang teman.
          </p>
        </div>
        <div className={styles.modeLinks}>
          <Link to="/dashboard?tab=practice">
            <span>
              <strong>Drilling</strong>
              <small>Satu subtes, satu langkah lebih paham.</small>
            </span>
            <ArrowUpRight aria-hidden="true" />
          </Link>
          <Link to="/dashboard?tab=tryout">
            <span>
              <strong>Battle World</strong>
              <small>Simulasi Tryout lintas subtes.</small>
            </span>
            <ArrowUpRight aria-hidden="true" />
          </Link>
          <Link to="/dashboard?tab=warrior">
            <span>
              <strong>Warrior Battle</strong>
              <small>Latihan bareng lewat PvP 1v1 atau 2v2.</small>
            </span>
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </div>
      </section>
      <section className={styles.homeClosing} aria-labelledby="closing-title">
        <span className={styles.closingPrompt}>Kamu tidak harus langsung bisa.</span>
        <h2 id="closing-title">
          Mulai saja <em>dulu.</em>
        </h2>
        <Link className="main-link" to="/dashboard">
          Coba satu soal <ArrowUpRight size={20} aria-hidden="true" />
        </Link>
        <Link className={styles.textLink} to="/tentang">
          Kenali gagasan di balik latveriacademy <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </section>
    </PublicShell>
  );
}
