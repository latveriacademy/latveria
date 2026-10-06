import { describe, expect, it } from "vitest";
import { extractAvatarKey, uploadAvatar } from "./storage.service";

describe("storage.service", () => {
  it("extracts avatar key from relative or full URL", () => {
    expect(extractAvatarKey("/api/avatar/avatar-user1-12345-abcd1234.webp")).toBe(
      "avatar-user1-12345-abcd1234.webp",
    );
    expect(
      extractAvatarKey("https://pub-r2.dev/latveria-avatars/avatar-user2-999-efgh5678.jpg"),
    ).toBe("avatar-user2-999-efgh5678.jpg");
    expect(extractAvatarKey("https://example.com/other-image.png")).toBe(null);
  });

  it("rejects non-file or missing file", async () => {
    await expect(uploadAvatar("user-1", null)).rejects.toThrow("File foto profil tidak ditemukan.");
  });

  it("rejects unsupported MIME type", async () => {
    const file = new File(["dummy content that is long enough to meet size minimum"], "test.pdf", {
      type: "application/pdf",
    });
    await expect(uploadAvatar("user-1", file)).rejects.toThrow("Format foto tidak didukung");
  });

  it("rejects file smaller than min size (5 KB)", async () => {
    const file = new File(["small"], "test.png", { type: "image/png" });
    await expect(uploadAvatar("user-1", file)).rejects.toThrow("Ukuran foto terlalu kecil");
  });

  it("rejects file larger than max size (3 MB)", async () => {
    const largeBuffer = new Uint8Array(3145728 + 1024);
    const file = new File([largeBuffer], "large.png", { type: "image/png" });
    await expect(uploadAvatar("user-1", file)).rejects.toThrow(
      "Ukuran foto melebihi batas maksimal",
    );
  });
});
