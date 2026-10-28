import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { Dumbbell, BookOpen, Plus } from "lucide-react";
import { expect, it } from "vitest";
import { DashboardNavigation, DashboardShell } from "./dashboard-shell";

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

it("marks shell with has-bottom-nav and avoids mobile backdrop when bottom nav is present", () => {
  const withBottomNav = renderToStaticMarkup(
    <DashboardShell
      sidebar={<div>Sidebar</div>}
      bottomNav={<div>Bottom Nav</div>}
      sidebarOpen={true}
      onCloseSidebar={() => {}}
    >
      <div>Content</div>
    </DashboardShell>,
  );
  expect(withBottomNav).toContain("has-bottom-nav");
  expect(withBottomNav).not.toContain("sidebar-mobile-backdrop");

  const withoutBottomNav = renderToStaticMarkup(
    <DashboardShell sidebar={<div>Sidebar</div>} sidebarOpen={true} onCloseSidebar={() => {}}>
      <div>Content</div>
    </DashboardShell>,
  );
  expect(withoutBottomNav).not.toContain("has-bottom-nav");
  expect(withoutBottomNav).toContain("sidebar-mobile-backdrop");
});
