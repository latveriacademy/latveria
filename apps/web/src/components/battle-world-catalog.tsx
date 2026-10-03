import { Link } from "react-router";
import { ArrowRight, Play, Swords } from "lucide-react";
import { Button } from "./ui/button";
import { PageHeading, Panel } from "./ui/dashboard";

export interface TryoutPackage {
  id: string;
  name: string;
  description: string;
  durationMinutes?: number;
  duration?: number;
  isFullTryout?: boolean;
  packageType?: string;
  questionCount: number;
  targetQuestions?: number;
  published?: boolean;
}

const SUBTEST_SCHEDULE: { name: string; duration: number; isBreak?: boolean }[] = [
  { name: "Penalaran Umum", duration: 30 },
  { name: "Pengetahuan & Pemahaman Umum", duration: 15 },
  { name: "Pemahaman Bacaan & Menulis", duration: 25 },
  { name: "Pengetahuan Kuantitatif", duration: 20 },
  { name: "Literasi dalam Bahasa Indonesia", duration: 45 },
  { name: "Literasi dalam Bahasa Inggris", duration: 30 },
  { name: "Penalaran Matematika", duration: 30 },
].flatMap((subtest, index) =>
  index === 4
    ? [{ name: "Jeda Istirahat Terjadwal", duration: 15, isBreak: true }, subtest]
    : [subtest],
);

export function BattleWorldCatalog({
  packages,
  catalogError,
  actionError,
  starting,
  onStart,
}: {
  packages: TryoutPackage[];
  catalogError: string;
  actionError: string;
  starting: boolean;
  onStart: (id: string) => void;
}) {
  if (!packages.length)
    return (
      <div className="latveria-view-container">
        <PageHeading title="Battle World" description="Tryout full dan simulasi berwaktu." />
        <Panel className="battle-world-empty">
          <Swords size={32} aria-hidden="true" />
          <h2>{catalogError ? "Tryout belum dapat dimuat" : "Belum ada tryout siap dimainkan"}</h2>
          <p>
            {actionError ||
              catalogError ||
              "Tryout full yang sudah diterbitkan akan muncul di sini. Sambil menunggu, asah skill per subtes lewat Drilling."}
          </p>
          {catalogError ? (
            <Button variant="outline" onClick={() => window.location.reload()}>
              Coba lagi
            </Button>
          ) : (
            <Button asChild>
              <Link to="/dashboard?tab=practice">
                Gas drilling
                <ArrowRight />
              </Link>
            </Button>
          )}
        </Panel>
      </div>
    );
  return (
    <div className="latveria-view-container motion-page-enter">
      <PageHeading
        title="Battle World"
        description="Kerjakan rangkaian subtes, pantau waktu, dan lanjutkan sesi dari perangkat yang sama."
      />
      <div className="grid gap-6 mt-6">
        {packages.map((pkg) => (
          <Panel key={pkg.id} className="p-7">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex-1 min-w-0">
                <span className="font-mono text-xs text-[var(--gold)] uppercase tracking-wider block mb-1">
                  {pkg.isFullTryout ? "TRYOUT FULL" : "TRYOUT SUBTES"}
                </span>
                <h3 className="font-serif text-2xl font-bold mb-2">{pkg.name}</h3>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-2xl mb-4">
                  {pkg.description}
                </p>
                <div className="border-t border-[var(--border-subtle)] pt-4 mt-4">
                  <span className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-wider block mb-3">
                    {pkg.isFullTryout ? "ALUR SUBTES DAN JEDA:" : "FORMAT SESI:"}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(pkg.isFullTryout
                      ? SUBTEST_SCHEDULE
                      : [{ name: `${pkg.questionCount} soal`, duration: pkg.duration ?? 30 }]
                    ).map((sub, index) => (
                      <span
                        key={index}
                        className="font-mono text-xs px-2.5 py-1 rounded"
                        style={{
                          background: sub.isBreak
                            ? "var(--accent-gold-dim)"
                            : "var(--surface-muted)",
                          border: `1px solid ${sub.isBreak ? "var(--accent-gold)" : "var(--border-subtle)"}`,
                          color: sub.isBreak ? "var(--accent-gold)" : "var(--text-primary)",
                        }}
                      >
                        {sub.name} ({sub.duration}m)
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-3">
                <span className="font-mono text-xs text-[var(--text-muted)]">
                  {pkg.questionCount} SOAL · {pkg.duration ?? 30} MENIT
                </span>
                <Button
                  className="btn-gold-solid"
                  loading={starting}
                  loadingText="Menyiapkan tryout…"
                  onClick={() => onStart(pkg.id)}
                >
                  <Play size={16} />
                  Mulai tryout
                </Button>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
