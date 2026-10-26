import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { getDb } from "../src/lib/db";
import { libraryItems } from "../src/lib/db/schema";
import type { LibraryItemListResponse, LibraryItemSummary } from "@latveria/shared";

type Request = (
  path: string,
  cookie?: string,
  body?: unknown,
  method?: string,
) => Promise<Response>;

export async function verifyLibrary(request: Request, adminCookie: string) {
  const createdIds: string[] = [];
  try {
    // 1. Buat materi video baru
    const createRes = await request("/admin/library", adminCookie, {
      title: "Verifikasi Video Library",
      type: "video",
      subtestSlug: "penalaran-umum",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      tags: ["qa", "video"],
      isPublished: true,
    });
    assert.equal(createRes.status, 201);
    const item: LibraryItemSummary = await createRes.json();
    assert.ok(item.id);
    assert.equal(item.title, "Verifikasi Video Library");
    assert.equal(item.type, "video");
    assert.equal(item.metadata?.youtubeId, "dQw4w9WgXcQ");
    assert.equal(item.thumbnailUrl, "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
    createdIds.push(item.id);

    // 2. Baca materi berdasarkan ID
    const getRes = await request(`/admin/library/${item.id}`, adminCookie);
    assert.equal(getRes.status, 200);
    const fetched: LibraryItemSummary = await getRes.json();
    assert.equal(fetched.id, item.id);

    // 3. Daftar materi dengan filter
    const listRes = await request("/admin/library?cari=Verifikasi", adminCookie);
    assert.equal(listRes.status, 200);
    const list: LibraryItemListResponse = await listRes.json();
    assert.ok(list.rows.some((r) => r.id === item.id));

    // 4. Update materi
    const updateRes = await request(
      `/admin/library/${item.id}`,
      adminCookie,
      {
        title: "Verifikasi Video Library Terupdate",
        content: "Catatan rumus $E = mc^2$",
      },
      "PUT",
    );
    assert.equal(updateRes.status, 200);
    const updated: LibraryItemSummary = await updateRes.json();
    assert.equal(updated.title, "Verifikasi Video Library Terupdate");
    assert.equal(updated.content, "Catatan rumus $E = mc^2$");

    // 5. Toggle publish status
    const toggleRes = await request(`/admin/library/${item.id}/publish`, adminCookie, {}, "PATCH");
    assert.equal(toggleRes.status, 200);
    const toggled = await toggleRes.json();
    assert.equal(toggled.isPublished, false);

    // 6. Hapus materi
    const deleteRes = await request(`/admin/library/${item.id}`, adminCookie, undefined, "DELETE");
    assert.equal(deleteRes.status, 200);

    const getAfterDelete = await request(`/admin/library/${item.id}`, adminCookie);
    assert.equal(getAfterDelete.status, 404);
  } finally {
    if (createdIds.length > 0) {
      for (const id of createdIds) {
        await getDb().delete(libraryItems).where(eq(libraryItems.id, id));
      }
    }
  }
}
