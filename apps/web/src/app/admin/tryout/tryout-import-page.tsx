import { useLoaderData, useSearchParams } from "react-router";
import { utbkSubtests, type AdminTryoutDetail } from "@latveria/shared";
import { PageHeading } from "../../../components/ui/dashboard";
import { ImportQuestions } from "../import/import-questions";

export function TryoutImportPage() {
  const tryout = useLoaderData<AdminTryoutDetail>();
  const [params] = useSearchParams();
  const section = tryout.sections.find((s) => s.id === params.get("section"));
  const slug = utbkSubtests.find((s) => s.short === section?.subtestCode)?.slug;
  return (
    <>
      <PageHeading
        title="Impor soal Tryout dari JSON"
        description="Tempel JSON atau unggah file, lalu periksa tujuan dan ringkasan sebelum mengimpor."
      />
      <ImportQuestions
        key={`${tryout.id}:${section?.id ?? "all"}`}
        tryout={tryout}
        initialSubtest={slug}
      />
    </>
  );
}
