import { MemoryRouter } from "react-router";
import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LibraryReaderView } from "./LibraryReaderView";

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: () => ({
      id: "test-id-1",
      title: "Konsep Aljabar dan Persamaan Kuadrat",
      slug: "konsep-aljabar",
      type: "article",
      subtestSlug: "penalaran-matematika",
      content: "Rumus abc: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$",
      url: null,
      thumbnailUrl: null,
      tags: ["aljabar", "matematika"],
      isPublished: true,
      authorId: "admin-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  };
});

it("renders LibraryReaderView with math content and badges", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <LibraryReaderView />
    </MemoryRouter>,
  );

  expect(html).toContain("Konsep Aljabar dan Persamaan Kuadrat");
  expect(html).toContain("Penalaran Matematika");
  expect(html).toContain("Artikel Konsep");
  expect(html).toContain("Kembali ke Library");
  expect(html).toContain("aljabar");
  expect(html).toContain("matematika");
});
