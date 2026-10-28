import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { expect, it } from "vitest";
import { Login } from "./login";

it("renders dedicated alert card and action buttons when not_in_guild error is present", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter initialEntries={["/login?error=not_in_guild"]}>
      <Login />
    </MemoryRouter>,
  );

  expect(html).toContain("Akun Discord Belum Terdaftar di Server");
  expect(html).toContain("Tips Multi-device (Pengguna HP / Tablet)");
  expect(html).toContain("Gabung Server Discord");
  expect(html).toContain("Coba Lagi / Ganti Akun");
  expect(html).toContain("Kembali ke Beranda");
});

it("renders normal login form without error card when no error param", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter initialEntries={["/login"]}>
      <Login />
    </MemoryRouter>,
  );

  expect(html).not.toContain("Akun Discord Belum Terdaftar di Server");
  expect(html).not.toContain("Tips Multi-device");
  expect(html).toContain("Masuk ruang belajar");
});
