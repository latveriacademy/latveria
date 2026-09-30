# Arsitektur Latveria

## Stack yang berjalan

| Bagian | Teknologi | Tanggung jawab |
| --- | --- | --- |
| Frontend | React 19 + Vite + React Router | Landing, dashboard peserta, latsol/review, dan panel admin |
| UI | Tailwind 4 + shadcn/ui (Radix) + Lucide | Komponen dengan palet perkamen/hijau |
| Backend | Hono + Node.js 22 | HTTP API, otorisasi, transaksi, dan file SPA produksi |
| Validation | Zod di `@latveria/shared` | Skema request yang sama di browser dan API |
| Akun | Better Auth | Hash kata sandi, cookie sesi, penyimpanan sesi di PostgreSQL |
| Database | PostgreSQL + Drizzle | Soal, kategori, pengguna, attempt, jawaban, migrasi |
| Konten | KaTeX | LaTeX dengan trust false dan fallback source |

Next.js dan Server Actions sudah diganti sepenuhnya. Komponen tampilan kini React biasa; operation yang dulu berada dalam page server/action kini endpoint Hono.

## Batas paket

```text
apps/web ──imports──> packages/shared <──imports── apps/api
   │                                              │
   └──────── HTTP /api + cookie sesi ──────────────┘
                                                  │
                                              PostgreSQL
```

Shared tidak mengimpor kode backend. Tipe request diinferensikan dari Zod (`z.infer`), sementara tipe response ditulis sebagai DTO tanpa fungsi/schema database. Validasi frontend membantu formulir; backend tetap memvalidasi ulang karena TypeScript di browser bukan pengamanan runtime.

Development menggunakan proxy Vite dari port 3000 ke API 3001. Produksi menggunakan Hono untuk melayani `apps/web/dist` bersama API, dengan fallback SPA untuk deep link. Backend dijalankan via tsx; belum memerlukan bundler backend. Hosting membutuhkan proses Node/reverse proxy HTTPS, bukan Next-specific hosting.

## Alur dan keamanan

- Better Auth handler di `/api/auth/*`; signup hanya saat backend development, role client tidak diterima. Tidak ada akun admin default.
- `/api/me` mengembalikan identitas minimum; semua endpoint learner/admin memvalidasi sesi dan role server-side. Admin tidak mengakses API peserta. Role frontend hanya untuk navigasi.
- Operasi tulis mewajibkan Origin sama dengan `BETTER_AUTH_URL`. Tidak ada CORS wildcard; proxy dan deployment memakai satu origin.
- Endpoint latihan hanya memilih ID, prompt, dan opsi. Sesi dapat memakai sebagian soal dari bank subtes. Backend memeriksa setiap questionId termasuk dalam subtes dan memvalidasi opsi saat submit, menilai dari kunci database, lalu menyimpan attempt/answers dalam transaksi. Frontend mewajibkan semua soal yang dipilih dijawab; kegagalan submit mempertahankan draft, sedangkan kegagalan pemuatan review dapat dicoba ulang memakai attempt ID yang sudah tersimpan.
- Endpoint hasil mencari attempt dengan ID **dan** userId sebelum membaca kunci/pembahasan. Client tidak dapat melihat hasil peserta lain.
- Admin membuat soal melalui Zod shared. Penghapusan soal terpakai ditolak foreign key PostgreSQL, termasuk saat bersamaan dengan submit.
- Migrasi Drizzle dipindah bersama metadata tanpa mengganti SQL/ID lama. RLS tanpa kebijakan publik tetap aktif; otorisasi API tetap wajib karena koneksi server dapat melewati RLS.

## Batas MVP saat ini

Bank soal lokal: 7 subtes dan 14 soal dummy, empat opsi single-answer. Bukan simulasi resmi UTBK atau konversi skor. Draft jawaban viewer hanya tersimpan selama komponen terbuka; autosave database, versi soal immutable, submit idempoten, EXP, verifikasi email produksi, dan deployment Supabase masih pekerjaan lanjut. Lihat `PLAN.md` untuk urutan produk.

Workspace menggunakan Bun 1.3.14 untuk instalasi dan task runner (`package.json` + `bun.lock`); runtime backend tetap Node.js. Jalankan `bun run check` dan `bun run test:integration` setelah perubahan API/auth. Endpoint tidak memigrasikan database saat menerima request; build/start juga tidak menjalankan migrasi.
