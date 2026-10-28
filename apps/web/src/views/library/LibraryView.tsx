import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import {
  BookOpen,
  Compass,
  ExternalLink,
  FileText,
  Filter,
  Hash,
  Search,
  Sparkles,
  Video,
} from "lucide-react";
import type { LibraryItemListResponse, LibraryItemSummary } from "@latveria/shared";
import { utbkSubtests } from "@latveria/shared";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { PageHeading, Panel } from "../../components/ui/dashboard";
import styles from "./library.module.css";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { VocabularyCollection } from "../../components/lexicon/vocabulary-collection";

export function LibraryView() {
  const [items, setItems] = useState<LibraryItemSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [cari, setCari] = useState("");
  const [subtestSlug, setSubtestSlug] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cari.trim()) params.set("cari", cari.trim());
      if (subtestSlug !== "all") params.set("subtestSlug", subtestSlug);
      if (selectedType !== "all") params.set("type", selectedType);

      const res = await api<LibraryItemListResponse>(`/learner/library?${params.toString()}`);
      setItems(res.rows || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [cari, subtestSlug, selectedType]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  const hasFilter = cari.trim() !== "" || subtestSlug !== "all" || selectedType !== "all";

  return (
    <div className={`latveria-view-container motion-page-enter ${styles.container}`}>
      <PageHeading
        title="Library"
        description="Materi pendamping dan kosakata LBE yang kamu simpan."
      />
      <Tabs defaultValue="materi">
        <TabsList aria-label="Isi Library">
          <TabsTrigger value="materi">Materi</TabsTrigger>
          <TabsTrigger value="vocabulary">Kosakata LBE</TabsTrigger>
        </TabsList>
        <TabsContent value="vocabulary">
          <VocabularyCollection />
        </TabsContent>
        <TabsContent value="materi" className="space-y-6">
          {/* Bar kontrol pencarian dan filter */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none" />
              <Input
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                placeholder="Cari materi pembelajaran…"
                aria-label="Cari materi pembelajaran"
                className="pl-9 w-full bg-[var(--surface-elevated)]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={subtestSlug}
                onChange={(e) => setSubtestSlug(e.target.value)}
                className="latveria-input text-xs font-semibold px-3 py-2 rounded-lg bg-[var(--surface-elevated)] border border-[var(--edge)] text-[var(--ink)]"
                aria-label="Filter subtes"
              >
                <option value="all">Semua Subtes</option>
                {utbkSubtests.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.short} - {s.name}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 bg-[var(--surface-elevated)] p-1 rounded-lg border border-[var(--edge)] text-xs">
                {(
                  [
                    { value: "all", label: "Semua" },
                    { value: "article", label: "Artikel" },
                    { value: "video", label: "Video" },
                    { value: "link", label: "Rujukan" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setSelectedType(t.value)}
                    className={`px-2.5 py-1 rounded font-medium transition-colors ${
                      selectedType === t.value
                        ? "bg-[var(--gold)]/10 text-[var(--gold)] font-bold"
                        : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-[var(--edge)] bg-[var(--surface-elevated)] h-64 motion-skeleton"
                />
              ))}
            </div>
          ) : items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((item) => {
                const subtest = utbkSubtests.find((s) => s.slug === item.subtestSlug);
                return (
                  <div
                    key={item.id}
                    className="flex flex-col rounded-2xl border border-[var(--edge)] bg-[var(--surface-elevated)] overflow-hidden transition-all duration-200 hover:border-[var(--gold)]/40 hover:shadow-lg group"
                  >
                    {/* Cover 16:9 */}
                    <div className="aspect-video w-full relative bg-zinc-950 overflow-hidden">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[var(--surface)]/60 text-[var(--ink-muted)]">
                          {item.type === "video" ? (
                            <Video className="w-10 h-10 text-red-400/40" />
                          ) : item.type === "article" ? (
                            <FileText className="w-10 h-10 text-[var(--emerald)]/40" />
                          ) : (
                            <ExternalLink className="w-10 h-10 text-amber-400/40" />
                          )}
                        </div>
                      )}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                            item.type === "video"
                              ? "bg-red-950/80 text-red-300 border border-red-500/40"
                              : item.type === "article"
                                ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                                : "bg-amber-950/80 text-amber-300 border border-amber-500/40"
                          }`}
                        >
                          {item.type === "video"
                            ? "Video UTBK"
                            : item.type === "article"
                              ? "Artikel"
                              : "Rujukan"}
                        </span>
                        {subtest && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-900/80 text-zinc-300 border border-zinc-700/60 backdrop-blur-md">
                            {subtest.short}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Konten kartu */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <h3 className="font-bold text-base text-[var(--ink)] leading-snug line-clamp-2 group-hover:text-[var(--gold)] transition-colors">
                          <Link to={`/dashboard/library/${item.slug}`}>{item.title}</Link>
                        </h3>

                        {item.content && (
                          <p className="text-xs text-[var(--ink-muted)] line-clamp-2 leading-relaxed">
                            {item.content.replace(/[$#*`]/g, "")}
                          </p>
                        )}
                      </div>

                      <div className="space-y-3 pt-2 border-t border-[var(--edge)]/60">
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded bg-[var(--surface)] text-[var(--ink-muted)] font-mono"
                              >
                                <Hash className="w-2.5 h-2.5 text-[var(--gold)]" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <Button asChild variant="outline" size="sm" className="w-full">
                          <Link to={`/dashboard/library/${item.slug}`}>
                            <span>Buka Materi</span>
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : hasFilter ? (
            <Panel className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[var(--surface-elevated)] border border-[var(--edge)] mx-auto flex items-center justify-center text-[var(--ink-muted)]">
                <Filter className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-[var(--ink)]">Tidak ada materi yang cocok</h3>
              <p className="text-xs text-[var(--ink-muted)] max-w-sm mx-auto">
                Coba ubah kata kunci pencarian atau sesuaikan pilihan subtes dan tipe materi.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCari("");
                  setSubtestSlug("all");
                  setSelectedType("all");
                }}
              >
                Reset Filter
              </Button>
            </Panel>
          ) : (
            <Panel className={styles.empty}>
              <div className={styles.icon}>
                <BookOpen size={30} aria-hidden="true" />
              </div>
              <h2>Materi belum tersedia</h2>
              <p>
                Library akan menjadi tempat membaca ringkasan konsep, rumus, dan contoh sebelum kamu
                masuk ke soal. Untuk sekarang, paket soal ada di Drilling dan tryout ada di Battle
                World.
              </p>
              <div className={styles.actions}>
                <Button asChild>
                  <Link to="/dashboard?tab=practice">
                    <Compass />
                    Buka Drilling
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/dashboard?tab=tryout">
                    <Sparkles />
                    Buka Battle World
                  </Link>
                </Button>
              </div>
            </Panel>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
