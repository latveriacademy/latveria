import { MemoryRouter } from "react-router";
import { expect, it } from "vitest";
import { LibraryView } from "./LibraryView";
import { renderToStaticMarkup } from "react-dom/server";

it("reserves Library for learning material and directs question work elsewhere", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <LibraryView />
    </MemoryRouter>,
  );

  expect(html).toContain("Library");
  expect(html).toContain("Kosakata LBE");
  expect(html).toContain("Materi belum tersedia");
  expect(html).toContain("Buka Drilling");
  expect(html).toContain("Buka Battle World");
  expect(html).not.toContain("Mulai Paket");
  expect(html).not.toContain("FILTER PAKET");
});
