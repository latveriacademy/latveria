# Aturan kontribusi latveriacademy

Aturan ini berlaku untuk developer dan AI agent. Baca dokumen ini serta [ARCHITECTURE.md](ARCHITECTURE.md) sebelum mengubah kode. Instruksi pribadi agent boleh berada di file lokal yang tidak dilacak Git; keputusan dan batas proyek tetap berada di dokumentasi bersama ini.

## 1. Sebelum mengubah kode

- Periksa `git status`, diff lokal, dan kode terkait. Jangan menimpa, menghapus, atau memasukkan pekerjaan orang lain ke commit.
- Telusuri caller dan alur data sampai batas API/database. Perbaiki akar masalah pada lapisan yang tepat, bukan gejalanya pada satu halaman.
- AI agent dan developer wajib membuat atau memakai issue yang relevan sebelum mengerjakan **setiap fitur baru atau fix bug**, termasuk perubahan kecil. Cari issue yang sudah ada agar tidak membuat duplikat; tautkan Project jika akses memungkinkan.
- Issue fitur memuat tujuan, batas scope, dan kriteria selesai. Issue bug memuat langkah reproduksi, perilaku aktual/yang diharapkan, serta rencana verifikasi. Kerjakan satu concern dahulu sebelum menambah yang lain.
- Jangan menambah fitur, dependency, abstraksi, atau refactor yang tidak dibutuhkan oleh tugas. Cari komponen/helper yang sudah ada terlebih dahulu.

## 2. Ukuran file dan pemisahan concern

| Jenis file                                         | Batas           | Pedoman                                                           |
| -------------------------------------------------- | --------------- | ----------------------------------------------------------------- |
| Primitive `components/ui`                          | 150 baris kode  | Satu primitive; shell/dashboard adalah komposisi, bukan primitive |
| Component, page/controller, service, util, dan tes | 500 baris kode  | Target 150–300; pecah lebih awal jika concern berbeda             |
| CSS module fitur                                   | 600 baris fisik | Pisahkan berdasarkan komponen/surface, bukan potongan acak        |

Baris kode pada ESLint tidak menghitung baris kosong atau komentar. Pengecualian legacy tercatat eksplisit di `eslint.config.mjs`, dengan plafon masing-masing; plafon tidak boleh dinaikkan hanya agar lint lolos. File legacy yang disentuh harus diarahkan ke batas normal melalui pemisahan concern.

- Katalog, controller sesi, renderer soal, form/dialog, dan data statis tidak digabung menjadi satu file.
- File dengan domain/prefix fitur yang sama dikelompokkan dalam folder fitur; tes dan stylesheet berdekatan dengan modulnya. Gunakan folder fitur yang sudah ada untuk penambahan berikutnya.
- Renderer menerima data/callback; request API dan koordinasi state berada di controller atau komponen fitur.
- Jangan membuat komponen untuk setiap `<div>` atau memindahkan kode hanya untuk menyembunyikan pelanggaran ukuran.
- Jangan menggabungkan dependency cycle atau membuat barrel export yang menyamarkan batas paket.
- Stylesheet global legacy `latveria-os.css` merupakan baseline token/shell. Gaya fitur baru masuk CSS module; jangan terus menambah concern halaman ke stylesheet global.

## 3. Arsitektur dan runtime

- Bun 1.3.14 adalah runtime backend, package manager, dan task runner. Vite development memakai Node.js 22 (minimal 22.12) agar proxy WebSocket berfungsi; build Vite, Vitest, ESLint, TypeScript, oxfmt, dan Drizzle Kit tetap memakai Bun.
- Gunakan hanya `bun.lock`. Dependency baru harus menyelesaikan kebutuhan nyata yang belum ditangani stdlib, platform, atau dependency yang terpasang.
- `apps/web` dan `packages/shared` tidak mengimpor database atau secret server. `packages/shared` tidak mengimpor backend.
- Backend: handler menangani HTTP/validasi; service menangani invariant domain, database, dan transaksi. Hindari class/factory/interface untuk satu implementasi.
- Router frontend bukan batas keamanan. Sesi, role, Origin, ownership, dan validasi input tetap diperiksa di backend.
- Jangan reset database, mengubah baseline migrasi, atau mengedit metadata migrasi dengan tangan. Perubahan schema membutuhkan migrasi tersendiri dan tes integrasi.
- Jangan menyimpan profil/progres hanya di localStorage. EXP, akurasi, dan Latveria Score tidak boleh disajikan sebagai skor resmi UTBK.

ESLint menolak import backend dari frontend/shared, native alert/confirm, `<dialog>` baru, dan penandaan modal manual `role="dialog"`. Pemeriksaan ini melengkapi validasi ukuran file; ia tidak menggantikan pemeriksaan alur/ownership di API.

## 4. Style dan formatting

- Formatter tunggal adalah oxfmt dengan `.oxfmtrc.json`: 2 spasi, print width 100, kutip ganda, titik koma, trailing comma, dan LF.
- Jalankan `bun run format` setelah edit. Jangan menambah Prettier/Biome atau aturan formatter paralel.
- Ikuti nama, tipe, dan pola modul di sekitarnya. Gunakan nama yang menjelaskan fungsi, bukan istilah generik seperti `manager`, `engine`, atau `helpers` tanpa domain.
- Untuk kode TypeScript baru gunakan tipe yang jelas. Jangan memakai `any`, `@ts-ignore`, cast berlapis, atau menonaktifkan lint untuk menutupi masalah.
- Pertahankan validasi shared Zod dan validasi ulang backend. Error yang menghambat penyimpanan harus terlihat; jangan memakai catch kosong pada operasi tulis.
- Komentar menjelaskan alasan/invariant, bukan mengulang kode. Hapus debug log, fixture sementara, dan kode mati sebelum commit.

## 5. UI/UX dan atomic design

- Kembangkan komponen shadcn/Radix yang ada di `components/ui` sebelum membuat primitive baru.
- Komposisi reusable berada di `components`; controller halaman berada di `views`/`app`. Jangan membuat folder atom/molecule/organism hanya untuk memenuhi nama pola.
- Modal form/informasi memakai `AppDialog`; konfirmasi tindakan memakai `ConfirmDialog`; popup berjangkar memakai `Popover`.
- Jangan membuat backdrop/focus trap manual, native `confirm`/`alert`, atau `<dialog>` terpisah. Kalkulator non-modal tetap memakai primitive Dialog bersama.
- Gunakan `Button`, `Input`, `Textarea`, `Select`, komponen dashboard, dan shell bersama untuk peran yang sesuai. Native radio/checkbox/fieldset tetap boleh digunakan dengan label yang benar.
- Pertahankan nama/logo latveriacademy, token tema hijau gelap/emas/perkamen, dan aksen hijau landing. Jangan mengganti visual world di luar scope.
- Setiap alur memiliki state loading, empty, error, pending, dan success yang relevan. Cegah submit berulang; jangan hilangkan draft saat request gagal.
- Semua kontrol dapat dipakai dengan keyboard, memiliki nama accessible, dan fokus terlihat. Modal menjaga fokus dan mengembalikannya ke opener.
- Periksa desktop dan mobile. Kontrol sentuh minimal 44 px; jangan memotong aksi penting atau membuat horizontal overflow.
- Motion menghormati reduced motion. GSAP untuk efek yang memerlukannya; CSS untuk interaksi sederhana. Animasi tidak boleh mengendalikan state domain.
- Jangan menampilkan status, skor, rekomendasi, telemetry, atau copy promosi palsu. Library adalah materi, Drilling latihan, dan Battle World tryout.

## 6. Aturan commit

- **Satu commit = satu concern**, dengan pesan Conventional Commit: `type(scope): ringkasan` atau `type: ringkasan`.
- Tipe yang diperbolehkan: `feat`, `fix`, `refactor`, `style`, `test`, `docs`, `chore`, `build`, `ci`, `perf`, `revert`. Scope memakai nama modul, misalnya `web`, `api`, `ui`, `runtime`, atau `tooling`.
- Subject maksimal 100 karakter; target 72. Hindari pesan `update`, `fix stuff`, atau daftar beberapa fitur yang tidak berkaitan.
- Maksimal **500 baris ditambah + dihapus** dan **10 file** per commit biasa. Lockfile dan metadata migrasi generated tidak dihitung; aset binary tidak masuk hitungan baris.
- Pisahkan formatting dari perubahan perilaku. Pisahkan dependency/tooling, perubahan schema, fitur UI, perbaikan bug, dan dokumentasi jika dapat berdiri sendiri.
- Commit harus bisa dipahami dan diverifikasi secara mandiri. Jangan memecah kode pada batas yang membuat import, dependency, atau API rusak.
- Pengecualian ukuran hanya untuk formatting, pemindahan/extraction mekanis, atau generated code. Gunakan trailer `Change-Size-Exception: formatting|mechanical-refactor|generated-code` dan `Exception-Reason: alasan yang konkret`. Pengecualian bukan izin mencampur fitur atau menghindari pemisahan file.
- Sebelum commit periksa `git status`, `git diff`, riwayat pesan, dan `git diff --cached`. Stage path yang dituju secara eksplisit; jangan menggunakan `git add .` tanpa review seluruh perubahan.
- Jangan commit `.env`, secret, hasil build/cache, atau catatan agent pribadi. Jangan force-push, skip hooks, atau amend commit yang sudah dibagikan.
- Setelah membuat commit jalankan `bun run check:commits`; untuk seluruh rangkaian sebelum push gunakan `bun run check:commits -- origin/main..HEAD`.
- Tautkan commit/PR ke issue menggunakan `Refs #<nomor>`. Hindari keyword penutupan otomatis sebelum verifikasi CI selesai.

CI memeriksa format pesan dan batas diff. Aturan ukuran berlaku sejak dokumen ini diperkenalkan; commit lama tidak dinilai ulang. Menghapus dokumen aturan tidak menonaktifkan pemeriksaan untuk commit yang sudah berada setelah adopsi.

## 7. Verifikasi dan serah terima

```sh
bun run format
bun run check
bun run check:commits -- origin/main..HEAD
```

- Perubahan API/auth/database juga menjalankan `bun run test:integration`. Perubahan runtime/Docker/proxy juga menjalankan build image dan `bun run test:containers` pada database uji terpisah.
- Gunakan `bun run test`, bukan mengganti suite Vitest dengan runner `bun test`.
- Bug atau logika non-trivial harus memiliki check yang gagal pada bug tersebut: tes terarah atau script integrasi yang dapat dijalankan ulang. Jangan menambah tes yang hanya menyalin implementasi.
- Untuk UI, verifikasi interaksi nyata saat diperlukan: keyboard/fokus, desktop/mobile, pending/error, dan console. Jangan mengklaim pengujian yang tidak dijalankan.
- Jika check gagal, perbaiki atau jelaskan blocker. Jangan menutup issue atau menyatakan selesai hanya karena kode sudah ditulis.
- Push setelah verifikasi lokal. Setelah **setiap push**, cari workflow untuk SHA commit yang baru dipush (`gh run list --commit <sha>`) dan tunggu semua job wajib berhasil (`gh run watch <run-id> --exit-status`). CI commit sebelumnya bukan bukti keberhasilan commit terbaru.
- Jika CI gagal, baca log job yang gagal, perbaiki penyebabnya, buat commit baru, push, dan verifikasi CI lagi. Jangan melewati atau menonaktifkan pemeriksaan untuk membuat CI hijau.
- Tutup issue hanya setelah perubahan dipush dan CI wajib berhasil; sertakan commit dan bukti verifikasi. Jika CI terblokir atau tidak terpicu, biarkan issue terbuka dan laporkan blocker, bukan mengklaim berhasil.
- Ringkasan akhir menyebut perubahan, pemeriksaan yang benar-benar dijalankan, status/URL CI, dan batasan yang masih ada.
