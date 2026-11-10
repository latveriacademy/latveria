import type { QuestionImport } from "@latveria/shared";

export const masterExamImportExample: QuestionImport = {
  groups: [
    {
      subtes: "penalaran-matematika",
      packageName: "Simulasi TKA & SNBT - Penalaran Matematika",
      category: "Kalkulus & Aljabar Lanjut",
      questions: [
        {
          prompt: String.raw`Diberikan fungsi $f(x) = \frac{x^2 - 4}{x - 2}$ untuk $x \neq 2$. Tentukan nilai $\displaystyle \lim_{x \to 2} f(x)$ dan hasil integral $\displaystyle \int_0^3 (2x + 1)\,dx$.`,
          options: [
            "Limit bernilai 4 dan integral bernilai 12",
            "Limit bernilai 4 dan integral bernilai 15",
            "Limit bernilai 2 dan integral bernilai 12",
            "Limit bernilai 2 dan integral bernilai 15",
            "Limit tidak terdefinisi dan integral bernilai 12",
          ],
          correctAnswer: 0,
          explanation: String.raw`Faktorkan pembilang: $\frac{(x-2)(x+2)}{x-2} = x+2$. Nilai $\lim_{x \to 2} (x+2) = 4$.
Untuk integral: $\int_0^3 (2x+1)\,dx = [x^2 + x]_0^3 = (9 + 3) - 0 = 12$. Maka jawabannya adalah limit 4 dan integral 12.`,
          source: "Modul TKA Matematika Saintek & Mandiri 2026",
        },
        {
          prompt: String.raw`Perhatikan sistem persamaan linier dua variabel berikut:
$$\begin{aligned}
3x + 2y &= 16 \\
x - 4y &= -4
\end{aligned}$$
Nilai dari $2x - y$ adalah ...`,
          options: ["5", "6", "7", "8", "9"],
          correctAnswer: 1,
          explanation: String.raw`Dari persamaan kedua diperoleh $x = 4y - 4$.
Substitusi ke persamaan pertama:
$$\begin{aligned}
3(4y - 4) + 2y &= 16 \\
12y - 12 + 2y &= 16 \\
14y &= 28 \implies y = 2
\end{aligned}$$
Maka $x = 4(2) - 4 = 4$.
Nilai $2x - y = 2(4) - 2 = 6$.`,
          source: "Bank Soal Aljabar TKA/SNBT",
        },
      ],
    },
    {
      subtes: "pengetahuan-kuantitatif",
      packageName: "Simulasi SNBT - Geometri & Diagram",
      category: "Geometri Bidang & Bangun Ruang",
      questions: [
        {
          prompt: String.raw`Perhatikan segitiga siku-siku $ABC$ pada diagram berikut:
\begin{tikzpicture}
% alt: Segitiga siku-siku ABC di A dengan AB = 4 cm dan AC = 3 cm
\draw[thick] (0,0) -- (4,0) -- (0,3) -- cycle;
\draw (0,0) rectangle (0.4,0.4);
\node[below left] at (0,0) {$A$};
\node[below right] at (4,0) {$B$};
\node[above left] at (0,3) {$C$};
\node[below] at (2,0) {$4\text{ cm}$};
\node[left] at (0,1.5) {$3\text{ cm}$};
\end{tikzpicture}
Panjang sisi miring $BC$ dan keliling segitiga $ABC$ berturut-turut adalah ...`,
          options: [
            "5 cm dan 12 cm",
            "5 cm dan 14 cm",
            "6 cm dan 13 cm",
            "7 cm dan 14 cm",
            "5 cm dan 10 cm",
          ],
          correctAnswer: 0,
          explanation: String.raw`Gunakan teorema Pythagoras:
$BC = \sqrt{AB^2 + AC^2} = \sqrt{4^2 + 3^2} = \sqrt{25} = 5\text{ cm}$.
Keliling segitiga $= AB + AC + BC = 4 + 3 + 5 = 12\text{ cm}$.`,
          source: "Simulasi Geometri SNBT 2026",
        },
      ],
    },
    {
      subtes: "literasi-bahasa-indonesia",
      packageName: "Simulasi SNBT - Literasi Indonesia",
      category: "Analisis Bacaan & Wacana Ilmiah",
      questions: [
        {
          passage:
            "Kecerdasan artifisial (AI) kini telah merambah berbagai lini kehidupan manusia, termasuk sektor pendidikan tinggi dan pengujian standar nasional. Di satu sisi, otomasi evaluasi dan pembelajaran adaptif berbasis model prediktif mampu mendeteksi kelemahan kognitif siswa secara presisi. Namun di sisi lain, ketergantungan berlebihan pada algoritma berpotensi mereduksi kemampuan metakognitif dan daya bernalar mandiri siswa jika tidak diimbangi dengan kurikulum bernalar kritis.",
          prompt:
            "Berdasarkan wacana di atas, apa gagasan utama yang disampaikan penulis mengenai pemanfaatan kecerdasan artifisial dalam pendidikan?",
          options: [
            "AI memberikan efisiensi evaluasi tetapi menuntut keseimbangan agar tidak mengikis penalaran mandiri.",
            "AI sepenuhnya merugikan siswa karena menurunkan kemampuan kognitif dasar secara permanen.",
            "Pemanfaatan AI harus dilarang total dalam pelaksanaan ujian nasional dan seleksi masuk perguruan tinggi.",
            "Otomasi penilaian adalah satu-satunya solusi mengatasi disparitas pendidikan di negara berkembang.",
            "Siswa tidak lagi memerlukan penalaran kritis karena algoritma telah memodelkan seluruh materi ujian.",
          ],
          correctAnswer: 0,
          explanation:
            "Paragraf menyajikan dua sisi: manfaat otomasi evaluasi di satu sisi, dan risiko erosi metakognitif di sisi lain jika tanpa nalar kritis. Intinya adalah pentingnya keseimbangan.",
          source: "Wacana Analisis Literasi Indonesia UTBK",
        },
      ],
    },
    {
      subtes: "literasi-bahasa-inggris",
      packageName: "Simulasi SNBT - Literasi Inggris & Vocabulary",
      category: "Academic Reading & Lexicon",
      questions: [
        {
          passage:
            "Scientific inquiry demands intellectual rigor and epistemological humility. When hypotheses falter under empirical scrutiny, researchers must relinquish obsolete paradigms rather than fabricate spurious justifications to uphold precarious theories.",
          prompt:
            "Based on the excerpt, rigorous scrutiny is essential to prevent researchers from relying on spurious justifications. In this context, the word 'spurious' most nearly means ...",
          options: [
            "Deceptive and illegitimate",
            "Authentic and verified",
            "Complicated and meticulous",
            "Redundant but accurate",
            "Innovative and pioneering",
          ],
          correctAnswer: 0,
          explanation:
            "'Spurious' means not being what it purports to be; false, illegitimate, or fake. In this sentence, it contrasts with authentic scientific evidence.",
          source: "Latveria Academic English Master Archive",
          annotations: [
            {
              term: "spurious",
              definition: "Palsu; tampak masuk akal tetapi keliru dan tidak sah secara ilmiah.",
              partOfSpeech: "adjective",
              phonetic: "/ˈspjʊə.ri.əs/",
            },
            {
              term: "scrutiny",
              definition: "Pemeriksaan dan telaah kritis secara teliti dan mendalam.",
              partOfSpeech: "noun",
              phonetic: "/ˈskruː.tɪ.ni/",
            },
          ],
        },
      ],
    },
    {
      subtes: "penalaran-umum",
      packageName: "Simulasi Mandiri - Penalaran Logis",
      category: "Logika Analitis & Silogisme",
      questions: [
        {
          prompt:
            "Semua calon mahasiswa yang lulus seleksi mandiri memiliki sertifikat tryout terakreditasi atau memenangkan olimpiade sains. Sebagian siswa SMA Latveria tidak memiliki sertifikat tryout terakreditasi. Anton adalah siswa SMA Latveria yang memenangkan olimpiade sains tingkat nasional. Simpulan yang paling sah adalah ...",
          options: [
            "Anton memenuhi salah satu syarat untuk lulus seleksi mandiri.",
            "Anton dipastikan tidak lulus seleksi mandiri karena tidak punya sertifikat.",
            "Semua siswa SMA Latveria pasti lulus seleksi mandiri.",
            "Hanya pemilik sertifikat tryout yang diperbolehkan mendaftar seleksi mandiri.",
            "Siswa yang memenangkan olimpiade tidak memerlukan nilai akademik lain.",
          ],
          correctAnswer: 0,
          explanation:
            "Premis menyatakan syaratnya adalah sertifikat OR olimpiade. Karena Anton memenangkan olimpiade, Anton telah memenuhi salah satu klausul disjungtif syarat tersebut.",
          source: "Ujian Mandiri PTN & SNBT Penalaran Umum",
        },
      ],
    },
  ],
};
