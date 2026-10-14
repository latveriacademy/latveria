import { Link, useLoaderData, useNavigate, useRevalidator, useSearchParams } from "react-router";
import { ArrowLeft, Upload } from "lucide-react";
import type { AdminTryoutSectionDetail } from "@latveria/shared";
import { PageHeading, Panel } from "../../../components/ui/dashboard";
import { Button } from "../../../components/ui/button";
import { TryoutQuestionTable } from "./tryout-question-table";
import { DeleteTryoutSection } from "./delete-tryout-section";

export function AdminTryoutSection() {
  const { tryout, section } = useLoaderData<AdminTryoutSectionDetail>();
  const [params, setParams] = useSearchParams();
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const pageCount = Math.max(1, Math.ceil(section.questions.length / 20));
  const requested = Number(params.get("halaman") ?? 1);
  const page = Number.isInteger(requested) ? Math.max(1, Math.min(pageCount, requested)) : 1;
  const offset = (page - 1) * 20;
  const changePage = (next: number) => {
    const p = new URLSearchParams(params);
    p.set("halaman", String(next));
    setParams(p);
  };
  return (
    <div className="space-y-6">
      <PageHeading
        title={section.title}
        description={`${tryout.name} · ${section.questionCount} soal · ${Math.round(section.durationSeconds / 60)} menit`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to={`/admin/tryouts/${tryout.id}`}>
                <ArrowLeft size={16} />
                Ringkasan Tryout
              </Link>
            </Button>
            <Button asChild>
              <Link to={`/admin/tryouts/${tryout.id}/impor?section=${section.id}`}>
                <Upload size={16} />
                Impor soal
              </Link>
            </Button>
            <DeleteTryoutSection
              packageId={tryout.id}
              sectionId={section.id}
              title={section.title}
              questionCount={section.questionCount}
              onDeleted={() => navigate(`/admin/tryouts/${tryout.id}`)}
            />
          </div>
        }
      />
      {params.has("updated") && (
        <p role="status" className="text-sm text-[var(--emerald)]">
          Perubahan soal tersimpan.
        </p>
      )}
      <Panel>
        {section.questions.length ? (
          <>
            <TryoutQuestionTable
              packageId={tryout.id}
              sectionId={section.id}
              rows={section.questions.slice(offset, offset + 20)}
              offset={offset}
              onChange={() => revalidator.revalidate()}
            />
            <nav
              aria-label="Paginasi soal subtes"
              className="mt-5 flex flex-wrap items-center justify-between gap-3"
            >
              <span className="text-sm text-[var(--soft-ink)]">
                {offset + 1}–{Math.min(offset + 20, section.questionCount)} dari{" "}
                {section.questionCount} soal
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" disabled={page <= 1} onClick={() => changePage(page - 1)}>
                  Sebelumnya
                </Button>
                <span className="text-sm">
                  {page}/{pageCount}
                </span>
                <Button
                  variant="outline"
                  disabled={page >= pageCount}
                  onClick={() => changePage(page + 1)}
                >
                  Berikutnya
                </Button>
              </div>
            </nav>
          </>
        ) : (
          <p>Subtes belum memiliki soal. Gunakan Impor soal untuk menambahkan.</p>
        )}
      </Panel>
    </div>
  );
}
