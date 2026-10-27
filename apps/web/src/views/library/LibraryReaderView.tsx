import { Link, useLoaderData } from "react-router";
import { ArrowLeft, ExternalLink, Hash } from "lucide-react";
import type { LibraryItemSummary } from "@latveria/shared";
import { extractYouTubeVideoId, utbkSubtests } from "@latveria/shared";
import { MathText } from "../../components/math/math-text";
import { Button } from "../../components/ui/button";
import { PageHeading, Panel } from "../../components/ui/dashboard";

export function LibraryReaderView() {
  const item = useLoaderData<LibraryItemSummary>();
  const subtest = utbkSubtests.find((s) => s.slug === item.subtestSlug);
  const youtubeVideoId = item.type === "video" ? extractYouTubeVideoId(item.url || "") : null;

  return (
    <div className="latveria-view-container motion-page-enter max-w-4xl mx-auto space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <Button asChild variant="outline" size="sm">
          <Link to="/dashboard?tab=library">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Kembali ke Library
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
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
            <span className="px-2.5 py-0.5 rounded text-[11px] font-medium bg-[var(--surface-elevated)] text-[var(--ink)] border border-[var(--edge)]">
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

      {item.type === "video" && youtubeVideoId && (
        <div className="aspect-video w-full rounded-2xl overflow-hidden border border-[var(--edge)] shadow-xl bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}`}
            title={item.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>
      )}

      {item.type === "link" && item.url && (
        <Panel className="p-5 border-amber-500/30 bg-amber-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] text-amber-400 font-bold uppercase tracking-wider block">
              Tautan Dokumen / Modul Rujukan
            </span>
            <p className="text-xs text-[var(--ink-muted)] font-mono break-all">{item.url}</p>
          </div>
          <Button asChild size="sm">
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              <span>Buka Tautan Sumber</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
            </a>
          </Button>
        </Panel>
      )}

      {item.content && (
        <Panel className="p-6 sm:p-8 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            {item.type === "article" ? "Uraian Materi" : "Catatan Tambahan"}
          </h2>
          <div className="prose prose-invert max-w-none text-sm sm:text-base text-[var(--ink)] leading-relaxed whitespace-pre-wrap">
            <MathText>{item.content}</MathText>
          </div>
        </Panel>
      )}

      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2">
          {item.tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-[var(--surface-elevated)] text-[var(--ink-muted)] border border-[var(--edge)] font-mono"
            >
              <Hash className="w-3 h-3 text-[var(--gold)]" />
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
