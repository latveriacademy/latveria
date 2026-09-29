# Arsitektur MVP Latveria

Status: PostgreSQL melalui Supabase sudah disetujui untuk tahap lanjutan, sedangkan pengembangan saat ini memakai PostgreSQL lokal lewat Compose. Monorepo `apps/web` sudah memiliki landing page, dashboard frontend, Better Auth lokal, dan halaman admin untuk menyisipkan soal draft. Alur latihan serta deployment masih berupa rancangan. Koneksi Supabase belum diverifikasi. Cakupan produk mengikuti `PLAN.md`.

## Cakupan MVP

MVP mencakup satu topik UTBK, soal pilihan ganda dengan satu jawaban benar, latihan tanpa batas waktu, pembahasan, akun peserta, riwayat latihan, serta EXP/level sederhana. Bangun alur latihan terlebih dahulu, kemudian penyimpanan perkembangan.

Latihan tamu dapat menjadi tahap awal pengembangan, tetapi usulan MVP yang menyimpan riwayat mewajibkan akun. Besaran EXP, kelayakan hadiah untuk latihan ulang, dan ambang level masih perlu diputuskan sebelum fitur hadiah dibuat.

Tryout, kamus, kartu belajar, papan peringkat, PvP, dan editor soal khusus menyusul setelah MVP. Konten awal dimasukkan melalui skrip impor agar panel admin belum diperlukan.

## Pilihan teknologi

| Bagian | Rekomendasi | Alasan |
| --- | --- | --- |
| Bahasa | TypeScript dengan `strict` | Satu bahasa untuk antarmuka, logika server, dan skrip konten. |
| Aplikasi | Next.js App Router pada Node.js LTS | Halaman dan operasi server berada dalam satu aplikasi. |
| Antarmuka | React dan Tailwind CSS | Komponen latihan sederhana dengan tampilan responsif; gunakan elemen HTML bawaan untuk formulir. |
| Database | PostgreSQL melalui Supabase | Menyimpan relasi soal, sesi, jawaban, dan hadiah dengan transaksi. |
| Akun | Better Auth dengan PostgreSQL lokal; autentikasi produksi perlu diputuskan | Email/kata sandi lokal dan pemeriksaan role server tersedia; pendaftaran produksi ditutup hingga verifikasi email/onboarding diputuskan. |
| Akses database | Drizzle ORM dan Drizzle Kit | Skema TypeScript, kueri SQL, dan migrasi yang dapat ditinjau. |
| Validasi masukan | Zod | Memeriksa masukan formulir dan berkas impor di server; tipe TypeScript saja tidak memvalidasi data saat aplikasi berjalan. |
| Pengelola paket | pnpm workspace | Monorepo dengan satu aplikasi `apps/web`, manifest per paket, dan satu lockfile di akar. |
| Pengujian | Vitest | Pemeriksaan terarah untuk penilaian, hadiah, dan operasi database. |
| Pemeriksaan kode | ESLint dan TypeScript | Pemeriksaan aturan kode serta tipe sebelum rilis. |
| Hosting | Vercel untuk aplikasi, Supabase untuk database dan akun | Penerapan awal sederhana tanpa mengelola server sendiri. |

Tetapkan versi stabil yang kompatibel saat penyiapan proyek, lalu simpan lockfile. Pilihan hosting perlu diperiksa terhadap anggaran dan batas paket saat digunakan.

## Alur sistem

```text
Peramban peserta
    │
    ├── Masuk dengan email/kata sandi ── Better Auth ── PostgreSQL
    │
    └── Next.js
          ├── Halaman dan komponen React
          ├── Server Actions: mulai sesi, simpan jawaban, kumpulkan
          └── Logika latihan + Drizzle ── PostgreSQL
```

- Gunakan Server Components untuk halaman dan pembacaan data; Client Components hanya untuk interaksi seperti memilih jawaban dan berpindah soal.
- Server Actions menerima perubahan data. Setiap operasi memvalidasi masukan, sesi pengguna, dan kepemilikan data. Middleware atau penyembunyian tombol tidak menggantikan pemeriksaan tersebut.
- Akses tabel latihan melalui server saja. Tidak perlu backend terpisah, API REST umum, Redis, antrean pekerjaan, atau layanan mikro untuk cakupan ini.
- Jangan kirim kunci jawaban dan pembahasan ke peramban sebelum sesi dikumpulkan. Pemisahan harus dilakukan pada kueri/data yang dikirim, bukan sekadar menyembunyikan tampilan.

## Struktur kode yang diusulkan

```text
apps/web/
  src/
    app/               halaman, layout, dan Server Actions
    components/        komponen tampilan yang digunakan ulang
    lib/
      auth.ts          pemeriksaan sesi Supabase di server
      practice.ts      mulai sesi, simpan jawaban, penilaian, dan hadiah
      db/              koneksi database dan skema Drizzle
  content/             soal sumber untuk impor; bukan aset publik
  scripts/             impor dan pemeriksaan konten
  drizzle/             migrasi SQL
```

Struktur ini adalah target MVP. Saat ini `apps/web` telah berisi halaman awal, dashboard peserta, autentikasi, halaman admin draft soal, skema/migrasi, dan skrip seed lokal; modul latihan serta folder konten yang ditinjau belum dibuat. Mulai dengan modul latihan biasa; pecah ketika tanggung jawabnya benar-benar membesar.

## Model data minimum

| Data | Isi dan aturan utama |
| --- | --- |
| Pengguna | Tabel Better Auth di PostgreSQL menyimpan akun, sesi, dan role; tidak ada tabel profil tambahan. |
| Topik | ID, nama, dan deskripsi singkat. |
| Versi soal | ID versi, ID soal tetap, topik, pertanyaan, pilihan ber-ID, ID jawaban benar, pembahasan, sumber/izin, dan status publikasi. |
| Sesi latihan | ID, ID pengguna, topik, status `in_progress`/`submitted`, waktu mulai/kumpul, jumlah benar, serta EXP yang diberikan. |
| Soal dalam sesi | ID sesi, ID versi soal, urutan, pilihan peserta yang boleh kosong, dan hasil penilaian setelah dikumpulkan. |

- Soal yang sudah dipublikasikan dan dipakai sesi tidak diubah isinya; koreksi membuat versi baru. Sesi lama tetap menunjuk versi semula agar hasil dan pembahasannya tidak berubah.
- Terapkan foreign key dan batasan unik untuk pasangan sesi/urutan serta sesi/versi soal. Batasi status dan nilai angka yang sah di database.
- Tidak perlu tabel dompet EXP: total EXP berasal dari jumlah hadiah sesi yang sudah dikumpulkan; level dihitung dari total tersebut. Simpan besaran hadiah per sesi agar perubahan rumus tidak menghitung ulang hadiah lama.
- Riwayat benar/salah/belum dijawab merupakan hasil latihan, bukan konversi nilai UTBK.

## Proses latihan dan penilaian

1. **Mulai:** server membuat sesi milik pengguna dan menyimpan daftar versi soal dalam urutan tetap, di dalam satu transaksi.
2. **Kerjakan:** pilihan jawaban disimpan ke server. Tampilkan status penyimpanan; peserta mendapat pesan jika penyimpanan gagal. Perpindahan soal menunggu penyimpanan selesai.
3. **Muat ulang:** server mengembalikan sesi dan jawaban terakhir yang berhasil disimpan. Jawaban yang belum tersimpan tidak dianggap sudah aman.
4. **Kumpulkan:** kirim pilihan terbaru bersama permintaan pengumpulan. Dalam satu transaksi, server mengunci baris sesi, memeriksa kepemilikan/status, memvalidasi bahwa pilihan berasal dari soal sesi, menyimpan jawaban, menghitung hasil dari kunci di database, menetapkan hadiah, lalu menandai sesi selesai.
5. **Permintaan berulang:** jika sesi sudah dikumpulkan, kembalikan hasil tersimpan. Jangan menilai atau memberikan EXP lagi. Operasi simpan jawaban juga mengunci baris sesi dan menolak perubahan setelah pengumpulan.
6. **Tinjau:** hanya pemilik sesi yang selesai dapat membaca jawaban benar serta pembahasannya melalui halaman hasil.

Usulan hasil awal: soal kosong dihitung sebagai tidak dijawab dan tidak menambah jumlah benar. Persentase benar menggunakan seluruh soal sesi sebagai pembagi. Tidak ada pengurangan nilai; ini aturan latihan usulan, bukan klaim aturan resmi UTBK.

## Keamanan dan konfigurasi

- Simpan koneksi PostgreSQL dan kredensial istimewa hanya di server, tanpa awalan `NEXT_PUBLIC_`. Modul database dan penilaian harus ditandai khusus server.
- Validasi sesi Better Auth dan role pada server menggunakan `requireUser`/`requireAdmin`; jangan memercayai ID pengguna atau role dari formulir.
- Periksa kepemilikan pada setiap pembacaan maupun perubahan sesi. Aktifkan RLS tanpa kebijakan akses langsung untuk tabel latihan agar API publik Supabase tidak membuka tabel tersebut. Koneksi server tetap wajib melakukan pemeriksaan kepemilikan karena peran database server dapat melewati RLS.
- Gunakan koneksi pooler yang sesuai untuk lingkungan serverless saat aplikasi berjalan. Jalankan migrasi melalui koneksi yang direkomendasikan Supabase untuk migrasi, dengan kredensial terpisah bila diperlukan.
- Sediakan `.env.example` berisi nama variabel dan keterangan tanpa rahasia. Pisahkan proyek/database pengembangan dan produksi; deployment pratinjau tidak boleh memakai database produksi.

## Penyiapan dan rilis

Urutan implementasi:

1. Siapkan Next.js, TypeScript strict, pnpm, ESLint, dan Vitest; catat perintah sebenarnya di `AGENTS.md`.
2. Gunakan PostgreSQL lokal via Compose untuk pengembangan, migrasi Drizzle, seed dummy, dan akun Better Auth; proyek Supabase terpisah untuk uji koneksi/deployment nanti.
3. Buat impor soal yang memvalidasi ID unik, pilihan jawaban, kunci, pembahasan, serta sumber materi. Impor tidak boleh menimpa versi soal yang sudah dipakai.
4. Bangun satu alur lengkap dari pemilihan topik hingga pembahasan, kemudian riwayat dan hadiah EXP.
5. Jalankan pemeriksaan, terapkan migrasi yang telah ditinjau, impor konten yang disetujui, lalu terapkan aplikasi. Jangan menjalankan migrasi otomatis pada setiap permintaan atau build pratinjau.

Perintah P0 tersedia di `package.json`: `pnpm dev` untuk pengembangan dan `pnpm check` untuk lint → pemeriksaan tipe → pengujian → build produksi. Panduan konfigurasi Supabase dan migrasi ada di `README.md`.

## Verifikasi minimum

- Uji penilaian untuk jawaban benar, salah, kosong, dan pilihan yang tidak sah.
- Uji integrasi pada PostgreSQL pengujian untuk pengumpulan bersamaan: satu hasil akhir dan satu hadiah; penyimpanan jawaban terlambat tidak mengubah sesi selesai.
- Uji bahwa pengguna lain tidak dapat membaca/mengubah sesi dan bahwa soal aktif yang dikirim ke peramban tidak memuat kunci atau pembahasan.
- Periksa langsung alur masuk, latihan, penyimpanan gagal, muat ulang, dan tinjauan hasil. Gunakan Playwright hanya jika interaksi peramban atau pemeriksaan visual diperlukan, bukan untuk pemeriksaan berkas rutin.

## Keputusan yang masih terbuka

- Konfigurasi proyek Supabase terpisah, keputusan autentikasi produksi dan verifikasi email, serta persetujuan layanan hosting dan anggaran operasionalnya. PostgreSQL lokal sudah diverifikasi, Supabase belum.
- Topik dan jumlah soal pertama, pemilik peninjauan konten, serta izin penggunaan soal.
- Persetujuan wajib akun untuk riwayat tersimpan.
- Rumus EXP, aturan latihan ulang, dan ambang level. Jangan mengarang angka dari sketsa papan.
