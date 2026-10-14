import type { QuestionImport } from "@latveria/shared";

export const mathNotationExamples = [
  {
    name: "Limit satu sisi dan pecahan besar",
    prompt: String.raw`Nilai $\displaystyle \lim_{x \to 2^+} \frac{3}{x-2}$ adalah ...`,
    options: [String.raw`$+\infty$`, String.raw`$-\infty$`, "$0$", "$3$", String.raw`$1$`],
    correctAnswer: 0,
    explanation:
      "Saat x mendekati 2 dari kanan, x − 2 bernilai positif dan mendekati nol. Hasil bagi menuju tak hingga positif.",
  },
  {
    name: "Penjumlahan pecahan",
    prompt: String.raw`Hasil $\displaystyle \frac{2}{3} + \frac{1}{6}$ adalah ...`,
    options: [
      String.raw`$\frac{1}{2}$`,
      String.raw`$\frac{2}{3}$`,
      String.raw`$\frac{5}{6}$`,
      "$1$",
      String.raw`$\frac{3}{4}$`,
    ],
    correctAnswer: 2,
    explanation: "Samakan penyebut: 2/3 = 4/6, sehingga 4/6 + 1/6 = 5/6.",
  },
  {
    name: "Akar dan pangkat",
    prompt: String.raw`Nilai $\sqrt{49} + 2^3$ adalah ...`,
    options: ["13", "14", "15", "16", "17"],
    correctAnswer: 2,
    explanation: "Akar kuadrat 49 adalah 7, sedangkan 2 pangkat 3 adalah 8. Jumlahnya 15.",
  },
  {
    name: "Integral dengan batas",
    prompt: String.raw`Nilai $\displaystyle \int_{0}^{2} x\,dx$ adalah ...`,
    options: ["1", "2", "3", "4", "5"],
    correctAnswer: 1,
    explanation: "Antiturunan x adalah x²/2. Nilainya pada batas 2 dan 0 menghasilkan 2 − 0 = 2.",
  },
  {
    name: "Penjumlahan sigma",
    prompt: String.raw`Nilai $\displaystyle \sum_{k=1}^{4} k$ adalah ...`,
    options: ["4", "6", "8", "10", "12"],
    correctAnswer: 3,
    explanation: "Jumlahkan 1 + 2 + 3 + 4 = 10.",
  },
  {
    name: "Rumus blok dengan beberapa baris",
    prompt: String.raw`Tentukan nilai $x$ dari persamaan berikut.
$$\begin{aligned}2x + 3 &= 11 \\ 2x &= 8 \\ x &= ?\end{aligned}$$`,
    options: ["2", "4", "6", "8", "10"],
    correctAnswer: 1,
    explanation: "Kurangi kedua sisi dengan 3, lalu bagi dengan 2. Diperoleh x = 4.",
  },
];

export const mathImportExample: QuestionImport = {
  groups: [
    {
      subtes: "penalaran-matematika",
      packageName: "Paket Rumus Matematika",
      category: "Notasi matematika",
      questions: mathNotationExamples.map(({ name: _name, ...question }) => ({
        ...question,
        source: "Contoh format rumus matematika",
      })),
    },
  ],
};
