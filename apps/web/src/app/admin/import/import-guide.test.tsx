import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ImportGuide } from "./import-guide";

describe("ImportGuide", () => {
  it("renders feature overview and all-in-one template sections", () => {
    const html = renderToStaticMarkup(<ImportGuide />);

    expect(html).toContain("Kemampuan &amp; Fitur Impor Soal di Web");
    expect(html).toContain("5 Opsi Pilihan Ganda (A–E)");
    expect(html).toContain("Diagram Geometri &amp; Vektor (TikZ)");
    expect(html).toContain("Wacana / Teks Bacaan Panjang");
    expect(html).toContain("Template Lengkap All-in-One (TKA-SNBT-MANDIRI)");
    expect(html).toContain("Unduh .json");
    expect(html).toContain("Salin JSON Lengkap");
  });
});
