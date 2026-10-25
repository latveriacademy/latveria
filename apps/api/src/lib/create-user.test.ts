import { describe, expect, it } from "vitest";
import { createUser, parseCsvUsers, parseJsonUsers } from "../../scripts/create-user";

describe("createUser validation", () => {
  it("rejects invalid email formats", async () => {
    await expect(createUser({ email: "invalid-email", password: "Password123!" })).rejects.toThrow(
      "Format email tidak valid.",
    );
  });

  it("rejects password shorter than 8 characters", async () => {
    await expect(createUser({ email: "user@example.com", password: "short" })).rejects.toThrow(
      "Password minimal harus 8 karakter.",
    );
  });

  it("rejects roles other than user or admin", async () => {
    await expect(
      createUser({ email: "user@example.com", password: "Password123!", role: "superuser" }),
    ).rejects.toThrow("Role hanya boleh 'user' atau 'admin'.");
  });
});

describe("batch users parser", () => {
  it("parses CSV content correctly", () => {
    const csv = `email,password,name,role
admin1@latveria.test,Secret123!,Admin Satu,admin
user1@latveria.test,Secret123!,User Satu,user
"user2@latveria.test","Secret123!","User, Dua",user`;

    const parsed = parseCsvUsers(csv);
    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toEqual({
      email: "admin1@latveria.test",
      password: "Secret123!",
      name: "Admin Satu",
      role: "admin",
    });
    expect(parsed[2].name).toBe("User, Dua");
  });

  it("throws error if CSV missing required headers", () => {
    const csv = `name,role\nAdmin,admin`;
    expect(() => parseCsvUsers(csv)).toThrow(
      "File CSV harus memiliki kolom 'email' dan 'password'.",
    );
  });

  it("parses JSON content correctly", () => {
    const json = JSON.stringify([
      { email: "admin@test.com", password: "Password123!", name: "Admin Test", role: "admin" },
      { email: "user@test.com", password: "Password123!" },
    ]);

    const parsed = parseJsonUsers(json);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].role).toBe("admin");
    expect(parsed[1].name).toBeUndefined();
  });
});
