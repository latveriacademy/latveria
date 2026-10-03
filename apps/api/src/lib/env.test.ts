import { afterEach, expect, it, vi } from "vitest";
import { getDatabaseUrl } from "./env";

afterEach(() => vi.unstubAllEnvs());

it("menerima URL PostgreSQL dan memisahkan koneksi aplikasi dari migrasi", () => {
  vi.stubEnv("DATABASE_URL", "postgres://user:password@localhost:6543/postgres");
  vi.stubEnv("DATABASE_MIGRATION_URL", "postgresql://user:password@localhost:5432/postgres");
  expect(getDatabaseUrl("DATABASE_URL")).toContain(":6543/");
  expect(getDatabaseUrl("DATABASE_MIGRATION_URL")).toContain(":5432/");
});

it.each([undefined, "", "https://user:rahasia@example.com/db", "postgres://localhost/"])(
  "menolak konfigurasi tidak sah tanpa membocorkan kredensial: %s",
  (value) => {
    vi.stubEnv("DATABASE_URL", value);
    expect(() => getDatabaseUrl("DATABASE_URL")).toThrow(
      /^DATABASE_URL harus berisi URL PostgreSQL dengan host dan nama database\. Periksa \.env\.local\.$/,
    );
  },
);
