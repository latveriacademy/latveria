import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { ChangePasswordDialog } from "./change-password-dialog";

vi.mock("./ui/dialog", () => ({
  Dialog: ({ children, open }: { children: ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe("ChangePasswordDialog", () => {
  it("renders change password form with current password field when isCreate is false", () => {
    const html = renderToStaticMarkup(
      <ChangePasswordDialog open={true} onOpenChange={() => {}} isCreate={false} />,
    );

    expect(html).toContain("Ubah kata sandi");
    expect(html).toContain("Kata sandi saat ini");
    expect(html).toContain("Kata sandi baru (minimal 8 karakter)");
    expect(html).toContain("Ulangi kata sandi baru");
  });

  it("renders create password form without current password field when isCreate is true", () => {
    const html = renderToStaticMarkup(
      <ChangePasswordDialog open={true} onOpenChange={() => {}} isCreate={true} />,
    );

    expect(html).toContain("Buat kata sandi");
    expect(html).not.toContain("Kata sandi saat ini");
    expect(html).toContain("Kata sandi baru (minimal 8 karakter)");
    expect(html).toContain("Ulangi kata sandi baru");
  });
});
