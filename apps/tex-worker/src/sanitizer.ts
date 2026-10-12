export interface SanitizedSvgResult {
  svg: string;
  width?: string;
  height?: string;
  viewBox?: string;
}

/**
 * Sanitizes an SVG string by removing dangerous executable scripts,
 * handlers, foreign entities, and external references to ensure safe browser rendering.
 */
export function sanitizeSvg(rawSvg: string): SanitizedSvgResult {
  if (!rawSvg || !rawSvg.trim()) {
    throw new Error("SVG output kosong.");
  }

  // Ensure it actually contains an SVG root
  const svgStart = rawSvg.indexOf("<svg");
  if (svgStart === -1) {
    throw new Error("Format output tidak mengandung elemen SVG valid.");
  }

  let clean = rawSvg.slice(svgStart);

  // 1. Remove XML declaration or DOCTYPE with potential DTD injection
  clean = clean.replace(/<\?xml[\s\S]*?\?>/gi, "");
  clean = clean.replace(/<!DOCTYPE[\s\S]*?>/gi, "");

  // 2. Remove <script> tags and contents
  clean = clean.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  clean = clean.replace(/<script\b[^>]*\/>/gi, "");

  // 3. Remove inline event handlers (onclick, onload, onerror, etc.)
  clean = clean.replace(/\son[a-z]+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, "");

  // 4. Remove dangerous javascript: or data: URIs in attributes
  clean = clean.replace(/\bhref\s*=\s*["']\s*javascript:[^"']*["']/gi, 'href="#"');
  clean = clean.replace(/\bxlink:href\s*=\s*["']\s*javascript:[^"']*["']/gi, 'xlink:href="#"');

  // Extract dimensions
  const widthMatch = clean.match(/<svg\b[^>]*?\bwidth=(["'])(.*?)\1/i);
  const heightMatch = clean.match(/<svg\b[^>]*?\bheight=(["'])(.*?)\1/i);
  const viewBoxMatch = clean.match(/<svg\b[^>]*?\bviewBox=(["'])(.*?)\1/i);

  const width = widthMatch?.[2];
  const height = heightMatch?.[2];
  const viewBox = viewBoxMatch?.[2];

  // If width and height are missing but viewBox exists, inject responsive defaults
  if (!width && !height && viewBox) {
    clean = clean.replace("<svg", `<svg role="img"`);
  }

  return {
    svg: clean.trim(),
    width,
    height,
    viewBox,
  };
}
