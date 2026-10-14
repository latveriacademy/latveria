import { useId } from "react";
import { utbkSubtests, type SimulationSubtest } from "@latveria/shared";
import { radarPoint, subtestShort } from "../../lib/tryout/tryout-results";
import styles from "./tryout-results.module.css";

export function TryoutRadar({
  subtests,
  useIrt,
}: {
  subtests: SimulationSubtest[];
  useIrt: boolean;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const rows = utbkSubtests.map((s) => subtests.find((row) => row.slug === s.slug));
  if (rows.some((row) => !row || !Number.isFinite(useIrt ? row.irt?.score : row.score)))
    return (
      <p className={styles.radarEmpty}>
        Profil radar tersedia ketika tujuh subtes memiliki skor. Skor subtes yang dikerjakan tetap
        tersedia di bawah.
      </p>
    );
  const values = rows.map((row) => (useIrt ? row!.irt!.score : row!.score));
  const points = (scores: number[]) =>
    scores
      .map((score, index) => {
        const point = radarPoint(score, index);
        return `${point.x},${point.y}`;
      })
      .join(" ");
  return (
    <figure className={styles.radar}>
      <svg
        viewBox="0 0 360 330"
        role="img"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <title id={titleId}>Profil skor tujuh subtes</title>
        <desc id={descriptionId}>
          {rows.map((row, i) => `${row!.name}: ${values[i]} dari 1000`).join(". ")}
          {useIrt ? ". Garis pembanding menunjukkan skor dasar pada sesi yang sama." : ""}
        </desc>
        {[250, 500, 750, 1000].map((value) => (
          <polygon key={value} points={points(Array(7).fill(value))} className={styles.radarGrid} />
        ))}
        {utbkSubtests.map((subtest, index) => {
          const end = radarPoint(1000, index);
          const label = radarPoint(1000, index, 145);
          return (
            <g key={subtest.slug}>
              <line x1={180} y1={168} x2={end.x} y2={end.y} className={styles.radarAxis} />
              <text
                x={label.x}
                y={label.y}
                textAnchor={label.x < 150 ? "end" : label.x > 210 ? "start" : "middle"}
                dominantBaseline="middle"
                className={styles.radarLabel}
              >
                {subtestShort(subtest.slug)}
              </text>
            </g>
          );
        })}
        {[500, 1000].map((value) => (
          <text key={value} x={187} y={radarPoint(value, 0).y - 4} className={styles.radarTick}>
            {value}
          </text>
        ))}
        {useIrt && (
          <polygon
            points={points(rows.map((row) => row!.score))}
            className={styles.radarComparison}
          />
        )}
        <polygon points={points(values)} className={styles.radarShape} />
        {values.map((value, index) => {
          const point = radarPoint(value, index);
          return (
            <circle key={index} cx={point.x} cy={point.y} r={3.5} className={styles.radarDot}>
              <title>
                {rows[index]!.name}: {value}/1.000
              </title>
            </circle>
          );
        })}
      </svg>
      <figcaption>
        <span className={styles.currentLegend} />
        {useIrt ? "IRT 2PL" : "Skor dasar"}
        {useIrt && (
          <>
            <span className={styles.comparisonLegend} />
            Skor dasar
          </>
        )}
      </figcaption>
    </figure>
  );
}
