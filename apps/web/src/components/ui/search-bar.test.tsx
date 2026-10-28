import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SearchBar } from "./search-bar";

describe("SearchBar", () => {
  it("renders search input with proper search classes and accessibility attributes", () => {
    const html = renderToStaticMarkup(
      <SearchBar value="" placeholder="Cari materi..." aria-label="Cari materi" />,
    );
    expect(html).toContain('type="search"');
    expect(html).toContain(
      'class="latveria-input latveria-search-input font-sans w-full disabled:opacity-50"',
    );
    expect(html).toContain('placeholder="Cari materi..."');
    expect(html).toContain('aria-label="Cari materi"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('aria-label="Hapus pencarian"');
  });

  it("renders clear button when value exists and onClear is provided", () => {
    const html = renderToStaticMarkup(
      <SearchBar value="Aljabar" onClear={() => {}} placeholder="Cari materi..." />,
    );
    expect(html).toContain('value="Aljabar"');
    expect(html).toContain("has-clear");
    expect(html).toContain('aria-label="Hapus pencarian"');
  });

  it("does not render clear button when value is empty even if onClear is provided", () => {
    const html = renderToStaticMarkup(<SearchBar value="" onClear={() => {}} />);
    expect(html).not.toContain("has-clear");
    expect(html).not.toContain('aria-label="Hapus pencarian"');
  });

  it("supports sizeVariant='sm'", () => {
    const html = renderToStaticMarkup(<SearchBar sizeVariant="sm" value="Test" />);
    expect(html).toContain("text-xs py-1.5");
  });
});
