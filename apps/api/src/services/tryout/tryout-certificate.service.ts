import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { getDb } from "../../lib/db";
import { questionPackages, tryoutSessions } from "../../lib/db/schema";
import { user } from "../../lib/db/auth-schema";

export interface CertificateData {
  sessionId: string;
  userName: string;
  packageName: string;
  completedAt: Date;
  score: number;
  totalQuestions: number;
  correctCount: number;
  accuracy: number;
  certificateNumber: string;
}

export function buildCertificateNumber(sessionId: string, date: Date): string {
  const shortId = sessionId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `LATV-CERT-${shortId}-${date.getFullYear()}`;
}

export function sanitizeFilename(name: string): string {
  const clean = name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 40);
  return `Sertifikat-Tryout-Latveria-${clean || "Simulasi"}.pdf`;
}

function formatDateIndonesian(date: Date): string {
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export async function renderCertificatePdf(data: CertificateData): Promise<Uint8Array> {
  // A4 Landscape: 841.89 x 595.28 points
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`Sertifikat Penyelesaian Tryout - ${data.userName}`);
  pdfDoc.setAuthor("latveriacademy");
  pdfDoc.setSubject("Sertifikat Hasil Simulasi UTBK-SNBT");

  const page = pdfDoc.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontTimesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontTimesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  // Colors: Latveria green, gold, parchment
  const cParchment = rgb(0.98, 0.97, 0.94);
  const cGreenDark = rgb(0.08, 0.24, 0.16);
  const cGreenMuted = rgb(0.18, 0.36, 0.26);
  const cGold = rgb(0.79, 0.64, 0.28);
  const cGoldLight = rgb(0.92, 0.86, 0.72);
  const cInk = rgb(0.12, 0.16, 0.14);
  const cMutedInk = rgb(0.4, 0.44, 0.42);

  // Background
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: cParchment,
  });

  // Borders
  // Outer gold border
  page.drawRectangle({
    x: 20,
    y: 20,
    width: width - 40,
    height: height - 40,
    borderColor: cGold,
    borderWidth: 2,
  });

  // Inner dark green border
  page.drawRectangle({
    x: 26,
    y: 26,
    width: width - 52,
    height: height - 52,
    borderColor: cGreenDark,
    borderWidth: 1,
  });

  // Corner decorations (gold square accents)
  const corners = [
    { x: 30, y: height - 38 },
    { x: width - 38, y: height - 38 },
    { x: 30, y: 30 },
    { x: width - 38, y: 30 },
  ];
  for (const c of corners) {
    page.drawRectangle({
      x: c.x,
      y: c.y,
      width: 8,
      height: 8,
      color: cGold,
    });
  }

  // Header: Brand & Title
  const brand = "LATVERIACADEMY";
  const brandW = fontBold.widthOfTextAtSize(brand, 14);
  page.drawText(brand, {
    x: (width - brandW) / 2,
    y: height - 65,
    size: 14,
    font: fontBold,
    color: cGold,
  });

  const headerLine = "DOKUMEN RESMI PENCATATAN SIMULASI AKADEMIK";
  const hlW = fontRegular.widthOfTextAtSize(headerLine, 8);
  page.drawText(headerLine, {
    x: (width - hlW) / 2,
    y: height - 78,
    size: 8,
    font: fontRegular,
    color: cMutedInk,
  });

  // Main Title
  const certTitle = "SERTIFIKAT PENYELESAIAN TRYOUT";
  const titleW = fontTimesBold.widthOfTextAtSize(certTitle, 24);
  page.drawText(certTitle, {
    x: (width - titleW) / 2,
    y: height - 118,
    size: 24,
    font: fontTimesBold,
    color: cGreenDark,
  });

  // Decorative divider under title
  page.drawLine({
    start: { x: width / 2 - 140, y: height - 128 },
    end: { x: width / 2 + 140, y: height - 128 },
    thickness: 1.5,
    color: cGold,
  });

  // Recipient label
  const awardedTo = "Diberikan dengan hormat kepada:";
  const awardW = fontTimesItalic.widthOfTextAtSize(awardedTo, 13);
  page.drawText(awardedTo, {
    x: (width - awardW) / 2,
    y: height - 165,
    size: 13,
    font: fontTimesItalic,
    color: cMutedInk,
  });

  // Participant Name
  const rawName = data.userName || "Peserta Latveria";
  // Clamp long names for safe layout
  const dispName = rawName.length > 40 ? `${rawName.slice(0, 38)}…` : rawName;
  const nameSize = dispName.length > 25 ? 24 : 28;
  const nameW = fontBold.widthOfTextAtSize(dispName, nameSize);
  page.drawText(dispName, {
    x: (width - nameW) / 2,
    y: height - 204,
    size: nameSize,
    font: fontBold,
    color: cGreenDark,
  });

  // Name underline
  page.drawLine({
    start: { x: width / 2 - 180, y: height - 212 },
    end: { x: width / 2 + 180, y: height - 212 },
    thickness: 1,
    color: cGoldLight,
  });

  // Completion statement
  const stmt = "Atas komitmen dan keberhasilan dalam menyelesaikan seluruh materi simulasi:";
  const stmtW = fontRegular.widthOfTextAtSize(stmt, 11);
  page.drawText(stmt, {
    x: (width - stmtW) / 2,
    y: height - 240,
    size: 11,
    font: fontRegular,
    color: cInk,
  });

  // Package Name
  const pkgName = data.packageName || "Paket Tryout UTBK";
  const dispPkg = pkgName.length > 55 ? `${pkgName.slice(0, 52)}…` : pkgName;
  const pkgW = fontBold.widthOfTextAtSize(dispPkg, 16);
  page.drawText(dispPkg, {
    x: (width - pkgW) / 2,
    y: height - 265,
    size: 16,
    font: fontBold,
    color: cGreenMuted,
  });

  // 4 Metrics Cards
  const cards = [
    {
      title: "SKOR LATVERIA",
      value: `${Math.round(data.score)}`,
      sub: "Metrik Evaluasi Internal",
    },
    {
      title: "AKURASI JAWABAN",
      value: `${Math.round(data.accuracy)}%`,
      sub: "Persentase Ketepatan",
    },
    {
      title: "HASIL SOAL",
      value: `${data.correctCount} / ${data.totalQuestions}`,
      sub: "Jawaban Benar",
    },
    {
      title: "TANGGAL SELESAI",
      value: formatDateIndonesian(data.completedAt),
      sub: "Waktu Indonesia Barat",
    },
  ];

  const cardW = 160;
  const cardH = 72;
  const gap = 16;
  const totalCardsW = cards.length * cardW + (cards.length - 1) * gap;
  const startX = (width - totalCardsW) / 2;
  const cardY = height - 370;

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i]!;
    const cx = startX + i * (cardW + gap);

    // Card background
    page.drawRectangle({
      x: cx,
      y: cardY,
      width: cardW,
      height: cardH,
      color: rgb(1, 1, 1),
      borderColor: cGold,
      borderWidth: 1,
    });

    // Card Title
    const ctW = fontBold.widthOfTextAtSize(card.title, 8);
    page.drawText(card.title, {
      x: cx + (cardW - ctW) / 2,
      y: cardY + cardH - 18,
      size: 8,
      font: fontBold,
      color: cGold,
    });

    // Card Value
    const cvSize = card.value.length > 12 ? 14 : 17;
    const cvW = fontBold.widthOfTextAtSize(card.value, cvSize);
    page.drawText(card.value, {
      x: cx + (cardW - cvW) / 2,
      y: cardY + cardH - 42,
      size: cvSize,
      font: fontBold,
      color: cGreenDark,
    });

    // Card Subtitle
    const csW = fontRegular.widthOfTextAtSize(card.sub, 7.5);
    page.drawText(card.sub, {
      x: cx + (cardW - csW) / 2,
      y: cardY + 12,
      size: 7.5,
      font: fontRegular,
      color: cMutedInk,
    });
  }

  // Verification & Signatures section
  const certIdText = `Nomor Dokumen: ${data.certificateNumber}`;
  const certIdW = fontRegular.widthOfTextAtSize(certIdText, 9);
  page.drawText(certIdText, {
    x: (width - certIdW) / 2,
    y: height - 425,
    size: 9,
    font: fontRegular,
    color: cInk,
  });

  // Seal / Signatory text
  const authTitle = "TIM AKADEMIK LATVERIACADEMY";
  const authW = fontBold.widthOfTextAtSize(authTitle, 10);
  page.drawText(authTitle, {
    x: (width - authW) / 2,
    y: height - 460,
    size: 10,
    font: fontBold,
    color: cGreenDark,
  });

  const authSub = "Sistem Verifikasi Otomatis Evaluasi Belajar";
  const authSubW = fontRegular.widthOfTextAtSize(authSub, 8);
  page.drawText(authSub, {
    x: (width - authSubW) / 2,
    y: height - 473,
    size: 8,
    font: fontRegular,
    color: cMutedInk,
  });

  // Legal Disclaimer Box at the bottom
  const discY = 48;
  const disclaimer1 =
    "Pemberitahuan: Dokumen ini diterbitkan oleh latveriacademy sebagai catatan penyelesaian tryout mandiri.";
  const disclaimer2 =
    "Skor di atas adalah metrik evaluasi internal Latveria dan bukan merupakan skor resmi atau jaminan kelulusan seleksi UTBK-SNBT.";
  const d1W = fontRegular.widthOfTextAtSize(disclaimer1, 7.5);
  const d2W = fontRegular.widthOfTextAtSize(disclaimer2, 7.5);

  page.drawText(disclaimer1, {
    x: (width - d1W) / 2,
    y: discY + 11,
    size: 7.5,
    font: fontRegular,
    color: cMutedInk,
  });
  page.drawText(disclaimer2, {
    x: (width - d2W) / 2,
    y: discY,
    size: 7.5,
    font: fontRegular,
    color: cMutedInk,
  });

  return await pdfDoc.save();
}

export async function generateTryoutCertificate(
  userId: string,
  sessionId: string,
): Promise<{ pdfBuffer: Uint8Array; filename: string }> {
  const db = getDb();

  const [session] = await db.select().from(tryoutSessions).where(eq(tryoutSessions.id, sessionId));

  if (!session) {
    throw new HTTPException(404, { message: "Sesi tryout tidak ditemukan." });
  }

  if (session.userId !== userId) {
    throw new HTTPException(403, { message: "Akses sertifikat ditolak." });
  }

  if (session.state !== "completed") {
    throw new HTTPException(400, {
      message: "Sertifikat hanya tersedia untuk tryout yang sudah selesai.",
    });
  }

  const [pkg] = await db
    .select()
    .from(questionPackages)
    .where(eq(questionPackages.id, session.packageId));

  const [userData] = await db
    .select({ name: user.name, codename: user.codename })
    .from(user)
    .where(eq(user.id, userId));

  const userName = userData?.name || userData?.codename || "Peserta Latveria";
  const packageName = pkg?.name || "Tryout SNBT";

  let totalQuestions = 0;
  let correctCount = 0;
  let accuracy = 0;
  let score = session.totalScore ?? 0;

  if (session.scoringVersion === "utbk-simulation-v1" && session.scoreReport) {
    const report = session.scoreReport as {
      score?: number;
      totalCount?: number;
      correctCount?: number;
      accuracy?: number;
    };
    score = report.score ?? session.totalScore ?? 0;
    totalQuestions = report.totalCount ?? 0;
    correctCount = report.correctCount ?? 0;
    accuracy =
      report.accuracy ??
      (totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0);
  } else if (session.scoreBreakdown) {
    try {
      const items = JSON.parse(session.scoreBreakdown) as Array<{ isCorrect: boolean }>;
      if (Array.isArray(items)) {
        totalQuestions = items.length;
        correctCount = items.filter((i) => i.isCorrect).length;
        accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
      }
    } catch {
      // fallback if breakdown is unparseable
    }
  }

  const completedAt = session.completedAt || session.startedAt || new Date();
  const certificateNumber = buildCertificateNumber(session.id, completedAt);
  const filename = sanitizeFilename(packageName);

  const pdfBuffer = await renderCertificatePdf({
    sessionId: session.id,
    userName,
    packageName,
    completedAt,
    score,
    totalQuestions,
    correctCount,
    accuracy,
    certificateNumber,
  });

  return { pdfBuffer, filename };
}
