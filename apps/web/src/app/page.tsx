export default function Home() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="wordmark" href="#atas" aria-label="Latveria, kembali ke atas">latveria<span>.</span></a>
        <nav aria-label="Navigasi utama" className="nav-links">
          <a href="#cara-belajar">Cara belajar</a>
          <a href="#tentang">Tentang kami</a>
        </nav>
        <span className="header-note">RUANG BELAJAR UTBK / 001</span>
      </header>
      <main id="atas">
        <section className="hero" aria-labelledby="judul">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-mark" aria-hidden="true" />PERSIAPAN UTBK, DENGAN CARA YANG LEBIH MASUK AKAL</p>
            <h1 id="judul">Belajar itu<br />bukan soal <em>menebak.</em></h1>
            <p className="hero-description">Soal demi soal, pahami cara berpikirmu. Latveria dirancang sebagai tempat berlatih, meninjau kesalahan, dan tumbuh dengan ritmemu sendiri.</p>
            <a className="main-link" href="#cara-belajar">Kenali cara belajarnya <span aria-hidden="true">↗</span></a>
            <p className="launch-note">Sedang disiapkan — latihan belum tersedia.</p>
          </div>
          <div className="hero-art" aria-label="Ilustrasi catatan belajar dengan pertanyaan dan pembahasan">
            <div className="art-index">CATATAN BELAJAR <span>01 / 03</span></div>
            <div className="art-sheet">
              <span className="sheet-pin" aria-hidden="true">✳</span>
              <p className="sheet-label">LATIHAN • CONTOH ILUSTRASI</p>
              <p className="sheet-question">Jawaban yang salah<br />juga bisa jadi <i>awal</i><br />yang baik.</p>
              <div className="sheet-answer"><span aria-hidden="true">↗</span><span>Asal tahu alasannya.</span></div>
              <div className="sheet-footer"><span>COBA</span><span>PAHAMI</span><span>ULANGI</span></div>
            </div>
            <span className="art-caption">BUKAN SEKADAR BENAR ATAU SALAH.</span>
          </div>
        </section>
        <section id="cara-belajar" className="method" aria-labelledby="metode-judul">
          <div className="section-intro"><p className="eyebrow">CARA BELAJAR / 01</p><h2 id="metode-judul">Yang penting bukan<br /><em>cepat selesai.</em></h2><p>Ruang latihan yang dirancang agar setiap jawaban punya arti. Inilah alur yang sedang kami bangun.</p></div>
          <ol className="method-list">
            <li><span className="step-number">01</span><div><h3>Pilih yang ingin dipelajari.</h3><p>Mulai dari satu topik. Fokus dulu pada hal yang ingin kamu pahami.</p></div><span className="step-arrow" aria-hidden="true">↗</span></li>
            <li><span className="step-number">02</span><div><h3>Kerjakan dengan ritmemu.</h3><p>Berlatih soal satu per satu, tanpa harus terburu-buru.</p></div><span className="step-arrow" aria-hidden="true">↗</span></li>
            <li><span className="step-number">03</span><div><h3>Pelajari alasan di baliknya.</h3><p>Lihat jawaban dan pembahasan untuk mengenali apa yang perlu diperbaiki.</p></div><span className="step-arrow" aria-hidden="true">↗</span></li>
          </ol>
        </section>
        <section id="tentang" className="closing" aria-labelledby="tentang-judul"><p className="eyebrow">SEBUAH CATATAN / 02</p><h2 id="tentang-judul">Bertumbuh tidak harus<br /><em>sendirian.</em></h2><p>Latveria masih dalam tahap awal. Kami sedang menyiapkan pengalaman belajar UTBK yang mengutamakan latihan, pemahaman, dan perkembangan nyata — bukan janji nilai instan.</p><span className="closing-stamp">SAMPAI JUMPA DI LATIHAN PERTAMA ✳</span></section>
      </main>
      <footer className="site-footer">
        <span className="wordmark">latveria<span>.</span></span>
        <span>Platform belajar independen, bukan layanan resmi UTBK.</span>
        <a href="#atas">Kembali ke atas ↑</a>
      </footer>
    </div>
  );
}
