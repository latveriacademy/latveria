import React, { useState, useEffect } from "react";
import type { QuestionReportItem } from "@latveria/shared";
import { Link } from "react-router";
import { CheckCircle, ExternalLink } from "lucide-react";
import { api } from "../../lib/api";
import { PageHeading, Panel, PanelHeader } from "../../components/ui/dashboard";

type ReportItem = QuestionReportItem;

export function AdminReports() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadReports = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api<ReportItem[]>("/admin/reports");
      setReports(data);
    } catch {
      setError("Gagal memuat daftar laporan soal.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleUpdateStatus = async (id: string, status: ReportItem["status"]) => {
    setUpdatingId(id);
    setStatusError("");
    try {
      await api(`/admin/reports/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Origin: window.location.origin },
        body: JSON.stringify({ status }),
      });
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Gagal memperbarui status laporan.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="motion-page-enter">
      <PageHeading
        title="Laporan Soal"
        description="Daftar laporan ketidaksesuaian soal dari peserta latihan."
      />

      <Panel>
        {statusError && (
          <p role="alert" className="text-crimson">
            {statusError}
          </p>
        )}
        <PanelHeader title="Daftar Masuk">
          <span style={{ fontSize: 13, color: "var(--soft-ink)" }}>{reports.length} laporan</span>
        </PanelHeader>

        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--soft-ink)" }}>
            Memuat laporan…
          </div>
        ) : error ? (
          <div style={{ padding: 32, textAlign: "center", color: "red" }}>{error}</div>
        ) : reports.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--soft-ink)" }}>
            <CheckCircle size={36} style={{ margin: "0 auto 12px", color: "var(--emerald)" }} />
            <p>Tidak ada laporan soal yang tertunda.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--edge)",
                    textAlign: "left",
                    color: "var(--soft-ink)",
                    fontSize: 12,
                    textTransform: "uppercase",
                  }}
                >
                  <th style={{ padding: "12px 16px" }}>Tanggal</th>
                  <th style={{ padding: "12px 16px" }}>Alasan</th>
                  <th style={{ padding: "12px 16px" }}>Keterangan</th>
                  <th style={{ padding: "12px 16px" }}>Soal</th>
                  <th style={{ padding: "12px 16px" }}>Pelapor</th>
                  <th style={{ padding: "12px 16px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--edge)" }}>
                    <td
                      style={{
                        padding: "12px 16px",
                        whiteSpace: "nowrap",
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                      }}
                    >
                      {new Date(r.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: 4,
                          background: "rgba(220, 38, 38, 0.1)",
                          color: "#dc2626",
                          fontSize: 12,
                        }}
                      >
                        {r.reason}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--soft-ink)", maxWidth: 280 }}>
                      {r.description || "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <Link
                        to={`/admin/soal/${r.questionId}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          color: "var(--emerald)",
                          textDecoration: "underline",
                        }}
                      >
                        Pratinjau <ExternalLink size={12} />
                      </Link>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--soft-ink)" }}>
                      {r.userName || "Peserta"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <select
                        aria-label={`Status laporan ${r.reason} oleh ${r.userName || "peserta"}`}
                        value={r.status}
                        disabled={updatingId === r.id}
                        onChange={(e) =>
                          handleUpdateStatus(r.id, e.target.value as ReportItem["status"])
                        }
                        style={{
                          padding: "4px 8px",
                          borderRadius: 4,
                          border: "1px solid var(--edge)",
                          background: "var(--bg)",
                          fontSize: 12,
                          color: "var(--ink)",
                        }}
                      >
                        <option value="open">Menunggu</option>
                        <option value="reviewing">Ditinjau</option>
                        <option value="resolved">Selesai</option>
                        <option value="rejected">Ditolak</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
