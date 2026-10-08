import { afterEach, expect, it, vi } from "vitest";
import { api, ApiError } from "./api";

afterEach(() => vi.unstubAllGlobals());

it("retries a transient network failure when checking import destinations", async () => {
  const fetchMock = vi
    .fn()
    .mockRejectedValueOnce(new TypeError("NetworkError when attempting to fetch resource."))
    .mockResolvedValueOnce(new Response(JSON.stringify([{ id: "package" }])));
  vi.stubGlobal("fetch", fetchMock);
  await expect(api("/admin/subtests/pengetahuan-kuantitatif/packages")).resolves.toEqual([
    { id: "package" },
  ]);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("shows a recovery message when the connection remains unavailable", async () => {
  const fetchMock = vi
    .fn()
    .mockRejectedValue(
      new DOMException("NetworkError when attempting to fetch resource.", "NetworkError"),
    );
  vi.stubGlobal("fetch", fetchMock);
  await expect(api("/admin/subtests/pengetahuan-kuantitatif/packages")).rejects.toMatchObject({
    status: 0,
    message: expect.stringContaining("Tidak dapat terhubung"),
  });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("never retries an import mutation whose outcome is unknown", async () => {
  const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
  vi.stubGlobal("fetch", fetchMock);
  await expect(
    api("/admin/questions/import", { method: "POST", body: "{}" }),
  ).rejects.toBeInstanceOf(ApiError);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("preserves cancellation without retrying or displaying a network failure", async () => {
  const error = new DOMException("Request aborted", "AbortError");
  const fetchMock = vi.fn().mockRejectedValue(error);
  vi.stubGlobal("fetch", fetchMock);
  await expect(api("/admin/subtests/pengetahuan-kuantitatif/packages")).rejects.toBe(error);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
