import { redirect } from "next/navigation";

import { SignInForm } from "@/components/sign-in-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Sign in · Carrom" };

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <CarromMark />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Carrom Points</h1>
        <p className="mt-2 mb-8 text-sm text-muted">
          Seasons, boards and standings for our table.
        </p>
        <SignInForm />
      </div>
    </main>
  );
}

function CarromMark() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="h-12 w-12">
      <rect x="2" y="2" width="60" height="60" rx="8" className="fill-surface-muted" />
      <rect
        x="8"
        y="8"
        width="48"
        height="48"
        rx="4"
        className="fill-none stroke-border"
        strokeWidth="2"
      />
      <circle cx="32" cy="32" r="9" className="fill-none stroke-accent" strokeWidth="2" />
      <circle cx="32" cy="32" r="3" className="fill-accent" />
      <circle cx="12" cy="12" r="3.5" className="fill-border" />
      <circle cx="52" cy="12" r="3.5" className="fill-border" />
      <circle cx="12" cy="52" r="3.5" className="fill-border" />
      <circle cx="52" cy="52" r="3.5" className="fill-border" />
    </svg>
  );
}
