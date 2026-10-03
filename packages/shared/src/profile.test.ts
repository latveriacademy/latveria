import { expect, it } from "vitest";
import { profileSchema } from "./index";

const profile = { name: "Peserta", codename: "", targetUniversity: "", bio: "", motto: "" };

it("trims profile fields while allowing optional details to be empty", () => {
  expect(profileSchema.parse({ ...profile, name: " Peserta ", bio: " Belajar UTBK " })).toEqual({
    ...profile,
    bio: "Belajar UTBK",
  });
});
it("rejects empty names and oversized bios", () => {
  expect(profileSchema.safeParse({ ...profile, name: "   " }).success).toBe(false);
  expect(profileSchema.safeParse({ ...profile, bio: "x".repeat(501) }).success).toBe(false);
});
it.each(["id", "role", "email"])("rejects the non-editable field %s", (field) => {
  expect(profileSchema.safeParse({ ...profile, [field]: "attacker" }).success).toBe(false);
});
