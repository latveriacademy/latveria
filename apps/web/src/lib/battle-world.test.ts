import { describe, expect, it } from "vitest";
import { isBattleWorldPackage } from "./battle-world";

const base = {
  published: true,
  questionCount: 10,
  isFullTryout: false,
  packageType: "Tryout",
};

describe("isBattleWorldPackage", () => {
  it("menampilkan full tryout dan paket simulasi", () => {
    expect(isBattleWorldPackage({ ...base, isFullTryout: true })).toBe(true);
    expect(isBattleWorldPackage({ ...base, packageType: "Simulasi" })).toBe(true);
  });

  it("tidak menampilkan paket latihan Drilling", () => {
    expect(isBattleWorldPackage(base)).toBe(false);
    expect(isBattleWorldPackage({ ...base, packageType: "Airdrop Fundamental" })).toBe(false);
  });

  it("menyembunyikan tryout yang belum terbit atau kosong", () => {
    expect(isBattleWorldPackage({ ...base, isFullTryout: true, published: false })).toBe(false);
    expect(isBattleWorldPackage({ ...base, isFullTryout: true, questionCount: 0 })).toBe(false);
  });
});
