# Latveria

Platform latihan UTBK-SNBT berbahasa Indonesia. Frontend **React + Vite + Tailwind + shadcn/ui**, backend **Hono**, kontrak **Zod** yang dibagikan di monorepo Bun. PostgreSQL, Drizzle, Better Auth, KaTeX, Lucide, dan animasi GSAP tetap digunakan.

## Struktur

- `apps/web`: SPA React, React Router, komponen UI, dan renderer LaTeX. Tidak mengimpor database atau secret server.
- `apps/api`: server Hono/Bun, autentikasi, pemeriksaan role/ownership, SQL, migrasi, seed, dan CLI admin.
- `packages/shared`: skema Zod request, tipe response API, serta nama tujuh subtes SNPMB. Tidak mengimpor backend.

Tersedia: landing page, akun lokal, dashboard peserta, latsol satu-soal dengan navigator desktop/mobile, hasil dan riwayat, EXP/level/streak dari latihan tersimpan, serta bank soal admin dengan tab subtes, kategori, paginasi, dan pratinjau.

Navigasi peserta memakai **Basecamp** (dashboard), **Drilling** (katalog paket latihan dengan pencarian, filter, dan paginasi), dan **Drill Log** (riwayat). **Battle World** membuka alur tryout pada `/dashboard?tab=tryout`, termasuk sesi lintas subtes dan jeda. **Library** diperuntukkan materi dan menampilkan empty state saat materi belum tersedia. Ketersediaan paket mengikuti data server.

Gambaran sistem, batas paket, runtime Bun, atomic design, GSAP, dan alur data dijelaskan di [ARCHITECTURE.md](ARCHITECTURE.md).

Aturan developer/AI agent, batas ukuran file dan commit, style, serta verifikasi ada di [CONTRIBUTING.md](CONTRIBUTING.md). ESLint memeriksa batas file; CI memeriksa format dan ukuran commit sejak aturan tersebut diadopsi.

Sidebar memakai kartu profil ringkas di bagian bawah; klik untuk membuka Profil/Setelan serta melihat level, EXP, dan streak. Pada mobile, Profil dan Setelan tetap tersedia langsung di navigasi bawah. Logout peserta/admin memakai penanganan pending/error yang sama.

## Pengembangan lokal

Bun 1.3.14 dan Docker Compose. Bun mengelola dependensi sekaligus menjadi runtime API, CLI database, Vite, Vitest, lint, typecheck, dan formatter. Script CLI memakai `bun run --bun` agar tidak mengikuti shebang Node. Node.js tidak perlu dipasang. Versi Bun tercatat di `.bun-version`, workspace didefinisikan di `package.json`, dan lockfile tunggal adalah `bun.lock`.

```sh
bun install --frozen-lockfile
docker compose up -d --wait
cp apps/api/.env.example apps/api/.env.local
# Isi BETTER_AUTH_SECRET dengan secret acak: openssl rand -base64 32
bun run db:migrate
bun run db:seed
bun run dev
```

`bun run dev` menjalankan frontend `http://localhost:3000` dan API `http://localhost:3001` bersamaan. Vite meneruskan `/api` ke Hono; browser memakai cookie pada origin yang sama. `BETTER_AUTH_URL` adalah URL frontend (`http://localhost:3000`), bukan URL API internal.

Pada migrasi dari versi Next.js, pindahkan **berkas lokal yang sudah ada** dari `apps/web/.env.local` ke `apps/api/.env.local`. Riwayat migrasi Drizzle kini berada di `apps/api/drizzle`, dengan ID dan SQL lama dipertahankan; database tidak perlu di-reset. Jangan menimpa secret lama jika ingin sesi lama tetap valid.

Landing page dapat dibuka tanpa server/database; route login/peserta/admin memerlukan API dan PostgreSQL. Akun bisa didaftarkan pada `/login` ketika backend development berjalan. Backend produksi menutup pendaftaran. Promosi admin lokal:

```sh
bun run db:admin email@contoh.test
```

Admin hanya memakai `/admin`; peserta memakai `/dashboard`. API memeriksa role, bukan hanya router frontend. Input role klien tidak boleh membuat admin. Hasil attempt hanya dapat dibaca pemilik, dan kunci/pembahasan tidak dikirim pada endpoint soal aktif. Request perubahan data harus memiliki Origin yang cocok dengan `BETTER_AUTH_URL` (atau `DEV_TUNNEL_ORIGIN` HTTPS yang ditetapkan eksplisit saat development).

### Mengelola soal

`/admin/soal` memiliki tab subtes, filter materi, paginasi, dan pratinjau soal. Checkbox dapat memilih baris atau seluruh halaman untuk hapus massal dengan konfirmasi; pilihan dibersihkan saat berpindah halaman/filter. Jika satu soal terpilih sudah dipakai peserta, seluruh penghapusan dibatalkan. Soal yang belum dipakai dapat diedit atau dihapus dari halaman pratinjau. Soal yang sudah memiliki jawaban peserta tidak boleh diedit/dihapus agar hasil lama tidak berubah.

Untuk banyak soal, buka **Impor JSON** di panel admin dan unggah `.json` (maksimal 200 KB / 100 soal). Contoh:

```json
{
  "groups": [
    {
      "subtes": "pengetahuan-kuantitatif",
      "category": "Perbandingan dan persentase",
      "questions": [
        {
          "prompt": "Berapakah $25\\%$ dari $80$?",
          "options": ["$10$", "$15$", "$20$", "$25$"],
          "correctAnswer": 2,
          "explanation": "$25\\% \\times 80 = 20$.",
          "source": "Soal buatan tim"
        }
      ]
    }
  ]
}
```

`correctAnswer` memakai indeks nol (`0` untuk opsi pertama). `subtes` memakai slug dari `packages/shared/src/utbk-subtests.ts`. Kategori bebas per grup. Seluruh batch divalidasi dengan Zod dan ditulis dalam satu transaksi; jika satu soal salah, tidak ada soal yang disimpan.

Paket dapat dikelola dari subtes pada Ringkasan admin. Impor mendukung `packageName` atau `packageId` pada setiap grup, atau memilih satu paket tujuan lewat form. Contoh sederhana/geometri dan unduhan JSON tersedia pada editor; panduan lengkap ada di [docs/impor-paket.md](docs/impor-paket.md).

## Database

### EXP, level, dan streak

- Satu latihan tersimpan menghasilkan **30 EXP + 15 EXP per jawaban benar**. Latihan baru boleh mendapat EXP lagi; retry pengumpulan sesi yang sama memakai `submissionId` UUID yang sama dan tidak membuat attempt kedua.
- Level mulai dari **1**. Naik ke level 2 membutuhkan **300 EXP**; kebutuhan setiap level berikutnya dikalikan **1,35** dan dibulatkan. Progress bar menunjukkan EXP di dalam level saat ini; header menunjukkan total EXP.
- Streak dihitung dari hari kalender **Asia/Jakarta (WIB)** saat latihan dikumpulkan. Beberapa latihan pada hari yang sama dihitung satu hari. Streak masih aktif bila terakhir latihan kemarin; setelah satu hari penuh terlewat, streak menjadi nol.
- Progres dihitung dari `practice_attempts`, termasuk latihan lama, lalu dikirim melalui summary, hasil, dan riwayat. Login, membaca pembahasan, checklist lokal, dan reset preferensi tidak memberikan atau menghapus EXP. EXP dan persentase benar bukan skor resmi UTBK.
- Draft jawaban masih hanya selama sesi terbuka. UUID sesi dibuat saat mulai latihan dan dipakai ulang saat retry, termasuk bila respons POST hilang setelah server menyimpan. Payload berbeda dengan UUID yang sama ditolak; membuka riwayat tetap baca-saja.

Migrasi `0007_wet_ma_gnuci.sql` menambah indeks peserta/tanggal untuk query progres; jalankan `bun run db:migrate` seperti biasa tanpa reset database.

Untuk update Library/tryout/leaderboard, terapkan juga migrasi berikutnya. `0010_hesitant_sheva_callister.sql` memperbaiki kolom leaderboard yang dapat terlewati akibat timestamp lama pada jurnal `0008`, mengisi tanggal jawaban dari attempt, dan menandai jawaban pertama per peserta/soal. Migrasi ini mendukung database lama maupun instalasi baru; database tidak perlu di-reset.

PostgreSQL lokal: `127.0.0.1:5433`, volume persisten. Adminer: `http://127.0.0.1:8080` (PostgreSQL, server `postgres`, user/password/database `latveria`). MinIO lokal (S3-compatible): API `http://127.0.0.1:9002`, Console `http://127.0.0.1:9003` (user: `latveria`, password: `latveria123`) dengan bucket otomatis `latveria-avatars`. Batasan ukuran foto profil disarankan 5 KB – 3 MB. Pada produksi, MinIO digantikan oleh Cloudflare R2 atau Amazon S3. Kredensial ini untuk lokal saja. `docker compose down` menghentikan service tanpa menghapus volume; `down -v` menghapus data.

Seed idempoten menyediakan tujuh subtes SNPMB 2026 dan 17 soal dummy UTBK, serta empat contoh soal materi tambahan. Empat slug topik lama dipindahkan tanpa mengganti ID sehingga riwayat dan soal admin tetap terhubung. Nama subtes mengikuti [Materi Tes SNPMB 2026](https://snpmb.id/utbk-snbt/informasi-umum); soal bukan konten resmi. Supabase PostgreSQL tetap bisa dipakai dengan mengganti URL koneksi, tetapi belum diverifikasi.

KaTeX mendukung `$x^2$` inline dan `$$\frac{1}{2}$$` blok. Simpan source teks, bukan HTML. Renderer `trust: false` dan formula tidak valid fallback ke source. Rendering kini berlangsung di React, bukan Server Components.

## Pemeriksaan

Formatter proyek adalah **oxfmt**. Aturan ada di `.oxfmtrc.json`: 2 spasi, lebar cetak 100, kutip ganda, titik koma, trailing comma, dan LF. Setelah mengubah kode, jalankan `bun run format`; CI memeriksa hasilnya melalui `bun run check`.

```sh
bun run format                      # format kode dan dokumentasi
bun run format:check                # periksa tanpa mengubah berkas
bun run check                       # format check → lint → semua tipe → semua tes → build
bun run --filter @latveria/web test src/components/math-text.test.tsx
bun run --filter @latveria/api test src/lib/env.test.ts
bun run test:integration            # API dan PostgreSQL lokal
bun run db:generate                 # SQL luring
bun run db:migrate                  # memakai DATABASE_MIGRATION_URL
bun run db:check                    # koneksi tanpa mengubah data
bun run db:seed
```

Gunakan `bun run test`, bukan `bun test`: proyek memakai Vitest, termasuk mocking API dan tes React. Tes integrasi memerlukan DB lokal yang sudah di-migrate/seed. Ia membuat akun, attempt, dan soal sementara lalu membersihkannya. Uji mencakup autentikasi, pemisahan role, kerahasiaan kunci, ownership, submit, filter kategori, pratinjau, proteksi penghapusan soal terpakai, dan pencabutan sesi.

## Build dan produksi

### Image Docker dan GitHub Actions

Frontend dan backend tersedia sebagai image terpisah di GHCR. `compose.production.yaml` menarik kedua image dan menjalankan PostgreSQL persisten; Nginx menyajikan SPA serta meneruskan `/api` ke backend. GitHub Actions memeriksa kode, integrasi database, dan smoke test container sebelum publish pada `main`/tag `v*`. Panduan env server, migrasi, pull/update, dan rollback ada di [deploy/README.md](deploy/README.md).

### Menjalankan langsung dengan Bun

```sh
bun run build
bun run start
```

Frontend dibangun ke `apps/web/dist`. Hono melalui `Bun.serve` melayani API **dan** file SPA tersebut pada port 3000 (override `PORT` jika diperlukan), termasuk fallback untuk deep link React Router. Bun menjalankan TypeScript backend langsung; skrip build backend memeriksa tipe, bukan menghasilkan bundle tambahan. Bun memuat `.env.local` otomatis dari direktori API untuk server/CLI lokal; container memakai environment runtime. Atur `BETTER_AUTH_URL` ke origin publik dan secret produksi berbeda. Tidak ada migrasi otomatis saat build/start.

Model hosting sekarang membutuhkan proses Bun untuk Hono dan origin yang sama untuk cookie/API. Gunakan reverse proxy HTTPS pada deployment; bukan lagi deployment Next.js/Vercel otomatis. Database dev dan produksi tetap dipisah.
