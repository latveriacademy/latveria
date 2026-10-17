# Arsitektur latveriacademy

Dokumen ini menjelaskan implementasi yang berjalan: batas paket, runtime, alur data, UI, penyimpanan, dan deployment. Prosedur menjalankan proyek ada di [README.md](README.md); prosedur produksi ada di [deploy/README.md](deploy/README.md).

Aturan perubahan kode bagi developer dan AI agent ada di [CONTRIBUTING.md](CONTRIBUTING.md), termasuk batas file, batas diff/commit, style, serta verifikasi. ESLint dan pemeriksaan commit CI menjaga batas tersebut.

## 1. Gambaran sistem

latveriacademy adalah platform latihan UTBK-SNBT dengan SPA React, HTTP API Hono, dan PostgreSQL. Browser tidak mengakses database secara langsung. Kontrak request dan tipe response dibagikan melalui workspace `@latveria/shared`.

```text
Browser: React SPA
   │ HTTP /api + cookie sesi, satu origin
   ▼
Hono: autentikasi → role/Origin → handler → service
   │ Drizzle ORM + postgres driver
   ▼
PostgreSQL: akun, soal, paket, latihan, sesi tryout, progres

apps/web ──imports──> packages/shared <──imports── apps/api
```

EXP, persentase jawaban benar, skor simulasi Tryout, dan poin Warrior Battle adalah ukuran yang berbeda. Tidak satu pun merupakan skor resmi atau prediksi skor UTBK. Drilling adalah latihan per subtes; Battle World adalah Tryout; Warrior Battle adalah PvP 1v1/2v2.

## 2. Stack dan runtime

| Bagian                | Teknologi                                                   | Peran                                                                       |
| --------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| Workspace dan tooling | Bun 1.3.14                                                  | Instalasi dependensi, lockfile, dan menjalankan script web/API/shared       |
| Bahasa                | TypeScript, React TSX, dan beberapa modul JSX legacy        | Kontrak shared, backend, dan komponen frontend                              |
| Frontend              | React 19, React DOM, React Router 8                         | SPA, route loaders, navigasi, state sesi, lazy loading                      |
| Build frontend        | Vite 8, plugin React, Tailwind CSS 4                        | Dev server, proxy API, bundling, dan CSS                                    |
| UI                    | shadcn/ui berbasis Radix, Lucide, CVA, clsx, tailwind-merge | Primitive accessible, varian, ikon, dan komposisi kelas                     |
| Animasi               | GSAP 3 + ScrollTrigger, CSS, requestAnimationFrame          | Timeline/parallax landing, transisi UI, dan angka animasi                   |
| Rumus dan diagram     | KaTeX, parser TikZ lokal, SVG                               | Render LaTeX dan subset diagram geometri                                    |
| Audio                 | Web Audio API                                               | Umpan balik suara di browser, dengan preferensi lokal                       |
| HTTP API              | Hono + `Bun.serve`                                          | Request/response, middleware, dan penyajian SPA pada mode produksi langsung |
| Runtime API           | Bun 1.3.14                                                  | Eksekusi TypeScript backend dan CLI database langsung                       |
| Autentikasi           | Better Auth + Drizzle adapter                               | Akun, hash kata sandi, cookie sesi, dan role                                |
| Validasi              | Zod                                                         | Validasi ulang input di backend dan bantuan validasi frontend               |
| Database              | PostgreSQL 17, Drizzle ORM, driver `postgres`               | Data relasional, transaksi, indeks, dan migrasi                             |
| Tes dan kualitas      | Vitest, ESLint, TypeScript, oxfmt                           | Tes, lint, pemeriksaan tipe, dan formatting                                 |
| Deployment            | Docker Compose, Nginx, GitHub Actions, GHCR                 | Image frontend/backend terpisah dan pipeline verifikasi/publish             |

### Bun sebagai runtime workspace

Web dan API menggunakan **Bun sebagai package manager dan task runner**, serta runtime backend melalui `Bun.serve`. Vite development dijalankan dengan **Node.js 22, minimal 22.12**: proxy WebSocket Vite tidak kompatibel dengan implementasi HTTP/socket Bun 1.3.14. Build Vite, Vitest, ESLint, TypeScript, oxfmt, dan Drizzle Kit tetap memakai Bun. Backend tidak memerlukan `tsx` atau adapter server Node.

| Proses                      | Runtime aktual                                   | Bukti implementasi                                                |
| --------------------------- | ------------------------------------------------ | ----------------------------------------------------------------- |
| React SPA                   | Browser                                          | `apps/web/src/main.tsx` memakai `createRoot` dan `RouterProvider` |
| Dev server web              | Node.js menjalankan CLI Vite dan proxy WebSocket | `apps/web/package.json`                                           |
| Build web                   | Bun menjalankan CLI Vite                         | `apps/web/package.json`, `apps/web/Dockerfile`                    |
| API development             | Bun dengan `--watch` dan `Bun.serve`             | `apps/api/package.json`, `apps/api/src/index.ts`                  |
| API produksi container      | Bun 1.3.14 menjalankan TypeScript langsung       | `apps/api/Dockerfile`                                             |
| Frontend produksi container | Nginx menyajikan hasil build statis              | `apps/web/Dockerfile`, `deploy/nginx.conf`                        |
| CLI database                | Bun menjalankan TypeScript/Drizzle Kit           | Script `db:*` di `apps/api/package.json`                          |

Bun 1.3.14 adalah runtime yang diperlukan; versinya tercatat di `package.json` dan `.bun-version`. Import `node:*` yang masih ada adalah API kompatibilitas yang disediakan Bun, bukan penggunaan proses Node.js. Backend `build` melakukan typecheck; backend belum dibundle menjadi artefak JavaScript terpisah. React/GSAP tetap berjalan di browser setelah hasil build dikirim; runtime Bun digunakan untuk tooling dan server, bukan mengganti mesin JavaScript browser.

## 3. Struktur dan batas paket

```text
apps/web/src/
  main.tsx                 Bootstrap React, stylesheet, dan font
  router.tsx               Route, loader, guard, redirect, dan error halaman
  app/                     Landing, login, dan controller halaman admin
  app/admin/{soal,tryout,users,packages,import}/ Halaman admin menurut fitur
  views/                   Controller halaman peserta
  views/{practice,history,tryout,library}/ Controller fitur, tes, dan stylesheet
  components/ui/           Primitive shadcn/Radix dan kerangka dashboard bersama
  components/              Komposisi UI dan komponen fitur
  components/{practice,tryout,warrior,question,math,lexicon}/ Modul fitur, tes, dan stylesheet
  context/AppContext.jsx   Koordinasi state peserta dan operasi frontend
  lib/                     HTTP client, renderer/parser, import, dan motion
  lib/{practice,tryout,question,math}/ Helper fitur beserta tes
  assets/, data/, utils/   Aset, data pendukung, dan utilitas browser

apps/api/
  src/index.ts             Bun.serve dan static SPA produksi
  src/app.ts               Aplikasi Hono, middleware, auth, dan pemasangan router
  src/handlers/            Route domain, parsing/validasi request, response HTTP
  src/services/            Logika domain, query database, transaksi, dan cache
  src/services/{warrior,tryout,latex,question,storage}/ Service fitur beserta tes
  src/lib/                 Auth, environment, koneksi/schema DB, utilitas domain
  scripts/                 Migrasi, seed, promosi admin, dan verifikasi integrasi
  drizzle/                 SQL migrasi dan metadata Drizzle

packages/shared/src/
  index.ts                 Skema request dan DTO response
  utbk-subtests.ts          Katalog subtes UTBK
  progression.ts           EXP, level, streak WIB, dan summary
  scoring.ts               Perhitungan Latveria Score
```

Frontend/shared tidak boleh mengimpor database atau secret server. Shared tidak mengimpor backend. Tipe request diinferensikan dari Zod; tipe response berupa DTO. TypeScript di browser tidak menggantikan validasi runtime backend.

## 4. Frontend dan sistem UI

`main.tsx` memasang React StrictMode, Suspense, dan React Router. Route memakai loader untuk data halaman dan guard awal. Halaman besar seperti shell peserta, hasil riwayat, dan beberapa halaman admin dimuat secara lazy. Vite memisahkan vendor React ke chunk tersendiri.

Navigasi peserta meliputi Basecamp, Drilling, Library, Battle World, Warrior Battle, Rank, Profil, dan Setelan. Drilling menampilkan katalog paket, pencarian, filter, dan paginasi. Library diperuntukkan materi; tampil sebagai empty state saat konten belum tersedia. Riwayat dan hasil memakai `/dashboard/riwayat` dan `/dashboard/riwayat/:id`.

### Atomic design pragmatis

| Lapisan                     | Lokasi                              | Contoh                                                                                                                       |
| --------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Atom/primitive              | `components/ui`                     | `Button`, `Input`, `Textarea`, `Select`, `Tabs`, `Table`, `Dialog`, `AlertDialog`, `Popover`                                 |
| Molecule/komposisi reusable | `components`                        | `AppDialog`, `ConfirmDialog`, `SubmissionSummary`, `LogoutButton`                                                            |
| Organism/fitur              | `components`                        | `PracticeSession`, `PracticeQuestion`, `PracticeNavigator`, `QuestionReportDialog`, `ProfileEditorDialog`, `TryoutWorkspace` |
| Template                    | `components/ui/dashboard-shell.tsx` | Shell, header, sidebar, dan navigasi peserta/admin                                                                           |
| Page/controller             | `views`, `app`                      | Memilih tampilan, memuat data, dan mengoordinasikan operasi domain                                                           |

Kembangkan primitive atau komposisi yang sudah ada sebelum membuat komponen baru. Tidak ada kewajiban membuat folder `atoms`, `molecules`, atau `organisms`. Pisahkan berkas ketika menggabungkan concern berbeda—katalog, sesi, renderer soal, form, dialog, data—bukan berdasarkan batas jumlah baris.

`dashboard.tsx` menyediakan `Brand`, `PageHeading`, `Panel`, `PanelHeader`, `StatTile`, dan `ProgressBar`. `dashboard-shell.tsx` menyamakan kerangka peserta/admin. Primitive tidak bergantung pada AppContext atau API; data dan aksi diberikan oleh controller/komponen fitur.

### Modal, konfirmasi, dan popup

- Form/informasi modal menggunakan `AppDialog`, dibangun dari primitive Dialog Radix.
- Konfirmasi tindakan menggunakan `ConfirmDialog`, dibangun dari AlertDialog Radix.
- Keduanya memakai `ui/dialog.module.css` untuk permukaan dan spacing yang sama.
- Radix menangani portal, fokus, Escape, dan dismissal. Opener menerima fokus kembali setelah dialog ditutup.
- `pending` mencegah dialog ditutup selama request berlangsung. Error berada di dialog; konfirmasi asinkron ditutup oleh caller setelah sukses.
- Popup profil memakai `Popover` untuk anchoring, collision handling, dan dismissal. Kalkulator memakai primitive Dialog non-modal agar soal tetap dapat diakses.
- Jangan menambah backdrop/focus trap manual, native `confirm`/`alert`, atau `<dialog>` lain.

`PracticeView` memilih katalog atau sesi. Renderer soal tidak memanggil API. Form laporan memiliki state dan request sendiri. Navigator desktop/mobile berbagi konten. Battle World memisahkan katalog dan workspace dari kontrol sesi, autosave, dan timer. Halaman login, ringkasan admin, bank soal, dan pratinjau terpisah dari konfigurasi router.

### Tema, aset, animasi, dan audio

Nama produk adalah **latveriacademy**, dengan logo `assets/latveria.webp`. Token warna, tipografi, radius, dan layout bersama berada di `latveria-os.css`; utility Tailwind dan CSS modules dipakai untuk styling komponen. Dashboard/login/admin menggunakan hijau gelap, emas, dan perkamen; landing memakai aksen hijau. Font web dimuat di `main.tsx` melalui `@fontsource`.

Halaman publik `/` dan `/tentang` berada di `app/landing/`, dengan navigasi, footer, judul halaman, dan scroll antarroute melalui `public-shell.tsx`. GSAP di `landing-motion.tsx` mengatur intro, parallax, reveal, dan catatan belajar sticky yang berkembang mengikuti scroll pada desktop. `gsap.matchMedia()` menjalankan animasi ketika `prefers-reduced-motion: no-preference`; cleanup memakai `media.revert()`. Mobile dan reduced motion menampilkan catatan lengkap tanpa perlu mengikuti animasi.

Animasi dashboard memakai kelas CSS dalam `lib/motion/motion.css`, token di `lib/motion/tokens.ts`, dan primitive React di `lib/motion/primitives.tsx`. `AnimatedNumber` memakai requestAnimationFrame dan menghormati reduced motion. GSAP tidak menjadi pengelola state domain atau timer ujian.

`utils/audioFeedback.js` menggunakan Web Audio API untuk suara interaksi. Tema dan preferensi suara disimpan di localStorage; profil dan progres peserta berasal dari API/database.

### Rumus dan diagram

`components/math/math-text.tsx` mengenali `$...$` inline, `$$...$$` blok, dan blok `\begin{tikzpicture} ... \end{tikzpicture}` tanpa pembungkus `$$`. Rumus dirender dengan KaTeX `trust: false`; sumber tidak valid tetap ditampilkan.

TikZ dasar dirender sebagai SVG lokal oleh `components/math/tikz-diagram.tsx` dan parser `lib/math/tikz.ts`. Subset mencakup garis/poligon, rectangle, circle, ellipse, gaya garis, label node, dan koordinat 2D/3D dengan proyeksi. Parser membatasi panjang sumber, jumlah perintah, dan rentang koordinat. PGFPlots memiliki renderer lokal untuk subset grafik batang.

`components/math/latex-diagram.tsx` meneruskan diagram kompleks ke `/api/latex/render`. API memakai cache SVG berversi dan worker `apps/tex-worker` melalui `TEX_WORKER_URL`. Worker menjalankan compiler TeX dan sanitasi SVG. Jika kompilasi tidak tersedia, hanya diagram yang benar-benar didukung renderer native yang boleh menjadi fallback; kegagalan lain mengembalikan error, bukan placeholder sukses. Renderer yang sama digunakan di preview admin, latihan, dan review.

## 5. Backend dan kontrak HTTP

`src/app.ts` hanya mengoordinasikan aplikasi: health/auth publik, middleware sesi/Origin, role guard, handler domain, dan error JSON. `handlers/` memetakan endpoint ke fungsi `services/`; service melakukan query, transaksi, dan perhitungan domain tanpa membangun UI.

Domain utama: topik, paket, soal/impor, latihan/hasil, leaderboard, tryout, manajemen user, dan sistem (profil, konfigurasi, afirmasi, laporan soal). Cache katalog dan leaderboard berada di service terkait; operasi perubahan konten menginvalidasi katalog.

Request mengikuti alur:

1. Browser mengirim request same-origin melalui `lib/api.ts` beserta cookie sesi.
2. Middleware Better Auth memverifikasi sesi dan mengisi user pada konteks Hono.
3. Role guard memisahkan `/api/learner/*` dan `/api/admin/*`; operasi tulis memeriksa Origin.
4. Handler memvalidasi parameter/payload dan memanggil service.
5. Service memeriksa kepemilikan/invariant domain, menjalankan transaksi jika diperlukan, lalu mengembalikan DTO.
6. Hono mengirim response JSON atau error dengan status HTTP yang sesuai.

## 6. Penyimpanan dan alur domain

| Kelompok tabel                                            | Data                                                          |
| --------------------------------------------------------- | ------------------------------------------------------------- |
| Better Auth: `user`, `session`, `account`, `verification` | Identitas, role, profil, kredensial, sesi, status aktif       |
| `topics`, `question_packages`, `questions`                | Katalog subtes, metadata paket, prompt/opsi/kunci/pembahasan  |
| `practice_attempts`, `practice_answers`                   | Latihan tersimpan, jawaban per soal, skor dan waktu           |
| `tryout_sessions`, `tryout_package_questions`             | State/draft tryout, question sets sesi, dan relasi soal paket |
| `affirmations`, `question_reports`, `system_config`       | Pesan dashboard, laporan peserta, konfigurasi sistem          |

User table mencakup: `is_deactivated`, `deactivated_at`, `account_notes`, `last_login_at`, `failed_login_attempts`.

### Drilling, hasil, dan progres

Endpoint soal aktif tidak mengirim kunci atau pembahasan. Draft jawaban ditautkan ke soal dan dapat diubah selama sesi. Draft Drilling berada di memori frontend; timer opsionalnya berada di browser dan dapat dijeda.

Submit memvalidasi subtes/paket, questionId, dan opsi. Backend menilai dari kunci database lalu menyimpan attempt/jawaban dalam transaksi. `submissionId` UUID membuat retry idempoten; payload berbeda untuk ID yang sama ditolak. Jika jawaban sudah tersimpan tetapi review gagal dimuat, attempt yang sama digunakan untuk retry hasil.

Hasil hanya dapat dibaca pemilik attempt. Membuka hasil dari riwayat menggunakan renderer yang sama dalam mode read-only; tidak membuat attempt atau memberikan EXP lagi.

EXP berasal dari attempt tersimpan: 30 per sesi + 15 per jawaban benar. Level memakai ambang awal 300 EXP dan kenaikan 35%; streak dihitung menurut kalender Asia/Jakarta (WIB). Summary menjadi sumber level, EXP, streak, dan statistik peserta.

### Battle World dan scoring

Tryout memiliki state `active`, `break`, dan `completed`. Saat sesi dimulai, server memilih dan menyimpan question sets agar pemuatan ulang menggunakan soal yang sama. Sesi menyimpan jawaban, flag, nomor soal, waktu per soal, waktu mulai subtes, dan score breakdown. Relasi `tryout_package_questions` menghubungkan soal dengan paket tanpa memindahkan soal asal.

Frontend melakukan autosave draft ke API dan menyimpan ID sesi terakhir di localStorage sebagai penunjuk resume. Data sesi tetap di PostgreSQL. Server menghitung waktu tersisa dari timestamp subtes/jeda; countdown frontend menampilkan waktu tersebut. Submit subtes mengunci bagian yang selesai dan menggerakkan state sesi. Tryout tidak menambah EXP Drilling.

Sesi baru memakai `utbk-simulation-v1`: poin diperoleh dibagi poin maksimum, dikalikan 1.000, tanpa bonus waktu. Model IRT yang memenuhi syarat dapat di-snapshot saat sesi dimulai. Sesi `legacy` tetap memakai Latveria Score lama dari `packages/shared/src/scoring.ts`; hasil lama tidak dikonversi. Rincian rumus, revisi soal, dan kalibrasi ada di [docs/tryout-scoring-irt.md](docs/tryout-scoring-irt.md).

### Warrior Battle

`services/warrior/` menangani room 1v1/2v2, kesiapan peserta, ronde, penilaian server, riwayat, dan rematch. HTTP `/api/warrior/*` memerlukan sesi; handshake WebSocket juga memeriksa Origin, ID battle, dan keanggotaan. Nginx dan proxy Vite meneruskan upgrade WebSocket ke `Bun.serve`.

Battle, tim, peserta, soal, dan jawaban disimpan di PostgreSQL. Socket dan timer room berada dalam memori satu proses API, sehingga restart dan multi-instance belum memiliki pemulihan/koordinasi pertandingan. Backend memvalidasi ronde, questionId, opsi, serta tenggat sebelum menyimpan jawaban dalam transaksi.

Kunci dan pembahasan tidak dikirim selama ronde. Endpoint `/api/warrior/battles/:id/review` hanya tersedia untuk peserta setelah battle selesai, tanpa mengubah skor atau memberi EXP. Hasil/riwayat membuka review personal baca-saja; soal terjawab dan sumber wacananya dilindungi dari edit/hapus admin. Ranked/Elo dan musim belum aktif.

### Leaderboard dan administrasi konten

Leaderboard dihitung di server dari data jawaban/progres, dengan periode WIB dan filter subtes. Perhitungan kompetitif memakai jawaban pertama peserta per soal; akun demo dikecualikan. Metrik akurasi memiliki ambang jumlah soal agar sampel kecil tidak mendominasi.

Admin mengelola topik, paket, bank soal, impor JSON, afirmasi, dan laporan. Update soal memeriksa pemakaian di dalam transaksi; soal dengan jawaban peserta tidak dapat diedit/dihapus. Impor memakai skema shared, batas ukuran/jumlah, dan transaksi batch atomik. Foreign key menjaga relasi soal/paket/riwayat.

## 7. Autentikasi, environment, dan database

- Signup Better Auth hanya aktif di development. Akun baru ber-role `user`; role dari client ditolak.
- Router frontend membantu navigasi, tetapi backend tetap memeriksa role, sesi, dan ownership.
- Peserta yang membuka route admin melihat halaman tidak ditemukan. API menolak role yang salah.
- Operasi tulis memeriksa Origin terhadap konfigurasi origin yang diizinkan. Tidak ada CORS wildcard.
- Profil disimpan melalui GET/PUT `/api/learner/profile`; ID, email, dan role bukan field edit.
- Tabel dengan RLS tidak memberikan akses publik; koneksi server dapat melewati RLS.

Environment lokal berada di `apps/api/.env.local`, dengan contoh di `apps/api/.env.example`. `BETTER_AUTH_URL` menunjuk origin frontend, bukan port internal API. Docker produksi menerima environment container; secret tidak dibundel ke frontend/shared.

Migrasi dan metadata berada di `apps/api/drizzle`. Migrasi dijalankan eksplisit, bukan otomatis saat request, build, atau start. Seed idempoten mengisi katalog/soal contoh. Bun memuat `.env.local` otomatis dari direktori API ketika menjalankan server/CLI lokal; variabel environment yang diberikan proses/container tetap memiliki prioritas. Tidak ada loader env Node terpisah. Baseline migrasi dan data persisten tidak di-reset.

## 8. Development, produksi, dan CI

Development memakai Vite pada port 3000 dan API pada port 3001. Vite mem-proxy `/api` ke backend, sehingga browser tetap memakai satu origin. PostgreSQL Compose lokal tersedia pada port 5433, dengan Adminer pada port 8080, serta MinIO (S3-compatible object storage) pada port 9002 (API) dan 9003 (Console) dengan bucket `latveria-avatars` untuk foto profil (batas disarankan 5 KB – 3 MB). Pada produksi, MinIO digantikan dengan Cloudflare R2 atau Amazon S3.

Ada dua cara penyajian produksi yang didukung:

```text
Container terpisah:
Browser → Nginx frontend :8080 → /api → Bun/Hono backend :3001 → PostgreSQL
                └──────────→ SPA dist + fallback deep link

Bun langsung:
Browser → Bun/Hono → /api → PostgreSQL
              └────→ apps/web/dist + fallback deep link
```

Image Docker frontend memiliki build stage Bun dan runtime Nginx. Image backend memiliki dependency stage dan runtime Bun 1.3.14, dengan user non-root `bun`. Kedua image tidak memerlukan instalasi Node. `SERVE_WEB=false` mematikan static SPA pada backend container; produksi langsung Hono dapat melayani API dan SPA sekaligus memakai middleware static `hono/bun`. Lokasi dist ditentukan relatif terhadap source server, bukan cwd proses. Health endpoint: `/api/health` untuk API dan `/healthz` untuk Nginx.

GitHub Actions memasang Bun, menjalankan `bun install --frozen-lockfile`, pemeriksaan workspace, migrasi/seed berulang untuk memeriksa idempotensi, serta tes integrasi PostgreSQL dan WebSocket. Tiga image aplikasi dibangun: frontend, backend, dan TeX worker. Smoke test container memeriksa SPA/API dan kompilasi grafik fungsi yang membutuhkan TeX nyata. Setelah berhasil, ketiga image dipublikasikan ke GHCR untuk AMD64 dan ARM64. Detail operasional ada di [deploy/README.md](deploy/README.md).

## 9. Formatting dan verifikasi

Formatter tunggal adalah **oxfmt**. `.oxfmtrc.json` menetapkan indentasi 2 spasi, print width 100, kutip ganda JS/TS/JSX, titik koma, trailing comma, dan LF. Formatter mengikuti `.gitignore`; output build/cache, secret lokal, lockfile, dan metadata migrasi dikecualikan. Gunakan `bun.lock` sebagai satu-satunya lockfile.

```sh
bun run format              # Format kode dan dokumentasi
bun run format:check        # Periksa tanpa mengubah berkas
bun run check               # Format check → lint → typecheck → tes → build
bun run test:integration    # Integrasi API/PostgreSQL lokal
bun run test:containers     # Smoke test deployment container
```

Tes unit/component menggunakan Vitest. Interaksi dan tampilan UI diperiksa dengan Playwright saat diperlukan, termasuk fokus dialog, pending/error, dan viewport desktop/mobile. Frontend/router bukan batas keamanan; verifikasi role/ownership juga dilakukan melalui tes API.

## 10. Batas implementasi saat ini

Drilling sudah memiliki hasil/riwayat, submit idempoten, dan progres server, tetapi draftnya belum autosave lintas reload. Tryout memiliki draft/state dan snapshot revisi soal di server. Warrior Battle tersedia dengan batas satu proses API. Sebagian konten masih contoh; kalibrasi IRT nyata, verifikasi email, dan deployment database produksi perlu verifikasi pada lingkungan tujuan. Ranked PvP/Elo, musim, jenjang kompetitif, dan lencana belum aktif. Prioritas produk tercatat di [PLAN.md](PLAN.md).
