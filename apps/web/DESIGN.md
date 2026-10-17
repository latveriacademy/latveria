# Public pages: editorial eksperimental

Scope: `/` dan `/tentang`. Dashboard, login, dan admin mengikuti sistem UI yang sudah ada.

## Direction contract

**THESIS:** Proses memahami menjadi pengalaman visual. Index menunjukkan sebuah pola terbuka; Tentang Kami menjelaskan prinsip belajarnya.

**OWN-WORLD:** Perkamen/hijau, huruf serif editorial besar, bidang hijau solid, catatan kertas miring, CTA hijau dengan panah. Tanpa bracket dekoratif, statistik atau testimonial buatan.

**STORY:** Kenali ruang latihan UTBK, ikuti perubahan cara melihat soal, lalu mulai latihan. Halaman Tentang Kami memiliki alur mandiri.

**FIRST VIEWPORT:** Index menggunakan headline dua baris bergeser, penjelasan dan CTA di kiri bawah, ilustrasi buku di kanan bawah. Tentang Kami menggunakan tiga baris bertingkat dengan lambang terpisah.

**FORM:** Arah editorial eksperimental dipilih pengguna; pengembangan identitas aktif, bukan pergantian brand. Implementasi code-led.

**FINISH:** Reviewer menyetujui setelah perbaikan ukuran kertas mobile dan kontras fokus pada bidang hijau (hasil review disampaikan dalam handoff). Perilaku implementasi dan asal aset dicatat di bawah.

## Implementasi

- Shell bersama: `src/app/landing/public-shell.tsx`; nav menggunakan active state React Router, skip link, judul per halaman, dan scroll ke awal/hash setelah navigasi.
- Index: `landing.tsx` serta `learning-story.tsx`. Bidang hijau berisi catatan sticky mulai lebar 768px dengan tiga bab. Di bawah 768px, catatan lengkap berada dalam alur halaman: lebar 100%, maksimum 440px, tinggi 440px, lalu bab berurutan. Berikutnya contoh interaktif, tautan tiga mode latihan, dan CTA penutup.
- Tentang Kami: `about.tsx`; pembuka, gagasan, tiga prinsip, dan ajakan belajar. Tidak mengarang tim atau sejarah organisasi.
- Motion: GSAP matchMedia dengan scope root dan cleanup saat pergantian route; masked reveal dan parallax hanya tanpa reduced motion. Pengungkapan pola mengikuti scroll hanya mulai lebar 768px. Reduced motion melewati animasi GSAP serta menonaktifkan animasi/transisi CSS; contoh interaktif tetap dibuka lewat tombol.
- Aksesibilitas: skip link menuju main yang dapat menerima fokus, navigasi berlabel, dan outline fokus 2px berjarak 6px. Tombol contoh pada bidang hijau memakai outline terang `#d8eabf`. Tombol native mengubah `aria-expanded` dan panel `hidden` melalui `aria-controls`. Catatan animasi disembunyikan dari pembaca layar; isi penalarannya tersedia dalam tiga bab teks. Ilustrasi hero memiliki label aksesibel.
- Warna menggunakan token tema terang/gelap untuk permukaan normal. Bidang hijau tetap `#234f38`, teks utama `#f2f2df` (Index) / `#f1f1df` (Tentang Kami), aksen `#c1db9e`.
- Logo berasal dari aset proyek `src/assets/latveria.webp`; buku dan diagram memakai SVG inline lokal, lembar catatan memakai HTML/CSS. Tidak ada foto stok atau raster baru.
