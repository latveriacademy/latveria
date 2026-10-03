export function SubmissionSummary({ total, answered }: { total: number; answered: number }) {
  return (
    <dl className="submit-summary-quad font-mono">
      {[
        { label: "TOTAL SOAL", value: total, color: "text-primary" },
        { label: "TERJAWAB", value: answered, color: "text-sage" },
        { label: "BELUM DIJAWAB", value: Math.max(0, total - answered), color: "text-crimson" },
      ].map((item) => (
        <div key={item.label} className="sum-quad-tile">
          <dt className="s-label">{item.label}</dt>
          <dd className={`s-val m-0 ${item.color}`}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
