import { LearningExample } from "./learning-artwork";
import styles from "./learning-story.module.css";

export function LearningStory() {
  return (
    <section id="cara-belajar" className={styles.story} aria-labelledby="story-title">
      <div className={styles.storyHeading}>
        <h2 id="story-title">
          Momen kecil.
          <br />
          <em>Oh, begitu.</em>
        </h2>
        <p>
          Yang berubah bukan cuma jawabanmu.
          <br />
          Tapi cara kamu melihat soalnya.
        </p>
      </div>
      <div className={styles.storyBody} data-story-body>
        <div className={styles.stage} aria-hidden="true" data-story-stage>
          <div className={styles.paperBack} />
          <div className={styles.paper}>
            <span className={styles.paperTitle}>Catatan penalaran</span>
            <div className={styles.sequence}>
              <span>3</span>
              <span>5</span>
              <span>9</span>
              <span>15</span>
              <em data-story-answer>23</em>
            </div>
            <svg className={styles.connections} viewBox="0 0 440 90" fill="none">
              <g data-story-connections>
                <path d="M30 12q30 52 70 0m20 0q30 52 70 0m20 0q30 52 70 0m20 0q30 52 70 0" />
                <text x="55" y="75">
                  +2
                </text>
                <text x="145" y="75">
                  +4
                </text>
                <text x="235" y="75">
                  +6
                </text>
                <text x="325" y="75">
                  +8
                </text>
              </g>
            </svg>
            <p className={styles.paperQuestion}>
              Bagaimana kalau yang dicari
              <br />
              bukan angkanya, <em>tapi jaraknya?</em>
            </p>
            <div className={styles.paperAnswer} data-story-resolution>
              <span>15 + 8 = 23</span>
              <svg viewBox="0 0 150 50" fill="none">
                <path d="M6 29C26 1 122-1 142 19c18 27-104 39-129 16" />
              </svg>
            </div>
          </div>
          <span className={styles.marginNote} data-story-note>
            Ubah sudut pandangnya.
          </span>
        </div>
        <ol className={styles.chapters}>
          <li data-story-step="0">
            <span className={styles.step}>01 / Temui soalnya</span>
            <h3>
              Sebentar.
              <br />
              Jangan buru-buru.
            </h3>
            <p>
              3, 5, 9, 15, … Angka berikutnya belum terlihat? Tidak apa-apa. Beri dirimu waktu untuk
              mengamati.
            </p>
          </li>
          <li data-story-step="1">
            <span className={styles.step}>02 / Ganti cara melihat</span>
            <h3>
              Di antara angka,
              <br />
              <em>ada petunjuk.</em>
            </h3>
            <p>
              Lihat selisihnya: 2, 4, lalu 6. Kadang yang kamu butuhkan bukan rumus baru, melainkan
              sudut pandang lain.
            </p>
          </li>
          <li data-story-step="2">
            <span className={styles.step}>03 / Temukan alasannya</span>
            <h3>
              Bukan menebak.
              <br />
              <em>Memahami.</em>
            </h3>
            <p>
              Selisih berikutnya 8. Jadi, 15 + 8 = 23. Polanya terbuka. Itulah rasa yang ingin kamu
              bawa ke soal selanjutnya.
            </p>
          </li>
        </ol>
      </div>
      <div className={styles.tryIt}>
        <div>
          <h3>
            Sekarang,
            <br />
            <em>giliranmu.</em>
          </h3>
          <p>Contoh kecil sebelum masuk ke ruang belajar.</p>
        </div>
        <LearningExample />
      </div>
    </section>
  );
}
