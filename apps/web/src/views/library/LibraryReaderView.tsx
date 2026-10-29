import { useEffect } from "react";
import { Link, useLoaderData } from "react-router";
import { ArrowLeft, ArrowUp, ExternalLink, Hash } from "lucide-react";
import type { LibraryItemSummary } from "@latveria/shared";
import { extractYouTubeVideoId, utbkSubtests } from "@latveria/shared";
import { MathText } from "../../components/math/math-text";
import { Button } from "../../components/ui/button";
import { PageHeading, Panel } from "../../components/ui/dashboard";

export function LibraryReaderView() {
  const item = useLoaderData<LibraryItemSummary>();
  const subtest = utbkSubtests.find((s) => s.slug === item.subtestSlug);
  const youtubeVideoId = item.type === "video" ? extractYouTubeVideoId(item.url || "") : null;

  useEffect(() => {
    const scrollContainer = document.querySelector(".latveria-content-scroll");
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [item?.id]);

  const handleScrollToTop = () => {
    const scrollContainer = document.querySelector(".latveria-content-scroll");
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement?.scrollTo({ top: 0, behavior: "smooth" });
    document.body?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="latveria-view-container motion-page-enter max-w-4xl mx-auto space-y-5 sm:space-y-6 pb-20 sm:pb-16 px-1 sm:px-0">
      {/* Navigasi atas & badge metadata */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline" size="sm" className="h-9 px-3">
          <Link to="/dashboard?tab=library">
            <ArrowLeft className="w-4 h-4 mr-1.5 shrink-0" />
            <span>Kembali ke Library</span>
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
              item.type === "video"
                ? "bg-red-500/10 text-red-400 border border-red-500/30"
                : item.type === "article"
                  ? "bg-[var(--emerald)]/10 text-[var(--emerald)] border border-[var(--emerald)]/30"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
            }`}
          >
            {item.type === "video"
              ? "Video UTBK"
              : item.type === "article"
                ? "Artikel Konsep"
                : "Tautan Rujukan"}
          </span>
          {subtest && (
            <span
              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[var(--surface-elevated)] text-[var(--ink)] border border-[var(--edge)] max-w-[220px] sm:max-w-none truncate"
              title={`${subtest.short} - ${subtest.name}`}
            >
              {subtest.short} - {subtest.name}
            </span>
          )}
        </div>
      </div>

      <PageHeading
        title={item.title}
        description={
          subtest
            ? `Materi pendamping untuk subtes ${subtest.name}`
            : "Materi belajar dan referensi UTBK-SNBT"
        }
      />

      {/* Media Video */}
      {item.type === "video" && youtubeVideoId && (
        <div className="aspect-video w-full rounded-xl sm:rounded-2xl overflow-hidden border border-[var(--edge)] shadow-lg bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}`}
            title={item.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>
      )}

      {/* Cover Gambar jika tersedia untuk Artikel/Rujukan */}
      {item.type !== "video" && item.thumbnailUrl && (
        <div className="aspect-[21/9] sm:aspect-[2.4/1] w-full rounded-xl sm:rounded-2xl overflow-hidden border border-[var(--edge)] bg-[var(--surface-elevated)] shadow-sm">
          <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Kartu Tautan Rujukan Eksternal */}
      {item.type === "link" && item.url && (
        <Panel className="p-4 sm:p-5 border-amber-500/30 bg-amber-500/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0 flex-1">
            <span className="text-[11px] text-amber-400 font-bold uppercase tracking-wider block">
              Tautan Dokumen / Modul Rujukan
            </span>
            <p className="text-xs text-[var(--ink-muted)] font-mono break-all line-clamp-2 sm:line-clamp-none">
              {item.url}
            </p>
          </div>
          <Button asChild size="sm" className="w-full sm:w-auto shrink-0 justify-center">
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              <span>Buka Tautan Sumber</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
            </a>
          </Button>
        </Panel>
      )}

      {/* Konten Bacaan Utama / Catatan */}
      {item.content && (
        <Panel className="p-4 sm:p-6 md:p-8 space-y-4 overflow-hidden">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            {item.type === "article" ? "Uraian Materi" : "Catatan Tambahan"}
          </h2>
          <div className="prose prose-invert max-w-none text-sm sm:text-base text-[var(--ink)] leading-relaxed sm:leading-loose whitespace-pre-wrap break-words [overflow-wrap:anywhere] overflow-x-auto">
            <MathText>{item.content}</MathText>
          </div>
        </Panel>
      )}

      {/* Tag Topik */}
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {item.tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-[var(--surface-elevated)] text-[var(--ink-muted)] border border-[var(--edge)] font-mono"
            >
              <Hash className="w-3 h-3 text-[var(--gold)] shrink-0" />
              <span>{t}</span>
            </span>
          ))}
        </div>
      )}

      {/* Navigasi footer bawah untuk kemudahan mobile */}
      <div className="pt-4 border-t border-[var(--edge)] flex items-center justify-between gap-3">
        <Button asChild variant="outline" size="sm" className="h-9 px-3">
          <Link to="/dashboard?tab=library">
            <ArrowLeft className="w-4 h-4 mr-1.5 shrink-0" />
            <span>Kembali ke Library</span>
          </Link>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 px-3 text-xs text-[var(--ink-muted)] hover:text-[var(--ink)]"
          onClick={handleScrollToTop}
        >
          <ArrowUp className="w-3.5 h-3.5 mr-1" />
          <span>Ke atas</span>
        </Button>
      </div>
    </div>
  );
}
