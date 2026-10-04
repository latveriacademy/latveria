import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Clock,
  Database,
  Zap,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { PageHeading } from "../../components/ui/dashboard";

interface ApiEndpointStatus {
  name: string;
  path: string;
  status: "ok" | "error" | "unknown";
  latency?: number;
  error?: string;
}

interface SystemHealth {
  api: {
    status: "ok" | "degraded" | "error";
    timestamp: string;
    version: string;
  };
  database: {
    connected: boolean;
    latency?: number;
    error?: string;
  };
  endpoints: ApiEndpointStatus[];
}

async function checkEndpoint(
  path: string,
  timeout = 5000,
): Promise<{ status: "ok" | "error"; latency?: number; error?: string }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(path, {
      method: "GET",
      credentials: "same-origin",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - start;

    if (response.ok) {
      return { status: "ok", latency };
    } else {
      const data = await response.json().catch(() => ({}));
      return { status: "error", latency, error: data.error || `HTTP ${response.status}` };
    }
  } catch (err) {
    const latency = Date.now() - start;
    if (err instanceof Error && err.name === "AbortError") {
      return { status: "error", latency, error: "Timeout (>5s)" };
    }
    return {
      status: "error",
      latency,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

function StatusBadge({ status }: { status: "ok" | "error" | "degraded" | "unknown" }) {
  const config = {
    ok: { icon: CheckCircle, label: "OK", className: "text-green-500 bg-green-500/10" },
    error: { icon: XCircle, label: "Error", className: "text-red-500 bg-red-500/10" },
    degraded: {
      icon: AlertTriangle,
      label: "Degraded",
      className: "text-yellow-500 bg-yellow-500/10",
    },
    unknown: { icon: AlertTriangle, label: "Unknown", className: "text-gray-500 bg-gray-500/10" },
  };
  const { icon: Icon, label, className } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${className}`}
    >
      <Icon size={12} />
      {label}
    </span>
  );
}

export function AdminSystemHealth() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkHealth = useCallback(async () => {
    setChecking(true);

    // Check API health endpoint (public, no auth required)
    const healthResult = await checkEndpoint("/api/health", 3000);

    // Check database by calling a protected endpoint that queries DB
    const dbResult = await checkEndpoint("/api/me", 5000);

    // Check key admin endpoints
    const endpoints: ApiEndpointStatus[] = [
      { name: "Health", path: "/api/health", status: "unknown" },
      { name: "Topics", path: "/api/admin/topics", status: "unknown" },
      { name: "Users", path: "/api/admin/users?limit=1", status: "unknown" },
      { name: "Audit Log", path: "/api/admin/audit?limit=1", status: "unknown" },
      { name: "Analytics", path: "/api/admin/analytics/questions?limit=1", status: "unknown" },
      {
        name: "Leaderboard",
        path: "/api/leaderboard?metric=xp&period=weekly&limit=1",
        status: "unknown",
      },
    ];

    const endpointResults = await Promise.all(
      endpoints.map(async (ep) => {
        const result = await checkEndpoint(ep.path, 5000);
        return {
          ...ep,
          status: result.status,
          latency: result.latency,
          error: result.error,
        };
      }),
    );

    const now = new Date();
    setLastCheck(now);

    setHealth({
      api: {
        status: healthResult.status,
        timestamp: now.toISOString(),
        version: "1.0.0",
      },
      database: {
        connected: dbResult.status === "ok",
        latency: dbResult.latency,
        error: dbResult.status === "error" ? dbResult.error : undefined,
      },
      endpoints: endpointResults,
    });

    setChecking(false);
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const overallStatus = health
    ? health.api.status === "error" || !health.database.connected
      ? "error"
      : health.endpoints.some((e) => e.status === "error")
        ? "degraded"
        : "ok"
    : "unknown";

  const formatLatency = (ms?: number) => {
    if (!ms) return "-";
    if (ms > 1000) return `${(ms / 1000).toFixed(1)}s`;
    return `${ms}ms`;
  };

  return (
    <div className="motion-page-enter">
      <PageHeading
        title="Kesehatan Sistem"
        description="Status dan performa API"
        actions={
          <Button variant="outline" onClick={checkHealth} disabled={checking}>
            {checking ? <Loader2 size={16} className="animate-spin" /> : <Activity size={16} />}
            Periksa ulang
          </Button>
        }
      />

      {health && (
        <>
          <div className="flex items-center gap-4 mb-6 p-4 border border-[var(--edge)] rounded-md bg-[var(--surface)]">
            <StatusBadge status={overallStatus} />
            <div className="flex-1">
              <span className="font-semibold text-[var(--ink)]">
                {overallStatus === "ok"
                  ? "Semua sistem beroperasi normal"
                  : overallStatus === "degraded"
                    ? "Beberapa endpoint bermasalah"
                    : "Sistem mengalami gangguan"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--soft-ink)]">
              <Clock size={14} />
              {lastCheck?.toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                timeZone: "Asia/Jakarta",
              })}{" "}
              WIB
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="border border-[var(--edge)] rounded-md p-4 bg-[var(--surface)]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[var(--gold)]/10 flex items-center justify-center">
                  <Zap size={20} className="text-[var(--gold)]" />
                </div>
                <div>
                  <div className="text-sm text-[var(--soft-ink)]">API Health</div>
                  <StatusBadge status={health.api.status} />
                </div>
              </div>
              <div className="text-xs text-[var(--soft-ink)] space-y-1">
                <div>Version: {health.api.version}</div>
                <div>Endpoint: /api/health</div>
              </div>
            </div>

            <div className="border border-[var(--edge)] rounded-md p-4 bg-[var(--surface)]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[var(--gold)]/10 flex items-center justify-center">
                  <Database size={20} className="text-[var(--gold)]" />
                </div>
                <div>
                  <div className="text-sm text-[var(--soft-ink)]">Database</div>
                  <StatusBadge status={health.database.connected ? "ok" : "error"} />
                </div>
              </div>
              <div className="text-xs text-[var(--soft-ink)]">
                {health.database.connected ? (
                  <span className="font-mono">{formatLatency(health.database.latency)}</span>
                ) : (
                  <span className="text-red-400">
                    {health.database.error || "Connection failed"}
                  </span>
                )}
              </div>
            </div>

            <div className="border border-[var(--edge)] rounded-md p-4 bg-[var(--surface)]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[var(--gold)]/10 flex items-center justify-center">
                  <Activity size={20} className="text-[var(--gold)]" />
                </div>
                <div>
                  <div className="text-sm text-[var(--soft-ink)]">Endpoints</div>
                  <div className="text-xs text-[var(--soft-ink)]">
                    {health.endpoints.filter((e) => e.status === "ok").length}/
                    {health.endpoints.length} OK
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-[var(--edge)] rounded-md bg-[var(--surface)]">
            <div className="px-4 py-3 border-b border-[var(--edge)]">
              <h3 className="font-semibold text-[var(--ink)]">Endpoint Status</h3>
            </div>
            <div className="divide-y divide-[var(--edge)]">
              {health.endpoints.map((endpoint) => (
                <div key={endpoint.path} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="font-medium text-[var(--ink)]">{endpoint.name}</div>
                    <code className="text-xs text-[var(--soft-ink)]">{endpoint.path}</code>
                  </div>
                  <div className="flex items-center gap-4">
                    {endpoint.latency && (
                      <span
                        className={`text-xs font-mono ${
                          endpoint.latency > 500 ? "text-yellow-500" : "text-green-500"
                        }`}
                      >
                        {formatLatency(endpoint.latency)}
                      </span>
                    )}
                    {endpoint.error && (
                      <span
                        className="text-xs text-red-500 max-w-xs truncate"
                        title={endpoint.error}
                      >
                        {endpoint.error}
                      </span>
                    )}
                    <StatusBadge status={endpoint.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 p-4 border border-[var(--edge)] rounded-md bg-[var(--surface)]">
            <h4 className="font-medium text-[var(--ink)] mb-2">Tentang Halaman Ini</h4>
            <ul className="text-sm text-[var(--soft-ink)] space-y-1">
              <li>
                • <strong>Periksa ulang</strong>: Tombol untuk memperbarui status semua endpoint
                secara manual.
              </li>
              <li>
                • <strong>Latency</strong>: Waktu respons dalam milidetik. Di atas 500ms ditampilkan
                kuning.
              </li>
              <li>
                • <strong>Database</strong>: Dicek dengan memanggil endpoint yang memerlukan akses
                database.
              </li>
              <li>
                • Catatan: Latency dalam mode development mungkin lebih tinggi karena Vite proxy.
              </li>
            </ul>
          </div>
        </>
      )}

      {!health && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-[var(--gold)]" />
        </div>
      )}
    </div>
  );
}
