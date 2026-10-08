import type { UtbkScoreReport, LatveriaScoreResult } from "@latveria/shared";

export function TryoutScoreReport({ report }: { report: UtbkScoreReport | LatveriaScoreResult }) {
  if (!("version" in report))
    return (
      <p>
        Skor Latveria {report.score}/1.000 · Akurasi {report.accuracy}% · {report.correctCount}/
        {report.totalCount} benar. Metode sesi lama dipertahankan.
      </p>
    );
  const statuses = {
    unavailable: "Belum dikalibrasi",
    "partial-credit": "Model kredit parsial belum tersedia",
    "missing-items": "Versi soal belum dikalibrasi",
    calibrated: "Terkalibrasi",
  };
  return (
    <section className="w-full min-w-0 space-y-4 text-left" aria-label="Hasil skor simulasi UTBK">
      <h3 className="font-serif text-2xl font-semibold text-center">
        {report.method === "irt-2pl"
          ? "Skor simulasi IRT 2PL"
          : report.isCompleteUtbk
            ? "Skor simulasi UTBK"
            : "Rata-rata subtes Tryout"}
        : {report.score}/1.000
      </h3>
      <p className="text-sm text-[var(--soft-ink)] text-center">
        {report.correctCount} benar · {report.incorrectCount} salah · {report.partialCount} sebagian
        benar · {report.unansweredCount} kosong. Akurasi {report.accuracy}%.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--edge)] text-left">
              <th className="p-2">Subtes</th>
              <th className="p-2 text-right">Skor dasar</th>
              <th className="p-2 text-right">IRT 2PL</th>
              <th className="p-2">Status IRT</th>
            </tr>
          </thead>
          <tbody>
            {report.subtests.map((s) => (
              <tr key={s.slug} className="border-b border-[var(--edge)]">
                <th scope="row" className="p-2 font-normal">
                  {s.name}
                </th>
                <td className="p-2 text-right font-mono">{s.score}</td>
                <td className="p-2 text-right font-mono">{s.irt?.score ?? "—"}</td>
                <td className="p-2 text-[var(--soft-ink)]">
                  {statuses[s.irtStatus]}
                  {s.irt && (
                    <span className="block text-xs">
                      {s.irt.version} · θ {s.irt.theta.toFixed(2)} ±{" "}
                      {s.irt.standardError.toFixed(2)} SE
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--soft-ink)]">
        Skor dasar mengikuti poin jawaban tanpa bonus kecepatan. Rata-rata UTBK membutuhkan tujuh
        subtes lengkap. Skor IRT memakai skala latveriacademy; hasil ini bukan skor resmi atau
        prediksi skor UTBK.
      </p>
    </section>
  );
}
