# Deployment image terpisah (Staging & Production)

GitHub Actions menjalankan `bun run check`, migrasi/seed/tes integrasi PostgreSQL dan WebSocket, lalu membangun dan menguji container aplikasi. Setelah seluruh pemeriksaan lolos, publikasi image multiplatform (AMD64 & ARM64) ke GitHub Packages (GHCR) dilakukan:

- `ghcr.io/latveriacademy/latveria-frontend`
- `ghcr.io/latveriacademy/latveria-backend`
- `ghcr.io/latveriacademy/latveria-tex-worker`

### Strategi Tag Image

- **Staging**: dipicu saat push ke branch `staging`. Menghasilkan tag `:staging` dan `:staging-<sha>`.
- **Production**: dipicu saat push ke branch `main` atau tag Git `v*` (misal `v1.0.0`). Menghasilkan tag `:latest`, `:sha-<sha>`, serta semver tag (`:v1.0.0`, `:1.0`, dll).

Frontend Nginx melayani SPA dan mem-proxy `/api/*` serta WebSocket ke backend Bun pada port 3001. TeX worker internal berjalan pada port 3002.

---

## 1. Setup Staging Server

Staging memakai `compose.staging.yaml` dan image dengan tag `IMAGE_TAG=staging`.

```sh
mkdir -p apps/api
cp deploy/env.staging.example apps/api/.env.staging
```

1. Isi `POSTGRES_PASSWORD`, URL database, dan `BETTER_AUTH_SECRET` (generate dengan `openssl rand -hex 32`).
2. Tentukan `BETTER_AUTH_URL` (contoh: `https://staging.latveria.example.com`).
3. Port web default staging adalah `8081` (`WEB_PORT=8081`), reverse-proxy host diarahkan ke `127.0.0.1:8081`.
4. Untuk autentikasi GHCR private pada Watchtower, isi `GHCR_USER` (username GitHub) dan `GHCR_PAT` (Personal Access Token dengan scope `read:packages`). Alternatif: arahkan `DOCKER_CONFIG_PATH=/home/ubuntu/.docker/config.json`.
5. Jalankan compose:

```sh
docker compose --env-file apps/api/.env.staging -f compose.staging.yaml up -d --wait
```

Service `migrator` akan otomatis menjalankan `bun scripts/migrate-db.ts` sebelum `backend` start. Untuk inisialisasi awal bank soal contoh, jalankan seed sekali:

```sh
docker compose --env-file apps/api/.env.staging -f compose.staging.yaml run --rm backend bun scripts/seed-db.ts
```

### Auto-update Staging via Watchtower

Container `watchtower` (`nickfedor/watchtower`) otomatis memonitor image `:staging` di GHCR (default tiap 120 detik). Ketika ada push baru di branch `staging`, Watchtower akan menarik image baru dan me-restart container aplikasi yang berlabel `com.centurylinklabs.watchtower.enable=true`.

---

## 2. Setup Production Server

Production memakai `compose.production.yaml` dan image dengan tag `IMAGE_TAG=latest` atau semantic version.

```sh
mkdir -p apps/api
cp deploy/env.production.example apps/api/.env.production
```

1. Isi `POSTGRES_PASSWORD`, URL database, dan `BETTER_AUTH_SECRET`.
2. Tentukan `BETTER_AUTH_URL` (contoh: `https://latveria.example.com`).
3. Port web default production adalah `8080` (`WEB_PORT=8080`), reverse-proxy host diarahkan ke `127.0.0.1:8080`.
4. Isi kredensial GHCR private (`GHCR_USER` & `GHCR_PAT`) untuk Watchtower.
5. Jalankan compose:

```sh
docker compose --env-file apps/api/.env.production -f compose.production.yaml up -d --wait
```

Service `migrator` otomatis menjalankan migrasi skema database yang belum diterapkan sebelum service `backend` aktif.

---

## 3. Update Manual dan Rollback

Jika ingin memperbarui secara manual atau rollback ke commit SHA tertentu:

1. Ubah `IMAGE_TAG` pada file `.env` (misalnya `IMAGE_TAG=sha-abc1234...`).
2. Jalankan:

```sh
docker compose --env-file apps/api/.env.production -f compose.production.yaml pull
docker compose --env-file apps/api/.env.production -f compose.production.yaml up -d --wait
```

Untuk melihat log:

```sh
docker compose --env-file apps/api/.env.production -f compose.production.yaml logs -f backend frontend
```

---

## 4. Memeriksa image lokal

```sh
docker build -f apps/api/Dockerfile -t latveria-backend:local .
docker build -f apps/web/Dockerfile -t latveria-frontend:local .
docker build -f apps/tex-worker/Dockerfile -t latveria-tex-worker:local .
```

`bun run test:containers` menjalankan smoke test lengkap container: assets, deep link, proxy API, proteksi signup produksi, dan kompilasi TeX nyata.
