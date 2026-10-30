import { useEffect, useMemo, useState } from "react";
import { GraduationCap, Building2, ArrowLeft, X, Loader2 } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { SearchBar } from "./ui/search-bar";
import {
  fetchUniversities,
  fetchMajors,
  formatDegree,
  formatTitleCase,
  formatTargetPtn,
  type UniversityItem,
  type MajorItem,
} from "../services/university.service";

interface TargetUniversityPickerProps {
  value?: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

export function TargetUniversityPicker({
  value = "",
  onChange,
  disabled = false,
}: TargetUniversityPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"university" | "major">("university");

  const [universities, setUniversities] = useState<UniversityItem[]>([]);
  const [loadingUni, setLoadingUni] = useState(false);
  const [selectedUni, setSelectedUni] = useState<UniversityItem | null>(null);

  const [majors, setMajors] = useState<MajorItem[]>([]);
  const [loadingMajors, setLoadingMajors] = useState(false);

  const [uniSearch, setUniSearch] = useState("");
  const [majorSearch, setMajorSearch] = useState("");

  // Load universities saat panel dibuka
  useEffect(() => {
    if (isOpen && universities.length === 0 && !loadingUni) {
      setLoadingUni(true);
      fetchUniversities()
        .then((items) => setUniversities(items))
        .finally(() => setLoadingUni(false));
    }
  }, [isOpen, universities.length, loadingUni]);

  // Load prodi saat universitas terpilih
  const handleSelectUniversity = async (uni: UniversityItem) => {
    setSelectedUni(uni);
    setStep("major");
    setMajorSearch("");
    setLoadingMajors(true);

    try {
      const items = await fetchMajors(uni.id);
      setMajors(items);
    } finally {
      setLoadingMajors(false);
    }
  };

  const handleSelectMajor = (major: MajorItem) => {
    if (!selectedUni) return;
    const formatted = formatTargetPtn(selectedUni.name, major.name);
    onChange(formatted);
    setIsOpen(false);
    setStep("university");
    setSelectedUni(null);
  };

  // Filter daftar universitas
  const filteredUniversities = useMemo(() => {
    const q = uniSearch.trim().toLowerCase();
    if (!q) {
      return universities.slice(0, 30);
    }

    return universities
      .filter((u) => {
        const matchCode = u.code?.toLowerCase().includes(q);
        const matchName = u.name?.toLowerCase().includes(q);
        const matchCity = u.city?.toLowerCase().includes(q);
        const matchRegion = u.region?.toLowerCase().includes(q);
        return matchCode || matchName || matchCity || matchRegion;
      })
      .sort((a, b) => {
        // Prioritaskan kecocokan kode yang persis (misal: "itb" -> ITB paling atas)
        const aCodeMatch = a.code?.toLowerCase() === q;
        const bCodeMatch = b.code?.toLowerCase() === q;
        if (aCodeMatch && !bCodeMatch) return -1;
        if (!aCodeMatch && bCodeMatch) return 1;

        const aStartsWith =
          a.name?.toLowerCase().startsWith(q) || a.code?.toLowerCase().startsWith(q);
        const bStartsWith =
          b.name?.toLowerCase().startsWith(q) || b.code?.toLowerCase().startsWith(q);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;

        return 0;
      })
      .slice(0, 40);
  }, [universities, uniSearch]);

  // Filter daftar prodi
  const filteredMajors = useMemo(() => {
    const q = majorSearch.trim().toLowerCase();
    if (!q) return majors;

    return majors.filter((m) => {
      const deg = formatDegree(m.degree).toLowerCase();
      const name = m.name?.toLowerCase() || "";
      const cat = m.category?.toLowerCase() || "";
      return name.includes(q) || deg.includes(q) || cat.includes(q);
    });
  }, [majors, majorSearch]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Contoh: ITB - Komputasi (STEI-K) atau ketik langsung"
          maxLength={200}
          className="pr-9"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setIsOpen((prev) => !prev);
            if (!isOpen) {
              setStep("university");
            }
          }}
          title={isOpen ? "Tutup" : "Pilih universitas & prodi"}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] rounded transition-colors"
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <X className="size-4" />
          ) : (
            <GraduationCap className="size-4 text-[var(--gold)]" />
          )}
        </button>
      </div>

      <div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
        <span>Pilih dari daftar atau ketik langsung.</span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setIsOpen((prev) => !prev);
            if (!isOpen) setStep("university");
          }}
          className="text-[var(--gold)] hover:underline inline-flex items-center gap-1 font-medium"
        >
          <GraduationCap className="size-3.5" />
          {isOpen ? "Tutup" : "Pilih dari daftar"}
        </button>
      </div>

      {isOpen && (
        <div className="rounded-lg border border-[var(--edge)] bg-[var(--surface)] p-3 shadow-md space-y-3 motion-fade-down text-left">
          {step === "university" ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2 pb-1 border-b border-[var(--edge-subtle)]">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)]">
                  <Building2 className="size-3.5 text-[var(--gold)]" />
                  <span>Pilih universitas</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-xs"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="size-3" />
                </Button>
              </div>

              <SearchBar
                value={uniSearch}
                onChange={(e) => setUniSearch(e.target.value)}
                onClear={() => setUniSearch("")}
                placeholder="Cari universitas (misal: ITB, UI, UGM)…"
                sizeVariant="sm"
                autoFocus
              />

              <div className="max-h-52 overflow-y-auto space-y-1 pr-1 overscroll-contain">
                {loadingUni ? (
                  <div className="py-6 flex flex-col items-center justify-center gap-2 text-xs text-[var(--ink-muted)]">
                    <Loader2 className="size-4 animate-spin text-[var(--gold)]" />
                    <span>Memuat universitas…</span>
                  </div>
                ) : filteredUniversities.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[var(--ink-muted)]">
                    Universitas "{uniSearch}" tidak ditemukan.
                  </div>
                ) : (
                  filteredUniversities.map((uni) => (
                    <button
                      key={uni.id}
                      type="button"
                      onClick={() => handleSelectUniversity(uni)}
                      className="w-full text-left p-2 rounded-md hover:bg-[var(--surface-hover)] border border-transparent hover:border-[var(--edge)] transition-all flex items-center justify-between gap-2 group"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[var(--ink)] group-hover:text-[var(--gold)] truncate">
                            {uni.name}
                          </span>
                          {uni.code && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-subtle)] text-[var(--ink-muted)] font-mono shrink-0">
                              {uni.code}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--ink-muted)] truncate mt-0.5">
                          {uni.city ? `${uni.city}, ` : ""}
                          {uni.region}
                        </p>
                      </div>
                      <span className="text-xs text-[var(--ink-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        Pilih &rarr;
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2 pb-1 border-b border-[var(--edge-subtle)]">
                <button
                  type="button"
                  onClick={() => setStep("university")}
                  className="flex items-center gap-1.5 text-xs text-[var(--gold)] hover:underline font-medium"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>Kembali</span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-xs"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="size-3" />
                </Button>
              </div>

              {selectedUni && (
                <div className="p-2 rounded bg-[var(--surface-subtle)] border border-[var(--edge-subtle)] flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[var(--ink)] block truncate">
                    {selectedUni.name} {selectedUni.code ? `(${selectedUni.code})` : ""}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[11px] px-2 shrink-0"
                    onClick={() => setStep("university")}
                  >
                    Ganti
                  </Button>
                </div>
              )}

              <SearchBar
                value={majorSearch}
                onChange={(e) => setMajorSearch(e.target.value)}
                onClear={() => setMajorSearch("")}
                placeholder="Cari program studi…"
                sizeVariant="sm"
                autoFocus
              />

              <div className="max-h-52 overflow-y-auto space-y-1 pr-1 overscroll-contain">
                {loadingMajors ? (
                  <div className="py-6 flex flex-col items-center justify-center gap-2 text-xs text-[var(--ink-muted)]">
                    <Loader2 className="size-4 animate-spin text-[var(--gold)]" />
                    <span>Memuat program studi…</span>
                  </div>
                ) : filteredMajors.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[var(--ink-muted)]">
                    {majors.length === 0
                      ? "Belum ada data prodi untuk universitas ini."
                      : `Program studi "${majorSearch}" tidak ditemukan.`}
                  </div>
                ) : (
                  filteredMajors.map((major) => {
                    const deg = formatDegree(major.degree);
                    const title = formatTitleCase(major.name);
                    return (
                      <button
                        key={major.id}
                        type="button"
                        onClick={() => handleSelectMajor(major)}
                        className="w-full text-left p-2 rounded-md hover:bg-[var(--surface-hover)] border border-transparent hover:border-[var(--edge)] transition-all flex items-center justify-between gap-2 group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {deg && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-subtle)] font-medium text-[var(--gold)] shrink-0">
                                {deg}
                              </span>
                            )}
                            <span className="text-xs font-medium text-[var(--ink)] group-hover:text-[var(--gold)] truncate">
                              {title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--ink-muted)]">
                            {major.category && (
                              <span className="uppercase tracking-wider">{major.category}</span>
                            )}
                            {major.passing_grade ? (
                              <span>• Passing Grade: ~{major.passing_grade}</span>
                            ) : null}
                            {major.quota ? <span>• Kuota: {major.quota}</span> : null}
                          </div>
                        </div>
                        <span className="text-xs text-[var(--ink-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          Pilih
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
