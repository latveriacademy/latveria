import Link from "next/link";
import { requireAdmin } from "../../lib/access";
import { SignOut } from "../sign-out";
import { AdminNav } from "./nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return <div className="mx-auto min-h-dvh max-w-6xl px-6 py-7"><header className="mb-10 flex flex-wrap items-center justify-between gap-5 border-b border-[var(--rule)] pb-5"><div><Link href="/dashboard" className="text-xl font-bold no-underline">latveria admin</Link><p>{admin.name}</p></div><AdminNav /><SignOut /></header><main>{children}</main></div>;
}
