import { useEffect, useState } from "react";
import { Link, useLoaderData, useRevalidator } from "react-router";
import { Plus } from "lucide-react";
import type { Topic } from "@latveria/shared";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { PageHeading, Panel, PanelHeader, StatTile } from "../../components/ui/dashboard";

export function AdminSummary() {
  const loadedTopics = useLoaderData<Topic[]>();
  const [topics, setTopics] = useState<Topic[]>(loadedTopics);
  const revalidator = useRevalidator();
  useEffect(() => {
    api<Topic[]>("/admin/topics")
      .then(setTopics)
      .catch(() => {});
  }, [revalidator.state]);
  return (
    <div className="motion-page-enter">
      <PageHeading
        title="Konten latihan"
        actions={
          <Button asChild>
            <Link to="/admin/soal/baru">
              <Plus />
              Tambah soal
            </Link>
          </Button>
        }
      />
      <div className="hero-metrics-grid admin-stats">
        <StatTile label="Subtes" value={topics.length} />
        <StatTile
          label="Paket Soal"
          value={topics.reduce((sum, topic) => sum + (topic.packageCount ?? 0), 0)}
        />
        <StatTile
          label="Total Soal"
          value={topics.reduce((sum, topic) => sum + topic.questionCount, 0)}
        />
      </div>
      <Panel>
        <PanelHeader title="Subtes & Paket Soal" />
        <ul>
          {topics.map((topic, index) => (
            <li
              key={topic.id}
              className="border-b border-[var(--edge)] last:border-b-0 motion-fade-up transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[var(--surface-hover)]"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="flex min-h-14 items-center justify-between gap-4 py-2">
                <div className="grid gap-1">
                  <Link
                    className="font-semibold text-[var(--ink)] hover:text-[var(--emerald)] transition-colors"
                    to={`/admin/subtes/${topic.slug}`}
                  >
                    {topic.name}
                  </Link>
                  <span className="text-xs text-[var(--soft-ink)]">
                    {topic.section === "tps" ? "TPS" : "Literasi"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/admin/subtes/${topic.slug}`}>{topic.packageCount ?? 0} Paket</Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link to={`/admin/soal?subtes=${topic.slug}`}>{topic.questionCount} Soal</Link>
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
