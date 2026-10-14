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
  if (source.length > 20000) return null;
  const clean = source
    .trim()
    .replace(/^\\begin\{tikzpicture\}\s*/, "")
    .replace(/\s*\\end\{tikzpicture\}$/, "");
  const axis = clean.match(/^\\begin\{axis\}\s*\[([^\]]*)\]([\s\S]*)\\end\{axis\}$/);
  if (!axis) return null;
  const options = axis[1]
    .split(/,(?![^{]*\})/)
    .map((option) => option.trim())
    .filter(Boolean);
  const number = "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?";
  // ponytail: only grouped categorical bars; everything else goes to the TeX worker.
  const supported = new RegExp(
    `^(?:ybar|(?:bar width|width|height)=\\d+(?:\\.\\d+)?(?:pt|cm|mm|in)|(?:title|xlabel|ylabel|symbolic x coords)=\\{[^{}\\\\]*\\}|xtick=data|(?:ymin|ymax)=${number}|ytick=\\{[^{}]*\\}|legend pos=north west|ymajorgrids=(?:true|false)|grid style=(?:dashed|\\{dashed\\}))$`,
  );
  if (
    !options.includes("ybar") ||
    !options.includes("xtick=data") ||
    !options.some((option) => option.startsWith("symbolic x coords=")) ||
    options.some((option) => !supported.test(option))
  )
    return null;
  if (new Set(options.map((option) => option.split("=")[0])).size !== options.length) return null;
  source = axis[2];
  const escapeXml = (text: string) =>
    text.replace(
      /[&<>"']/g,
      (character) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]!,
    );

  const optionValue = (name: string) =>
    options.find((option) => option.startsWith(`${name}=`))?.slice(name.length + 1);
  const textOption = (name: string) => optionValue(name)?.slice(1, -1) ?? "";
  const title = textOption("title");
  const xlabel = textOption("xlabel");
  const ylabel = textOption("ylabel");
  const categories = textOption("symbolic x coords")
    .split(",")
    .map((category) => category.trim());
  const yminOption = optionValue("ymin");
  const ymaxOption = optionValue("ymax");
  const tickOption = optionValue("ytick");
  const tickValues =
    tickOption === undefined
      ? []
      : textOption("ytick")
          .split(",")
          .map((tick) => tick.trim());
  if (tickValues.some((tick) => !new RegExp(`^${number}$`).test(tick))) return null;
  const yticks = tickValues.map(Number);

  // Extract legend items
  const legendMatch = source.match(/\\legend\{([^}]*)\}/);
  const legends = legendMatch ? legendMatch[1].split(",").map((s) => s.trim()) : [];
  if (legends.some((label) => /[{}\\]/.test(label))) return null;

  // Extract addplots
  const addplotRegex = /\\addplot\s*(?:\[([^\]]*)\])?\s*coordinates\s*\{([\s\S]*?)\};/g;
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
    const plotOptions = opts
      .split(",")
      .map((option) => option.trim())
      .filter(Boolean);
    if (
      plotOptions.some(
        (option) => !/^(?:fill=(?:pink|blue)(?:!80!white)?|draw=(?:pink|blue))$/.test(option),
      )
    )
      return null;
    if (/pink/.test(opts) && /blue/.test(opts)) return null;

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
      if (!new RegExp(`^${number}$`).test(cMatch[2]) || !Number.isFinite(Number(cMatch[2])))
        return null;
      points.push({ x: cMatch[1], y: Number(cMatch[2]) });
    }
    if (!points.length || points.length > 50 || rawCoords.replace(coordRegex, "").trim())
      return null;
    if (new Set(points.map((point) => point.x)).size !== points.length) return null;

    seriesList.push({
      options: opts,
      points,
      fillColor,
      strokeColor,
      label: legends[seriesIdx] || `Seri ${seriesIdx + 1}`,
    });
    seriesIdx++;
  }
  if (
    !seriesList.length ||
    seriesList.length > 8 ||
    axis[2]
      .replace(addplotRegex, "")
      .replace(/\\legend\{[^{}\\]*\}/, "")
      .trim()
  )
    return null;
  if (legends.length && legends.length !== seriesList.length) return null;

  if (
    !categories.length ||
    categories.some((category) => !category) ||
    categories.length > 50 ||
    new Set(categories).size !== categories.length
  )
    return null;
  if (
    seriesList.some((series) =>
      series.points.some((point) => !categories.includes(String(point.x))),
    )
  )
    return null;
  const values = seriesList.flatMap((series) => series.points.map((point) => point.y));
  const ymin = yminOption !== undefined ? Number(yminOption) : Math.min(0, ...values);
  const ymax = ymaxOption !== undefined ? Number(ymaxOption) : Math.max(0, ...values) || 1;
  if (
    ![ymin, ymax, ...yticks].every(Number.isFinite) ||
    ymax <= ymin ||
    !Number.isFinite(ymax - ymin) ||
    yticks.length > 50
  )
    return null;
  if (values.some((value) => value < ymin || value > ymax)) return null;
  if (!yticks.length) for (let i = 0; i <= 6; i++) yticks.push(ymin + (ymax - ymin) * (i / 6));

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

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}" class="pgfplots-bar-chart" role="img" aria-label="${escapeXml(title || "Grafik PGFPlots")}">`;
  svg += `<rect width="100%" height="100%" fill="#ffffff" rx="6"/>`;

  // Title
  if (title) {
    svg += `<text x="${svgWidth / 2}" y="30" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="bold" fill="#143d2b">${escapeXml(title)}</text>`;
  }

  // Y Grid lines & ticks
  yticks.forEach((yt) => {
    if (yt < ymin || yt > ymax) return;
    const yPos = getYPos(yt);
    if (options.includes("ymajorgrids=true"))
      svg += `<line x1="${padLeft}" y1="${yPos}" x2="${padLeft + plotWidth}" y2="${yPos}" stroke="#e2e8f0" stroke-dasharray="4,4"/>`;
    svg += `<text x="${padLeft - 10}" y="${yPos + 4}" text-anchor="end" font-family="monospace, sans-serif" font-size="11" fill="#4a5568">${yt}</text>`;
  });

  // Y-axis label
  if (ylabel) {
    svg += `<text transform="rotate(-90)" x="${-(padTop + plotHeight / 2)}" y="20" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="#2d3748">${escapeXml(ylabel)}</text>`;
  }

  // X-axis label
  if (xlabel) {
    svg += `<text x="${padLeft + plotWidth / 2}" y="${svgHeight - 15}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="#2d3748">${escapeXml(xlabel)}</text>`;
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
    svg += `<text x="${catCenterX}" y="${padTop + plotHeight + 20}" text-anchor="middle" font-family="monospace, sans-serif" font-size="11" fill="#2d3748">${escapeXml(cat)}</text>`;
    // X tick mark
    svg += `<line x1="${catCenterX}" y1="${padTop + plotHeight}" x2="${catCenterX}" y2="${padTop + plotHeight + 5}" stroke="#4a5568" stroke-width="1"/>`;

    // Render series bars
    seriesList.forEach((s, sIdx) => {
      const pt = s.points.find((p) => String(p.x) === String(cat));
      if (pt) {
        const val = pt.y;
        const bX = padLeft + cIdx * catWidth + groupOffset + sIdx * barWidth;
        const baseline = getYPos(Math.max(ymin, Math.min(ymax, 0)));
        const bY = Math.min(getYPos(val), baseline);
        const bHeight = Math.abs(baseline - getYPos(val));

        svg += `<rect x="${bX}" y="${bY}" width="${barWidth * 0.9}" height="${bHeight}" fill="${s.fillColor}" stroke="${s.strokeColor}" stroke-width="1.2" rx="1.5">`;
        svg += `<title>${escapeXml(s.label)}: ${val} (${escapeXml(cat)})</title></rect>`;
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
      svg += `<text x="${legX + 28}" y="${itemY}" font-family="system-ui, sans-serif" font-size="11" fill="#2d3748">${escapeXml(s.label)}</text>`;
    });
  }

  svg += `</svg>`;
  return svg;
}
