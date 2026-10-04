import assert from "node:assert/strict";

export async function verifyBankSearch(request: (path: string) => Promise<Response>) {
  for (const cari of ["SOAL UJI api", "dummy integrasi", "%", "_"]) {
    const response = await request(
      `/admin/questions?kategori=Kategori%20uji%20API&cari=${encodeURIComponent(cari)}`,
    );
    assert.equal(response.status, 200);
    const found = await response.json();
    assert.equal(found.total, ["%", "_"].includes(cari) ? 0 : 1);
  }
  assert.equal((await request(`/admin/questions?cari=${"x".repeat(201)}`)).status, 400);
}
