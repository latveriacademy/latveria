import type { UtbkScoreReport, LatveriaScoreResult } from "@latveria/shared";
import { formatTryoutScore, subtestShort, tryoutScoreLabel } from "../../lib/tryout/tryout-results";
import { TryoutRadar } from "./tryout-radar";
import styles from "./tryout-results.module.css";

export function TryoutScoreReport({ report }: { report: UtbkScoreReport | LatveriaScoreResult }) {
  const current = "version" in report ? report : null;
  const method = current?.method ?? "legacy";
  const hasIrt = current?.subtests.some((row) => row.irt !== null);
  const stats = [
    { label: "Benar", value: report.correctCount, className: styles.correct },
    { label: "Salah", value: report.incorrectCount, className: styles.incorrect },
    ...(current
      ? [{ label: "Sebagian benar", value: current.partialCount, className: styles.partial }]
      : []),
    { label: "Kosong", value: report.unansweredCount, className: styles.unanswered },
  ];
  const statuses = {
    unavailable: "Belum dikalibrasi",
    "partial-credit": "Kredit parsial memakai skor dasar",
    "missing-items": "Versi soal belum dikalibrasi",
    calibrated: "Terkalibrasi",
  };
  const lowest = [...(current?.subtests ?? [])].sort((a, b) => a.score - b.score)[0];
  const varied = current && current.subtests.some((row) => row.score !== lowest?.score);
  return (
    <section aria-label="Hasil skor simulasi UTBK" className={styles.report}>
      <div className={`${styles.overview} ${current ? "" : styles.legacyOverview}`}>
        <div className={styles.scoreSummary}>
          <h2>{tryoutScoreLabel(method, current?.isCompleteUtbk)}</h2>
          <p className={styles.score}>
            {formatTryoutScore(report.score)}
            <span>/ 1.000</span>
          </p>
          <p className={styles.scoreContext}>
            {current
              ? current.isCompleteUtbk
                ? "Rata-rata tujuh subtes"
                : `Rata-rata ${current.subtests.length} subtes yang dikerjakan`
              : "Nilai tersimpan dengan metode sesi lama"}
          </p>
          <dl className={styles.summaryFacts}>
            <div>
              <dt>Akurasi</dt>
              <dd>{report.accuracy}%</dd>
            </div>
            <div>
              <dt>Total soal</dt>
              <dd>{report.totalCount}</dd>
            </div>
          </dl>
          {varied && lowest && (
            <p className={styles.practiceHint}>
              <strong>Prioritas latihan: {subtestShort(lowest.slug)}</strong>
              <span>
                {lowest.name} memiliki skor dasar terendah pada sesi ini: {lowest.score}/1.000.
              </span>
            </p>
          )}
          {current?.method === "irt-2pl" && (
            <p className={styles.scoreContext}>
              Rata-rata skor dasar: {formatTryoutScore(current.simulationScore)}.
            </p>
          )}
        </div>
        {current && (
          <div className={styles.profile}>
            <h2>Sebaran skor subtes</h2>
            <TryoutRadar subtests={current.subtests} useIrt={current.method === "irt-2pl"} />
          </div>
        )}
      </div>
      <dl className={styles.answerStats}>
        {stats.map((stat) => (
          <div key={stat.label} className={stat.className}>
            <dt>
              <span className={styles.statusDot} />
              {stat.label}
            </dt>
            <dd>
              {stat.value}
              <span>soal</span>
            </dd>
          </div>
        ))}
      </dl>
      {current && (
        <section className={styles.subtests} aria-labelledby="tryout-subtest-heading">
          <h2 id="tryout-subtest-heading">Rincian subtes</h2>
          <div className={styles.tableScroll}>
            <table>
              <thead>
                <tr>
                  <th>Subtes</th>
                  <th className={styles.numeric}>Benar / soal</th>
                  <th className={styles.numeric}>{hasIrt ? "Dasar" : "Skor"}</th>
                  {hasIrt && <th className={styles.numeric}>IRT 2PL</th>}
                </tr>
              </thead>
              <tbody>
                {current.subtests.map((row) => (
                  <tr key={row.slug}>
                    <th scope="row">
                      <span className={styles.subtestName}>
                        <span className={styles.subtestCode}>{subtestShort(row.slug)}</span>
                        <span>{row.name}</span>
                      </span>
                    </th>
                    <td className={styles.numeric}>
                      {row.correctCount}
                      <span className={styles.muted}> / {row.totalCount}</span>
                    </td>
                    <td className={styles.numeric}>
                      <strong>{formatTryoutScore(row.score)}</strong>
                    </td>
                    {hasIrt && (
                      <td className={styles.numeric}>
                        <strong>{formatTryoutScore(row.irt?.score ?? null)}</strong>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <details className={styles.methodDetails}>
            <summary>Metode skor dan status kalibrasi</summary>
            <p>
              Skor dasar mengikuti poin jawaban tanpa bonus kecepatan. Rata-rata UTBK membutuhkan
              tujuh subtes lengkap.
            </p>
            <ul>
              {current.subtests.map((row) => (
                <li key={row.slug}>
                  <strong>{subtestShort(row.slug)}</strong>: {statuses[row.irtStatus]}
                  {row.irt && (
                    <>
                      {" "}
                      · {row.irt.version}, θ {row.irt.theta.toFixed(2)} ±{" "}
                      {row.irt.standardError.toFixed(2)} SE
                    </>
                  )}
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}
    </section>
  );
}
