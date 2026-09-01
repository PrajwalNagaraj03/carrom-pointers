import Link from "next/link";

export const metadata = { title: "No access · Carrom" };

export default function NoAccessPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">
          That account is not on the list
        </h1>
        <p className="mt-3 text-sm text-muted">
          This dashboard is limited to three approved accounts. If you think
          yours should be one of them, ask whoever runs the board to add your
          address to <code className="text-foreground">app_members</code> in
          Supabase.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-accent hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
