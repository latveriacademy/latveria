import { useId } from "react";
import { parseTikz, projectPoint, type Point } from "../../lib/math/tikz";
import { MathFormula } from "./math-formula";
import "./tikz-diagram.css";

export function TikzDiagram({ source }: { source: string }) {
  const titleId = useId();
  try {
    const diagram = parseTikz(source);
    const coordinates = diagram.shapes.flatMap((shape) => {
      if (shape.kind === "path") return shape.points.map(projectPoint);
      const [x, y] = projectPoint(shape.center);
      return [
        [x - shape.rx, y - shape.ry],
        [x + shape.rx, y + shape.ry],
      ];
    });
    const xs = coordinates.map((p) => p[0]),
      ys = coordinates.map((p) => p[1]);
    const unit = Math.min(
      64,
      420 / (Math.max(...xs) - Math.min(...xs) || 1),
      300 / (Math.max(...ys) - Math.min(...ys) || 1),
    );
    const project = (p: Point) => projectPoint(p).map((n) => n * unit);
    const boxes = coordinates.map(([x, y]) => [x * unit, y * unit]);
    const labels = diagram.labels.map((label) => {
      let [x, y] = project(label.point);
      if (label.anchor.includes("left")) x -= 90;
      if (label.anchor.includes("right")) x += 90;
      if (label.anchor.includes("above")) y -= 38;
      if (label.anchor.includes("below")) y += 38;
      boxes.push([x - 80, y - 28], [x + 80, y + 28]);
      return { ...label, x, y };
    });
    const minX = Math.min(...boxes.map((p) => p[0])) - 16,
      minY = Math.min(...boxes.map((p) => p[1])) - 16;
    const width = Math.max(...boxes.map((p) => p[0])) - minX + 16,
      height = Math.max(...boxes.map((p) => p[1])) - minY + 16;
    const arrowEndId = `${titleId}-arrow-end`;
    const arrowStartId = `${titleId}-arrow-start`;
    return (
      <span className="tikz-diagram">
        <svg
          width={width}
          height={height}
          viewBox={`${minX} ${minY} ${width} ${height}`}
          role="img"
          aria-labelledby={titleId}
        >
          <title id={titleId}>{diagram.description}</title>
          <defs>
            <marker
              id={arrowEndId}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="currentColor" />
            </marker>
            <marker
              id={arrowStartId}
              viewBox="0 0 10 10"
              refX="2"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 9 1.5 L 0 5 L 9 8.5 z" fill="currentColor" />
            </marker>
          </defs>
          {diagram.shapes.map((shape, index) => {
            const hasArrowEnd = shape.style.arrow === "->" || shape.style.arrow === "<->";
            const hasArrowStart = shape.style.arrow === "<-" || shape.style.arrow === "<->";
            const props = {
              stroke: "currentColor",
              strokeWidth: shape.style.width,
              strokeDasharray: shape.style.dash,
              fill: shape.style.fill === "none" ? "none" : "currentColor",
              fillOpacity: shape.style.fill === "shade" ? 0.12 : 1,
              vectorEffect: "non-scaling-stroke" as const,
              strokeLinejoin: "round" as const,
              markerEnd: hasArrowEnd ? `url(#${arrowEndId})` : undefined,
              markerStart: hasArrowStart ? `url(#${arrowStartId})` : undefined,
            };
            if (shape.kind === "ellipse") {
              const [cx, cy] = project(shape.center);
              return (
                <ellipse
                  key={index}
                  cx={cx}
                  cy={cy}
                  rx={shape.rx * unit}
                  ry={shape.ry * unit}
                  {...props}
                />
              );
            }
            return (
              <path
                key={index}
                d={
                  shape.points.map((p, i) => `${i ? "L" : "M"}${project(p).join(" ")}`).join(" ") +
                  (shape.closed ? " Z" : "")
                }
                {...props}
              />
            );
          })}

          {labels.map((label, index) => (
            <foreignObject key={index} x={label.x - 80} y={label.y - 28} width={160} height={56}>
              <div className="tikz-label">
                <MathFormula
                  source={
                    label.text.startsWith("$") && label.text.endsWith("$")
                      ? label.text.slice(1, -1)
                      : label.text
                  }
                />
              </div>
            </foreignObject>
          ))}
        </svg>
      </span>
    );
  } catch (error) {
    return (
      <span className="tikz-error">
        <span>
          Diagram belum dapat ditampilkan:{" "}
          {error instanceof Error ? error.message : "Periksa sintaks TikZ."}
        </span>
        <code>{source}</code>
      </span>
    );
  }
}
