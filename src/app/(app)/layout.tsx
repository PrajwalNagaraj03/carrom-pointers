import Link from "next/link";

import { requireMember } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/matches/new", label: "Log a match" },
  { href: "/seasons", label: "Seasons" },
  { href: "/players", label: "Players" },
] as const;

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { member } = await requireMember();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <Link href="/" className="text-base font-semibold tracking-tight">
            Carrom<span className="text-accent">.</span>
          </Link>

          <nav className="flex flex-1 flex-wrap items-center gap-1 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-1.5 text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <form action={signOut} className="flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline">
              {member.display_name ?? member.email}
            </span>
            <button
              type="submit"
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
