# Audit dashboard admin — 8 Oktober 2026

Status: arsip temuan sebelum perbaikan, bukan daftar bug aktif. Tindak lanjut ditangani pada issue #68–#71; gunakan issue GitHub untuk status pekerjaan terkini. Bukti reproduksi di bawah dipertahankan sebagai konteks regresi.

## Ringkasan

Audit menemukan **8 temuan P1 dan 12 temuan P2**. Tidak ada temuan P0 yang terverifikasi dalam cakupan ini. Masalah utama: penonaktifan akun tidak membatasi akses, alur impor Tryout gagal, Analytics salah menghitung jawaban, Ekspor belum memiliki endpoint, dan operasi admin tidak menghasilkan audit log.

P1 berarti fungsi inti, keamanan, atau integritas data membutuhkan perbaikan segera. P2 berarti fungsi pendukung, ketepatan informasi, atau aksesibilitas/responsivitas terganggu.

## Cakupan dan metode

Path dan nomor baris dalam bukti berikut mengacu pada struktur repo saat audit, sebelum pengelompokan folder fitur. Struktur sumber terbaru dijelaskan di `ARCHITECTURE.md`.

- Menelusuri router, guard sesi/role/Origin, handler, service, kontrak shared, dan foreign key yang terkait menu admin.
- Membuka Ringkasan, Tryout, Bank soal, Laporan soal, Afirmasi, User, Analytics, Log Aktivitas, Ekspor, dan Sistem pada desktop 1440 px dan mobile 390 px.
- Memeriksa halaman subtes/paket, tambah/edit/pratinjau soal, impor JSON, detail Tryout, serta detail user. Pemeriksaan ini berupa smoke test dan pemeriksaan terarah, bukan seluruh kombinasi interaksi/data.
- Memverifikasi endpoint dengan sesi QA lokal. Mutasi pengujian menggunakan akun/paket QA terisolasi; tidak menghapus atau mengubah konten peserta yang sudah ada.
- Memeriksa failure state Afirmasi dengan respons 500 yang disimulasikan di browser, tanpa mengubah backend.
- **Runtime** berarti direproduksi dengan HTTP/browser atau query database baca-saja. **Kode** berarti alur/kontrak/FK terverifikasi dari sumber, tanpa mereproduksi operasi destruktif pada data peserta.
- Snapshot angka mengacu ke database lokal saat audit. Tidak membuktikan keadaan database produksi atau penyebab hilangnya paket sebelumnya.

## P1 — prioritas utama

### 01. Akun nonaktif masih bisa login dan mengakses API

**Bukti: runtime + kode.** Setelah akun QA dinonaktifkan, sesi lama masih mendapat HTTP 200 dari `/api/me` dan `/api/admin/topics`; login baru juga mendapat HTTP 200. Akun kemudian diaktifkan kembali untuk melanjutkan pengujian.

- Lokasi: `apps/api/src/handlers/users.handler.ts:643–662`, `apps/api/src/app.ts:75–90`, `apps/api/src/lib/auth.ts:20–31`.
- Penyebab: flag `isDeactivated` hanya disimpan; middleware dan autentikasi tidak menolaknya.
- Dampak: tindakan “Nonaktifkan akun” tidak melakukan pembatasan akses yang dijanjikan.
- Perbaikan minimum: tolak akun nonaktif saat login/pembuatan sesi dan di middleware API; cabut sesi saat penonaktifan, termasuk bulk action.

### 02. Impor dan hapus soal dari subtes Tryout memakai route yang tidak tersedia

**Bukti: runtime + kode.** URL impor yang dipakai modal mendapat HTTP 404 pada paket QA. Frontend memasukkan ID paket sebelum `/sections`, tetapi handler tidak memiliki segmen tersebut. Hapus soal memakai pola URL yang sama.

- Lokasi: `apps/web/src/app/admin/tryout-section-import-modal.tsx:72`, `apps/web/src/app/admin/admin-tryout-detail.tsx:108–110`, `apps/api/src/handlers/tryout.handler.ts:106–118`.
- Dampak: UI dapat memvalidasi JSON, tetapi submit gagal; pelepasan soal dari subtes juga tidak mencapai handler.
- Perbaikan minimum: samakan route frontend/backend dan verifikasi kedua aksi dari UI.

### 03. Impor Tryout lintas subtes melanggar FK paket–topik

**Bukti: runtime + kode.** Mengirim satu soal valid ke section EN melalui URL handler yang benar pada paket QA mendapat HTTP 500. Paket penuh memiliki satu `topicId`, sedangkan impor memberi soal `topicId` sesuai section sekaligus `packageId` paket tersebut.

- Lokasi: `apps/api/src/services/admin-tryout.service.ts:401–436`, `apps/api/src/lib/db/schema.ts:100–104`.
- Penyebab: FK `(package_id, topic_id)` mewajibkan topik soal sama dengan topik paket.
- Dampak: memperbaiki route saja belum membuat impor tujuh subtes bekerja.
- Perbaikan minimum: gunakan `tryout_package_questions` untuk menghubungkan soal lintas subtes; jangan menetapkan paket asal soal yang melanggar FK. Pertahankan transaksi impor.

### 04. Analytics menghitung seluruh jawaban sebagai statistik setiap soal

**Bukti: runtime + kode.** Dua soal berbeda masing-masing mendapat 354 percobaan, 165 benar, dan akurasi 47%; seluruh 344 soal memenuhi ambang 10 percobaan karena agregasi global.

- Lokasi: `apps/api/src/handlers/analytics.handler.ts:30–35`.
- Penyebab: `practiceAttempts` di-join dengan `1=1`; jawaban tidak dihubungkan ke `questions.id`.
- Dampak: akurasi, frekuensi, sorting, dan tanda “Perlu dicek” tidak menggambarkan soal terkait; query juga menghasilkan perkalian baris besar.
- Perbaikan minimum: join jawaban berdasarkan `practiceAnswers.questionId = questions.id`, lalu agregasi/filter/paginasi di SQL.

### 05. Log Aktivitas tidak mencatat operasi admin

**Bukti: runtime + kode.** Setelah penonaktifan/pengaktifan akun QA dan pembuatan/penghapusan paket QA, endpoint audit masih mengembalikan total 0. Pencarian seluruh sumber menemukan `logAuditAction` hanya pada definisinya, tanpa caller.

- Lokasi: `apps/api/src/handlers/audit.handler.ts:77–93`; operasi tulis di `users.handler.ts`, `question.service.ts`, `package.service.ts`, dan `admin-tryout.service.ts`.
- Dampak: menu menampilkan riwayat kosong meskipun aksi berlangsung; penghapusan/perubahan konten tidak dapat ditelusuri melalui fitur ini.
- Perbaikan minimum: tulis log pada operasi mutasi, bersama transaksi data bila relevan, dengan aktor/target dan detail secukupnya.

### 06. Semua pilihan pada menu Ekspor mendapat 404

**Bukti: runtime + kode.** `/api/admin/export/users`, `/api/admin/export/questions`, dan `/api/admin/export/leaderboard` masing-masing mendapat HTTP 404. Router aplikasi tidak memasang handler untuk route ini.

- Lokasi: `apps/web/src/app/admin/admin-export.tsx:120–126`, `apps/api/src/app.ts:108–120`.
- Dampak: tidak ada pilihan ekspor pada menu tersebut yang dapat menghasilkan berkas.
- Perbaikan minimum: implementasikan kontrak tiga endpoint, memakai query/agregasi yang sudah ada dan ekspor seluruh hasil filter, bukan hanya halaman pertama.

### 07. Penghapusan paket dapat menghapus seluruh sesi Tryout terkait

**Bukti: kode.** `tryout_sessions.package_id` memakai `ON DELETE CASCADE`, termasuk untuk sesi completed. Endpoint hapus Tryout langsung menghapus paket tanpa memeriksa sesi/histori.

- Lokasi: `apps/api/src/services/admin-tryout.service.ts:291–302`, `apps/api/src/lib/db/schema.ts:227–248`, `apps/web/src/app/admin/admin-tryouts.tsx:279–280`.
- Dampak: jika penghapusan paket berhasil, hasil dan draft sesi terkait ikut hilang. Dialog hanya menyebut section/relasi soal. Operasi ini tidak direproduksi pada paket peserta.
- Perbaikan minimum: nonaktifkan/arsipkan paket yang mempunyai sesi, atau tolak penghapusan dengan pesan jelas. Tentukan retensi histori sebelum mengubah FK.

### 08. Susunan soal Tryout dari builder bukan sumber otoritatif saat sesi dimulai

**Bukti: kode.** `startTryout` memilih subtes dari katalog resmi, membagi `targetQuestions` secara merata, mengacak pool, dan ketika pin kosong mengambil soal kategori/topik global. Pemilihan tidak mengikuti section/order dan tidak memfilter publikasi paket asal pool fallback.

- Lokasi: `apps/api/src/services/tryout.service.ts:43–90`; pembacaan durasi section ada di `:156–168`.
- Dampak: Tryout baru yang dipublikasikan tanpa soal terkonfigurasi dapat berisi soal paket lain; section/order/jumlah soal builder tidak sepenuhnya menentukan sesi. Durasi section memang dibaca, tetapi itu tidak memperbaiki pemilihan soal.
- Perbaikan minimum: gunakan section dan relasi soal paket sebagai sumber sesi untuk Tryout terstruktur; tolak publikasi/start saat konfigurasi belum siap, dan jangan fallback ke bank soal global.

## P2 — fungsi pendukung dan kualitas UI

### 09. XP, level, dan durasi user admin tidak sesuai sumber progres peserta

**Bukti: runtime + kode.** Pada satu user lokal, admin menampilkan 590 XP, level 6, dan 89.100 detik. Query attempt baca-saja bersama `learnerSummary` menghasilkan 1.305 XP, level 4, dan jumlah durasi attempt 4.380 detik.

- Lokasi: `apps/api/src/handlers/users.handler.ts:174–212`, `:273–295`, `:814–846`; sumber kanonis `packages/shared/src/progression.ts:1–16,55–87`.
- Penyebab: admin memakai `correct * 10` dan ambang 100; durasi attempt dijumlah ulang untuk setiap baris jawaban hasil join.
- Perbaikan: gunakan helper progres shared; agregasikan durasi sekali per attempt. Terapkan juga pada ekspor detail user.

### 10. Kontrak daftar/detail Tryout tidak cocok dengan frontend

**Bukti: runtime + kode.** Detail menampilkan “NaN Menit Alokasi”; daftar mengharapkan `durationMinutes` sementara API mengembalikan `duration`. Daftar admin juga memasukkan paket Drilling dan menghitung hanya relasi pin sehingga paket yang mempunyai soal langsung dapat terlihat berisi 0 soal.

- Lokasi: `apps/web/src/app/admin/admin-tryouts.tsx:19–28,173–175`, `admin-tryout-detail.tsx:24–31,150–151`; `apps/api/src/services/admin-tryout.service.ts:28–35,84–90,173–179`.
- Perbaikan: gunakan DTO shared, hitung durasi total dari section, dan samakan definisi/count Tryout dengan katalog peserta. Field tahun target dari form juga belum disimpan oleh service.

### 11. Validasi request Tryout dan pagination admin belum diterapkan secara konsisten

**Bukti: runtime + kode.** PUT section QA dengan `durationSeconds: -60` diterima HTTP 200. `/api/admin/users?page=-1&limit=0` mendapat HTTP 200 dengan `pageCount: null`.

- Lokasi: `apps/api/src/handlers/tryout.handler.ts:89–99`, `services/admin-tryout.service.ts:183–225,257–284,305–345`; `handlers/users.handler.ts:118–119`, `analytics.handler.ts:10–11`, `audit.handler.ts:11–12`.
- Perbaikan: parse input unknown dengan schema shared yang tersedia (`packages/shared/src/questions.ts:116–123`); validasi page/limit sebagai integer positif dengan batas atas. Payload malformed harus mendapat 400, bukan nilai negatif/NaN atau 500.

### 12. Pencarian email dan informasi login user belum bekerja

**Bukti: runtime + kode.** Mencari email tepat milik user yang ada menghasilkan total 0. Akun QA yang baru signup/login tetap memiliki `lastLoginAt: null`.

- Lokasi: `apps/api/src/handlers/users.handler.ts:128–130`; `apps/api/src/lib/auth.ts:29–30`; frontend `apps/web/src/app/admin/admin-users.tsx:414,467,1079–1080`.
- Penyebab: pencarian hanya `like(name)`; `lastLoginAt`/`failedLoginAttempts` didefinisikan tetapi tidak diperbarui pada alur autentikasi. Timeline activity hanya mengirim attempt latihan.
- Perbaikan: pencarian case-insensitive nama/email; perbarui metadata login melalui hook autentikasi. Jangan menyebut jumlah sesi aktif sebagai riwayat login.

### 13. Reset progres tidak membersihkan sesi Tryout

**Bukti: kode.** Reset single/bulk hanya menghapus practice answers/attempts; `tryout_sessions` tidak disentuh.

- Lokasi: `apps/api/src/handlers/users.handler.ts:666–683,780–793`.
- Dampak: draft/sesi/hasil Tryout masih ada setelah aksi yang disebut mereset semua progres latihan.
- Perbaikan: tetapkan cakupan reset, bersihkan progres terkait dalam transaksi, dan sesuaikan copy konfirmasi. Kosakata tersimpan perlu keputusan retensi tersendiri.

### 14. Paginasi Analytics dan Log Aktivitas selalu di-reset ke halaman 1

**Bukti: runtime + kode.** Klik “Berikutnya” di Analytics menghasilkan `/admin/analytics?page=1`, tetap “Halaman 1 dari 7”. Fungsi filter audit juga selalu menulis page 1 saat menerima perubahan page.

- Lokasi: `apps/web/src/app/admin/admin-analytics.tsx:70–76`, `admin-audit-log.tsx:147–152,295–307`.
- Perbaikan: reset page hanya ketika filter berubah, bukan ketika key yang diubah adalah `page`; perubahan subtes Analytics juga perlu mengembalikan page ke awal.

### 15. Edit biasa dapat mengubah wacana terhubung menjadi salinan tersembunyi

**Bukti: kode.** GET detail mengisi `passage` dengan teks sumber yang sudah di-resolve. Form menginisialisasi state dari nilai itu dan mengirim `passage` serta `passageId` sekaligus. Resolver mengutamakan teks lokal sehingga perubahan sumber selanjutnya tidak terlihat.

- Lokasi: `apps/api/src/services/question.service.ts:299–315`, `apps/web/src/app/admin/question-form.tsx:57–58,145–146`, `apps/web/src/lib/question-export.ts:18–19`.
- Dampak tambahan: penghapusan soal sumber menghapus referensi melalui FK set-null; soal dependent yang hanya menyimpan referensi kehilangan wacananya.
- Perbaikan: pisahkan teks tersimpan dan teks resolved pada DTO; kirim teks lokal kosong saat reuse. Lindungi/copy-on-delete sumber yang masih direferensikan dan validasi target referensi di backend.

### 16. Form Ekspor dan detail user terpotong pada mobile; navigasi terlalu padat

**Bukti: runtime + kode.** Pada 390 px, main Ekspor memiliki clientWidth 384 dan scrollWidth 417 dengan overflow-x hidden; tombol kartu mencapai x=416,5. Detail user juga menghasilkan scrollWidth 438. Sepuluh menu bottom navigation berdesakan pada satu baris.

- Lokasi: `apps/web/src/app/admin/admin-export.tsx:163–206,222–254`, `admin-users.tsx` (header/detail), `admin-layout.tsx:99`; `components/ui/dashboard-shell.tsx:149–163`.
- Perbaikan: `min-w-0` pada anak grid/flex, stack label/control di mobile, wrap header detail. Kurangi item navigasi bawah atau gunakan menu sidebar untuk daftar lengkap.
- Bukti visual lokal: `.playwright-mcp/admin-audit-export-mobile.png`.

### 17. Label form dan kontrol keyboard belum konsisten; User memakai native confirm

**Bukti: runtime + kode.** Input nama/deskripsi/tahun dalam modal Tryout tidak mempunyai associated label atau aria-label. Form Ekspor juga tidak menghubungkan label dengan input/select. Tombol hapus pada kartu Tryout tidak bernama; kartu Lexicon interaktif memakai div onClick.

- Lokasi: `apps/web/src/app/admin/admin-tryouts.tsx:181–188,209–244`, `admin-export.tsx:223–254`, `admin-reports.tsx:162–181`, `question-preview.tsx:87–90`.
- User masih memakai `confirm()` untuk reset/hapus single/bulk: `apps/web/src/app/admin/admin-users.tsx:244–268,524`; disable lint terdapat di `:1`.
- Perbaikan: id/htmlFor atau aria-labelledby, aria-label untuk icon-only buttons, button semantik untuk kartu/toggle, serta ConfirmDialog shared untuk aksi destruktif.

### 18. Kegagalan memuat Afirmasi disajikan sebagai daftar kosong

**Bukti: runtime + kode.** Respons 500 yang disimulasikan di browser menampilkan “0 pesan / Belum ada pesan afirmasi”, tanpa error atau retry.

- Lokasi: `apps/web/src/app/admin/admin-affirmations.tsx:26–35,139–144`.
- Perbaikan: bedakan error dari empty state dan berikan aksi coba lagi. Daftar juga mencakup afirmasi nonaktif meskipun judul menyebut seluruhnya aktif; gunakan label/status yang sesuai data.

### 19. Identitas pelapor selalu jatuh ke label generik

**Bukti: runtime + kode.** Semua 14 laporan lokal mempunyai data userName dari API, tetapi tidak mempunyai userEmail. UI membaca userEmail saja sehingga menampilkan “Peserta”.

- Lokasi: `apps/api/src/services/system.service.ts:174–175`, `apps/web/src/app/admin/admin-reports.tsx:158–159`.
- Perbaikan: pakai DTO laporan shared dan tampilkan userName, atau tambahkan email ke kontrak bila memang diperlukan untuk alur tindak lanjut.

### 20. CSV detail user tidak melakukan escaping field

**Bukti: kode.** Nama/email dimasukkan langsung ke CSV melalui interpolasi. Koma, quote, atau newline merusak struktur; nama yang diawali formula berpotensi dievaluasi ketika berkas dibuka di spreadsheet.

- Lokasi: `apps/api/src/handlers/users.handler.ts:851–865`.
- Perbaikan: escape CSV dengan quote ganda dan penanganan newline/koma; netralkan prefix formula untuk string dari pengguna. Terapkan aturan sama pada endpoint Ekspor yang akan dibuat.

## Catatan tambahan untuk follow-up

- Bank soal/pratinjau/edit/export JSON masih menggunakan kontrak pilihan ganda lama; field stimulus/tipe/statements dari soal rich Tryout tidak dibaca oleh `getQuestionDetail` (`question.service.ts:275–292`). `QuestionPreview` merender opsi A–E sendiri (`question-preview.tsx:62–75`). Perlu menyatukan renderer/DTO sebelum menjadikan Bank soal sebagai editor semua tipe soal.
- Duplikasi paket melalui API tidak menyalin passage, annotations, questionType, stimulus, statements, section, atau pin (`package.service.ts:346–390`). Belum ada caller frontend duplikasi yang ditemukan; uji round-trip konten rich ketika endpoint ini digunakan.
- Sistem mengukur endpoint HTTP secara nyata, tetapi versi `1.0.0` di-hardcode (`admin-system-health.tsx:144`); latency `/api/me` adalah latency endpoint/sesi, bukan pengukuran query database terpisah. Jangan menyajikan versi hardcoded sebagai versi deployment aktual.
- Status/filter/overview User menggunakan beberapa definisi berbeda (misalnya total hanya role user, sementara jumlah nonaktif mencakup semua role). Selaraskan definisi dan zona waktu WIB dengan helper progres yang ada.

## Hal yang terverifikasi bekerja pada smoke test

- Kesepuluh route menu utama bisa dibuka dengan akun admin; guard learner yang membuka admin menampilkan “Halaman tidak ditemukan”. Guard role backend dan pemeriksaan Origin operasi tulis ada di `app.ts:85–105`.
- Ringkasan, katalog subtes/paket, Bank soal, tambah/edit/pratinjau soal, dan impor umum terbuka tanpa error halaman pada sampel yang diperiksa.
- Impor umum memakai shared schema, batas byte 200.000, validasi paket/subtes, dan transaksi (`question.service.ts:179–268`); masalah impor Tryout adalah alur berbeda.
- Daftar laporan, user, dan Analytics memakai pembungkus scroll horizontal untuk tabel; overflow tabel tersebut tidak disamakan dengan clipping form Ekspor.
- Modal Tryout menggunakan AppDialog dan dapat ditutup dengan Escape pada pengujian; asosiasi label tetap perlu diperbaiki.

## Urutan perbaikan yang disarankan

1. Terapkan penonaktifan akun dan lindungi retensi sesi/histori.
2. Perbaiki kontrak route impor/hapus Tryout dan FK lintas subtes; jadikan section/pin otoritatif.
3. Perbaiki agregasi Analytics dan progres User; gunakan helper shared sebagai sumber definisi.
4. Implementasikan Ekspor dan pencatatan audit; perbaiki paginasi.
5. Perbaiki reuse wacana, validasi input, failure state, label/keyboard, dan layout mobile.

Setelah implementasi API/database, jalankan tes terarah, `bun run check`, dan integration test untuk alur yang berubah. Audit ini tidak mengubah implementasi aplikasi.
