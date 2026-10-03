// Nama dan pengelompokan: SNPMB 2026, https://snpmb.id/utbk-snbt/informasi-umum
// Soal aplikasi tetap contoh lokal; katalog ini bukan spesifikasi jumlah soal atau penilaian ujian.
export const utbkSubtests = [
  {
    slug: "penalaran-umum",
    name: "Penalaran Umum",
    section: "tps",
    short: "PU",
    description: "Bernalar dari pola, data, dan pernyataan.",
  },
  {
    slug: "pengetahuan-pemahaman-umum",
    name: "Pengetahuan dan Pemahaman Umum",
    section: "tps",
    short: "PPU",
    description: "Memahami makna kata dan informasi dalam teks.",
  },
  {
    slug: "pemahaman-bacaan-menulis",
    name: "Pemahaman Bacaan dan Menulis",
    section: "tps",
    short: "PBM",
    description: "Memahami dan memperbaiki gagasan dalam tulisan.",
  },
  {
    slug: "pengetahuan-kuantitatif",
    name: "Pengetahuan Kuantitatif",
    section: "tps",
    short: "PK",
    description: "Menggunakan pengetahuan bilangan dan aljabar.",
  },
  {
    slug: "literasi-bahasa-indonesia",
    name: "Literasi dalam Bahasa Indonesia",
    section: "literasi",
    short: "BI",
    description: "Memahami informasi dalam teks berbahasa Indonesia.",
  },
  {
    slug: "literasi-bahasa-inggris",
    name: "Literasi dalam Bahasa Inggris",
    section: "literasi",
    short: "EN",
    description: "Memahami informasi dalam teks berbahasa Inggris.",
  },
  {
    slug: "penalaran-matematika",
    name: "Penalaran Matematika",
    section: "literasi",
    short: "PM",
    description: "Memakai matematika untuk menafsirkan situasi sehari-hari.",
  },
] as const;
