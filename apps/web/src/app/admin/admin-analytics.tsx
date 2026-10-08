import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigation, Link } from "react-router";
import { AlertTriangle, CheckCircle, Loader2, BarChart3 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { PageHeading } from "../../components/ui/dashboard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { api, ApiError } from "../../lib/api";
import { utbkSubtests } from "@latveria/shared";

interface QuestionStats {
  questionId: string;
  topicSlug: string;
  topicName: string;
  prompt: string;
  attempts: number;
  correctCount: number;
  correctRate: number;
  needsReview: boolean;
}

interface AnalyticsResponse {
  rows: QuestionStats[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pageCount: number;
  };
  minAttempts: number;
}

export function AdminAnalytics() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const subtest = searchParams.get("subtest") ?? "all";
  const sortBy = searchParams.get("sort") ?? "accuracy";
  const page = parseInt(searchParams.get("page") ?? "1", 10);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (subtest !== "all") params.set("subtest", subtest);
      params.set("sort", sortBy);
      params.set("page", String(page));
      params.set("limit", "50");

      const result = await api<AnalyticsResponse>(`/admin/analytics/questions?${params}`);
      setData(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat data analytics.");
    } finally {
      setLoading(false);
    }
  }, [subtest, sortBy, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "all") next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.set("page", "1");
    if (key === "subtest") next.delete("sort");
    setSearchParams(next);
  };

  return (
    <div className="motion-page-enter">
      <PageHeading
        title="Analytics Soal"
        description={`Minimal ${data?.minAttempts ?? 10} percobaan untuk ditampilkan`}
      />

      {error && (
        <div className="mb-4 p-4 border border-red-500/50 bg-red-500/10 rounded-md text-red-400">
          {error}
          <Button variant="ghost" size="sm" className="ml-4" onClick={fetchData}>
            Coba lagi
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--soft-ink)]">Subtes:</span>
          <Select value={subtest} onValueChange={(v) => updateFilter("subtest", v)}>
            <SelectTrigger aria-label="Subtes" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua subtes</SelectItem>
              {utbkSubtests.map((st) => (
                <SelectItem key={st.slug} value={st.slug}>
                  {st.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--soft-ink)]">Urutkan:</span>
          <Select value={sortBy} onValueChange={(v) => updateFilter("sort", v)}>
            <SelectTrigger aria-label="Urutan statistik soal" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="accuracy">Tingkat kebenaran (asc)</SelectItem>
              <SelectItem value="attempts">Jumlah percobaan</SelectItem>
              <SelectItem value="correct">Jumlah benar</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && !data && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-[var(--gold)]" />
        </div>
      )}

      {data && (
        <>
          <div className="mb-4 flex items-center gap-4 text-sm text-[var(--soft-ink)]">
            <span>
              {data.pagination.total} soal dengan minimal {data.minAttempts} percobaan
            </span>
            {(loading || isNavigating) && <Loader2 className="size-4 animate-spin" />}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--edge)] text-left">
                  <th className="py-3 px-4 text-sm font-semibold text-[var(--ink)]">#</th>
                  <th className="py-3 px-4 text-sm font-semibold text-[var(--ink)]">Subtes</th>
                  <th className="py-3 px-4 text-sm font-semibold text-[var(--ink)]">Soal</th>
                  <th className="py-3 px-4 text-sm font-semibold text-[var(--ink)] text-right">
                    Percobaan
                  </th>
                  <th className="py-3 px-4 text-sm font-semibold text-[var(--ink)] text-right">
                    Benar
                  </th>
                  <th className="py-3 px-4 text-sm font-semibold text-[var(--ink)] text-right">
                    Tingkat
                  </th>
                  <th className="py-3 px-4 text-sm font-semibold text-[var(--ink)]">Status</th>
                  <th className="py-3 px-4 text-sm font-semibold text-[var(--ink)]">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[var(--soft-ink)]">
                      Tidak ada soal dengan minimal {data.minAttempts} percobaan.
                    </td>
                  </tr>
                ) : (
                  data.rows.map((row, idx) => (
                    <tr
                      key={row.questionId}
                      className="border-b border-[var(--edge)] hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      <td className="py-3 px-4 text-sm text-[var(--soft-ink)]">
                        {(page - 1) * data.pagination.limit + idx + 1}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className="text-[var(--ink)]">{row.topicName}</span>
                      </td>
                      <td className="py-3 px-4 text-sm max-w-md">
                        <span className="line-clamp-2 text-[var(--ink)]" title={row.prompt}>
                          {row.prompt}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-[var(--ink)] font-mono">
                        {row.attempts}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-[var(--ink)] font-mono">
                        {row.correctCount}
                      </td>
                      <td className="py-3 px-4 text-sm text-right">
                        <span
                          className={`font-mono font-semibold ${
                            row.correctRate >= 70
                              ? "text-green-500"
                              : row.correctRate >= 50
                                ? "text-yellow-500"
                                : "text-red-500"
                          }`}
                        >
                          {row.correctRate}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {row.needsReview ? (
                          <span className="inline-flex items-center gap-1 text-sm text-amber-500">
                            <AlertTriangle size={14} />
                            Perlu dicek
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-sm text-green-500">
                            <CheckCircle size={14} />
                            OK
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/admin/soal/${row.questionId}`}>
                            <BarChart3 size={14} />
                            Detail
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data.pagination.pageCount > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || isNavigating || loading}
                onClick={() => updateFilter("page", String(page - 1))}
              >
                Sebelumnya
              </Button>
              <span className="text-sm text-[var(--soft-ink)]">
                Halaman {page} dari {data.pagination.pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.pagination.pageCount || isNavigating || loading}
                onClick={() => updateFilter("page", String(page + 1))}
              >
                Berikutnya
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
