"use client";

import { useActionState } from "react";

import { Button, Field, FormError, inputClass } from "@/components/ui";
import { signIn } from "@/lib/actions/auth";
import { initialActionState } from "@/lib/actions/shared";

export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, initialActionState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormError message={state.error} />

      <Field label="Email">
        <input
          type="email"
          name="email"
          autoComplete="username"
          required
          className={inputClass}
        />
      </Field>

      <Field label="Password">
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </Field>

      <Button type="submit" disabled={pending} className="mt-1 w-full py-2.5">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
