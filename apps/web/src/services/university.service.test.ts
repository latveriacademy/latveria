import { describe, expect, it } from "vitest";
import {
  formatDegree,
  formatTitleCase,
  formatTargetPtn,
  FALLBACK_UNIVERSITIES,
  fetchUniversities,
} from "./university.service";

describe("university.service", () => {
  it("formats degrees correctly", () => {
    expect(formatDegree("Sarjana")).toBe("S1");
    expect(formatDegree("Sarjana Terapan")).toBe("D4");
    expect(formatDegree("Diploma Tiga")).toBe("D3");
    expect(formatDegree("Diploma Empat")).toBe("D4");
    expect(formatDegree("")).toBe("");
  });

  it("formats title case correctly with preposition lowercases", () => {
    expect(formatTitleCase("ILMU KOMPUTER")).toBe("Ilmu Komputer");
    expect(formatTitleCase("TEKNIK INFORMATIKA")).toBe("Teknik Informatika");
    expect(formatTitleCase("BAHASA DAN KEBUDAYAAN KOREA")).toBe("Bahasa dan Kebudayaan Korea");
    expect(formatTitleCase("PENDIDIKAN DOKTER")).toBe("Pendidikan Dokter");
  });

  it("formats target PTN string correctly", () => {
    expect(formatTargetPtn("Universitas Indonesia", "ILMU KOMPUTER", "Sarjana")).toBe(
      "Universitas Indonesia - Ilmu Komputer",
    );

    expect(
      formatTargetPtn(
        "Institut Teknologi Bandung",
        "SEKOLAH TEKNIK ELEKTRO DAN INFORMATIKA - KOMPUTASI (STEI-K)",
      ),
    ).toBe(
      "Institut Teknologi Bandung - Sekolah Teknik Elektro dan Informatika - Komputasi (STEI-K)",
    );

    expect(formatTargetPtn("Universitas Gadjah Mada", "AKUNTANSI")).toBe(
      "Universitas Gadjah Mada - Akuntansi",
    );
  });

  it("falls back to default universities when network fails", async () => {
    expect(FALLBACK_UNIVERSITIES.length).toBeGreaterThan(0);
    const list = await fetchUniversities();
    expect(list.length).toBeGreaterThan(0);
    expect(list.some((u) => u.code === "UI")).toBe(true);
  });
});
