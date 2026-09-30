import { beforeEach, expect, it, vi } from "vitest";

const { getSession, redirect } = vi.hoisted(() => ({ getSession: vi.fn(), redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }) }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("./auth", () => ({ getAuth: () => ({ api: { getSession } }) }));

import { requireAdmin, requireUser } from "./access";

beforeEach(() => { getSession.mockReset(); redirect.mockClear(); });

it("menolak pengunjung tanpa sesi dari halaman pengguna dan admin", async () => {
  getSession.mockResolvedValue(null);
  await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
  await expect(requireAdmin()).rejects.toThrow("REDIRECT:/login");
});

it("menolak pengguna biasa dari admin dan menerima admin", async () => {
  getSession.mockResolvedValueOnce({ user: { id: "u1", role: "user" } }).mockResolvedValueOnce({ user: { id: "a1", role: "admin" } });
  await expect(requireAdmin()).rejects.toThrow("REDIRECT:/forbidden");
  await expect(requireAdmin()).resolves.toEqual({ id: "a1", role: "admin" });
});
