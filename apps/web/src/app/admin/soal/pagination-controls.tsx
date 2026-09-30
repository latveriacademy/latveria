"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "../../../components/ui/button";

export function PaginationControls({ previousHref, nextHref, page, pageCount }: { previousHref: string; nextHref: string; page: number; pageCount: number }) {
  const router = useRouter();
  return <div className="flex flex-wrap items-center justify-between gap-3">
    <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => router.push(previousHref)}><ArrowLeft />Sebelumnya</Button>
    <span aria-live="polite">Halaman {page} dari {pageCount}</span>
    <Button type="button" variant="outline" size="sm" disabled={page >= pageCount} onClick={() => router.push(nextHref)}>Berikutnya<ArrowRight /></Button>
  </div>;
}
