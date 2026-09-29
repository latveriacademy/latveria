import type { Metadata } from "next";
import { Alegreya_Sans, Caveat } from "next/font/google";
import logo from "../../../../latveria.webp";
import "./globals.css";

const sans = Alegreya_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800", "900"],
});

const handwriting = Caveat({
  variable: "--font-handwriting",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Latveria | Belajar, pahami, berkembang",
  description: "Ruang belajar dan latihan untuk persiapan UTBK. Latveria sedang dalam pengembangan.",
  icons: { icon: logo.src },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className={`${sans.variable} ${handwriting.variable}`}>{children}</body>
    </html>
  );
}
