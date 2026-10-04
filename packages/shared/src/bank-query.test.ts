import { expect, it } from "vitest";
import { bankQuerySchema } from "./index";

it("trims bank search and validates its length while preserving filters", () => {
  expect(
    bankQuerySchema.parse({ cari: "  logika  ", kategori: "TPS", halaman: "2" }),
  ).toMatchObject({ cari: "logika", kategori: "TPS", halaman: 2 });
  expect(bankQuerySchema.safeParse({ cari: "x".repeat(201) }).success).toBe(false);
  expect(bankQuerySchema.parse({ cari: "  " }).cari).toBe("");
});
