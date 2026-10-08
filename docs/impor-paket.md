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
          "options": ["10", "15", "20", "25", "30"],
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
- `correctAnswer`: indeks 0–4 untuk opsi A–E. Pada contoh, indeks `2` menunjuk opsi ketiga, yaitu `20`.

Untuk beberapa paket atau materi, tambahkan grup ke array `groups`. Dua grup dengan `subtes` dan `packageName` sama masuk ke paket yang sama. Nama paket yang sama pada subtes berbeda dianggap paket berbeda.

## Alur impor

1. Pilih **Paket yang ditentukan dalam JSON**, atau **Satu paket yang sudah ada**. Pada opsi kedua, seluruh grup harus memakai subtes tujuan; pilihan paket di form berlaku untuk seluruh soal.
2. Tempel JSON, unggah file, atau gunakan contoh sederhana, rumus, atau geometri. **Unduh contoh JSON** menyediakan file dari contoh yang dipilih.
3. Tekan **Periksa JSON**. Ringkasan menunjukkan nama paket, subtes, kategori, jumlah soal, dan paket yang akan dibuat.
4. Tekan **Impor … soal**. Impor satu paket membuka halaman paket tersebut; impor beberapa paket kembali ke bank soal.

Batas setiap impor: **100 soal dan 200 KB**, lima opsi unik A–E per soal. Backend memvalidasi ulang tujuan paket dan isi soal. Semua pembuatan paket dan penyisipan soal dilakukan dalam satu transaksi; kegagalan tidak menyimpan sebagian batch. Mengimpor file yang sama lagi akan menambah salinan soal, bukan memperbarui soal sebelumnya.

## Menulis rumus agar mudah dibaca

Rumus bisa dipakai pada `prompt`, setiap string dalam `options`, dan `explanation`. Halaman impor menyediakan enam contoh lengkap lewat **Gunakan contoh rumus**, serta pratinjau dan cuplikan JSON pada **Panduan impor → Rumus matematika**.

| Bentuk                | Kegunaan                                                                          |
| --------------------- | --------------------------------------------------------------------------------- |
| `$...$`               | Rumus menyatu dengan kalimat, cocok untuk pangkat atau akar singkat.              |
| `$\displaystyle ...$` | Limit, pecahan, integral, dan sigma tampil lebih besar, tetap di dalam kalimat.   |
| `$$...$$`             | Rumus pada baris tersendiri, cocok untuk persamaan panjang atau beberapa langkah. |

### Backslash: editor soal dan JSON berbeda

- **Editor soal biasa:** tulis satu backslash, misalnya `$\frac{1}{2}$`.
- **JSON:** tulis dua backslash, misalnya `"$\\frac{1}{2}$"`.
- **Baris baru dalam string JSON:** tulis `\n`. Jangan menekan Enter di tengah string JSON tanpa escaping.
- **Pemisah baris LaTeX `aligned`:** dua backslash dalam sumber LaTeX menjadi empat backslash dalam JSON.

Gunakan cuplikan berikut sebagai field pada objek soal, bukan sebagai keseluruhan file impor.

### Limit satu sisi

```json
"prompt": "Nilai $\\displaystyle \\lim_{x \\to 2^+} \\frac{3}{x-2}$ adalah ..."
```

`2^+` berarti mendekati 2 dari kanan. `\displaystyle` membuat notasi limit dan pecahan lebih mudah dibaca. Contoh opsi:

```json
"options": ["$+\\infty$", "$-\\infty$", "$0$", "$3$", "$1$"],
"correctAnswer": 0
```

### Pecahan, akar, dan pangkat

```json
"prompt": "Hasil $\\displaystyle \\frac{2}{3} + \\frac{1}{6}$ adalah ..."
```

```json
"prompt": "Nilai $\\sqrt{49} + 2^3$ adalah ..."
```

### Integral dan sigma

```json
"prompt": "Nilai $\\displaystyle \\int_{0}^{2} x\\,dx$ adalah ..."
```

```json
"prompt": "Nilai $\\displaystyle \\sum_{k=1}^{4} k$ adalah ..."
```

### Rumus blok dan langkah berurutan

```json
"prompt": "Tentukan nilai $x$ dari persamaan berikut.\n$$\\begin{aligned}2x + 3 &= 11 \\\\ 2x &= 8 \\\\ x &= ?\\end{aligned}$$"
```

`&` menyelaraskan tanda sama dengan; `\\\\` di JSON memisahkan baris LaTeX. Gunakan rumus blok untuk langkah panjang agar tidak menumpuk di dalam satu kalimat.

Diagram TikZ tetap memakai `\begin{tikzpicture} ... \end{tikzpicture}` tanpa pembungkus `$$`. Contoh geometri pada halaman impor sudah memiliki escaping JSON yang benar.
