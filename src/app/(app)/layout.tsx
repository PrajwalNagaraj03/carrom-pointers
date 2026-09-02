import Link from "next/link";

import { rowActionClass } from "@/components/ui";
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
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="inline-flex min-h-11 shrink-0 items-center text-base font-semibold tracking-tight sm:min-h-0">
            Carrom<span className="text-accent">.</span>
          </Link>

          {/* From sm up the links sit on the same row as the brand. */}
          <nav className="hidden flex-1 items-center gap-1 text-sm sm:flex">
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

          <div className="ml-auto flex min-w-0 items-center gap-2 sm:ml-0">
            <Link
              href="/account"
              className="inline-flex min-h-11 max-w-32 items-center truncate text-sm text-muted transition-colors hover:text-foreground sm:min-h-0 sm:max-w-none"
            >
              {member.display_name ?? member.email}
            </Link>
            <form action={signOut}>
              <button type="submit" className={rowActionClass}>
                Sign out
              </button>
            </form>
          </div>
        </div>

        {/*
          On a phone the four links get their own row. It scrolls sideways rather
          than wrapping: wrapping turned the header into three ragged lines and
          ate a third of the screen before any carrom appeared.
        */}
        <nav className="no-scrollbar flex gap-1 overflow-x-auto px-2 pb-2 text-sm sm:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
