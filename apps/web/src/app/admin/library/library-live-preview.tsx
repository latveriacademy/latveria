import { ExternalLink } from "lucide-react";
import { utbkSubtests, type LibraryItemType } from "@latveria/shared";
import { MathText } from "../../../components/math/math-text";

interface LibraryLivePreviewProps {
  type: LibraryItemType;
  subtestSlug: string;
  isPublished: boolean;
  title: string;
  url: string;
  content: string;
  youtubeVideoId: string | null;
}

export function LibraryLivePreview({
  type,
  subtestSlug,
  isPublished,
  title,
  url,
  content,
  youtubeVideoId,
}: LibraryLivePreviewProps) {
  const subtest = utbkSubtests.find((s) => s.slug === subtestSlug);

  return (
    <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
      <div className="p-4 rounded-xl border border-[var(--edge)] bg-[var(--surface-elevated)] space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-[var(--surface)] border border-[var(--edge)] text-[var(--gold)]">
            {type}
          </span>
          {subtest && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--surface-muted)] text-[var(--ink)]">
              {subtest.name}
            </span>
          )}
          <span
            className={`ml-auto px-2 py-0.5 rounded text-xs font-semibold ${
              isPublished
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/30"
            }`}
          >
            {isPublished ? "Tayang" : "Draf"}
          </span>
        </div>

        <h3 className="text-xl font-bold text-[var(--ink)]">
          {title || "Judul Materi (Belum diisi)"}
        </h3>

        {type === "video" && youtubeVideoId && (
          <div className="aspect-video w-full rounded-lg overflow-hidden border border-[var(--edge)] shadow-lg bg-black">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}`}
              title={title || "YouTube video"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>
        )}

        {type === "link" && url && (
          <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 flex items-center justify-between">
            <div className="truncate mr-2">
              <span className="text-xs text-amber-400 font-semibold uppercase block">
                Tautan Tujuan:
              </span>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-[var(--ink)] hover:underline truncate"
              >
                {url}
              </a>
            </div>
            <ExternalLink className="w-4 h-4 text-amber-400 shrink-0" />
          </div>
        )}

        {content ? (
          <div className="prose prose-invert max-w-none text-sm text-[var(--ink)]/90 leading-relaxed border-t border-[var(--edge)] pt-3 whitespace-pre-wrap">
            <MathText>{content}</MathText>
          </div>
        ) : (
          <p className="text-xs text-[var(--ink-muted)] italic">Tidak ada catatan teks materi.</p>
        )}
      </div>
    </div>
  );
}
