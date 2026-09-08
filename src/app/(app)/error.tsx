"use client";

import { useEffect } from "react";

import { Button, Card } from "@/components/ui";

/**
 * Without this, a failed query in any server component takes the whole page down
 * to the platform's blank "a server error occurred" screen -- no clue what broke
 * and no way back except the address bar.
 *
 * It cannot say what went wrong: Next replaces the real message with a digest
 * before it reaches the browser, deliberately, so a stack trace never leaks to
 * whoever is looking. The digest is shown because it is what matches this crash
 * to its line in the Vercel log.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] page failed to render", error);
  }, [error]);

  return (
    <Card title="Something went wrong">
      <div className="flex flex-col items-start gap-4 px-4 py-6 sm:px-5">
        <p className="text-sm text-muted">
          This page could not be loaded. Trying again is worth a go; if it keeps
          happening, the Vercel logs will have the reason.
        </p>

        <p className="text-sm text-muted">
          A likely cause is a migration in{" "}
          <code className="text-foreground">supabase/migrations</code> that has
          not been run against the database yet.
        </p>

        {error.digest && (
          <p className="numeric text-xs text-muted">
            Error digest <span className="text-foreground">{error.digest}</span>
          </p>
        )}

        <Button onClick={reset} variant="secondary">
          Try again
        </Button>
      </div>
    </Card>
  );
}
