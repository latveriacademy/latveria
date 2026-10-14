import {
  cylinderTankQuestion,
  openCuboidQuestion,
  pyramidQuestion,
  type QuestionImport,
} from "@latveria/shared";

export const tikzExamples = [
  {
    name: "Segitiga",
    source: String.raw`\begin{tikzpicture}
% alt: Segitiga siku-siku ABC, alas 4 cm, tinggi 3 cm.
\draw (0,0) -- (4,0) -- (0,3) -- cycle;
\node[below] at (0,0) {$A$};
\node[below] at (4,0) {$B$};
\node[above] at (0,3) {$C$};
\node[below] at (2,0) {$4\text{ cm}$};
\node[left] at (0,1.5) {$3\text{ cm}$};
\end{tikzpicture}`,
  },
  {
    name: "Limas segiempat",
    source: String.raw`\begin{tikzpicture}
% alt: Limas persegi sisi alas 8 m, tinggi 3 m, apotema 5 m.
\draw (0,0)--(4,-2)--(8,0)--(4,2)--cycle;
\draw (0,0)--(4,5)--(8,0);
\draw[dashed] (4,-2)--(4,5)--(4,2);
\draw[dashed] (4,0)--(4,5);
\node[below] at (4,-2) {$8\text{ m}$};
\node[right] at (4,2.5) {$5\text{ m}$};
\node[left] at (4,0) {$3\text{ m}$};
\end{tikzpicture}`,
  },
  {
    name: "Kubus",
    source: String.raw`\begin{tikzpicture}
% alt: Kubus ABCD.EFGH; tiga rusuk belakang putus-putus.
\draw (0,0,0)--(3,0,0)--(3,3,0)--(0,3,0)--cycle;
\draw (3,0,0)--(3,0,3)--(3,3,3)--(3,3,0);
\draw (0,3,0)--(0,3,3)--(3,3,3);
\draw[dashed] (0,0,0)--(0,0,3)--(3,0,3);
\draw[dashed] (0,0,3)--(0,3,3);
\node[below] at (0,0,0) {$A$}; \node[below] at (3,0,0) {$B$};
\node[right] at (3,3,0) {$C$}; \node[left] at (0,3,0) {$D$};
\node[above] at (0,0,3) {$E$}; \node[right] at (3,0,3) {$F$};
\node[above] at (3,3,3) {$G$}; \node[above] at (0,3,3) {$H$};
\end{tikzpicture}`,
  },
  {
    name: "Bola",
    source: String.raw`\begin{tikzpicture}
% alt: Bola berjari-jari r dengan penampang ekuator putus-putus.
\draw (0,0) circle (2);
\draw[dashed] (0,0) ellipse (2 and 0.6);
\draw (0,0)--(2,0);
\fill (0,0) circle (0.04);
\node[above] at (1,0) {$r$};
\end{tikzpicture}`,
  },
];

export const tikzPyramidImportExample: QuestionImport = {
  groups: [
    {
      subtes: "pengetahuan-kuantitatif",
      category: "Bangun ruang",
      questions: [
        {
          ...pyramidQuestion,
          options: [...pyramidQuestion.options],
        },
      ],
    },
  ],
};

export const geometryImportExample: QuestionImport = {
  groups: [
    {
      subtes: "penalaran-matematika",
      category: "Bangun ruang",
      questions: [pyramidQuestion, openCuboidQuestion, cylinderTankQuestion].map((question) => ({
        ...question,
        options: [...question.options],
      })),
    },
  ],
};
