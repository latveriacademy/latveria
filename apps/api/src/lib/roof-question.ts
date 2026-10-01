export const roofQuestionOptions = ["900 genteng", "1.050 genteng", "1.200 genteng", "1.350 genteng"] as const;
export const roofQuestionCorrectAnswer = 2;
export const roofQuestionExplanation = String.raw`Tinggi sisi tegak (apotema) adalah $\sqrt{3^2+4^2}=5$ m. Luas satu sisi $=\frac12\times8\times5=20$ m². Luas empat sisi $=4\times20=80$ m². Jumlah genteng $=80\times15=1200$.`;

export function isLegacyRoofQuestion(prompt: string) {
  return /atap/i.test(prompt) && /limas/i.test(prompt) && /genteng/i.test(prompt) && /\$\$\s*\\begin\{tikzpicture\}/.test(prompt);
}

export function roofQuestionPrompt() {
  return String.raw`Atap limas segiempat beraturan memiliki alas persegi bersisi $8$ m dan tinggi limas $3$ m. Jika $1\text{ m}^2$ membutuhkan 15 genteng, berapa total genteng untuk keempat sisi tegak atap tersebut?

\begin{tikzpicture}
% alt: Limas persegi sisi alas 8 m, tinggi 3 m, apotema 5 m.
\draw (0,0)--(4,-2)--(8,0)--(4,2)--cycle;
\draw (0,0)--(4,5)--(8,0);
\draw[dashed] (4,-2)--(4,5)--(4,2);
\draw[dashed] (4,0)--(4,5);
\node[below] at (4,-2) {$8\text{ m}$};
\node[right] at (4,2.5) {$5\text{ m}$};
\node[left] at (4,0) {$3\text{ m}$};
\end{tikzpicture}`;
}
