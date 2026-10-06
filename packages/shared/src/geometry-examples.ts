export const pyramidQuestion = {
  prompt: String.raw`Atap limas segiempat beraturan memiliki alas persegi bersisi $8$ m dan tinggi limas $3$ m. Jika $1\text{ m}^2$ membutuhkan 15 genteng, berapa total genteng untuk keempat sisi tegak atap tersebut?

\begin{tikzpicture}
% alt: Limas persegi sisi alas 8 m, tinggi 3 m, apotema 5 m.
\draw (0,0)--(4,-2)--(8,0)--(4,2)--cycle;
\draw (0,0)--(4,5)--(8,0);
\draw[dashed] (4,-2)--(4,5)--(4,2);
\draw[dashed] (4,0)--(4,5);
\node[below] at (4,-2) {$8\text{ m}$};
\node[right] at (4,2.5) {$5\text{ m}$};
\node[left] at (4,0) {$3\text{ m}$};
\end{tikzpicture}`,
  options: ["900 genteng", "1.050 genteng", "1.200 genteng", "1.350 genteng", "1.500 genteng"],
  correctAnswer: 2,
  explanation: String.raw`Tinggi sisi tegak (apotema) adalah $\sqrt{3^2+4^2}=5$ m. Luas satu sisi $=\frac12\times8\times5=20$ m². Luas empat sisi $=4\times20=80$ m². Jumlah genteng $=80\times15=1200$.`,
  source: "Contoh buatan tim",
} as const;

export const openCuboidQuestion = {
  prompt: String.raw`Nipon sedang merancang sebuah wadah prototipe alat elektronik berbentuk balok tanpa tutup. Wadah tersebut memiliki panjang $15\text{ cm}$, lebar $10\text{ cm}$, dan tinggi $8\text{ cm}$. Bagian dalam wadah akan dilapisi bahan isolator khusus dengan biaya Rp500,00 per $\text{cm}^2$. Berapa total biaya yang dibutuhkan?

\begin{tikzpicture}
% alt: Balok tanpa tutup, panjang 15 cm, lebar 10 cm, tinggi 8 cm.
\draw (0,0)--(4,0)--(4,3)--(0,3)--cycle;
\draw (4,0)--(5.5,1.5)--(5.5,4.5)--(4,3);
\draw (0,3)--(1.5,4.5)--(5.5,4.5);
\draw[dashed] (0,0)--(1.5,1.5)--(5.5,1.5);
\draw[dashed] (1.5,1.5)--(1.5,4.5);
\node[below] at (2,0) {$15\text{ cm}$};
\node[below right] at (4.75,0.75) {$10\text{ cm}$};
\node[left] at (0,1.5) {$8\text{ cm}$};
\end{tikzpicture}`,
  options: ["Rp200.000,00", "Rp275.000,00", "Rp350.000,00", "Rp425.000,00", "Rp500.000,00"],
  correctAnswer: 1,
  explanation: String.raw`Luas tanpa tutup $=(15\times10)+2(15\times8+10\times8)=550$ cm². Biaya $=550\times500=\text{Rp}275.000,00$.`,
  source: "Contoh buatan tim",
} as const;

export const cylinderTankQuestion = {
  prompt: String.raw`Sebuah pabrik pengolahan air di kota Dumai memiliki tangki berbentuk tabung dengan jari-jari alas $7\text{ m}$ dan tinggi $10\text{ m}$. Tangki berisi air sebanyak $\frac{3}{5}$ kapasitasnya. Jika air dipompa keluar dengan kecepatan $154\text{ m}^3$ per jam, berapa lama hingga tangki kosong? Gunakan $\pi=\frac{22}{7}$.

\begin{tikzpicture}
% alt: Tabung berjari-jari 7 meter dan tinggi 10 meter, terisi air sampai tiga perlima tinggi.
\draw (-2,0)--(-2,5);
\draw (2,0)--(2,5);
\draw (0,5) ellipse (2 and 0.5);
\draw[dashed] (0,0) ellipse (2 and 0.5);
\draw[dashed] (-2,3)--(2,3);
\draw[dashed] (0,0)--(2,0);
\node[above] at (1,0) {$7\text{ m}$};
\node[right] at (2.6,2.5) {$10\text{ m}$};
\node[left] at (-2,3) {$\frac{3}{5}\text{ penuh}$};
\end{tikzpicture}`,
  options: ["4 jam", "5 jam", "6 jam", "8 jam", "10 jam"],
  correctAnswer: 2,
  explanation: String.raw`Volume tangki $=\frac{22}{7}\times7^2\times10=1540$ m³. Air yang harus dipompa $=\frac{3}{5}\times1540=924$ m³. Waktu $=924\div154=6$ jam.`,
  source: "Contoh buatan tim",
} as const;
