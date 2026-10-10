export type Point = [number, number, number];
export type DrawStyle = {
  width: number;
  dash?: string;
  fill: "none" | "shade" | "solid";
  arrow?: "->" | "<-" | "<->";
};
export type TikzShape =
  | { kind: "path"; points: Point[]; closed: boolean; style: DrawStyle }
  | { kind: "ellipse"; center: Point; rx: number; ry: number; style: DrawStyle };
export type TikzLabel = { point: Point; text: string; anchor: string };
export type TikzDiagram = { shapes: TikzShape[]; labels: TikzLabel[]; description: string };

const number = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

function scalar(text: string) {
  if (!number.test(text.trim()))
    throw new Error("Koordinat dan ukuran harus berupa angka, bukan ekspresi TeX.");
  const value = Number(text);
  if (!Number.isFinite(value) || Math.abs(value) > 100)
    throw new Error("Koordinat dan ukuran harus berada antara −100 dan 100.");
  return value;
}

function point(text: string): Point {
  const match = text.trim().match(/^\(([^()]*)\)$/);
  if (!match) throw new Error("Gunakan koordinat (x,y) atau (x,y,z).");
  const values = match[1].split(",").map(scalar);
  if (values.length !== 2 && values.length !== 3)
    throw new Error("Gunakan koordinat (x,y) atau (x,y,z).");
  return [values[0], values[1], values[2] ?? 0];
}

function commands(source: string) {
  const result: string[] = [];
  let start = 0,
    depth = 0;
  for (let i = 0; i < source.length; i++) {
    if (source[i] === "\\") {
      i++;
      continue;
    }
    if (source[i] === "{") depth++;
    if (source[i] === "}") depth--;
    if (depth < 0) throw new Error("Kurung kurawal label tidak seimbang.");
    if (source[i] === ";" && depth === 0) {
      const command = source.slice(start, i).trim();
      if (command) result.push(command);
      start = i + 1;
    }
  }
  if (depth !== 0) throw new Error("Kurung kurawal label tidak seimbang.");
  if (source.slice(start).trim())
    throw new Error("Akhiri setiap perintah TikZ dengan titik koma (;).");
  if (result.length > 100) throw new Error("Maksimal 100 perintah per diagram.");
  return result;
}

function style(options: string | undefined, filled: boolean): DrawStyle {
  const result: DrawStyle = { width: 2, fill: filled ? "solid" : "none" };
  for (const option of (options ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)) {
    switch (option) {
      case "->":
      case "<-":
      case "<->":
        result.arrow = option;
        break;
      case "thick":
        result.width = 3;
        break;
      case "thin":
        result.width = 1;
        break;
      case "dashed":
        result.dash = "8 6";
        break;
      case "dotted":
        result.dash = "2 6";
        break;
      case "fill":
        result.fill = "shade";
        break;
      default:
        throw new Error(`Opsi TikZ "${option}" belum didukung.`);
    }
  }
  return result;
}

export function projectPoint([x, y, z]: Point): [number, number] {
  // Proyeksi miring: sumbu z bergerak ke kanan-atas pada gambar 2D.
  return [x + 0.6 * z, -y - 0.35 * z];
}

export function parseTikz(source: string): TikzDiagram {
  if (source.length > 4_000) throw new Error("Diagram terlalu panjang (maksimal 4.000 karakter).");
  const block = source.trim().match(/^\\begin\{tikzpicture\}\s*([\s\S]*?)\\end\{tikzpicture\}$/);
  if (!block)
    throw new Error("Diagram harus dibungkus dengan \\begin{tikzpicture} dan \\end{tikzpicture}.");
  const description = block[1].match(/^\s*%\s*alt:\s*(.+)$/m)?.[1].trim();
  if (description && description.length > 300)
    throw new Error("Deskripsi diagram maksimal 300 karakter.");
  const body = block[1].replace(/^\s*%\s*alt:[^\n]*(?:\n|$)/m, "").replace(/(?<!\\)%[^\n]*/g, "");
  const shapes: TikzShape[] = [];
  const labels: TikzLabel[] = [];
  const anchors = [
    "center",
    "above",
    "below",
    "left",
    "right",
    "above left",
    "above right",
    "below left",
    "below right",
  ];
  for (const command of commands(body)) {
    const label = command.match(/^\\node(?:\[([^\]]*)\])?\s+at\s+(\([^()]*\))\s*\{([\s\S]*)\}$/);
    if (label) {
      const anchor = label[1]?.trim() || "center";
      if (!anchors.includes(anchor)) throw new Error(`Posisi label "${anchor}" belum didukung.`);
      if (label[3].length > 100) throw new Error("Label diagram maksimal 100 karakter.");
      if (/\\(?:begin|end|includegraphics|input|href|url|html)/.test(label[3]))
        throw new Error("Label hanya mendukung teks dan rumus KaTeX.");
      labels.push({ point: point(label[2]), text: label[3], anchor });
      continue;
    }
    const draw = command.match(/^\\(draw|fill)(?:\[([^\]]*)\])?\s*([\s\S]+)$/);
    if (!draw) throw new Error("Perintah belum didukung. Gunakan \\draw, \\fill, atau \\node at.");
    const drawStyle = style(draw[2], draw[1] === "fill");
    const ellipse = draw[3].match(/^(\([^()]*\))\s+(circle|ellipse)\s*\(([^()]*)\)$/);
    if (ellipse) {
      const radii = ellipse[3].split(/\s+and\s+/).map(scalar);
      if (radii.length !== (ellipse[2] === "circle" ? 1 : 2) || radii.some((r) => r <= 0))
        throw new Error("Gunakan circle (r) atau ellipse (rx and ry), dengan ukuran positif.");
      shapes.push({
        kind: "ellipse",
        center: point(ellipse[1]),
        rx: radii[0],
        ry: radii[1] ?? radii[0],
        style: drawStyle,
      });
      continue;
    }
    const rectangle = draw[3].match(/^(\([^()]*\))\s+rectangle\s+(\([^()]*\))$/);
    if (rectangle) {
      const a = point(rectangle[1]),
        b = point(rectangle[2]);
      if (a[2] !== b[2])
        throw new Error(
          "Sudut rectangle harus berada pada bidang z yang sama; gunakan garis -- untuk bidang lain.",
        );
      shapes.push({
        kind: "path",
        points: [a, [b[0], a[1], a[2]], b, [a[0], b[1], a[2]]],
        closed: true,
        style: drawStyle,
      });
      continue;
    }
    const parts = draw[3].split(/\s*--\s*/);
    const closed = parts.at(-1) === "cycle";
    if (closed) parts.pop();
    const points = parts.map(point);
    if (points.length < (closed ? 3 : 2))
      throw new Error("Garis membutuhkan 2 titik; poligon tertutup membutuhkan minimal 3 titik.");
    shapes.push({ kind: "path", points, closed, style: drawStyle });
  }
  if (!shapes.length) throw new Error("Diagram harus memiliki setidaknya satu bangun atau garis.");
  return {
    shapes,
    labels,
    description:
      description ||
      `Diagram geometri dengan ${shapes.length} garis atau bangun${labels.length ? `, berlabel ${labels.map((l) => l.text.replace(/\$/g, "")).join(", ")}` : ""}.`,
  };
}
