# Latveria

Situs belajar dan latihan untuk persiapan UTBK, dengan pembahasan soal dan perkembangan berbasis EXP. Bahasa antarmuka utama: Bahasa Indonesia.

## Status pengembangan

Tersedia: monorepo pnpm dengan aplikasi Next.js di `apps/web`, landing page, dashboard peserta, akun lokal, latsol per topik dengan hasil/pembahasan dan riwayat, halaman admin untuk memasukkan soal, serta PostgreSQL lewat Docker Compose. EXP belum diimplementasikan.

PostgreSQL melalui Supabase disetujui untuk tahap lanjutan, tetapi saat ini pengembangan menggunakan PostgreSQL lokal. Koneksi Supabase belum diverifikasi. Build serta landing page tidak memerlukan database; halaman login, dashboard, dan admin memerlukannya.

## Menjalankan aplikasi

Gunakan Node.js 22 (minimal 22.12) dan pnpm 11.24.0 sesuai `package.json`. Jika memakai nvm, jalankan `nvm use`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Buka `http://localhost:3000`. Landing page dapat dibuka tanpa `.env.local`. Jalankan perintah dari akar repositori; untuk aplikasi web saja gunakan `pnpm --filter @latveria/web <perintah>`.

## PostgreSQL dan Adminer lokal

```sh
docker compose up -d --wait
cp apps/web/.env.example apps/web/.env.local
# Isi BETTER_AUTH_SECRET di apps/web/.env.local dengan hasil: openssl rand -base64 32
pnpm db:migrate
pnpm db:seed
pnpm dev
```

`pnpm db:seed` menambah tujuh subtes UTBK-SNBT dan empat belas soal dummy (dua per subtes); aman dijalankan ulang tanpa menggandakan data. Empat topik dummy lama diperbarui namanya **tanpa mengubah ID**, sehingga riwayat dan soal admin tetap terhubung. Nama dan kelompok subtes mengikuti bagian [Materi Tes SNPMB 2026](https://snpmb.id/utbk-snbt/informasi-umum); soal tetap contoh buatan lokal, bukan soal atau simulasi resmi. Tinjau lagi struktur ujian saat berganti tahun. PostgreSQL tersedia di `127.0.0.1:5433` dengan volume persisten. Jalankan `docker compose down` untuk menghentikan container tanpa menghapus data. Jangan gunakan `down -v` kecuali memang ingin menghapus database lokal.

Konten soal mendukung LaTeX melalui KaTeX. Gunakan `$x^2$` untuk rumus inline dan `$$\frac{1}{2}$$` untuk rumus blok pada pertanyaan, opsi, atau pembahasan. Source disimpan sebagai teks; HTML tidak dieksekusi dan sintaks LaTeX yang salah ditampilkan sebagai teks bertanda.

Adminer tersedia di `http://127.0.0.1:8080`. Pilih **PostgreSQL**, server **postgres**, pengguna **latveria**, kata sandi **latveria**, database **latveria**. Kredensial ini hanya untuk pengembangan lokal; Compose tidak digunakan di produksi.

### Akun dan otorisasi

Daftarkan akun di `http://localhost:3000/login` saat `pnpm dev` berjalan. Pendaftaran melalui email/kata sandi hanya aktif di lingkungan pengembangan; server menetapkan role `user` sendiri. Setelah akun dibuat, promosikan akun lokal yang dipilih menjadi admin:

```sh
pnpm db:admin email@contoh.test
```

Lalu masuk kembali jika perlu dan buka `/admin`; hanya admin yang dapat membaca halaman dan menjalankan aksi penyimpanannya. Ringkasan, daftar soal, dan formulir tambah soal memakai route terpisah. `/dashboard` memerlukan sesi masuk; pengguna memilih topik di `/dashboard/topik`, mengerjakan latsol, lalu membuka hasil/pembahasan dan riwayat. Tombol keluar mencabut sesi. Tidak ada akun admin atau kata sandi default yang di-seed.

Autentikasi memakai Better Auth dengan sesi di PostgreSQL lokal. `BETTER_AUTH_SECRET` minimal 32 karakter dan `BETTER_AUTH_URL` wajib diatur. Untuk deployment, gunakan secret dan URL baru; pendaftaran produksi tetap tertutup sampai verifikasi email/onboarding ditentukan. Kredensial database dan secret tidak boleh disimpan di Git.

## Menghubungkan Supabase

1. Buat proyek Supabase untuk pengembangan, terpisah dari produksi.
2. Ganti URL dalam `apps/web/.env.local` dengan nilai dari menu **Connect** proyek Supabase:
   - `DATABASE_URL`: URL PostgreSQL **Transaction pooler** untuk aplikasi.
   - `DATABASE_MIGRATION_URL`: URL **Direct connection** atau **Session pooler** untuk migrasi. Gunakan Session pooler bila koneksi langsung terkendala IPv6.
3. Gunakan string koneksi dan pengaturan SSL dari Supabase. Isi kata sandi database dengan pengodean URL jika mengandung karakter khusus. Jangan menempelkan rahasia ke percakapan atau Git.
4. Jalankan `pnpm db:check` untuk menguji koneksi aplikasi tanpa mengubah data.
5. Tinjau SQL dalam `apps/web/drizzle/`, lalu jalankan `pnpm db:migrate` untuk menerapkannya ke database pengembangan.

Autentikasi saat ini menggunakan Better Auth dengan tabel di PostgreSQL, bukan Supabase Auth. Penggunaan Supabase sebagai database produksi memerlukan migrasi dan pengaturan auth/hosting lebih lanjut.

Tabel topik, soal, pengguna, akun, dan sesi mengaktifkan RLS tanpa kebijakan akses publik. Akses dilakukan oleh server melalui koneksi PostgreSQL; pemeriksaan sesi dan role tetap wajib di server karena koneksi ini dapat melewati RLS.

## Perintah pemeriksaan

```sh
pnpm check                       # lint → tipe → pengujian → build
pnpm test src/lib/env.test.ts     # pengujian validasi konfigurasi di apps/web
pnpm db:generate                 # buat SQL dari perubahan skema, tanpa koneksi DB
pnpm db:check                    # uji koneksi DB; memerlukan DATABASE_URL
pnpm db:migrate                  # terapkan SQL; memerlukan DATABASE_MIGRATION_URL
pnpm db:seed                     # sisipkan tujuh subtes dan empat belas soal dummy secara idempoten
pnpm db:admin email@contoh.test  # promosikan akun yang sudah terdaftar di database lokal
pnpm start                      # jalankan hasil pnpm build
```

Pengujian otomatis mencakup URL PostgreSQL dan penolakan akses tanpa sesi/role admin. Migrasi, seed, autentikasi, dan halaman admin telah diuji pada PostgreSQL lokal; ini tidak membuktikan koneksi Supabase berhasil.

`pnpm-workspace.yaml` mendefinisikan paket di `apps/*` dan menyimpan izin skrip dependensi native serta pengecualian usia rilis yang dibuat pnpm. ESLint memakai versi 9 karena plugin React, import, dan aksesibilitas yang digunakan belum mendeklarasikan dukungan versi 10; tinjau pembaruan bersama kompatibilitas plugin.

## Dokumen produk

- `PLAN.md`: cakupan dan tahapan pengembangan.
- `ARCHITECTURE.md`: pilihan teknologi, rancangan data, dan alur sistem.
- `AGENTS.md`: panduan singkat bagi sesi pengembangan berikutnya.
