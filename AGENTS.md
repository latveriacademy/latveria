# Panduan proyek Latveria

Panduan ini berlaku untuk pengembang dan agen yang bekerja di repositori **latveriacademy**.
Baca `PLAN.md` untuk arah produk dan `ARCHITECTURE.md` untuk keputusan teknis.

## Produk dan batas MVP

- Produk ini adalah platform latihan UTBK-SNBT Indonesia.
- EXP dan skor resmi UTBK adalah dua konsep terpisah. Jangan menyajikan EXP atau persentase jawaban benar sebagai skor resmi UTBK.
- Warrior Battle menyediakan PvP 1v1/2v2; leaderboard latihan juga tersedia. Ranked PvP/Elo, musim, jenjang kompetitif, dan lencana belum menjadi sistem kompetitif aktif.

## Identitas dan desain antarmuka

- Gunakan nama **latveriacademy** dan logo `apps/web/src/assets/latveria.webp`.
- Dashboard, login, dan admin memakai tema hijau gelap/emas serta perkamen. Landing memakai aksen hijau, bukan emas.
- Gunakan komponen bersama di `apps/web/src/components/ui/dashboard.tsx` dan `dashboard-shell.tsx` agar tampilan peserta dan admin konsisten.
- Hindari copy dekoratif, telemetry palsu, jargon institusional, eyebrow hiasan, watermark, dan pola visual generik.
- Pertahankan label tindakan, bantuan form, legenda status, dan pesan validasi yang berguna.
- Peserta yang membuka route admin melihat **Halaman tidak ditemukan**, tanpa penjelasan tentang kebutuhan role admin.

## Arsitektur dan batas paket

| Lokasi            | Isi dan tanggung jawab                                                     |
| ----------------- | -------------------------------------------------------------------------- |
| `apps/web`        | React/Vite SPA, React Router, Tailwind, shadcn/ui, dan renderer matematika |
| `apps/api`        | Hono di Bun, Better Auth, Drizzle, database, migrasi, dan CLI          |
| `packages/shared` | Skema request Zod, tipe API, dan katalog subtes UTBK                       |

Frontend dan shared tidak boleh mengimpor database atau secret server.
Validasi input di backend tetap wajib, meskipun frontend sudah memvalidasinya.

## Tooling dan perintah kerja

Gunakan **Bun 1.3.14** dan **Node.js 22, minimal 22.12**.
Bun adalah package manager, task runner, dan runtime backend. Vite development memakai Node.js agar proxy WebSocket berfungsi; jangan memaksanya memakai `--bun` pada Bun 1.3.14.

| Perintah                        | Kegunaan                                                                          |
| ------------------------------- | --------------------------------------------------------------------------------- |
| `bun install --frozen-lockfile` | Memasang dependensi sesuai lockfile                                               |
| `docker compose up -d --wait`   | Menjalankan PostgreSQL di port 5433 dan Adminer di port 8080                      |
| `bun run dev`                   | Menjalankan web di port 3000 dan API di port 3001                                 |
| `bun run db:migrate`            | Menerapkan migrasi database                                                       |
| `bun run db:seed`               | Mengisi katalog dan soal contoh secara idempoten                                  |
| `bun run db:generate`           | Membuat migrasi secara luring                                                     |
| `bun run db:admin <email>`      | Menjadikan akun lokal sebagai admin; hanya untuk DB localhost                     |
| `bun run test`                  | Menjalankan tes Vitest                                                            |
| `bun run test:integration`      | Menguji backend lokal; membutuhkan migrasi/seed dan membersihkan data tes sendiri |
| `bun run check`                 | Menjalankan lint → typecheck semua paket → tes → build                            |
| `bun run start`                 | Menjalankan backend produksi melalui Bun dan melayani SPA dist                    |

Contoh tes terarah:

```sh
bun run --filter @latveria/web test src/components/math/math-text.test.tsx
bun run --filter @latveria/api test src/lib/env.test.ts
```

- Gunakan `bun run test`, bukan runner `bun test`.
- Definisi workspace ada di `package.json`. Gunakan hanya `bun.lock` sebagai lockfile.
- `bunfig.toml` menggunakan isolated linker dan tidak memasang peer framework opsional.
- Script dependensi native yang dipercaya tercatat di `trustedDependencies`.
- Jangan memaksa CLI Node memakai `--bun` tanpa memverifikasi kompatibilitas runtime.
- Proyek sudah memakai Vite; tidak ada Next typegen.

## Environment, database, dan keamanan

### Environment dan deployment

- Simpan env hanya di `apps/api/.env.local`; lihat `apps/api/.env.example`.
- `BETTER_AUTH_URL` menunjuk origin frontend, bukan port API internal.
- Saat development, Vite meneruskan `/api` ke backend. Saat produksi, Hono melayani `apps/web/dist` dan API pada satu origin.
- Saat memindahkan env lama dari Next ke Vite, pertahankan secret jika sesi lama perlu tetap valid.

### Database

- Migrasi berada di `apps/api/drizzle`. Jangan reset database atau membuat ulang baseline migrasi.
- Migrasi tidak berjalan otomatis saat build atau start.
- Bun memuat `apps/api/.env.local` otomatis saat menjalankan CLI dari workspace API.
- Seed mengisi tujuh subtes SNPMB 2026 dan soal dummy secara idempoten, termasuk contoh geometri.
- Empat slug topik lama dipindahkan dengan ID tetap agar riwayat dan soal admin tetap terhubung.
- Acuan nama subtes: https://snpmb.id/utbk-snbt/informasi-umum.

### Autentikasi dan otorisasi

- Signup Better Auth hanya aktif pada backend development.
- Role akun baru adalah `user`; input role dari client ditolak.
- Middleware API mewajibkan sesi dan memisahkan akses `/api/learner/*` dari `/api/admin/*`.
- Operasi tulis memeriksa header `Origin`.
- Router frontend bukan batas keamanan. Backend tetap memeriksa role dan kepemilikan data.
- Tabel dengan RLS tidak memiliki akses publik; koneksi server dapat melewati RLS.

## Aturan fitur

### Profil peserta

- Baca dan simpan melalui `GET/PUT /api/learner/profile` dengan `profileSchema` shared.
- Nama, panggilan, target PTN, bio, dan motto disimpan di database.
- ID, email, dan role bukan field yang bisa diedit.
- Foto profil diunggah melalui API avatar ke object storage; ikon pengguna menjadi fallback jika foto belum tersedia.
- Jangan menyimpan perubahan profil hanya di localStorage.

### Bank soal dan impor admin

- Soal hanya bisa diedit atau dihapus sebelum memiliki jawaban peserta.
- Update API mengunci baris dan memeriksa penggunaan soal di dalam transaksi.
- Tambah soal dan impor diakses dari tombol Bank soal, bukan menu sidebar.
- Impor menerima file JSON maupun JSON yang ditempel ke editor, dengan ringkasan sebelum submit.
- Gunakan `questionImportSchema` shared. Batasnya **100 soal dan 200 KB** per impor.
- Backend memvalidasi ulang dan menyisipkan seluruh batch secara atomik.
- `correctAnswer` memakai indeks 0–4 (lima opsi A–E).

### Manajemen user admin

- Akses via `/admin/users` untuk admin yang login.
- Statistik overview menampilkan: total user, aktif hari ini, baru minggu ini, rata-rata akurasi, dan jumlah dinonaktifkan.
- Daftar user dengan filter: pencarian nama/email, tipe (demo/normal), status (aktif/nonaktif), dan sorting (terbaru, nama, login terakhir).
- Bulk actions: select semua/pilih, tampilkan/sembunyikan dari leaderboard, aktifkan/nonaktifkan, hapus massal.
- Detail user dengan tab:
  - **Overview**: level, XP, akurasi, streak, weekly activity chart, weak areas, favorite topics, subtest stats.
  - **Aktivitas**: riwayat login, laporan soal, statistik sesi.
  - **Keamanan**: role admin/user, aktifkan/nonaktifkan akun, reset progres, hapus akun permanen.
- Catatan admin per user untuk menyimpan informasi tambahan.
- Export data user ke JSON/CSV.

**Endpoint baru:**
| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/api/admin/users/stats/overview` | GET | Statistik global platform |
| `/api/admin/users` | GET | Daftar user dengan filter/sort |
| `/api/admin/users/:id` | GET | Detail user dengan statistik lengkap |
| `/api/admin/users/:id/activity` | GET | Timeline aktivitas user |
| `/api/admin/users/:id/flags` | PUT | Toggle demo/hide flags |
| `/api/admin/users/:id/role` | PUT | Ubah role user/admin |
| `/api/admin/users/:id/notes` | PUT | Update catatan admin |
| `/api/admin/users/:id/deactivate` | POST | Aktifkan/nonaktifkan akun |
| `/api/admin/users/:id/reset` | POST | Reset semua progres latihan |
| `/api/admin/users/:id` | DELETE | Hapus user permanen |
| `/api/admin/users/:id/export` | GET | Export data (JSON/CSV) |
| `/api/admin/users/bulk-action` | POST | Aksi massal |

**Field database baru:**
- `is_deactivated` - Status akun dinonaktifkan
- `deactivated_at` - Timestamp penonaktifan
- `account_notes` - Catatan admin
- `last_login_at` - Timestamp login terakhir
- `failed_login_attempts` - Counter percobaan login gagal

### Latihan, hasil, dan riwayat

- Latihan menampilkan satu soal per layar. Draft jawaban terhubung ke questionId dan boleh diubah, dilewati, atau dipilih ulang sampai submit.
- Endpoint soal aktif tidak mengirim kunci atau pembahasan. Indikator benar/salah hanya muncul saat review.
- Hasil hanya boleh dibaca pemilik attempt.
- Navigator desktop berada sticky di kanan; mobile memakai dialog pemilih soal.
- Tombol **Riwayat** berada di kanan header halaman Latihan. Riwayat dan hasil memakai `/api/learner/history` serta `/api/learner/results/:id`.
- Membuka kembali hasil dari riwayat adalah review baca-saja; jangan membuat attempt atau memberi EXP lagi.

### Rumus dan diagram geometri

- Gunakan `apps/web/src/components/math/math-text.tsx` untuk menampilkan sumber LaTeX: `$...$` inline dan `$$...$$` blok.
- KaTeX harus tetap memakai `trust: false`. Sintaks salah mempertahankan teks sumber.
- TikZ dasar memakai blok `\begin{tikzpicture} ... \end{tikzpicture}` tanpa pembungkus `$$`, lalu dirender sebagai SVG lokal.
- Sintaks diagram yang belum didukung menampilkan sumber beserta pesan yang jelas. Renderer ini React client, bukan Next Server Component.

## Konvensi kerja dan Git

- Kelompokkan file satu fitur/prefix dalam folder domain yang sudah tersedia, termasuk tes dan CSS terkait. Service API memakai `services/{warrior,tryout,latex,question,storage}`; komponen/helper frontend dan halaman admin mengikuti folder fiturnya. Import langsung ke modul yang diperlukan.

- AI agent dan developer wajib membuat atau memakai issue yang relevan **sebelum mengerjakan setiap fitur baru atau fix bug**, termasuk perubahan kecil. Cari issue yang sudah ada agar tidak membuat duplikat; tautkan Project jika token mengizinkan.
- Issue fitur mencantumkan tujuan, scope, dan kriteria selesai. Issue bug mencantumkan langkah reproduksi, perilaku aktual/yang diharapkan, serta rencana verifikasi.
- Tautkan commit/PR dengan `Refs #<nomor>`; hindari penutupan otomatis sebelum verifikasi CI selesai.
- Periksa `git status`, `git diff`, dan riwayat commit sebelum commit. Stage hanya perubahan yang memang ditargetkan.
- Jangan stage atau commit perubahan lokal pengguna yang berada di luar lingkup tugas.
- Jalankan pemeriksaan yang sesuai dengan perubahan. Gunakan `bun run check` untuk verifikasi penuh dan tes integrasi saat mengubah API/database.
- Setelah verifikasi lokal dan push, periksa semua workflow CI yang berjalan untuk **SHA commit yang baru dipush**, lalu tunggu hingga seluruh job wajib berhasil. Gunakan `gh run list --commit <sha>` dan `gh run watch <run-id> --exit-status`.
- Jika CI gagal, baca log job yang gagal, perbaiki penyebabnya, buat commit baru, push, dan periksa CI lagi. Jangan melewati atau menonaktifkan pemeriksaan untuk membuat CI hijau.
- Tutup issue hanya setelah perubahan dipush dan CI wajib berhasil; sertakan commit serta bukti verifikasi. Jika CI terblokir, biarkan issue terbuka dan laporkan blocker beserta URL run. Ringkasan akhir menyertakan status dan URL CI.
- Gunakan Playwright hanya ketika interaksi atau tampilan memang perlu diperiksa.
