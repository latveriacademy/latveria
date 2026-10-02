# Mengelola paket dan impor JSON

Di **Admin → Ringkasan**, pilih subtes untuk membuka daftar paket. Buat paket baru, kemudian isi menggunakan **Buat soal**, **Impor JSON**, atau **Tambahkan dari bank soal**. Form soal dan impor yang dibuka dari paket sudah memilih tujuan paket tersebut.

Soal bank dapat dipilih dari seluruh halaman pada subtes yang sama. Memilih soal dari paket lain memindahkannya, bukan membuat salinan. **Keluarkan dari paket** hanya melepas keanggotaan; soal tetap ada di bank soal. Status, nama, deskripsi, dan urutan ada di bagian **Pengaturan paket**. Paket berisi soal dapat dinonaktifkan; untuk menghapusnya, pindahkan atau keluarkan soalnya dahulu.

## Contoh JSON siap pakai

Simpan sebagai `contoh-impor-paket.json`, atau tempel ke editor impor:

```json
{
  "groups": [
    {
      "subtes": "pengetahuan-kuantitatif",
      "packageName": "Paket Persentase",
      "category": "Persentase",
      "questions": [
        {
          "prompt": "Berapakah 25 persen dari 80?",
          "options": ["10", "15", "20", "25"],
          "correctAnswer": 2,
          "explanation": "25 persen sama dengan seperempat. Seperempat dari 80 adalah 20.",
          "source": "Soal contoh buatan tim"
        }
      ]
    }
  ]
}
```

- `subtes`: slug katalog, bukan nama tampilannya. Daftar slug tersedia pada panduan di halaman impor.
- `packageName`: nama paket pada subtes tersebut. Jika sudah ada, soal ditambahkan; jika belum ada, paket dibuat otomatis. Tanpa tujuan paket, soal masuk ke **Paket 1**.
- `packageId`: UUID paket existing, sebagai pengganti `packageName`. Jangan isi keduanya. Tujuan paket berada pada **grup**, bukan tiap soal.
- `category`: materi yang berlaku untuk seluruh soal dalam grup.
- `correctAnswer`: indeks 0–3. Pada contoh, indeks `2` menunjuk opsi ketiga, yaitu `20`.

Untuk beberapa paket atau materi, tambahkan grup ke array `groups`. Dua grup dengan `subtes` dan `packageName` sama masuk ke paket yang sama. Nama paket yang sama pada subtes berbeda dianggap paket berbeda.

## Alur impor

1. Pilih **Paket yang ditentukan dalam JSON**, atau **Satu paket yang sudah ada**. Pada opsi kedua, seluruh grup harus memakai subtes tujuan; pilihan paket di form berlaku untuk seluruh soal.
2. Tempel JSON, unggah file, atau gunakan contoh sederhana/geometri. **Unduh contoh JSON** menyediakan file yang dapat diedit.
3. Tekan **Periksa JSON**. Ringkasan menunjukkan nama paket, subtes, kategori, jumlah soal, dan paket yang akan dibuat.
4. Tekan **Impor … soal**. Impor satu paket membuka halaman paket tersebut; impor beberapa paket kembali ke bank soal.

Batas setiap impor: **100 soal dan 200 KB**, empat opsi unik per soal. Backend memvalidasi ulang tujuan paket dan isi soal. Semua pembuatan paket dan penyisipan soal dilakukan dalam satu transaksi; kegagalan tidak menyimpan sebagian batch. Mengimpor file yang sama lagi akan menambah salinan soal, bukan memperbarui soal sebelumnya.

Rumus memakai `$...$` inline atau `$$...$$` blok. Dalam JSON, backslash harus di-escape: sumber LaTeX `\frac{1}{2}` ditulis `"$\\frac{1}{2}$"`. Contoh geometri pada halaman impor sudah memiliki escaping JSON yang benar.
