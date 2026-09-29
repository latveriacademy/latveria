# Latveria — Rencana situs belajar UTBK

Status: fondasi aplikasi P0 sudah dibuat; tahapan fitur berikutnya masih berupa rencana. PostgreSQL melalui Supabase telah disetujui.

Rekomendasi stack TypeScript, arsitektur MVP, model data, dan urutan penyiapan tersedia di `ARCHITECTURE.md`.

## Tujuan dan acuan

Membantu peserta UTBK berlatih, memahami kesalahan, dan melihat perkembangan melalui poin pengalaman (EXP) dan level. Pengguna memberikan foto papan perencanaan (`Project.jpg`); ide yang terbaca mencakup latihan berbatas waktu, kartu belajar (flashcard), kosakata, matematika dasar, pembahasan soal, papan peringkat, profil, dan kamus kontekstual.

Usulan bahasa utama: Bahasa Indonesia untuk navigasi dan penjelasan, dengan Bahasa Inggris tetap digunakan jika diperlukan oleh materi pembelajaran.

## Tahapan pengembangan

### P0. Fondasi proyek

- [x] Monorepo pnpm dengan Next.js di `apps/web`, TypeScript strict, Tailwind CSS, dan lockfile bersama.
- [x] Landing page berbahasa Indonesia yang menjelaskan tujuan produk, alur belajar yang direncanakan, dan status pengembangan.
- [x] Koneksi database khusus server, validasi konfigurasi, dan migrasi awal tabel topik dengan RLS.
- [x] Perintah lint, pemeriksaan tipe, pengujian, dan build; seluruh pemeriksaan lokal lolos.
- [ ] Konfigurasi proyek Supabase pengembangan dalam `.env.local`, verifikasi koneksi, dan penerapan migrasi. Menunggu kredensial lokal.

P0 adalah fondasi teknis, belum alur latihan. Panduan menjalankan aplikasi dan menyiapkan database tersedia di `README.md`.

### 1. Satu alur latihan yang lengkap

- Pilih satu topik UTBK dan sejumlah kecil soal yang sudah ditinjau sebelum memperluas cakupan. Sesuaikan dengan kategori ujian terkini yang telah diverifikasi; contoh kosakata/matematika pada papan bukan silabus lengkap.
- Bangun alur pemilihan topik → sesi latihan → pengumpulan jawaban → hasil → tinjauan tiap soal.
- Mulai dengan soal pilihan ganda yang memiliki satu jawaban benar. Setiap soal memerlukan identitas tetap, topik, pertanyaan, pilihan jawaban, kunci jawaban, pembahasan, dan sumber materi.
- Tinjauan menampilkan jawaban peserta, jawaban benar, dan `Pembahasan`. Sertakan teks/ikon selain pembeda warna hijau/merah pada papan.
- Jawaban dapat diubah sebelum dikumpulkan, sedangkan hasil tetap setelahnya. Tentukan secara jelas cara menangani soal yang tidak dijawab.
- Kriteria selesai: peserta dapat menyelesaikan sesi dan meninjau soal yang benar, salah, serta tidak dijawab, dengan jumlah yang konsisten.

### 2. Penyimpanan perkembangan dan EXP

- Tambahkan identitas peserta, penyimpanan hasil sesi, riwayat per topik, dan tampilan EXP/level setelah alur latihan berjalan.
- Tentukan besaran EXP, syarat perolehan EXP saat mengulang latihan, dan ambang kenaikan level sebelum implementasi. Berikan hadiah sekali untuk setiap sesi yang memenuhi syarat; memuat ulang halaman atau mengumpulkan ulang jawaban tidak boleh menggandakan hadiah.
- Tampilkan persentase jawaban benar secara terpisah dari EXP. Jangan menyajikan keduanya sebagai nilai resmi atau prediksi nilai UTBK.
- Kriteria selesai: riwayat dan perkembangan level tetap tersimpan saat peserta kembali; pengumpulan ulang tidak mengubah hadiah yang sudah tercatat.

### 3. Latihan berbatas waktu dan alat bantu belajar

- Tambahkan sesi berbatas waktu, lalu tryout. Pastikan durasi, bagian ujian, aturan perpindahan soal, dan tindakan saat waktu habis sebelum menyebut suatu mode sebagai simulasi ujian.
- Tambahkan kartu belajar untuk mengulang materi tertentu dan kamus kontekstual yang memuat arti, bentuk kata, serta contoh penggunaan.
- Kartu belajar merupakan latihan tambahan, bukan bukti bahwa seluruh materi UTBK sudah tercakup.
- Kriteria selesai: saat waktu habis, halaman dimuat ulang, dan hasil ditinjau, sistem mengikuti aturan sesi yang dipilih tanpa kehilangan jawaban yang sudah dikumpulkan.

### 4. Motivasi sosial dan personalisasi

- Tambahkan papan peringkat harian, mingguan, bulanan, dan sepanjang waktu setelah syarat nilai yang dapat dihitung serta aturan pengulangan latihan ditetapkan. Tentukan dahulu dasar pemeringkatan, zona waktu, batas periode, dan penanganan nilai seri.
- Tambahkan pengaturan nama pengguna, nama tampilan, foto profil, serta tampilan terang/gelap.
- Papan peringkat bersama memerlukan perhitungan hadiah yang dikendalikan sistem, bukan perangkat peserta, serta pembatasan akses ke data peserta.
- Kriteria selesai: peringkat menggunakan ukuran dan periode yang terdokumentasi secara konsisten; peserta tidak dapat mengubah hasil atau hadiah milik peserta lain.

### Ide lanjutan dari papan

PvP (kompetisi antarpemain), peringkat kompetitif, musim kompetisi, jenjang, lencana, dan kejutan tersembunyi bertema Latveria. Bahas kembali setelah peserta dapat berlatih dan meninjau kesalahan dengan lancar.

## Keputusan sebelum implementasi

- Topik awal, penyedia soal, izin penggunaan ulang, dan penanggung jawab peninjauan materi.
- Tahun ujian yang dituju dan sumber resmi format UTBK; keberadaan kalkulator pada sketsa bukan bukti bahwa penggunaannya diizinkan dalam simulasi ujian.
- Apakah peserta boleh berlatih sebagai tamu atau wajib masuk akun, serta apakah perkembangan awal disimpan di perangkat atau dikaitkan dengan akun.
- Aturan EXP/pengulangan latihan dan apakah papan peringkat menggunakan EXP atau ukuran lain yang ditetapkan secara jelas.
- PostgreSQL melalui Supabase telah disetujui dan fondasi teknis sudah tersedia. Autentikasi, layanan hosting, serta anggaran operasional di `ARCHITECTURE.md` masih perlu ditetapkan sebelum rilis.

Target implementasi pertama: sejumlah kecil soal yang sudah ditinjau, dapat dikerjakan dari awal sampai akhir, dan memiliki pembahasan yang membantu peserta memahami jawabannya. Catat perintah penyiapan dan pemeriksaan terarah yang benar-benar tersedia di `AGENTS.md` setelah perangkat pengembangan disiapkan.
