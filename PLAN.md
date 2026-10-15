# Rencana produk latveriacademy

Platform latihan UTBK-SNBT berbahasa Indonesia untuk berlatih, meninjau kesalahan, dan membangun kebiasaan belajar. EXP, akurasi, skor simulasi Tryout, dan poin Warrior Battle adalah ukuran berbeda; semuanya bukan skor resmi atau prediksi nilai UTBK.

Dokumen ini merangkum status dan arah produk. Detail implementasi ada di [ARCHITECTURE.md](ARCHITECTURE.md), prosedur kerja di [CONTRIBUTING.md](CONTRIBUTING.md), dan penyiapan di [README.md](README.md). Issue GitHub menjadi sumber pekerjaan aktif, bukan checklist implementasi duplikat di dokumen.

## Sudah tersedia

- **Fondasi:** monorepo Bun, React/Vite, Hono, PostgreSQL/Drizzle, Better Auth, kontrak Zod, dan CI untuk tes serta image container.
- **Drilling:** katalog paket per subtes, mulai langsung, timer opsional, jawaban A–E, hasil/pembahasan, riwayat, submit idempoten, dan EXP/level/streak WIB dari data server.
- **Battle World:** Tryout lintas subtes, jeda, draft server dan resume, snapshot revisi soal, hasil/radar/review baca-saja, serta impor soal admin. Skor dasar dan alur kalibrasi IRT dijelaskan di [panduan scoring](docs/tryout-scoring-irt.md).
- **Warrior Battle:** room 1v1/2v2 dengan kode, lobby siap, ronde berwaktu melalui WebSocket, hasil, riwayat, rematch, serta pembahasan personal setelah pertandingan selesai.
- **Profil dan preferensi:** profil tersimpan di database, unggah avatar melalui object storage, tema gelap/perkamen, dan preferensi suara lokal.
- **Leaderboard:** periode WIB, filter subtes/metrik, jawaban pertama per soal, dan pengecualian akun demo.
- **Lexicon:** anotasi kosakata dan koleksi pribadi. **Library** masih berupa halaman materi dengan empty state.
- **Admin:** pengelolaan paket/soal, impor JSON, Tryout/IRT, user, laporan, afirmasi, analytics, log aktivitas, ekspor, dan kesehatan sistem.
- **Rumus/diagram:** KaTeX, subset TikZ/PGFPlots lokal, dan worker TeX untuk diagram yang membutuhkan kompilasi.

## Prioritas berikutnya

1. **Konten yang ditinjau — issue #2:** pilih topik awal, sumber/izin penggunaan, dan penanggung jawab peninjauan soal. Seed adalah contoh, bukan bank soal resmi yang siap dipublikasikan.
2. **Draft Drilling lintas reload — issue #5:** tetapkan penyimpanan, masa berlaku, dan alur melanjutkan latihan. Draft saat ini masih di memori browser.

## Batas saat ini

- Signup hanya aktif di development; penyiapan akun dan verifikasi email produksi perlu keputusan operasional sebelum rilis.
- Kalibrasi IRT nyata membutuhkan data respons yang memadai, mesin R/mirt, dan peninjauan model. Fixture sintetis pengujian bukan model produksi.
- Room socket dan timer Warrior berada dalam satu proses API; pemulihan pertandingan setelah restart dan koordinasi multi-instance belum tersedia.
- Tryout memiliki snapshot revisi soal; Drilling dan Warrior melindungi soal terjawab dari perubahan. Jangan menyamakan mekanisme keduanya.
- Deployment database produksi harus diverifikasi pada lingkungan tujuan; CI menggunakan PostgreSQL uji.

## Ide yang belum menjadi komitmen implementasi

Rekomendasi area lemah, bookmark/review berkala, spaced repetition, rencana belajar, tantangan harian, analytics waktu, kelas/grup, onboarding/notifikasi, berbagi progres, referral, ekspor PDF, PWA offline, asisten belajar AI, dan dashboard wali perlu scope serta kriteria selesai dalam issue sebelum dikerjakan. Voice input tidak masuk rencana.

Ranked PvP, Elo, musim, jenjang, dan lencana belum menjadi sistem kompetitif aktif. Navigasi saat ini tetap memisahkan Drilling, Battle World (Tryout), dan Warrior Battle; rancangan lama lobby 2–8 pemain dan tab PvP di Battle World telah digantikan implementasi 1v1/2v2.
