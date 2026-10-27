import { Link, useRouteError } from "react-router";
import { ArrowLeft, BookX } from "lucide-react";
import { ApiError } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { PageHeading } from "../../components/ui/dashboard";

export function LibraryErrorView() {
  const error = useRouteError();
  const is404 = error instanceof ApiError && error.status === 404;

  return (
    <div className="latveria-view-container motion-page-enter max-w-xl mx-auto py-12 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center">
        <BookX className="w-8 h-8" />
      </div>
      <PageHeading
        title={is404 ? "Materi Tidak Ditemukan" : "Gagal Memuat Materi"}
        description={
          is404
            ? "Materi yang kamu cari mungkin belum diterbitkan atau sudah dipindahkan."
            : error instanceof Error
              ? error.message
              : "Terjadi kesalahan saat mengambil materi library."
        }
      />
      <div className="pt-2">
        <Button asChild>
          <Link to="/dashboard?tab=library">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Kembali ke Katalog Library
          </Link>
        </Button>
      </div>
    </div>
  );
}
