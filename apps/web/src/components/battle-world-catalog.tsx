import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Clock, FileText, Play, Swords } from "lucide-react";
import { Button } from "./ui/button";
import { PageHeading, Panel } from "./ui/dashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import styles from "./battle-world-catalog.module.css";

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
  category?: string;
}

export function BattleWorldCatalog({
  packages,
  catalogError,
  actionError,
  starting,
  activeSessionId,
  onStart,
  onResume,
}: {
  packages: TryoutPackage[];
  catalogError: string;
  actionError: string;
  starting: boolean;
  activeSessionId: string | null;
  onStart: (id: string) => void;
  onResume: (sessionId: string) => void;
}) {
  const categories = [
    { value: "utbk", label: "UTBK" },
    { value: "tka", label: "TKA" },
    { value: "mandiri", label: "Ujian Mandiri" },
  ];
  const [category, setCategory] = useState("utbk");
  const filteredPackages = packages.filter((pkg) => (pkg.category || "utbk") === category);
  const categoryLabel = categories.find((item) => item.value === category)?.label;
  return (
    <div className={`latveria-view-container motion-page-enter ${styles.catalog}`}>
      <PageHeading
        title="Battle World"
        description="Pilih jenis ujian dan kerjakan tryout berwaktu."
      />
      <Tabs value={category} onValueChange={setCategory}>
        <TabsList aria-label="Jenis ujian" className="max-w-full">
          {categories.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={category}>
          {activeSessionId && (
            <div
              className={`${styles.resume} flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--edge)] bg-[var(--surface)]`}
            >
              <p className="m-0 text-sm text-[var(--soft-ink)]">Ada sesi tryout yang tersimpan.</p>
              <Button
                variant="outline"
                disabled={starting}
                onClick={() => onResume(activeSessionId)}
              >
                Lanjutkan sesi <ArrowRight size={16} />
              </Button>
            </div>
          )}
          {actionError && filteredPackages.length > 0 && (
            <p role="alert" className="mb-4 text-sm text-[var(--crimson)]">
              {actionError}
            </p>
          )}
          {!filteredPackages.length ? (
            <Panel className="battle-world-empty">
              <Swords size={32} aria-hidden="true" />
              <h2>
                {catalogError ? "Tryout belum dapat dimuat" : `Belum ada tryout ${categoryLabel}`}
              </h2>
              <p>
                {actionError ||
                  catalogError ||
                  `Paket tryout ${categoryLabel} yang sudah diterbitkan akan muncul di sini. Sambil menunggu, latihan lewat Drilling.`}
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
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredPackages.map((pkg) => (
                <Panel key={pkg.id} className={`${styles.card} flex min-w-0 flex-col gap-5 p-5`}>
                  <div>
                    <h2 className={`${styles.title} font-serif text-[var(--ink)]`}>{pkg.name}</h2>
                    <p className="mb-0 mt-2 text-sm leading-relaxed text-[var(--soft-ink)]">
                      {pkg.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--soft-ink)]">
                    <span className="inline-flex items-center gap-2">
                      <FileText size={16} aria-hidden="true" />
                      {pkg.questionCount} soal
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Clock size={16} aria-hidden="true" />
                      {pkg.durationMinutes ?? pkg.duration ?? 30} menit
                    </span>
                    <span>{pkg.isFullTryout ? "7 subtes" : "1 subtes"}</span>
                  </div>
                  <div className="mt-auto border-t border-[var(--edge)] pt-4">
                    <Button
                      className="w-full"
                      loading={starting}
                      loadingText="Menyiapkan tryout…"
                      onClick={() => onStart(pkg.id)}
                    >
                      <Play size={16} /> Mulai tryout
                    </Button>
                  </div>
                </Panel>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
