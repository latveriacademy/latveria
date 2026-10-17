import { useState } from "react";
import { ArrowUpRight, RotateCcw } from "lucide-react";
import logo from "../../assets/latveria.webp";
import styles from "./landing.module.css";

export function LearningArtwork() {
  return (
    <div
      className={`hero-art ${styles.artwork}`}
      role="img"
      aria-label="Ilustrasi buku terbuka, catatan geometri, dan lambang latveriacademy"
    >
      <div className={styles.artShadow} />
      <div className={styles.noteSheet} data-float="back" aria-hidden="true">
        <span>Ruang untuk mencoba.</span>
        <svg viewBox="0 0 200 130" fill="none">
          <path d="M25 105 95 20 175 105Z M95 20v85 M85 105V95h10" />
          <circle cx="95" cy="20" r="4" />
          <text x="42" y="60">
            a
          </text>
          <text x="140" y="60">
            b
          </text>
          <text x="100" y="120">
            c
          </text>
        </svg>
      </div>
      <svg
        className={styles.book}
        data-float="book"
        viewBox="0 0 600 500"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id="landing-paper"
            x1="80"
            y1="200"
            x2="540"
            y2="340"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#f7f3df" />
            <stop offset=".46" stopColor="#e0dfc9" />
            <stop offset=".5" stopColor="#b4bba1" />
            <stop offset=".54" stopColor="#f6f3df" />
            <stop offset="1" stopColor="#e7e8d1" />
          </linearGradient>
          <linearGradient
            id="landing-cover"
            x1="40"
            y1="300"
            x2="550"
            y2="400"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#173e2b" />
            <stop offset="1" stopColor="#397b52" />
          </linearGradient>
        </defs>
        <path
          d="m36 225 225 38 270-74 37 198-265 86-231-67Z"
          fill="url(#landing-cover)"
          stroke="#1b4931"
          strokeWidth="3"
        />
        <path
          d="m48 212 217 43 254-79 35 195-253 84-221-66Z"
          fill="#d3d6bd"
          stroke="#758b6a"
          strokeWidth="2"
        />
        <path
          d="m51 224 220 49 251-81M55 237l217 48 252-80M62 354l236 79 247-78M66 365l233 79 248-79"
          stroke="#829479"
          strokeWidth="1.5"
        />
        <path
          d="M46 199c81-28 145-12 224 40 82-71 161-97 243-78l34 195c-84-9-166 16-248 83-71-55-143-81-221-68Z"
          fill="url(#landing-paper)"
          stroke="#97a58b"
          strokeWidth="1.5"
        />
        <path d="m270 239 29 200" stroke="#7c8c70" strokeWidth="2" />
        <path
          d="M68 218c58-13 121 4 176 39M72 232c59-12 117 6 174 40M92 316c53-4 108 13 166 49M95 329c53-2 111 17 164 49M98 342c54 0 104 17 162 50M320 269c53-38 106-58 166-57M322 282c53-37 105-54 166-56M326 296c52-35 108-53 165-54M337 361c49-28 105-44 164-44M339 374c50-29 103-43 164-43"
          stroke="#99a58d"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="m136 281 33-27 33 49-66-22Zm33-27 4 39" stroke="#38744d" strokeWidth="2" />
        <ellipse
          cx="410"
          cy="312"
          rx="29"
          ry="22"
          transform="rotate(-20 410 312)"
          stroke="#38744d"
          strokeWidth="2"
        />
        <path
          d="m389 317 16 8 27-31"
          stroke="#38744d"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="m294 433 12 33 13-15 19 5-15-41" fill="#63a77a" />
      </svg>
      <div className={styles.answerSheet} data-float="front" aria-hidden="true">
        <span>Bagaimana kalau…</span>
        <strong>
          x = <em>mungkin?</em>
        </strong>
        <svg viewBox="0 0 180 35" fill="none">
          <path d="M5 22c30-25 100-18 168-9M125 4l48 9-25 17" />
        </svg>
      </div>
      <img
        className={styles.artSeal}
        data-float="seal"
        src={logo}
        width={100}
        height={100}
        alt=""
        aria-hidden="true"
      />
      <span className={styles.artCaption} aria-hidden="true">
        Satu soal. Banyak cara melihat.
      </span>
    </div>
  );
}

export function LearningExample() {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className={styles.example}>
      <p className={styles.exampleLabel}>Coba satu pertanyaan kecil.</p>
      <p className={styles.exampleQuestion}>
        2, 6, 12, 20, …<br />
        <em>Angka berikutnya?</em>
      </p>
      <button
        type="button"
        className={styles.exampleButton}
        aria-expanded={revealed}
        aria-controls="landing-explanation"
        onClick={() => setRevealed(!revealed)}
      >
        {revealed ? "Coba sekali lagi" : "Lihat dari sudut lain"}
        {revealed ? (
          <RotateCcw size={18} aria-hidden="true" />
        ) : (
          <ArrowUpRight size={18} aria-hidden="true" />
        )}
      </button>
      <div id="landing-explanation" className={styles.explanation} hidden={!revealed}>
        <strong>30. Kamu menemukan polanya.</strong>
        <p>
          Selisihnya +4, +6, +8, lalu +10. Jadi, 20 + 10 = 30. Cara melihat yang sama, untuk soal
          yang berbeda.
        </p>
      </div>
    </div>
  );
}
