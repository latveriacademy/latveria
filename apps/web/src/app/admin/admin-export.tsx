import { useState } from "react";
import { Download, Users, BookOpen, BarChart3, Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { PageHeading } from "../../components/ui/dashboard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { utbkSubtests } from "@latveria/shared";

type ExportType = "users" | "questions" | "leaderboard";

interface ExportOption {
  id: ExportType;
  label: string;
  description: string;
  icon: React.ElementType;
  fields: { name: string; key: string; options?: string[] }[];
  defaultValues: Record<string, string>;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: "users",
    label: "Daftar User",
    description: "Ekspor semua data user termasuk statistik latihan",
    icon: Users,
    fields: [
      { name: "format", key: "format", options: ["json", "csv"] },
      { name: "cari", key: "search" },
    ],
    defaultValues: { format: "csv", search: "" },
  },
  {
    id: "questions",
    label: "Bank Soal",
    description: "Ekspor semua soal beserta jawaban dan pembahasan",
    icon: BookOpen,
    fields: [
      { name: "format", key: "format", options: ["json", "csv"] },
      { name: "subtes", key: "subtes", options: ["semua", ...utbkSubtests.map((s) => s.slug)] },
    ],
    defaultValues: { format: "csv", subtes: "semua" },
  },
  {
    id: "leaderboard",
    label: "Leaderboard",
    description: "Ekspor data leaderboard dengan filter metrik dan periode",
    icon: BarChart3,
    fields: [
      { name: "format", key: "format", options: ["json", "csv"] },
      {
        name: "metrik",
        key: "metric",
        options: ["xp", "answered", "correct", "accuracy", "streak"],
      },
      {
        name: "subtes",
        key: "subtest",
        options: ["all", "PU", "PPU", "PBM", "PK", "BI", "EN", "PM"],
      },
      { name: "periode", key: "period", options: ["daily", "weekly", "monthly", "all"] },
    ],
    defaultValues: { format: "csv", metric: "xp", subtest: "all", period: "all" },
  },
];

const METRIC_LABELS: Record<string, string> = {
  xp: "XP Total",
  answered: "Soal Dijawab",
  correct: "Soal Benar",
  accuracy: "Akurasi",
  streak: "Streak",
};

const PERIOD_LABELS: Record<string, string> = {
  daily: "Harian",
  weekly: "Mingguan",
  monthly: "Bulanan",
  all: "Semua Waktu",
};

export function AdminExport() {
  const [selectedExport, setSelectedExport] = useState<ExportType>("users");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({
    format: "csv",
    search: "",
    subtes: "semua",
    metric: "xp",
    subtest: "all",
    period: "all",
  });

  const currentOption = EXPORT_OPTIONS.find((o) => o.id === selectedExport)!;

  const handleExport = async () => {
    try {
      setError(null);
      setExporting(true);
      const params = new URLSearchParams();
      params.set("format", values.format);

      if (selectedExport === "users" && values.search) {
        params.set("search", values.search);
      }
      if (selectedExport === "questions" && values.subtes !== "semua") {
        params.set("subtes", values.subtes);
      }
      if (selectedExport === "leaderboard") {
        params.set("metric", values.metric);
        params.set("subtest", values.subtest);
        params.set("period", values.period);
      }

      const endpoint = `/api/admin/export/${selectedExport}`;
      const response = await fetch(`${window.location.origin}${endpoint}?${params}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `${selectedExport}-export-${new Date().toISOString().slice(0, 10)}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      setError("Gagal mengekspor data. Silakan coba lagi.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="motion-page-enter">
      <PageHeading title="Ekspor Data" description="Unduh data dalam format CSV atau JSON" />

      {error && (
        <div className="mb-4 p-4 border border-red-500/50 bg-red-500/10 rounded-md text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-1">
          <div className="space-y-2">
            {EXPORT_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelectedExport(option.id)}
                  className={`w-full text-left p-4 border rounded-md transition-all ${
                    selectedExport === option.id
                      ? "border-[var(--gold)] bg-[var(--gold)]/5"
                      : "border-[var(--edge)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        selectedExport === option.id ? "bg-[var(--gold)]/20" : "bg-[var(--edge)]"
                      }`}
                    >
                      <Icon
                        size={20}
                        className={
                          selectedExport === option.id
                            ? "text-[var(--gold)]"
                            : "text-[var(--soft-ink)]"
                        }
                      />
                    </div>
                    <div className="min-w-0 break-words">
                      <div className="font-semibold text-[var(--ink)]">{option.label}</div>
                      <div className="text-sm text-[var(--soft-ink)]">{option.description}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 lg:col-span-2">
          <div className="border border-[var(--edge)] rounded-md bg-[var(--surface)] p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-[var(--gold)]/10 flex items-center justify-center">
                {(() => {
                  const Icon = currentOption.icon;
                  return <Icon size={24} className="text-[var(--gold)]" />;
                })()}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--ink)]">{currentOption.label}</h2>
                <p className="text-sm text-[var(--soft-ink)]">{currentOption.description}</p>
              </div>
            </div>

            <div className="space-y-4">
              {currentOption.fields.map((field) => (
                <div
                  key={field.key}
                  className="grid min-w-0 gap-2 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center"
                >
                  <label
                    htmlFor={`export-${field.key}`}
                    className="text-sm font-medium text-[var(--ink)] capitalize"
                  >
                    {field.name}
                  </label>
                  {field.options ? (
                    <Select
                      value={values[field.key] ?? ""}
                      onValueChange={(v) => setValues({ ...values, [field.key]: v })}
                    >
                      <SelectTrigger id={`export-${field.key}`} className="w-full min-w-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt === "semua" || opt === "all"
                              ? "Semua"
                              : opt === "json"
                                ? "JSON"
                                : opt === "csv"
                                  ? "CSV"
                                  : (METRIC_LABELS[opt] ?? PERIOD_LABELS[opt] ?? opt.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <input
                      id={`export-${field.key}`}
                      type="text"
                      value={values[field.key] ?? ""}
                      onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                      placeholder="Opsional..."
                      className="min-w-0 w-full h-11 px-3 border border-[var(--edge)] rounded-md bg-[var(--bg)] text-[var(--ink)] focus:border-[var(--gold)] focus:outline-none"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-[var(--edge)]">
              <Button onClick={handleExport} disabled={exporting} className="w-full">
                {exporting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Mengekspor...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Ekspor {currentOption.label}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
