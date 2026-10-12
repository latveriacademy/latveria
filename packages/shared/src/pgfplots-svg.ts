export interface PgfplotsPoint {
  x: string | number;
  y: number;
}

export interface PgfplotsSeries {
  options: string;
  points: PgfplotsPoint[];
  fillColor: string;
  strokeColor: string;
  label: string;
}

export function renderPgfplotsSvg(source: string): string | null {
  if (!/\\begin\{axis\}/.test(source)) return null;

  // Extract title, xlabel, ylabel
  const titleMatch = source.match(/title=\{([^}]*)\}/);
  const title = titleMatch ? titleMatch[1] : "";

  const xlabelMatch = source.match(/xlabel=\{([^}]*)\}/);
  const xlabel = xlabelMatch ? xlabelMatch[1] : "";

  const ylabelMatch = source.match(/ylabel=\{([^}]*)\}/);
  const ylabel = ylabelMatch ? ylabelMatch[1] : "";

  // Extract symbolic x coords
  const xCoordsMatch = source.match(/symbolic x coords=\{([^}]*)\}/);
  const xCategories = xCoordsMatch ? xCoordsMatch[1].split(",").map((s) => s.trim()) : [];

  // Extract ymin and ymax
  const yminMatch = source.match(/ymin\s*=\s*([0-9.]+)/);
  const ymaxMatch = source.match(/ymax\s*=\s*([0-9.]+)/);
  const ymin = yminMatch ? Number(yminMatch[1]) : 0;
  const ymax = ymaxMatch ? Number(ymaxMatch[1]) : 120;

  // Extract ytick
  const ytickMatch = source.match(/ytick=\{([^}]*)\}/);
  const yticks = ytickMatch
    ? ytickMatch[1].split(",").map((s) => Number(s.trim()))
    : [0, 20, 40, 60, 80, 100, 120];

  // Extract legend items
  const legendMatch = source.match(/\\legend\{([^}]*)\}/);
  const legends = legendMatch ? legendMatch[1].split(",").map((s) => s.trim()) : [];

  // Extract addplots
  const addplotRegex = /\\addplot\s*(?:\[([^\]]*)\])?\s*coordinates\s*\{([\s\S]*?)\};/gi;
  const seriesList: PgfplotsSeries[] = [];
  let apMatch: RegExpExecArray | null;

  const defaultColors = [
    { fill: "#ffb6c1", stroke: "#ff1493" }, // pink
    { fill: "#99ccff", stroke: "#0066cc" }, // blue
    { fill: "#a8e6cf", stroke: "#2e7d32" }, // green
    { fill: "#ffd3b6", stroke: "#e65100" }, // orange
  ];

  let seriesIdx = 0;
  while ((apMatch = addplotRegex.exec(source)) !== null) {
    const opts = apMatch[1] || "";
    const rawCoords = apMatch[2] || "";

    let fillColor = defaultColors[seriesIdx % defaultColors.length].fill;
    let strokeColor = defaultColors[seriesIdx % defaultColors.length].stroke;

    if (/pink/i.test(opts)) {
      fillColor = "#ffb6c1";
      strokeColor = "#ff1493";
    } else if (/blue/i.test(opts)) {
      fillColor = "#99ccff";
      strokeColor = "#0066cc";
    }

    const coordRegex = /\(\s*([^,\s]+)\s*,\s*([^)\s]+)\s*\)/g;
    const points: PgfplotsPoint[] = [];
    let cMatch: RegExpExecArray | null;
    while ((cMatch = coordRegex.exec(rawCoords)) !== null) {
      points.push({ x: cMatch[1], y: Number(cMatch[2]) });
    }

    seriesList.push({
      options: opts,
      points,
      fillColor,
      strokeColor,
      label: legends[seriesIdx] || `Seri ${seriesIdx + 1}`,
    });
    seriesIdx++;
  }

  // Derive categories if not explicit
  let categories = xCategories;
  if (!categories.length) {
    const set = new Set<string>();
    seriesList.forEach((s) => s.points.forEach((p) => set.add(String(p.x))));
    categories = Array.from(set);
  }

  // Layout parameters
  const svgWidth = 620;
  const svgHeight = 400;
  const padLeft = 65;
  const padRight = 30;
  const padTop = 50;
  const padBottom = 65;

  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;
  const yRange = ymax - ymin || 1;

  const getYPos = (val: number) => padTop + plotHeight - ((val - ymin) / yRange) * plotHeight;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}" class="pgfplots-bar-chart" role="img" aria-label="${title || "Grafik PGFPlots"}">`;
  svg += `<rect width="100%" height="100%" fill="#ffffff" rx="6"/>`;

  // Title
  if (title) {
    svg += `<text x="${svgWidth / 2}" y="30" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="bold" fill="#143d2b">${title}</text>`;
  }

  // Y Grid lines & ticks
  yticks.forEach((yt) => {
    if (yt < ymin || yt > ymax) return;
    const yPos = getYPos(yt);
    svg += `<line x1="${padLeft}" y1="${yPos}" x2="${padLeft + plotWidth}" y2="${yPos}" stroke="#e2e8f0" stroke-dasharray="4,4"/>`;
    svg += `<text x="${padLeft - 10}" y="${yPos + 4}" text-anchor="end" font-family="monospace, sans-serif" font-size="11" fill="#4a5568">${yt}</text>`;
  });

  // Y-axis label
  if (ylabel) {
    svg += `<text transform="rotate(-90)" x="${-(padTop + plotHeight / 2)}" y="20" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="#2d3748">${ylabel}</text>`;
  }

  // X-axis label
  if (xlabel) {
    svg += `<text x="${padLeft + plotWidth / 2}" y="${svgHeight - 15}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="#2d3748">${xlabel}</text>`;
  }

  // Main axes lines
  svg += `<line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${padTop + plotHeight}" stroke="#4a5568" stroke-width="1.5"/>`;
  svg += `<line x1="${padLeft}" y1="${padTop + plotHeight}" x2="${padLeft + plotWidth}" y2="${padTop + plotHeight}" stroke="#4a5568" stroke-width="1.5"/>`;

  // Bars per category
  const numCats = categories.length;
  const numSeries = seriesList.length;
  const catWidth = plotWidth / (numCats || 1);
  const barWidth = Math.min(18, (catWidth * 0.7) / (numSeries || 1));
  const groupOffset = (catWidth - numSeries * barWidth) / 2;

  categories.forEach((cat, cIdx) => {
    const catCenterX = padLeft + cIdx * catWidth + catWidth / 2;
    // X label
    svg += `<text x="${catCenterX}" y="${padTop + plotHeight + 20}" text-anchor="middle" font-family="monospace, sans-serif" font-size="11" fill="#2d3748">${cat}</text>`;
    // X tick mark
    svg += `<line x1="${catCenterX}" y1="${padTop + plotHeight}" x2="${catCenterX}" y2="${padTop + plotHeight + 5}" stroke="#4a5568" stroke-width="1"/>`;

    // Render series bars
    seriesList.forEach((s, sIdx) => {
      const pt = s.points.find((p) => String(p.x) === String(cat));
      if (pt) {
        const val = pt.y;
        const bX = padLeft + cIdx * catWidth + groupOffset + sIdx * barWidth;
        const bY = getYPos(val);
        const bHeight = padTop + plotHeight - bY;

        svg += `<rect x="${bX}" y="${bY}" width="${barWidth - 2}" height="${Math.max(0, bHeight)}" fill="${s.fillColor}" stroke="${s.strokeColor}" stroke-width="1.2" rx="1.5">`;
        svg += `<title>${s.label}: ${val} (${cat})</title></rect>`;
      }
    });
  });

  // Legend at North West
  if (seriesList.length > 0 && legends.length > 0) {
    const legX = padLeft + 15;
    const legY = padTop + 15;
    const legW = 120;
    const legH = seriesList.length * 20 + 10;

    svg += `<rect x="${legX}" y="${legY}" width="${legW}" height="${legH}" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="4" opacity="0.95"/>`;
    seriesList.forEach((s, i) => {
      const itemY = legY + 16 + i * 20;
      svg += `<rect x="${legX + 10}" y="${itemY - 10}" width="12" height="12" fill="${s.fillColor}" stroke="${s.strokeColor}" stroke-width="1"/>`;
      svg += `<text x="${legX + 28}" y="${itemY}" font-family="system-ui, sans-serif" font-size="11" fill="#2d3748">${s.label}</text>`;
    });
  }

  svg += `</svg>`;
  return svg;
}
