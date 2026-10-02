# Deployment image terpisah

GitHub Actions menjalankan `bun run check`, migrasi/seed/tes integrasi PostgreSQL, lalu membangun dan menguji kedua container. Setelah seluruh pemeriksaan lolos, push `main` atau tag `v*` menerbitkan image AMD64 dan ARM64:

- `ghcr.io/latveriacademy/latveria-frontend`
- `ghcr.io/latveriacademy/latveria-backend`

Tag `latest` mengikuti `main`; `sha-<SHA lengkap>` menunjuk commit tertentu; tag Git seperti `v1.0.0` dipakai pada kedua image. Publish memakai `GITHUB_TOKEN` bawaan Actions dengan izin `packages: write`.

Frontend Nginx melayani SPA pada port 8080 dan meneruskan `/api/*` ke backend Node.js 22 pada port 3001. Browser memakai satu origin; tidak diperlukan URL API pada build frontend. Image backend berisi dependency runtime, shared, CLI, dan migrasi, tanpa frontend dist atau Bun. Build/start tidak menerapkan migrasi secara otomatis.

## Penyiapan server

Server hanya memerlukan Docker Engine dan Compose v2, `compose.production.yaml`, serta `apps/api/.env.local`. Tidak perlu checkout source, memasang Bun/Node, atau build di server. Unduh Compose dan contoh env dari commit/release yang akan digunakan, lalu:

```sh
mkdir -p apps/api
cp deploy/env.production.example apps/api/.env.local
openssl rand -hex 32
```

Isi `POSTGRES_PASSWORD`, URL database, dan `BETTER_AUTH_SECRET` pada `.env.local`. Gunakan dua nilai acak terpisah untuk password dan secret; saat memindahkan DB/sesi lama, pertahankan secret lama. `DATABASE_URL` dan `DATABASE_MIGRATION_URL` memakai hostname **postgres**, bukan localhost. URL migrasi wajib menunjuk koneksi PostgreSQL langsung.

Set `BETTER_AUTH_URL` ke origin publik, misalnya `https://belajar.example.com`. Pasang reverse proxy HTTPS ke `127.0.0.1:8080`, dengan header Host asli dan `X-Forwarded-Proto: https`. Backend dan PostgreSQL tidak mengekspos port host. Untuk uji lokal tanpa HTTPS, gunakan `BETTER_AUTH_URL=http://127.0.0.1:8080`.

Jika package GHCR privat, login dengan token `read:packages` melalui `docker login ghcr.io -u USER --password-stdin`. Package juga dapat dibuat public pada pengaturan GitHub Packages agar server bisa pull tanpa token.

Untuk deployment yang dapat diulang, isi `IMAGE_TAG=sha-<SHA lengkap>` dari workflow yang berhasil. Kedua service menggunakan tag yang sama.

```sh
docker compose --env-file apps/api/.env.local -f compose.production.yaml pull
docker compose --env-file apps/api/.env.local -f compose.production.yaml up -d --wait postgres
docker compose --env-file apps/api/.env.local -f compose.production.yaml run --rm backend node --import tsx scripts/migrate-db.ts
docker compose --env-file apps/api/.env.local -f compose.production.yaml up -d --wait
```

Untuk database baru yang membutuhkan katalog dan soal contoh, jalankan seed sekali setelah migrasi:

```sh
docker compose --env-file apps/api/.env.local -f compose.production.yaml run --rm backend node --import tsx scripts/seed-db.ts
```

Seed idempoten tetapi berisi soal dummy; ia tidak membuat akun. Signup produksi tetap nonaktif, sehingga akun yang dipakai berasal dari penyiapan database sebelumnya. Perintah promosi admin yang sudah ada tetap dibatasi ke DB localhost.

Compose ini memakai PostgreSQL 17 dengan volume persisten. Untuk memindahkan database existing, pindahkan backup ke database target sebelum menjalankan migrasi; volume Compose development tidak otomatis dipakai oleh server baru.

## Update dan rollback

Untuk update, ubah `IMAGE_TAG` ke tag dari workflow sukses, lalu jalankan pull, migrasi, dan up:

```sh
docker compose --env-file apps/api/.env.local -f compose.production.yaml pull
docker compose --env-file apps/api/.env.local -f compose.production.yaml run --rm backend node --import tsx scripts/migrate-db.ts
docker compose --env-file apps/api/.env.local -f compose.production.yaml up -d --wait
docker compose --env-file apps/api/.env.local -f compose.production.yaml ps
```

Untuk rollback aplikasi, kembalikan `IMAGE_TAG` ke tag sebelumnya lalu pull dan up. Ini mengganti kedua image, bukan membatalkan migrasi SQL. Jika migrasi versi baru tidak kompatibel dengan aplikasi lama, pemulihan database memakai backup sebelum update.

```sh
docker compose --env-file apps/api/.env.local -f compose.production.yaml logs --tail=100 backend frontend
curl --fail https://belajar.example.com/api/health
```

## Memeriksa image lokal

```sh
docker build -f apps/api/Dockerfile -t latveria-backend:local .
docker build -f apps/web/Dockerfile -t latveria-frontend:local .
```

Gunakan env produksi untuk database uji terpisah dengan `IMAGE_PREFIX=latveria`, `IMAGE_TAG=local`, dan `BETTER_AUTH_URL=http://127.0.0.1:8080`. Jalankan Compose dengan project name khusus, misalnya `-p latveria-smoke`, lalu migrasi/seed dan `up -d --wait` seperti di atas. `bun run test:containers` memeriksa asset, deep link, proxy API, sesi wajib, dan signup produksi yang tertutup. `SMOKE_URL` dapat mengganti URL target tes.
