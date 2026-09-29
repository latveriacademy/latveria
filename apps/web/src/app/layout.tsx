import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Latveria — Belajar, pahami, berkembang",
  description: "Ruang belajar dan latihan untuk persiapan UTBK. Latveria sedang dalam pengembangan.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
