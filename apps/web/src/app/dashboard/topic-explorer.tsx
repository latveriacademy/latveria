"use client";

import { useState } from "react";
import styles from "./dashboard.module.css";

const topics = [
  { name: "Logika dan penalaran", group: "Penalaran", description: "Kenali pola, hubungkan informasi, dan tarik kesimpulan.", skills: "Pola bilangan, hubungan pernyataan, dan kesimpulan logis." },
  { name: "Pemahaman bacaan", group: "Literasi", description: "Temukan gagasan utama dan pahami maksud sebuah teks.", skills: "Ide pokok, informasi tersirat, dan hubungan antarparagraf." },
  { name: "Matematika dasar", group: "Kuantitatif", description: "Bangun pemahaman angka dari konsep yang paling dasar.", skills: "Perbandingan, persentase, dan persamaan sederhana." },
  { name: "Bacaan bahasa Inggris", group: "Literasi", description: "Pahami konteks dan makna dalam bacaan bahasa Inggris.", skills: "Main idea, vocabulary in context, dan inference." },
];
const groups = ["Semua", "Penalaran", "Literasi", "Kuantitatif"];

export function TopicExplorer() {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("Semua");
  const [selected, setSelected] = useState<string | null>(null);
  const filtered = topics.filter((topic) => (group === "Semua" || topic.group === group) && `${topic.name} ${topic.description}`.toLocaleLowerCase("id").includes(query.trim().toLocaleLowerCase("id")));

  return (
    <section id="topik" className={styles.topics} aria-labelledby="topik-judul">
      <div className={styles.sectionHeading}><div><h2 id="topik-judul">Apa yang ingin kamu pelajari?</h2><p>Contoh topik untuk mengenal ruang belajar. Cakupan materi masih dalam peninjauan.</p></div></div>
      <div className={styles.tools}>
        <div className={styles.filters} role="group" aria-label="Filter kategori">{groups.map((item) => <button key={item} type="button" aria-pressed={group === item} onClick={() => { setGroup(item); setSelected(null); }}>{item}</button>)}</div>
        <label className={styles.search}>Cari topik<input type="search" placeholder="Nama topik atau materi" value={query} onChange={(event) => { setQuery(event.target.value); setSelected(null); }} /></label>
      </div>
      <p className={styles.resultCount} role="status">{filtered.length} topik ditampilkan</p>
      <div className={styles.topicGrid}>
        {filtered.map((topic) => <article key={topic.name} className={styles.topic}>
          <div className={styles.topicMeta}><span>{topic.group}</span><span>Segera hadir</span></div>
          <h3>{topic.name}</h3><p>{topic.description}</p>
          <button type="button" className={styles.detailButton} aria-expanded={selected === topic.name} aria-controls={`detail-${topics.indexOf(topic)}`} onClick={() => setSelected(selected === topic.name ? null : topic.name)}>{selected === topic.name ? "Tutup detail" : "Lihat detail"}</button>
          {selected === topic.name && <div id={`detail-${topics.indexOf(topic)}`} className={styles.topicDetail}><h4>Rencana materi</h4><p>{topic.skills}</p><p>Soal dan pembahasan sedang disiapkan. Latihan belum dapat dimulai.</p></div>}
        </article>)}
      </div>
      {filtered.length === 0 && <div className={styles.empty}><h3>Topiknya belum ditemukan.</h3><p>Coba kata kunci lain atau tampilkan semua kategori.</p><button type="button" className={styles.detailButton} onClick={() => { setQuery(""); setGroup("Semua"); }}>Reset pencarian</button></div>}
    </section>
  );
}
