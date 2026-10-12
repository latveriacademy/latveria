export interface CorpusItem {
  id: string;
  name: string;
  category: string;
  requiredPackages: string[];
  recommendedCompiler: "pdflatex" | "xelatex" | "lualatex" | "latex";
  source: string;
}

export const LATEX_TEST_CORPUS: CorpusItem[] = [
  {
    id: "tikz-basic-geometry",
    name: "Geometri Segitiga Siku-siku & Sudut",
    category: "TikZ & PGF",
    requiredPackages: ["tikz"],
    recommendedCompiler: "pdflatex",
    source: `\\begin{tikzpicture}[scale=1.2, line cap=round, line join=round]
  \\coordinate (A) at (0,0);
  \\coordinate (B) at (4,0);
  \\coordinate (C) at (4,3);
  \\draw[thick, fill=blue!10] (A) -- (B) -- (C) -- cycle;
  \\draw (3.6,0) -- (3.6,0.4) -- (4,0.4);
  \\node[below left] at (A) {$A$};
  \\node[below right] at (B) {$B$};
  \\node[above right] at (C) {$C$};
  \\node[below] at (2,0) {$c = 4$};
  \\node[right] at (4,1.5) {$a = 3$};
  \\node[above left] at (2,1.5) {$b = 5$};
\\end{tikzpicture}`,
  },
  {
    id: "pgfplots-parabola",
    name: "Grafik Fungsi Kuadrat dengan Sumbu Kartesius",
    category: "PGFPlots",
    requiredPackages: ["pgfplots"],
    recommendedCompiler: "pdflatex",
    source: `\\begin{tikzpicture}
  \\begin{axis}[
    axis lines = middle,
    xlabel = {$x$},
    ylabel = {$f(x)$},
    xmin=-3, xmax=3,
    ymin=-1, ymax=9,
    grid = both,
    width=8cm, height=6cm
  ]
    \\addplot[domain=-3:3, samples=100, color=red, thick] {x^2};
    \\addlegendentry{$f(x) = x^2$}
  \\end{axis}
\\end{tikzpicture}`,
  },
  {
    id: "circuitikz-rc-circuit",
    name: "Rangkaian Listrik Seri Resistor-Kapasitor",
    category: "Circuitikz",
    requiredPackages: ["circuitikz"],
    recommendedCompiler: "pdflatex",
    source: `\\begin{circuitikz}[american, scale=1.1]
  \\draw (0,0) to[battery1, l=$V_0$] (0,3)
        to[R, l=$R$, v=$V_R$] (3,3)
        to[C, l=$C$, v=$V_C$] (3,0)
        -- (0,0);
  \\draw (3,0) to[short] (3,0) node[ground] {};
\\end{circuitikz}`,
  },
  {
    id: "chemfig-benzene",
    name: "Struktur Kimia Organik Cincin Benzena & Asam Salisilat",
    category: "Chemfig",
    requiredPackages: ["chemfig"],
    recommendedCompiler: "pdflatex",
    source: `\\chemfig{*6(-=-(-COOH)=(-OH)-=)}`,
  },
  {
    id: "tkz-euclide-triangle",
    name: "Konstruksi Geometri Euclid Lingkaran Luar",
    category: "tkz-euclide",
    requiredPackages: ["tkz-euclide"],
    recommendedCompiler: "pdflatex",
    source: `\\begin{tikzpicture}[scale=0.9]
  \\tkzDefPoints{0/0/A, 5/0/B, 2/4/C}
  \\tkzDrawPolygon[thick, fill=green!5](A,B,C)
  \\tkzCircumCenter(A,B,C)\\tkzGetPoint{O}
  \\tkzDrawCircle[dashed, color=purple](O,A)
  \\tkzDrawPoints(A,B,C,O)
  \\tkzLabelPoints[below](A,B)
  \\tkzLabelPoints[above](C)
  \\tkzLabelPoints[below right](O)
\\end{tikzpicture}`,
  },
  {
    id: "forest-linguistics",
    name: "Pohon Sintaksis dan Hirarki Kalimat",
    category: "Forest & qtree",
    requiredPackages: ["forest"],
    recommendedCompiler: "pdflatex",
    source: `\\begin{forest}
  [S
    [NP [Det [The]] [N [cat]]]
    [VP [V [sat]] [PP [P [on]] [NP [Det [the]] [N [mat]]]]]
  ]
\\end{forest}`,
  },
  {
    id: "flowchart-decision",
    name: "Flowchart Algoritma Pemrograman",
    category: "Flowcharts & Graphs",
    requiredPackages: ["tikz"],
    recommendedCompiler: "pdflatex",
    source: `\\begin{tikzpicture}[node distance=1.8cm, auto,
  block/.style={rectangle, draw, fill=blue!10, text width=5em, text centered, rounded corners, minimum height=3em},
  decision/.style={diamond, draw, fill=yellow!20, text width=4.5em, text badly centered, inner sep=0pt},
  line/.style={draw, -latex', thick}]
  \\node [block] (start) {Mulai};
  \\node [decision, below of=start] (decide) {$x > 0$?};
  \\node [block, right of=decide, node distance=3cm] (pos) {Cetak Positif};
  \\node [block, below of=decide] (end) {Selesai};
  \\path [line] (start) -- (decide);
  \\path [line] (decide) -- node {Ya} (pos);
  \\path [line] (decide) -- node {Tidak} (end);
  \\path [line] (pos) |- (end);
\\end{tikzpicture}`,
  },
  {
    id: "matrix-linear-algebra",
    name: "Matriks Transformasi & Determinan Aljabar Linier",
    category: "Tables & Matrices",
    requiredPackages: ["amsmath"],
    recommendedCompiler: "pdflatex",
    source: `\\begin{tikzpicture}
  \\node at (0,0) {
    $\\mathbf{A} = \\begin{pmatrix} 2 & -1 & 0 \\\\ 1 & 3 & 4 \\\\ -2 & 0 & 1 \\end{pmatrix}, \\quad \\det(\\mathbf{A}) = 2(3) + 1(1 + 8) = 15$
  };
\\end{tikzpicture}`,
  },
  {
    id: "colored-shaded-venn",
    name: "Diagram Venn 3 Himpunan dengan Shading & Transparansi",
    category: "Shading & Transparency",
    requiredPackages: ["tikz"],
    recommendedCompiler: "pdflatex",
    source: `\\begin{tikzpicture}[opacity=0.6]
  \\fill[red] (0,0) circle (1.5cm);
  \\fill[blue] (1.5,0) circle (1.5cm);
  \\fill[green] (0.75,1.2) circle (1.5cm);
  \\node[opacity=1, below left] at (-0.5,-0.5) {$A$};
  \\node[opacity=1, below right] at (2,-0.5) {$B$};
  \\node[opacity=1, above] at (0.75,2.4) {$C$};
\\end{tikzpicture}`,
  },
  {
    id: "pstricks-vectors",
    name: "Vektor & Koordinat PSTricks",
    category: "PSTricks",
    requiredPackages: ["pstricks"],
    recommendedCompiler: "latex",
    source: `\\begin{pspicture}(-2,-2)(4,4)
  \\psgrid[subgriddiv=1, griddots=10, gridlabels=7pt](-2,-2)(4,4)
  \\psline[linewidth=1.5pt, linecolor=red]{->}(0,0)(3,2)
  \\psline[linewidth=1.5pt, linecolor=blue]{->}(0,0)(-1,3)
  \\rput(3.2,2.2){$\\vec{u}$}
  \\rput(-1.2,3.2){$\\vec{v}$}
\\end{pspicture}`,
  },
];
