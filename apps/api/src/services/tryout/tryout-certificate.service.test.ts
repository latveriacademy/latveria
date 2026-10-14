import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  buildCertificateNumber,
  renderCertificatePdf,
  sanitizeFilename,
} from "./tryout-certificate.service";

describe("Tryout Certificate Generation", () => {
  it("builds a deterministic certificate identifier", () => {
    const sessionId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    const date = new Date("2026-10-10T14:00:00Z");
    const certNum = buildCertificateNumber(sessionId, date);

    expect(certNum).toBe("LATV-CERT-A1B2C3D4-2026");
  });

  it("sanitizes package names into safe download filenames", () => {
    expect(sanitizeFilename("Simulasi SNBT Akbar #1 (2026)")).toBe(
      "Sertifikat-Tryout-Latveria-Simulasi-SNBT-Akbar-1-2026.pdf",
    );
    expect(sanitizeFilename("   ")).toBe("Sertifikat-Tryout-Latveria-Simulasi.pdf");
  });

  it("renders a valid landscape A4 PDF document with complete certificate data", async () => {
    const certData = {
      sessionId: "00000000-1111-2222-3333-444444444444",
      userName: "Victor von Doom",
      packageName: "Simulasi Skolastik 2026",
      completedAt: new Date("2026-10-10T12:00:00Z"),
      score: 850,
      totalQuestions: 60,
      correctCount: 51,
      accuracy: 85,
      certificateNumber: "LATV-CERT-00000000-2026",
    };

    const pdfBuffer = await renderCertificatePdf(certData);

    // Validate PDF magic bytes (%PDF-)
    expect(pdfBuffer).toBeInstanceOf(Uint8Array);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    const header = new TextDecoder().decode(pdfBuffer.slice(0, 5));
    expect(header).toBe("%PDF-");

    // Load PDF with pdf-lib to verify structural integrity
    const parsedDoc = await PDFDocument.load(pdfBuffer);
    expect(parsedDoc.getPageCount()).toBe(1);

    const page = parsedDoc.getPage(0);
    const { width, height } = page.getSize();
    // Landscape A4 dimensions: 841.89 x 595.28
    expect(Math.round(width)).toBe(842);
    expect(Math.round(height)).toBe(595);

    expect(parsedDoc.getTitle()).toContain("Victor von Doom");
    expect(parsedDoc.getAuthor()).toBe("latveriacademy");
  });

  it("handles long user names and package titles gracefully without throwing", async () => {
    const longData = {
      sessionId: "abcdef12-3456-7890-abcd-ef1234567890",
      userName: "Muhammad Nur Farhan Raden Mas Joyodiningrat Suryokusumo Kusumanegara",
      packageName:
        "Paket Tryout Simulasi Nasional Skolastik dan Literasi SNBT Edisi Komprehensif Tahap II",
      completedAt: new Date("2026-10-10T15:30:00Z"),
      score: 720,
      totalQuestions: 155,
      correctCount: 110,
      accuracy: 71,
      certificateNumber: "LATV-CERT-ABCDEF12-2026",
    };

    const pdfBuffer = await renderCertificatePdf(longData);
    expect(pdfBuffer.length).toBeGreaterThan(1000);

    const parsedDoc = await PDFDocument.load(pdfBuffer);
    expect(parsedDoc.getPageCount()).toBe(1);
  });
});
