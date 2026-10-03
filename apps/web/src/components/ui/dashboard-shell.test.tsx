import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { Dumbbell, BookOpen, Plus } from "lucide-react";
import { expect, it } from "vitest";
import { DashboardNavigation } from "./dashboard-shell";

it.each([false, true])(
  "keeps admin navigation as links with the active page identified (mobile=%s)",
  (mobile) => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DashboardNavigation
          mobile={mobile}
          active="questions"
          items={[
            { id: "questions", label: "Bank soal", icon: BookOpen, to: "/admin/soal" },
            { id: "new", label: "Tambah soal", icon: Plus, to: "/admin/soal/baru" },
          ]}
        />
      </MemoryRouter>,
    );
    expect(html).toContain('href="/admin/soal"');
    expect(html).toContain('href="/admin/soal/baru"');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).not.toContain("<button");
  },
);

it("keeps learner tabs as buttons rather than route links", () => {
  const html = renderToStaticMarkup(
    <DashboardNavigation
      active="practice"
      onSelect={() => {}}
      items={[{ id: "practice", label: "Latihan", icon: Dumbbell }]}
    />,
  );
  expect(html).toContain('type="button"');
  expect(html).toContain('aria-current="page"');
  expect(html).toContain("Latihan");
  expect(html).not.toContain("href=");
});
