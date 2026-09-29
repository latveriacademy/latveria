# Latveria

Situs belajar dan latihan untuk persiapan UTBK, dengan pembahasan soal dan perkembangan berbasis EXP. Bahasa antarmuka utama: Bahasa Indonesia.

## Status P0 — fondasi proyek

Tersedia: monorepo pnpm dengan aplikasi Next.js App Router di `apps/web`, TypeScript strict, Tailwind CSS, landing page, koneksi PostgreSQL khusus server melalui Drizzle, migrasi tabel topik dengan RLS, dan pemeriksaan otomatis. Akun, soal, latihan, dan EXP belum diimplementasikan.

PostgreSQL melalui Supabase sudah disetujui. Proyek Supabase perlu disiapkan dan koneksinya diverifikasi sebelum migrasi diterapkan; build aplikasi tidak memerlukan database.

## Menjalankan aplikasi

Gunakan Node.js 22 (minimal 22.12) dan pnpm 11.24.0 sesuai `package.json`. Jika memakai nvm, jalankan `nvm use`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Buka `http://localhost:3000`. Landing page dapat dibuka tanpa `.env.local`. Jalankan perintah dari akar repositori; untuk aplikasi web saja gunakan `pnpm --filter @latveria/web <perintah>`. Saat ini baru ada satu paket aplikasi; paket lain dapat ditambahkan jika benar-benar dibutuhkan.

## Menghubungkan Supabase

1. Buat proyek Supabase untuk pengembangan, terpisah dari produksi.
2. Salin `apps/web/.env.example` menjadi `apps/web/.env.local` dan isi nilai dari menu **Connect** proyek Supabase:
   - `DATABASE_URL`: URL PostgreSQL **Transaction pooler** untuk aplikasi.
   - `DATABASE_MIGRATION_URL`: URL **Direct connection** atau **Session pooler** untuk migrasi. Gunakan Session pooler bila koneksi langsung terkendala IPv6.
3. Gunakan string koneksi dan pengaturan SSL dari Supabase. Isi kata sandi database dengan pengodean URL jika mengandung karakter khusus. Jangan menempelkan rahasia ke percakapan atau Git.
4. Jalankan `pnpm db:check` untuk menguji koneksi aplikasi tanpa mengubah data.
5. Tinjau SQL dalam `apps/web/drizzle/`, lalu jalankan `pnpm db:migrate` untuk menerapkannya ke database pengembangan.

Kolom `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` disediakan untuk tahap autentikasi berikutnya; belum diperlukan pada P0. Kunci `service_role` tidak diperlukan.

Tabel `topics` mengaktifkan RLS tanpa kebijakan akses publik. Akses dilakukan oleh server melalui koneksi PostgreSQL; fitur berikutnya tetap harus memeriksa pengguna dan kepemilikan data di server.

## Perintah pemeriksaan

```sh
pnpm check                       # lint → tipe → pengujian → build
pnpm test src/lib/env.test.ts     # pengujian validasi konfigurasi di apps/web
pnpm db:generate                 # buat SQL dari perubahan skema, tanpa koneksi DB
pnpm db:check                    # uji koneksi DB; memerlukan DATABASE_URL
pnpm db:migrate                  # terapkan SQL; memerlukan DATABASE_MIGRATION_URL
pnpm start                      # jalankan hasil pnpm build
```

Pengujian saat ini memeriksa URL PostgreSQL, pemisahan koneksi aplikasi/migrasi, dan pesan kesalahan tanpa kredensial. Pengujian ini tidak membuktikan koneksi atau migrasi berhasil pada Supabase.

`pnpm-workspace.yaml` mendefinisikan paket di `apps/*` dan menyimpan izin skrip dependensi native serta pengecualian usia rilis yang dibuat pnpm. ESLint memakai versi 9 karena plugin React, import, dan aksesibilitas yang digunakan belum mendeklarasikan dukungan versi 10; tinjau pembaruan bersama kompatibilitas plugin.

## Dokumen produk

- `PLAN.md`: cakupan dan tahapan pengembangan.
- `ARCHITECTURE.md`: pilihan teknologi, rancangan data, dan alur sistem.
- `AGENTS.md`: panduan singkat bagi sesi pengembangan berikutnya.
