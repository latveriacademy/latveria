import { describe, expect, it } from "vitest";
import {
  extractYouTubeVideoId,
  getYouTubeThumbnailUrl,
  libraryItemInputSchema,
  slugifyTitle,
} from "./library";

describe("Library shared utilities", () => {
  it("extracts youtube video id correctly across different formats", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
    expect(extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ?start=10")).toBe(
      "dQw4w9WgXcQ",
    );
    expect(extractYouTubeVideoId("https://m.youtube.com/watch?v=dQw4w9WgXcQ&feature=share")).toBe(
      "dQw4w9WgXcQ",
    );
    expect(extractYouTubeVideoId("https://example.com/not-youtube")).toBeNull();
    expect(extractYouTubeVideoId(null)).toBeNull();
  });

  it("generates correct youtube thumbnail url", () => {
    expect(getYouTubeThumbnailUrl("dQw4w9WgXcQ")).toBe(
      "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    );
    expect(getYouTubeThumbnailUrl(null)).toBeNull();
  });

  it("slugifies titles nicely", () => {
    expect(slugifyTitle("Aljabar Linier & Matriks: Dasar-Dasar")).toBe(
      "aljabar-linier-matriks-dasar-dasar",
    );
  });

  it("validates input schema properly", () => {
    const valid = libraryItemInputSchema.safeParse({
      title: "Konsep Turunan dan Integral",
      type: "article",
      content: "Rumus turunan $f'(x) = \\lim_{h \\to 0} \\frac{f(x+h)-f(x)}{h}$",
      tags: ["kalkulus", "matematika"],
      isPublished: true,
    });
    expect(valid.success).toBe(true);

    const invalidType = libraryItemInputSchema.safeParse({
      title: "Test",
      type: "audio",
    });
    expect(invalidType.success).toBe(false);
  });
});
