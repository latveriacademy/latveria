# Latveria

Platform latihan UTBK-SNBT berbahasa Indonesia. Frontend **React + Vite + Tailwind + shadcn/ui**, backend **Hono**, kontrak **Zod** yang dibagikan di monorepo Bun. PostgreSQL, Drizzle, Better Auth, KaTeX, Lucide, dan animasi GSAP tetap digunakan.

## Struktur

- `apps/web`: SPA React, React Router, komponen UI, dan renderer LaTeX. Tidak mengimpor database atau secret server.
- `apps/api`: server Hono Node.js, autentikasi, pemeriksaan role/ownership, SQL, migrasi, seed, dan CLI admin.
- `packages/shared`: skema Zod request, tipe response API, serta nama tujuh subtes SNPMB. Tidak mengimpor backend.

Tersedia: landing page, akun lokal, dashboard peserta, latsol satu-soal dengan navigator desktop/mobile, hasil dan riwayat, serta bank soal admin dengan tab subtes, kategori, paginasi, dan pratinjau. EXP belum dibuat.

## Pengembangan lokal

Node.js 22 (minimal 22.12), Bun 1.3.14, Docker Compose. Bun mengelola dependensi dan script; Node tetap menjalankan Vite, Vitest, dan Hono melalui CLI masing-masing. Versi Bun tercatat di `.bun-version`, workspace didefinisikan di `package.json`, dan lockfile tunggal adalah `bun.lock`.

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

Admin hanya memakai `/admin`; peserta memakai `/dashboard`. API memeriksa role, bukan hanya router frontend. Input role klien tidak boleh membuat admin. Hasil attempt hanya dapat dibaca pemilik, dan kunci/pembahasan tidak dikirim pada endpoint soal aktif. Request perubahan data harus memiliki Origin yang cocok dengan `BETTER_AUTH_URL`.

## Database

PostgreSQL lokal: `127.0.0.1:5433`, volume persisten. Adminer: `http://127.0.0.1:8080` (PostgreSQL, server `postgres`, user/password/database `latveria`). Kredensial ini untuk lokal saja. `docker compose down` menghentikan service tanpa menghapus volume; `down -v` menghapus data.

Seed idempoten menyediakan tujuh subtes SNPMB 2026 dan 14 soal dummy. Empat slug topik lama dipindahkan tanpa mengganti ID sehingga riwayat dan soal admin tetap terhubung. Nama subtes mengikuti [Materi Tes SNPMB 2026](https://snpmb.id/utbk-snbt/informasi-umum); soal bukan konten resmi. Supabase PostgreSQL tetap bisa dipakai dengan mengganti URL koneksi, tetapi belum diverifikasi.

KaTeX mendukung `$x^2$` inline dan `$$\frac{1}{2}$$` blok. Simpan source teks, bukan HTML. Renderer `trust: false` dan formula tidak valid fallback ke source. Rendering kini berlangsung di React, bukan Server Components.

## Pemeriksaan

```sh
bun run check                       # lint → semua tipe → semua tes → build
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

```sh
bun run build
bun run start
```

Frontend dibangun ke `apps/web/dist`. Hono produksi melayani API **dan** file SPA tersebut pada port 3000 (override `PORT` jika diperlukan), termasuk fallback untuk deep link React Router. Backend TypeScript dijalankan dengan `tsx`; skrip build backend memeriksa tipe, bukan menghasilkan bundle tambahan. Atur `BETTER_AUTH_URL` ke origin publik dan secret produksi berbeda. Tidak ada migrasi otomatis saat build/start.

Model hosting sekarang membutuhkan proses Node untuk Hono dan origin yang sama untuk cookie/API. Gunakan reverse proxy HTTPS pada deployment; bukan lagi deployment Next.js/Vercel otomatis. Database dev dan produksi tetap dipisah.
