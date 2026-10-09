# Impor Tryout, skor simulasi, dan kalibrasi IRT

## Impor yang sama dengan Bank soal

Admin → Tryout → Kelola Subtes → **Impor Soal** membuka halaman penuh dengan editor, unggah file, contoh, panduan, dan ringkasan. Tujuan Tryout sudah dipilih. Pilih satu subtes atau gunakan subtes dari JSON untuk batch lintas section.

Format `groups` sama dengan Bank soal. `packageName`/`packageId` di JSON tidak membuat atau mengubah paket tujuan: soal masuk ke Tryout yang sedang dibuka. Format lama `{ "questions": [...] }` tetap diterima ketika satu subtes dipilih. `subtest` pada format lama, bila ada, harus cocok dengan tujuan.

```json
{
  "groups": [
    {
      "subtes": "penalaran-umum",
      "category": "Penalaran",
      "questions": [
        {
          "prompt": "Jika semua A adalah B, pernyataan mana yang benar?",
          "options": [
            "Semua A adalah B",
            "Tidak ada A",
            "Semua B adalah A",
            "Tidak ada B",
            "A dan B tidak berkaitan"
          ],
          "correctAnswer": 0,
          "explanation": "Pernyataan pertama mengulang informasi yang diberikan.",
          "source": "Soal contoh"
        }
      ]
    }
  ]
}
```

- Batas 100 soal **total** dan 200.000 byte per batch, divalidasi ulang di backend.
- Pilihan ganda memakai lima opsi unik A–E; kunci indeks 0–4 atau huruf A–E diterima pada impor Tryout.
- Stimulus, wacana, benar/salah kompleks dan anotasi Lexicon LBE dipertahankan. Referensi wacana Bank soal disalin agar Tryout tidak bergantung pada sumber mutable.
- Anotasi Lexicon tersedia pada review yang selesai; definisi tidak dikirim ketika Tryout masih aktif.
- Semua grup dan relasi section disimpan atomik. Subtes yang belum dikonfigurasi atau tujuan yang tidak cocok membatalkan seluruh batch.

## Skor simulasi dasar

Sesi baru menggunakan `utbk-simulation-v1`. Pilihan ganda memiliki maksimum satu poin: benar 1, salah/kosong 0. Untuk benar/salah kompleks, `per_statement` memberi poin per pernyataan; `all_or_nothing` memberi poin hanya jika semua pernyataan benar. Nilai `scoring.points` dihormati.

**Skor subtes = poin diperoleh / poin maksimum × 1.000.** Durasi tidak memberi bonus atau penalti. Benar penuh, sebagian benar, salah, dan kosong dilaporkan terpisah; akurasi adalah persentase soal benar penuh.

Rata-rata skor tujuh subtes dihitung dengan bobot subtes sama, bukan bobot jumlah soal. Label UTBK lengkap hanya muncul jika seluruh tujuh subtes resmi selesai. Paket dengan cakupan lebih kecil menampilkan rata-rata subtes Tryout.

EXP dan progres latihan tetap terpisah. Skor simulasi dan skala IRT latveriacademy **bukan skor resmi atau prediksi skor UTBK**.

Halaman hasil menampilkan radar tujuh subtes, ringkasan jawaban, dan rincian skor; status kalibrasi berada pada bagian yang dapat dibuka. Radar tidak mengisi subtes yang belum tersedia dengan skor nol. Nilai terakhir dapat dibuka dari panel **Tryout terakhir** di Basecamp/Battle World dan kartu paket yang ditandai **Sudah dikerjakan**. Tautan hasil mendukung reload dan tombol Back browser, tetap baca-saja, serta menjaga penunjuk sesi aktif lainnya.

## Versi soal, respons, dan hasil

Saat sesi dimulai, backend menyimpan/reuse revisi konten soal berdasarkan hash, termasuk wacana resolved, kunci dan aturan penilaian. Perubahan penempatan/urutan saja tidak membuat revisi konten baru. Snapshot kunci tidak dikirim saat sesi aktif.

Respons subtes disimpan dalam transaksi bersama laporan hasil. Laporan yang selesai dibaca dari snapshot, bukan dihitung ulang memakai kunci terbaru. Edit/hapus soal di Bank soal tidak mengubah review sesi baru yang sudah dimulai. **Riwayat Tryout** membuka hasil milik peserta tanpa membuat sesi atau memberikan EXP lagi.

Sesi lama dengan `scoringVersion = legacy` tetap menggunakan Skor Latveria sebelumnya. Tidak ada backfill atau konversi nilai lama.

## IRT 2PL

Model probabilitas: `P(benar | θ) = logistic(a × (θ − b))`. Parameter `a` adalah daya pembeda, `b` kesulitan. Backend mengestimasi θ dengan EAP, prior normal standar, quadrature −6 hingga 6 dengan langkah 0,05 dan log-likelihood stabil. Standard error posterior ikut disimpan.

Skala simulasi IRT: `round(500 + 100 × θ)`, dibatasi 0–1.000. Ini adalah definisi skala aplikasi, bukan transformasi resmi SNPMB. IRT bukan penjumlahan bobot kesulitan soal.

- Hanya respons dikotomis yang masuk 2PL: pilihan ganda atau benar/salah `all_or_nothing`.
- Benar/salah dengan kredit parsial tetap memakai skor dasar; tidak dipaksa menjadi data 0/1.
- Model hanya berlaku pada revisi soal yang terkalibrasi. Revisi baru yang belum tercakup memakai skor dasar.
- Model aktif di-snapshot saat sesi dimulai. Aktivasi/nonaktivasi berikutnya tidak mengubah sesi tersebut.
- Skor IRT per subtes dapat tersedia lebih dahulu. Rata-rata IRT UTBK hanya menjadi skor utama ketika tujuh subtes selesai dan semuanya terkalibrasi; skor dasar tidak dicampur ke rata-rata IRT.

## Kalibrasi offline dengan mirt

Admin → Tryout → **Kalibrasi IRT** menyediakan statistik respons, ekspor dataset, impor artefak, pemeriksaan parameter dan aktivasi versi model.

Dataset hanya memakai respons pertama per peserta/revisi dari sesi yang selesai. Akun demo dan admin dikecualikan; salah/kosong menjadi 0. Identitas peserta pada ekspor berupa hash, tanpa nama/email. Ambang awal aplikasi:

- ≥200 responden, ≥10 soal layak, ≥100 respons per soal.
- Tingkat benar tiap soal 5–95%; peserta harus mempunyai respons pada minimal lima soal dan setengah item dataset.
- Model konvergen, RMSEA ≤0,10, reliabilitas marginal ≥0,60.
- Daya pembeda 0,25–3 dan kesulitan −4–4.

Ambang ini adalah gate operasional awal, bukan jaminan validitas psikometrik atau aturan SNPMB. Tinjauan dimensionalitas, ketergantungan antarsoal, kualitas konten, cohort dan linking antarform tetap diperlukan sebelum membandingkan populasi/versi model berbeda.

Pada mesin kalibrasi, pasang R serta paket `mirt` dan `jsonlite`:

```sh
Rscript -e 'install.packages(c("mirt", "jsonlite"), repos="https://cloud.r-project.org")'
Rscript apps/api/scripts/calibrate-irt.R dataset.json calibration.json versi-model
```

Impor `calibration.json` di admin, tinjau parameter dan diagnostik, lalu aktifkan. Artefak harus mengacu ke ID dan hash dataset yang terdaftar, dengan cakupan revisi yang sama. Mengimpor saja tidak mengaktifkan model; hanya satu model aktif per subtes. Kalibrasi berjalan offline, tidak pada request API.

Jika data belum cukup, ekspor ditolak dengan jumlah responden/item layak. Tidak ada parameter atau skor IRT buatan sebagai fallback. Tetap gunakan skor simulasi dasar sambil mengumpulkan respons.

## Pemeriksaan

`bun run check` memeriksa engine dan kontrak. `bun run test:integration` memakai fixture tersendiri untuk impor, snapshot soal, hasil/riwayat, cohort sintetis 200 peserta, provenance, pengecualian demo, dan aktivasi model. Fixture sintetis bukan kalibrasi produksi dan dibersihkan setelah pengujian.

Acuan: [struktur UTBK SNPMB](https://snpmb.id/utbk-snbt/informasi-umum), [kalibrasi mirt](https://philchalmers.github.io/mirt/docs/reference/mirt.html), dan [estimasi EAP](https://philchalmers.github.io/mirt/docs/reference/fscores.html).
