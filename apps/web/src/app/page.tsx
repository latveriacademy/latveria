import Image from "next/image";
import logo from "../../../../latveria.webp";

export default function Home() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="wordmark" href="#atas" aria-label="Latveria, kembali ke atas">
          <Image src={logo} alt="" width={42} height={42} priority />
          <span>latveria</span>
        </a>
        <nav aria-label="Navigasi utama" className="nav-links">
          <a href="#cara-belajar">Cara belajar</a>
          <a href="#tentang">Tentang kami</a>
        </nav>
        <span className="header-note">ARSIP BELAJAR / 001</span>
      </header>
      <main id="atas">
        <section className="hero" aria-labelledby="judul">
          <div className="hero-copy">
            <p className="eyebrow">PERSIAPAN UTBK · CATATAN PERTAMA</p>
            <h1 id="judul">Belajar bukan<br />perkara <em>menebak.</em></h1>
            <p className="hero-description">Berlatih, memahami kesalahan, lalu kembali lebih siap. Satu soal dalam satu waktu.</p>
            <a className="main-link" href="#cara-belajar">Buka catatan <span aria-hidden="true">↓</span></a>
          </div>
          <div className="hero-art">
            <p className="art-index">LAMBANG LATVERIA <span>EST. MMXXVI</span></p>
            <div className="emblem-wrap">
              <span className="orbit-copy orbit-copy-top">BELAJAR · PAHAMI · BERTUMBUH</span>
              <Image className="hero-logo" src={logo} alt="Lambang Latveria" sizes="(max-width: 900px) 70vw, 38vw" priority />
              <span className="orbit-copy orbit-copy-bottom">PERSIAPAN UJIAN TULIS BERBASIS KOMPUTER</span>
            </div>
            <p className="art-caption">RUANG LATIHAN INDEPENDEN · SEDANG DISIAPKAN</p>
          </div>
        </section>
        <section id="cara-belajar" className="method" aria-labelledby="metode-judul">
          <div className="section-intro"><span className="chapter-mark" aria-hidden="true">I</span><h2 id="metode-judul">Bukan siapa yang<br /><em>paling cepat.</em></h2><p>Setiap jawaban adalah jejak cara berpikir. Latveria sedang dibangun agar jejak itu dapat dipelajari.</p></div>
          <ol className="method-list">
            <li><span className="step-number">I.</span><div><h3>Pilih satu perkara.</h3><p>Mulai dari satu topik dan pusatkan perhatian pada hal yang ingin dipahami.</p></div><span className="step-flourish" aria-hidden="true">❦</span></li>
            <li><span className="step-number">II.</span><div><h3>Kerjakan dengan ritmemu.</h3><p>Hadapi soal satu per satu. Tidak ada manfaatnya tergesa tanpa mengerti.</p></div><span className="step-flourish" aria-hidden="true">❦</span></li>
            <li><span className="step-number">III.</span><div><h3>Pelajari alasan di baliknya.</h3><p>Tinjau jawaban dan pembahasan untuk menemukan apa yang perlu diperbaiki.</p></div><span className="step-flourish" aria-hidden="true">❦</span></li>
          </ol>
        </section>
        <section id="tentang" className="closing" aria-labelledby="tentang-judul">
          <Image className="closing-logo" src={logo} alt="" width={220} height={220} />
          <div><p className="hand-note">Untuk para pembelajar,</p><h2 id="tentang-judul">Jalan panjang terasa<br /><em>lebih ringan bersama.</em></h2><p>Latveria masih dalam tahap awal. Kami menyiapkan ruang belajar UTBK yang mengutamakan latihan dan pemahaman, bukan janji nilai instan.</p><span className="closing-stamp">SAMPAI JUMPA DI LATIHAN PERTAMA</span></div>
        </section>
      </main>
      <footer className="site-footer">
        <span className="wordmark"><Image src={logo} alt="" width={34} height={34} /><span>latveria</span></span>
        <span>Platform belajar independen, bukan layanan resmi UTBK.</span>
        <a href="#atas">Kembali ke atas ↑</a>
      </footer>
    </div>
  );
}
