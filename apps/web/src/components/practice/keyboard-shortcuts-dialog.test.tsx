import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { KeyboardShortcutsDialog } from "./keyboard-shortcuts-dialog";

vi.mock("../ui/dialog", () => ({
  Dialog: ({ children, open }: { children: ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));

it("renders keyboard shortcuts when open is true", () => {
  const html = renderToStaticMarkup(
    <KeyboardShortcutsDialog open={true} onOpenChange={() => {}} />,
  );

  expect(html).toContain("Pintasan Keyboard");
  expect(html).toContain("Pengerjaan Soal");
  expect(html).toContain("Navigasi");
  expect(html).toContain("Alat &amp; Bantuan");
  expect(html).toContain("Memilih opsi jawaban A sampai E");
  expect(html).toContain("Kumpulkan jawaban latihan");
  expect(html).toContain("Pindah ke butir soal berikutnya");
});

it("does not render content when open is false", () => {
  const html = renderToStaticMarkup(
    <KeyboardShortcutsDialog open={false} onOpenChange={() => {}} />,
  );

  expect(html).toBe("");
});
