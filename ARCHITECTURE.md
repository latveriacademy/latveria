# Arsitektur Latveria

## Stack yang berjalan

| Bagian     | Teknologi                               | Tanggung jawab                                               |
| ---------- | --------------------------------------- | ------------------------------------------------------------ |
| Frontend   | React 19 + Vite + React Router          | Landing, dashboard peserta, latsol/review, dan panel admin   |
| UI         | Tailwind 4 + shadcn/ui (Radix) + Lucide | Komponen dengan palet perkamen/hijau                         |
| Backend    | Hono + Node.js 22                       | HTTP API, otorisasi, transaksi, dan file SPA produksi        |
| Validation | Zod di `@latveria/shared`               | Skema request yang sama di browser dan API                   |
| Akun       | Better Auth                             | Hash kata sandi, cookie sesi, penyimpanan sesi di PostgreSQL |
| Database   | PostgreSQL + Drizzle                    | Soal, kategori, pengguna, attempt, jawaban, migrasi          |
| Konten     | KaTeX                                   | LaTeX dengan trust false dan fallback source                 |

Soal mendukung diagram geometri melalui blok `\\begin{tikzpicture} ... \\end{tikzpicture}` yang dirender ke SVG lokal oleh `components/tikz-diagram.tsx`. Sintaks saat ini mencakup garis/poligon (`\\draw`/`\\fill`, `--`, `cycle`), rectangle, circle, ellipse, ketebalan/garis putus-putus, label `\\node at`, koordinat 2D/3D dengan proyeksi miring, dan deskripsi aksesibilitas `% alt:`. Label matematika memakai KaTeX `trust:false`. Parser dibatasi 4.000 karakter, 100 perintah, koordinat/ukuran −100…100; sintaks TikZ umum lain belum didukung dan ditampilkan sebagai teks sumber dengan pesan. Renderer yang sama digunakan di authoring preview, pratinjau admin, latihan, dan review.

Next.js dan Server Actions sudah diganti sepenuhnya. Komponen tampilan kini React biasa; operation yang dulu berada dalam page server/action kini endpoint Hono.

## Batas paket

### UI bersama

`apps/web/src/components/ui/dashboard.tsx` menampung elemen dashboard yang digunakan ulang di admin dan halaman peserta:

- `Brand`: logo dan nama latveriacademy dengan tujuan link.
- `PageHeading`: judul halaman, deskripsi opsional, dan area tindakan.
- `Panel` / `PanelHeader`: permukaan dan heading bagian; isi tetap milik halaman.
- `StatTile`: label, nilai, dan ikon opsional, tanpa menghitung data domain.
- `ProgressBar`: persentase terjepit 0–100 dengan label aksesibel; class track/fill dapat mengikuti tampilan yang sudah ada.

Gunakan `components/ui/button.tsx` untuk aksi utama/sekunder; varian default dan outline memakai gaya tombol dashboard. Komponen UI tidak bergantung pada AppContext, sesi pengguna, atau API. Warna dan tipografi tetap menggunakan token bersama di `latveria-os.css`.

`components/ui/dashboard-shell.tsx` menyamakan kerangka peserta dan admin melalui `DashboardShell`, `DashboardSidebar`, `DashboardHeader`, dan `DashboardNavigation`. Header, sidebar, area scroll, dan navigasi bawah memakai CSS yang sama. Controller peserta tetap di `LatveriaOSApp.tsx`; controller admin di `app/admin/admin-layout.tsx` dengan menu berbasis route. Identitas/statistik diberikan lewat slot agar admin tidak memuat data latihan peserta.

```text
apps/web ──imports──> packages/shared <──imports── apps/api
   │                                              │
   └──────── HTTP /api + cookie sesi ──────────────┘
                                                  │
                                              PostgreSQL
```

Shared tidak mengimpor kode backend. Tipe request diinferensikan dari Zod (`z.infer`), sementara tipe response ditulis sebagai DTO tanpa fungsi/schema database. Validasi frontend membantu formulir; backend tetap memvalidasi ulang karena TypeScript di browser bukan pengamanan runtime.

Development menggunakan proxy Vite dari port 3000 ke API 3001. Produksi menggunakan Hono untuk melayani `apps/web/dist` bersama API, dengan fallback SPA untuk deep link. Backend dijalankan via tsx; belum memerlukan bundler backend. Hosting membutuhkan proses Node/reverse proxy HTTPS, bukan Next-specific hosting.

Deployment Docker memisahkan image frontend Nginx dan backend Node.js 22. Nginx melayani SPA dan mem-proxy `/api/*` ke backend pada jaringan Compose; `SERVE_WEB=false` mematikan penyajian SPA Hono pada image backend. Mode produksi Node langsung tetap dapat melayani SPA. CLI database memuat `.env.local` jika tersedia dan menerima environment runtime container; migrasi memakai migrator Drizzle tanpa dependency CLI development. GitHub Actions menjalankan pemeriksaan, integrasi PostgreSQL, dan smoke test kedua image sebelum publish GHCR. Konfigurasi dan prosedur deployment ada di `deploy/README.md`.

## Alur dan keamanan

- Better Auth handler di `/api/auth/*`; signup hanya saat backend development, role client tidak diterima. Tidak ada akun admin default.
- Profil peserta disimpan pada tabel akun melalui `GET/PUT /api/learner/profile`. Kontrak `profileSchema` mengizinkan nama, nama panggilan, target PTN, bio, dan motto; ID, email, dan role tidak diterima. Endpoint memakai ID sesi, bukan ID dari client. Migrasi `0005_wooden_lord_hawal.sql` menambah empat kolom teks tanpa mengubah identitas atau sesi lama. Foto profil menggunakan placeholder ikon; form menunggu profil server dan hanya memperbarui UI setelah simpan berhasil.
- `/api/me` mengembalikan identitas minimum; semua endpoint learner/admin memvalidasi sesi dan role server-side. Admin tidak mengakses API peserta. Role frontend hanya untuk navigasi.
- Operasi tulis mewajibkan Origin sama dengan `BETTER_AUTH_URL`. Tidak ada CORS wildcard; proxy dan deployment memakai satu origin.
- Endpoint latihan hanya memilih ID, prompt, dan opsi. Sesi dapat memakai sebagian soal dari bank subtes. Backend memeriksa setiap questionId termasuk dalam subtes dan memvalidasi opsi saat submit, menilai dari kunci database, lalu menyimpan attempt/answers dalam transaksi. Frontend mewajibkan semua soal yang dipilih dijawab; kegagalan submit mempertahankan draft, sedangkan kegagalan pemuatan review dapat dicoba ulang memakai attempt ID yang sudah tersimpan.
- Endpoint hasil mencari attempt dengan ID **dan** userId sebelum membaca kunci/pembahasan. Client tidak dapat melihat hasil peserta lain.
- Tombol Riwayat pada header Latihan membuka `/dashboard/riwayat`; daftar dan hasil memakai loader React Router untuk `/api/learner/history` serta `/api/learner/results/:id`. Hasil di `/dashboard/riwayat/:id` menggunakan renderer soal yang sama dengan state review lokal baca-saja. Membuka hasil tidak mengirim submission atau memberi EXP; refresh dan tombol kembali mengikuti URL halaman.
- EXP dihitung dari attempt tersimpan (30 per sesi + 15 per jawaban benar), termasuk riwayat lama. `packages/shared/src/progression.ts` menentukan level progresif (300 EXP awal, kenaikan 35%) dan streak tanggal WIB. Summary juga menghasilkan statistik mingguan nyata. Tidak ada saldo EXP/level/streak yang bisa diubah melalui profile atau localStorage. Kedua endpoint submit memakai handler yang sama; `submissionId` UUID client menjadi primary key attempt. Konflik insert menunggu transaksi pertama, lalu replay memeriksa owner, subtes/paket, dan seluruh jawaban. Retry tidak menyisipkan attempt/answers lagi; payload berbeda ditolak 409.
- Admin membuat soal melalui Zod shared. Penghapusan soal terpakai ditolak foreign key PostgreSQL, termasuk saat bersamaan dengan submit.
- Migrasi Drizzle dipindah bersama metadata tanpa mengganti SQL/ID lama. RLS tanpa kebijakan publik tetap aktif; otorisasi API tetap wajib karena koneksi server dapat melewati RLS.

## Batas MVP saat ini

Bank soal lokal: 7 subtes, empat opsi single-answer. Bukan simulasi resmi UTBK atau konversi skor. Draft jawaban viewer hanya tersimpan selama komponen terbuka; autosave database, versi soal immutable, verifikasi email produksi, dan deployment Supabase masih pekerjaan lanjut. Level/EXP/streak dan submit idempoten sudah tersedia untuk sesi frontend yang memakai UUID. Lihat `PLAN.md` untuk urutan produk.

Workspace menggunakan Bun 1.3.14 untuk instalasi dan task runner (`package.json` + `bun.lock`); runtime backend tetap Node.js. Jalankan `bun run check` dan `bun run test:integration` setelah perubahan API/auth. Endpoint tidak memigrasikan database saat menerima request; build/start juga tidak menjalankan migrasi.
