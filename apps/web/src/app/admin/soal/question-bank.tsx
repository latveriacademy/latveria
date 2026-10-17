import { Link, useLoaderData, useNavigation, useSearchParams } from "react-router";
import { FileText, Loader2, Plus, Search, Upload } from "lucide-react";
import type { Bank } from "@latveria/shared";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { PageHeading } from "../../../components/ui/dashboard";
import { QuestionBankTable } from "./question-bank-table";
import styles from "../admin.module.css";

export function BankPage() {
  const bank = useLoaderData<Bank>();
  const [params, setParams] = useSearchParams();
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === "semua") next.delete(key);
    else next.set(key, value);
    if (key !== "halaman") next.delete("halaman");
    if (key === "subtes") {
      next.delete("kategori");
      next.delete("paket");
    }
    setParams(next);
  };
  const filters = [
    {
      key: "subtes",
      label: "Subtes",
      options: bank.tabs.map((tab) => ({
        value: tab.slug,
        label: `${tab.slug === "semua" ? "Semua subtes" : tab.name} (${tab.value})`,
      })),
    },
    {
      key: "kategori",
      label: "Kategori materi",
      options: [
        { value: "semua", label: "Semua kategori" },
        ...bank.categories.map((category) => ({ value: category, label: category })),
      ],
    },
    ...(bank.packages?.length
      ? [
          {
            key: "paket",
            label: "Paket soal",
            options: [
              { value: "semua", label: "Semua paket" },
              ...bank.packages.map((pkg) => ({
                value: pkg.name,
                label: `${pkg.name} (${pkg.questionCount})`,
              })),
            ],
          },
        ]
      : []),
  ];
  return (
    <div className={styles.bankPage}>
      <PageHeading
        title="Bank soal"
        description={
          <span className="inline-flex items-center gap-2">
            <span>{bank.total} soal</span>
            {isNavigating && <Loader2 className="size-3.5 animate-spin text-[var(--gold)]" />}
          </span>
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/admin/passages">
                <FileText />
                Stimulus Wacana
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/admin/soal/impor">
                <Upload />
                Impor JSON
              </Link>
            </Button>
            <Button asChild>
              <Link to={`/admin/soal/baru?subtes=${params.get("subtes") ?? ""}`}>
                <Plus />
                Tambah soal
              </Link>
            </Button>
          </>
        }
      />
      {(params.has("created") ||
        params.has("imported") ||
        params.has("updated") ||
        params.has("deleted")) && (
        <p role="status" className={styles.success}>
          {params.has("deleted")
            ? `${params.get("deleted")} soal berhasil dihapus.`
            : params.has("imported")
              ? `${params.get("imported")} soal berhasil diimpor.`
              : "Soal tersimpan."}
        </p>
      )}
      <form
        role="search"
        className={styles.bankSearch}
        onSubmit={(event) => {
          event.preventDefault();
          const value = String(new FormData(event.currentTarget).get("cari") ?? "").trim();
          const next = new URLSearchParams(params);
          if (value) next.set("cari", value);
          else next.delete("cari");
          next.delete("halaman");
          setParams(next);
        }}
      >
        <div className={styles.bankSearchField}>
          <label htmlFor="question-search">Cari soal</label>
          <Input
            key={params.get("cari") ?? ""}
            id="question-search"
            name="cari"
            type="search"
            maxLength={200}
            defaultValue={params.get("cari") ?? ""}
            placeholder="Pertanyaan, sumber, atau nama paket"
          />
        </div>
        <Button type="submit" disabled={isNavigating}>
          <Search size={16} />
          Cari
        </Button>
        {params.has("cari") && (
          <Button
            type="button"
            variant="outline"
            disabled={isNavigating}
            onClick={() => {
              const next = new URLSearchParams(params);
              next.delete("cari");
              next.delete("halaman");
              setParams(next);
            }}
          >
            Hapus pencarian
          </Button>
        )}
      </form>
      <div className={styles.bankFilters}>
        {filters.map((filter) => (
          <div key={filter.key} className={styles.bankFilterField}>
            <span id={`${filter.key}-label`}>{filter.label}</span>
            <Select
              value={params.get(filter.key) ?? "semua"}
              onValueChange={(value) => update(filter.key, value)}
            >
              <SelectTrigger aria-labelledby={`${filter.key}-label`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        {(params.has("subtes") || params.has("kategori") || params.has("paket")) && (
          <Button
            variant="ghost"
            size="sm"
            disabled={isNavigating}
            onClick={() => {
              const next = new URLSearchParams(params);
              for (const key of ["subtes", "kategori", "paket", "halaman"]) next.delete(key);
              setParams(next);
            }}
          >
            Reset filter
          </Button>
        )}
      </div>
      <QuestionBankTable
        key={`${params.get("subtes") ?? ""}:${params.get("kategori") ?? ""}:${params.get("paket") ?? ""}:${bank.page}:${bank.rows.map((row) => row.id).join(",")}`}
        bank={bank}
      />
      <nav className={styles.pagination} aria-label="Paginasi bank soal">
        <span className="inline-flex items-center gap-2">
          <span>
            {bank.total
              ? `${(bank.page - 1) * 15 + 1}–${Math.min(bank.page * 15, bank.total)} dari ${bank.total} soal`
              : "0 soal"}
          </span>
          {isNavigating && <Loader2 className="size-3.5 animate-spin text-[var(--gold)]" />}
        </span>
        <div className={styles.paginationActions}>
          <Button
            variant="outline"
            size="sm"
            disabled={bank.page <= 1 || isNavigating}
            onClick={() => update("halaman", String(bank.page - 1))}
          >
            Sebelumnya
          </Button>
          <span>
            {bank.page} / {bank.pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={bank.page >= bank.pageCount || isNavigating}
            onClick={() => update("halaman", String(bank.page + 1))}
          >
            Berikutnya
          </Button>
        </div>
      </nav>
    </div>
  );
}
