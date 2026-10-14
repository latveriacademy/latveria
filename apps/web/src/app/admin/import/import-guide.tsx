import { useState } from "react";
import { Copy } from "lucide-react";
import { utbkSubtests } from "@latveria/shared";
import { MathText } from "../../../components/math/math-text";
import { Button } from "../../../components/ui/button";
import { mathNotationExamples } from "../../../lib/math/math-import-examples";
import styles from "./import-guide.module.css";

export function ImportGuide() {
  const [selected, setSelected] = useState(0);
  const [copyStatus, setCopyStatus] = useState("");
  const [lexiconCopyStatus, setLexiconCopyStatus] = useState("");
  const example = mathNotationExamples[selected];
  const snippet = `"prompt": ${JSON.stringify(example.prompt)}`;
  const lexiconSnippet = JSON.stringify(
    {
      prompt: "Economic hegemony must never supersede ethical inquiry and human discretion.",
      options: [
        "Dominance or authority",
        "Equality and fairness",
        "Financial collapse",
        "International commerce",
      ],
      correctAnswer: 0,
      explanation: "Hegemony mengacu pada kepemimpinan dominan suatu negara atau kelompok.",
      source: "Arsip UTBK LBE 2026",
      annotations: [
        {
          term: "hegemony",
          definition: "Hegemoni; dominasi kepemimpinan atau pengaruh mutlak satu kelompok.",
          partOfSpeech: "noun",
          phonetic: "/hɪˈɡem.ə.ni/",
        },
        {
          term: "discretion",
          definition: "Kebijaksanaan dalam mengambil keputusan.",
          partOfSpeech: "noun",
        },
      ],
    },
    null,
    2,
  );

  return (
    <section className={styles.guide} aria-labelledby="import-guide-title">
      <h3 id="import-guide-title">Panduan impor</h3>
      <p className={styles.intro}>
        Lihat aturan format, contoh tampilan rumus, atau slug subtes sesuai kebutuhan.
      </p>

      <details className={styles.section}>
        <summary>Struktur JSON dan tujuan paket</summary>
        <div className={styles.body}>
          <p>
            Simpan soal dalam array <code>groups</code>. Setiap grup berisi satu subtes, satu paket
            tujuan, satu kategori, dan daftar soal.
          </p>
          <dl className={styles.fields}>
            <dt>
              <code>subtes</code>
            </dt>
            <dd>Slug subtes. Daftarnya tersedia pada bagian “Slug subtes” di bawah.</dd>
            <dt>
              <code>packageName</code>
            </dt>
            <dd>
              Nama paket. Paket yang belum ada akan dibuat otomatis; tanpa tujuan, soal masuk ke
              “Paket 1”.
            </dd>
            <dt>
              <code>packageId</code>
            </dt>
            <dd>
              UUID paket yang sudah ada, sebagai pengganti <code>packageName</code>. Jangan isi
              keduanya.
            </dd>
            <dt>
              <code>category</code>
            </dt>
            <dd>Materi atau kategori untuk seluruh soal dalam grup.</dd>
            <dt>
              <code>questions</code>
            </dt>
            <dd>
              Daftar soal dengan <code>prompt</code>, empat <code>options</code> unik,{" "}
              <code>correctAnswer</code>, <code>explanation</code>, dan <code>source</code>.
            </dd>
            <dt>
              <code>annotations</code>
            </dt>
            <dd>
              Opsional (khusus subtes LBE). Daftar kosakata: <code>term</code>,{" "}
              <code>definition</code>, <code>partOfSpeech</code> (posisi karakter dan ID otomatis
              dihitung dari teks soal).
            </dd>
          </dl>
          <h4>Indeks jawaban benar</h4>
          <p>
            <code>0</code> = opsi pertama · <code>1</code> = kedua · <code>2</code> = ketiga ·{" "}
            <code>3</code> = keempat.
          </p>
          <p>
            Tulis tujuan paket pada grup, bukan pada tiap soal. Tambahkan grup lain untuk paket,
            kategori, atau subtes berbeda. Batas satu impor: 100 soal dan 200 KB.
          </p>
        </div>
      </details>

      <details className={styles.section} open>
        <summary>Rumus matematika dan contoh tampilannya</summary>
        <div className={styles.body}>
          <dl className={styles.fields}>
            <dt>
              <code>$...$</code>
            </dt>
            <dd>
              Rumus menyatu dengan kalimat, misalnya <MathText>{"Nilai $x^2$ adalah ..."}</MathText>
            </dd>
            <dt>
              <code>{String.raw`$\displaystyle ...$`}</code>
            </dt>
            <dd>Pecahan, limit, integral, dan sigma tampil lebih besar, tetap di dalam kalimat.</dd>
            <dt>
              <code>$$...$$</code>
            </dt>
            <dd>
              Rumus berdiri pada baris tersendiri. Cocok untuk persamaan panjang atau beberapa
              langkah.
            </dd>
          </dl>
          <h4>Perhatikan backslash dalam JSON</h4>
          <p>
            Di editor soal biasa, LaTeX memakai satu backslash:{" "}
            <code>{String.raw`\frac{1}{2}`}</code>. Dalam JSON, tulis dua backslash:{" "}
            <code>{String.raw`\\frac{1}{2}`}</code>. Baris baru ditulis{" "}
            <code>{String.raw`\n`}</code>.
          </p>
          <p>
            Contoh di bawah sudah memakai escaping JSON yang benar. Salin cuplikannya, atau pilih
            “Gunakan contoh rumus” pada editor untuk mendapatkan enam soal lengkap.
          </p>
          <label className={styles.label} htmlFor="math-example">
            Pilih contoh rumus
          </label>
          <select
            id="math-example"
            value={selected}
            onChange={(event) => {
              setSelected(Number(event.target.value));
              setCopyStatus("");
            }}
          >
            {mathNotationExamples.map((item, index) => (
              <option value={index} key={item.name}>
                {item.name}
              </option>
            ))}
          </select>
          <figure className={styles.preview}>
            <figcaption>Hasil tampilan</figcaption>
            <div className={styles.formula}>
              <MathText>{example.prompt}</MathText>
            </div>
          </figure>
          <div className={styles.codeHeader}>
            <h4>Field prompt dalam JSON</h4>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(snippet);
                  setCopyStatus("Cuplikan JSON disalin.");
                } catch {
                  setCopyStatus("Salin teks pada cuplikan di bawah secara manual.");
                }
              }}
            >
              <Copy />
              Salin cuplikan
            </Button>
          </div>
          <pre className={styles.code}>
            <code>{snippet}</code>
          </pre>
          {copyStatus && <p role="status">{copyStatus}</p>}
          <p>
            Format yang sama bisa digunakan pada <code>options</code> dan <code>explanation</code>.
            Untuk langkah berurutan, gunakan{" "}
            <code>{String.raw`\begin{aligned} ... \end{aligned}`}</code> di dalam rumus blok;
            pemisah barisnya menjadi <code>{String.raw`\\\\`}</code> dalam JSON.
          </p>
          <p>
            Diagram TikZ memakai blok{" "}
            <code>{String.raw`\begin{tikzpicture} ... \end{tikzpicture}`}</code> tanpa pembungkus{" "}
            <code>$$</code>. Gunakan contoh geometri pada editor sebagai acuan.
          </p>
        </div>
      </details>

      <details className={styles.section}>
        <summary>Anotasi kosakata Lexicon (khusus subtes LBE)</summary>
        <div className={styles.body}>
          <p>
            Untuk subtes <code>literasi-bahasa-inggris</code>, kamu dapat menyertakan field{" "}
            <code>annotations</code> pada setiap soal. Posisi karakter (<code>start</code> &amp;{" "}
            <code>end</code>), <code>context</code>, dan ID otomatis dihitung dari teks{" "}
            <code>prompt</code> jika tidak ditentukan.
          </p>
          <div className={styles.codeHeader}>
            <h4>Contoh JSON soal dengan Lexicon</h4>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(lexiconSnippet);
                  setLexiconCopyStatus("Cuplikan JSON Lexicon disalin.");
                } catch {
                  setLexiconCopyStatus("Salin teks pada cuplikan di bawah secara manual.");
                }
              }}
            >
              <Copy />
              Salin cuplikan Lexicon
            </Button>
          </div>
          <pre className={styles.code}>
            <code>{lexiconSnippet}</code>
          </pre>
          {lexiconCopyStatus && <p role="status">{lexiconCopyStatus}</p>}
          <p>
            Kamu juga dapat langsung mengklik tombol “Gunakan contoh Lexicon LBE” di editor impor
            untuk memuat satu grup soal lengkap dengan kosakata.
          </p>
        </div>
      </details>

      <details className={styles.section}>
        <summary>Slug subtes</summary>
        <div className={styles.body}>
          <p>
            Gunakan nilai slug pada field <code>subtes</code>, bukan nama tampilan.
          </p>
          <dl className={styles.slugs}>
            {utbkSubtests.map((topic) => (
              <div key={topic.slug}>
                <dt>{topic.name}</dt>
                <dd>
                  <code>{topic.slug}</code>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </details>
    </section>
  );
}
