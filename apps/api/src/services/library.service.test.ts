import { describe, expect, it } from "vitest";
import {
  createLibraryItem,
  deleteLibraryItem,
  getLibraryItemById,
  getLibraryItems,
  togglePublishLibraryItem,
  updateLibraryItem,
} from "./library.service";

describe("Library service", () => {
  let createdId = "";

  it("creates a library item with youtube video and auto thumbnail", async () => {
    const item = await createLibraryItem(
      {
        title: "Panduan Cepat Penalaran Matematika",
        type: "video",
        subtestSlug: "penalaran-matematika",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        tags: ["matematika", "video"],
        isPublished: true,
      },
      null,
    );

    expect(item).toBeDefined();
    expect(item.id).toBeTruthy();
    expect(item.slug).toBe("panduan-cepat-penalaran-matematika");
    expect(item.type).toBe("video");
    expect(item.metadata?.youtubeId).toBe("dQw4w9WgXcQ");
    expect(item.thumbnailUrl).toBe("https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg");

    createdId = item.id;
  });

  it("reads the created library item by id", async () => {
    const item = await getLibraryItemById(createdId);
    expect(item.id).toBe(createdId);
    expect(item.title).toBe("Panduan Cepat Penalaran Matematika");
  });

  it("lists library items with filters", async () => {
    const res = await getLibraryItems({ cari: "Penalaran", type: "video" });
    expect(res.rows.length).toBeGreaterThanOrEqual(1);
    expect(res.total).toBeGreaterThanOrEqual(1);
  });

  it("updates library item with custom thumbnail and markdown content", async () => {
    const updated = await updateLibraryItem(createdId, {
      title: "Panduan Lengkap Penalaran Matematika",
      content: "Rumus integral $\\int x dx = \\frac{1}{2}x^2 + C$",
      thumbnailUrl: "https://example.com/custom-cover.jpg",
    });

    expect(updated.title).toBe("Panduan Lengkap Penalaran Matematika");
    expect(updated.content).toContain("\\int x dx");
    expect(updated.thumbnailUrl).toBe("https://example.com/custom-cover.jpg");
  });

  it("toggles publish status", async () => {
    const toggled = await togglePublishLibraryItem(createdId);
    expect(toggled.isPublished).toBe(false);

    const toggledBack = await togglePublishLibraryItem(createdId);
    expect(toggledBack.isPublished).toBe(true);
  });

  it("deletes the library item cleanly", async () => {
    const res = await deleteLibraryItem(createdId);
    expect(res.success).toBe(true);

    await expect(getLibraryItemById(createdId)).rejects.toThrow("tidak ditemukan");
  });
});
