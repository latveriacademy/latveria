import postgres from "postgres";
import { getDatabaseUrl } from "../src/lib/env";

async function main() {
  const sql = postgres(getDatabaseUrl("DATABASE_URL"), {
    prepare: false,
    max: 1,
    connect_timeout: 10,
  });
  try {
    await sql`select 1`;
    console.info("Koneksi PostgreSQL berhasil. Tidak ada data yang diubah.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch(() => {
  console.error(
    "Pemeriksaan database gagal. Periksa DATABASE_URL, kredensial, SSL, dan akses jaringan di .env.local.",
  );
  process.exitCode = 1;
});
