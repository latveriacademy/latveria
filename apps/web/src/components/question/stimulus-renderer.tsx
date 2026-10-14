import React, { useId } from "react";
import type { ContentBlock, QuestionStimulus, TableBlock, ChartBlock } from "@latveria/shared";
import { MathText } from "../math/math-text";
import { LatexDiagram } from "../math/latex-diagram";

// ==========================================
// TABLE RENDERER (JSON & LATEX ARRAY)
// ==========================================

export function TableRenderer({ block }: { block: TableBlock }) {
  // If block has source string in latex \begin{array} format, render via MathText
  if (block.source && (!block.columns || !block.rows)) {
    return (
      <div className="table-block-container my-3 overflow-x-auto rounded border border-[var(--edge)] bg-[var(--surface-elevated)] p-4">
        {block.title && (
          <h4 className="mb-2 font-mono text-xs font-semibold uppercase tracking-wider text-[var(--gold)]">
            {block.title}
          </h4>
        )}
        <div className="flex justify-center">
          <MathText>{block.source}</MathText>
        </div>
      </div>
    );
  }

  const columns = block.columns || [];
  const rows = block.rows || [];

  return (
    <div className="table-block-container my-3 overflow-x-auto rounded border border-[var(--edge)] bg-[var(--surface)] p-3 shadow-sm">
      {block.title && (
        <h4 className="mb-2 font-mono text-xs font-semibold uppercase tracking-wider text-[var(--gold)]">
          {block.title}
        </h4>
      )}
      <table className="w-full min-w-[280px] border-collapse text-left text-sm" role="table">
        {columns.length > 0 && (
          <thead>
            <tr className="border-b border-[var(--edge)] bg-[var(--surface-muted)]">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className="px-3.5 py-2 font-mono text-xs font-semibold text-[var(--ink)]"
                  scope="col"
                >
                  <MathText>{col}</MathText>
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, rIdx) => (
            <tr
              key={rIdx}
              className={`border-b border-[var(--edge)]/60 transition-colors last:border-b-0 hover:bg-[var(--surface-muted)]/50 ${
                rIdx % 2 === 1 ? "bg-[var(--surface-muted)]/30" : ""
              }`}
            >
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-3.5 py-2 font-sans text-sm text-[var(--ink)]">
                  <MathText>{String(cell)}</MathText>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ==========================================
// NATIVE SVG CHART RENDERER (BAR & LINE)
// ==========================================

export function ChartRenderer({ block }: { block: ChartBlock }) {
  const chartId = useId();
  const data = block.data || [];
  if (!data.length) return null;

  const width = 460;
  const height = 240;
  const padding = { top: 28, right: 24, bottom: 44, left: 48 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const values = data.map((d) => d.value);
  const minVal = Math.min(0, ...values);
  const maxVal = Math.max(1, ...values);
  const range = maxVal - minVal || 1;

  const getY = (val: number) => padding.top + plotHeight - ((val - minVal) / range) * plotHeight;

  // Grid tick marks
  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const val = minVal + (range / tickCount) * i;
    return { val: Math.round(val * 10) / 10, y: getY(val) };
  });

  return (
    <div className="chart-block-container my-3 overflow-x-auto rounded border border-[var(--edge)] bg-[var(--surface)] p-3 shadow-sm">
      {block.title && (
        <h4 className="mb-2 text-center font-mono text-xs font-semibold uppercase tracking-wider text-[var(--gold)]">
          {block.title}
        </h4>
      )}
      <div className="flex justify-center">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto max-h-[260px] w-full max-w-[480px]"
          role="img"
          aria-labelledby={`${chartId}-title`}
        >
          <title id={`${chartId}-title`}>{block.title || "Grafik Data"}</title>

          {/* Grid lines & Y-axis labels */}
          {ticks.map((t, idx) => (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={t.y}
                x2={width - padding.right}
                y2={t.y}
                stroke="var(--edge)"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
              <text
                x={padding.left - 8}
                y={t.y + 4}
                textAnchor="end"
                className="fill-[var(--soft-ink)] text-[10px] font-mono"
              >
                {t.val}
              </text>
            </g>
          ))}

          {/* Y Axis line */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={height - padding.bottom}
            stroke="var(--edge)"
            strokeWidth={1.5}
          />
          {/* X Axis line */}
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="var(--edge)"
            strokeWidth={1.5}
          />

          {/* Bar Chart rendering */}
          {block.chartType === "bar" &&
            (() => {
              const barWidth = Math.max(12, Math.min(36, (plotWidth / data.length) * 0.6));
              const step = plotWidth / data.length;
              return data.map((d, idx) => {
                const x = padding.left + step * idx + (step - barWidth) / 2;
                const y = getY(Math.max(0, d.value));
                const barHeight = Math.abs(getY(d.value) - getY(0));
                return (
                  <g key={idx} className="chart-bar-group">
                    <rect
                      x={x}
                      y={d.value >= 0 ? y : getY(0)}
                      width={barWidth}
                      height={Math.max(2, barHeight)}
                      fill="var(--gold)"
                      opacity={0.88}
                      rx={3}
                      className="transition-all hover:opacity-100"
                    />
                    <text
                      x={x + barWidth / 2}
                      y={height - padding.bottom + 16}
                      textAnchor="middle"
                      className="fill-[var(--ink)] text-[11px] font-mono"
                    >
                      {d.label}
                    </text>
                    <text
                      x={x + barWidth / 2}
                      y={y - 5}
                      textAnchor="middle"
                      className="fill-[var(--gold)] text-[10px] font-mono font-semibold"
                    >
                      {d.value}
                    </text>
                  </g>
                );
              });
            })()}

          {/* Line Chart rendering */}
          {block.chartType === "line" &&
            (() => {
              const step = data.length > 1 ? plotWidth / (data.length - 1) : plotWidth;
              const points = data.map((d, idx) => ({
                x: padding.left + (data.length > 1 ? step * idx : plotWidth / 2),
                y: getY(d.value),
                label: d.label,
                val: d.value,
              }));
              const pathD = points.reduce(
                (acc, p, idx) => `${acc} ${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`,
                "",
              );

              return (
                <g>
                  <path
                    d={pathD}
                    fill="none"
                    stroke="var(--gold)"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {points.map((p, idx) => (
                    <g key={idx}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={4.5}
                        fill="var(--surface)"
                        stroke="var(--gold)"
                        strokeWidth={2}
                      />
                      <text
                        x={p.x}
                        y={height - padding.bottom + 16}
                        textAnchor="middle"
                        className="fill-[var(--ink)] text-[11px] font-mono"
                      >
                        {p.label}
                      </text>
                      <text
                        x={p.x}
                        y={p.y - 8}
                        textAnchor="middle"
                        className="fill-[var(--gold)] text-[10px] font-mono font-semibold"
                      >
                        {p.val}
                      </text>
                    </g>
                  ))}
                </g>
              );
            })()}
        </svg>
      </div>
    </div>
  );
}

// ==========================================
// UNIFIED STIMULUS RENDERER
// ==========================================

export function StimulusRenderer({
  stimulus,
  passage,
  className = "",
}: {
  stimulus?: QuestionStimulus | null;
  passage?: string | null;
  className?: string;
}) {
  if (!stimulus && !passage) return null;

  return (
    <section
      className={`stimulus-dossier-pane rounded-lg border border-[var(--edge)] bg-[var(--surface-muted)]/40 p-4 md:p-5 ${className}`}
    >
      <div className="mb-3 flex items-center justify-between border-b border-[var(--edge)] pb-2 font-mono text-xs uppercase tracking-wider text-[var(--gold)]">
        <span>{stimulus?.title || "Teks Stimulus"}</span>
      </div>

      {/* Main passage text if provided */}
      {(stimulus?.passage || passage) && (
        <div className="stimulus-passage-text font-serif leading-relaxed text-[var(--ink)]">
          <MathText>{stimulus?.passage || passage}</MathText>
        </div>
      )}

      {/* Content blocks */}
      {stimulus?.blocks && stimulus.blocks.length > 0 && (
        <div className="stimulus-blocks-stack mt-3 space-y-3">
          {stimulus.blocks.map((block: ContentBlock, idx: number) => {
            switch (block.type) {
              case "text":
                return (
                  <div key={idx} className="font-serif leading-relaxed text-[var(--ink)]">
                    <MathText>{block.content}</MathText>
                  </div>
                );
              case "latex":
                return (
                  <div key={idx} className="my-2 flex justify-center overflow-x-auto p-2">
                    <MathText>
                      {block.source.startsWith("$$") || block.source.startsWith("$")
                        ? block.source
                        : `$$${block.source}$$`}
                    </MathText>
                  </div>
                );
              case "table":
                return <TableRenderer key={idx} block={block} />;
              case "chart":
                return <ChartRenderer key={idx} block={block} />;
              case "diagram":
                return (
                  <figure key={idx} className="my-3 flex flex-col items-center">
                    <LatexDiagram source={block.source} />
                    {block.caption && (
                      <figcaption className="mt-1 font-mono text-xs text-[var(--soft-ink)]">
                        {block.caption}
                      </figcaption>
                    )}
                  </figure>
                );
              case "image":
                return (
                  <figure key={idx} className="my-3 flex flex-col items-center">
                    <img
                      src={block.url}
                      alt={block.alt || "Gambar stimulus"}
                      className="max-h-80 w-auto rounded border border-[var(--edge)] object-contain"
                    />
                    {block.caption && (
                      <figcaption className="mt-1 font-mono text-xs text-[var(--soft-ink)]">
                        {block.caption}
                      </figcaption>
                    )}
                  </figure>
                );
              default:
                return null;
            }
          })}
        </div>
      )}
    </section>
  );
}
